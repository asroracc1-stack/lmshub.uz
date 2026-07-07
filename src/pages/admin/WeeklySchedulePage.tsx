import { useTranslation } from "react-i18next";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Plus, Pencil, Trash2, Loader2, MapPin, BookOpen, Users2, Calendar, Sparkles } from "lucide-react";
import { api } from "@/lib/axios";

interface WeeklySchedule {
  id: string;
  groupId: string;
  groupName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  room: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Group { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Teacher { id: string; fullName: string; }

const DAYS_OF_WEEK = [
  { value: 1, label: "Dushanba" },
  { value: 2, label: "Seshanba" },
  { value: 3, label: "Chorshanba" },
  { value: 4, label: "Payshanba" },
  { value: 5, label: "Juma" },
  { value: 6, label: "Shanba" }
];

const STANDARD_SLOTS = [
  { start: "09:00", end: "09:45", label: "1-Para (09:00 - 09:45)" },
  { start: "09:55", end: "10:40", label: "2-Para (09:55 - 10:40)" },
  { start: "10:50", end: "11:35", label: "3-Para (10:50 - 11:35)" },
  { start: "11:45", end: "12:30", label: "4-Para (11:45 - 12:30)" },
  { start: "13:30", end: "14:15", label: "5-Para (13:30 - 14:15)" },
  { start: "14:25", end: "15:10", label: "6-Para (14:25 - 15:10)" },
  { start: "15:35", end: "16:20", label: "7-Para (15:35 - 16:20)" },
  { start: "16:30", end: "17:15", label: "8-Para (16:30 - 17:15)" },
];

export default function WeeklySchedulePage({ canManage = true }: { canManage?: boolean }) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // CRUD Dialog States
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklySchedule | null>(null);
  
  const [dayOfWeek, setDayOfWeek] = useState<string>("1");
  const [subjectId, setSubjectId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("09:45");
  const [saving, setSaving] = useState(false);

  // Lesson Generation Dialog States
  const [genOpen, setGenOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gRes, sRes, tRes, schRes] = await Promise.all([
        api.get("/admin/groups?size=1000"),
        api.get("/admin/subjects"),
        api.get("/admin/users?role=TEACHER"),
        api.get("/admin/weekly-schedules")
      ]);

      const rawGroups = gRes.data?.content || gRes.data || [];
      setGroups(rawGroups);
      setSubjects(sRes.data || []);
      
      // Map teacher structure from api response
      const teacherList = (tRes.data || []).map((user: any) => ({
        id: user.id,
        fullName: user.fullName || user.email
      }));
      setTeachers(teacherList);

      setSchedules(schRes.data || []);

      if (rawGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(rawGroups[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSchedules = useMemo(() => {
    if (!selectedGroupId) return [];
    return schedules.filter(s => s.groupId === selectedGroupId);
  }, [schedules, selectedGroupId]);

  const schedulesByDay = useMemo(() => {
    const map: Record<number, WeeklySchedule[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    filteredSchedules.forEach(s => {
      if (map[s.dayOfWeek]) {
        map[s.dayOfWeek].push(s);
      }
    });
    // Sort slots by start time
    Object.keys(map).forEach(key => {
      map[Number(key)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [filteredSchedules]);

  const handleOpenAdd = () => {
    setEditingSlot(null);
    setDayOfWeek("1");
    setSubjectId(subjects[0]?.id || "");
    setTeacherId(teachers[0]?.id || "");
    setRoom("");
    setStartTime("09:00");
    setEndTime("09:45");
    setEditorOpen(true);
  };

  const handleOpenEdit = (slot: WeeklySchedule) => {
    setEditingSlot(slot);
    setDayOfWeek(String(slot.dayOfWeek));
    setSubjectId(slot.subjectId);
    setTeacherId(slot.teacherId || "");
    setRoom(slot.room || "");
    // Extract HH:mm from HH:mm:ss if present
    setStartTime(slot.startTime.substring(0, 5));
    setEndTime(slot.endTime.substring(0, 5));
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!selectedGroupId) {
      return toast.error("Iltimos, avval guruhni tanlang!");
    }
    if (!subjectId) {
      return toast.error("Iltimos, fanni tanlang!");
    }
    if (!startTime || !endTime) {
      return toast.error("Boshlanish va tugash vaqtlarini kiriting!");
    }

    setSaving(true);
    try {
      const payload = {
        groupId: selectedGroupId,
        subjectId,
        teacherId: teacherId || null,
        room: room.trim() || null,
        dayOfWeek: Number(dayOfWeek),
        startTime: startTime.includes(":") && startTime.split(":").length === 2 ? `${startTime}:00` : startTime,
        endTime: endTime.includes(":") && endTime.split(":").length === 2 ? `${endTime}:00` : endTime,
      };

      if (editingSlot) {
        const res = await api.put(`/admin/weekly-schedules/${editingSlot.id}`, payload);
        toast.success("Dars jadvali muvaffaqiyatli yangilandi!");
        setSchedules(prev => prev.map(s => s.id === editingSlot.id ? res.data : s));
      } else {
        const res = await api.post("/admin/weekly-schedules", payload);
        toast.success("Dars jadvali muvaffaqiyatli qo'shildi!");
        setSchedules(prev => [...prev, res.data]);
      }
      setEditorOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || "Amalni bajarishda xatolik yuz berdi!";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu dars dars jadvalidan o'chirilsinmi?")) return;
    try {
      await api.delete(`/admin/weekly-schedules/${id}`);
      toast.success("Dars o'chirildi!");
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error("O'chirishda xatolik yuz berdi!");
    }
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      return toast.error("Iltimos, boshlanish va tugash sanasini kiriting!");
    }
    setGenerating(true);
    try {
      const res = await api.post(`/admin/weekly-schedules/generate?start_date=${startDate}&end_date=${endDate}`);
      toast.success(res.data.message || "Darslar muvaffaqiyatli generatsiya qilindi!");
      if (res.data.count !== undefined) {
        toast.info(`${res.data.count} ta yangi dars yaratildi!`);
      }
      setGenOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Generatsiya qilishda xatolik yuz berdi!");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header card with styling */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-12 -translate-y-12 transform rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute left-1/3 bottom-0 h-24 w-24 translate-y-12 transform rounded-full bg-white/10 blur-xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md">
                <Sparkles className="h-3 w-3 mr-1" /> PDP School System
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Dars Jadvali Plannneri</h1>
            <p className="text-white/80 font-medium max-w-xl">
              100 dan ortiq sinflar dars jadvallarini boshqarish va o'qituvchilar bandligini chalkashliklarsiz rejalashtirish
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setGenOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-600/30 font-semibold"
            >
              <Calendar className="h-4 w-4 mr-2" /> Darslarni Generatsiya Qilish
            </Button>
            {canManage && (
              <Button 
                onClick={handleOpenAdd}
                className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" /> Yangi Dars Qo'shish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Control panel: Select Group */}
      <Card className="p-6 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
        <div className="space-y-1 w-full sm:w-auto">
          <Label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Sinf / Guruh</Label>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
            </div>
          ) : (
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-full sm:w-[280px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl h-11">
                <SelectValue placeholder="Guruhni tanlang" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
          O'qituvchilar bandligi tekshiriladi
        </div>
      </Card>

      {/* Timetable Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-muted-foreground font-medium">Jadval ma'lumotlari yuklanmoqda...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {DAYS_OF_WEEK.map(day => {
            const daySlots = schedulesByDay[day.value] || [];
            return (
              <Card key={day.value} className="bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[400px]">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{day.label}</span>
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-950">
                    {daySlots.length} dars
                  </Badge>
                </div>

                <div className="space-y-4 flex-grow">
                  {daySlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                      <CalendarClock className="h-8 w-8 text-slate-300 dark:text-slate-800 mb-2" />
                      <span className="text-xs text-slate-400 font-medium">Dars rejalashtirilmagan</span>
                    </div>
                  ) : (
                    daySlots.map(slot => (
                      <Card 
                        key={slot.id} 
                        className="group relative p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="space-y-3">
                          {/* Time badge */}
                          <div className="flex items-center justify-between">
                            <Badge className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-0 text-[10px] font-bold">
                              {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                            </Badge>

                            {canManage && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 absolute top-3 right-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleOpenEdit(slot)}
                                  className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDelete(slot.id)}
                                  className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Subject name */}
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                            {slot.subjectName}
                          </div>

                          {/* Teacher name */}
                          {slot.teacherName && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Users2 className="h-3.5 w-3.5 text-slate-400" />
                              {slot.teacherName}
                            </div>
                          )}

                          {/* Room name */}
                          {slot.room && (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              Xona: {slot.room}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TIMETABLE SLOT EDITOR DIALOG */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              {editingSlot ? "Darsni Tahrirlash" : "Yangi Dars Qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Dars haqidagi barcha ma'lumotlarni kiriting. Tizim avtomatik tarzda chalkashliklarni tekshiradi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Day of Week */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Hafta Kuni</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Kunni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Room input */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Xona</Label>
                <Input 
                  value={room} 
                  onChange={(e) => setRoom(e.target.value)} 
                  placeholder="Masalan, 102"
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Subject Select */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Fan (Subject)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Fanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Select */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">O'qituvchi (Teacher)</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="O'qituvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">O'qituvchi biriktirilmagan</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Dars Vaqti</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Boshlanishi</span>
                  <Input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Tugashi</span>
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Standard Slots Helper */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-bold block mb-1.5">Standard PDP para vaqtlari:</span>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                  {STANDARD_SLOTS.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setStartTime(slot.start);
                        setEndTime(slot.end);
                      }}
                      className="text-[9px] font-bold bg-white hover:bg-indigo-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 hover:text-indigo-600 transition-colors"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditorOpen(false)}>Bekor qilish</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSlot ? "Yangilash" : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GENERATE CONCRETE LESSONS DIALOG */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Kalendarga darslarni yuklash
            </DialogTitle>
            <DialogDescription>
              Haftalik rejalashtirilgan jadvallardan kelib chiqib, ma'lum sana oralig'idagi real dars hodisalarini (Attendance va yo'qlamalar uchun) yaratish.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Boshlanish sanasi</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Tugash sanasi</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setGenOpen(false)}>Bekor qilish</Button>
            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Darslarni yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
