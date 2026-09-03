import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, RotateCw, Trash2, Maximize2, Minimize2, Check, X, Edit3 } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  required?: boolean;
  height?: number;
  penColor?: string;
  penWidth?: number;
  placeholderText?: string;
  className?: string;
  id?: string;
}

type PointerLikeEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label = 'TANDA TANGAN DIGITAL PEMILIK',
  required = false,
  height = 150,
  penColor = '#0f172a',
  penWidth = 3,
  placeholderText = 'Goreskan tanda tangan Anda pada area di atas menggunakan jari atau stylus.',
  className = '',
  id,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullContainerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [fullHistory, setFullHistory] = useState<ImageData[]>([]);
  const [fullRedoStack, setFullRedoStack] = useState<ImageData[]>([]);

  // Restore nilai existing
  useEffect(() => {
    if (value && value.length > 100) {
      setHasSignature(true);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (history.length === 0) {
            setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
          }
        };
        img.src = value;
      }
    } else if (!value && hasSignature) {
      clearCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const setupCtx = (ctx: CanvasRenderingContext2D, width = penWidth) => {
    ctx.strokeStyle = penColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // --- Canvas inline ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setupCtx(ctx);
    const coords = getCanvasCoords(e, ctx.canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const coords = getCanvasCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setRedoStack([]);
    onChange(canvas.toDataURL('image/png'));
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || history.length === 0) return;

    if (history.length === 1) {
      setRedoStack((prev) => [history[0], ...prev]);
      setHistory([]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onChange(undefined);
    } else {
      const popped = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setRedoStack((prev) => [popped, ...prev]);
      setHistory(newHistory);
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
      setHasSignature(true);
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const nextState = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setHistory((prev) => [...prev, nextState]);
    ctx.putImageData(nextState, 0, 0);
    setHasSignature(true);
    onChange(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setRedoStack([]);
    setHasSignature(false);
    onChange(undefined);
  };

  // --- Fullscreen ---
  useEffect(() => {
    if (isFullScreen && fullContainerRef.current && fullCanvasRef.current) {
      const container = fullContainerRef.current;
      const fullCanvas = fullCanvasRef.current;
      const ctx = fullCanvas.getContext('2d');
      if (!ctx) return;

      const width = Math.max(container.clientWidth - 16, 320);
      const heightFull = Math.max(container.clientHeight - 20, 280);
      fullCanvas.width = width;
      fullCanvas.height = heightFull;

      setupCtx(ctx, penWidth + 1);
      const inlineCanvas = canvasRef.current;
      if (inlineCanvas && hasSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, heightFull);
          setFullHistory([ctx.getImageData(0, 0, width, heightFull)]);
          setFullRedoStack([]);
        };
        img.src = inlineCanvas.toDataURL('image/png');
      } else {
        setFullHistory([]);
        setFullRedoStack([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreen]);

  const startFullDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = fullCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const canvas = fullCanvasRef.current!;
    setupCtx(ctx, penWidth + 1);
    const coords = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const drawFull = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = fullCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const coords = getCanvasCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopFullDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = fullCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    setFullHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setFullRedoStack([]);
  };

  const handleFullUndo = () => {
    const canvas = fullCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || fullHistory.length === 0) return;

    if (fullHistory.length === 1) {
      setFullRedoStack((prev) => [fullHistory[0], ...prev]);
      setFullHistory([]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const popped = fullHistory[fullHistory.length - 1];
      const newHistory = fullHistory.slice(0, -1);
      setFullRedoStack((prev) => [popped, ...prev]);
      setFullHistory(newHistory);
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };

  const handleFullRedo = () => {
    if (fullRedoStack.length === 0) return;
    const canvas = fullCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const nextState = fullRedoStack[0];
    setFullRedoStack((prev) => prev.slice(1));
    setFullHistory((prev) => [...prev, nextState]);
    ctx.putImageData(nextState, 0, 0);
  };

  const clearFullCanvas = () => {
    const canvas = fullCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFullHistory([]);
    setFullRedoStack([]);
  };

  const saveFullScreenSignature = () => {
    const fullCanvas = fullCanvasRef.current;
    const inlineCanvas = canvasRef.current;
    const inlineCtx = inlineCanvas?.getContext('2d');
    if (!fullCanvas || !inlineCanvas || !inlineCtx) return;

    if (fullHistory.length === 0) {
      clearCanvas();
      setIsFullScreen(false);
      return;
    }

    const dataUrl = fullCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      inlineCtx.clearRect(0, 0, inlineCanvas.width, inlineCanvas.height);
      inlineCtx.drawImage(img, 0, 0, inlineCanvas.width, inlineCanvas.height);
      setHasSignature(true);
      setHistory([inlineCtx.getImageData(0, 0, inlineCanvas.width, inlineCanvas.height)]);
      setRedoStack([]);
      onChange(dataUrl);
      setIsFullScreen(false);
    };
    img.src = dataUrl;
  };

  return (
    <div className={`space-y-2 ${className}`} id={id}>
      <div className="flex items-center justify-between">
        <label className="section-label flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
        {hasSignature ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Check size={11} /> Terekam
          </span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            {required ? '* Wajib ditandatangani' : 'Belum ditandatangani'}
          </span>
        )}
      </div>

      <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xs transition-all hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          width={500}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block w-full cursor-crosshair bg-slate-50/80 touch-none dark:bg-slate-900/90"
          style={{ height: `${height}px`, touchAction: 'none' }}
        />

        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 backdrop-blur-xs dark:border-slate-700 dark:bg-slate-800/90">
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 transition-all hover:bg-brand-100 active:scale-95 dark:border-brand-800 dark:bg-brand-950/80 dark:text-brand-300"
            title="Perbesar Tanda Tangan (Layar Penuh)"
          >
            <Maximize2 size={13} />
            <span className="text-[11px] font-black">Layar Penuh</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="cursor-pointer rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Undo / Batal coretan terakhir"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="cursor-pointer rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Redo / Ulangi coretan"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasSignature && history.length === 0}
            className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-rose-950/60"
            title="Bersihkan tanda tangan"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-400 italic dark:bg-slate-900/70">
          {hasSignature ? 'Goresan aktif' : 'Goreskan jari/stylus Anda di sini'}
        </div>
      </div>

      <p className="flex items-center gap-1 text-[10.5px] leading-tight text-slate-500 italic dark:text-slate-400">
        <span>💡 {placeholderText}</span>
        <button
          type="button"
          onClick={() => setIsFullScreen(true)}
          className="ml-1 inline-flex cursor-pointer items-center gap-0.5 font-bold text-brand-600 not-italic underline hover:text-brand-800 dark:text-brand-400"
        >
          Klik "Layar Penuh" jika layar HP sempit
        </button>
      </p>

      {isFullScreen && (
        <div className="animate-fade-in fixed inset-0 z-[80] flex flex-col bg-slate-950/95 p-3 text-white backdrop-blur-md sm:p-5">
          <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-brand-500/40 bg-brand-600/30 p-2 text-brand-300">
                <Edit3 size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold tracking-tight">
                  Tanda Tangan Digital (Mode Layar Penuh)
                </h3>
                <p className="text-xs text-slate-400">Area luas agar tanda tangan lebih leluasa dan rapi pada HP.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="cursor-pointer rounded-xl bg-slate-800 p-2 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFullUndo}
                disabled={fullHistory.length === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:border-brand-600 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95"
              >
                <RotateCcw size={15} className="text-brand-300" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleFullRedo}
                disabled={fullRedoStack.length === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:border-brand-600 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95"
              >
                <RotateCw size={15} className="text-brand-300" />
                <span>Redo</span>
              </button>
              <button
                type="button"
                onClick={clearFullCanvas}
                disabled={fullHistory.length === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-rose-300 transition-all hover:border-rose-800 hover:bg-rose-950/80 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95"
              >
                <Trash2 size={15} />
                <span>Bersihkan</span>
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveFullScreenSignature}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-md transition-all hover:bg-emerald-500 active:scale-95"
              >
                <Check size={15} />
                <span>Gunakan Tanda Tangan Ini</span>
              </button>
            </div>
          </div>

          <div ref={fullContainerRef} className="relative w-full flex-1 overflow-hidden rounded-2xl border-2 border-brand-500/50 bg-slate-100 shadow-2xl">
            <canvas
              ref={fullCanvasRef}
              onMouseDown={startFullDrawing}
              onMouseMove={drawFull}
              onMouseUp={stopFullDrawing}
              onMouseLeave={stopFullDrawing}
              onTouchStart={startFullDrawing}
              onTouchMove={drawFull}
              onTouchEnd={stopFullDrawing}
              className="block h-full w-full cursor-crosshair bg-white touch-none"
              style={{ touchAction: 'none' }}
            />
            <div className="pointer-events-none absolute bottom-3 left-4 rounded-lg border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-400 backdrop-blur-xs">
              ✍️ Gunakan seluruh permukaan ini untuk tanda tangan Anda
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
