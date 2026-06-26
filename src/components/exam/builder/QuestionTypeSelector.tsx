import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Search, X, Check, ChevronRight, Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionType, QUESTION_TYPE_CONFIGS } from "./types";

// ============================================================
// QuestionTypeSelector — Modal for selecting question type
// Groups all 30+ types by category with search
// ============================================================

interface QuestionTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: QuestionType) => void;
  currentType?: QuestionType;
}

const COLOR_MAP: Record<string, string> = {
  violet:  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  purple:  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  blue:    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  cyan:    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  teal:    "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300",
  green:   "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  lime:    "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300",
  yellow:  "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  orange:  "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  amber:   "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  red:     "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  rose:    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
  pink:    "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  indigo:  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  slate:   "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300",
  zinc:    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300",
  sky:     "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300",
  gray:    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300",
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
  violet:  "ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950/40",
  purple:  "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/40",
  blue:    "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40",
  emerald: "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  orange:  "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/40",
  red:     "ring-2 ring-red-500 bg-red-50 dark:bg-red-950/40",
  default: "ring-2 ring-violet-500 bg-violet-50",
};

const CATEGORIES = ["Choice", "Text", "Matching", "IELTS", "Listening", "Speaking", "Advanced", "Media"];

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  open, onClose, onSelect, currentType
}) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = QUESTION_TYPE_CONFIGS.filter((c) => {
    const matchSearch = !search ||
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || c.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const grouped = CATEGORIES.reduce<Record<string, typeof QUESTION_TYPE_CONFIGS>>((acc, cat) => {
    acc[cat] = filtered.filter((c) => c.category === cat);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setSearch(""); setActiveCategory(null); }}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
        }}
      >
        <DialogTitle className="sr-only">Question Type Selector</DialogTitle>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-violet-600/5 to-purple-600/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Savol Turi Tanlash
              </h2>
              <p className="text-xs text-muted-foreground">{QUESTION_TYPE_CONFIGS.length} ta tur mavjud</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Savol turini qidiring..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <button
              className={cn(
                "px-2.5 py-1 text-xs rounded-full border font-medium transition-all",
                !activeCategory
                  ? "bg-violet-600 text-white border-violet-600"
                  : "border-border hover:border-violet-400 hover:text-violet-600"
              )}
              onClick={() => setActiveCategory(null)}
            >
              Hammasi
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border font-medium transition-all",
                  activeCategory === cat
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-border hover:border-violet-400 hover:text-violet-600"
                )}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat}</h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((config) => {
                    const isActive = currentType === config.type;
                    const colorClass = COLOR_MAP[config.color] || COLOR_MAP.gray;
                    const activeColorClass = ACTIVE_COLOR_MAP[config.color] || ACTIVE_COLOR_MAP.default;
                    return (
                      <motion.button
                        key={config.type}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                          isActive ? activeColorClass : "hover:bg-card hover:shadow-sm border-transparent hover:border-border"
                        )}
                        onClick={() => { onSelect(config.type); onClose(); setSearch(""); setActiveCategory(null); }}
                      >
                        {/* Icon */}
                        <div className={cn("shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center text-base font-bold", colorClass)}>
                          {config.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-tight">{config.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{config.description}</p>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {config.hasMedia && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">Media</span>}
                            {config.supportsAudio && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">Audio</span>}
                            {config.supportsVideo && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">Video</span>}
                          </div>
                        </div>

                        {/* Active check */}
                        {isActive && (
                          <div className="absolute top-2 right-2 h-4 w-4 bg-violet-600 rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-xs text-muted-foreground">
            30+ savol turi qo'llab-quvvatlanadi • Har bir tur o'ziga xos konfiguratsiya paneli bilan keladi
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionTypeSelector;
