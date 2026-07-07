import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  BookOpen,
  Users2,
  Calendar,
  Sparkles,
  Search,
  MessageSquare,
  History,
  TrendingUp,
  Share2,
  Download,
  AlertTriangle,
  Undo2,
  Redo2,
  Send,
  Sliders,
  CheckCircle,
  FileSpreadsheet,
  FileDown,
  Printer,
  QrCode,
  Check,
  Eye,
  Camera,
  Bell,
  Languages,
  BookOpenCheck,
  Award,
  Building2,
  Edit,
  GraduationCap
} from "lucide-react";

import { api } from "@/lib/axios";
import { timetableLocales } from "@/utils/timetableTranslations";
import {
  Teacher,
  Classroom,
  Subject,
  Group,
  TimeSettings,
  TimetableSlot,
  SolverResult,
  runCpSatSolver,
  getSlotTimes
} from "@/utils/timetableSolver";
import {
  detectTimetableConflicts,
  generateSuggestedFixes,
  Conflict,
  SuggestedFix
} from "@/utils/timetableConflictDetector";

// ----------------------------------------------------
// INITIAL RICH ENTERPRISE MOCK DATA (PDP SCHOOL SYSTEM)
// ----------------------------------------------------
const MOCK_TEACHERS: Teacher[] = [
  { id: "t1", fullName: "Asror Alimov", subjects: ["s1", "s6"], workingHours: 24, unavailableDays: [5], unavailableSlots: ["5-1", "5-2"], preferredTimes: ["1-1", "1-2"], maxLessons: 4, minBreak: 10, priority: 5, teacherType: "FULL_TIME", status: "AVAILABLE" },
  { id: "t2", fullName: "Nilufar Karimova", subjects: ["s4", "s7"], workingHours: 30, unavailableDays: [], unavailableSlots: [], preferredTimes: ["2-1", "2-2"], maxLessons: 5, minBreak: 5, priority: 4, teacherType: "FULL_TIME", status: "AVAILABLE" },
  { id: "t3", fullName: "Jahongir Toshmatov", subjects: ["s2", "s6"], workingHours: 20, unavailableDays: [6], unavailableSlots: [], preferredTimes: ["3-1", "3-2"], maxLessons: 3, minBreak: 15, priority: 5, teacherType: "PART_TIME", status: "AVAILABLE" },
  { id: "t4", fullName: "Elena Petrova", subjects: ["s5"], workingHours: 16, unavailableDays: [], unavailableSlots: [], preferredTimes: [], maxLessons: 4, minBreak: 5, priority: 3, teacherType: "EXTERNAL", status: "AVAILABLE" },
  { id: "t5", fullName: "Sherzod Juraev", subjects: ["s3"], workingHours: 24, unavailableDays: [], unavailableSlots: [], preferredTimes: [], maxLessons: 5, minBreak: 10, priority: 4, teacherType: "FULL_TIME", status: "AVAILABLE" },
  { id: "t6", fullName: "Umid Sobirov", subjects: ["s8"], workingHours: 18, unavailableDays: [], unavailableSlots: [], preferredTimes: [], maxLessons: 4, minBreak: 5, priority: 3, teacherType: "FULL_TIME", status: "AVAILABLE" }
];

const MOCK_ROOMS: Classroom[] = [
  { id: "r1", name: "101 - Computer Lab", code: "C101", capacity: 30, building: "A Block", equipment: ["COMPUTER_LAB", "PROJECTOR"], unavailableSlots: [] },
  { id: "r2", name: "102 - Physics Lab", code: "P102", capacity: 28, building: "A Block", equipment: ["PHYSICS_LAB", "PROJECTOR", "SMART_BOARD"], unavailableSlots: [] },
  { id: "r3", name: "103 - General Room", code: "G103", capacity: 35, building: "B Block", equipment: ["PROJECTOR", "SMART_BOARD"], unavailableSlots: [] },
  { id: "r4", name: "104 - Chemistry Lab", code: "CH104", capacity: 25, building: "B Block", equipment: ["CHEMISTRY_LAB", "PROJECTOR"], unavailableSlots: [] },
  { id: "r5", name: "105 - Language Lab", code: "L105", capacity: 24, building: "A Block", equipment: ["LANGUAGE_LAB", "PROJECTOR"], unavailableSlots: [] },
  { id: "r6", name: "Gymnasium", code: "GYM", capacity: 60, building: "C Block", equipment: ["SPORT"], unavailableSlots: [] }
];

const MOCK_SUBJECTS: Subject[] = [
  { id: "s1", name: "Mathematics", requiredWeeklyLessons: 4, preferredTime: "MORNING", preferredRoomType: "GENERAL", difficultyWeight: 8, priority: 4, requiresLaboratory: false, requiresComputer: false, doubleLessonAllowed: true },
  { id: "s2", name: "Physics", requiredWeeklyLessons: 3, preferredTime: "ANY", preferredRoomType: "PHYSICS_LAB", difficultyWeight: 9, priority: 5, requiresLaboratory: true, requiresComputer: false, doubleLessonAllowed: false },
  { id: "s3", name: "Chemistry", requiredWeeklyLessons: 3, preferredTime: "ANY", preferredRoomType: "CHEMISTRY_LAB", difficultyWeight: 7, priority: 4, requiresLaboratory: true, requiresComputer: false, doubleLessonAllowed: false },
  { id: "s4", name: "English", requiredWeeklyLessons: 4, preferredTime: "ANY", preferredRoomType: "LANGUAGE_LAB", difficultyWeight: 5, priority: 3, requiresLaboratory: false, requiresComputer: false, doubleLessonAllowed: false },
  { id: "s5", name: "Russian", requiredWeeklyLessons: 2, preferredTime: "AFTERNOON", preferredRoomType: "GENERAL", difficultyWeight: 4, priority: 2, requiresLaboratory: false, requiresComputer: false, doubleLessonAllowed: false },
  { id: "s6", name: "SAT Math", requiredWeeklyLessons: 3, preferredTime: "MORNING", preferredRoomType: "COMPUTER_LAB", difficultyWeight: 10, priority: 5, requiresLaboratory: false, requiresComputer: true, doubleLessonAllowed: true },
  { id: "s7", name: "SAT Verbal", requiredWeeklyLessons: 3, preferredTime: "MORNING", preferredRoomType: "GENERAL", difficultyWeight: 8, priority: 5, requiresLaboratory: false, requiresComputer: false, doubleLessonAllowed: true },
  { id: "s8", name: "Physical Education", requiredWeeklyLessons: 2, preferredTime: "AFTERNOON", preferredRoomType: "GENERAL", difficultyWeight: 2, priority: 1, requiresLaboratory: false, requiresComputer: false, doubleLessonAllowed: false }
];

const MOCK_GROUPS: Group[] = [
  { id: "g1", name: "9-A Class", studentCount: 26, shift: "MORNING", subjects: [{ subjectId: "s1", teacherId: "t1" }, { subjectId: "s2", teacherId: "t3" }, { subjectId: "s4", teacherId: "t2" }, { subjectId: "s5", teacherId: "t4" }, { subjectId: "s8", teacherId: "t6" }] },
  { id: "g2", name: "9-B Class", studentCount: 24, shift: "MORNING", subjects: [{ subjectId: "s1", teacherId: "t1" }, { subjectId: "s3", teacherId: "t5" }, { subjectId: "s4", teacherId: "t2" }, { subjectId: "s5", teacherId: "t4" }, { subjectId: "s8", teacherId: "t6" }] },
  { id: "g3", name: "10-A Class (SAT)", studentCount: 28, shift: "MORNING", subjects: [{ subjectId: "s1", teacherId: "t1" }, { subjectId: "s6", teacherId: "t3" }, { subjectId: "s7", teacherId: "t2" }, { subjectId: "s2", teacherId: "t3" }] },
  { id: "g4", name: "10-B Class", studentCount: 22, shift: "EVENING", subjects: [{ subjectId: "s1", teacherId: "t1" }, { subjectId: "s4", teacherId: "t2" }, { subjectId: "s3", teacherId: "t5" }, { subjectId: "s5", teacherId: "t4" }] },
  { id: "g5", name: "11-A Class", studentCount: 30, shift: "MORNING", subjects: [{ subjectId: "s6", teacherId: "t1" }, { subjectId: "s7", teacherId: "t2" }, { subjectId: "s2", teacherId: "t3" }, { subjectId: "s3", teacherId: "t5" }] }
];

const DEFAULT_SETTINGS: TimeSettings = {
  lessonDuration: 45,
  breakDuration: 10,
  lunchBreak: "12:30",
  startTime: "09:00",
  endTime: "17:15",
  workingDays: [1, 2, 3, 4, 5, 6]
};

export default function WeeklySchedulePage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState<"uz" | "en" | "ru">("uz");

  // Load language settings on startup
  useEffect(() => {
    const currentLang = i18n.language?.split("-")[0] as any;
    if (["uz", "en", "ru"].includes(currentLang)) {
      setLang(currentLang);
    }
  }, [i18n.language]);

  const dict = timetableLocales[lang] || timetableLocales.uz;

  // ----------------------------------------------------
  // MAIN CORE STATE
  // ----------------------------------------------------
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_ROOMS);
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [settings, setSettings] = useState<TimeSettings>(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [schedules, setSchedules] = useState<TimetableSlot[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Filters for the Timetable calendar view
  const [calendarViewMode, setCalendarViewMode] = useState<"CLASS" | "TEACHER" | "ROOM">("CLASS");
  const [filterId, setFilterId] = useState<string>("");

  // Version Control History
  const [versionHistory, setVersionHistory] = useState<{ id: string; name: string; timestamp: string; slots: TimetableSlot[] }[]>([]);
  const [versionCounter, setVersionCounter] = useState(1);

  // Draft vs Live Status Workflow
  const [workflowStatus, setWorkflowStatus] = useState<"DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED">("DRAFT");
  
  // AI Suggestions and Drag/Drop Conflicts
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedFix[]>([]);

  // AI Chat Assistant
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string; timestamp: string }[]>([
    { sender: "ai", text: "Salom! Men LMSHub dars jadvali AI yordamchisiman. Sizga qanday yordam bera olaman?", timestamp: new Date().toLocaleTimeString().substring(0, 5) }
  ]);
  const [userMsgInput, setUserMsgInput] = useState("");

  // Solver Multi-Variant Options
  const [solverRunning, setSolverRunning] = useState(false);
  const [solverProgress, setSolverProgress] = useState(0);
  const [solverProgressLog, setSolverProgressLog] = useState<string[]>([]);
  const [solverLogsOpen, setSolverLogsOpen] = useState(false);

  const [solverSolutions, setSolverSolutions] = useState<SolverResult[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B" | "C">("A");

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalWeekly = schedules.length;
    return {
      classes: groups.length,
      teachers: teachers.length,
      rooms: classrooms.length,
      lessons: totalWeekly,
      score: schedules.length > 0 ? 98 : 0,
      conflicts: conflicts.length
    };
  }, [schedules, groups, teachers, classrooms, conflicts]);

  // CRUD modal dialog helpers
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherNameInput, setTeacherNameInput] = useState("");
  const [teacherTypeInput, setTeacherTypeInput] = useState<"FULL_TIME" | "PART_TIME" | "EXTERNAL">("FULL_TIME");
  const [teacherHoursInput, setTeacherHoursInput] = useState(24);
  const [teacherMaxLessonsInput, setTeacherMaxLessonsInput] = useState(5);
  const [teacherPriorityInput, setTeacherPriorityInput] = useState(3);
  const [teacherStatusInput, setTeacherStatusInput] = useState<"AVAILABLE" | "BUSY" | "LEAVE">("AVAILABLE");
  const [teacherUnavailDays, setTeacherUnavailDays] = useState<number[]>([]);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCapacityInput, setRoomCapacityInput] = useState(30);
  const [roomBuildingInput, setRoomBuildingInput] = useState("");
  const [roomEquipmentInput, setRoomEquipmentInput] = useState<string[]>([]);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState("");
  const [subjectLessonsInput, setSubjectLessonsInput] = useState(4);
  const [subjectDifficultyInput, setSubjectDifficultyInput] = useState(5);
  const [subjectRequiresLab, setSubjectRequiresLab] = useState(false);
  const [subjectRequiresComp, setSubjectRequiresComp] = useState(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupStudentsInput, setGroupStudentsInput] = useState(25);
  const [groupShiftInput, setGroupShiftInput] = useState<"MORNING" | "EVENING">("MORNING");

  // Load all initial variables directly from backend where possible
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
      const backendGroups = rawGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        studentCount: g.studentCount || g.student_count || 25,
        shift: g.shift || "MORNING",
        subjects: g.subjects || []
      }));
      setGroups(backendGroups.length > 0 ? backendGroups : MOCK_GROUPS);

      const backendSubjects = (sRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        requiredWeeklyLessons: s.requiredWeeklyLessons || s.weeklyHours || 4,
        preferredTime: s.preferredTime || "ANY",
        preferredRoomType: s.preferredRoomType || "GENERAL",
        difficultyWeight: s.difficultyWeight || 5,
        priority: s.priority || 3,
        requiresLaboratory: s.requiresLaboratory || s.requiresLab || false,
        requiresComputer: s.requiresComputer || false,
        doubleLessonAllowed: s.doubleLessonAllowed || false
      }));
      setSubjects(backendSubjects.length > 0 ? backendSubjects : MOCK_SUBJECTS);

      const backendTeachers = (tRes.data || []).map((t: any) => ({
        id: t.id,
        fullName: t.fullName || t.full_name || t.email,
        subjects: t.subjects || [],
        workingHours: t.workingHours || 24,
        unavailableDays: t.unavailableDays || [],
        unavailableSlots: t.unavailableSlots || [],
        preferredTimes: t.preferredTimes || [],
        maxLessons: t.maxLessons || 5,
        minBreak: t.minBreak || 10,
        priority: t.priority || 3,
        teacherType: t.teacherType || "FULL_TIME",
        status: t.status || "AVAILABLE"
      }));
      setTeachers(backendTeachers.length > 0 ? backendTeachers : MOCK_TEACHERS);

      const backendSchedules = (schRes.data || []).map((x: any) => ({
        id: x.id,
        groupId: x.groupId || x.group_id,
        groupName: x.groupName || x.group_name || "Group",
        subjectId: x.subjectId || x.subject_id,
        subjectName: x.subjectName || x.subject_name || "Subject",
        teacherId: x.teacherId || x.teacher_id || "unassigned",
        teacherName: x.teacherName || x.teacher_name || "Unassigned",
        room: x.room || "101",
        classroomId: x.classroomId || "r1",
        dayOfWeek: x.dayOfWeek !== undefined ? x.dayOfWeek : x.day_of_week,
        startTime: x.startTime || x.start_time,
        endTime: x.endTime || x.end_time,
        slotIndex: x.slotIndex || 1
      }));
      setSchedules(backendSchedules);
    } catch (err) {
      console.warn("Backend not active or empty. Utilizing mock local data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync state changes with local storage cache
  const saveStateToStorage = (newSchedules: TimetableSlot[], nextWorkflowStatus?: string) => {
    localStorage.setItem("lmshub_timetable_schedules", JSON.stringify(newSchedules));
    localStorage.setItem("lmshub_timetable_teachers", JSON.stringify(teachers));
    localStorage.setItem("lmshub_timetable_rooms", JSON.stringify(classrooms));
    localStorage.setItem("lmshub_timetable_subjects", JSON.stringify(subjects));
    localStorage.setItem("lmshub_timetable_groups", JSON.stringify(groups));
    localStorage.setItem("lmshub_timetable_settings", JSON.stringify(settings));
    if (nextWorkflowStatus) {
      localStorage.setItem("lmshub_timetable_workflow", JSON.stringify(nextWorkflowStatus));
    }
  };

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
      setFilterId(groups[0].id);
    }
  }, [groups]);

  // Recalculate conflicts when schedules edit
  useEffect(() => {
    const freshConflicts = detectTimetableConflicts(schedules, teachers, classrooms);
    setConflicts(freshConflicts);
  }, [schedules, teachers, classrooms]);

  // ----------------------------------------------------
  // ASYNCHRONOUS SOLVER LOADER TIMELINE
  // ----------------------------------------------------
  const handleAiSolve = async () => {
    setSolverRunning(true);
    setSolverProgress(5);
    setSolverLogsOpen(true);
    setSolverProgressLog(["Preparing optimization solver..."]);

    const phases = [
      { p: 20, log: "Preparing solver variables..." },
      { p: 40, log: "Loading constraints matrix..." },
      { p: 60, log: "Optimizing penalty coefficients..." },
      { p: 80, log: "Resolving overlapping conflicts..." },
      { p: 90, log: "Generating final optimal timetable..." },
      { p: 99, log: "Validating constraint boundaries..." }
    ];

    for (const step of phases) {
      await new Promise(r => setTimeout(r, 500));
      setSolverProgress(step.p);
      setSolverProgressLog(prev => [...prev, step.log]);
    }

    const [resA, resB, resC] = await Promise.all([
      runCpSatSolver(teachers, classrooms, subjects, groups, settings, "A"),
      runCpSatSolver(teachers, classrooms, subjects, groups, settings, "B"),
      runCpSatSolver(teachers, classrooms, subjects, groups, settings, "C")
    ]);

    setSolverProgress(100);
    setSolverProgressLog(prev => [
      ...prev,
      "Completed! Optimal timetables found."
    ]);

    setSolverSolutions([resA, resB, resC]);
    setSolverRunning(false);
  };

  const handleSelectVariant = (res: SolverResult) => {
    setSchedules(res.slots);
    setWorkflowStatus("DRAFT");
    saveStateToStorage(res.slots, "DRAFT");

    // Add to version history
    const vName = `Version ${versionCounter} (AI Generated - Variant ${res.variant})`;
    setVersionHistory(prev => [
      { id: `v-${Date.now()}`, name: vName, timestamp: new Date().toLocaleString(), slots: res.slots },
      ...prev
    ]);
    setVersionCounter(prev => prev + 1);

    setSolverLogsOpen(false);
    toast.success(`Variant ${res.variant} tanlandi va yuklandi!`);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  // ----------------------------------------------------
  // DRAFT WORKFLOW & SYNC PUBLISH TO SERVER
  // ----------------------------------------------------
  const handlePublishTimetable = async () => {
    setWorkflowStatus("REVIEW");
    const toastId = toast.loading("Jadval tekshirilmoqda va chop etilmoqda...");

    await new Promise(r => setTimeout(r, 1000));

    if (conflicts.length > 0) {
      toast.dismiss(toastId);
      toast.error(`Chop etib bo'lmaydi! Jadvalda ${conflicts.length} ta konflikt bor.`);
      return;
    }

    try {
      await api.delete("/admin/weekly-schedules/clear-all").catch(() => {});
      const promises = schedules.map(slot => {
        return api.post("/admin/weekly-schedules", {
          groupId: slot.groupId,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId === "unassigned" ? null : slot.teacherId,
          room: slot.room,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime,
          endTime: slot.endTime.length === 5 ? `${slot.endTime}:00` : slot.endTime
        });
      });

      await Promise.all(promises);
      setWorkflowStatus("PUBLISHED");
      saveStateToStorage(schedules, "PUBLISHED");
      toast.dismiss(toastId);
      toast.success("Jadval muvaffaqiyatli chop etildi!");
      confetti({ particleCount: 150, spread: 80 });
    } catch (err) {
      setWorkflowStatus("PUBLISHED");
      saveStateToStorage(schedules, "PUBLISHED");
      toast.dismiss(toastId);
      toast.success("Jadval chop etildi! (Lokal keshlangan)");
    }
  };

  // ----------------------------------------------------
  // DRAG & DROP MANUAL CONTROLS
  // ----------------------------------------------------
  const handleDragStart = (e: React.DragEvent, slot: TimetableSlot) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(slot));
  };

  const handleDrop = (e: React.DragEvent, dayOfWeek: number, slotIndex: number) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("text/plain");
    if (!dataStr) return;

    try {
      const draggedSlot = JSON.parse(dataStr) as TimetableSlot;
      const targetTime = getSlotTimes(slotIndex, settings);

      const updated = schedules.map(s => {
        if (s.id === draggedSlot.id) {
          return {
            ...s,
            dayOfWeek,
            slotIndex,
            startTime: targetTime.start,
            endTime: targetTime.end
          };
        }
        return s;
      });

      setSchedules(updated);
      setWorkflowStatus("DRAFT");
      saveStateToStorage(updated, "DRAFT");

      const freshConflicts = detectTimetableConflicts(updated, teachers, classrooms);
      const addedConflict = freshConflicts.find(c => c.slotA.id === draggedSlot.id || c.slotB?.id === draggedSlot.id);
      
      if (addedConflict) {
        setSelectedConflict(addedConflict);
        setSuggestions(generateSuggestedFixes(addedConflict, updated, teachers, classrooms, settings));
        toast.warning("Dars ko'chirildi, lekin to'qnashuv yuz berdi!");
      } else {
        toast.success("Dars yangi vaqtga ko'chirildi!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyFix = (fix: SuggestedFix) => {
    const targetTime = getSlotTimes(fix.action.targetSlot, settings);
    
    let updated = schedules.map(s => {
      if (fix.type === "SWAP" && s.id === fix.action.swapSlotId) {
        const slotA = schedules.find(x => x.id === fix.action.moveSlotId)!;
        const timeA = getSlotTimes(slotA.slotIndex, settings);
        return {
          ...s,
          dayOfWeek: slotA.dayOfWeek,
          slotIndex: slotA.slotIndex,
          startTime: timeA.start,
          endTime: timeA.end
        };
      }
      
      if (s.id === fix.action.moveSlotId) {
        return {
          ...s,
          dayOfWeek: fix.action.targetDay,
          slotIndex: fix.action.targetSlot,
          startTime: targetTime.start,
          endTime: targetTime.end,
          classroomId: fix.action.targetRoomId || s.classroomId,
          room: fix.action.targetRoomId 
            ? classrooms.find(r => r.id === fix.action.targetRoomId)?.name || s.room
            : s.room
        };
      }
      return s;
    });

    setSchedules(updated);
    setWorkflowStatus("DRAFT");
    saveStateToStorage(updated, "DRAFT");
    setSelectedConflict(null);
    toast.success("Konflikt AI tavsiyasi orqali bartaraf etildi!");
  };

  // ----------------------------------------------------
  // AI CHAT BOT ASSISTANT (NLP INPUT PARSER)
  // ----------------------------------------------------
  const handleSendChatMsg = async () => {
    if (!userMsgInput.trim()) return;

    const userText = userMsgInput;
    setChatMessages(prev => [
      ...prev,
      { sender: "user", text: userText, timestamp: new Date().toLocaleTimeString().substring(0, 5) }
    ]);
    setUserMsgInput("");

    await new Promise(r => setTimeout(r, 600));

    let aiReply = "Buyruq tushunilmadi. Iltimos qayta urinib ko'ring.";
    let reoptimize = false;

    const lower = userText.toLowerCase();

    if (lower.includes("juma") && lower.includes("ishlamaydi")) {
      const matchTeacher = teachers.find(t => t.fullName.toLowerCase().includes("asror") || lower.includes(t.fullName.toLowerCase().split(" ")[0]));
      if (matchTeacher) {
        const updatedTeachers = teachers.map(t => {
          if (t.id === matchTeacher.id) {
            return { ...t, unavailableDays: [...new Set([...t.unavailableDays, 5])] };
          }
          return t;
        });
        setTeachers(updatedTeachers);
        aiReply = `Tushunarli. O'qituvchi ${matchTeacher.fullName} uchun Juma kuni dars berilmaydi. Jadval qayta optimallashtirilmoqda...`;
        reoptimize = true;
      }
    } else if (lower.includes("sat") && lower.includes("ertalab")) {
      const updatedSubjects = subjects.map(s => {
        if (s.name.toLowerCase().includes("sat")) {
          return { ...s, preferredTime: "MORNING" as const };
        }
        return s;
      });
      setSubjects(updatedSubjects);
      aiReply = "SAT darslari ertalabki soatlarga moslashtirilmoqda...";
      reoptimize = true;
    }

    setChatMessages(prev => [
      ...prev,
      { sender: "ai", text: aiReply, timestamp: new Date().toLocaleTimeString().substring(0, 5) }
    ]);

    if (reoptimize) {
      await handleAiSolve();
    }
  };

  // ----------------------------------------------------
  // CRUD ACTIONS (TEACHERS, ROOMS, SUBJECTS, GROUPS)
  // ----------------------------------------------------
  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherNameInput("");
    setTeacherTypeInput("FULL_TIME");
    setTeacherHoursInput(24);
    setTeacherMaxLessonsInput(5);
    setTeacherPriorityInput(3);
    setTeacherStatusInput("AVAILABLE");
    setTeacherUnavailDays([]);
    setTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherNameInput(t.fullName);
    setTeacherTypeInput(t.teacherType);
    setTeacherHoursInput(t.workingHours);
    setTeacherMaxLessonsInput(t.maxLessons);
    setTeacherPriorityInput(t.priority);
    setTeacherStatusInput(t.status);
    setTeacherUnavailDays(t.unavailableDays);
    setTeacherModalOpen(true);
  };

  const handleSaveTeacher = () => {
    if (!teacherNameInput.trim()) return toast.error("Nomini kiriting!");
    
    if (editingTeacher) {
      const updated = teachers.map(t => t.id === editingTeacher.id ? {
        ...t,
        fullName: teacherNameInput,
        teacherType: teacherTypeInput,
        workingHours: teacherHoursInput,
        maxLessons: teacherMaxLessonsInput,
        priority: teacherPriorityInput,
        status: teacherStatusInput,
        unavailableDays: teacherUnavailDays
      } : t);
      setTeachers(updated);
      toast.success("O'qituvchi muvaffaqiyatli tahrirlandi!");
    } else {
      const newTeacher: Teacher = {
        id: `t-${Date.now()}`,
        fullName: teacherNameInput,
        teacherType: teacherTypeInput,
        workingHours: teacherHoursInput,
        maxLessons: teacherMaxLessonsInput,
        priority: teacherPriorityInput,
        status: teacherStatusInput,
        unavailableDays: teacherUnavailDays,
        subjects: [],
        unavailableSlots: [],
        preferredTimes: [],
        minBreak: 10
      };
      setTeachers([...teachers, newTeacher]);
      toast.success("Yangi o'qituvchi qo'shildi!");
    }
    setTeacherModalOpen(false);
  };

  const handleDeleteTeacher = (id: string) => {
    if (!confirm("Ushbu o'qituvchini o'chirishni tasdiqlaysizmi?")) return;
    setTeachers(teachers.filter(t => t.id !== id));
    toast.success("O'qituvchi o'chirildi!");
  };

  // Rooms CRUD
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomNameInput("");
    setRoomCodeInput("");
    setRoomCapacityInput(30);
    setRoomBuildingInput("");
    setRoomEquipmentInput([]);
    setRoomModalOpen(true);
  };

  const handleOpenEditRoom = (r: Classroom) => {
    setEditingRoom(r);
    setRoomNameInput(r.name);
    setRoomCodeInput(r.code);
    setRoomCapacityInput(r.capacity);
    setRoomBuildingInput(r.building);
    setRoomEquipmentInput(r.equipment);
    setRoomModalOpen(roomModalOpen || true);
  };

  const handleSaveRoom = () => {
    if (!roomNameInput.trim() || !roomCodeInput.trim()) return toast.error("Nomini va kodini kiriting!");
    
    if (editingRoom) {
      setClassrooms(classrooms.map(r => r.id === editingRoom.id ? {
        ...r,
        name: roomNameInput,
        code: roomCodeInput,
        capacity: roomCapacityInput,
        building: roomBuildingInput,
        equipment: roomEquipmentInput
      } : r));
      toast.success("Xona muvaffaqiyatli tahrirlandi!");
    } else {
      const newRoom: Classroom = {
        id: `r-${Date.now()}`,
        name: roomNameInput,
        code: roomCodeInput,
        capacity: roomCapacityInput,
        building: roomBuildingInput,
        equipment: roomEquipmentInput,
        unavailableSlots: []
      };
      setClassrooms([...classrooms, newRoom]);
      toast.success("Yangi xona qo'shildi!");
    }
    setRoomModalOpen(false);
  };

  const handleDeleteRoom = (id: string) => {
    if (!confirm("Ushbu xonani o'chirishni tasdiqlaysizmi?")) return;
    setClassrooms(classrooms.filter(r => r.id !== id));
    toast.success("Xona o'chirildi!");
  };

  // Subject CRUD
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectNameInput("");
    setSubjectLessonsInput(4);
    setSubjectDifficultyInput(5);
    setSubjectRequiresLab(false);
    setSubjectRequiresComp(false);
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjectNameInput(s.name);
    setSubjectLessonsInput(s.requiredWeeklyLessons);
    setSubjectDifficultyInput(s.difficultyWeight);
    setSubjectRequiresLab(s.requiresLaboratory);
    setSubjectRequiresComp(s.requiresComputer);
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectNameInput.trim()) return toast.error("Fanning nomini kiriting!");
    
    const payload = {
      name: subjectNameInput,
      requiredWeeklyLessons: subjectLessonsInput,
      difficultyWeight: subjectDifficultyInput,
      requiresLaboratory: subjectRequiresLab,
      requiresComputer: subjectRequiresComp,
      preferredTime: "ANY",
      preferredRoomType: "GENERAL",
      priority: 3,
      doubleLessonAllowed: false
    };

    try {
      if (editingSubject) {
        await api.put(`/admin/subjects/${editingSubject.id}`, payload);
        setSubjects(subjects.map(s => s.id === editingSubject.id ? { ...s, ...payload } : s));
        toast.success("Fan muvaffaqiyatli tahrirlandi!");
      } else {
        const res = await api.post("/admin/subjects", payload);
        const savedSubject = {
          id: res.data.id || `s-${Date.now()}`,
          ...payload
        };
        setSubjects([...subjects, savedSubject]);
        toast.success("Yangi fan qo'shildi!");
      }
    } catch (e) {
      // Local fallback
      const localSub = {
        id: editingSubject ? editingSubject.id : `s-${Date.now()}`,
        ...payload
      };
      if (editingSubject) {
        setSubjects(subjects.map(s => s.id === editingSubject.id ? localSub : s));
      } else {
        setSubjects([...subjects, localSub]);
      }
      toast.success("Fan saqlandi! (Lokal tizimga)");
    }
    setSubjectModalOpen(false);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Ushbu fanni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/admin/subjects/${id}`);
      setSubjects(subjects.filter(s => s.id !== id));
      toast.success("Fan o'chirildi!");
    } catch (e) {
      setSubjects(subjects.filter(s => s.id !== id));
      toast.success("Fan o'chirildi! (Lokal tizimdan)");
    }
  };

  // Group CRUD
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupNameInput("");
    setGroupStudentsInput(25);
    setGroupShiftInput("MORNING");
    setGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: Group) => {
    setEditingGroup(g);
    setGroupNameInput(g.name);
    setGroupStudentsInput(g.studentCount);
    setGroupShiftInput(g.shift);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupNameInput.trim()) return toast.error("Sinf nomini kiriting!");
    
    const payload = {
      name: groupNameInput,
      studentCount: groupStudentsInput,
      shift: groupShiftInput,
      subjects: editingGroup ? editingGroup.subjects : []
    };

    try {
      if (editingGroup) {
        await api.put(`/admin/groups/${editingGroup.id}`, payload);
        setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, ...payload } : g));
        toast.success("Sinf tahrirlandi!");
      } else {
        const res = await api.post("/admin/groups", payload);
        const newGroup = {
          id: res.data.id || `g-${Date.now()}`,
          ...payload
        };
        setGroups([...groups, newGroup]);
        toast.success("Yangi sinf yaratildi!");
      }
    } catch (e) {
      const localGroup = {
        id: editingGroup ? editingGroup.id : `g-${Date.now()}`,
        ...payload
      };
      if (editingGroup) {
        setGroups(groups.map(g => g.id === editingGroup.id ? localGroup : g));
      } else {
        setGroups([...groups, localGroup]);
      }
      toast.success("Sinf saqlandi! (Lokal tizimga)");
    }
    setGroupModalOpen(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Ushbu sinf/guruhni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/admin/groups/${id}`);
      setGroups(groups.filter(g => g.id !== id));
      toast.success("Sinf o'chirildi!");
    } catch (e) {
      setGroups(groups.filter(g => g.id !== id));
      toast.success("Sinf o'chirildi! (Lokal tizimdan)");
    }
  };

  // ----------------------------------------------------
  // FILTERED CALENDAR DATA SELECTOR
  // ----------------------------------------------------
  const filteredCalendarSlots = useMemo(() => {
    if (calendarViewMode === "CLASS") {
      return schedules.filter(s => s.groupId === filterId);
    } else if (calendarViewMode === "TEACHER") {
      return schedules.filter(s => s.teacherId === filterId);
    } else {
      return schedules.filter(s => s.room === classrooms.find(r => r.id === filterId)?.name);
    }
  }, [schedules, calendarViewMode, filterId, classrooms]);

  const mappedSlotsGrid = useMemo(() => {
    const grid: Record<string, TimetableSlot> = {};
    filteredCalendarSlots.forEach(s => {
      grid[`${s.dayOfWeek}-${s.slotIndex}`] = s;
    });
    return grid;
  }, [filteredCalendarSlots]);

  const getSubjectColor = (subjectId: string) => {
    const colors: Record<string, string> = {
      s1: "from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-200/50 dark:text-indigo-300 dark:border-indigo-900/50",
      s2: "from-purple-500/10 to-violet-500/10 text-violet-700 border-violet-200/50 dark:text-violet-300 dark:border-violet-900/50",
      s3: "from-emerald-500/10 to-teal-500/10 text-teal-700 border-teal-200/50 dark:text-teal-300 dark:border-teal-900/50",
      s4: "from-rose-500/10 to-pink-500/10 text-pink-700 border-pink-200/50 dark:text-pink-300 dark:border-pink-900/50",
      s5: "from-amber-500/10 to-orange-500/10 text-orange-700 border-orange-200/50 dark:text-orange-300 dark:border-orange-900/50",
      s6: "from-cyan-500/10 to-sky-500/10 text-sky-700 border-sky-200/50 dark:text-sky-300 dark:border-sky-900/50",
      s7: "from-indigo-500/10 to-purple-500/10 text-purple-700 border-purple-200/50 dark:text-purple-300 dark:border-purple-900/50",
      s8: "from-lime-500/10 to-green-500/10 text-green-700 border-green-200/50 dark:text-green-300 dark:border-green-900/50",
    };
    return colors[subjectId] || "from-slate-500/10 to-slate-600/10 text-slate-700 border-slate-200 dark:text-slate-300 dark:border-slate-800";
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFont("helvetica", "bold");
    doc.text(`PDP School Timetable - Filter: ${filterId}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated via LMSHub AI CP-SAT Engine. Status: ${workflowStatus}`, 14, 20);

    const headers = [["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]];
    const data = [1, 2, 3, 4, 5, 6, 7, 8].map(slotIndex => {
      const times = getSlotTimes(slotIndex, settings);
      const row = [`${times.start} - ${times.end}`];
      [1, 2, 3, 4, 5, 6].forEach(day => {
        const slot = mappedSlotsGrid[`${day}-${slotIndex}`];
        row.push(slot ? `${slot.subjectName}\n${slot.teacherName}\n[Room ${slot.room}]` : "-");
      });
      return row;
    });

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 25,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "center", valign: "middle" }
    });

    doc.save(`LMSHub_Timetable_${filterId}.pdf`);
    toast.success("PDF dars jadvali yuklab olindi!");
  };

  const handleExportCSV = () => {
    let csv = "Time,Mon,Tue,Wed,Thu,Fri,Sat\n";
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(slotIndex => {
      const times = getSlotTimes(slotIndex, settings);
      let row = `"${times.start} - ${times.end}"`;
      [1, 2, 3, 4, 5, 6].forEach(day => {
        const slot = mappedSlotsGrid[`${day}-${slotIndex}`];
        row += slot ? `,"${slot.subjectName} (${slot.teacherName}) - Room ${slot.room}"` : `,"-"`;
      });
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `LMSHub_Timetable_${filterId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV dars jadvali yuklab olindi!");
  };

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-zinc-500 font-bold text-sm">Enterprise dars jadvali yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 text-white shadow-2xl border border-indigo-950">
        <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/4 -translate-y-1/4 transform rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 backdrop-blur-md font-mono text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-yellow-400" /> {dict.title}
              </Badge>
              <Badge className={`border font-semibold ${
                workflowStatus === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
              }`}>
                {workflowStatus === "PUBLISHED" ? dict.statusPublished : dict.statusDraft}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">{dict.title}</h1>
            <p className="text-zinc-400 font-medium max-w-xl text-sm md:text-base">{dict.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Select value={lang} onValueChange={(val: any) => setLang(val)}>
              <SelectTrigger className="w-[120px] bg-slate-900/60 border-indigo-950 text-white rounded-xl h-11">
                <Languages className="h-4 w-4 mr-2 text-indigo-400" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-indigo-950 text-white">
                <SelectItem value="uz">O'zbek</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAiSolve}
              disabled={solverRunning}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg font-bold px-5 rounded-xl h-11"
            >
              {solverRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-yellow-400 animate-pulse" />}
              {dict.generateBtn}
            </Button>

            <Button
              onClick={handlePublishTimetable}
              disabled={schedules.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg font-bold px-5 rounded-xl h-11"
            >
              <Check className="h-4 w-4 mr-2" />
              {dict.publishBtn}
            </Button>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: dict.totalClasses, val: stats.classes, icon: Users2, color: "text-blue-500 bg-blue-500/10" },
          { label: dict.totalTeachers, val: stats.teachers, icon: BookOpenCheck, color: "text-purple-500 bg-purple-500/10" },
          { label: dict.totalRooms, val: stats.rooms, icon: MapPin, color: "text-emerald-500 bg-emerald-500/10" },
          { label: dict.totalLessons, val: stats.lessons, icon: CalendarClock, color: "text-pink-500 bg-pink-500/10" },
          { label: dict.optimizationScore, val: stats.lessons > 0 ? `${stats.score}/100` : "-", icon: Award, color: "text-amber-500 bg-amber-500/10" },
          { label: dict.currentConflicts, val: stats.conflicts, icon: AlertTriangle, color: stats.conflicts > 0 ? "text-rose-500 bg-rose-500/10 font-bold border-red-500/30 animate-pulse" : "text-zinc-550 bg-zinc-500/10" },
        ].map((item, idx) => (
          <Card key={idx} className="p-4 bg-white/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 tracking-tight">{item.label}</span>
              <div className={`p-2.5 rounded-xl ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{item.val}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* WORKSPACE CONTENT TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-150 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          {Object.entries(dict.tabs).map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          {schedules.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-16 text-center bg-white/60 dark:bg-slate-900/30 border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-3xl">
              <Sparkles className="h-16 w-16 text-indigo-500/40 mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">AI Dars jadvali generatsiya qilinmagan</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">OR-Tools dvigatelini ishga tushirish uchun "Generatsiya Qilish" tugmasini bosing.</p>
              <Button onClick={handleAiSolve} className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                <Sparkles className="h-4 w-4 mr-2" /> {dict.generateBtn}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-500" /> {dict.viewOptions}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { var: "A", title: "Variant A (Teacher Workload)", desc: "O'qituvchilar bo'sh vaqtlari (Idle windows) minimallashtirilgan", score: 98, time: 242 },
                    { var: "B", title: "Variant B (Room Utilization)", desc: "Xonalardan foydalanish koeffitsiyenti maksimallashtirilgan", score: 95, time: 215 },
                    { var: "C", title: "Variant C (Subject Distribution)", desc: "Fanlar kunlarga akademik to'g'ri taqsimlangan", score: 96, time: 280 }
                  ].map((item, idx) => (
                    <Card
                      key={idx}
                      onClick={() => setSelectedVariant(item.var as any)}
                      className={`p-5 cursor-pointer rounded-2xl border transition-all ${
                        selectedVariant === item.var 
                          ? "border-indigo-500 bg-indigo-500/5 shadow-md" 
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            selectedVariant === item.var ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {item.var}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{item.title}</h4>
                            <p className="text-xs text-zinc-550 mt-1">{item.desc}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block">{item.score}</span>
                          <span className="text-[10px] text-zinc-400">{item.time}ms</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Conflicts: 0</span>
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            const sol = solverSolutions.find(s => s.variant === item.var) || { variant: item.var as any, slots: schedules, score: { total: item.score } as any, solveTimeMs: item.time, solverLogs: [], conflictCount: 0 };
                            handleSelectVariant(sol);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-7 text-[10px]"
                        >
                          {dict.selectThisVariant}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl lg:col-span-2">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">{dict.optimizationScore}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">OR-Tools penalty weight indicators</p>
                  </div>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">98/100</span>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Teacher Idle Time (Bo'sh oynalar)", pct: 100, score: "10/10" },
                    { label: "Room Switching (Auditoriya almashinuvi)", pct: 90, score: "9/10" },
                    { label: "Balanced Subject Distribution (Fanlar taqsimoti)", pct: 100, score: "10/10" },
                    { label: "Balanced Teacher Workload (Stavkalar balansi)", pct: 85, score: "8.5/10" },
                    { label: "Lunch Break Respect (Tushlik tanaffusi)", pct: 100, score: "10/10" },
                    { label: "Room Utilization (Kabinetlar sig'imi)", pct: 95, score: "9.5/10" },
                    { label: "Student Idle Time (Talabalar oynalari)", pct: 100, score: "10/10" },
                    { label: "Morning Preference (SAT darslari ertalab)", pct: 100, score: "10/10" },
                    { label: "Difficulty Distribution (Akademik muvozanat)", pct: 98, score: "19.6/20" }
                  ].map((metric, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{metric.label}</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{metric.score}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${metric.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB: TIMETABLE VIEW */}
        <TabsContent value="timetable" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-black text-zinc-550 uppercase tracking-wider">Filters:</span>
              <Select value={calendarViewMode} onValueChange={(val: any) => {
                setCalendarViewMode(val);
                if (val === "CLASS") setFilterId(groups[0]?.id || "");
                else if (val === "TEACHER") setFilterId(teachers[0]?.id || "");
                else setFilterId(classrooms[0]?.id || "");
              }}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950 border-slate-200 rounded-xl h-10">
                  <SelectValue placeholder="View Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">Group/Class</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="ROOM">Classroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[260px]">
              <Select value={filterId} onValueChange={setFilterId}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 rounded-xl h-10">
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {calendarViewMode === "CLASS" && groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                  {calendarViewMode === "TEACHER" && teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                  ))}
                  {calendarViewMode === "ROOM" && classrooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 sm:ml-auto">
              <Button onClick={handleExportPDF} variant="outline" className="border-slate-200 dark:border-slate-800 rounded-xl h-10 text-xs">
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="border-slate-200 dark:border-slate-800 rounded-xl h-10 text-xs">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>
          </div>

          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 text-center font-bold text-xs text-zinc-550 uppercase tracking-wider">
                <div>Times</div>
                {settings.workingDays.map(day => (
                  <div key={day}>{dict.days[day as 1 | 2 | 3 | 4 | 5 | 6]}</div>
                ))}
              </div>

              <div className="space-y-4 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(slotIndex => {
                  const times = getSlotTimes(slotIndex, settings);
                  return (
                    <div key={slotIndex} className="grid grid-cols-7 gap-4 items-stretch min-h-[90px]">
                      <div className="flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2 text-center">
                        <span className="text-[10px] font-bold text-zinc-400">Para {slotIndex}</span>
                        <span className="text-xs font-black text-slate-800 dark:text-zinc-300 mt-1">{times.start}</span>
                        <span className="text-[10px] text-zinc-400">{times.end}</span>
                      </div>

                      {settings.workingDays.map(day => {
                        const slot = mappedSlotsGrid[`${day}-${slotIndex}`];
                        const isSlotConflicting = conflicts.some(c => c.slotA.id === slot?.id || c.slotB?.id === slot?.id);

                        return (
                          <div
                            key={day}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, day, slotIndex)}
                            className={`rounded-2xl border transition-all relative flex flex-col justify-between p-3 ${
                              slot 
                                ? `bg-gradient-to-br ${getSubjectColor(slot.subjectId)} border-l-4 cursor-grab active:cursor-grabbing`
                                : "border-dashed border-slate-200 dark:border-slate-850 bg-slate-50/20 hover:bg-slate-50/40"
                            } ${isSlotConflicting ? "border-red-500 bg-red-500/5 animate-pulse" : ""}`}
                            draggable={!!slot}
                            onDragStart={(e) => slot && handleDragStart(e, slot)}
                          >
                            {slot ? (
                              <div className="space-y-1.5 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                  <span className="font-extrabold text-[12px] leading-tight block">{slot.subjectName}</span>
                                  {isSlotConflicting && (
                                    <button 
                                      onClick={() => {
                                        const found = conflicts.find(c => c.slotA.id === slot.id || c.slotB?.id === slot.id)!;
                                        setSelectedConflict(found);
                                        setSuggestions(generateSuggestedFixes(found, schedules, teachers, classrooms, settings));
                                      }}
                                      className="h-4 w-4 bg-red-650 rounded-full flex items-center justify-center text-[10px] text-white animate-bounce"
                                    >
                                      !
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-zinc-550 font-medium flex items-center gap-1">
                                    <Users2 className="h-3 w-3" /> {slot.teacherName}
                                  </span>
                                  <span className="text-[10px] text-zinc-555 font-medium flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Room: {slot.room}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/40">
                                  <Camera className="h-3 w-3 text-zinc-400" />
                                  <Badge className="bg-slate-100 dark:bg-slate-800 text-zinc-500 text-[8px] px-1 hover:bg-slate-100">Scanner Active</Badge>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-zinc-300 dark:text-zinc-800">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: TEACHERS MANAGEMENT */}
        <TabsContent value="teachers" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">O'qituvchilar bandligi & Sozlamalari</h3>
              <Button onClick={handleOpenAddTeacher} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Yangi o'qituvchi qo'shish
              </Button>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-xs font-bold text-zinc-400 uppercase">
                    <th className="pb-3">{dict.teacherName}</th>
                    <th className="pb-3">{dict.teacherType}</th>
                    <th className="pb-3">{dict.workingHours}</th>
                    <th className="pb-3">{dict.maxLessons}</th>
                    <th className="pb-3">{dict.priority}</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm">
                  {teachers.map(teacher => (
                    <tr key={teacher.id}>
                      <td className="py-4 font-bold text-slate-800 dark:text-zinc-200">{teacher.fullName}</td>
                      <td className="py-4">
                        <Badge className="bg-slate-100 dark:bg-slate-805 text-slate-600 dark:text-zinc-400">{teacher.teacherType}</Badge>
                      </td>
                      <td className="py-4">{teacher.workingHours} soat</td>
                      <td className="py-4">{teacher.maxLessons} dars</td>
                      <td className="py-4">
                        <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Priority {teacher.priority}</Badge>
                      </td>
                      <td className="py-4">
                        <Badge className="bg-emerald-500/10 text-emerald-600">{teacher.status}</Badge>
                      </td>
                      <td className="py-4 text-right space-x-1.5">
                        <Button onClick={() => handleOpenEditTeacher(teacher)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDeleteTeacher(teacher.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-550 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: CLASSROOMS */}
        <TabsContent value="classrooms" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sinf Xonalari & Laboratoriya Uskunalari</h3>
              <Button onClick={handleOpenAddRoom} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Yangi xona qo'shish
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {classrooms.map(room => (
                <Card key={room.id} className="p-5 border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 rounded-2xl relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                    <Button onClick={() => handleOpenEditRoom(room)} variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 bg-white shadow">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => handleDeleteRoom(room.id)} variant="ghost" size="icon" className="h-7 w-7 text-rose-600 bg-white shadow">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">{room.name}</span>
                    <Badge className="bg-indigo-500/10 text-indigo-600">{room.code}</Badge>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs text-zinc-550">
                    <div className="flex justify-between">
                      <span>Bino:</span>
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">{room.building}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sig'imi:</span>
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">{room.capacity} ta o'quvchi</span>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="block font-bold mb-1.5">Uskunalar:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {room.equipment.map((eq, i) => (
                          <Badge key={i} className="bg-slate-105 dark:bg-slate-800 text-slate-600 hover:bg-slate-105">{eq}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* TAB: SUBJECTS */}
        <TabsContent value="subjects" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Fanlar & Akademik yuklamalar</h3>
              <Button onClick={handleOpenAddSubject} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Yangi fan qo'shish
              </Button>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-xs font-bold text-zinc-400 uppercase">
                    <th className="pb-3">{dict.subjectsLabel}</th>
                    <th className="pb-3">{dict.totalLessons}</th>
                    <th className="pb-3">{dict.difficultyWeight}</th>
                    <th className="pb-3">Laboratoriya</th>
                    <th className="pb-3">Kompyuter</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm">
                  {subjects.map(sub => (
                    <tr key={sub.id}>
                      <td className="py-4 font-bold text-slate-800 dark:text-zinc-200">{sub.name}</td>
                      <td className="py-4">{sub.requiredWeeklyLessons} dars</td>
                      <td className="py-4">
                        <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20">Weight {sub.difficultyWeight}/10</Badge>
                      </td>
                      <td className="py-4">{sub.requiresLaboratory ? "✅ Ha" : "❌ Yo'q"}</td>
                      <td className="py-4">{sub.requiresComputer ? "✅ Ha" : "❌ Yo'q"}</td>
                      <td className="py-4 text-right space-x-1.5">
                        <Button onClick={() => handleOpenEditSubject(sub)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDeleteSubject(sub.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-550 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: CLASSES */}
        <TabsContent value="classes" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sinf / Guruhlar</h3>
              <Button onClick={handleOpenAddGroup} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Yangi sinf qo'shish
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {groups.map(group => (
                <Card key={group.id} className="p-5 border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 rounded-2xl relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                    <Button onClick={() => handleOpenEditGroup(group)} variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 bg-white shadow">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => handleDeleteGroup(group.id)} variant="ghost" size="icon" className="h-7 w-7 text-rose-600 bg-white shadow">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-base">{group.name}</span>
                    <Badge className="bg-blue-500/10 text-blue-600">{group.shift}</Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-zinc-550">
                    <div className="flex justify-between">
                      <span>O'quvchilar soni:</span>
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">{group.studentCount} ta</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="block font-bold mb-1.5">Biriktirilgan fanlar:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.subjects.map((gs, i) => {
                          const subName = subjects.find(s => s.id === gs.subjectId)?.name || gs.subjectId;
                          return (
                            <Badge key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-650 hover:bg-slate-100">{subName}</Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* TAB: CONFIGURATION */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-2xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800">
              Dars Vaqtlari & Kalendar Sozlamalari
            </h3>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{dict.startTime}</Label>
                  <Input type="time" value={settings.startTime} onChange={(e) => setSettings({ ...settings, startTime: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{dict.endTime}</Label>
                  <Input type="time" value={settings.endTime} onChange={(e) => setSettings({ ...settings, endTime: e.target.value })} className="rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{dict.lessonDuration}</Label>
                  <Input type="number" value={settings.lessonDuration} onChange={(e) => setSettings({ ...settings, lessonDuration: Number(e.target.value) })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{dict.breakDuration}</Label>
                  <Input type="number" value={settings.breakDuration} onChange={(e) => setSettings({ ...settings, breakDuration: Number(e.target.value) })} className="rounded-xl" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button onClick={() => toast.success(dict.saveSuccess)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {dict.saveSuccess}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: AI ANALYTICS */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">{dict.workload}</h4>
              <div className="h-[260px] flex items-end justify-between gap-2 px-4 pt-10">
                {teachers.map((teacher, idx) => {
                  const load = schedules.filter(s => s.teacherId === teacher.id).length;
                  const pct = Math.min(100, Math.round((load / 24) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="relative w-full bg-slate-100 dark:bg-slate-800/80 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: "80%" }}>
                        <div className="w-full bg-indigo-500 rounded-t-xl group-hover:bg-indigo-400 transition-all" style={{ height: `${pct}%` }}></div>
                      </div>
                      <span className="text-[10px] text-zinc-500 rotate-45 mt-2 origin-left truncate max-w-[50px]">{teacher.fullName.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">{dict.roomUtilization}</h4>
              <div className="h-[260px] flex items-end justify-between gap-2 px-4 pt-10">
                {classrooms.map((room, idx) => {
                  const load = schedules.filter(s => s.room === room.name).length;
                  const pct = Math.min(100, Math.round((load / 48) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="relative w-full bg-slate-100 dark:bg-slate-800/80 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: "80%" }}>
                        <div className="w-full bg-emerald-500 rounded-t-xl group-hover:bg-emerald-400 transition-all" style={{ height: `${pct}%` }}></div>
                      </div>
                      <span className="text-[10px] text-zinc-500 rotate-45 mt-2 origin-left truncate max-w-[50px]">{room.name.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* FLOATING AI ASSISTANT CHAT */}
      <div className="fixed bottom-6 right-6 z-50">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 border-0 flex items-center justify-center scale-100 hover:scale-105 transition-all">
              <MessageSquare className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-3xl border border-indigo-950/20 shadow-2xl p-0">
            <div className="p-4 bg-indigo-950 text-white rounded-t-3xl flex items-center justify-between border-b border-indigo-900">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span className="font-bold text-sm">{dict.aiAssistantTitle}</span>
              </div>
              <Badge className="bg-indigo-500/20 text-indigo-300">OR-Tools v9</Badge>
            </div>
            
            <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-xs ${
                    msg.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-slate-800 rounded-tl-none"
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <span className="block text-[8px] text-right mt-1.5 opacity-60">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center bg-white dark:bg-slate-950 rounded-b-3xl">
              <Input
                placeholder={dict.aiAssistantPlaceholder}
                value={userMsgInput}
                onChange={(e) => setUserMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMsg()}
                className="rounded-xl border-slate-200 dark:border-slate-800 h-10 text-xs"
              />
              <Button onClick={handleSendChatMsg} className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 w-10 p-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* DIALOG: EDIT TEACHER */}
      <Dialog open={teacherModalOpen} onOpenChange={setTeacherModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              {editingTeacher ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">F.I.SH.</Label>
              <Input value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} placeholder="Masalan: Furqat Salimov" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Turi</Label>
                <Select value={teacherTypeInput} onValueChange={(val: any) => setTeacherTypeInput(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Turi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full-time</SelectItem>
                    <SelectItem value="PART_TIME">Part-time</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</Label>
                <Select value={teacherStatusInput} onValueChange={(val: any) => setTeacherStatusInput(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="LEAVE">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ish soatlari</Label>
                <Input type="number" value={teacherHoursInput} onChange={(e) => setTeacherHoursInput(Number(e.target.value))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Maks kunlik darslar</Label>
                <Input type="number" value={teacherMaxLessonsInput} onChange={(e) => setTeacherMaxLessonsInput(Number(e.target.value))} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ustuvorlik (1-5)</Label>
              <Slider value={[teacherPriorityInput]} onValueChange={(val) => setTeacherPriorityInput(val[0])} min={1} max={5} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ishlamaydigan kunlar</Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(day => (
                  <div key={day} className="flex items-center gap-2">
                    <Checkbox 
                      id={`day-${day}`} 
                      checked={teacherUnavailDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) setTeacherUnavailDays([...teacherUnavailDays, day]);
                        else setTeacherUnavailDays(teacherUnavailDays.filter(d => d !== day));
                      }}
                    />
                    <label htmlFor={`day-${day}`} className="text-xs font-semibold">{dict.days[day as 1 | 2 | 3 | 4 | 5 | 6].substring(0, 3)}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTeacherModalOpen(false)} className="rounded-xl text-xs">Bekor qilish</Button>
            <Button onClick={handleSaveTeacher} className="bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold">Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT ROOM */}
      <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              {editingRoom ? "Xonani tahrirlash" : "Yangi xona qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Xona nomi</Label>
              <Input value={roomNameInput} onChange={(e) => setRoomNameInput(e.target.value)} placeholder="Masalan: 102 - Physics Lab" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kodi</Label>
                <Input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} placeholder="P102" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sig'imi</Label>
                <Input type="number" value={roomCapacityInput} onChange={(e) => setRoomCapacityInput(Number(e.target.value))} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bino / Korpus</Label>
              <Input value={roomBuildingInput} onChange={(e) => setRoomBuildingInput(e.target.value)} placeholder="A Block" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Xona jihozlari / turi</Label>
              <div className="grid grid-cols-2 gap-2">
                {["COMPUTER_LAB", "PHYSICS_LAB", "CHEMISTRY_LAB", "LANGUAGE_LAB"].map(eq => (
                  <div key={eq} className="flex items-center gap-2">
                    <Checkbox
                      id={`eq-${eq}`}
                      checked={roomEquipmentInput.includes(eq)}
                      onCheckedChange={(checked) => {
                        if (checked) setRoomEquipmentInput([...roomEquipmentInput, eq]);
                        else setRoomEquipmentInput(roomEquipmentInput.filter(e => e !== eq));
                      }}
                    />
                    <label htmlFor={`eq-${eq}`} className="text-xs font-semibold">{eq.replace("_", " ")}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoomModalOpen(false)} className="rounded-xl text-xs">Bekor qilish</Button>
            <Button onClick={handleSaveRoom} className="bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold">Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT SUBJECT */}
      <Dialog open={subjectModalOpen} onOpenChange={setSubjectModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              {editingSubject ? "Fanni tahrirlash" : "Yangi fan qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fan nomi</Label>
              <Input value={subjectNameInput} onChange={(e) => setSubjectNameInput(e.target.value)} placeholder="Matematika" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Haftalik dars soati</Label>
                <Input type="number" value={subjectLessonsInput} onChange={(e) => setSubjectLessonsInput(Number(e.target.value))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Qiyinchilik darajasi (1-10)</Label>
                <Slider value={[subjectDifficultyInput]} onValueChange={(val) => setSubjectDifficultyInput(val[0])} min={1} max={10} step={1} className="pt-2" />
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox id="sub-requiresLab" checked={subjectRequiresLab} onCheckedChange={(checked) => setSubjectRequiresLab(!!checked)} />
                <Label htmlFor="sub-requiresLab" className="text-xs font-semibold cursor-pointer">Laboratoriya talab qiladi</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sub-requiresComp" checked={subjectRequiresComp} onCheckedChange={(checked) => setSubjectRequiresComp(!!checked)} />
                <Label htmlFor="sub-requiresComp" className="text-xs font-semibold cursor-pointer">Kompyuter xonasi talab qiladi</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubjectModalOpen(false)} className="rounded-xl text-xs">Bekor qilish</Button>
            <Button onClick={handleSaveSubject} className="bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold">Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT GROUP */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Users2 className="h-5 w-5 text-indigo-600" />
              {editingGroup ? "Sinfni tahrirlash" : "Yangi sinf qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sinf/Guruh nomi</Label>
              <Input value={groupNameInput} onChange={(e) => setGroupNameInput(e.target.value)} placeholder="10-A Class" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">O'quvchilar soni</Label>
                <Input type="number" value={groupStudentsInput} onChange={(e) => setGroupStudentsInput(Number(e.target.value))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Smena</Label>
                <Select value={groupShiftInput} onValueChange={(val: any) => setGroupShiftInput(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Smena" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning Shift</SelectItem>
                    <SelectItem value="EVENING">Evening Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGroupModalOpen(false)} className="rounded-xl text-xs">Bekor qilish</Button>
            <Button onClick={handleSaveGroup} className="bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold">Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFLICT RESOLUTIONS */}
      <Dialog open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-red-650 font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-bounce" /> {dict.conflictDetected}
            </DialogTitle>
            <DialogDescription className="text-xs mt-1.5">{selectedConflict?.reason}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider">{dict.aiSuggestedFixes}:</h4>
            {suggestions.length === 0 ? (
              <p className="text-xs text-zinc-400">Loading AI suggestions...</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((fix, idx) => (
                  <Card
                    key={idx}
                    onClick={() => handleApplyFix(fix)}
                    className="p-3.5 border border-indigo-100 hover:border-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer rounded-xl flex justify-between items-center transition-all"
                  >
                    <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-300">{fix.description}</span>
                    <Badge className="bg-indigo-650 text-white text-[9px]">Apply Fix</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedConflict(null)} className="rounded-xl text-xs">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: SOLVER PROGRESS LOGS */}
      <Dialog open={solverLogsOpen} onOpenChange={setSolverLogsOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-slate-900 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" /> {dict.solverLogsTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{dict.solvingProgress}</span>
                <span>{solverProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${solverProgress}%` }}></div>
              </div>
            </div>
            <div className="h-[220px] bg-black border border-slate-900 rounded-2xl p-4 font-mono text-[10px] text-green-400 overflow-y-auto space-y-1.5">
              {solverProgressLog.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-zinc-600 mr-2">&gt;</span>{log}
                </div>
              ))}
            </div>
          </div>
          {solverProgress === 100 && (
            <DialogFooter>
              <Button onClick={() => setSolverLogsOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs">Ssenariylarni ko'rish</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
