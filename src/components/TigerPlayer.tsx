import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";
import { motion } from "framer-motion";

interface TigerPlayerProps {
  text?: string;
  className?: string;
  size?: number;
}

export default function TigerPlayer({ 
  text = "Global peshqadamlar yuklanmoqda...", 
  className,
  size = 256
}: TigerPlayerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div style={{ width: size, height: size }} className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        
        <motion.div
          animate={{ rotate: [0, 5, 0, -5, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full relative z-10"
        >
          <DotLottiePlayer
            src="https://lottie.host/e13ec95b-7cab-4e98-8d9c-a19bb8e713db/hDDaTKJNQa.lottie"
            autoplay
            loop
            className="w-full h-full"
          />
        </motion.div>
      </div>
      
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground font-display font-medium text-lg animate-pulse"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
