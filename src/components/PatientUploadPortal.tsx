import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  Building2,
  HardDrive,
  FileArchive,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { processDroppedFile, generateSyntheticSpineMriStudy } from '../services/dicomParser';
import type { DicomMetadata, DicomSlice } from '../types/dicom';
import confetti from 'canvas-confetti';

interface PatientUploadPortalProps {
  onStudyIngested: (study: { metadata: DicomMetadata; slices: DicomSlice[] }) => void;
  targetPatientName?: string;
}

export const PatientUploadPortal: React.FC<PatientUploadPortalProps> = ({
  onStudyIngested,
  targetPatientName = 'Anderson, Eleanor M.',
}) => {
  const [activeTab, setActiveTab] = useState<'DROPZONE' | 'FHIR_PORTAL'>('DROPZONE');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMART on FHIR Simulation state
  const [selectedHospital, setSelectedHospital] = useState<string>('providence');
  const [fhirStep, setFhirStep] = useState<'SELECT' | 'AUTH' | 'RETRIEVING' | 'DONE'>('SELECT');

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await handleFiles(files[0]);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setError(null);
    await handleFiles(e.target.files[0]);
  };

  const handleFiles = async (file: File) => {
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Reading file headers...');

    try {
      const study = await processDroppedFile(file, (pct, status) => {
        setProgress(pct);
        setStatusMessage(status);
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onStudyIngested(study);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to parse DICOM series. Ensure file contains uncompressed DICOM pixel data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSampleStudy = () => {
    setIsProcessing(true);
    setStatusMessage('Synthesizing Lumbar Spine MRI Sagittal FSE (L1-S1)...');
    setProgress(40);

    setTimeout(() => {
      const study = generateSyntheticSpineMriStudy();
      setProgress(100);
      setIsProcessing(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onStudyIngested(study);
    }, 450);
  };

  const handleSimulateFhirQuery = () => {
    setFhirStep('AUTH');
    setTimeout(() => {
      setFhirStep('RETRIEVING');
      setTimeout(() => {
        setFhirStep('DONE');
        const study = generateSyntheticSpineMriStudy();
        study.metadata.institutionName = selectedHospital === 'providence' 
          ? 'Providence Health (FHIR WADO-RS Endpoint)'
          : selectedHospital === 'uw'
          ? 'UW Medicine (Cures Act Imaging Relay)'
          : 'Virginia Mason Franciscan Health';
        study.metadata.sourceType = 'SMART_FHIR';
        onStudyIngested(study);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              PATIENT INTAKE GATEWAY
            </span>
            <span className="text-xs text-slate-400 font-mono">HIPAA Encrypted (TLS 1.3)</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Acquire Outside Spine Imaging</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Record: <span className="text-slate-200 font-medium">{targetPatientName}</span> • Dr. A. Alex Mohit Neurosurgery
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('DROPZONE')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === 'DROPZONE' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Direct Upload / ZIP
          </button>
          <button
            onClick={() => setActiveTab('FHIR_PORTAL')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1 ${
              activeTab === 'FHIR_PORTAL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Connect Outside Portal</span>
          </button>
        </div>
      </div>

      {activeTab === 'DROPZONE' ? (
        <div className="mt-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
            }`}
          >
            <input
              type="file"
              id="dicom-file-input"
              className="hidden"
              onChange={handleFileInput}
              accept=".dcm,.zip,.tar,application/zip"
            />
            <label htmlFor="dicom-file-input" className="cursor-pointer block">
              <div className="mx-auto w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Drag & Drop Patient DICOM Files or ZIP Archive
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No CD drive required. Upload the `.zip` archive provided by outside radiology, USB drive contents, or individual `.dcm` slices.
              </p>
              <div className="mt-4 flex items-center justify-center space-x-3 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <FileArchive className="w-4 h-4 text-cyan-400" />
                  <span>Supports .ZIP</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Client-Side Wasm Parser</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Zero Cloud Leak</span>
                </span>
              </div>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between p-3.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Test with Synthetic Lumbar MRI Study</div>
                <div className="text-[11px] text-slate-400">18 Slices Sagittal T2 FSE (L1-S1) with L4-5 Herniation</div>
              </div>
            </div>
            <button
              onClick={handleLoadSampleStudy}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-medium transition border border-slate-700"
            >
              Load Lumbar Spine Study
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-cyan-300 font-medium">{statusMessage}</span>
                <span className="text-cyan-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 rounded-lg flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-start space-x-3">
              <Building2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">21st Century Cures Act Digital Pull</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Patients have the legal right under federal Information Blocking rules to grant access to their imaging records stored in external systems (Providence, UW Medicine, Virginia Mason) without hospital fileroom delays.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'providence', name: 'Providence St. Joseph Health', ehr: 'Epic MyChart' },
                { id: 'uw', name: 'UW Medicine', ehr: 'Epic Care' },
                { id: 'vm', name: 'Virginia Mason Franciscan Health', ehr: 'Cerner Health' },
              ].map((hosp) => (
                <button
                  key={hosp.id}
                  onClick={() => setSelectedHospital(hosp.id)}
                  className={`p-3 rounded-lg border text-left transition ${
                    selectedHospital === hosp.id
                      ? 'border-cyan-500 bg-cyan-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-200">{hosp.name}</div>
                  <div className="text-[11px] text-cyan-400 mt-1 font-mono">{hosp.ehr}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>OAuth2 Scoped: ImagingStudy & DICOMweb WADO-RS</span>
              </div>
              <button
                onClick={handleSimulateFhirQuery}
                disabled={fhirStep === 'AUTH' || fhirStep === 'RETRIEVING'}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
              >
                {fhirStep === 'AUTH' ? (
                  <span>Authenticating via MyChart...</span>
                ) : fhirStep === 'RETRIEVING' ? (
                  <span>Querying WADO-RS DICOMweb...</span>
                ) : (
                  <>
                    <span>Pull Studies via FHIR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
