import React from 'react';
import type { PatientRecord } from '../types/dicom';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Smartphone
} from 'lucide-react';

interface ClinicScheduleProps {
  patients: PatientRecord[];
  activePatientId: string;
  onSelectPatient: (patientId: string) => void;
  onSendSmsInvite: (patientId: string) => void;
}

export const ClinicSchedule: React.FC<ClinicScheduleProps> = ({
  patients,
  activePatientId,
  onSelectPatient,
  onSendSmsInvite,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">CLINIC SCHEDULE & IMAGING READINESS</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Today's Spine Consultations • MultiCare Clinic
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {patients.filter(p => p.status === 'READY').length} / {patients.length} Ready
        </span>
      </div>

      <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
        {patients.map((patient) => {
          const isSelected = patient.id === activePatientId;
          const isReady = patient.status === 'READY';

          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient.id)}
              className={`p-3.5 transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-950/40 border-l-4 border-cyan-500'
                  : 'hover:bg-slate-800/40 border-l-4 border-transparent'
              }`}
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {patient.scheduledTime}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {patient.patientName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({patient.mrn})
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                  <span className="text-cyan-300">{patient.imagingType}</span>
                  <span>•</span>
                  <span className="truncate">{patient.outsideFacility}</span>
                </div>
              </div>

              {/* Status and Quick Action */}
              <div className="flex items-center space-x-2 shrink-0">
                {isReady ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Images Ready</span>
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendSmsInvite(patient.id);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700 transition"
                  >
                    <Smartphone className="w-3 h-3 text-cyan-400" />
                    <span>SMS Invite</span>
                  </button>
                )}
                <ChevronRight className={`w-4 h-4 text-slate-600 ${isSelected ? 'text-cyan-400' : ''}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
