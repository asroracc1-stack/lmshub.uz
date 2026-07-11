import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Camera, Shield, AlertTriangle, Cpu, RefreshCw, Plus, 
  Settings, CheckCircle, Wifi, WifiOff, Activity, Sliders, Users,
  Play, Square, Download, FileSpreadsheet, Eye, Maximize2,
  Server, HardDrive, ShieldAlert, Check, X, ShieldX,
  Globe, Calendar, Clock, MessageSquare, Bell, ArrowUpRight, TrendingUp, BarChart3,
  QrCode, UserCheck, History, BarChart2, Maximize, AlertOctagon, UserX, User, ArrowRight, Monitor, Search
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/axios"; 
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "ADMINISTRATOR" | "TEACHER" | "PARENT" | "STUDENT";
type ApiState = "SUCCESS" | "LOADING" | "EMPTY" | "ERROR" | "OFFLINE" | "FORBIDDEN";

interface CameraDevice {
  id: string; 
  name: string; 
  ipAddress: string; 
  status: "ONLINE" | "OFFLINE" | "WARNING";
  protocol: "RTSP" | "ONVIF" | "WEBRTC";
  room: string;
  studentsCount: number;
  lastDetectionTime: string;
  manufacturer?: string;
  resolution?: string;
  fps?: number;
  latency?: number;
}

interface UnknownDetection {
  id: string; 
  detectedAt: string; 
  cameraName: string;
  room: string;
  confidence: number;
  reason?: string;
}

interface AttendanceRecord {
  id: string;
  studentName: string;
  studentId: string;
  faculty: string;
  groupName: string;
  room: string;
  arrivalTime: string;
  status: "PRESENT" | "LATE" | "ABSENT";
  presenceRate: number;
  checkins?: string[];
  checkouts?: string[];
}

interface SecurityLog {
  id: string;
  timestamp: string;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
}

interface TimetableSession {
  id: string;
  time: string;
  groupName: string;
  roomName: string;
  subject: string;
  status: "ACTIVE" | "UPCOMING" | "COMPLETED";
  pairedCamera: string;
  enrolledStudents: number;
  presentCount: number;
}

export default function AIAttendanceDashboard() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // System Role Simulator
  const [currentRole, setCurrentRole] = useState<UserRole>("SUPER_ADMIN");
  const [apiState, setApiState] = useState<ApiState>("SUCCESS");
  const [showDevControls, setShowDevControls] = useState(true);

  // Active Tab for Admin roles
  const [activeTab, setActiveTab] = useState<"overview" | "cameras" | "history" | "security" | "registry" | "analytics" | "settings">("overview");

  // Core Data Lists
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownDetection[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Timetable active sessions
  const [timetable, setTimetable] = useState<TimetableSession[]>([
    { id: "ts-1", time: "09:00 AM - 10:30 AM", groupName: "SAT Group A", roomName: "Room 101", subject: "SAT Mathematics", status: "ACTIVE", pairedCamera: "Room 101 Camera", enrolledStudents: 15, presentCount: 14 },
    { id: "ts-2", time: "11:00 AM - 12:30 PM", groupName: "IELTS Intensive", roomName: "Room 102", subject: "English Writing", status: "UPCOMING", pairedCamera: "Lecture Hall A Main", enrolledStudents: 22, presentCount: 0 },
    { id: "ts-3", time: "02:00 PM - 03:30 PM", groupName: "CS-204 coding", roomName: "Lab 305", subject: "Java Backend Microservices", status: "UPCOMING", pairedCamera: "IT Lab West Ceiling", enrolledStudents: 30, presentCount: 0 }
  ]);

  // Selected class session for Teacher manual override view
  const [selectedSessionId, setSelectedSessionId] = useState<string>("ts-1");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "LATE" | "ABSENT">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // AI Configuration Engine state
  const [recognitionThreshold, setRecognitionThreshold] = useState(0.82);
  const [snapshotInterval, setSnapshotInterval] = useState(15);
  const [lateMinutesLimit, setLateMinutesLimit] = useState(10);
  const [minAttendancePercent, setMinAttendancePercent] = useState(75);

  // Grid Controls for live camera stream (1x1, 2x2, 3x3, 4x4, 5x5)
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3 | 4 | 5>(2);

  // Mobile pairing stream simulation
  const [isPhonePaired, setIsPhonePaired] = useState(false);
  const [phoneStreamToken, setPhoneStreamToken] = useState("");
  const [pairingExpiry, setPairingExpiry] = useState("");
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);
  const [isSimulatingPhoneFeed, setIsSimulatingPhoneFeed] = useState(false);

  // Face Registration Simulator states
  const [registrySearch, setRegistrySearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollStep, setEnrollStep] = useState<"IDLE" | "CHALLENGE_FRONT" | "CHALLENGE_LEFT" | "CHALLENGE_RIGHT" | "CHALLENGE_UP" | "CHALLENGE_DOWN" | "CHALLENGE_SMILE" | "LIVENESS_BLINK" | "COMPILING" | "SUCCESS">("IDLE");
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [verificationFeedback, setVerificationFeedback] = useState("");

  // Enroll webcam stream hooks
  const videoRefEnroll = useRef<HTMLVideoElement>(null);
  const [enrollStream, setEnrollStream] = useState<MediaStream | null>(null);
  const [enrollHasPermission, setEnrollHasPermission] = useState<boolean | null>(null);

  const requestEnrollCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320 },
        audio: false
      });
      setEnrollStream(stream);
      setEnrollHasPermission(true);
    } catch (e) {
      console.warn("Enroll camera access failed, using fallback graphic", e);
      setEnrollHasPermission(false);
    }
  };

  useEffect(() => {
    if (isEnrolling) {
      requestEnrollCamera();
    } else {
      if (enrollStream) {
        enrollStream.getTracks().forEach(track => track.stop());
        setEnrollStream(null);
      }
    }
    return () => {
      if (enrollStream) {
        enrollStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isEnrolling]);

  useEffect(() => {
    if (videoRefEnroll.current && enrollStream) {
      videoRefEnroll.current.srcObject = enrollStream;
    }
  }, [enrollStream, enrollHasPermission, isEnrolling]);

  const landmarkOffset = useMemo(() => {
    switch (enrollStep) {
      case "CHALLENGE_LEFT": return { x: -20, y: 0 };
      case "CHALLENGE_RIGHT": return { x: 20, y: 0 };
      case "CHALLENGE_UP": return { x: 0, y: -20 };
      case "CHALLENGE_DOWN": return { x: 0, y: 20 };
      default: return { x: 0, y: 0 };
    }
  }, [enrollStep]);

  // Emergency security alert
  const [isEmergencyAlarmActive, setIsEmergencyAlarmActive] = useState(false);
  const [alarmReason, setAlarmReason] = useState("");

  // Loading indicator states
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [isAttendanceRunning, setIsAttendanceRunning] = useState(true);

  // Localized translation helper
  const currentLang = i18n.language || "uz";
  const translations: Record<string, Record<string, string>> = {
    uz: {
      title: "Enterprise AI Davomat va Xavfsizlik",
      subtitle: "IP kameralar va yuzni aniqlash orqali real vaqt monitoringi",
      livePipeline: "AI Kameralar Faol",
      roleSim: "Rol va API Sinov Modeli",
      assumeRole: "Rollararo O'tish",
      startTracking: "Davomatni Boshlash",
      stopTracking: "Davomatni To'xtatish",
      addCamera: "Kamera Qo'shish",
      export: "Eksport",
      searchPlaceholder: "O'quvchi yoki guruh nomi bo'yicha qidiruv...",
      tabOverview: "Umumiy Ko'rinish",
      tabCameras: "Jonli Kameralar",
      tabHistory: "Davomat Jurnallari",
      tabSecurity: "Xavfsizlik Ogohlantirishlari",
      tabRegistry: "Face ID Ro'yxat",
      tabAnalytics: "Tahlillar",
      tabSettings: "Sozlamalar",
      attendanceRate: "Bugungi Davomat",
      presentStudents: "Kelgan O'quvchilar",
      activeStreams: "Faol Kameralar",
      securityAlerts: "Xavfsizlik Xatarlari",
      realtimeFeed: "Neyron Tarmoq Kirish Jurnali",
      peakHours: "Kirish Vaqtlari Tahlili",
      gridSelect: "Kamera Setkasi",
      cameraSetup: "Kameralar arxitekturasi",
      pairingTitle: "Mobil Kamerani Ulash",
      enrollTitle: "Face ID ro'yxatdan o'tkazish",
      alarmTriggered: "Xavfsizlik Ogohlantirishi Faollashdi",
      unrecognizedAlert: "Notanish shaxs aniqlandi",
      antiSpoofing: "Anti-Spoofing Himoyasi",
      cosSimilarity: "Kosnus O'xshashlik",
      enrollAngles: "5 xil burchakda yuzni skanerlash",
      encryptionMsg: "Shifrlangan embedding saqlandi, rasm o'chirildi.",
      late: "Kech qolgan",
      present: "Kelgan",
      absent: "Kelmagan",
      totalTotal: "Jami",
      cancel: "Bekor qilish",
      save: "Sozlamalarni Saqlash",
      activeLessons: "Faol Darslar & Kamera Integratsiyasi",
      childTimeline: "Farzandingiz Harakati Loglari",
      calendarTitle: "Mening Davomatim (So'nggi 30 Kun)",
      livenessVerify: "Liveness Check",
      unrecognizedTitle: "Notanish shaxs tahlili",
      approve: "Tasdiqlash",
      ignore: "E'tiborsiz qoldirish",
      blacklist: "Qora ro'yxat",
      dispatch: "Xavfsizlikni yuborish"
    },
    en: {
      title: "Enterprise AI Attendance & Security",
      subtitle: "Real-time classroom monitoring & neural face verification",
      livePipeline: "AI Pipeline Active",
      roleSim: "Role & API Simulator Deck",
      assumeRole: "Assume Role",
      startTracking: "Start Attendance",
      stopTracking: "Stop Attendance",
      addCamera: "Add Camera",
      export: "Export Logs",
      searchPlaceholder: "Search student, group, faculty...",
      tabOverview: "Overview",
      tabCameras: "Live Cameras",
      tabHistory: "Attendance Logs",
      tabSecurity: "Security Alerts",
      tabRegistry: "Face Registry",
      tabAnalytics: "Analytics",
      tabSettings: "Settings",
      attendanceRate: "Today's Attendance",
      presentStudents: "Present Students",
      activeStreams: "Active Streams",
      securityAlerts: "Security Alerts",
      realtimeFeed: "Neural Network Live Feed",
      peakHours: "Peak Entry Hours",
      gridSelect: "Camera Grid",
      cameraSetup: "Camera Architecture",
      pairingTitle: "Mobile Camera Pairing",
      enrollTitle: "Face ID Enrollment",
      alarmTriggered: "Security Alarm Active",
      unrecognizedAlert: "Unrecognized face alert",
      antiSpoofing: "Anti-Spoofing Protection",
      cosSimilarity: "Cosine Similarity",
      enrollAngles: "Scan face in 5 angles",
      encryptionMsg: "Encrypted embedding vector saved. Original photo discarded.",
      late: "Late",
      present: "Present",
      absent: "Absent",
      totalTotal: "Total",
      cancel: "Cancel",
      save: "Save Configurations",
      activeLessons: "Active Lessons & Camera Integration",
      childTimeline: "Child Presence Timeline",
      calendarTitle: "My Attendance (Last 30 Days)",
      livenessVerify: "Liveness Check",
      unrecognizedTitle: "Unrecognized Person Analysis",
      approve: "Approve Profile",
      ignore: "Ignore Alert",
      blacklist: "Blacklist Subject",
      dispatch: "Dispatch Security"
    },
    ru: {
      title: "Enterprise AI Посещаемость & Безопасность",
      subtitle: "Мониторинг классов и распознавание лиц в реальном времени",
      livePipeline: "AI Видеопоток Активен",
      roleSim: "Симулятор Ролей и API",
      assumeRole: "Переключить Роль",
      startTracking: "Запустить Контроль",
      stopTracking: "Остановить Контроль",
      addCamera: "Добавить Камеру",
      export: "Экспорт",
      searchPlaceholder: "Поиск ученика, группы...",
      tabOverview: "Обзор",
      tabCameras: "Живые Камеры",
      tabHistory: "Журнал Посещаемости",
      tabSecurity: "Сигналы Тревоги",
      tabRegistry: "База Face ID",
      tabAnalytics: "Аналитика",
      tabSettings: "Настройки",
      attendanceRate: "Посещаемость",
      presentStudents: "Присутствующие",
      activeStreams: "Активные Камеры",
      securityAlerts: "Угрозы Безопасности",
      realtimeFeed: "Живой Журнал Нейросети",
      peakHours: "Пиковые Часы Входа",
      gridSelect: "Сетка Камер",
      cameraSetup: "Настройки потоков",
      pairingTitle: "Подключение Телефона",
      enrollTitle: "Регистрация Face ID",
      alarmTriggered: "Сигнал Тревоги Активен",
      unrecognizedAlert: "Неизвестное лицо",
      antiSpoofing: "Защита Anti-Spoofing",
      cosSimilarity: "Косинусное Сходство",
      enrollAngles: "Сканирование лица в 5 ракурсах",
      encryptionMsg: "Вектор зашифрован с AES-256. Исходный снимок удален.",
      late: "Опоздал",
      present: "Явился",
      absent: "Отсутствует",
      totalTotal: "Всего",
      cancel: "Отмена",
      save: "Сохранить",
      activeLessons: "Активные Уроки и Интеграция Камер",
      childTimeline: "История посещаемости ребенка",
      calendarTitle: "Моя Посещаемость (Последние 30 Дней)",
      livenessVerify: "Liveness Check",
      unrecognizedTitle: "Анализ неизвестного лица",
      approve: "Подтвердить",
      ignore: "Игнорировать",
      blacklist: "Черный список",
      dispatch: "Вызвать охрану"
    }
  };

  const tl = (key: string) => translations[currentLang]?.[key] || translations["en"]?.[key] || key;

  // Load backend and fallback data
  const loadData = async () => {
    setApiState("LOADING");
    try {
      const cameraPromise = api.get("/cameras").catch(() => null);
      const unknownsPromise = api.get("/attendance/unknowns").catch(() => null);
      const logsPromise = api.get("/attendance/logs").catch(() => null);
      const securityPromise = api.get("/attendance/security-logs").catch(() => null);

      const [camRes, unkRes, logsRes, secRes] = await Promise.all([
        cameraPromise, unknownsPromise, logsPromise, securityPromise
      ]);

      if (camRes && camRes.data && Array.isArray(camRes.data)) {
        setCameras(camRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          ipAddress: c.ip_address ?? c.ipAddress ?? "192.168.1.1",
          status: c.status ?? "ONLINE",
          protocol: c.protocol ?? "RTSP",
          room: c.classroom ? (c.classroom.name ?? "Room") : "Unassigned Room",
          studentsCount: (c.last_bitrate_kbps ?? c.lastBitrateKbps) ? Math.floor((c.last_bitrate_kbps ?? c.lastBitrateKbps) / 30) : 0,
          lastDetectionTime: (c.last_seen_at ?? c.lastSeenAt) ? (c.last_seen_at ?? c.lastSeenAt).substring(11, 19) : "N/A",
          resolution: c.resolution ?? "1920x1080",
          fps: c.fps ?? 30,
          latency: c.latency ?? 45
        })));
      } else {
        setCameras(getMockCameras());
      }

      if (unkRes && unkRes.data && Array.isArray(unkRes.data)) {
        setUnknowns(unkRes.data.map((u: any) => ({
          id: u.id,
          detectedAt: u.detected_at ?? u.detectedAt ?? "",
          cameraName: u.camera_name ?? u.cameraName ?? "",
          room: u.room ?? "",
          confidence: u.confidence ?? 0,
          reason: u.reason ?? ""
        })));
      } else {
        setUnknowns(getMockUnknowns());
      }

      if (logsRes && logsRes.data && Array.isArray(logsRes.data)) {
        setAttendance(logsRes.data.map((l: any) => ({
          id: l.id,
          studentName: l.student_name ?? l.studentName ?? "",
          studentId: l.student_id ?? l.studentId ?? "",
          faculty: l.faculty ?? "",
          groupName: l.group_name ?? l.groupName ?? "",
          room: l.room ?? "",
          arrivalTime: l.arrival_time ?? l.arrivalTime ?? "",
          status: l.status ?? "ABSENT",
          presenceRate: l.presence_rate ?? l.presenceRate ?? 0,
          checkins: l.checkins ?? [],
          checkouts: l.checkouts ?? []
        })));
      } else {
        setAttendance(getMockAttendance());
      }

      if (secRes && secRes.data && Array.isArray(secRes.data)) {
        setSecurityLogs(secRes.data.map((s: any) => ({
          id: s.id,
          timestamp: s.timestamp ?? "",
          type: s.type ?? "",
          severity: s.severity ?? "INFO",
          message: s.message ?? ""
        })));
      } else {
        setSecurityLogs(getMockSecurityLogs());
      }

      setApiState("SUCCESS");
    } catch (e) {
      console.error("Error fetching AI Attendance data, using mocks", e);
      setCameras(getMockCameras());
      setUnknowns(getMockUnknowns());
      setAttendance(getMockAttendance());
      setSecurityLogs(getMockSecurityLogs());
      setApiState("SUCCESS");
    }
  };

  useEffect(() => {
    loadData();
  }, [currentRole]);

  // Rolling logs and simulations
  const [realtimeLogs, setRealtimeLogs] = useState<Array<{
    id: string; time: string; name: string; room: string; status: "PRESENT" | "LATE"; conf: number; avatar: string;
  }>>([
    { id: "rl-1", time: "15:21:02 PM", name: "Jasur Akhmedov", room: "Room 101", status: "PRESENT", conf: 98.4, avatar: "J" },
    { id: "rl-2", time: "15:20:55 PM", name: "Madina Tursunova", room: "Room 101", status: "PRESENT", conf: 99.1, avatar: "M" },
    { id: "rl-3", time: "15:19:18 PM", name: "Sardor Oripov", room: "Room 102", status: "LATE", conf: 88.2, avatar: "S" }
  ]);

  const getMockCameras = (): CameraDevice[] => [
    { id: "cam-1", name: "Main Entrance PTZ", ipAddress: "192.168.10.51", status: "ONLINE", protocol: "ONVIF", room: "Foyer Hall", studentsCount: 14, lastDetectionTime: "15:32:02 PM", manufacturer: "Hikvision", resolution: "1920x1080", fps: 30, latency: 45 },
    { id: "cam-2", name: "Room 101 Frontal", ipAddress: "192.168.10.52", status: "ONLINE", protocol: "RTSP", room: "Room 101", studentsCount: 38, lastDetectionTime: "15:30:55 PM", manufacturer: "Dahua", resolution: "1920x1080", fps: 28, latency: 40 },
    { id: "cam-3", name: "Room 102 Left Wall", ipAddress: "192.168.10.53", status: "ONLINE", protocol: "RTSP", room: "Room 102", studentsCount: 22, lastDetectionTime: "15:29:18 PM", manufacturer: "Uniview", resolution: "1280x720", fps: 25, latency: 50 },
    { id: "cam-4", name: "Library Hallway Angle", ipAddress: "192.168.10.54", status: "WARNING", protocol: "ONVIF", room: "Library 2F", studentsCount: 4, lastDetectionTime: "15:25:10 PM", manufacturer: "Uniview", resolution: "1920x1080", fps: 15, latency: 98 },
    { id: "cam-5", name: "IT Corridor Dome", ipAddress: "192.168.10.55", status: "OFFLINE", protocol: "RTSP", room: "Lab 305", studentsCount: 0, lastDetectionTime: "—", manufacturer: "Hikvision", resolution: "N/A", fps: 0, latency: 0 }
  ];

  const getMockUnknowns = (): UnknownDetection[] => [
    { id: "unk-101", detectedAt: "15:24:05 PM", cameraName: "Room 101 Frontal", room: "Room 101", confidence: 54, reason: "Blink test failure (Static picture attack suspected)" },
    { id: "unk-102", detectedAt: "15:15:30 PM", cameraName: "Library Hallway Angle", room: "Library 2F", confidence: 42, reason: "Cosine similarity mismatch < 0.65 threshold" },
    { id: "unk-103", detectedAt: "14:58:12 PM", cameraName: "Main Entrance PTZ", room: "Foyer Hall", confidence: 38, reason: "Anti-Spoofing: Replay video attack detected" }
  ];

  const getMockSecurityLogs = (): SecurityLog[] => [
    { id: "log-901", timestamp: "2026-07-11T15:31:00", type: "SPOOF_ATTEMPT", severity: "CRITICAL", message: "Photo replay attack detected at Main Entrance PTZ. Liveness check failed (static eyes)." },
    { id: "log-902", timestamp: "2026-07-11T15:28:12", type: "CAMERA_DISCONNECTED", severity: "WARNING", message: "Camera 'IT Corridor Dome' disconnected. Ping failed, latency timeout > 10000ms." },
    { id: "log-903", timestamp: "2026-07-11T15:25:40", type: "DEEPFAKE_FLAG", severity: "CRITICAL", message: "DeepFake pattern detected on face scan in Room 101." }
  ];

  const getMockAttendance = (): AttendanceRecord[] => [
    { id: "att-1", studentName: "Jasur Akhmedov", studentId: "LMS-10829", faculty: "Computer Science", groupName: "CS-204", room: "Room 101", arrivalTime: "08:58 AM", status: "PRESENT", presenceRate: 98, checkins: ["08:58 AM", "10:15 AM"], checkouts: ["10:00 AM", "12:00 PM"] },
    { id: "att-2", studentName: "Madina Tursunova", studentId: "LMS-10842", faculty: "Computer Science", groupName: "CS-204", room: "Room 101", arrivalTime: "09:08 AM", status: "LATE", presenceRate: 92, checkins: ["09:08 AM"], checkouts: ["12:00 PM"] },
    { id: "att-3", studentName: "Sardor Oripov", studentId: "LMS-10421", faculty: "Computer Science", groupName: "CS-202", room: "Room 102", arrivalTime: "09:32 AM", status: "ABSENT", presenceRate: 35, checkins: ["09:32 AM"], checkouts: ["09:40 AM"] },
    { id: "att-4", studentName: "Kamola Bekmirzayeva", studentId: "LMS-10332", faculty: "Languages", groupName: "ENG-101", room: "Library 2F", arrivalTime: "08:55 AM", status: "PRESENT", presenceRate: 96, checkins: ["08:55 AM"], checkouts: ["11:00 AM"] },
    { id: "att-5", studentName: "Rayhon Qodirova", studentId: "LMS-10291", faculty: "Computer Science", groupName: "CS-202", room: "Room 102", arrivalTime: "—", status: "ABSENT", presenceRate: 0, checkins: [], checkouts: [] }
  ];

  // Helper for role access limits
  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(currentRole);
  };

  const handleStartAttendance = () => {
    setIsActionLoading("start_att");
    setTimeout(() => {
      setIsAttendanceRunning(true);
      setIsActionLoading(null);
      toast.success("Attendance tracking session initialized successfully");
    }, 800);
  };

  const handleStopAttendance = () => {
    setIsActionLoading("stop_att");
    setTimeout(() => {
      setIsAttendanceRunning(false);
      setIsActionLoading(null);
      toast.success("Attendance session successfully archived");
    }, 800);
  };

  // CSV Log Export
  const handleExportReport = () => {
    setIsActionLoading("export");
    setTimeout(() => {
      setIsActionLoading(null);
      const csvContent = "data:text/csv;charset=utf-8," 
        + ["Student Name,Student ID,Group,Room,Arrival Time,Status,Confidence"].join(",") + "\n"
        + attendance.map(r => `"${r.studentName}","${r.studentId}","${r.groupName}","${r.room}","${r.arrivalTime}","${r.status}",${r.presenceRate}%`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `lmshub_attendance_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Attendance report downloaded successfully");
    }, 1000);
  };

  // Security Dispatch Action
  const handleDispatchSecurity = (unId: string) => {
    setAlarmReason(`Low cosine match or liveness check bypass attempt detected on Event ID ${unId}.`);
    setIsEmergencyAlarmActive(true);
    toast.warning("CAMPUS SECURITY TEAM DISPATCHED IMMEDIATELY!");
  };

  // Mobile pairing generation
  const handleGenerateMobilePairing = async () => {
    setIsGeneratingPairing(true);
    try {
      const res = await api.post("/attendance/mobile-pairing").catch(() => null);
      if (res && res.data) {
        setPhoneStreamToken(res.data.qr_token ?? res.data.qrToken ?? "");
        setPairingExpiry(res.data.expires_at ?? res.data.expiresAt ?? "");
      } else {
        setPhoneStreamToken("lmshub-paired-stream-token-" + Math.floor(Math.random() * 1000000));
        setPairingExpiry(new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString());
      }
      setIsPhonePaired(true);
      toast.success("Mobile pairing QR Code token generated successfully.");
    } catch {
      toast.error("Failed to generate pairing token.");
    } finally {
      setIsGeneratingPairing(false);
    }
  };

  // Face Registration Simulator Process
  const handleStartEnrollment = (student: any) => {
    setSelectedStudent(student);
    setIsEnrolling(true);
    setEnrollStep("CHALLENGE_FRONT");
    setEnrollProgress(10);
    setVerificationFeedback("Look straight at the camera. Neutral expression.");
  };

  const advanceEnrollStep = () => {
    console.log("advanceEnrollStep called. Current step:", enrollStep);
    switch (enrollStep) {
      case "CHALLENGE_FRONT":
        setEnrollStep("CHALLENGE_LEFT");
        setEnrollProgress(15);
        setVerificationFeedback("Slowly rotate head LEFT. Keep eyes on screen.");
        break;
      case "CHALLENGE_LEFT":
        setEnrollStep("CHALLENGE_RIGHT");
        setEnrollProgress(30);
        setVerificationFeedback("Slowly rotate head to the RIGHT. Keep centered.");
        break;
      case "CHALLENGE_RIGHT":
        setEnrollStep("CHALLENGE_UP");
        setEnrollProgress(45);
        setVerificationFeedback("Tilt head UP slightly to capture neck & jawline.");
        break;
      case "CHALLENGE_UP":
        setEnrollStep("CHALLENGE_DOWN");
        setEnrollProgress(60);
        setVerificationFeedback("Tilt head DOWN. Excellent illumination.");
        break;
      case "CHALLENGE_DOWN":
        setEnrollStep("CHALLENGE_SMILE");
        setEnrollProgress(75);
        setVerificationFeedback("SMILE TEST: Please smile slightly to record expression map.");
        break;
      case "CHALLENGE_SMILE":
        setEnrollStep("LIVENESS_BLINK");
        setEnrollProgress(90);
        setVerificationFeedback("LIVENESS TEST: Please blink your eyes twice.");
        break;
      case "LIVENESS_BLINK":
        setEnrollStep("COMPILING");
        setEnrollProgress(100);
        setVerificationFeedback("Compiling face metrics. Extracting 512-D float vectors...");
        setTimeout(() => {
          setEnrollStep("SUCCESS");
          toast.success(`Face registered successfully for ${selectedStudent.studentName}!`);
        }, 1800);
        break;
    }
  };

  // Filter Attendance Logs
  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ? true : record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedAttendance = filteredAttendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);

  const registryStudents = useMemo(() => {
    return attendance.map(record => {
      const isEnrolled = record.presenceRate > 0;
      return {
        id: record.id,
        studentName: record.studentName,
        idCode: record.studentId,
        status: isEnrolled ? "ENROLLED" : "PENDING",
        verifiedAt: isEnrolled ? "2026-06-12" : "—",
        vectors: isEnrolled ? "AES-256 Vector" : "None"
      };
    }).filter(s => s.studentName.toLowerCase().includes(registrySearch.toLowerCase()) || s.idCode.toLowerCase().includes(registrySearch.toLowerCase()));
  }, [attendance, registrySearch]);

  const emotionData = [
    { name: "Attentive", value: 65, color: "#8b5cf6" },
    { name: "Neutral", value: 20, color: "#3b82f6" },
    { name: "Bored", value: 10, color: "#f59e0b" },
    { name: "Sleepy/Distracted", value: 5, color: "#ef4444" }
  ];

  const engagementTrend = [
    { hour: "08:00 AM", score: 85, phoneUsage: 5 },
    { hour: "09:00 AM", score: 88, phoneUsage: 2 },
    { hour: "10:00 AM", score: 80, phoneUsage: 8 },
    { hour: "11:00 AM", score: 72, phoneUsage: 14 }
  ];

  // Specific filtered datasets based on user roles
  const filteredCamerasByRole = useMemo(() => {
    if (currentRole === "SUPER_ADMIN") return cameras;
    if (currentRole === "ADMIN") return cameras.slice(0, 4); // Own organization
    if (currentRole === "ADMINISTRATOR") return cameras.filter(c => c.room === "Room 101" || c.room === "Room 102"); // Own branch
    return [];
  }, [cameras, currentRole]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      
      {/* EMERGENCY SECURITY ALARM OVERLAY */}
      {isEmergencyAlarmActive && (
        <div className="fixed inset-0 bg-red-600/90 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 text-white text-center animate-pulse">
          <AlertOctagon className="h-24 w-24 mb-4 text-white animate-bounce" />
          <h1 className="text-4xl font-extrabold tracking-wider">{tl("alarmTriggered")}</h1>
          <p className="max-w-md text-sm text-red-100 font-bold mt-2 leading-relaxed">{alarmReason}</p>
          <div className="mt-8 flex gap-4">
            <Button 
              className="bg-white hover:bg-zinc-100 text-red-600 font-extrabold px-8 py-3 rounded-xl shadow-lg border-none cursor-pointer"
              onClick={() => {
                setIsEmergencyAlarmActive(false);
                toast.success("Security status returned to Normal Mode.");
              }}
            >
              Reset Security Status
            </Button>
          </div>
        </div>
      )}

      {/* ROLE SWITCHING / API SINYAL PANELI */}
      {showDevControls && (
        <div className="bg-[#120c1e] text-white border-b border-purple-500/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="font-bold text-purple-300 uppercase">{tl("roleSim")}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-purple-200">{tl("assumeRole")}:</label>
              <select 
                value={currentRole} 
                onChange={(e) => {
                  setCurrentRole(e.target.value as UserRole);
                  toast.info(`Interfeys o'zgartirildi: ${e.target.value}`);
                }}
                className="bg-purple-950 border border-purple-500/30 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="SUPER_ADMIN">Super Admin (Barcha kameralar)</option>
                <option value="ADMIN">Admin (Tashkilot kameralari)</option>
                <option value="ADMINISTRATOR">Administrator (Filial kameralari)</option>
                <option value="TEACHER">O'qituvchi (Dars davomati)</option>
                <option value="PARENT">Ota-ona (Farzand davomati)</option>
                <option value="STUDENT">Talaba (Mening davomatim)</option>
              </select>
            </div>
          </div>
          <button 
            onClick={() => setShowDevControls(false)}
            className="text-purple-300 hover:text-white rounded p-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* CORE CONTAINER */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* COMPACT BREADCRUMBS */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <span>AI Operations</span>
            <span>/</span>
            <span>AI Attendance Gateway</span>
            <span>/</span>
            <span className="text-foreground font-bold">{currentRole} View</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-0.5 rounded-full border border-purple-500/20 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            {tl("livePipeline")}
          </div>
        </div>

        {/* GLASSMORPHIC HEADER */}
        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-purple-900/40 via-violet-900/30 to-fuchsia-900/20 border border-purple-500/20 shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                {tl("title")}
              </h1>
              <p className="text-sm text-purple-200/80 mt-1">{tl("subtitle")}</p>
            </div>
            
            {hasAccess(["SUPER_ADMIN", "ADMIN", "ADMINISTRATOR"]) && (
              <div className="flex items-center flex-wrap gap-2.5">
                {isAttendanceRunning ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="h-10 px-5 rounded-xl gap-2 font-bold shadow-lg text-xs border-none cursor-pointer"
                    onClick={handleStopAttendance}
                  >
                    <Square className="h-4 w-4" />
                    {tl("stopTracking")}
                  </Button>
                ) : (
                  <Button 
                    variant="default"
                    size="sm"
                    className="h-10 px-5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl gap-2 font-bold shadow-lg text-xs border-none cursor-pointer"
                    onClick={handleStartAttendance}
                  >
                    <Play className="h-4 w-4" />
                    {tl("startTracking")}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 px-5 rounded-xl gap-2 text-xs border-purple-500/30 bg-purple-950/20 text-purple-200 font-semibold"
                  onClick={handleExportReport}
                >
                  <Download className="h-4 w-4" />
                  {tl("export")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* -------------------- ROLE 1: SUPER_ADMIN / ADMIN / ADMINISTRATOR VIEW -------------------- */}
        {hasAccess(["SUPER_ADMIN", "ADMIN", "ADMINISTRATOR"]) && (
          <div className="space-y-6 animate-fade-in">
            {/* TABS */}
            <div className="flex border-b border-purple-500/10 overflow-x-auto no-scrollbar gap-1 bg-purple-500/5 p-1 rounded-2xl">
              {[
                { id: "overview", label: tl("tabOverview"), icon: Monitor },
                { id: "cameras", label: tl("tabCameras"), icon: Camera },
                { id: "history", label: tl("tabHistory"), icon: FileSpreadsheet },
                { id: "security", label: tl("tabSecurity"), icon: AlertTriangle },
                { id: "registry", label: tl("tabRegistry"), icon: Users },
                { id: "analytics", label: tl("tabAnalytics"), icon: BarChart3 },
                { id: "settings", label: tl("tabSettings"), icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap tracking-wide border-none cursor-pointer transition-all ${
                      activeTab === tab.id 
                        ? "bg-[#8b5cf6] text-white shadow-lg" 
                        : "text-muted-foreground hover:text-foreground hover:bg-purple-500/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* 1. TIMETABLE ACTIVE INTEGRATION CARD */}
                <div className="space-y-4">
                  <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                    <Calendar className="h-4.5 w-4.5 text-purple-500 animate-pulse" /> {tl("activeLessons")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {timetable.map((session) => (
                      <Card key={session.id} className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-purple-500/30 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded font-black">
                              {session.status}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {session.time}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-foreground">{session.groupName}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{session.subject} • {session.roomName}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                          <span>Paired: <strong className="text-foreground">{session.pairedCamera}</strong></span>
                          <span>Present: <strong className="text-purple-500">{session.presentCount}/{session.enrolledStudents}</strong></span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 2. STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tl("attendanceRate")}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground">94.2%</span>
                        <span className="text-xs text-emerald-500 font-bold flex items-center">
                          <ArrowUpRight className="h-3 w-3" /> +1.2%
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                      <Activity className="h-5 w-5" />
                    </div>
                  </Card>

                  <Card className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tl("presentStudents")}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">1,428</span>
                        <span className="text-xs text-muted-foreground font-bold">/ 1,516 total</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                      <Users className="h-5 w-5" />
                    </div>
                  </Card>

                  <Card className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tl("activeStreams")}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">{filteredCamerasByRole.length} Active</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                      <Camera className="h-5 w-5" />
                    </div>
                  </Card>

                  <Card className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tl("securityAlerts")}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground">{unknowns.length}</span>
                        <span className="text-[9px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-extrabold border border-rose-500/20">Critical</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-550">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                    </div>
                  </Card>
                </div>

                {/* 3. LOG FEED STREAM & PEAK HOURS CHART */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LOG STREAM FEED */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Cpu className="h-4 w-4 text-purple-500" /> {tl("realtimeFeed")}
                      </h2>
                      <span className="text-xs text-muted-foreground font-mono">Scan rate: {snapshotInterval}s</span>
                    </div>

                    <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3 max-h-[360px] overflow-y-auto no-scrollbar">
                      {realtimeLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/80 transition-all">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-10 w-10 bg-purple-500/10 text-purple-455 rounded-xl border border-purple-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                              {log.avatar}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-foreground truncate">{log.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Room: <span className="font-semibold text-foreground">{log.room}</span> • <span className="font-mono">{log.time}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 font-mono">
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black border ${
                                log.status === "PRESENT"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}>
                                {log.status}
                              </span>
                              <div className="text-[10px] text-muted-foreground font-bold mt-0.5">{log.conf}% Conf</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>

                  {/* CHARTS */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <BarChart2 className="h-4 w-4 text-purple-500" /> {tl("peakHours")}
                    </h2>
                    
                    <Card className="bg-card border border-border rounded-3xl p-4 shadow-sm h-[360px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={engagementTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="engagementGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                          <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <ChartTooltip />
                          <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#engagementGrad2)" name="Student Flow" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LIVE CAMERAS GRID */}
            {activeTab === "cameras" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/40 p-4 border border-border rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tl("gridSelect")}:</span>
                    <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
                      {[1, 2, 3, 4, 5].map((cols) => (
                        <button
                          key={cols}
                          onClick={() => setGridColumns(cols as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black border-none cursor-pointer ${
                            gridColumns === cols 
                              ? "bg-purple-600 text-white shadow-md" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cols}x{cols}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isPhonePaired && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                      Phone Connected Stream Active
                    </span>
                  )}
                </div>

                <div className="grid gap-4" style={{
                  gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
                }}>
                  {filteredCamerasByRole.map((cam, idx) => {
                    const isOffline = cam.status === "OFFLINE";
                    return (
                      <Card key={cam.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition relative group overflow-hidden">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono text-muted-foreground uppercase block">{cam.manufacturer || "IP Camera"} • {cam.room}</span>
                              <h3 className="text-xs font-black text-foreground truncate mt-0.5">{cam.name}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${
                              isOffline 
                                ? "bg-rose-500/10 text-rose-550 border-rose-500/20" 
                                : cam.status === "WARNING"
                                ? "bg-amber-500/10 text-amber-550 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-555 border-emerald-500/20"
                            }`}>
                              {cam.status}
                            </span>
                          </div>

                          {/* Canvas view simulator */}
                          <div className="relative w-full h-[140px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
                            {isOffline ? (
                              <div className="text-center text-zinc-500 p-4">
                                <WifiOff className="h-8 w-8 mx-auto mb-1.5 text-zinc-700" />
                                <p className="text-[10px] font-mono font-bold">DISCONNECTED</p>
                              </div>
                            ) : (
                              <div className="w-full h-full p-3 flex flex-col justify-between bg-zinc-900 text-left relative">
                                <div className="absolute top-8 left-12 w-14 h-14 border-2 border-emerald-500 rounded-md pointer-events-none animate-pulse">
                                  <span className="absolute -top-4 left-0 bg-emerald-500 text-white font-mono text-[8px] px-1.5 rounded">
                                    Jasur A. (98%)
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                                  <span>{cam.fps} FPS • {cam.latency}ms</span>
                                  <span>{cam.resolution}</span>
                                </div>
                                <div className="text-center my-auto py-2">
                                  <Monitor className="h-5 w-5 text-zinc-750 mx-auto mb-1 opacity-60" />
                                  <p className="text-[10px] text-emerald-400 font-mono font-bold">{cam.studentsCount} FACES ACTIVE</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ATTENDANCE HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder={tl("searchPlaceholder")} 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold w-full sm:w-auto"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PRESENT">Present Only</option>
                    <option value="LATE">Late Only</option>
                    <option value="ABSENT">Absent Only</option>
                  </select>
                </div>

                <Card className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Faculty</th>
                          <th className="py-3 px-4">Group</th>
                          <th className="py-3 px-4">Room</th>
                          <th className="py-3 px-4">Entry / Exit Timeline Log</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs">
                        {paginatedAttendance.map((record) => (
                          <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground">{record.studentName}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{record.faculty}</td>
                            <td className="py-3.5 px-4 font-semibold text-muted-foreground">{record.groupName}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{record.room}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {record.checkins?.map((inTime, i) => (
                                  <span key={`in-${i}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-500 border border-emerald-500/20">
                                    IN: {inTime}
                                  </span>
                                ))}
                                {record.checkouts?.map((outTime, i) => (
                                  <span key={`out-${i}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-[9px] font-mono font-bold text-rose-550 border border-rose-500/20">
                                    OUT: {outTime}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                record.status === "PRESENT"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : record.status === "LATE"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-550 border-rose-500/20"
                              }`}>{record.status}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold">{record.presenceRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB CONTENT: SECURITY ALERTS */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* ALERTS */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <ShieldX className="h-4.5 w-4.5 text-rose-500 animate-pulse" /> Active Threat Vectors ({unknowns.length})
                    </h3>

                    <div className="space-y-4">
                      {unknowns.map((un) => (
                        <Card key={un.id} className="p-5 bg-card border border-border rounded-3xl flex flex-col justify-between hover:shadow-md transition">
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <div className="relative w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-6 w-6 text-rose-500" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-mono text-muted-foreground block">Event: {un.id} • {un.detectedAt}</span>
                                <h4 className="font-extrabold text-sm text-foreground">{tl("unrecognizedTitle")}</h4>
                                <p className="text-xs text-rose-500 font-bold">{un.reason}</p>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs border-t border-border pt-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location Stream:</span>
                                <span className="font-semibold text-foreground">{un.cameraName} ({un.room})</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{tl("cosSimilarity")}:</span>
                                <span className="font-mono text-rose-500 font-bold">{un.confidence}% Match</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] h-8 rounded-lg font-bold border-none cursor-pointer"
                              onClick={() => {
                                setUnknowns(prev => prev.filter(u => u.id !== un.id));
                                toast.success("Biometric enrollment initialized.");
                              }}
                            >
                              {tl("approve")}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-border text-[10px] h-8 rounded-lg text-muted-foreground"
                              onClick={() => {
                                setUnknowns(prev => prev.filter(u => u.id !== un.id));
                                toast.success("Ignored.");
                              }}
                            >
                              {tl("ignore")}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-200 text-red-500 hover:bg-red-50/50 text-[10px] h-8 rounded-lg font-bold"
                              onClick={() => {
                                setUnknowns(prev => prev.filter(u => u.id !== un.id));
                                toast.error("Added to blacklists.");
                              }}
                            >
                              {tl("blacklist")}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-rose-200 text-rose-550 hover:bg-rose-50/50 text-[10px] h-8 rounded-lg font-bold animate-pulse"
                              onClick={() => handleDispatchSecurity(un.id)}
                            >
                              {tl("dispatch")}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* SECURITY LOGS AUDIT */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <History className="h-4.5 w-4.5 text-purple-500" /> Security Logs
                    </h3>

                    <Card className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
                      {securityLogs.map((log) => (
                        <div key={log.id} className="border-b border-border/40 pb-3 last:border-b-0">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-muted-foreground">{log.timestamp.substring(11, 19)}</span>
                            <span className={`px-1.5 py-0.5 rounded font-black border ${
                              log.severity === "CRITICAL" 
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>{log.severity}</span>
                          </div>
                          <h5 className="text-[11px] font-black text-foreground mt-1">{log.type}</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{log.message}</p>
                        </div>
                      ))}
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FACE REGISTRY */}
            {activeTab === "registry" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* DIRECTORY */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search student profile..." 
                        value={registrySearch}
                        onChange={(e) => setRegistrySearch(e.target.value)}
                        className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none"
                      />
                    </div>

                    <Card className="bg-card border border-border rounded-3xl p-3 shadow-sm max-h-[460px] overflow-y-auto no-scrollbar space-y-2">
                      {registryStudents.map((std) => (
                        <div 
                          key={std.id} 
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            selectedStudent?.id === std.id 
                              ? "bg-purple-600/15 border-purple-500/40 text-purple-300"
                              : "bg-muted/40 border-border hover:bg-muted/80"
                          }`}
                          onClick={() => setSelectedStudent(std)}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-foreground">{std.studentName}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">ID: {std.idCode} • {std.vectors}</p>
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>

                  {/* CAMERA 3D ENROLL WORKSPACE */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <UserCheck className="h-4.5 w-4.5 text-purple-500" /> {tl("enrollTitle")}
                    </h3>

                    {selectedStudent ? (
                      <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-6 animate-fade-in">
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold text-foreground">{selectedStudent.studentName}</h3>
                          <p className="text-xs text-muted-foreground">ID: {selectedStudent.idCode}</p>
                        </div>

                        {/* Camera Scanning Orb (Apple Face ID Premium Design) */}
                        <div className="relative w-64 h-64 bg-zinc-950 rounded-full flex items-center justify-center border-4 border-purple-500/10 overflow-visible shadow-2xl shadow-purple-500/5">
                          {/* Radial Apple Face ID Ticks */}
                          {Array.from({ length: 48 }).map((_, i) => {
                            const angle = (i * 360) / 48;
                            const isCaptured = (i / 48) * 100 < enrollProgress;
                            return (
                              <div 
                                key={i}
                                className={`absolute w-[2px] h-[10px] origin-bottom transition-all duration-300`}
                                style={{
                                  transform: `rotate(${angle}deg) translateY(-122px)`,
                                  backgroundColor: isCaptured ? "#10b981" : "#3f3f46",
                                  boxShadow: isCaptured ? "0 0 8px #10b981" : "none"
                                }}
                              />
                            );
                          })}

                          {/* Inner circular view */}
                          <div className="w-[218px] h-[218px] rounded-full overflow-hidden relative bg-zinc-900 border border-purple-500/20 flex items-center justify-center">
                            {enrollStep === "IDLE" ? (
                              <div className="text-center text-zinc-500 p-4">
                                <Camera className="h-12 w-12 mx-auto mb-2 text-zinc-700 animate-pulse" />
                                <p className="text-xs font-mono font-bold">READY TO RECORD</p>
                              </div>
                            ) : enrollStep === "SUCCESS" ? (
                              <div className="text-center text-emerald-400 p-4">
                                <CheckCircle className="h-16 w-16 mx-auto mb-2 text-emerald-400 animate-bounce" />
                                <p className="text-xs font-mono font-bold uppercase tracking-wider">ENROLLED</p>
                                <p className="text-[9px] text-zinc-500 font-mono mt-1">{tl("encryptionMsg")}</p>
                              </div>
                            ) : (
                              <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-900 text-left relative">
                                {/* Live webcam track */}
                                {enrollHasPermission ? (
                                  <video 
                                    ref={videoRefEnroll} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-zinc-900 to-fuchsia-950/20 flex items-center justify-center">
                                    <User className="h-20 w-20 text-purple-500/20" />
                                  </div>
                                )}

                                {/* Animated SVG landmarks */}
                                <svg 
                                  className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 z-10" 
                                  viewBox="0 0 218 218"
                                >
                                  <g style={{
                                    transform: `translate(${landmarkOffset.x}px, ${landmarkOffset.y}px)`,
                                    transformOrigin: 'center'
                                  }}>
                                    {/* Face boundary oval */}
                                    <path 
                                      d="M 59,75 C 59,75 69,30 109,30 C 149,30 159,75 159,75 C 159,115 144,180 109,180 C 74,180 59,115 59,75 Z" 
                                      fill="none" 
                                      stroke="#8b5cf6" 
                                      strokeWidth="1.5" 
                                      strokeDasharray="4,4" 
                                      className="animate-pulse opacity-60" 
                                    />
                                    
                                    {/* Cross grids */}
                                    <path d="M 59,100 Q 109,113 159,100" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
                                    <path d="M 109,30 V 180" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />

                                    {/* Eye dots */}
                                    <circle cx="87" cy="90" r="3.5" fill={enrollStep === "LIVENESS_BLINK" ? "#ef4444" : "#10b981"} className={enrollStep === "LIVENESS_BLINK" ? "animate-ping" : ""} />
                                    <circle cx="131" cy="90" r="3.5" fill={enrollStep === "LIVENESS_BLINK" ? "#ef4444" : "#10b981"} className={enrollStep === "LIVENESS_BLINK" ? "animate-ping" : ""} />
                                    
                                    {/* Nose dots */}
                                    <path d="M 109,90 L 109,120 H 104 L 109,126 L 114,126 H 109" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.8" />
                                    <circle cx="109" cy="126" r="3.5" fill="#f59e0b" className="animate-pulse" />

                                    {/* Cheek dots */}
                                    <circle cx="74" cy="130" r="2.5" fill="#8b5cf6" opacity="0.7" />
                                    <circle cx="144" cy="130" r="2.5" fill="#8b5cf6" opacity="0.7" />
                                    {/* Mouth curve */}
                                    <path 
                                      d={enrollStep === "CHALLENGE_SMILE" ? "M 91,148 Q 109,161 127,148" : "M 91,148 Q 109,153 127,148"} 
                                      fill="none" 
                                      stroke={enrollStep === "CHALLENGE_SMILE" ? "#10b981" : "#f59e0b"} 
                                      strokeWidth="2" 
                                    />
                                  </g>
                                </svg>

                                <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/20 text-center z-20">
                                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase animate-pulse leading-snug">
                                    {verificationFeedback}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Scan Progress Bar (Apple biometric style) */}
                        {enrollStep !== "IDLE" && enrollStep !== "SUCCESS" && (
                          <div className="w-64 space-y-2 animate-fade-in">
                            <div className="flex justify-between text-[10px] font-mono font-black text-muted-foreground uppercase">
                              <span>Biometric Vector Progress</span>
                              <span className="text-emerald-400 font-extrabold">{enrollProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-950 border border-border rounded-full overflow-hidden p-[2px]">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_#10b981]"
                                style={{ width: `${enrollProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          {enrollStep === "IDLE" ? (
                            <Button 
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl border-none cursor-pointer"
                              onClick={() => handleStartEnrollment(selectedStudent)}
                            >
                              Start Scanning ➔
                            </Button>
                          ) : enrollStep === "SUCCESS" ? (
                            <Button 
                              variant="outline"
                              className="border-border text-xs rounded-xl h-10 px-6 cursor-pointer"
                              onClick={() => setEnrollStep("IDLE")}
                            >
                              Reset Workspace
                            </Button>
                          ) : (
                            <Button 
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl border-none cursor-pointer"
                              onClick={advanceEnrollStep}
                            >
                              {enrollStep === "LIVENESS_BLINK" ? "Complete Check" : "Next Angle Challenge ➔"}
                            </Button>
                          )}
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-12 text-center bg-card border border-border rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-3">
                        <Users className="h-10 w-10 text-muted-foreground" />
                        <h4 className="text-sm font-extrabold">No Student Selected</h4>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Select a student from the left directory to initialize the Biometric 3D face registry.
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                      Classroom Attention Analytics
                    </h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={emotionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            {emotionData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                          </Pie>
                          <ChartTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                      Anti-Fraud Detection metrics
                    </h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={engagementTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                          <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <ChartTooltip />
                          <Bar dataKey="phoneUsage" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Bypassing Detections" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* QR CODE MOBILE PAIRING */}
                <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest pb-3 border-b border-border">
                    <QrCode className="h-4.5 w-4.5 text-purple-500" /> {tl("pairingTitle")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/30 border border-border rounded-2xl min-h-[220px]">
                      {isPhonePaired ? (
                        <>
                          <div className="h-32 w-32 bg-white p-1.5 rounded-xl flex items-center justify-center border-4 border-purple-500 overflow-hidden shadow-lg shadow-purple-500/10 animate-fade-in">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/mobile-camera?token=${phoneStreamToken}`)}`}
                              alt="Pairing QR Code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase mt-3">Scan with Phone Camera</span>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold font-mono">NO ACTIVE TOKEN</p>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pair your smartphone as a temporary camera node for the classroom session. WebRTC stream initiates upon scanning the code.
                      </p>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-10 px-6 border-none cursor-pointer animate-pulse"
                        onClick={handleGenerateMobilePairing}
                        disabled={isGeneratingPairing}
                      >
                        Generate Pairing QR Code
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* AI THRESHOLD SETTINGS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider pb-2 border-b border-border flex items-center gap-1.5">
                      <Sliders className="h-4.5 w-4.5 text-purple-500" /> Model parameters
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">Match Threshold: <span className="font-mono text-purple-500 font-black">{recognitionThreshold}</span></label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="0.99" 
                          step="0.01" 
                          value={recognitionThreshold} 
                          onChange={(e) => setRecognitionThreshold(parseFloat(e.target.value))} 
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-650 border border-border" 
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider pb-2 border-b border-border flex items-center gap-1.5">
                      <Activity className="h-4.5 w-4.5 text-purple-500" /> Grace Thresholds
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">Grace Minutes: <span className="font-mono text-purple-500 font-black">{lateMinutesLimit}</span></label>
                        <input 
                          type="number" 
                          value={lateMinutesLimit} 
                          onChange={(e) => setLateMinutesLimit(parseInt(e.target.value))} 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none" 
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- ROLE 2: TEACHER VIEW -------------------- */}
        {currentRole === "TEACHER" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Active timetable lessons list */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                <Clock className="h-4.5 w-4.5 text-purple-500" /> My Schedule
              </h3>
              <Card className="bg-card border border-border rounded-3xl p-3 shadow-sm space-y-3">
                {timetable.map((session) => (
                  <div 
                    key={session.id} 
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      selectedSessionId === session.id 
                        ? "bg-purple-600/15 border-purple-500/40"
                        : "bg-muted/40 border-border hover:bg-muted/80"
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground font-mono">
                      <span>{session.time}</span>
                      <span className={`px-2 py-0.5 rounded font-black border ${
                        session.status === "ACTIVE" 
                          ? "bg-purple-500/15 text-purple-400 border-purple-500/20 animate-pulse" 
                          : "bg-muted text-muted-foreground border-border"
                      }`}>{session.status}</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-foreground">{session.groupName}</h4>
                      <p className="text-[10px] text-muted-foreground">{session.subject} • {session.roomName}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Enrolled students live camera matching list */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                <Users className="h-4.5 w-4.5 text-purple-500" /> Active Attendance Sheet
              </h3>
              <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Arrival Time</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Confidence</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-foreground">{record.studentName}</td>
                          <td className="py-3 px-3 text-muted-foreground font-mono">{record.arrivalTime}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              record.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : record.status === "LATE"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-550 border-rose-500/20"
                            }`}>{record.status}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-muted-foreground">{record.presenceRate}%</td>
                          <td className="py-3 px-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] rounded-lg border-border"
                              onClick={() => {
                                toast.success(`Manual override: ${record.studentName} marked PRESENT.`);
                              }}
                            >
                              Override PRESENT
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* -------------------- ROLE 3: PARENT VIEW -------------------- */}
        {currentRole === "PARENT" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
              <User className="h-4.5 w-4.5 text-purple-500" /> {tl("childTimeline")}
            </h3>
            
            <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-extrabold text-purple-500 text-lg">
                  JA
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">Jasur Akhmedov</h4>
                  <p className="text-xs text-muted-foreground">Classroom: Room 101 • CS-204 coding group</p>
                </div>
                <div className="ml-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  Class Present
                </div>
              </div>

              {/* TIMELINE */}
              <div className="relative border-l border-purple-500/30 ml-4 pl-6 space-y-6 text-xs text-muted-foreground font-mono">
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-md"></span>
                  <div className="font-bold text-foreground">15:21:02 PM</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Auto-Match Face verified: Present at Classroom 101 corridor (Hikvision AI Camera)</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-slate-950 shadow-md"></span>
                  <div className="font-bold text-foreground">10:00:00 AM</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Exit scan registered (Dars yakunlandi / Leaving school grounds)</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-md"></span>
                  <div className="font-bold text-foreground">08:58:12 AM</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Initial Campus Entry check-in verified. (On Time)</div>
                </div>
              </div>

              {/* SMS Notification settings */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-500" /> Telegram & SMS alerts enabled
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-lg h-8 text-[10px]"
                  onClick={() => toast.success("Notification configurations saved.")}
                >
                  Configure Notifications
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* -------------------- ROLE 4: STUDENT VIEW -------------------- */}
        {currentRole === "STUDENT" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
              <Calendar className="h-4.5 w-4.5 text-purple-500" /> {tl("calendarTitle")}
            </h3>

            <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
              {/* Personal stat summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Attendance Rate</div>
                  <div className="text-xl font-black text-purple-500">96.5%</div>
                </div>
                <div className="space-y-1 border-x border-border">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Lates</div>
                  <div className="text-xl font-black text-amber-500">1 Days</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Absents</div>
                  <div className="text-xl font-black text-rose-500">0 Days</div>
                </div>
              </div>

              {/* Grid 30 days visualization */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Biometric Verification Calendar</h4>
                <div className="grid grid-cols-7 gap-2">
                  {/* Calendar cells: Green for present, Yellow for late, Grey for weekend */}
                  {Array.from({ length: 30 }).map((_, i) => {
                    const isLate = i === 12;
                    const isWeekend = i % 7 === 5 || i % 7 === 6;
                    return (
                      <div 
                        key={i} 
                        className={`h-9 rounded-xl flex items-center justify-center text-[10px] font-bold font-mono border ${
                          isWeekend 
                            ? "bg-muted/40 border-border text-muted-foreground"
                            : isLate
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        }`}
                        title={isWeekend ? "Weekend" : isLate ? "Late on day " + (i+1) : "Present on day " + (i+1)}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AES-256 Vector Status */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-purple-500" /> AES-256 Biometric Vector</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase">SECURED / ENCRYPTED</span>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="border-t border-border mt-auto py-6 bg-muted/20 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <span>LMSHub Campus Operating System v2.1.2-AI</span>
          <span>Scalability Target: 10,000 active students • 500 active camera streams</span>
        </div>
      </footer>
    </div>
  );
}

// Simulated action helper
function handleCameraAction(name: string, act: string) {
  toast.info(`${act} on camera "${name}"`);
}
