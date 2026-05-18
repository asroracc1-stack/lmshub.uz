import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Loader2, BookOpen, Trash2, Edit, UploadCloud, FileText, Calendar, MapPin, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const lessonSchema = z.object({
  title: z.string().min(3, "Sarlavha kamida 3 ta harfdan iborat bo'lishi kerak"),
  description: z.string().optional(),
  subjectId: z.string().min(1, "Fanni tanlash shart"),
  room: z.string().optional(),
  startsAt: z.string().min(1, "Boshlanish vaqtini tanlash shart"),
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

export default function Syllabus() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonDto | null>(null);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");

  // Form
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      room: "",
      startsAt: new Date().toISOString().slice(0, 16),
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

  // Handle File Upload to Spring Boot Backend REST API
  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const publicUrl = res.data;
      setUploadedUrl(publicUrl);
      toast.success("Fayl muvaffaqiyatli yuklandi! 📁");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Fayl yuklashda xatolik yuz berdi");
    } finally {
      setUploadingFile(false);
    }
  };

  // Mutations
  const saveLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const payload = {
        groupId: selectedGroupId,
        subjectId: values.subjectId,
        title: values.title,
        description: values.description,
        room: values.room,
        attachmentUrl: uploadedUrl || editingLesson?.attachmentUrl,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(new Date(values.startsAt).getTime() + 60 * 60 * 1000).toISOString(),
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
    setUploadedUrl(lesson.attachmentUrl || "");
    form.reset({
      title: lesson.title,
      description: lesson.description || "",
      subjectId: lesson.subjectId,
      room: lesson.room || "",
      startsAt: lesson.startsAt ? lesson.startsAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      subjectId: subjects.length > 0 ? subjects[0].id : "",
      room: "",
      startsAt: new Date().toISOString().slice(0, 16),
    });
    setFile(null);
    setUploadedUrl("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Ushbu mavzuni o'chirishni tasdiqlaysizmi?")) {
      deleteLessonMutation.mutate(id);
    }
  };

  const onSubmit = (values: LessonFormValues) => {
    saveLessonMutation.mutate(values);
  };

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
              <SelectTrigger className="bg-background/50 border-border/60">
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

          <Button variant="hero" onClick={openAddModal} disabled={!selectedGroupId}>
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
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
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
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-display">
                      {lesson.subjectName || "Fan"}
                    </Badge>
                    {lesson.room && (
                      <Badge variant="secondary" className="gap-1 text-xs">
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
                      <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/20 hover:bg-primary/10 text-primary text-xs">
                        <FileText className="h-3.5 w-3.5" /> Yuklab Olish (PDF/PPTX)
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Fayl biriktirilmagan</span>
                  )}

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(lesson)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(lesson.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {editingLesson ? "Mavzuni Tahrirlash" : "Yangi Mavzu Qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Dars mavzusi tafsilotlarini va o'quv materialini biriktiring.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Fanni tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mavzu Sarlavhasi</FormLabel>
                    <FormControl>
                      <Input placeholder="Mavzuni kiriting..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qisqacha Ma'lumot / Izoh</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Mavzu bo'yicha qisqacha tavsif..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boshlanish Vaqti</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xona / Auditoriya</FormLabel>
                      <FormControl>
                        <Input placeholder="Masalan: 102-xona" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Supabase Dropzone / File Upload */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O'quv Materiali (PDF/PPTX)</label>
                <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:bg-muted/20 transition-colors">
                  <UploadCloud className="h-8 w-8 mx-auto mb-2 text-primary/70" />
                  <p className="text-xs text-muted-foreground mb-3">Faylni tanlang yoki shu yerga tashlang</p>
                  <Input
                    type="file"
                    accept=".pdf,.pptx,.ppt,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="max-w-xs mx-auto text-xs"
                  />
                  {uploadingFile && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fayl yuklanmoqda...
                    </div>
                  )}
                  {uploadedUrl && !uploadingFile && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-success font-medium">
                      <FileText className="h-4 w-4" /> Fayl muvaffaqiyatli biriktirildi
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                  Bekor
                </Button>
                <Button variant="hero" type="submit" disabled={saveLessonMutation.isPending || uploadingFile}>
                  {saveLessonMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BookOpen className="h-4 w-4 mr-1" />}
                  Saqlash
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
