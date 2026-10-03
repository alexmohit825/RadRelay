import daikon from 'daikon';
import JSZip from 'jszip';
import type { DicomMetadata, DicomSlice } from '../types/dicom';

/**
 * Parses an individual ArrayBuffer DICOM file or extracts from a ZIP archive
 */
export async function parseDicomBuffer(buffer: ArrayBuffer, fileName: string): Promise<{ metadata: DicomMetadata; slice: DicomSlice } | null> {
  try {
    const dataView = new DataView(buffer);
    const parsed = (daikon as any).Parser.parse(dataView);

    if (!parsed || !parsed.hasPixelData()) {
      return null;
    }

    const rows = parsed.getRows() || 512;
    const cols = parsed.getCols() || 512;
    const pixelData = parsed.getInterpretedData(false, false);

    const min = parsed.getImageMin() !== undefined ? parsed.getImageMin() : 0;
    const max = parsed.getImageMax() !== undefined ? parsed.getImageMax() : 2048;
    const wc = parsed.getWindowCenter() || (min + max) / 2;
    const ww = parsed.getWindowWidth() || (max - min);

    const metadata: DicomMetadata = {
      patientName: parsed.getPatientName() || 'Unknown Patient',
      patientId: parsed.getPatientID() || 'MRN-UNASSIGNED',
      studyDate: parsed.getStudyDate() || new Date().toISOString().split('T')[0],
      modality: parsed.getModality() || 'MR',
      seriesDescription: parsed.getSeriesDescription() || fileName.replace('.dcm', ''),
      seriesNumber: parsed.getSeriesNumber() || 1,
      sliceCount: 1,
      rows,
      cols,
      windowCenter: wc,
      windowWidth: ww,
      sliceThickness: parsed.getSliceThickness() || 4.0,
      sourceType: 'PATIENT_UPLOAD',
    };

    const slice: DicomSlice = {
      sliceIndex: parsed.getImageNumber() || 1,
      sliceLocation: parsed.getSliceLocation() || 0,
      data: pixelData,
      rows,
      cols,
      min,
      max,
      windowWidth: ww,
      windowCenter: wc,
    };

    return { metadata, slice };
  } catch (err) {
    console.warn(`[RadRelay] Could not parse ${fileName} directly via daikon:`, err);
    return null;
  }
}

/**
 * Unzips a file if it is a ZIP archive and extracts all DICOM files
 */
export async function processDroppedFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<{ metadata: DicomMetadata; slices: DicomSlice[] }> {
  if (file.name.endsWith('.zip')) {
    onProgress?.(10, 'Extracting DICOM archive contents...');
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const files = Object.values(contents.files).filter(f => !f.dir && !f.name.startsWith('__MACOSX'));

    const parsedSlices: DicomSlice[] = [];
    let baseMeta: DicomMetadata | null = null;
    let completed = 0;

    for (const entry of files) {
      const buffer = await entry.async('arraybuffer');
      const res = await parseDicomBuffer(buffer, entry.name);
      if (res) {
        if (!baseMeta) baseMeta = res.metadata;
        parsedSlices.push(res.slice);
      }
      completed++;
      onProgress?.(10 + Math.floor((completed / files.length) * 80), `Parsing slice ${completed} of ${files.length}...`);
    }

    if (parsedSlices.length > 0 && baseMeta) {
      parsedSlices.sort((a, b) => a.sliceIndex - b.sliceIndex || a.sliceLocation - b.sliceLocation);
      baseMeta.sliceCount = parsedSlices.length;
      onProgress?.(100, 'Complete');
      return { metadata: baseMeta, slices: parsedSlices };
    }
  } else {
    // Single DICOM file
    onProgress?.(30, 'Reading single DICOM slice...');
    const buffer = await file.arrayBuffer();
    const res = await parseDicomBuffer(buffer, file.name);
    if (res) {
      onProgress?.(100, 'Complete');
      return { metadata: res.metadata, slices: [res.slice] };
    }
  }

  throw new Error('No valid diagnostic DICOM pixel series found in the provided upload.');
}

/**
 * Generates an authentic synthetic Sagittal Lumbar Spine MRI study (L1-S1)
 */
export function generateSyntheticSpineMriStudy(): { metadata: DicomMetadata; slices: DicomSlice[] } {
  const sliceCount = 18;
  const rows = 256;
  const cols = 256;
  const slices: DicomSlice[] = [];

  for (let s = 0; s < sliceCount; s++) {
    const distFromCenter = Math.abs(s - 8.5) / 9.0;
    const buffer = new Float32Array(rows * cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        let val = Math.random() * 15;

        const vertLevels = [
          { name: 'L1', top: 50, bot: 75 },
          { name: 'L2', top: 83, bot: 108 },
          { name: 'L3', top: 116, bot: 141 },
          { name: 'L4', top: 149, bot: 174 },
          { name: 'L5', top: 182, bot: 207 },
          { name: 'S1', top: 215, bot: 245 },
        ];

        const discs = [
          { y: 79, degeneration: 0.1, herniation: false },
          { y: 112, degeneration: 0.15, herniation: false },
          { y: 145, degeneration: 0.2, herniation: false },
          { y: 178, degeneration: 0.75, herniation: true },
          { y: 211, degeneration: 0.5, herniation: false },
        ];

        // Vertebral bodies
        for (const vb of vertLevels) {
          if (r >= vb.top && r <= vb.bot && c >= 115 && c <= 150) {
            const lordosisOffset = Math.sin((r - 50) / 180 * Math.PI) * 12;
            const effCol = c - lordosisOffset;
            if (effCol >= 115 && effCol <= 150) {
              const isBorder = r === vb.top || r === vb.bot || effCol === 115 || effCol === 150;
              val = isBorder ? 40 : 180 - distFromCenter * 40;
            }
          }
        }

        // Spinal canal & CSF
        const canalXCenter = 162 + Math.sin((r - 50) / 180 * Math.PI) * 12;
        if (Math.abs(c - canalXCenter) < 9 && r >= 45 && r <= 235) {
          const canalFactor = 1.0 - distFromCenter * 0.7;
          val = 340 * canalFactor;

          if (r >= 174 && r <= 182 && c < canalXCenter + 2) {
            val = 80;
          }
        }

        // Discs
        for (const disc of discs) {
          if (Math.abs(r - disc.y) <= 3 && c >= 115 && c <= 152) {
            const lordosisOffset = Math.sin((r - 50) / 180 * Math.PI) * 12;
            const effCol = c - lordosisOffset;
            if (effCol >= 115 && effCol <= 154) {
              if (disc.herniation && effCol > 146) {
                val = 110;
              } else {
                val = disc.degeneration > 0.6 ? 70 : 260 * (1 - distFromCenter * 0.5);
              }
            }
          }
        }

        // Posterior elements
        if (c >= canalXCenter + 12 && c <= canalXCenter + 30 && (r % 32 < 14) && r >= 50 && r <= 230) {
          val = 70;
        }

        buffer[idx] = Math.max(0, val);
      }
    }

    slices.push({
      sliceIndex: s + 1,
      sliceLocation: (s - 8.5) * 4.0,
      data: buffer,
      rows,
      cols,
      min: 0,
      max: 400,
      windowWidth: 350,
      windowCenter: 180,
    });
  }

  const metadata: DicomMetadata = {
    patientName: 'Anderson^Eleanor^M',
    patientId: 'MRN-7739218',
    studyDate: '2026-09-18',
    modality: 'MR',
    seriesDescription: 'SAG T2 FSE LUMBAR SPINE',
    seriesNumber: 4,
    sliceCount: sliceCount,
    rows: 256,
    cols: 256,
    windowCenter: 180,
    windowWidth: 350,
    sliceThickness: 4.0,
    institutionName: 'Swedish Neuroscience Institute (Outside Imaging)',
    sourceType: 'SAMPLE_DATA',
  };

  return { metadata, slices };
}
