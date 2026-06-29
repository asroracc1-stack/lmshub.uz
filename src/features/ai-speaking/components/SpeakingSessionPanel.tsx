import { Clock, BookOpen, Globe, GraduationCap, Hash, Radio } from "lucide-react";
import { SpeakingSession, AvatarState } from "../types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpeakingSessionPanelProps {
  session: SpeakingSession;
  avatarState: AvatarState;
}

export default function SpeakingSessionPanel({ session, avatarState }: SpeakingSessionPanelProps) {
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = (state: AvatarState) => {
    const configs: Record<AvatarState, { label: string; cls: string }> = {
      idle: { label: "Ready to Speak", cls: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
      listening: { label: "Listening", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
      thinking: { label: "Analyzing response...", cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
      speaking: { label: "Speaking", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
      happy: { label: "Happy", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      error: { label: "Connection Error", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
      disconnected: { label: "Offline", cls: "bg-slate-500/10 text-slate-650 dark:text-slate-400 border-slate-500/20" },
    };
    return configs[state] || configs.idle;
  };

  const status = getStatusConfig(avatarState);

  return (
    <Card className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Active Session</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time speaking analysis</p>
        </div>
        <Badge variant="outline" className={cn("px-2.5 py-1 font-bold text-xs uppercase tracking-wider border rounded-xl flex items-center gap-1.5", status.cls)}>
          <Radio className={cn("w-3.5 h-3.5", avatarState === "listening" && "animate-ping")} />
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Timer Card */}
        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Duration</p>
            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
              {session.isActive ? formatTime(session.duration) : "00:00"}
            </p>
          </div>
        </div>

        {/* Word Counter Card */}
        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Words</p>
            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{session.totalWords}</p>
          </div>
        </div>
      </div>

      {/* Session Configurations List */}
      <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/60 pt-4 text-sm font-semibold">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> Current Topic
          </span>
          <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[180px]">
            {session.topic}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" /> Language
          </span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            {session.language}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-500" /> Proficiency Level
          </span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            {session.level}
          </span>
        </div>
      </div>
    </Card>
  );
}
