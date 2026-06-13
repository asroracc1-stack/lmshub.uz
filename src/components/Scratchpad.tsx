import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { X, Eraser, Pen, RotateCcw, GripHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Scratchpad({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#9F86C0");
  const [lineWidth, setLineWidth] = useState(3);
  const [size, setSize] = useState({ w: 500, h: 400 });
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 500, h: 400 });

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    // Save existing drawing
    const savedImageData = canvas.width > 0 && canvas.height > 0
      ? canvasRef.current.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height)
      : null;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (savedImageData) { try { ctx.putImageData(savedImageData, 0, 0); } catch {} }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [isOpen, size]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      setSize({
        w: Math.max(280, resizeStart.current.w + ev.clientX - resizeStart.current.x),
        h: Math.max(250, resizeStart.current.h + ev.clientY - resizeStart.current.y),
      });
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [size]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const { x, y } = getPos(e, canvas);
    if (mode === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = lineWidth * 5;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          style={{ width: size.w, height: size.h }}
          className="fixed bottom-24 left-4 md:left-8 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden flex flex-col select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
            <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Pen className="h-4 w-4 text-violet-500" /> Qoralama daftari
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant={mode === "pen" ? "default" : "outline"}
                className={`h-7 w-7 rounded-full ${mode === "pen" ? "bg-violet-500 hover:bg-violet-600 border-0 text-white" : ""}`}
                onClick={() => setMode("pen")} title="Qalam">
                <Pen className="h-3 w-3" />
              </Button>
              <Button size="icon" variant={mode === "eraser" ? "default" : "outline"}
                className={`h-7 w-7 rounded-full ${mode === "eraser" ? "bg-rose-500 hover:bg-rose-600 border-0 text-white" : ""}`}
                onClick={() => setMode("eraser")} title="O'chirg'ich">
                <Eraser className="h-3 w-3" />
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-amber-500 hover:bg-amber-500/10" onClick={clearCanvas} title="Tozalash">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" onClick={onClose} title={t("dynamic.syllabus.yopish")}>
                <X className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#070b19]/60" ref={containerRef}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06]"
              style={{ backgroundImage: "linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
          </div>

          {/* Footer */}
          <div className="h-11 border-t border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-900/60 flex items-center px-3 gap-3 justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {["#9F86C0", "#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#1e293b", "#ffffff"].map(c => (
                <button key={c} onClick={() => { setColor(c); setMode("pen"); }}
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110 border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c && mode === "pen" ? "rgba(139,92,246,0.8)" : "transparent",
                    transform: color === c && mode === "pen" ? "scale(1.25)" : undefined
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider hidden sm:block">{t("dynamic.scratchpad.qalinlik")}</span>
              <input type="range" min="1" max="20" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                className="w-20 accent-violet-500 h-1 cursor-pointer" />
            </div>
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeMouseDown}
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-end justify-end pb-1.5 pr-1.5 group z-10"
            title="Kengaytirish"
          >
            <GripHorizontal className="h-4 w-4 text-slate-300 dark:text-slate-600 rotate-45 group-hover:text-violet-500 transition-colors" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
