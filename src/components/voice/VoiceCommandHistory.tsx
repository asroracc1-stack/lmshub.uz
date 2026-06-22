import React from "react";
import { CheckCircle2, XCircle, Trash2, Clock } from "lucide-react";
import { CommandHistoryItem } from "@/contexts/VoiceAssistantContext";
import { Button } from "@/components/ui/button";

interface VoiceCommandHistoryProps {
  history: CommandHistoryItem[];
  onClear: () => void;
}

export const VoiceCommandHistory: React.FC<VoiceCommandHistoryProps> = ({ history, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-muted/50 rounded-2xl bg-white/5 dark:bg-black/5">
        <Clock className="w-8 h-8 text-muted-foreground/60 mb-2" />
        <p className="text-xs text-muted-foreground font-medium">Hozircha buyruqlar tarixi mavjud emas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oxirgi buyruqlar ({history.length})</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 px-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Tozalash
        </Button>
      </div>

      <div className="max-h-[220px] overflow-y-auto thin-scrollbar pr-1 space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl border border-muted/40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
                "{item.text}"
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap ml-2">
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceCommandHistory;
