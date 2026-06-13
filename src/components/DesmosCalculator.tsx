import { useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";
import { X, Calculator, GripHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function DesmosCalculator({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [size, setSize] = useState({ w: 550, h: 420 });
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 550, h: 420 });

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      setSize({
        w: Math.max(320, resizeStart.current.w + ev.clientX - resizeStart.current.x),
        h: Math.max(300, resizeStart.current.h + ev.clientY - resizeStart.current.y),
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          style={{ width: size.w, height: size.h }}
          className="fixed bottom-24 right-4 md:right-8 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden flex flex-col select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
            <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Calculator className="h-4 w-4 text-purple-500" /> Desmos Kalkulyator
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" onClick={onClose} title="Yopish">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Iframe */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#070b19]/60">
            <iframe
              src="https://www.desmos.com/calculator"
              title="Desmos Graphing Calculator"
              className="absolute inset-0 w-full h-full border-0 select-text"
              allow="clipboard-write"
            />
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeMouseDown}
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-end justify-end pb-1.5 pr-1.5 group z-10"
            title="Kengaytirish"
          >
            <GripHorizontal className="h-4 w-4 text-slate-300 dark:text-slate-600 rotate-45 group-hover:text-purple-500 transition-colors" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
