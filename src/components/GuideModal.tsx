import React from 'react';
import {
  HelpCircle,
  X,
  Smartphone,
  HardDrive,
  Network,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                RADRELAY CLINICAL WORKFLOW GUIDE
              </h2>
              <p className="text-xs text-slate-400">
                End-to-End Instructions for Patient Intake, Spine Analysis & PACS Relay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-300">
          {/* Step 1: Pre-Visit Intake */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>1. Dispatching Patient Mobile Intake Links (48-72h Prior)</span>
            </div>
            <p>
              Under MultiCare's CD-drive removal policy, outside CDs are no longer needed. In the left flight board:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Click <strong className="text-cyan-300">"SMS Invite"</strong> next to any patient scheduled with outside imaging.</li>
              <li>A secure, 72-hour time-expiring magic link (<code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">https://radrelay.pages.dev/?upload_token=...</code>) is generated and automatically copied to your clipboard.</li>
              <li>The patient opens the link on their smartphone or home computer to upload their outside imaging folder or ZIP archive.</li>
            </ul>
          </div>

          {/* Step 2: Patient WebDrop / SMART on FHIR */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>2. Drag & Drop Upload or 21st Century Cures Act Pull</span>
            </div>
            <p>
              Patients or clinic staff can ingest images through two zero-footprint pathways:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Direct Upload / ZIP</div>
                <p className="text-slate-400 text-[11px]">
                  Drop a <code className="text-cyan-300">.zip</code> archive or <code className="text-cyan-300">.dcm</code> files directly into the browser. Client-side WebAssembly (<code className="text-cyan-400">daikon</code>) extracts headers and slices locally without cloud leakage.
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">SMART on FHIR Digital Pull</div>
                <p className="text-slate-400 text-[11px]">
                  Select outside health systems (Providence, UW Medicine, Virginia Mason) to simulate a 21st Century Cures Act patient-authorized WADO-RS pull directly into the vault.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Diagnostic Spine Viewer & Calipers */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
              <Compass className="w-4 h-4 shrink-0" />
              <span>3. Reviewing Imaging & Quantitative Spine Calipers</span>
            </div>
            <p>
              When a study is loaded, use the bottom toolbar to analyze spinal anatomy:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <strong className="text-cyan-300 block mb-0.5">Millimeter Caliper (Ruler)</strong>
                Measure disc height loss, endplate defects, or spondylolisthesis step-off.
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <strong className="text-amber-300 block mb-0.5">Cobb Angle Tool</strong>
                Click superior and inferior vertebral endplates to calculate lumbar lordosis or scoliosis in degrees.
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <strong className="text-pink-300 block mb-0.5">Spinal Canal AP Caliper</strong>
                Measures AP diameter with real-time classification: Normal (&gt;12mm), Relative (10-12mm), or Severe (&lt;10mm).
              </div>
            </div>
          </div>

          {/* Step 4: Relay to Change PACS for Surgery */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm">
              <Network className="w-4 h-4 shrink-0" />
              <span>4. One-Click Relay to MultiCare Change Healthcare PACS</span>
            </div>
            <p>
              To make the study available across the hospital and in the OR for <strong className="text-slate-100">StealthStation / Brainlab surgical navigation</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Click <strong className="text-sky-300">"Relay to Change PACS"</strong> in the top right of the viewer.</li>
              <li>The study is pushed via DICOM C-STORE to AE Title <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">CHANGE_HORIZON</code> on port <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">104 / 11112</code>.</li>
              <li>Because this is an inbound internal push, hospital firewalls accept the dataset into the patient's permanent record without radiology fileroom delays.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400 text-[11px]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Zero Local CD Drive Dependency • 100% HIPAA Isolated</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
