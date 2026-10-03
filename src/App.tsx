import { useState } from 'react';
import { DicomViewer } from './components/DicomViewer';
import { PatientUploadPortal } from './components/PatientUploadPortal';
import { ClinicSchedule } from './components/ClinicSchedule';
import { generateSyntheticSpineMriStudy } from './services/dicomParser';
import type { PatientRecord, DicomMetadata, DicomSlice } from './types/dicom';
import {
  Activity,
  Layers,
  Upload,
  Server,
  CheckCircle2
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

  const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

  const handleStudyIngested = (study: { metadata: DicomMetadata; slices: DicomSlice[] }) => {
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

    setCurrentView('VIEWER');
    showNotification(`Successfully ingested and validated ${study.slices.length} DICOM slices for ${activePatient.patientName}`);
  };

  const handleSendSms = (patientId: string) => {
    setPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, status: 'REQUEST_SENT' } : p))
    );
    const target = patients.find(p => p.id === patientId);
    showNotification(`Sent secure mobile upload link via SMS to ${target?.patientName}`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold tracking-wider text-white">RADRELAY</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                  v1.0 MVP
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cross-Enterprise DICOM Ingestion & Change Healthcare PACS Gateway
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Mode Tabs */}
        <div className="flex items-center space-x-3">
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

          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>PACS Node:</span>
            <span className="font-mono text-emerald-400 font-semibold">CHANGE_HORIZON_104</span>
          </div>
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
        {/* Left Column: Clinic Patient Schedule Flightboard */}
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

        {/* Right Column: Diagnostic Viewer OR Intake Portal */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-100px)]">
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
    </div>
  );
}

export default App;
