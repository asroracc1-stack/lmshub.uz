import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { 
  Plus, Loader2, BookOpen, Trash2, Edit, FileText, 
  Calendar, MapPin, Sparkles, Search, Link as LinkIcon, X, Compass
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const lessonSchema = z.object({
  title: z.string().min(3, "Sarlavha kamida 3 ta harfdan iborat bo'lishi kerak"),
  description: z.string().optional(),
  subjectId: z.string().min(1, "Fanni tanlash shart"),
  room: z.string().optional(),
  startsAt: z.string().min(1, "Boshlanish vaqtini tanlash shart"),
  endsAt: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface Group {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface LessonDto {
  id: string;
  groupId: string;
  subjectId: string;
  subjectName?: string;
  title: string;
  description?: string;
  room?: string;
  attachmentUrl?: string;
  startsAt: string;
  endsAt?: string;
}

const isHistorySubject = (text: string) => {
  const t = text.toLowerCase().trim();
  return t.includes("tarix") || t.includes("history") || t.includes("qadimgi");
};

// Custom DateTimePicker
function DateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Vaqtni tanlang..." 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
}) {
  const date = value ? new Date(value) : undefined;
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const current = date || new Date();
    selectedDate.setHours(current.getHours());
    selectedDate.setMinutes(current.getMinutes());
    onChange(selectedDate.toISOString());
  };

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    const current = date || new Date();
    if (type === "hour") {
      current.setHours(parseInt(val, 10));
    } else {
      current.setMinutes(parseInt(val, 10));
    }
    onChange(current.toISOString());
  };

  const formatted = date 
    ? date.toLocaleString("uz-UZ", { 
        day: "numeric", 
        month: "long", 
        year: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      }) 
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-full justify-between text-left font-normal rounded-xl h-11 border-border/60 hover:bg-muted/10 relative pr-10 bg-transparent text-foreground",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{formatted}</span>
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 z-50 rounded-2xl shadow-xl bg-white dark:bg-slate-950 border border-border/40" align="start">
        <UiCalendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="flex items-center justify-between border-t border-border/30 pt-3.5 mt-2 gap-2 text-xs font-semibold text-slate-500">
          <span>Vaqt:</span>
          <div className="flex items-center gap-1.5">
            <select
              value={date ? date.getHours() : 9}
              onChange={(e) => handleTimeChange("hour", e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-1.5 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
              ))}
            </select>
            <span>:</span>
            <select
              value={date ? date.getMinutes() : 0}
              onChange={(e) => handleTimeChange("minute", e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-1.5 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }).map((_, m) => (
                <option key={m * 5} value={m * 5}>{String(m * 5).padStart(2, "0")}</option>
              ))}
            </select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Syllabus() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonDto | null>(null);

  // Form
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      room: "",
      startsAt: new Date().toISOString(),
      endsAt: "",
      attachmentUrl: "",
    },
  });

  // 1. Fetch Groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["teacher-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await api.get('/teacher/groups');
      return (res.data as Group[]) ?? [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // 2. Fetch Subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["teacher-subjects", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const res = await api.get('/admin/subjects');
      return (res.data as Subject[]) ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  // 3. Fetch Lessons
  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ["teacher-lessons", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const res = await api.get(`/teacher/lessons/group/${selectedGroupId}`);
      return (res.data as LessonDto[]) ?? [];
    },
    enabled: !!selectedGroupId,
  });

  // Mutations
  const saveLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const payload = {
        groupId: selectedGroupId,
        subjectId: values.subjectId,
        title: values.title,
        description: values.description,
        room: values.room,
        attachmentUrl: values.attachmentUrl || null,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: values.endsAt 
          ? new Date(values.endsAt).toISOString() 
          : new Date(new Date(values.startsAt).getTime() + 60 * 60 * 1000).toISOString(),
      };

      if (editingLesson) {
        const res = await api.put(`/teacher/lessons/${editingLesson.id}`, payload);
        return res.data;
      } else {
        const res = await api.post("/teacher/lessons", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingLesson ? "Mavzu yangilandi!" : "Yangi mavzu qo'shildi!");
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons"] });
      setModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Mavzuni saqlashda xatolik yuz berdi");
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teacher/lessons/${id}`);
    },
    onSuccess: () => {
      toast.success("Mavzu o'chirildi!");
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons"] });
    },
    onError: () => {
      toast.error("Mavzuni o'chirishda xatolik yuz berdi");
    },
  });

  const openAddModal = () => {
    setEditingLesson(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (lesson: LessonDto) => {
    setEditingLesson(lesson);
    form.reset({
      title: lesson.title,
      description: lesson.description || "",
      subjectId: lesson.subjectId,
      room: lesson.room || "",
      startsAt: lesson.startsAt ? new Date(lesson.startsAt).toISOString() : new Date().toISOString(),
      endsAt: lesson.endsAt ? new Date(lesson.endsAt).toISOString() : "",
      attachmentUrl: lesson.attachmentUrl || "",
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      subjectId: subjects.length > 0 ? subjects[0].id : "",
      room: "",
      startsAt: new Date().toISOString(),
      endsAt: "",
      attachmentUrl: "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Ushbu mavzuni o'chirishni tasdiqlaysizmi?")) {
      deleteLessonMutation.mutate(id);
    }
  };

  const onSubmit = (values: LessonFormValues) => {
    saveLessonMutation.mutate(values);
  };

  // Live Watch State
  const watchedTitle = form.watch("title") || "";
  const watchedRoom = form.watch("room") || "";
  const watchedStartsAt = form.watch("startsAt") || "";
  const watchedSubjectId = form.watch("subjectId") || "";
  const watchedLink = form.watch("attachmentUrl") || "";

  const isHistoryMode = isHistorySubject(watchedTitle);
  const selectedSubjectName = subjects.find(s => s.id === watchedSubjectId)?.name || "Mavzu nomi";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/40 shadow-sm glassmorphism">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Syllabus Management
            </Badge>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Dars Rejasi va Mavzular (Syllabus)</h1>
          <p className="text-sm text-muted-foreground mt-1">Guruhlar bo'yicha o'tiladigan mavzular va o'quv materiallari</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="bg-background/50 border-border/60 rounded-xl">
                <SelectValue placeholder="Guruhni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="hero" onClick={openAddModal} disabled={!selectedGroupId} className="rounded-xl shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Yangi Mavzu
          </Button>
        </div>
      </div>

      {/* Lessons List / Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingGroups || loadingLessons ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-4 rounded-2xl border-border/40">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="pt-4 flex justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          ))
        ) : lessons.length === 0 ? (
          <div className="col-span-full bg-card/60 border border-border/40 p-12 rounded-2xl text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50 animate-pulse" />
            <p className="text-base font-medium">Ushbu guruh uchun mavzular kiritilmagan</p>
            <p className="text-xs mt-1">Yangi mavzu qo'shish tugmasi orqali dars rejasini shakllantiring.</p>
          </div>
        ) : (
          lessons.map((lesson, idx) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <Card className="p-6 rounded-2xl border-border/40 shadow-sm bg-card/90 backdrop-blur-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow group">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-display rounded-lg">
                      {lesson.subjectName || "Fan"}
                    </Badge>
                    {lesson.room && (
                      <Badge variant="secondary" className="gap-1 text-xs rounded-lg">
                        <MapPin className="h-3 w-3 text-muted-foreground" /> {lesson.room}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {lesson.title}
                  </h3>

                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {lesson.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Calendar className="h-3.5 w-3.5 text-primary/70" />
                    <span>{new Date(lesson.startsAt).toLocaleString("uz", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border/40 flex items-center justify-between gap-2">
                  {lesson.attachmentUrl ? (
                    <a href={lesson.attachmentUrl} target="_blank" rel="noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/20 hover:bg-primary/10 text-primary text-xs rounded-xl">
                        <FileText className="h-3.5 w-3.5" /> Mavzu Havolasi (Link)
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Havola biriktirilmagan</span>
                  )}

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(lesson)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(lesson.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Redesigned Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl p-6 rounded-[2.2rem] border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden transition-all duration-350">
          
          {/* Top Decorative Search Bar */}
          <div className="relative mb-3">
            <Input 
              placeholder="Syllabus ma'lumotlaridan qidirish..." 
              className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/40 rounded-xl border-border/40 text-xs font-semibold text-muted-foreground/80 focus-visible:ring-primary/25 cursor-not-allowed" 
              disabled
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold font-display flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              {editingLesson ? "Mavzuni Tahrirlash" : "Premium Mavzu Yaratish"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/90">
              Dars mavzusi tafsilotlarini kiriting va interaktiv ko'rinishni jonli ravishda kuzating.
            </DialogDescription>
          </DialogHeader>

          {/* Two-Column Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
            
            {/* Left Column: Form Fields */}
            <div className="md:col-span-7 space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* Subject Selector */}
                  <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fan *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-11 border-border/60 bg-transparent text-foreground">
                              <SelectValue placeholder="Fanni tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Title (Sarlavha) */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mavzu Sarlavhasi *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Mavzu nomini kiriting... (Tarix deb yozib ko'ring ✨)" 
                            {...field} 
                            className={cn(
                              "rounded-xl h-11 transition-all duration-300 font-medium text-foreground bg-transparent",
                              isHistoryMode 
                                ? "border-[#d4af37] focus-visible:ring-[#d4af37]/35 shadow-[0_0_10px_rgba(212,175,55,0.15)] bg-amber-50/10 dark:bg-amber-950/5 text-amber-900 dark:text-amber-100" 
                                : "border-border/60"
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description (Qisqacha Ma'lumot) */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Qisqacha Ma'lumot / Izoh</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Mavzu yuzasidan izoh va ma'lumotlar..." 
                            rows={2.5} 
                            {...field} 
                            className="rounded-xl resize-none border-border/60 bg-transparent text-foreground"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date Pickers (Boshlanishi va Tugashi) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startsAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1">
                          <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Boshlanish Vaqti *</FormLabel>
                          <FormControl>
                            <DateTimePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endsAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1">
                          <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tugash Vaqti</FormLabel>
                          <FormControl>
                            <DateTimePicker 
                              value={field.value || ""} 
                              onChange={field.onChange} 
                              placeholder="Tugash vaqti (Ixtiyoriy)..." 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Room & Link input fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="room"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Auditoriya / Xona</FormLabel>
                          <FormControl>
                            <Input placeholder="Masalan: 304-xona" {...field} className="rounded-xl h-11 border-border/60 bg-transparent text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="attachmentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mavzu Havolasi (Link)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="https://example.com/slide" 
                                {...field} 
                                className="pr-10 rounded-xl h-11 border-border/60 bg-transparent text-foreground" 
                              />
                              <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </form>
              </Form>
            </div>

            {/* Right Column: Live Subject Card Preview with Interactive Tarix Kitobi */}
            <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/30 pt-4 md:pt-0 pl-0 md:pl-6 min-h-[360px]">
              
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Jonli Mavzu Kartochkasi Preview
                </span>

                <AnimatePresence mode="wait">
                  {isHistoryMode ? (
                    /* Glowing Animated Ancient Book Card */
                    <motion.div
                      key="history-book"
                      initial={{ opacity: 0, scale: 0.93, rotateY: 15 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.93 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-[#3b2716] via-[#241307] to-[#120700] border-2 border-[#d4af37] shadow-[inset_0_0_35px_rgba(212,175,55,0.2),0_10px_30px_rgba(0,0,0,0.5)] rounded-3xl p-5 text-amber-100 min-h-[290px] flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Gilded Book Corner Ornaments */}
                      <div className="absolute top-2 left-2 text-[#d4af37]/45 text-[10px] select-none">⚜</div>
                      <div className="absolute top-2 right-2 text-[#d4af37]/45 text-[10px] select-none">⚜</div>
                      <div className="absolute bottom-2 left-2 text-[#d4af37]/45 text-[10px] select-none">⚜</div>
                      <div className="absolute bottom-2 right-2 text-[#d4af37]/45 text-[10px] select-none">⚜</div>

                      <div>
                        <div className="flex items-center justify-between">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 grid place-items-center shadow-md border border-[#d4af37]/30">
                            <Compass className="h-4.5 w-4.5 text-[#d4af37] animate-spin" style={{ animationDuration: "15s" }} />
                          </div>
                          <Badge className="bg-[#d4af37] text-[#120700] hover:bg-[#d4af37] text-[9px] uppercase tracking-wider font-bold rounded-md">
                            Qadimiy Tarix
                          </Badge>
                        </div>

                        {/* Interactive Parchment Book SVG illustration */}
                        <div className="my-4 py-1.5 flex justify-center">
                          <svg viewBox="0 0 100 60" className="w-full max-w-[190px] filter drop-shadow-[0_4px_12px_rgba(212,175,55,0.35)]">
                            {/* Parchment Pages */}
                            <path d="M 8 52 Q 28 49 48 52 Q 68 49 88 52 L 88 10 Q 68 8 48 10 Q 28 8 8 10 Z" fill="#f5ecd2" stroke="#b8860b" strokeWidth="0.8" />
                            {/* Spine of Book */}
                            <line x1="48" y1="10" x2="48" y2="52" stroke="#8b4513" strokeWidth="1.5" strokeDasharray="2 1" />
                            
                            {/* Left Page: Pyramids & Sparks */}
                            <g transform="translate(10, 11) scale(0.65)">
                              {/* Tower / Castle */}
                              <rect x="25" y="18" width="6" height="28" fill="#8b5a2b" opacity="0.4" rx="0.5" />
                              <polygon points="23,18 28,8 33,18" fill="#d4af37" opacity="0.6" />
                              {/* Pyramids */}
                              <polygon points="8,45 23,15 38,45" fill="#d4af37" opacity="0.4" className="animate-pulse" />
                              <polygon points="22,45 34,22 46,45" fill="#b8860b" opacity="0.25" className="animate-pulse" />
                            </g>

                            {/* Right Page: Pulsing ancient script lines */}
                            <g transform="translate(51, 14)">
                              <line x1="4" y1="4" x2="28" y2="4" stroke="#5c4033" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0s" }} />
                              <line x1="4" y1="9" x2="32" y2="9" stroke="#5c4033" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
                              <line x1="4" y1="14" x2="22" y2="14" stroke="#5c4033" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
                              <line x1="4" y1="19" x2="30" y2="19" stroke="#5c4033" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
                              <line x1="4" y1="24" x2="18" y2="24" stroke="#5c4033" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0.8s" }} />
                              <path d="M 26 21 Q 30 21 30 25 M 29 23 L 31 27" fill="none" stroke="#b8860b" strokeWidth="0.8" opacity="0.6" />
                            </g>
                          </svg>
                        </div>

                        {/* Title and metadata */}
                        <div className="mt-1 text-center">
                          <h4 className="font-display font-bold text-base leading-tight tracking-wide text-amber-200">
                            {watchedTitle || "Qadimgi Tarix Kitobi"}
                          </h4>
                          <div className="flex justify-center gap-4 text-[10px] text-amber-300/80 mt-1.5 font-mono">
                            {watchedRoom && <span>Xona: {watchedRoom}</span>}
                            {watchedStartsAt && (
                              <span>Boshlanishi: {new Date(watchedStartsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer link preview */}
                      <div className="text-center text-[10px] text-amber-400/60 truncate pt-2.5 border-t border-amber-900/40">
                        {watchedLink ? watchedLink : "⚜ Dars material havolasi biriktirilmagan ⚜"}
                      </div>
                    </motion.div>
                  ) : (
                    /* Premium Modern Gradient Card Preview */
                    <motion.div
                      key="modern-subject"
                      initial={{ opacity: 0, scale: 0.93 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.93 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-lg shadow-emerald-500/5 rounded-3xl p-5 text-foreground min-h-[290px] flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Decorative Background Circles */}
                      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

                      <div>
                        <div className="flex items-center justify-between">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 grid place-items-center shadow-sm">
                            <BookOpen className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] uppercase tracking-wider font-semibold rounded-md">
                            {selectedSubjectName}
                          </Badge>
                        </div>

                        <div className="mt-5 space-y-3">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                            Mavzu Sarlavhasi
                          </span>
                          <h4 className="font-display font-bold text-lg leading-snug truncate text-foreground group-hover:text-primary transition-colors">
                            {watchedTitle || "Yangi mavzu sarlavhasi..."}
                          </h4>
                          
                          {/* Event specifics */}
                          <div className="space-y-1.5 pt-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                              <span>
                                {watchedStartsAt 
                                  ? new Date(watchedStartsAt).toLocaleString("uz-UZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                                  : "Sana belgilanmagan"}
                              </span>
                            </div>
                            {watchedRoom && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-teal-500" />
                                <span>Xona: <strong className="font-bold text-foreground">{watchedRoom}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attached PDF/PPTX representation */}
                      <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground truncate">
                        {watchedLink ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium underline flex items-center gap-1.5">
                            <LinkIcon className="h-3.5 w-3.5" /> Havola: {watchedLink}
                          </span>
                        ) : (
                          <span className="italic">Resurs havolasi kiritilmagan</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons (Redesigned with beautiful gradients and icons) */}
              <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl flex items-center gap-1.5 border-border/50 text-slate-600 dark:text-slate-400"
                >
                  <X className="h-4 w-4" />
                  <span>Yopish</span>
                </Button>
                
                <Button 
                  onClick={form.handleSubmit(onSubmit)} 
                  disabled={saveLessonMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 h-11 px-5 flex items-center gap-1.5"
                >
                  {saveLessonMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>{editingLesson ? "Saqlash" : "Yaratish"}</span>
                </Button>
              </DialogFooter>
            </div>

          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}

