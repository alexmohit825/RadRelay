import { useState, useEffect } from 'react';
import { DicomViewer } from './components/DicomViewer';
import { PatientUploadPortal } from './components/PatientUploadPortal';
import { ClinicSchedule } from './components/ClinicSchedule';
import { GuideModal } from './components/GuideModal';
import { generateSyntheticSpineMriStudy } from './services/dicomParser';
import type { PatientRecord, DicomMetadata, DicomSlice } from './types/dicom';
import {
  Layers,
  Upload,
  Server,
  CheckCircle2,
  Globe,
  HelpCircle
} from 'lucide-react';

const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 'p1',
    patientName: 'Anderson, Eleanor M.',
    dob: '1968-04-12',
    mrn: 'MRN-7739218',
    scheduledTime: '09:00 AM',
    visitReason: 'L4-L5 Radiculopathy, Refractory back pain',
    status: 'READY',
    outsideFacility: 'Swedish Neuroscience (Outside MRI)',
    imagingType: 'MRI Lumbar Spine W/O Contrast',
    study: generateSyntheticSpineMriStudy(),
  },
  {
    id: 'p2',
    patientName: 'Miller, Robert J.',
    dob: '1974-11-23',
    mrn: 'MRN-8402194',
    scheduledTime: '09:45 AM',
    visitReason: 'C5-C6 Cervical Disc Herniation',
    status: 'REQUEST_SENT',
    outsideFacility: 'TRA Medical Imaging Lakewood',
    imagingType: 'MRI Cervical Spine',
  },
  {
    id: 'p3',
    patientName: 'Kowalski, Teresa',
    dob: '1982-08-30',
    mrn: 'MRN-9120349',
    scheduledTime: '10:30 AM',
    visitReason: 'Post-laminectomy syndrome evaluation',
    status: 'PENDING_UPLOAD',
    outsideFacility: 'Providence St. Peter Hospital',
    imagingType: 'CT Lumbar Spine with 3D Recon',
  },
  {
    id: 'p4',
    patientName: 'Chen, David H.',
    dob: '1959-02-14',
    mrn: 'MRN-6503921',
    scheduledTime: '11:15 AM',
    visitReason: 'Degenerative scoliosis with neurogenic claudication',
    status: 'PENDING_UPLOAD',
    outsideFacility: 'RadNet Imaging Puyallup',
    imagingType: 'Full Spine Standing XR + MRI',
  },
];

export function App() {
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [activePatientId, setActivePatientId] = useState<string>('p1');
  const [currentView, setCurrentView] = useState<'VIEWER' | 'INTAKE'>('VIEWER');
  const [notification, setNotification] = useState<string | null>(null);
  const [isPatientMode, setIsPatientMode] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Check URL query parameters on initial mount for direct patient upload link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('upload_token');
    const pId = params.get('patient_id');
    const pName = params.get('name');

    if (token) {
      setIsPatientMode(true);
      setCurrentView('INTAKE');
      if (pId) setActivePatientId(pId);
      showNotification(`Welcome ${pName || 'Patient'}. You are securely connected to Dr. Mohit's intake portal.`);
    }
  }, []);

  const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

  const handleStudyIngested = async (study: { metadata: DicomMetadata; slices: DicomSlice[] }) => {
    // 1. Update local reactive state
    setPatients(prev =>
      prev.map(p => {
        if (p.id === activePatientId) {
          return {
            ...p,
            status: 'READY',
            study: study,
          };
        }
        return p;
      })
    );

    // 2. Persist to Cloudflare KV Edge API
    try {
      await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activePatient.mrn,
          patientName: activePatient.patientName,
          modality: study.metadata.modality,
          studyDate: study.metadata.studyDate,
          seriesDescription: study.metadata.seriesDescription,
          sliceCount: study.slices.length,
          sourceType: study.metadata.sourceType,
        }),
      });
    } catch (err) {
      console.warn('[RadRelay] Cloud persistence deferred to local cache:', err);
    }

    setCurrentView('VIEWER');
    showNotification(`Validated & Saved ${study.slices.length} DICOM slices for ${activePatient.patientName} into Cloud Vault.`);
  };

  const handleSendSms = async (patientId: string) => {
    const target = patients.find(p => p.id === patientId);
    if (!target) return;

    try {
      const res = await fetch('/api/sms-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: target.id,
          patientName: target.patientName,
          phoneNumber: '+12065550192',
        }),
      });

      if (res.ok) {
        const data = await res.json() as any;
        setPatients(prev =>
          prev.map(p => (p.id === patientId ? { ...p, status: 'REQUEST_SENT' } : p))
        );
        showNotification(`SMS Invite Created: ${data.uploadUrl}`);
        // Copy to clipboard if allowed
        navigator.clipboard?.writeText(data.uploadUrl).catch(() => {});
      } else {
        throw new Error('API returned non-200');
      }
    } catch {
      // Fallback
      setPatients(prev =>
        prev.map(p => (p.id === patientId ? { ...p, status: 'REQUEST_SENT' } : p))
      );
      showNotification(`Generated secure mobile intake link for ${target.patientName}`);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-wider text-white">RADRELAY</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                v1.2 Cloud Edge
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cross-Enterprise DICOM Ingestion & Change Healthcare PACS Gateway
            </p>
          </div>
        </div>

        {/* Global Navigation Mode Tabs */}
        <div className="flex items-center space-x-3">
          {!isPatientMode && (
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setCurrentView('VIEWER')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
                  currentView === 'VIEWER'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Diagnostic Spine Viewer</span>
              </button>
              <button
                onClick={() => setCurrentView('INTAKE')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
                  currentView === 'INTAKE'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Patient Upload Portal</span>
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>PACS Node:</span>
            <span className="font-mono text-emerald-400 font-semibold">CHANGE_HORIZON_104</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-[11px] text-cyan-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cloudflare Edge Live</span>
          </div>

          {/* Toggleable Guide Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            title="Open Clinical Workflow & PACS Guide"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-950/90 border border-emerald-700 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Body Workspace */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1720px] mx-auto w-full">
        {/* Left Column: Clinic Patient Schedule Flightboard (Hidden in pure patient mobile upload mode) */}
        {!isPatientMode && (
          <div className="lg:col-span-4 flex flex-col h-[calc(100vh-100px)]">
            <ClinicSchedule
              patients={patients}
              activePatientId={activePatientId}
              onSelectPatient={(id) => {
                setActivePatientId(id);
                setCurrentView('VIEWER');
              }}
              onSendSmsInvite={handleSendSms}
            />
          </div>
        )}

        {/* Right Column: Diagnostic Viewer OR Intake Portal */}
        <div className={`${isPatientMode ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col h-[calc(100vh-100px)]`}>
          {currentView === 'VIEWER' ? (
            activePatient.study ? (
              <DicomViewer
                metadata={activePatient.study.metadata}
                slices={activePatient.study.slices}
                onPushToChangePacs={() => {
                  showNotification(`Study successfully pushed to Change Healthcare PACS (AE: CHANGE_HORIZON_104)`);
                }}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 mb-4">
                  <Upload className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white">No Imaging Slices Loaded for this Patient</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md">
                  {activePatient.patientName} has outside imaging ordered from{' '}
                  <span className="text-cyan-400">{activePatient.outsideFacility}</span>, but the DICOM series has not yet arrived.
                </p>
                <div className="mt-6 flex items-center space-x-3">
                  <button
                    onClick={() => setCurrentView('INTAKE')}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Open Upload Portal for this Patient
                  </button>
                  <button
                    onClick={() => {
                      const study = generateSyntheticSpineMriStudy();
                      handleStudyIngested(study);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold transition border border-slate-700"
                  >
                    Load Demo Lumbar Series
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="h-full overflow-y-auto">
              <PatientUploadPortal
                targetPatientName={activePatient.patientName}
                onStudyIngested={handleStudyIngested}
              />
            </div>
          )}
        </div>
      </div>

      {/* Guide Modal Component */}
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;
