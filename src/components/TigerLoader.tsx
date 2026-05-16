import { motion, AnimatePresence } from "framer-motion";
import TigerPlayer from "./TigerPlayer";

interface TigerLoaderProps {
  isLoading: boolean;
  text?: string;
}

export default function TigerLoader({ isLoading, text = "Yuklanmoqda... 🐯" }: TigerLoaderProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <TigerPlayer text="" size={240} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl font-display font-black tracking-tight text-slate-900 dark:text-white">
                {text}
              </p>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
