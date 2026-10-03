export interface DicomMetadata {
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  seriesDescription: string;
  seriesNumber: number;
  sliceCount: number;
  rows: number;
  cols: number;
  windowCenter: number;
  windowWidth: number;
  sliceThickness?: number;
  institutionName?: string;
  sourceType: 'PATIENT_UPLOAD' | 'SMART_FHIR' | 'CHANGE_PACS' | 'SAMPLE_DATA';
}

export interface DicomSlice {
  sliceIndex: number;
  sliceLocation: number;
  data: Float32Array | Int16Array | Uint8Array;
  rows: number;
  cols: number;
  min: number;
  max: number;
  windowWidth: number;
  windowCenter: number;
}

export interface PatientRecord {
  id: string;
  patientName: string;
  dob: string;
  mrn: string;
  scheduledTime: string;
  visitReason: string;
  status: 'READY' | 'PENDING_UPLOAD' | 'REQUEST_SENT' | 'VERIFYING';
  outsideFacility: string;
  imagingType: string;
  study?: {
    metadata: DicomMetadata;
    slices: DicomSlice[];
  };
}
