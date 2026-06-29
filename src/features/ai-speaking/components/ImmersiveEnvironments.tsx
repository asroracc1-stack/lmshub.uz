import { motion } from "framer-motion";
import { 
  GraduationCap, Briefcase, Plane, Coffee, 
  Hotel, BookOpen, HeartPulse, Utensils, Award
} from "lucide-react";
import { SpeakingEnvironment } from "../types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImmersiveEnvironmentsProps {
  selectedId: string;
  onSelect: (topic: string, id: string) => void;
}

const ENVIRONMENTS: SpeakingEnvironment[] = [
  { id: "env-1", name: "IELTS Exam Room", description: "Standard interview with an IELTS examiner", iconName: "IELTS", difficulty: "hard" },
  { id: "env-2", name: "Business Meeting", description: "Present and discuss ideas with corporate partners", iconName: "Business", difficulty: "hard" },
  { id: "env-3", name: "Coffee Shop", description: "Order drinks and chat casually with the barista", iconName: "Coffee", difficulty: "easy" },
  { id: "env-4", name: "Airport Check-in", description: "Navigate ticketing, luggage, and gate changes", iconName: "Airport", difficulty: "medium" },
  { id: "env-5", name: "Hotel Reception", description: "Book rooms, handle keycards, and ask for room service", iconName: "Hotel", difficulty: "easy" },
  { id: "env-6", name: "Classroom Seminar", description: "Participate in academic debates and QA sessions", iconName: "Classroom", difficulty: "medium" },
  { id: "env-7", name: "Hospital Clinic", description: "Describe symptoms and understand prescriptions", iconName: "Hospital", difficulty: "medium" },
  { id: "env-8", name: "Modern Restaurant", description: "Reserve tables, ask about specials, and pay the bill", iconName: "Restaurant", difficulty: "easy" }
];

const ICON_MAP: Record<string, any> = {
  IELTS: Award,
  Business: Briefcase,
  Coffee: Coffee,
  Airport: Plane,
  Hotel: Hotel,
  Classroom: BookOpen,
  Hospital: HeartPulse,
  Restaurant: Utensils
};

const DIFF_META = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
};

export default function ImmersiveEnvironments({ selectedId, onSelect }: ImmersiveEnvironmentsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Immersive Environments</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Select a scenario for practice</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1 select-none">
        {ENVIRONMENTS.map((env, idx) => {
          const EnvIcon = ICON_MAP[env.iconName] || Coffee;
          const isSelected = env.id === selectedId;

          return (
            <motion.div
              key={env.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(env.name, env.id)}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative flex flex-col justify-between min-h-[120px]",
                isSelected
                  ? "bg-blue-600/5 dark:bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/5"
                  : "bg-white hover:bg-slate-50 dark:bg-[#111827] dark:hover:bg-slate-800/40 border-slate-200 dark:border-slate-800"
              )}
            >
              {/* Header inside environment card */}
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0 transition-colors",
                  isSelected 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  <EnvIcon className="w-5 h-5" />
                </div>
                
                {/* Active Indicator dot */}
                {isSelected && (
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>

              {/* Title & Description */}
              <div className="mt-3">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                  {env.name}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {env.description}
                </p>
              </div>

              {/* Difficulty Badge */}
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border", DIFF_META[env.difficulty])}>
                  {env.difficulty}
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
