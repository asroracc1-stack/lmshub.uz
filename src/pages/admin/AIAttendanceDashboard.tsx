import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Camera, Shield, AlertTriangle, Cpu, RefreshCw, Plus, 
  Settings, CheckCircle, Wifi, WifiOff, Activity, Sliders, Users,
  Play, Square, Download, FileSpreadsheet, Eye, Maximize2, MoreHorizontal,
  Server, HardDrive, ShieldAlert, Check, X, ShieldX,
  Volume2, Settings2, Trash2, ArrowLeft, ArrowUpRight, ArrowDownRight,
  TrendingUp, BarChart3, Database, KeyRound, Monitor, Zap, HelpCircle,
  Lock, EyeOff, Search, ChevronLeft, ChevronRight, FileDown, AlertCircle, Info,
  QrCode, UserCheck, History, BarChart2, Maximize, AlertOctagon, UserX
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/axios"; 
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
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

type UserRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "SECURITY" | "RECEPTION";
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

export default function AIAttendanceDashboard() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { role: userAuthRole } = useAuth();
  const isDark = theme === "dark";

  // System Role Simulator
  const [currentRole, setCurrentRole] = useState<UserRole>("SUPER_ADMIN");
  const [apiState, setApiState] = useState<ApiState>("SUCCESS");
  const [showDevControls, setShowDevControls] = useState(true);

  // Active Tab: Overview, Live Cameras, Attendance Logs, Security Alerts, Face Registry, Analytics, Settings
  const [activeTab, setActiveTab] = useState<"overview" | "cameras" | "history" | "security" | "registry" | "analytics" | "settings">("overview");

  // Core Data Lists
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownDetection[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

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
  const [enrollStep, setEnrollStep] = useState<"IDLE" | "CHALLENGE_FRONT" | "CHALLENGE_LEFT" | "CHALLENGE_RIGHT" | "CHALLENGE_UP" | "CHALLENGE_DOWN" | "LIVENESS_BLINK" | "COMPILING" | "SUCCESS">("IDLE");
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [verificationFeedback, setVerificationFeedback] = useState("");

  // Emergency security alert
  const [isEmergencyAlarmActive, setIsEmergencyAlarmActive] = useState(false);
  const [alarmReason, setAlarmReason] = useState("");

  // Loading indicator states
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [isAttendanceRunning, setIsAttendanceRunning] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Localized string dictionary for robust i18n
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
      save: "Saqlash"
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
      save: "Save Configurations"
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
      save: "Сохранить"
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
          lastDetectionTime: (c.last_seen_at ?? c.lastSeenAt) ? (c.last_seen_at ?? c.lastSeenAt).substring(11, 19) : "N/A"
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
    // Simulate real-time logs updating every 7 seconds
    const interval = setInterval(() => {
      if (isAttendanceRunning && activeTab === "overview") {
        addNewSimulatedRecognitionLog();
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [isAttendanceRunning, activeTab]);

  // Rolling Recognition Feed items
  const [realtimeLogs, setRealtimeLogs] = useState<Array<{
    id: string; time: string; name: string; room: string; status: "PRESENT" | "LATE"; conf: number; avatar: string;
  }>>([
    { id: "rl-1", time: "14:41:02 PM", name: "Jasur Akhmedov", room: "Room 102", status: "PRESENT", conf: 98.4, avatar: "J" },
    { id: "rl-2", time: "14:40:55 PM", name: "Madina Tursunova", room: "Room 102", status: "PRESENT", conf: 99.1, avatar: "M" },
    { id: "rl-3", time: "14:39:18 PM", name: "Sardor Oripov", room: "Lab 305", status: "LATE", conf: 88.2, avatar: "S" }
  ]);

  const addNewSimulatedRecognitionLog = () => {
    const students = ["Dilnoza Salimova", "Elbek Nematov", "Umida Karimova", "Shahzod Sobirov", "Ozoda Faiziyeva"];
    const rooms = ["Room 102", "Lab 305", "Auditorium 101", "Library 2F"];
    const randomName = students[Math.floor(Math.random() * students.length)];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const randomConf = +(85 + Math.random() * 14).toFixed(1);
    const date = new Date();
    const timeStr = date.toTimeString().substring(0, 8) + " PM";

    setRealtimeLogs(prev => [
      {
        id: "rl-" + Date.now(),
        time: timeStr,
        name: randomName,
        room: randomRoom,
        status: Math.random() > 0.15 ? "PRESENT" : "LATE",
        conf: randomConf,
        avatar: randomName.charAt(0)
      },
      ...prev.slice(0, 7)
    ]);
  };

  const getMockCameras = (): CameraDevice[] => [
    { id: "cam-1", name: "Main Entrance CCTV", ipAddress: "192.168.10.51", status: "ONLINE", protocol: "ONVIF", room: "Foyer Hall", studentsCount: 14, lastDetectionTime: "14:41:02 PM", manufacturer: "Hikvision" },
    { id: "cam-2", name: "Lecture Hall A Main", ipAddress: "192.168.10.52", status: "ONLINE", protocol: "RTSP", room: "Auditorium 102", studentsCount: 38, lastDetectionTime: "14:40:55 PM", manufacturer: "Dahua" },
    { id: "cam-3", name: "IT Lab West Ceiling", ipAddress: "192.168.10.53", status: "ONLINE", protocol: "RTSP", room: "Lab 305", studentsCount: 22, lastDetectionTime: "14:39:18 PM", manufacturer: "Uniview" },
    { id: "cam-4", name: "Library Entrance IP", ipAddress: "192.168.10.54", status: "WARNING", protocol: "ONVIF", room: "Library 2F", studentsCount: 4, lastDetectionTime: "14:35:10 PM", manufacturer: "ONVIF Generic" },
    { id: "cam-5", name: "Physics Lab South Wall", ipAddress: "192.168.10.55", status: "OFFLINE", protocol: "RTSP", room: "Lab 108", studentsCount: 0, lastDetectionTime: "—", manufacturer: "Hikvision" }
  ];

  const getMockUnknowns = (): UnknownDetection[] => [
    { id: "unk-101", detectedAt: "14:24:05 PM", cameraName: "Main Entrance CCTV", room: "Foyer Hall", confidence: 54, reason: "Blink test failure (Static picture attack suspected)" },
    { id: "unk-102", detectedAt: "14:15:30 PM", cameraName: "Library Entrance IP", room: "Library 2F", confidence: 42, reason: "Cosine similarity mismatch < 0.65 threshold" },
    { id: "unk-103", detectedAt: "13:58:12 PM", cameraName: "Physics Lab South Wall", room: "Lab 108", confidence: 38, reason: "Anti-Spoofing: Replay video attack detected" }
  ];

  const getMockSecurityLogs = (): SecurityLog[] => [
    { id: "log-901", timestamp: "2026-07-11T14:41:00", type: "SPOOF_ATTEMPT", severity: "CRITICAL", message: "Photo replay attack detected at Main Entrance CCTV. Liveness check failed (static eyes)." },
    { id: "log-902", timestamp: "2026-07-11T14:38:12", type: "CAMERA_DISCONNECTED", severity: "WARNING", message: "Camera 'Physics Lab South Wall' disconnected. Ping failed, latency timeout > 10000ms." },
    { id: "log-903", timestamp: "2026-07-11T14:25:40", type: "DEEPFAKE_FLAG", severity: "CRITICAL", message: "DeepFake pattern detected on face scan in Auditorium 102." },
    { id: "log-904", timestamp: "2026-07-11T14:12:00", type: "UNAUTHORIZED_ACCESS", severity: "INFO", message: "Unregistered visitor detected in Foyer Hall corridor." }
  ];

  const getMockAttendance = (): AttendanceRecord[] => [
    { id: "att-1", studentName: "Jasur Akhmedov", studentId: "LMS-10829", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:02 AM", status: "PRESENT", presenceRate: 98, checkins: ["08:02 AM", "10:15 AM"], checkouts: ["10:00 AM", "12:00 PM"] },
    { id: "att-2", studentName: "Madina Tursunova", studentId: "LMS-10842", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:05 AM", status: "PRESENT", presenceRate: 99, checkins: ["08:05 AM"], checkouts: ["12:00 PM"] },
    { id: "att-3", studentName: "Diyorbek Sadullayev", studentId: "LMS-10901", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:09 AM", status: "PRESENT", presenceRate: 95, checkins: ["08:09 AM"], checkouts: ["12:00 PM"] },
    { id: "att-4", studentName: "Sardor Oripov", studentId: "LMS-10421", faculty: "Computer Science", groupName: "CS-202", room: "Lab 305", arrivalTime: "08:14 AM", status: "LATE", presenceRate: 88, checkins: ["08:14 AM"], checkouts: ["11:30 AM"] },
    { id: "att-5", studentName: "Kamola Bekmirzayeva", studentId: "LMS-10332", faculty: "Languages", groupName: "ENG-101", room: "Library 2F", arrivalTime: "08:04 AM", status: "PRESENT", presenceRate: 96, checkins: ["08:04 AM"], checkouts: ["11:00 AM"] },
    { id: "att-6", studentName: "Rayhon Qodirova", studentId: "LMS-10291", faculty: "Computer Science", groupName: "CS-202", room: "Lab 305", arrivalTime: "—", status: "ABSENT", presenceRate: 0, checkins: [], checkouts: [] },
    { id: "att-7", studentName: "Bobur Karimov", studentId: "LMS-10512", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:01 AM", status: "PRESENT", presenceRate: 92, checkins: ["08:01 AM"], checkouts: ["12:00 PM"] },
    { id: "att-8", studentName: "Aziza Vahobova", studentId: "LMS-10641", faculty: "Languages", groupName: "ENG-101", room: "Library 2F", arrivalTime: "08:18 AM", status: "LATE", presenceRate: 81, checkins: ["08:18 AM"], checkouts: ["11:00 AM"] }
  ];

  // Helper for role access limits
  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(currentRole);
  };

  // camera auto discovery
  const runCameraDiscovery = async () => {
    setIsDiscovering(true);
    toast.info("ONVIF Local Subnet Auto-Discovery probe started...");
    setTimeout(() => {
      setIsDiscovering(false);
      toast.success("Discovery complete! Found 2 new cameras (Dahua IP, Hikvision PTZ). Added to settings.");
    }, 2000);
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

  const handleAddCamera = () => {
    toast.info("Opening Add Camera dialog (REST payload target: /api/v1/cameras)");
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
      link.setAttribute("download", `lmshub_attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Attendance report downloaded successfully as CSV");
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
        setPhoneStreamToken(res.data.qrToken);
        setPairingExpiry(res.data.expiresAt);
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
    switch (enrollStep) {
      case "CHALLENGE_FRONT":
        setEnrollStep("CHALLENGE_LEFT");
        setEnrollProgress(30);
        setVerificationFeedback("Slowly rotate head LEFT. Keep eyes on screen.");
        break;
      case "CHALLENGE_LEFT":
        setEnrollStep("CHALLENGE_RIGHT");
        setEnrollProgress(50);
        setVerificationFeedback("Rotate head to the RIGHT. Perfect.");
        break;
      case "CHALLENGE_RIGHT":
        setEnrollStep("CHALLENGE_UP");
        setEnrollProgress(70);
        setVerificationFeedback("Tilt head UP slightly. Looking good.");
        break;
      case "CHALLENGE_UP":
        setEnrollStep("CHALLENGE_DOWN");
        setEnrollProgress(85);
        setVerificationFeedback("Tilt head DOWN. Excellent contrast.");
        break;
      case "CHALLENGE_DOWN":
        setEnrollStep("LIVENESS_BLINK");
        setEnrollProgress(95);
        setVerificationFeedback("LIVENESS TEST: Please blink your eyes twice.");
        break;
      case "LIVENESS_BLINK":
        setEnrollStep("COMPILING");
        setEnrollProgress(100);
        setVerificationFeedback("Compiling face metrics. Extracting 512-D float vectors...");
        setTimeout(() => {
          setEnrollStep("SUCCESS");
          toast.success(`Face registered successfully for ${selectedStudent.studentName}!`);
        }, 1500);
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

  // Filter Face Registry Students
  const registryStudents = useMemo(() => {
    const list = [
      { id: "reg-1", studentName: "Jasur Akhmedov", idCode: "LMS-10829", status: "ENROLLED", verifiedAt: "2026-06-12", vectors: "AES-256 Vector" },
      { id: "reg-2", studentName: "Madina Tursunova", idCode: "LMS-10842", status: "ENROLLED", verifiedAt: "2026-06-14", vectors: "AES-256 Vector" },
      { id: "reg-3", studentName: "Sardor Oripov", idCode: "LMS-10421", status: "PENDING", verifiedAt: "—", vectors: "None" },
      { id: "reg-4", studentName: "Kamola Bekmirzayeva", idCode: "LMS-10332", status: "ENROLLED", verifiedAt: "2026-06-20", vectors: "AES-256 Vector" },
      { id: "reg-5", studentName: "Rayhon Qodirova", idCode: "LMS-10291", status: "PENDING", verifiedAt: "—", vectors: "None" },
      { id: "reg-6", studentName: "Elbek Nematov", idCode: "LMS-10761", status: "NO_PROFILE", verifiedAt: "—", vectors: "None" }
    ];
    return list.filter(s => s.studentName.toLowerCase().includes(registrySearch.toLowerCase()) || s.idCode.toLowerCase().includes(registrySearch.toLowerCase()));
  }, [registrySearch]);

  // Analytics Chart Data
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
    { hour: "11:00 AM", score: 72, phoneUsage: 14 },
    { hour: "12:00 PM", score: 65, phoneUsage: 18 }
  ];

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

      {/* INTEGRATION & ROLE TESTER PANEL */}
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
                  toast.info(`Interface updated for: ${e.target.value}`);
                }}
                className="bg-purple-950 border border-purple-500/30 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="SUPER_ADMIN">Super Admin (All Cameras & Settings)</option>
                <option value="ADMIN">Admin (Local Campus / Hardware)</option>
                <option value="TEACHER">Teacher (My Groups Only)</option>
                <option value="SECURITY">Security (Alerts & Streams)</option>
                <option value="RECEPTION">Reception (View Dashboard)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-purple-200">Spring Boot API State:</label>
              <select 
                value={apiState} 
                onChange={(e) => setApiState(e.target.value as ApiState)}
                className="bg-purple-950 border border-purple-500/30 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="SUCCESS">Success (Connected)</option>
                <option value="LOADING">Loading (Skeletons)</option>
                <option value="EMPTY">Empty State (No cameras)</option>
                <option value="ERROR">Error State (500 Conn Failure)</option>
                <option value="OFFLINE">Offline Mode</option>
                <option value="FORBIDDEN">Forbidden (403 Access Denied)</option>
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

      {/* MAIN CONTAINER */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* COMPACT BREADCRUMBS */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <span>Modules</span>
            <span>/</span>
            <span>AI CCTV</span>
            <span>/</span>
            <span className="text-foreground font-medium">Monitoring Control Room</span>
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
            
            <div className="flex items-center flex-wrap gap-2.5">
              {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                <>
                  {isAttendanceRunning ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="h-10 px-5 rounded-xl gap-2 font-bold shadow-lg shadow-rose-500/10 text-xs border-none cursor-pointer"
                      onClick={handleStopAttendance}
                      disabled={isActionLoading !== null}
                    >
                      {isActionLoading === "stop_att" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                      {tl("stopTracking")}
                    </Button>
                  ) : (
                    <Button 
                      variant="default"
                      size="sm"
                      className="h-10 px-5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl gap-2 font-bold shadow-lg shadow-purple-500/20 text-xs border-none cursor-pointer"
                      onClick={handleStartAttendance}
                      disabled={isActionLoading !== null}
                    >
                      {isActionLoading === "start_att" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {tl("startTracking")}
                    </Button>
                  )}
                </>
              )}

              {hasAccess(["SUPER_ADMIN", "ADMIN"]) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 px-5 rounded-xl gap-2 text-xs border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 font-semibold"
                  onClick={handleAddCamera}
                >
                  <Plus className="h-4 w-4 text-purple-400" />
                  {tl("addCamera")}
                </Button>
              )}

              {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 px-5 rounded-xl gap-2 text-xs border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 font-semibold"
                  onClick={handleExportReport}
                >
                  <Download className="h-4 w-4 text-purple-400" />
                  {tl("export")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* CORE NAV TABS */}
        <div className="flex border-b border-purple-500/10 overflow-x-auto no-scrollbar gap-1 bg-purple-500/5 p-1 rounded-2xl">
          {[
            { id: "overview", label: tl("tabOverview"), icon: Monitor, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "SECURITY", "RECEPTION"] },
            { id: "cameras", label: tl("tabCameras"), icon: Camera, roles: ["SUPER_ADMIN", "ADMIN", "SECURITY"] },
            { id: "history", label: tl("tabHistory"), icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
            { id: "security", label: tl("tabSecurity"), icon: AlertTriangle, roles: ["SUPER_ADMIN", "ADMIN", "SECURITY"] },
            { id: "registry", label: tl("tabRegistry"), icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
            { id: "analytics", label: tl("tabAnalytics"), icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
            { id: "settings", label: tl("tabSettings"), icon: Settings, roles: ["SUPER_ADMIN", "ADMIN"] },
          ].map((tab) => {
            const Icon = tab.icon;
            if (!hasAccess(tab.roles as UserRole[])) return null;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap tracking-wide transition-all border-none cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-[#8b5cf6] text-white shadow-lg shadow-purple-500/15" 
                    : "text-muted-foreground hover:text-foreground hover:bg-purple-500/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* API ERROR / SUCCESS STATE ROUTER */}
        {apiState === "FORBIDDEN" ? (
          <Card className="p-8 text-center bg-card border border-border rounded-3xl flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-12 shadow-md">
            <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Permission Denied</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your role ({currentRole}) does not have permissions to access this dashboard.
              </p>
            </div>
          </Card>
        ) : apiState === "ERROR" ? (
          <Card className="p-8 text-center bg-card border border-border rounded-3xl flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-12 shadow-md">
            <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Backend Connection Failed</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                The application could not reach the server at `/api/v1/attendance`. Database connectivity was lost.
              </p>
            </div>
            <Button variant="default" size="sm" className="rounded-xl px-6 bg-[#8b5cf6] border-none text-white cursor-pointer" onClick={() => { setApiState("SUCCESS"); loadData(); }}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry Connection
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            
            {/* VIEW TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* 1. STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tl("attendanceRate")}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black tracking-tight text-foreground">94.2%</span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                            <ArrowUpRight className="h-3 w-3" /> +1.2%
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-600 dark:text-purple-400">
                        <Activity className="h-5 w-5" />
                      </div>
                    </Card>
                  )}

                  {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tl("presentStudents")}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black tracking-tight text-foreground">1,428</span>
                          <span className="text-xs text-muted-foreground">/ 1,516 total</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Users className="h-5 w-5" />
                      </div>
                    </Card>
                  )}

                  <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tl("activeStreams")}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black tracking-tight text-foreground">{isPhonePaired && isSimulatingPhoneFeed ? "5 Cams" : "4 Cams"}</span>
                        <span className="text-xs text-rose-500 font-bold">1 offline</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Camera className="h-5 w-5" />
                    </div>
                  </Card>

                  {hasAccess(["SUPER_ADMIN", "ADMIN", "SECURITY"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tl("securityAlerts")}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black tracking-tight text-foreground">{unknowns.length}</span>
                          <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-extrabold border border-rose-500/20">Critical</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-500">
                        <AlertTriangle className="h-5 w-5 animate-pulse" />
                      </div>
                    </Card>
                  )}
                </div>

                {/* 2. OVERVIEW ROW 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LIVE LOG STREAM FEED (2/3 width) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Cpu className="h-4 w-4 text-purple-500" /> {tl("realtimeFeed")}
                      </h2>
                      <span className="text-xs text-muted-foreground font-mono">Snapshot frequency: {snapshotInterval}s</span>
                    </div>

                    <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3 max-h-[360px] overflow-y-auto no-scrollbar relative">
                      {realtimeLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/80 transition-all">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-10 w-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                              {log.avatar}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-foreground truncate">{log.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Location: <span className="font-semibold text-foreground">{log.room}</span> • <span className="font-mono">{log.time}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 font-mono">
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black border ${
                                log.status === "PRESENT"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
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

                  {/* QUICK STATS & PEAK HOUR CHART */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <BarChart2 className="h-4 w-4 text-purple-500" /> {tl("peakHours")}
                    </h2>
                    
                    <Card className="bg-card border border-border rounded-3xl p-4 shadow-sm h-[360px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={engagementTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                          <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <ChartTooltip />
                          <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#engagementGrad)" name="Attendance Flow" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW TAB: LIVE CAMERAS */}
            {activeTab === "cameras" && (
              <div className="space-y-6">
                
                {/* GRID SIZE CONTROLLER & PAIRING DIALOG */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/40 p-4 border border-border rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tl("gridSelect")}:</span>
                    <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
                      {[1, 2, 3, 4, 5].map((cols) => (
                        <button
                          key={cols}
                          onClick={() => setGridColumns(cols as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black border-none cursor-pointer ${
                            gridColumns === cols 
                              ? "bg-purple-600 text-white shadow-md shadow-purple-500/10" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cols}x{cols}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mobile simulator status */}
                    {isPhonePaired && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-pulse">
                        Mobile Camera Stream Connected
                      </span>
                    )}
                    {isPhonePaired && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className={`text-xs border-purple-500/30 rounded-xl font-bold h-9 px-4 cursor-pointer ${isSimulatingPhoneFeed ? "bg-red-500/15 border-red-500/35 text-red-600" : "bg-purple-950/20 text-purple-200"}`}
                        onClick={() => {
                          setIsSimulatingPhoneFeed(p => !p);
                          toast.info(isSimulatingPhoneFeed ? "Mobile paired feed deactivated." : "Paired phone camera feed active on grid!");
                        }}
                      >
                        {isSimulatingPhoneFeed ? "Deactivate Feed" : "Simulate Mobile Feed"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* 25 GRID CAMERAS LAYOUT */}
                <div className={`grid gap-4`} style={{
                  gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
                }}>
                  
                  {/* Hikvision / Dahua / Uniview / Paired Phone Live Feed Simulator Cards */}
                  {cameras.map((cam, idx) => {
                    const isOffline = cam.status === "OFFLINE";
                    return (
                      <Card key={cam.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition relative group overflow-hidden">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono text-muted-foreground uppercase block">{cam.manufacturer || "CCTV"} • {cam.room}</span>
                              <h3 className="text-xs font-black text-foreground truncate mt-0.5">{cam.name}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${
                              isOffline 
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20" 
                                : cam.status === "WARNING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            }`}>
                              {cam.status}
                            </span>
                          </div>

                          {/* Canvas Live Overlay Simulator */}
                          <div className="relative w-full h-[140px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
                            {isOffline ? (
                              <div className="text-center text-zinc-500 p-4">
                                <WifiOff className="h-8 w-8 mx-auto mb-1.5 text-zinc-700" />
                                <p className="text-[10px] font-mono font-bold">STREAM DISCONNECTED</p>
                                <p className="text-[9px] text-zinc-700 font-mono mt-0.5">{cam.ipAddress}</p>
                              </div>
                            ) : (
                              <div className="w-full h-full p-3 flex flex-col justify-between bg-zinc-900 text-left relative">
                                {/* Simulated bounding box overlays */}
                                <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-purple-500/20 transition-all rounded-xl" />
                                
                                {/* Simulated facial bounding box */}
                                <div className="absolute top-8 left-12 w-14 h-14 border-2 border-emerald-500 rounded-md pointer-events-none animate-pulse">
                                  <span className="absolute -top-4 left-0 bg-emerald-500 text-white font-mono text-[8px] px-1 rounded">
                                    Jasur A. (98%)
                                  </span>
                                </div>
                                <div className="absolute bottom-6 right-16 w-12 h-12 border-2 border-emerald-500 rounded-md pointer-events-none">
                                  <span className="absolute -top-4 left-0 bg-emerald-500 text-white font-mono text-[8px] px-1 rounded">
                                    Madina T. (99%)
                                  </span>
                                </div>

                                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                                  <span>CH {idx + 1} • 24 FPS</span>
                                  <span>{cam.ipAddress}</span>
                                </div>

                                <div className="text-center my-auto py-2">
                                  <Monitor className="h-5 w-5 text-zinc-700 mx-auto mb-1 opacity-60" />
                                  <p className="text-[10px] text-emerald-400 font-mono font-bold">{cam.studentsCount} FACES MATCHED</p>
                                </div>

                                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                  <span>Codec: H.264</span>
                                  <span>{cam.lastDetectionTime}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Presets and Pan-Tilt Zoom Simulator */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] rounded-lg border-border"
                            onClick={() => handleCameraAction(cam.name, "Ping stream latency")}
                            disabled={isOffline}
                          >
                            Ping Latency
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] rounded-lg border-border"
                            onClick={() => handleCameraAction(cam.name, "PTZ Focus preset applied")}
                            disabled={isOffline}
                          >
                            PTZ Presets
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Paired Phone Stream simulated card if enabled */}
                  {isPhonePaired && isSimulatingPhoneFeed && (
                    <Card className="bg-card border-2 border-purple-500 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition relative overflow-hidden bg-purple-950/5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[9px] font-mono text-purple-400 uppercase block">Paired Mobile • WebRTC</span>
                            <h3 className="text-xs font-black text-foreground truncate mt-0.5">iPhone 14 Pro Camera</h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                            STREAMING
                          </span>
                        </div>

                        <div className="relative w-full h-[140px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
                          <div className="w-full h-full p-3 flex flex-col justify-between bg-purple-950/20 text-left relative">
                            {/* Bounding box inside simulator */}
                            <div className="absolute top-10 left-16 w-16 h-16 border-2 border-purple-500 rounded-md pointer-events-none animate-pulse">
                              <span className="absolute -top-4 left-0 bg-purple-600 text-white font-mono text-[8px] px-1.5 py-0.5 rounded">
                                Mobile User (95%)
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[9px] font-mono text-purple-300">
                              <span>Mobile Feed • WebRTC</span>
                              <span>paired_token_auth</span>
                            </div>

                            <div className="text-center my-auto py-2">
                              <QrCode className="h-5 w-5 text-purple-400 mx-auto mb-1 animate-pulse" />
                              <p className="text-[9px] text-purple-300 font-mono font-bold">Pairing Token Active</p>
                            </div>

                            <div className="flex justify-between items-center text-[9px] font-mono text-purple-400">
                              <span>30 FPS</span>
                              <span>Live</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-purple-500/10">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] rounded-lg border-purple-500/20 text-purple-300"
                          onClick={() => toast.success("Mobile stream connection diagnostic: OK (WebRTC latency 45ms)")}
                        >
                          Diagnostic
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] rounded-lg border-red-500/20 text-red-400"
                          onClick={() => setIsSimulatingPhoneFeed(false)}
                        >
                          Stop Simulator
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

              </div>
            )}

            {/* VIEW TAB: ATTENDANCE LOGS HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-4">
                
                {/* SEARCH, FILTERS & STATS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder={tl("searchPlaceholder")} 
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select 
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                      className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none w-full sm:w-auto font-semibold"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PRESENT">Present Only</option>
                      <option value="LATE">Late Only</option>
                      <option value="ABSENT">Absent Only</option>
                    </select>
                  </div>
                </div>

                {/* LOGS TABLE WITH MULTIPLE CHECKIN TIMELINE */}
                <Card className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Faculty</th>
                          <th className="py-3 px-4">Group</th>
                          <th className="py-3 px-4">Assigned Room</th>
                          <th className="py-3 px-4">Entry / Exit Log Timeline</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Confidence</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs">
                        {paginatedAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                              No attendance records found.
                            </td>
                          </tr>
                        ) : (
                          paginatedAttendance.map((record) => (
                            <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-foreground">{record.studentName}</td>
                              <td className="py-3.5 px-4 text-muted-foreground">{record.faculty}</td>
                              <td className="py-3.5 px-4 font-semibold text-muted-foreground">{record.groupName}</td>
                              <td className="py-3.5 px-4 text-muted-foreground">{record.room}</td>
                              <td className="py-3.5 px-4">
                                {/* Multiple entry/exit timeline bubbles */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {record.checkins && record.checkins.map((inTime, i) => (
                                    <span key={`in-${i}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-600 border border-emerald-500/20">
                                      IN: {inTime}
                                    </span>
                                  ))}
                                  {record.checkouts && record.checkouts.map((outTime, i) => (
                                    <span key={`out-${i}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-[9px] font-mono font-bold text-rose-600 border border-rose-500/20">
                                      OUT: {outTime}
                                    </span>
                                  ))}
                                  {(!record.checkins || record.checkins.length === 0) && (
                                    <span className="text-muted-foreground text-[10px]">No logs</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  record.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : record.status === "LATE"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold">{record.presenceRate}%</td>
                              <td className="py-3.5 px-4 text-center">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                  onClick={() => toast.info(`Detailed entry audit trail logs requested for ${record.studentName}`)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control footer */}
                  {totalPages > 1 && (
                    <div className="bg-muted/20 border-t border-border px-4 py-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Showing page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* VIEW TAB: SECURITY ALERTS */}
            {activeTab === "security" && (
              <div className="space-y-6">
                
                {/* CRITICAL INCIDENTS SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* ALERTS DECK */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <ShieldX className="h-4.5 w-4.5 text-rose-500" /> Active Threat Vectors ({unknowns.length})
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
                                <span className="text-[10px] font-mono text-muted-foreground block">Alert ID: {un.id} • {un.detectedAt}</span>
                                <h4 className="font-extrabold text-sm text-foreground">{tl("unrecognizedAlert")}</h4>
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{un.reason || "Liveness check failure"}</p>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs border-t border-border pt-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Classroom camera:</span>
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
                                toast.success(`Approved template for unknown profile ID ${un.id}`);
                              }}
                            >
                              Enroll face
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-border text-[10px] h-8 rounded-lg text-muted-foreground"
                              onClick={() => {
                                setUnknowns(prev => prev.filter(u => u.id !== un.id));
                                toast.success(`Alert ${un.id} ignored.`);
                              }}
                            >
                              Ignore Alert
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-rose-200 text-rose-600 hover:bg-rose-50/50 text-[10px] h-8 rounded-lg font-bold"
                              onClick={() => handleDispatchSecurity(un.id)}
                            >
                              Dispatch Guard
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-200 text-red-600 hover:bg-red-50/50 text-[10px] h-8 rounded-lg font-bold"
                              onClick={() => {
                                setUnknowns(prev => prev.filter(u => u.id !== un.id));
                                toast.error(`Subject flagged as blacklisted.`);
                              }}
                            >
                              Blacklist
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* AUDIT TRAILS & ACCESS LOGS */}
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
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : log.severity === "WARNING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
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

            {/* VIEW TAB: FACE REGISTRY (ENROLLMENT WEB-CAM SIMULATOR) */}
            {activeTab === "registry" && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* REGISTERED STUDENTS DIRECTORY (1/3 width) */}
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
                              ? "bg-purple-600/15 border-purple-500/40 text-purple-800 dark:text-purple-300"
                              : "bg-muted/40 border-border hover:bg-muted/80"
                          }`}
                          onClick={() => setSelectedStudent(std)}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-foreground">{std.studentName}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">ID: {std.idCode} • {std.vectors}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            std.status === "ENROLLED" 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : std.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}>
                            {std.status}
                          </span>
                        </div>
                      ))}
                    </Card>
                  </div>

                  {/* 3D INTERACTIVE FACE ENROLLMENT WORKSPACE (2/3 width) */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <UserCheck className="h-4.5 w-4.5 text-purple-500" /> {tl("enrollTitle")}
                    </h3>

                    {selectedStudent ? (
                      <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-6">
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold text-foreground">{selectedStudent.studentName}</h3>
                          <p className="text-xs text-muted-foreground">ID: {selectedStudent.idCode} • Status: <span className="font-semibold">{selectedStudent.status}</span></p>
                        </div>

                        {/* Webcam Enrollment Area */}
                        <div className="relative w-64 h-64 bg-zinc-950 rounded-full overflow-hidden border-4 border-purple-500/40 flex items-center justify-center">
                          {enrollStep === "IDLE" ? (
                            <div className="text-center text-zinc-500 p-4">
                              <Camera className="h-12 w-12 mx-auto mb-2 text-zinc-700" />
                              <p className="text-xs font-mono font-bold">DEVICE STANDBY</p>
                            </div>
                          ) : enrollStep === "SUCCESS" ? (
                            <div className="text-center text-emerald-400 p-4 animate-fade-in">
                              <CheckCircle className="h-16 w-16 mx-auto mb-2 text-emerald-400" />
                              <p className="text-xs font-mono font-bold uppercase tracking-wider">Face Registered</p>
                              <p className="text-[9px] text-zinc-500 font-mono mt-1">{tl("encryptionMsg")}</p>
                            </div>
                          ) : (
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-900 text-left relative">
                              {/* Simulated face outline helper overlay */}
                              <div className="absolute inset-4 rounded-full border border-dashed border-purple-500/40 animate-pulse pointer-events-none" />
                              
                              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 z-10">
                                <span>3D Scanner Active</span>
                                <span>Step: {enrollStep}</span>
                              </div>

                              <div className="my-auto text-center z-10">
                                <Cpu className="h-8 w-8 text-purple-400 mx-auto mb-1 animate-spin" />
                                <p className="text-xs font-mono text-purple-300 font-black tracking-wider uppercase">Scanning Face</p>
                                <p className="text-[10px] text-emerald-400 font-bold mt-1 animate-pulse">{verificationFeedback}</p>
                              </div>

                              {/* Challenge indicator graphic */}
                              <div className="flex justify-center mb-1 z-10">
                                <span className="px-3 py-1 bg-purple-950/80 border border-purple-500/35 rounded-lg font-mono text-[9px] font-bold text-purple-200 uppercase tracking-widest">
                                  {enrollProgress}% Scanned
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Scan Progress Bar */}
                        {enrollStep !== "IDLE" && enrollStep !== "SUCCESS" && (
                          <div className="w-full max-w-md space-y-1">
                            <div className="flex justify-between text-[10px] font-bold font-mono text-muted-foreground">
                              <span>Challenge progress</span>
                              <span>{enrollProgress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden w-full border border-border/20">
                              <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${enrollProgress}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          {enrollStep === "IDLE" ? (
                            <Button 
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl border-none cursor-pointer"
                              onClick={() => handleStartEnrollment(selectedStudent)}
                            >
                              Initialize Face ID Scan
                            </Button>
                          ) : enrollStep === "SUCCESS" ? (
                            <Button 
                              variant="outline"
                              className="border-border text-xs rounded-xl h-10 px-6 cursor-pointer"
                              onClick={() => setEnrollStep("IDLE")}
                            >
                              Reset Scanner
                            </Button>
                          ) : (
                            <>
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl border-none cursor-pointer"
                                onClick={advanceEnrollStep}
                              >
                                {enrollStep === "LIVENESS_BLINK" ? "Complete Scan" : "Next Angle Challenge ➔"}
                              </Button>
                              <Button 
                                variant="outline"
                                className="border-border text-xs rounded-xl h-10 px-6 cursor-pointer"
                                onClick={() => setEnrollStep("IDLE")}
                              >
                                {tl("cancel")}
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-12 text-center bg-card border border-border rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-3">
                        <Users className="h-10 w-10 text-muted-foreground" />
                        <h4 className="text-sm font-extrabold">No Student Selected</h4>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                          Select a student from the directory on the left to begin the face enrollment challenge-response process.
                        </p>
                      </Card>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* VIEW TAB: ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Classroom Emotion analysis */}
                  <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                      Classroom Emotion Breakdown
                    </h3>
                    <div className="h-[220px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={emotionData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={50} 
                            outerRadius={80} 
                            paddingAngle={5} 
                            dataKey="value"
                          >
                            {emotionData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Sleep and Phone Usage Alerts */}
                  <Card className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                      Sleep Detection & Phone Usage Trends
                    </h3>
                    <div className="h-[220px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={engagementTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                          <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                          <ChartTooltip />
                          <Bar dataKey="phoneUsage" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Phone Detections" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                </div>

              </div>
            )}

            {/* VIEW TAB: SETTINGS & IP PAIRING */}
            {activeTab === "settings" && (
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* QR CODE MOBILE PAIRING SECTION */}
                <Card className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-widest pb-3 border-b border-border">
                    <QrCode className="h-4.5 w-4.5 text-purple-500" /> {tl("pairingTitle")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    
                    {/* QR Code Graphic Area */}
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/30 border border-border rounded-2xl min-h-[220px]">
                      {isPhonePaired ? (
                        <>
                          <div className="h-32 w-32 bg-white p-2 rounded-xl flex items-center justify-center border-4 border-purple-500">
                            {/* Simple simulated QR blocks */}
                            <div className="grid grid-cols-4 gap-2 w-full h-full">
                              <div className="bg-black rounded"></div><div className="bg-black rounded"></div><div className="bg-zinc-200 rounded"></div><div className="bg-black rounded"></div>
                              <div className="bg-zinc-200 rounded"></div><div className="bg-black rounded"></div><div className="bg-black rounded"></div><div className="bg-zinc-200 rounded"></div>
                              <div className="bg-black rounded"></div><div className="bg-zinc-200 rounded"></div><div className="bg-black rounded"></div><div className="bg-black rounded"></div>
                              <div className="bg-black rounded"></div><div className="bg-black rounded"></div><div className="bg-zinc-200 rounded"></div><div className="bg-black rounded"></div>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase mt-3">Mobile stream authenticated</span>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold font-mono">NO ACTIVE TOKEN</p>
                        </div>
                      )}
                    </div>

                    {/* Instruction Manual */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Step 1: Get LMSHub Mobile app</h4>
                        <p className="text-xs text-muted-foreground leading-normal">
                          Install the LMSHub Mobile app on an iOS or Android device. Navigate to "Camera Gateway mode" inside settings.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Step 2: Generate Pairing Code</h4>
                        <p className="text-xs text-muted-foreground leading-normal">
                          Scan the generated QR Code using the device's camera. This creates an end-to-end WebRTC secure stream tunnel.
                        </p>
                      </div>

                      <div className="pt-2">
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-10 px-6 border-none cursor-pointer"
                          onClick={handleGenerateMobilePairing}
                          disabled={isGeneratingPairing}
                        >
                          {isGeneratingPairing ? "Generating..." : "Generate Pairing QR Code"}
                        </Button>
                      </div>
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
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-foreground">Match Threshold: <span className="font-mono text-purple-500 font-black">{recognitionThreshold}</span></label>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="0.99" 
                          step="0.01" 
                          value={recognitionThreshold} 
                          onChange={(e) => setRecognitionThreshold(parseFloat(e.target.value))} 
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600 border border-border" 
                        />
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Cosine similarity verification filter. Higher value avoids false identification.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground block">Scan Cooldown Interval (sec)</label>
                        <input 
                          type="number" 
                          value={snapshotInterval} 
                          onChange={(e) => setSnapshotInterval(parseInt(e.target.value))} 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" 
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider pb-2 border-b border-border flex items-center gap-1.5">
                      <Activity className="h-4.5 w-4.5 text-purple-500" /> Lateness Rules
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground block">Late Arrival Limit (minutes)</label>
                        <input 
                          type="number" 
                          value={lateMinutesLimit} 
                          onChange={(e) => setLateMinutesLimit(parseInt(e.target.value))} 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" 
                        />
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Entering the classroom after this grace period will mark the status as 'LATE'.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-foreground">Min Attendance Score: <span className="font-mono text-purple-500 font-black">{minAttendancePercent}%</span></label>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="95" 
                          step="5" 
                          value={minAttendancePercent} 
                          onChange={(e) => setMinAttendancePercent(parseInt(e.target.value))} 
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600 border border-border" 
                        />
                      </div>
                    </div>
                  </Card>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="border-t border-border mt-auto py-6 bg-muted/20 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <span>LMSHub Enterprise AI Attendance & Safety Core Engine v2.0.4-PROD</span>
          <span>Scalability Target: 1,000 Classrooms / 10,000 concurrent student scans</span>
        </div>
      </footer>
    </div>
  );
}
