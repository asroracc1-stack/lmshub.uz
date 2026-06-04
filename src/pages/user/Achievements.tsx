import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import TigerPlayer from "@/components/TigerPlayer";
import { Sparkles } from "lucide-react";

export default function UserAchievements() {
  return (
    <div className="p-6 md:p-12 min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <Card className="relative overflow-hidden p-10 bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[3rem] text-center">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-400/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-fuchsia-400/20 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-20 w-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl shadow-amber-500/30">
              <Sparkles className="w-10 h-10" />
            </div>
            
            <TigerPlayer text="Yutuqlar bo'limi tayyorlanmoqda!" size={280} />
            
            <h1 className="font-display text-4xl font-black tracking-tight text-slate-800 mt-6 mb-4">
              Tez Orada!
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Tez orada sizning barcha yutuqlaringiz, nishonlar va medallaringiz shu yerda jamlanadi. Mashq qilishda davom eting!
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

