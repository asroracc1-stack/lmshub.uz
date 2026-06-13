import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, Target, Mic } from "lucide-react";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface DashboardBannerProps {
  data: StudentIeltsDashboardDto;
}

export default function DashboardBanner({ data }: DashboardBannerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#240046] via-[#5A189A] to-[#9F86C0] rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg shadow-purple-900/30 relative overflow-hidden"
    >
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E7C6FF]/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem]" />

      <div className="relative z-10 w-full md:w-2/3 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          Maqsadlaringiz sari davom eting! <Rocket className="h-6 w-6 text-yellow-300" />
        </h2>

        <div className="flex items-center gap-8 md:gap-16">
          <div>
            <p className="text-violet-100 text-sm mb-1">IELTS Target</p>
            <p className="text-3xl font-bold">{data.targetBand}</p>
          </div>
          <div>
            <p className="text-violet-100 text-sm mb-1">Current Band</p>
            <p className="text-3xl font-bold">{data.currentBand || "—"}</p>
          </div>
          <div className="flex-1 max-w-[200px]">
            <p className="text-violet-100 text-sm mb-1">Progress</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{data.progressPercentage}%</span>
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full" 
                  style={{ width: `${data.progressPercentage}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="bg-white text-violet-600 hover:bg-white/90 gap-2 rounded-full font-semibold px-6">
            <Target className="h-4 w-4" /> Test boshlash
          </Button>
          <Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white gap-2 rounded-full px-6">
            <Mic className="h-4 w-4" /> AI Speaking
          </Button>
        </div>
      </div>

      {/* Placeholder for 3D Illustration / Graphic */}
      <div className="hidden md:flex relative z-10 w-1/3 justify-end items-center right-4">
        <div className="w-48 h-32 flex items-center justify-center text-6xl">
          🎯📚📅
        </div>
      </div>
    </motion.div>
  );
}
