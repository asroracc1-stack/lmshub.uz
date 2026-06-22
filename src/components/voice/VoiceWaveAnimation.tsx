import React from "react";
import { motion } from "framer-motion";

interface VoiceWaveAnimationProps {
  status: "idle" | "listening" | "processing" | "success" | "error";
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({ status }) => {
  const isListening = status === "listening";
  const isProcessing = status === "processing";

  if (status === "idle") return null;

  const barCount = 12;
  const bars = Array.from({ length: barCount });

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs mx-auto">
      {bars.map((_, i) => {
        // Different heights, transition times and delays for realistic wave simulation
        let duration = 1;
        let scaleY = [1, 1];

        if (isListening) {
          duration = 0.5 + Math.random() * 0.6;
          scaleY = [1, 2.5 + Math.random() * 2.5, 1];
        } else if (isProcessing) {
          duration = 0.8 + Math.random() * 0.4;
          scaleY = [1, 1.5 + Math.random() * 0.8, 1];
        }

        return (
          <motion.div
            key={i}
            className={`w-1.5 rounded-full ${
              isProcessing
                ? "bg-amber-500 shadow-[0_0_8px_#F59E0B]"
                : "bg-purple-500 shadow-[0_0_8px_#8B5CF6]"
            }`}
            style={{ height: "16px" }}
            animate={
              isListening || isProcessing
                ? {
                    scaleY,
                  }
                : { scaleY: 1 }
            }
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.05,
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceWaveAnimation;
