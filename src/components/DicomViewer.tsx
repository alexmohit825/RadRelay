import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DicomMetadata, DicomSlice } from '../types/dicom';
import {
  ZoomIn,
  RotateCw,
  Sun,
  Maximize2,
  Ruler,
  Layers,
  Activity,
  Send,
  CheckCircle2,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

interface DicomViewerProps {
  metadata: DicomMetadata;
  slices: DicomSlice[];
  onPushToChangePacs?: () => void;
}

interface Point {
  x: number;
  y: number;
}

export const DicomViewer: React.FC<DicomViewerProps> = ({
  metadata,
  slices,
  onPushToChangePacs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentSliceIndex, setCurrentSliceIndex] = useState<number>(Math.floor(slices.length / 2));
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [windowCenter, setWindowCenter] = useState<number>(metadata.windowCenter || 180);
  const [windowWidth, setWindowWidth] = useState<number>(metadata.windowWidth || 350);
  const [rotation, setRotation] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<'scroll' | 'window' | 'zoom' | 'pan' | 'measure' | 'cobb' | 'stenosis'>('scroll');
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [interactionStart, setInteractionStart] = useState<Point>({ x: 0, y: 0 });

  // Phase 3 Spine Measurement State
  const [caliperPoints, setCaliperPoints] = useState<Point[]>([]);
  const [cobbLines, setCobbLines] = useState<{ p1: Point; p2: Point }[]>([]);
  const [stenosisCanalPoints, setStenosisCanalPoints] = useState<Point[]>([]);
  const [pacsPushStatus, setPacsPushStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS'>('IDLE');

  // Synchronize state when study changes
  useEffect(() => {
    setCurrentSliceIndex(Math.floor(slices.length / 2));
    setWindowCenter(metadata.windowCenter || 180);
    setWindowWidth(metadata.windowWidth || 350);
    setCaliperPoints([]);
    setCobbLines([]);
    setStenosisCanalPoints([]);
    setPacsPushStatus('IDLE');
  }, [metadata, slices]);

  // Calculate Cobb Angle between two lines
  const calculateCobbAngle = (l1: { p1: Point; p2: Point }, l2: { p1: Point; p2: Point }) => {
    const angle1 = Math.atan2(l1.p2.y - l1.p1.y, l1.p2.x - l1.p1.x);
    const angle2 = Math.atan2(l2.p2.y - l2.p1.y, l2.p2.x - l2.p1.x);
    let diff = Math.abs((angle1 - angle2) * (180 / Math.PI));
    if (diff > 90) diff = 180 - diff;
    return diff.toFixed(1);
  };

  const renderSlice = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slices[currentSliceIndex]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const slice = slices[currentSliceIndex];
    const { rows, cols, data } = slice;

    const imgData = ctx.createImageData(cols, rows);
    const rgba = imgData.data;

    const lowerBound = windowCenter - windowWidth / 2;
    const upperBound = windowCenter + windowWidth / 2;
    const range = windowWidth > 0 ? windowWidth : 1;

    for (let i = 0; i < rows * cols; i++) {
      const val = data[i];
      let norm = 0;
      if (val <= lowerBound) norm = 0;
      else if (val >= upperBound) norm = 255;
      else norm = Math.round(((val - lowerBound) / range) * 255);

      const pIdx = i * 4;
      rgba[pIdx] = norm;
      rgba[pIdx + 1] = norm;
      rgba[pIdx + 2] = norm;
      rgba[pIdx + 3] = 255;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cols;
    tempCanvas.height = rows;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, -cols / 2, -rows / 2);
    }

    // Render 1. Distance Caliper
    if (caliperPoints.length > 0) {
      ctx.strokeStyle = '#38BDF8';
      ctx.fillStyle = '#38BDF8';
      ctx.lineWidth = 2 / zoom;

      for (let i = 0; i < caliperPoints.length; i++) {
        const pt = caliperPoints[i];
        ctx.beginPath();
        ctx.arc(pt.x - cols / 2, pt.y - rows / 2, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();

        if (i > 0) {
          const prev = caliperPoints[i - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x - cols / 2, prev.y - rows / 2);
          ctx.lineTo(pt.x - cols / 2, pt.y - rows / 2);
          ctx.stroke();

          const distPx = Math.sqrt(Math.pow(pt.x - prev.x, 2) + Math.pow(pt.y - prev.y, 2));
          const distMm = (distPx * 0.82).toFixed(1);

          ctx.font = `${12 / zoom}px -apple-system, sans-serif`;
          ctx.fillText(
            `${distMm} mm`,
            (prev.x + pt.x) / 2 - cols / 2 + 5,
            (prev.y + pt.y) / 2 - rows / 2 - 5
          );
        }
      }
    }

    // Render 2. Cobb Angle Lines
    if (cobbLines.length > 0) {
      ctx.strokeStyle = '#F59E0B';
      ctx.fillStyle = '#F59E0B';
      ctx.lineWidth = 2 / zoom;

      cobbLines.forEach((line, idx) => {
        ctx.beginPath();
        ctx.moveTo(line.p1.x - cols / 2, line.p1.y - rows / 2);
        ctx.lineTo(line.p2.x - cols / 2, line.p2.y - rows / 2);
        ctx.stroke();

        ctx.font = `${11 / zoom}px -apple-system, sans-serif`;
        ctx.fillText(
          `Endplate ${idx + 1}`,
          line.p2.x - cols / 2 + 5,
          line.p2.y - rows / 2
        );
      });

      if (cobbLines.length === 2) {
        const angle = calculateCobbAngle(cobbLines[0], cobbLines[1]);
        ctx.font = `bold ${14 / zoom}px -apple-system, sans-serif`;
        ctx.fillStyle = '#F59E0B';
        ctx.fillText(
          `Cobb: ${angle}°`,
          (cobbLines[0].p1.x + cobbLines[1].p1.x) / 2 - cols / 2,
          (cobbLines[0].p1.y + cobbLines[1].p1.y) / 2 - rows / 2
        );
      }
    }

    // Render 3. Canal Stenosis AP Caliper
    if (stenosisCanalPoints.length > 0) {
      ctx.strokeStyle = '#EC4899';
      ctx.fillStyle = '#EC4899';
      ctx.lineWidth = 2 / zoom;

      stenosisCanalPoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x - cols / 2, pt.y - rows / 2, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (stenosisCanalPoints.length === 2) {
        const [p1, p2] = stenosisCanalPoints;
        ctx.beginPath();
        ctx.moveTo(p1.x - cols / 2, p1.y - rows / 2);
        ctx.lineTo(p2.x - cols / 2, p2.y - rows / 2);
        ctx.stroke();

        const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const distMm = distPx * 0.82;
        let grading = 'Normal (>12mm)';
        if (distMm < 10) grading = 'Severe Stenosis (<10mm)';
        else if (distMm < 12) grading = 'Relative Stenosis (10-12mm)';

        ctx.font = `${11 / zoom}px -apple-system, sans-serif`;
        ctx.fillText(
          `Canal AP: ${distMm.toFixed(1)} mm [${grading}]`,
          (p1.x + p2.x) / 2 - cols / 2 + 5,
          (p1.y + p2.y) / 2 - rows / 2 - 5
        );
      }
    }

    ctx.restore();
  }, [currentSliceIndex, slices, zoom, pan, rotation, windowCenter, windowWidth, caliperPoints, cobbLines, stenosisCanalPoints]);

  useEffect(() => {
    renderSlice();
  }, [renderSlice]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsInteracting(true);
    setInteractionStart({ x: e.clientX, y: e.clientY });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - canvas.width / 2 - pan.x) / zoom + 128;
    const clickY = (e.clientY - rect.top - canvas.height / 2 - pan.y) / zoom + 128;

    if (activeTool === 'measure') {
      if (caliperPoints.length >= 2) setCaliperPoints([{ x: clickX, y: clickY }]);
      else setCaliperPoints(prev => [...prev, { x: clickX, y: clickY }]);
    } else if (activeTool === 'cobb') {
      if (cobbLines.length === 0) {
        setCobbLines([{ p1: { x: clickX, y: clickY }, p2: { x: clickX + 40, y: clickY } }]);
      } else if (cobbLines.length === 1) {
        setCobbLines(prev => [...prev, { p1: { x: clickX, y: clickY }, p2: { x: clickX + 40, y: clickY } }]);
      } else {
        setCobbLines([{ p1: { x: clickX, y: clickY }, p2: { x: clickX + 40, y: clickY } }]);
      }
    } else if (activeTool === 'stenosis') {
      if (stenosisCanalPoints.length >= 2) setStenosisCanalPoints([{ x: clickX, y: clickY }]);
      else setStenosisCanalPoints(prev => [...prev, { x: clickX, y: clickY }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInteracting) return;
    const dx = e.clientX - interactionStart.x;
    const dy = e.clientY - interactionStart.y;

    if (activeTool === 'scroll') {
      if (Math.abs(dy) > 10) {
        const delta = dy > 0 ? -1 : 1;
        setCurrentSliceIndex(prev => Math.max(0, Math.min(slices.length - 1, prev + delta)));
        setInteractionStart({ x: e.clientX, y: e.clientY });
      }
    } else if (activeTool === 'window') {
      setWindowWidth(prev => Math.max(10, prev + dx * 2));
      setWindowCenter(prev => prev + dy * 2);
      setInteractionStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'pan') {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setInteractionStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'zoom') {
      setZoom(prev => Math.max(0.5, Math.min(5.0, prev - dy * 0.01)));
      setInteractionStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setCurrentSliceIndex(prev => Math.max(0, Math.min(slices.length - 1, prev + delta)));
  };

  const handlePushToPacs = () => {
    setPacsPushStatus('SENDING');
    setTimeout(() => {
      setPacsPushStatus('SUCCESS');
      onPushToChangePacs?.();
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 text-sm tracking-wide">
                {metadata.patientName.replace(/\^/g, ' ')}
              </span>
              <span className="px-2 py-0.5 text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono">
                {metadata.patientId}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>{metadata.modality}</span>
              <span>•</span>
              <span className="text-cyan-300 font-medium">{metadata.seriesDescription}</span>
              <span>•</span>
              <span>{metadata.studyDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400">Target PACS</div>
            <div className="text-xs font-mono font-medium text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>CHANGE_HORIZON</span>
            </div>
          </div>

          <button
            onClick={handlePushToPacs}
            disabled={pacsPushStatus !== 'IDLE'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              pacsPushStatus === 'SUCCESS'
                ? 'bg-emerald-600 text-white'
                : pacsPushStatus === 'SENDING'
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {pacsPushStatus === 'SUCCESS' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Relayed via C-STORE</span>
              </>
            ) : pacsPushStatus === 'SENDING' ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                <span>Pushing to Port 104...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Relay to Change PACS</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={560}
          height={560}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="cursor-crosshair block"
        />

        <div className="absolute top-3 left-4 pointer-events-none text-[11px] font-mono text-cyan-400/80 leading-relaxed">
          <div>SERIES {metadata.seriesNumber}</div>
          <div>SLICE: {currentSliceIndex + 1} / {slices.length}</div>
          <div>LOC: {slices[currentSliceIndex]?.sliceLocation.toFixed(1)} mm</div>
          <div>THICK: {metadata.sliceThickness || 4.0} mm</div>
        </div>

        <div className="absolute top-3 right-4 pointer-events-none text-[11px] font-mono text-cyan-400/80 text-right leading-relaxed">
          <div>WL: {Math.round(windowCenter)}</div>
          <div>WW: {Math.round(windowWidth)}</div>
          <div>ZOOM: {(zoom * 100).toFixed(0)}%</div>
          <div>ROT: {rotation}°</div>
        </div>

        <div className="absolute bottom-3 left-4 pointer-events-none text-[11px] font-mono text-slate-400">
          <div>{metadata.institutionName || 'Outside Facility'}</div>
          <div className="text-emerald-400">SOURCE: {metadata.sourceType}</div>
        </div>

        <div className="absolute bottom-3 right-4 pointer-events-none text-[11px] font-mono text-amber-400 bg-black/60 px-2 py-1 rounded border border-amber-900/60">
          SPINE PROTOCOL: SAGITTAL LUMBAR
        </div>
      </div>

      {/* Floating Toolbar & Scrub Controls */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <span className="text-xs font-mono text-slate-400">Slice</span>
          <input
            type="range"
            min={0}
            max={slices.length - 1}
            value={currentSliceIndex}
            onChange={(e) => setCurrentSliceIndex(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-cyan-400 w-12 text-right">
            {currentSliceIndex + 1}/{slices.length}
          </span>
        </div>

        {/* Diagnostic Tools Button Group */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTool('scroll')}
            title="Scroll Slices"
            className={`p-1.5 rounded transition ${activeTool === 'scroll' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('window')}
            title="Window / Level"
            className={`p-1.5 rounded transition ${activeTool === 'window' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('zoom')}
            title="Zoom"
            className={`p-1.5 rounded transition ${activeTool === 'zoom' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1"></div>
          {/* Caliper Measurement Suite */}
          <button
            onClick={() => setActiveTool('measure')}
            title="Millimeter Caliper"
            className={`p-1.5 rounded transition ${activeTool === 'measure' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('cobb')}
            title="Cobb Angle Tool (Lordosis / Scoliosis)"
            className={`p-1.5 rounded transition ${activeTool === 'cobb' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-400'}`}
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('stenosis')}
            title="Spinal Canal AP Stenosis Caliper"
            className={`p-1.5 rounded transition ${activeTool === 'stenosis' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-pink-400'}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1"></div>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            title="Rotate 90°"
            className="p-1.5 rounded text-slate-400 hover:text-white"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1.1);
              setPan({ x: 0, y: 0 });
              setRotation(0);
              setWindowCenter(metadata.windowCenter || 180);
              setWindowWidth(metadata.windowWidth || 350);
              setCaliperPoints([]);
              setCobbLines([]);
              setStenosisCanalPoints([]);
            }}
            title="Reset All Tools"
            className="p-1.5 rounded text-slate-400 hover:text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
