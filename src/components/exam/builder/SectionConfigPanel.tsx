import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings2, Clock, Shuffle, BookOpen,
  Music, FileText, Image as ImageIcon, ChevronDown,
  ChevronUp, Lock, Hash, BarChart3, Palette,
  Info, Sparkles, Loader2, Wand2, Upload,
  BrainCircuit, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Section, Difficulty } from "./types";
import RichTextEditor from "./RichTextEditor";
import { MediaUploader } from "./MediaUploader";
import { toast } from "sonner";

// ============================================================
// SectionConfigPanel — Right panel for section settings
// ============================================================

interface SectionConfigPanelProps {
  section: Section;
  sectionIndex: number;
  onChange: (patch: Partial<Section>) => void;
  onAIParsePdf: (file: File) => void;
  onAIParseText: (text: string) => void;
  aiPdfBusy: boolean;
  aiTextBusy: boolean;
}

const COLOR_THEMES = [
  { value: "violet", label: "Violet", cls: "bg-violet-500" },
  { value: "blue",   label: "Blue",   cls: "bg-blue-500"   },
  { value: "emerald",label: "Green",  cls: "bg-emerald-500"},
  { value: "amber",  label: "Amber",  cls: "bg-amber-500"  },
  { value: "rose",   label: "Rose",   cls: "bg-rose-500"   },
  { value: "slate",  label: "Slate",  cls: "bg-slate-500"  },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "cyan",   label: "Cyan",   cls: "bg-cyan-500"   },
];

const SECTION_ICONS = [
  "📖", "🎧", "✍️", "🎤", "🔢", "🏛️", "📝", "🎯",
  "📚", "💡", "🧪", "🔬", "📊", "🗺️", "🧩", "⚡"
];

const SectionConfigPanel: React.FC<SectionConfigPanelProps> = ({
  section, sectionIndex, onChange, onAIParsePdf, onAIParseText, aiPdfBusy, aiTextBusy
}) => {
  const [aiText, setAiText] = useState("");
  const [activeSection, setActiveSection] = useState<"general" | "passage" | "ai" | "appearance">("general");

  const timeLimitMinutes = section.timeLimitSeconds ? Math.floor(section.timeLimitSeconds / 60) : 0;
  const timeLimitSecs = section.timeLimitSeconds ? section.timeLimitSeconds % 60 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm">
            {section.icon || "📋"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">
              {section.title || `Section ${sectionIndex + 1}`}
            </p>
            <p className="text-[10px] text-muted-foreground">{section.questions.length} savol</p>
          </div>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="mx-3 mt-2 grid grid-cols-4 h-8 shrink-0">
          <TabsTrigger value="general" className="text-[10px] h-7">
            <Settings2 className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="passage" className="text-[10px] h-7">
            <BookOpen className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-[10px] h-7">
            <Sparkles className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-[10px] h-7">
            <Palette className="h-3 w-3" />
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* ---- General Settings ---- */}
          <TabsContent value="general" className="px-3 py-2 space-y-3 m-0">
            {/* Title */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sarlavha</Label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="Section nomi..."
                value={section.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>

            {/* Instructions */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Ko'rsatma</Label>
              <Textarea
                className="mt-1 text-sm resize-none"
                rows={3}
                placeholder="Talabaga ko'rsatma..."
                value={section.instructions || ""}
                onChange={(e) => onChange({ instructions: e.target.value })}
              />
            </div>

            {/* Time limit */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" /> Vaqt chegarasi
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  className="h-8 text-sm flex-1"
                  placeholder="daqiqa"
                  value={timeLimitMinutes || ""}
                  min={0}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 0;
                    onChange({ timeLimitSeconds: mins * 60 + timeLimitSecs });
                  }}
                />
                <span className="text-xs text-muted-foreground">daq</span>
                <Input
                  type="number"
                  className="h-8 text-sm flex-1"
                  placeholder="soniya"
                  value={timeLimitSecs || ""}
                  min={0}
                  max={59}
                  onChange={(e) => {
                    const secs = parseInt(e.target.value) || 0;
                    onChange({ timeLimitSeconds: timeLimitMinutes * 60 + secs });
                  }}
                />
                <span className="text-xs text-muted-foreground">son</span>
              </div>
              {section.timeLimitSeconds && section.timeLimitSeconds > 0 && (
                <button type="button" className="text-[10px] text-rose-500 hover:underline mt-0.5"
                  onClick={() => onChange({ timeLimitSeconds: undefined })}>
                  Olib tashlash
                </button>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Qiyinlik</Label>
              <Select
                value={section.difficulty || "medium"}
                onValueChange={(v) => onChange({ difficulty: v as Difficulty })}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy" className="text-sm">🟢 Oson</SelectItem>
                  <SelectItem value="medium" className="text-sm">🟡 O'rta</SelectItem>
                  <SelectItem value="hard" className="text-sm">🔴 Qiyin</SelectItem>
                  <SelectItem value="expert" className="text-sm">⚫ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Passing score */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">O'tish bali (%)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[section.passingScore || 50]}
                  onValueChange={([v]) => onChange({ passingScore: v })}
                  min={0} max={100} step={5}
                  className="flex-1"
                />
                <span className="text-xs font-bold w-10 text-right">{section.passingScore || 50}%</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-1 border-t">
              {[
                { key: "shuffleQuestions", icon: <Shuffle className="h-3 w-3" />, label: "Savollarni aralashtirish" },
                { key: "shuffleOptions", icon: <Shuffle className="h-3 w-3" />, label: "Variantlarni aralashtirish" },
                { key: "autoNumbering", icon: <Hash className="h-3 w-3" />, label: "Avtomatik raqamlash" },
                { key: "lockNavigation", icon: <Lock className="h-3 w-3" />, label: "Navigatsiyani bloklash" },
                { key: "questionRandomization", icon: <BarChart3 className="h-3 w-3" />, label: "Tasodifiy savollar" },
              ].map(({ key, icon, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {icon} {label}
                  </div>
                  <Switch
                    checked={!!(section as any)[key]}
                    onCheckedChange={(v) => onChange({ [key]: v } as any)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>

            {/* Audio intro */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <Music className="h-3 w-3" /> Audio kirish
              </Label>
              <div className="mt-1 space-y-1">
                <Input
                  className="h-8 text-sm"
                  placeholder="Audio URL..."
                  value={section.audioUrl || ""}
                  onChange={(e) => onChange({ audioUrl: e.target.value })}
                />
                {section.audioUrl && (
                  <audio controls src={section.audioUrl} className="w-full h-9" />
                )}
              </div>
            </div>

            {/* PDF Attachment */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" /> PDF Ilova
              </Label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="PDF URL..."
                value={section.pdfAttachment || ""}
                onChange={(e) => onChange({ pdfAttachment: e.target.value })}
              />
            </div>
          </TabsContent>

          {/* ---- Passage ---- */}
          <TabsContent value="passage" className="px-3 py-2 space-y-3 m-0">
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Passage / Matn</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={section.richPassage || section.passage || ""}
                  onChange={(html) => onChange({ richPassage: html, passage: html.replace(/<[^>]*>/g, "") })}
                  placeholder="Reading passage, instructions yoki savol matnini kiriting..."
                  minHeight={200}
                  showFormulaBar={true}
                />
              </div>
            </div>

            {/* Section image */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Rasm / Xarita / Diagramma
              </Label>
              <div className="mt-1">
                <MediaUploader
                  value={section.media?.[0]}
                  onChange={(m) => onChange({ media: m ? [m] : [] })}
                  accept="image"
                  compact={!!section.media?.[0]?.url}
                  showPosition={true}
                />
              </div>
            </div>
          </TabsContent>

          {/* ---- AI Import ---- */}
          <TabsContent value="ai" className="px-3 py-2 space-y-3 m-0">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <p className="text-xs font-bold text-violet-700 dark:text-violet-300">AI Import</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Matn yoki PDF orqali savollarni avtomatik ajratib oling
              </p>
            </div>

            {/* Text AI */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <Wand2 className="h-3 w-3" /> Matn orqali AI
              </Label>
              <Textarea
                className="mt-1 text-sm resize-none"
                rows={6}
                placeholder="Passage + Questions + Answers matnini kiriting..."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="mt-2 w-full bg-violet-600 hover:bg-violet-700 text-white gap-1.5 text-xs"
                disabled={aiTextBusy || aiText.trim().length < 10}
                onClick={() => { onAIParseText(aiText); }}
              >
                {aiTextBusy
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Tahlil qilinmoqda...</>
                  : <><Wand2 className="h-3.5 w-3.5" /> AI bilan ajratish</>
                }
              </Button>
            </div>

            {/* PDF AI */}
            <div className="border-t pt-3">
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <BrainCircuit className="h-3 w-3" /> PDF orqali AI
              </Label>
              <div className="mt-1">
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                  "hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10",
                  aiPdfBusy && "opacity-60 cursor-not-allowed"
                )}>
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    disabled={aiPdfBusy}
                    onChange={(e) => e.target.files?.[0] && onAIParsePdf(e.target.files[0])}
                  />
                  {aiPdfBusy
                    ? <><Loader2 className="h-6 w-6 animate-spin text-violet-500" /><span className="text-xs text-muted-foreground">PDF tahlil qilinmoqda...</span></>
                    : <><BrainCircuit className="h-6 w-6 text-violet-500" /><span className="text-xs text-muted-foreground">PDF ni bosing yoki sudrang</span></>
                  }
                </label>
                <p className="text-[10px] text-muted-foreground mt-1">Faqat PDF, max 20MB</p>
              </div>
            </div>
          </TabsContent>

          {/* ---- Appearance ---- */}
          <TabsContent value="appearance" className="px-3 py-2 space-y-3 m-0">
            {/* Icon */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Ikon</Label>
              <div className="grid grid-cols-8 gap-1 mt-1">
                {SECTION_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-base hover:bg-muted transition-all",
                      section.icon === icon && "bg-violet-100 dark:bg-violet-900/40 ring-2 ring-violet-500"
                    )}
                    onClick={() => onChange({ icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color theme */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rang mavzusi</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    title={theme.label}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all hover:scale-110",
                      theme.cls,
                      section.colorTheme === theme.value && "ring-2 ring-offset-2 ring-foreground scale-110"
                    )}
                    onClick={() => onChange({ colorTheme: theme.value })}
                  />
                ))}
              </div>
            </div>

            {/* Background color */}
            <div>
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Fon rangi</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  className="h-8 w-12 rounded-md border cursor-pointer"
                  value={section.backgroundColor || "#ffffff"}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                />
                <Input
                  className="flex-1 h-8 text-sm font-mono"
                  value={section.backgroundColor || ""}
                  placeholder="#ffffff"
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                />
                {section.backgroundColor && (
                  <button type="button" className="text-rose-500" onClick={() => onChange({ backgroundColor: undefined })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SectionConfigPanel;
