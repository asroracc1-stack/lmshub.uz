import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, MinusCircle, Award, Calendar, Search, Download, Sparkles, Loader2, Plus, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string | null;
  username: string;
}

interface Group {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  title: string;
  starts_at: string;
}

interface AttendanceRecord {
  id: string;
  lesson_id: string;
  student_id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  note?: string | null;
}

interface GradeRecord {
  id: string;
  student_id: string;
  subject_id: string;
  lesson_id?: string | null;
  score: number;
  max_score: number;
  comment?: string | null;
}

export default function SmartDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Coin Modal State
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [coinStudentId, setCoinStudentId] = useState("");
  const [coinAmount, setCoinAmount] = useState("5");
  const [coinReason, setCoinReason] = useState("Faol ishtiroki va a'lo baholari uchun");
  const [coinComment, setCoinComment] = useState("");

  // Local optimistic state buffers
  const [localAttendances, setLocalAttendances] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});
  const [localGrades, setLocalGrades] = useState<Record<string, { score: number; comment: string }>>({});

  // 1. Fetch Teacher Groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["teacher-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await api.get('/teacher/groups');
      return (res.data as Group[]) ?? [];
    },
    enabled: !!user?.id,
  });

  // Set initial selected group
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

  // Set initial selected subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // 3. Fetch Students in Selected Group
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["group-students", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const res = await api.get('/admin/users', {
        params: { groupId: selectedGroupId, role: 'STUDENT' }
      });
      const list = res.data ?? [];
      return list.map((u: any) => ({
        id: u.id,
        full_name: u.fullName || u.username,
        username: u.username
      })) as Student[];
    },
    enabled: !!selectedGroupId,
  });

  // 4. Fetch Lessons for Selected Group
  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ["group-lessons", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const res = await api.get(`/teacher/lessons/group/${selectedGroupId}`);
      const list = (res.data as any[]) ?? [];
      return list.map((l: any) => ({
        id: l.id,
        title: l.title,
        starts_at: l.starts_at || l.startsAt
      })).slice(0, 5) as Lesson[];
    },
    enabled: !!selectedGroupId,
  });

  // 5. Fetch Attendance & Grades
  const lessonIds = useMemo(() => lessons.map((l) => l.id), [lessons]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const { data: attendanceData = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["lessons-attendance", lessonIds],
    queryFn: async () => {
      if (!lessonIds.length) return [];
      const res = await api.get('/teacher/attendance', {
        params: { lessonIds: lessonIds.join(',') }
      });
      const list = (res.data as any[]) ?? [];
      return list.map((a: any) => ({
        id: a.id,
        lesson_id: a.lessonId,
        student_id: a.studentId,
        status: a.status,
        note: a.note
      })) as AttendanceRecord[];
    },
    enabled: lessonIds.length > 0,
  });

  const { data: gradesData = [], isLoading: loadingGrades } = useQuery({
    queryKey: ["students-grades", studentIds, selectedSubjectId],
    queryFn: async () => {
      if (!studentIds.length || !selectedSubjectId) return [];
      const res = await api.get('/teacher/grades', {
        params: { studentIds: studentIds.join(','), subjectId: selectedSubjectId }
      });
      const list = (res.data as any[]) ?? [];
      return list.map((g: any) => ({
        id: g.id,
        student_id: g.studentId,
        subject_id: g.subjectId,
        lesson_id: g.lessonId,
        score: g.score,
        max_score: g.maxScore,
        comment: g.comment
      })) as GradeRecord[];
    },
    enabled: studentIds.length > 0 && !!selectedSubjectId,
  });

  // Populate local buffer when server data loads
  useEffect(() => {
    const attMap: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
    attendanceData.forEach((a) => {
      attMap[`${a.lesson_id}-${a.student_id}`] = a.status;
    });
    setLocalAttendances(attMap);
  }, [attendanceData]);

  useEffect(() => {
    const grMap: Record<string, { score: number; comment: string }> = {};
    gradesData.forEach((g) => {
      grMap[g.student_id] = { score: g.score, comment: g.comment || "" };
    });
    setLocalGrades(grMap);
  }, [gradesData]);

  // Local coins buffer
  const [localCoins, setLocalCoins] = useState<Record<string, number>>({});

  // Mutations
  const saveAllDashboardDataMutation = useMutation({
    mutationFn: async () => {
      const activeLesson = lessons[0];
      if (!activeLesson) {
        throw new Error("Guruhda darslar mavjud emas!");
      }

      const payload = {
        lessonId: activeLesson.id,
        lesson_id: activeLesson.id,
        subjectId: selectedSubjectId,
        subject_id: selectedSubjectId,
        records: students.map((s) => {
          const attStatus = localAttendances[`${activeLesson.id}-${s.id}`] || "PRESENT";
          const gr = localGrades[s.id] || { score: null, comment: "" };
          const coins = localCoins[s.id] || 0;
          return {
            studentId: s.id,
            student_id: s.id,
            status: attStatus,
            score: gr.score,
            comment: gr.comment || null,
            coins: coins > 0 ? coins : null,
          };
        }),
      };

      const res = await api.post("/teacher/attendance/save-all", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Barcha ma'lumotlar va Telegram xabarnomalari muvaffaqiyatli saqlandi! 🚀✨");
      queryClient.invalidateQueries({ queryKey: ["lessons-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["students-grades"] });
      setLocalCoins({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Saqlashda xatolik yuz berdi");
    },
  });

  // Handlers
  const handleSetAttendance = (lessonId: string, studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    const key = `${lessonId}-${studentId}`;
    setLocalAttendances((prev) => ({ ...prev, [key]: status }));
  };

  const handleGradeChange = (studentId: string, val: string) => {
    const num = Number(val);
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: isNaN(num) ? 0 : num },
    }));
  };

  const handleCommentChange = (studentId: string, val: string) => {
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], comment: val },
    }));
  };

  const handleGradeBlur = (studentId: string) => {
    // No-op: we do not save immediately on blur anymore
  };

  const openCoinModal = (studentId: string) => {
    setCoinStudentId(studentId);
    setCoinModalOpen(true);
    setCoinAmount("5");
    setCoinComment("");
  };

  const handleSaveCoinsLocally = () => {
    const amount = Number(coinAmount);
    if (!coinStudentId) return;
    setLocalCoins((prev) => ({
      ...prev,
      [coinStudentId]: (prev[coinStudentId] || 0) + amount,
    }));
    setCoinModalOpen(false);
    toast.success("Coin miqdori belgilandi. Saqlash tugmasini bosganda saqlanadi. ✨🎁");
  };

  // PDF report handler
  const handleDownloadPDF = async () => {
    if (!students.length) {
      toast.error("Hisobot uchun talabalar mavjud emas");
      return;
    }

    // Load jsPDF and autoTable as functions
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const activeGroup = groups.find((g) => g.id === selectedGroupId);
    const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
    const activeLesson = lessons[0];

    // Title & Header info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LMSHub - Smart Dashboard Hisoboti", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Guruh: ${activeGroup?.name || "Noma'lum"}`, 14, 28);
    doc.text(`Fan: ${activeSubject?.name || "Noma'lum"}`, 14, 34);
    if (activeLesson) {
      doc.text(`Oxirgi dars: ${activeLesson.title}`, 14, 40);
    }
    doc.text(`Sana: ${new Date().toLocaleDateString("uz")}`, 14, 46);

    // Prepare table headers and body
    const headers = [["#", "Talaba Ismi", "Davomat (Oxirgi dars)", "Baho", "Rag'bat (Coin)", "Izoh / Fikr"]];
    const body = students.map((s, idx) => {
      const activeLessonId = activeLesson?.id;
      const attStatus = activeLessonId ? (localAttendances[`${activeLessonId}-${s.id}`] || "PRESENT") : "—";
      const statusText = attStatus === "PRESENT" ? "Bor" : (attStatus === "LATE" ? "Kechikdi" : (attStatus === "ABSENT" ? "Yo'q" : attStatus));

      const gr = localGrades[s.id] || { score: 0, comment: "" };
      const coins = localCoins[s.id] || 0;

      return [
        idx + 1,
        s.full_name || s.username,
        statusText,
        gr.score ? `${gr.score} / 100` : "—",
        coins > 0 ? `+${coins} coin` : "—",
        gr.comment || "—"
      ];
    });

    // Use autoTable function
    autoTable(doc, {
      startY: 52,
      head: headers,
      body: body,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // Indigo color
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 65 }
      }
    });

    doc.save(`smart_dashboard_${activeGroup?.name || "guruh"}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF hisoboti muvaffaqiyatli yuklab olindi! 📄✅");
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = (s.full_name || s.username || "").toLowerCase();
      return name.includes(search.toLowerCase());
    });
  }, [students, search]);

  const getLetterGrade = (score?: number) => {
    if (!score) return "—";
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  };

  const getBadgeVariant = (letter: string) => {
    if (letter.startsWith("A")) return "default";
    if (letter.startsWith("B")) return "secondary";
    if (letter.startsWith("C")) return "outline";
    return "destructive";
  };

  const initials = (s: Student) => (s.full_name || s.username || "?").charAt(0).toUpperCase();

  const isLoading = loadingGroups || loadingStudents || loadingLessons || loadingAtt || loadingGrades;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/40 shadow-sm glassmorphism">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Smart Dashboard
            </Badge>
            <span className="text-xs text-muted-foreground">Real-time attendance & grading</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">O'qituvchi Boshqaruv Paneli</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
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

          <div className="w-48">
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="bg-background/50 border-border/60">
                <SelectValue placeholder="Fanni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="hero" onClick={() => queryClient.invalidateQueries()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
            Yangilash
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-card/90 backdrop-blur-sm">
        <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Talabani qidirish..."
              className="pl-9 bg-background/50 border-border/60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" /> Bor (Present)
            </div>
            <div className="flex items-center gap-1.5">
              <MinusCircle className="h-4 w-4 text-warning" /> Kechikdi (Late)
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" /> Yo'q (Absent)
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-6 font-display">#</th>
                <th className="py-4 px-6 font-display">Talaba Ismi</th>
                {lessons.map((l) => (
                  <th key={l.id} className="py-4 px-4 text-center font-display min-w-[145px]">
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{new Date(l.starts_at).toLocaleDateString("uz", { month: "short", day: "numeric", weekday: "short" })}</span>
                    </div>
                  </th>
                ))}
                <th className="py-4 px-6 font-display min-w-[180px]">Fikr / Izoh (Feedback)</th>
                <th className="py-4 px-6 font-display text-center min-w-[120px]">Rag'bat (Rewards)</th>
                <th className="py-4 px-6 font-display text-center min-w-[140px]">Baho (Score)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-5 px-6"><Skeleton className="h-4 w-6" /></td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </td>
                    {lessons.map((_, li) => (
                      <td key={li} className="py-5 px-4 text-center"><Skeleton className="h-8 w-8 mx-auto rounded-lg" /></td>
                    ))}
                    <td className="py-5 px-6"><Skeleton className="h-9 w-full rounded-lg" /></td>
                    <td className="py-5 px-6"><Skeleton className="h-9 w-24 mx-auto rounded-lg" /></td>
                    <td className="py-5 px-6"><Skeleton className="h-9 w-20 mx-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={lessons.length + 5} className="py-12 text-center text-muted-foreground">
                    Guruhda talabalar topilmadi yoki qidiruv natijasi bo'sh.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const gr = localGrades[s.id] || { score: 0, comment: "" };
                  const letter = getLetterGrade(gr.score);

                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-muted-foreground">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="border border-border/60 shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {initials(s)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium font-display">{s.full_name || s.username}</p>
                            <p className="text-xs text-muted-foreground">@{s.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Attendance Toggles */}
                      {lessons.map((l) => {
                        const status = localAttendances[`${l.id}-${s.id}`] || "PRESENT";
                        return (
                          <td key={l.id} className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 bg-muted/40 p-1 rounded-xl w-fit mx-auto border border-border/40">
                              {/* Present */}
                              <button
                                type="button"
                                onClick={() => handleSetAttendance(l.id, s.id, "PRESENT")}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  status === "PRESENT"
                                    ? "bg-emerald-500 text-white shadow-sm scale-105"
                                    : "text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10"
                                )}
                                title="Bor (Present)"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>

                              {/* Late */}
                              <button
                                type="button"
                                onClick={() => handleSetAttendance(l.id, s.id, "LATE")}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  status === "LATE"
                                    ? "bg-amber-500 text-white shadow-sm scale-105"
                                    : "text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10"
                                )}
                                title="Kechikdi (Late)"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>

                              {/* Absent */}
                              <button
                                type="button"
                                onClick={() => handleSetAttendance(l.id, s.id, "ABSENT")}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  status === "ABSENT"
                                    ? "bg-rose-500 text-white shadow-sm scale-105"
                                    : "text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10"
                                )}
                                title="Yo'q (Absent)"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Feedback Input */}
                      <td className="py-4 px-6">
                        <Input
                          placeholder="Fikr qoldiring..."
                          value={gr.comment || ""}
                          onChange={(e) => handleCommentChange(s.id, e.target.value)}
                          onBlur={() => handleGradeBlur(s.id)}
                          className="bg-background/50 border-border/60 text-xs h-9"
                        />
                      </td>

                      {/* Rewards */}
                      <td className="py-4 px-6 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCoinModal(s.id)}
                          className="gap-1.5 border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/10 transition-all duration-300"
                        >
                          <Star className={`h-4 w-4 text-primary ${localCoins[s.id] ? "fill-primary scale-125 animate-pulse" : ""}`} />
                          <span>+ Coin {localCoins[s.id] ? `(${localCoins[s.id]})` : ""}</span>
                        </Button>
                      </td>

                      {/* Score Input + Letter Grade */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={gr.score || ""}
                            onChange={(e) => handleGradeChange(s.id, e.target.value)}
                            onBlur={() => handleGradeBlur(s.id)}
                            className="w-16 text-center bg-background/50 border-border/60 font-semibold h-9"
                          />
                          <Badge variant={getBadgeVariant(letter)} className="h-9 px-2.5 font-display font-bold text-sm">
                            {letter}
                          </Badge>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>Jami talabalar: <span className="font-semibold text-foreground">{filteredStudents.length}</span> nafar</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5 border-border/60 hover:bg-background/80 transition-all duration-300">
              <Download className="h-4 w-4" /> Hisobotni Yuklab Olish (PDF)
            </Button>
            {lessons.length > 0 && (
              <Button
                variant="hero"
                size="sm"
                onClick={() => saveAllDashboardDataMutation.mutate()}
                disabled={saveAllDashboardDataMutation.isPending}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95"
              >
                {saveAllDashboardDataMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                O'zgarishlarni Saqlash
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Coin Grant Modal */}
      <Dialog open={coinModalOpen} onOpenChange={setCoinModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Star className="h-5 w-5 text-primary fill-primary" /> Talabani Rag'batlantirish
            </DialogTitle>
            <DialogDescription>
              Talabaga faolligi yoki a'lo baholari uchun LMS tangalari (coin) taqdim etish.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanga Miqdori</label>
              <Select value={coinAmount} onValueChange={setCoinAmount}>
                <SelectTrigger>
                  <SelectValue placeholder="Miqdorni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">🪙 3 Coin (O'rtacha faollik)</SelectItem>
                  <SelectItem value="5">🪙 5 Coin (A'lo faollik)</SelectItem>
                  <SelectItem value="10">🪙 10 Coin (Maxsus yutuq)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sabab</label>
              <Input
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
                placeholder="Sababni kiriting..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qo'shimcha Izoh</label>
              <Input
                value={coinComment}
                onChange={(e) => setCoinComment(e.target.value)}
                placeholder="Barakalla, shunday davom et!"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCoinModalOpen(false)}>
              Bekor
            </Button>
            <Button variant="hero" onClick={handleSaveCoinsLocally}>
              <Award className="h-4 w-4 mr-1" />
              Belgilash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
