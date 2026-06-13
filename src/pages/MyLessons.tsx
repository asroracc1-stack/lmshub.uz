import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { UserCheck, BookOpen, Clock, MapPin, Save, X, Plus, Trash2, Edit, ExternalLink, Check, Coins, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Lesson {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  room: string;
  group_name: string;
  subject_id: string;
  subject_name: string;
  attachment_url: string;
}

interface StudentAttendance {
  id: string;
  full_name: string;
  username: string;
  status: string;
  note: string;
  grade?: string;
  coinAmount?: number;
}

const MyLessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeModal, setActiveModal] = useState<'attendance' | 'details' | 'create' | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Yangi dars formasi uchun state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    room: '',
    starts_at: new Date().toISOString().slice(0, 16),
    attachment_url: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchLessonsByGroup(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchInitialData = async () => {
    try {
      const [groupsRes, subjectsRes] = await Promise.all([
        api.get('/teacher/groups'),
        api.get('/teacher/subjects')
      ]);
      setGroups(groupsRes.data || []);
      setSubjects(subjectsRes.data || []);
      if (groupsRes.data?.length > 0) setSelectedGroupId(groupsRes.data[0].id);
    } catch (err) {
      toast.error("Dastlabki ma'lumotlarni yuklashda xatolik");
    }
  };

  const fetchLessonsByGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/lessons/group/${groupId}`);
      setLessons(res.data || []);
    } catch (err) {
      toast.error("Darslarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const openAttendance = async (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setActiveModal('attendance');
    setLoading(true);
    try {
      // Backenddan darsga tegishli talabalarni olish
      const res = await api.get(`/teacher/lessons/${lesson.id}/students`);
      setStudents(res.data.map((s: any) => ({
        id: s.id, 
        full_name: s.full_name, 
        username: s.username,
        status: s.status || 'PRESENT', 
        note: s.note || '',
        grade: '',
        coinAmount: 0
      })));
    } catch (err) {
      toast.error("Talabalar ro'yxatini olib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const updateStudentData = (studentId: string, field: keyof StudentAttendance, value: any) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s));
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    
    try {
      const payload = { ...formData, group_id: selectedGroupId };
      const res = await api.post('/teacher/lessons', payload);
      toast.success("Mavzu muvaffaqiyatli yaratildi");
      fetchLessonsByGroup(selectedGroupId);
      setActiveModal(null);
    } catch (err) {
      toast.error("Darsni saqlashda xatolik");
    }
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm("Ushbu mavzuni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/teacher/lessons/${id}`);
      toast.success("Mavzu o'chirildi");
      fetchLessonsByGroup(selectedGroupId);
    } catch (err) {
      toast.error("O'chirishda xatolik");
    }
  };

  const saveAttendance = async () => {
    if (!currentLesson) return;
    try {
      // Backend bittalab saqlashni kutyapti, shuning uchun tsikl ishlatamiz
      for (const student of students) {
        await api.post(`/teacher/attendance`, {
          student_id: student.id,
          lesson_id: currentLesson.id,
          status: student.status || 'PRESENT'
        });
      }
      toast.success("Barcha talabalar yo'qlama qilindi");
      setActiveModal(null);
    } catch (err) {
      toast.error("Saqlashda xatolik yuz berdi");
    }
  };

  const handleSaveGrade = async (student: StudentAttendance) => {
    if (!student.grade) return toast.error("Baho kiriting");
    try {
      await api.post('/teacher/grades', {
        student_id: student.id, // Backend UUID kutyapti
        lesson_id: currentLesson?.id,
        score: Number(student.grade)
      });
      toast.success(`${student.full_name} baholandi!`);
    } catch (error) {
      console.error("Baholash xatosi:", error);
      toast.error("Baholashda xatolik (500)");
    }
  };

  const handleGiveCoins = async (student: StudentAttendance) => {
    try {
      await api.post('/teacher/coins/grant', {
        student_id: student.id,
        amount: student.coinAmount
      });
      toast.success("Coin berildi!");
    } catch (error) {
      toast.error("Coin berishda xatolik");
    }
  };

  return (
    <div className="p-2 space-y-6 bg-slate-50/50 min-h-screen font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mening Darslarim</h1>
          <p className="text-slate-500 text-sm mt-1">Dars rejasi (Syllabus) va Yo'qlamani boshqarish</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-full md:w-[200px] rounded-xl">
              <SelectValue placeholder="Guruhni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setActiveModal('create')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shadow-lg shadow-purple-600/20 w-full md:w-auto">
            <Plus size={18} /> Yangi Mavzu
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full text-center py-12 text-slate-400 animate-pulse">Yuklanmoqda...</p>
        ) : lessons.length > 0 ? (
          lessons.map((lesson) => (
            <Card key={lesson.id} className="hover:shadow-md transition-all border-slate-200/60 rounded-2xl overflow-hidden group">
              <CardHeader className="pb-3 border-b bg-slate-50/40 relative">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-bold line-clamp-1 text-slate-800">{lesson.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteLesson(lesson.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100 uppercase">
                    {lesson.subject_name || "Mavzu"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2.5"><Clock size={16} className="text-purple-500"/> {new Date(lesson.starts_at).toLocaleString('uz-UZ')}</div>
                  <div className="flex items-center gap-2.5"><MapPin size={16} className="text-purple-500"/> {lesson.room || "Xona belgilanmagan"}</div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 hover:bg-slate-50" onClick={() => { setCurrentLesson(lesson); setActiveModal('details'); }}>
                    <BookOpen size={16} className="mr-2 text-slate-400"/> Tafsilot
                  </Button>
                  <Button size="sm" className="flex-1 rounded-xl h-9 bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/10" onClick={() => openAttendance(lesson)}>
                    <UserCheck size={16} className="mr-2"/> Yo'qlama
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium text-lg">Hozircha darslar mavjud emas</p>
            <p className="text-slate-400 text-sm mt-1">Yangi mavzu yaratish uchun yuqoridagi tugmani bosing.</p>
          </div>
        )}
      </div>

      {/* Modal - Create Lesson (Syllabus Management) */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-xl">Yangi Mavzu Qo'shish</CardTitle>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setActiveModal(null)}><X size={20}/></Button>
            </CardHeader>
            <form onSubmit={handleCreateLesson}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fan *</label>
                  <Select value={formData.subject_id} onValueChange={(val) => setFormData({...formData, subject_id: val})}>
                    <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Fanni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sarlavha *</label>
                  <Input 
                    required 
                    placeholder="Mavzu nomini kiriting" 
                    className="rounded-xl h-11 border-slate-200 bg-slate-50/50"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Boshlanish vaqti</label>
                    <Input 
                      type="datetime-local" 
                      className="rounded-xl h-11 border-slate-200 bg-slate-50/50"
                      value={formData.starts_at}
                      onChange={(e) => setFormData({...formData, starts_at: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Xona</label>
                    <Input 
                      placeholder="M-201" 
                      className="rounded-xl h-11 border-slate-200 bg-slate-50/50"
                      value={formData.room}
                      onChange={(e) => setFormData({...formData, room: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-6 border-t flex gap-3">
                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setActiveModal(null)}>Bekor qilish</Button>
                <Button type="submit" className="flex-1 rounded-xl h-11 bg-purple-600 hover:bg-purple-700">Mavzuni yaratish</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal - Details & Syllabus */}
      {activeModal === 'details' && currentLesson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-5">
              <CardTitle className="text-xl">Dars Tafsilotlari</CardTitle>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setActiveModal(null)}><X size={20}/></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sarlavha:</h4>
                <p className="text-slate-900 font-bold text-xl">{currentLesson.title}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mavzu tavsifi:</h4>
                <p className="text-slate-600 leading-relaxed">{currentLesson.description || "Tavsif mavjud emas."}</p>
              </div>
              {currentLesson.attachment_url && (
                <div className="pt-2">
                  <a href={currentLesson.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-purple-600 font-bold hover:underline">
                    <ExternalLink size={18} /> O'quv materialini ko'rish
                  </a>
                </div>
              )}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-purple-800 text-xs font-medium leading-normal">
                  Ushbu ma'lumotlar o'quvchi dashboardida dars mazmuni sifatida ko'rsatiladi.
                </p>
              </div>
            </CardContent>
            <div className="p-6 border-t bg-slate-50/30 flex justify-end">
              <Button variant="outline" className="rounded-xl px-8" onClick={() => setActiveModal(null)}>Yopish</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal - Attendance (Smart Dashboard logic) */}
      {activeModal === 'attendance' && currentLesson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-2 md:p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-white py-6">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Yo'qlama qilish</CardTitle>
                <p className="text-sm text-slate-500 font-medium mt-0.5">{currentLesson.title} — {currentLesson.group_name}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setActiveModal(null)}><X size={24}/></Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 bg-white">
              {loading ? <div className="p-10 text-center">Yuklanmoqda...</div> : (
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-widest sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-left">Talaba</th>
                      <th className="p-4 text-center">Yo'qlama holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-700">{student.full_name}</div>
                          <div className="text-xs text-slate-400">@{student.username}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-center gap-2">
                              {['PRESENT', 'ABSENT', 'LATE'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => updateStudentData(student.id, 'status', status)}
                                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                                    student.status === status 
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/20' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {status === 'PRESENT' ? 'Keldi' : status === 'ABSENT' ? 'Yo\'q' : 'Kechikdi'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
            <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/50">
              <Button variant="outline" className="rounded-xl h-12 px-8 font-bold" onClick={() => setActiveModal(null)}>Bekor qilish</Button>
              <Button onClick={saveAttendance} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-10 font-bold gap-2">
                <Save size={18}/> Saqlash
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyLessons;

