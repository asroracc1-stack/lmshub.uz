import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  BookOpen, Plus, Pencil, Trash2, Loader2, Calculator, 
  Globe, Code2, Sparkles, Binary, Award, GraduationCap, Compass, Layers, Users, Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Subject {
  id: string; 
  name: string; 
  code: string | null; 
  description: string | null; 
  color: string;
}

interface GroupTeacherDto {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
}

interface GroupDto {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  organizationId: string;
  direction: string | null;
  teacherId: string | null;
  studentCount: number;
  teachers: GroupTeacherDto[] | null;
  createdAt: string;
}

interface TeacherProfileDto {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  role: string;
  subject?: string | null;
}

const COLORS = ["primary", "secondary", "accent", "success", "warning", "destructive"];
const SUGGESTED_SUBJECTS = ["Matematika", "Ingliz tili", "Rus tili", "Fizika", "Tarix", "IT"];

// Unique card design palettes — each index gets a totally different look
const CARD_DESIGNS = [
  { // 0 — Indigo gradient
    card: "bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60 dark:from-indigo-950/60 dark:via-slate-900 dark:to-indigo-900/30 border-indigo-200/70 dark:border-indigo-800/40 hover:shadow-indigo-200/60 dark:hover:shadow-indigo-900/40",
    icon: "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300",
    accent: "from-indigo-400 to-violet-500",
    deco: "bg-indigo-400/10",
    radius: "rounded-2xl",
  },
  { // 1 — Emerald gradient
    card: "bg-gradient-to-br from-emerald-50 via-white to-teal-100/60 dark:from-emerald-950/60 dark:via-slate-900 dark:to-teal-900/30 border-emerald-200/70 dark:border-emerald-800/40 hover:shadow-emerald-200/60 dark:hover:shadow-emerald-900/40",
    icon: "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    accent: "from-emerald-400 to-teal-500",
    deco: "bg-emerald-400/10",
    radius: "rounded-3xl",
  },
  { // 2 — Rose gradient
    card: "bg-gradient-to-br from-rose-50 via-white to-pink-100/60 dark:from-rose-950/60 dark:via-slate-900 dark:to-pink-900/30 border-rose-200/70 dark:border-rose-800/40 hover:shadow-rose-200/60 dark:hover:shadow-rose-900/40",
    icon: "bg-rose-100 dark:bg-rose-900/50 border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300",
    accent: "from-rose-400 to-pink-500",
    deco: "bg-rose-400/10",
    radius: "rounded-[1.5rem]",
  },
  { // 3 — Amber gradient
    card: "bg-gradient-to-br from-amber-50 via-white to-orange-100/60 dark:from-amber-950/60 dark:via-slate-900 dark:to-orange-900/30 border-amber-200/70 dark:border-amber-800/40 hover:shadow-amber-200/60 dark:hover:shadow-amber-900/40",
    icon: "bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
    accent: "from-amber-400 to-orange-500",
    deco: "bg-amber-400/10",
    radius: "rounded-2xl",
  },
  { // 4 — Cyan gradient
    card: "bg-gradient-to-br from-cyan-50 via-white to-sky-100/60 dark:from-cyan-950/60 dark:via-slate-900 dark:to-sky-900/30 border-cyan-200/70 dark:border-cyan-800/40 hover:shadow-cyan-200/60 dark:hover:shadow-cyan-900/40",
    icon: "bg-cyan-100 dark:bg-cyan-900/50 border-cyan-200 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300",
    accent: "from-cyan-400 to-sky-500",
    deco: "bg-cyan-400/10",
    radius: "rounded-3xl",
  },
  { // 5 — Purple gradient
    card: "bg-gradient-to-br from-purple-50 via-white to-violet-100/60 dark:from-purple-950/60 dark:via-slate-900 dark:to-violet-900/30 border-purple-200/70 dark:border-purple-800/40 hover:shadow-purple-200/60 dark:hover:shadow-purple-900/40",
    icon: "bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400",
    badge: "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300",
    accent: "from-purple-400 to-violet-500",
    deco: "bg-purple-400/10",
    radius: "rounded-[1.75rem]",
  },
];

const getCardDesign = (idx: number) => CARD_DESIGNS[idx % CARD_DESIGNS.length];

const getSubjectIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("matem") || n.includes("math") || n.includes("algebra") || n.includes("geometry") || n.includes("hisob")) {
    return Calculator;
  }
  if (n.includes("ingliz") || n.includes("english") || n.includes("til") || n.includes("lang") || n.includes("rus") || n.includes("ona til")) {
    return Globe;
  }
  if (n.includes("front") || n.includes("web") || n.includes("code") || n.includes("dastur") || n.includes("dev") || n.includes("kompyuter") || n.includes("it")) {
    return Code2;
  }
  if (n.includes("fizik") || n.includes("phys")) {
    return Binary;
  }
  if (n.includes("kimyo") || n.includes("chem")) {
    return Compass;
  }
  if (n.includes("tarix") || n.includes("history")) {
    return Award;
  }
  if (n.includes("biolog") || n.includes("bio")) {
    return GraduationCap;
  }
  return BookOpen;
};

const getColorClasses = (color: string) => {
  switch (color) {
    case "primary":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/40 hover:shadow-indigo-500/5";
    case "secondary":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 group-hover:border-purple-500/40 hover:shadow-purple-500/5";
    case "accent":
      return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 group-hover:border-cyan-500/40 hover:shadow-cyan-500/5";
    case "success":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40 hover:shadow-emerald-500/5";
    case "warning":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 group-hover:border-amber-500/40 hover:shadow-amber-500/5";
    case "destructive":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 group-hover:border-rose-500/40 hover:shadow-rose-500/5";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 group-hover:border-slate-500/40 hover:shadow-slate-500/5";
  }
};

export default function OrgSubjects() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const canManage = ["super_admin", "admin", "administrator"].includes(role || "");
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("primary");
  
  // Custom Creatable Combobox & AI state
  const [showCombobox, setShowCombobox] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: items = [], isLoading: loading } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data } = await api.get<Subject[]>("/admin/subjects");
      return (data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: groups = [] } = useQuery<GroupDto[]>({
    queryKey: ["groups-for-subject-stats"],
    queryFn: async () => {
      const { data } = await api.get<GroupDto[]>("/admin/groups", { params: { size: 1000 } });
      return (data as any)?.content || data || [];
    }
  });

  const { data: teachers = [] } = useQuery<TeacherProfileDto[]>({
    queryKey: ["teachers-for-subject-stats"],
    queryFn: async () => {
      const { data } = await api.get<TeacherProfileDto[]>("/admin/users", { params: { role: "TEACHER", size: 1000 } });
      return (data as any)?.content || data || [];
    }
  });

  const reset = () => {
    setEditing(null); setName(""); setCode(""); setDescription(""); setColor("primary");
    setShowCombobox(false); setAiLoading(false);
  };

  const openEdit = (s: Subject) => {
    setEditing(s); setName(s.name); setCode(s.code ?? ""); setDescription(s.description ?? ""); setColor(s.color);
    setOpen(true);
  };

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Subject>) => {
      if (editing) {
        return api.put(`/admin/subjects/${editing.id}`, payload);
      } else {
        return api.post("/admin/subjects", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success(editing ? "Yangilandi" : "Yaratildi");
      setOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("O'chirildi");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik");
    }
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Nom kiriting");
    const payload = { name: name.trim(), code: code.trim() || null, description: description.trim() || null, color };
    mutation.mutate(payload);
  };

  const remove = (s: Subject) => {
    deleteMutation.mutate(s.id);
  };

  // Trigger Gemini AI details generator
  const handleAiAutofill = async () => {
    if (!name.trim()) {
      toast.error("Avval fan nomini yozing yoki tanlang!");
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await api.post<string | Record<string, string>>(`/ai/generate-subject`, null, {
        params: { name: name.trim() }
      });
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.code) setCode(parsed.code.toUpperCase());
      if (parsed.description) setDescription(parsed.description);
      if (parsed.color && COLORS.includes(parsed.color.toLowerCase())) {
        setColor(parsed.color.toLowerCase());
      }
      toast.success("AI ma'lumotlarni muvaffaqiyatli to'ldirdi! ✨");
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = apiErr.response?.status;
      const serverMsg = apiErr.response?.data?.message || "";

      if (status === 500 && serverMsg.includes("kaliti")) {
        toast.error("⚠️ AI xizmati vaqtincha ishlamaydi: API kaliti bloklangan. Admin bilan bog'laning.");
      } else if (status === 500) {
        toast.error("AI server xatosi yuz berdi. Iltimos, keyinroq urinib ko'ring.");
      } else {
        toast.error(serverMsg || "Gemini AI bilan bog'lanishda xatolik");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const filteredSuggestions = SUGGESTED_SUBJECTS.filter((s) =>
    s.toLowerCase().includes(name.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-lg shadow-primary/20">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
              Fanlar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tashkilot fanlarini boshqaring va guruhlar bo'yicha taqsimotni ko'ring
            </p>
          </div>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold px-5 h-11 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shrink-0 border-none"
              >
                <Plus className="h-4 w-4" />
                <span>Yangi fan qo'shish</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 flex flex-col max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-0">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-950 dark:text-white">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  {editing ? "Fanni tahrirlash" : "AI-Powered Yangi fan yaratish"}
                </DialogTitle>
              </DialogHeader>

              {/* Scrollable content area */}
              <div className="overflow-y-auto flex-1 px-6 pb-2">

              {/* Two-Column Form and Live Preview Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                
                {/* Form Inputs (Left) */}
                <div className="space-y-4">
                  {/* Smart Combobox (Nom) */}
                  <div className="grid gap-1.5 relative">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nom *</Label>
                    <div className="relative flex items-center">
                      <Input 
                        value={name} 
                        onChange={(e) => {
                          setName(e.target.value);
                          setShowCombobox(true);
                        }} 
                        onFocus={() => setShowCombobox(true)}
                        placeholder="Matematika..." 
                        className="rounded-xl h-11 pr-10"
                      />
                      
                      {/* AI Auto-fill Wizard Wand */}
                      {name.trim() && (
                        <button
                          type="button"
                          onClick={handleAiAutofill}
                          disabled={aiLoading}
                          className="absolute right-2.5 h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center hover:scale-105 active:scale-95 transition-transform"
                          title="AI yordamida to'ldirish"
                        >
                          {aiLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Combobox Dropdown Suggestions */}
                    {showCombobox && filteredSuggestions.length > 0 && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowCombobox(false)} 
                        />
                        <div className="absolute top-[68px] inset-x-0 bg-white dark:bg-slate-950 border border-border/40 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                          {filteredSuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setName(item);
                                setShowCombobox(false);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subject Code */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fanning Kodi (AI-filled)</Label>
                    <Input 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                      placeholder="MATH101" 
                      className={`rounded-xl h-11 ${aiLoading ? "animate-pulse border-indigo-500 bg-indigo-500/5" : ""}`} 
                    />
                  </div>

                  {/* Description */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tavsif</Label>
                    <Textarea 
                      rows={3} 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Fan haqida qisqacha ma'lumot..." 
                      className={`rounded-xl resize-none ${aiLoading ? "animate-pulse border-indigo-500 bg-indigo-500/5" : ""}`} 
                    />
                  </div>

                  {/* Color Selector */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rang va Mavzu</Label>
                    <div className="flex gap-2.5 flex-wrap">
                      {COLORS.map((c) => (
                        <button 
                          key={c} 
                          type="button" 
                          onClick={() => setColor(c)}
                          className={`h-8 w-8 rounded-xl border-2 transition-all scale-100 hover:scale-105 active:scale-95 ${color === c ? "border-slate-850 dark:border-white ring-2 ring-primary/20" : "border-transparent"}`}
                          style={{
                            backgroundColor: 
                              c === "primary" ? "#6366f1" :
                              c === "secondary" ? "#a855f7" :
                              c === "accent" ? "#06b6d4" :
                              c === "success" ? "#10b981" :
                              c === "warning" ? "#f59e0b" : "#ef4444"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column — Live Preview only, no button */}
                <div className="flex flex-col border-l border-border/30 pl-0 md:pl-6 pt-4 md:pt-0">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jonli Ko'rinish (Live Preview)</Label>
                    
                    {/* Live Preview Card Box */}
                    <Card className={`p-6 border rounded-2xl glass relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-350 shadow-md ${getColorClasses(color)}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-background/80 dark:bg-slate-900/80 shadow-sm border border-border/30 grid place-items-center">
                            {(() => {
                              const PreviewIcon = getSubjectIcon(name);
                              return <PreviewIcon className="h-5 w-5" />;
                            })()}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-500/10 rounded-lg text-slate-500 font-bold uppercase">
                            Preview
                          </span>
                        </div>

                        <div className="mt-4">
                          <h3 className="font-display font-bold text-lg leading-tight truncate text-slate-800 dark:text-slate-100">
                            {name || "Yangi Fan Nomi"}
                          </h3>
                          {code && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase">
                              {code}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {description || "Fanning batafsil tavsifi bu yerda jonli tarzda ko'rinadi..."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                          <Users className="h-3.5 w-3.5 opacity-60" />
                          <span>O'qituvchilar: <strong className="font-bold text-slate-900 dark:text-white">0</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                          <Layers className="h-3.5 w-3.5 opacity-60" />
                          <span>Guruhlar: <strong className="font-bold text-slate-900 dark:text-white">0</strong></span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

              </div>{/* end two-column grid */}
              </div>{/* end scrollable area */}

              {/* Sticky footer with Save button */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-b-2xl flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { setOpen(false); reset(); }}
                  className="rounded-xl h-11 px-6"
                >
                  Bekor
                </Button>
                <Button
                  onClick={submit}
                  disabled={mutation.isPending || aiLoading}
                  className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white border-none shadow-md font-semibold"
                >
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Saqlash
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Grid of Subjects */}
      {loading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6 border border-border/40 rounded-2xl glass shadow-md animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-12 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-5" />
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-16 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-dashed rounded-2xl">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-700 animate-pulse" />
            <h3 className="text-lg font-bold">Fanlar hali qo'shilmagan</h3>
            <p className="text-sm mt-1">LMS tizimidagi darslarni biriktirish uchun birinchi fanni yarating.</p>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((s, idx) => {
              const IconComp = getSubjectIcon(s.name);
              const design = getCardDesign(idx);

              // Calculate custom counts
              const uniqueTeachersInGroups = new Set(
                groups
                  .flatMap((g) => g.teachers || [])
                  .filter((gt) => gt.subjectId === s.id || gt.subjectName?.toLowerCase() === s.name.toLowerCase())
                  .map((gt) => gt.teacherId)
              );
              
              const subjectTeachers = Math.max(
                teachers.filter((t) => 
                  t.subject?.toLowerCase().split(",").map((x) => x.trim()).includes(s.name.toLowerCase())
                ).length,
                uniqueTeachersInGroups.size
              );

              const subjectGroups = groups.filter((g) => 
                g.teachers?.some((gt) => gt.subjectId === s.id || gt.subjectName?.toLowerCase() === s.name.toLowerCase())
              ).length;

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.02, duration: 0.25 }}
                >
                  <Card className={`p-6 border group hover:scale-[1.03] hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[230px] ${design.card} ${design.radius}`}>
                    
                    {/* Decorative background blob */}
                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-60 ${design.deco}`} />
                    <div className={`absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-xl opacity-40 ${design.deco}`} />

                    {/* Gradient accent line on top */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${design.accent} opacity-60 rounded-t-full`} />
                    
                    {/* Top Section */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`h-11 w-11 rounded-xl border shadow-sm grid place-items-center group-hover:scale-110 transition-transform ${design.icon}`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        {canManage && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-500/10" 
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-xl border-none shadow-2xl bg-white dark:bg-slate-900">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{s.name}" fani butunlay o'chiriladi. Bu fanga bog'liq darslar ham ta'sirlanishi mumkin.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Bekor qilish</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => remove(s)} 
                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "O'chirish"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      {/* Header and Details */}
                      <div className="mt-4">
                        <h3 className="font-display font-bold text-lg leading-tight truncate text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                          {s.name}
                        </h3>
                        {s.code && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase">
                            {s.code}
                          </span>
                        )}
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Statistics Layout */}
                    <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                        <Users className="h-3.5 w-3.5 opacity-60" />
                        <span>O'qituvchilar: <strong className="font-bold text-slate-900 dark:text-white">{subjectTeachers}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                        <Layers className="h-3.5 w-3.5 opacity-60" />
                        <span>Guruhlar: <strong className="font-bold text-slate-900 dark:text-white">{subjectGroups}</strong></span>
                      </div>
                    </div>

                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
