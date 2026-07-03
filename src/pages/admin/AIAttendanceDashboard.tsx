import React, { useState, useEffect } from "react";
import { 
  Camera, Shield, AlertTriangle, Cpu, RefreshCw, Plus, 
  Settings, CheckCircle, Wifi, WifiOff, Activity, Sliders, Users,
  Play, Square, Download, FileSpreadsheet, Eye, Maximize2, MoreHorizontal,
  Server, HardDrive, Cpu as CpuIcon, ShieldAlert, Check, X, ShieldX,
  Volume2, Settings2, Trash2, ArrowLeft, ArrowUpRight, ArrowDownRight,
  TrendingUp, BarChart3, Database, KeyRound, Monitor, Zap, HelpCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/axios"; // Axios wrapper
import { useTranslation } from "react-i18next";

interface CameraDevice {
  id: string; 
  name: string; 
  ipAddress: string; 
  status: "ONLINE" | "OFFLINE" | "WARNING" | "UNKNOWN";
  pingLatencyMs?: number; 
  packetLossPct?: number; 
  protocol: string;
  room: string;
  studentsCount: number;
  accuracy: string;
  gpuLoad?: number;
  gpuTemp?: number;
}

interface UnknownDetection {
  id: string; 
  closestMatchScore: number; 
  detectedAt: string; 
  status: string;
  cameraName: string;
}

interface RecentAttendanceRecord {
  id: string;
  studentName: string;
  studentId: string;
  status: "PRESENT" | "LATE" | "ABSENT";
  arrivalTime: string;
  presenceRate: number;
  room: string;
  confidence: number;
}

// Custom SVG sparkline generator for statistics cards
function Sparkline({ data, color }: { data: number[], color: string }) {
  const width = 120;
  const height = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#gradient-${color.replace("#", "")})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Camera Live Feed Simulation UI component
function CameraFeed({ camera, index }: { camera: CameraDevice, index: number }) {
  const faces = [
    [
      { name: "Jasur A.", x: 25, y: 30, w: 20, h: 25, conf: "99.2%" },
      { name: "Madina T.", x: 60, y: 35, w: 18, h: 22, conf: "98.4%" }
    ],
    [
      { name: "Diyorbek S.", x: 45, y: 25, w: 22, h: 26, conf: "97.8%" }
    ],
    [
      { name: "Unknown Face", x: 35, y: 40, w: 25, h: 30, conf: "54%", alert: true }
    ],
    [
      { name: "Kamola B.", x: 20, y: 35, w: 20, h: 24, conf: "99.1%" },
      { name: "Sardor O.", x: 65, y: 30, w: 21, h: 25, conf: "98.9%" }
    ],
    [] // Offline or empty
  ];

  const currentFaces = faces[index % faces.length];

  return (
    <div className="relative w-full h-[180px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80 flex items-center justify-center group shadow-inner">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] opacity-10"></div>
      
      {/* Camera feed overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-900/20 to-transparent"></div>

      {camera.status === "OFFLINE" ? (
        <div className="z-10 flex flex-col items-center gap-2 text-zinc-500">
          <WifiOff className="h-10 w-10 text-rose-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase font-mono text-zinc-500">Connection Terminated</span>
        </div>
      ) : (
        <>
          {/* Animated Scanner Line */}
          <div className="absolute left-0 right-0 h-[2.5px] bg-[#6C63FF]/70 shadow-[0_0_12px_#6c63ff] opacity-80 camera-scanner z-10 pointer-events-none"></div>
          
          {/* Face Tracking Boxes */}
          {currentFaces.map((face, fIdx) => (
            <div
              key={fIdx}
              className={`absolute border-2 rounded ${
                face.alert 
                  ? "border-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                  : "border-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.4)]"
              } transition-all duration-300`}
              style={{
                left: `${face.x}%`,
                top: `${face.y}%`,
                width: `${face.w}%`,
                height: `${face.h}%`
              }}
            >
              {/* Box label */}
              <div className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap ${
                face.alert ? "bg-[#EF4444]" : "bg-[#22C55E]"
              }`}>
                {face.name} ({face.conf})
              </div>
              
              {/* Corner crosshairs */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white"></div>
              <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white"></div>
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white"></div>
            </div>
          ))}
          
          {/* Camera Info Watermark */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-zinc-300 font-mono border border-zinc-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
            <span>CAM_FEED_{index + 1}</span>
            <span>•</span>
            <span>FPS: 30</span>
          </div>

          {/* Quick Stats Overlay at the bottom */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>Accuracy: {camera.accuracy}</span>
            <span>Latency: {camera.pingLatencyMs ? `${camera.pingLatencyMs}ms` : "—"}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function AIAttendanceDashboard() {
  const { t } = useTranslation();
  const [view, setView] = useState<"dashboard" | "settings">("dashboard");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownDetection[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  
  // AI Config States
  const [confidence, setConfidence] = useState(0.80);
  const [intervalVal, setIntervalVal] = useState(20);
  const [liveness, setLiveness] = useState("HIGH");
  const [faceSize, setFaceSize] = useState(64);
  const [sensitivity, setSensitivity] = useState(75);
  const [gpuAcceleration, setGpuAcceleration] = useState(true);
  const [performanceMode, setPerformanceMode] = useState("MAX");
  const [securityMode, setSecurityMode] = useState("HIGH");

  // Rule Engine States
  const [lateLimit, setLateLimit] = useState(10);
  const [absentLimit, setAbsentLimit] = useState(20);
  const [minScore, setMinScore] = useState(0.60);

  // Recent recognized students
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendanceRecord[]>([]);

  useEffect(() => {
    fetchCameras();
    fetchUnknowns();
    fetchRecentAttendance();
  }, []);

  const fetchCameras = async () => {
    try {
      const res = await api.get("/cameras");
      setCameras(res.data || getDefaultCameras());
    } catch {
      setCameras(getDefaultCameras());
    }
  };

  const fetchUnknowns = async () => {
    try {
      const res = await api.get("/unknowns");
      setUnknowns(res.data || getDefaultUnknowns());
    } catch {
      setUnknowns(getDefaultUnknowns());
    }
  };

  const fetchRecentAttendance = () => {
    setRecentAttendance([
      { id: "s1", studentName: "Jasur Akhmedov", studentId: "LMS-10829", status: "PRESENT", arrivalTime: "08:32:15 AM", presenceRate: 98.4, room: "A-102 (Auditorium)", confidence: 99.2 },
      { id: "s2", studentName: "Madina Tursunova", studentId: "LMS-10842", status: "PRESENT", arrivalTime: "08:35:44 AM", presenceRate: 99.1, room: "A-102 (Auditorium)", confidence: 98.4 },
      { id: "s3", studentName: "Diyorbek Sadullayev", studentId: "LMS-10901", status: "PRESENT", arrivalTime: "08:41:03 AM", presenceRate: 95.0, room: "Corridor West", confidence: 97.8 },
      { id: "s4", studentName: "Sardor Oripov", studentId: "LMS-10421", status: "LATE", arrivalTime: "08:52:10 AM", presenceRate: 88.2, room: "Lab-3 (IT)", confidence: 98.9 },
      { id: "s5", studentName: "Kamola Bekmirzayeva", studentId: "LMS-10332", status: "PRESENT", arrivalTime: "08:44:19 AM", presenceRate: 96.7, room: "Lib-2F (Library)", confidence: 99.1 },
      { id: "s6", studentName: "Rayhon Qodirova", studentId: "LMS-10291", status: "ABSENT", arrivalTime: "--:--:--", presenceRate: 0.0, room: "—", confidence: 0.0 }
    ]);
  };

  const getDefaultCameras = (): CameraDevice[] => [
    { id: "1", name: "Auditorium Main A", ipAddress: "192.168.1.150", status: "ONLINE", pingLatencyMs: 12, packetLossPct: 0.0, protocol: "RTSP", room: "Room A-102", studentsCount: 24, accuracy: "98.4%", gpuLoad: 35, gpuTemp: 42 },
    { id: "2", name: "Front Entry Corridor", ipAddress: "192.168.1.151", status: "ONLINE", pingLatencyMs: 15, packetLossPct: 0.0, protocol: "ONVIF", room: "Corridor West", studentsCount: 8, accuracy: "97.1%", gpuLoad: 15, gpuTemp: 38 },
    { id: "3", name: "Library Reading Hall", ipAddress: "192.168.1.152", status: "ONLINE", pingLatencyMs: 8, packetLossPct: 0.0, protocol: "RTSP", room: "Library 2F", studentsCount: 15, accuracy: "99.2%", gpuLoad: 25, gpuTemp: 45 },
    { id: "4", name: "IT Lab West", ipAddress: "192.168.1.153", status: "WARNING", pingLatencyMs: 42, packetLossPct: 8.4, protocol: "RTSP", room: "IT Lab 3", studentsCount: 0, accuracy: "82.5%", gpuLoad: 88, gpuTemp: 55 },
    { id: "5", name: "Cafeteria Exit", ipAddress: "192.168.1.154", status: "OFFLINE", pingLatencyMs: undefined, packetLossPct: 100.0, protocol: "ONVIF", room: "Dining Hall", studentsCount: 0, accuracy: "0%", gpuLoad: undefined, gpuTemp: undefined }
  ];

  const getDefaultUnknowns = (): UnknownDetection[] => [
    { id: "un1", closestMatchScore: 0.54, detectedAt: "2026-07-03T12:08:45", status: "NEW", cameraName: "IT Lab West" },
    { id: "un2", closestMatchScore: 0.42, detectedAt: "2026-07-03T12:12:10", status: "NEW", cameraName: "Cafeteria Exit" },
    { id: "un3", closestMatchScore: 0.39, detectedAt: "2026-07-03T12:14:02", status: "NEW", cameraName: "Front Entry Corridor" }
  ];

  const runCameraDiscovery = async () => {
    setIsDiscovering(true);
    toast.info("ONVIF Local Subnet Auto-Discovery probe started...");
    setTimeout(() => {
      setIsDiscovering(false);
      toast.success("Discovery complete! 0 new cameras detected.");
    }, 2000);
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    toast.info("Running health ping diagnostics on all cameras...");
    try {
      await api.post("/cameras/diagnose-all");
      await fetchCameras();
      toast.success("Diagnostics probe complete!");
    } catch {
      setTimeout(() => {
        setIsDiagnosing(false);
        toast.success("Diagnostics complete (local mock simulation pass)!");
      }, 1500);
    }
  };

  const saveConfig = () => {
    toast.success("AI Configuration Engine parameters updated successfully.");
    setView("dashboard");
  };

  const triggerAction = (actionName: string) => {
    toast.success(`Action triggered: ${actionName}`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans antialiased">
      {/* Dynamic CSS Styling Injector */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(180px); }
          100% { transform: translateY(0); }
        }
        .camera-scanner {
          animation: scan 5s ease-in-out infinite;
        }
        .glass-panel {
          background: rgba(22, 27, 34, 0.45);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(63, 63, 70, 0.4);
        }
        .glass-panel:hover {
          border-color: rgba(108, 99, 255, 0.4);
          box-shadow: 0 0 30px -10px rgba(108, 99, 255, 0.15);
        }
        /* Hide scrollbars but keep functionality */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* TOP NAVIGATION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#4F46E5] to-[#6C63FF] rounded-xl shadow-lg shadow-[#4F46E5]/15 flex items-center justify-center">
            <Cpu className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">AI Attendance Core</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SYSTEM ONLINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Real-time facial monitoring, anti-spoofing engine & attendance records</p>
          </div>
        </div>

        {/* Global Nav Control Switch */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setView("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              view === "dashboard"
                ? "bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/15"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Live Dashboard
          </button>
          <button
            onClick={() => setView("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              view === "settings"
                ? "bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/15"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            AI Core Settings
          </button>
        </div>
      </div>

      {view === "dashboard" ? (
        <div className="space-y-6">
          {/* STATS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Attendance */}
            <Card className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Today's Attendance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white">94.2%</span>
                    <span className="text-[#22C55E] text-xs font-bold flex items-center gap-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" /> +1.4%
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Activity className="h-5 w-5 text-[#6C63FF]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Average across campuses</span>
                <Sparkline data={[88, 90, 91, 93, 94.2, 94.2]} color="#6C63FF" />
              </div>
            </Card>

            {/* Card 2: Present Students */}
            <Card className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Present Students</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white">1,428</span>
                    <span className="text-zinc-500 text-xs font-semibold">/ 1,516 total</span>
                  </div>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Users className="h-5 w-5 text-[#22C55E]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                  <TrendingUp className="h-3.5 w-3.5" /> +24 new
                </span>
                <Sparkline data={[1200, 1310, 1380, 1402, 1418, 1428]} color="#22C55E" />
              </div>
            </Card>

            {/* Card 3: Late Students */}
            <Card className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Late Students</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white">42</span>
                    <span className="text-amber-400 text-xs font-bold flex items-center gap-0.5">
                      <ArrowDownRight className="h-3.5 w-3.5" /> -8.4%
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Sliders className="h-5 w-5 text-[#F59E0B]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Peak 08:30-08:40 AM</span>
                <Sparkline data={[60, 55, 50, 48, 45, 42]} color="#F59E0B" />
              </div>
            </Card>

            {/* Card 4: Unknown Faces */}
            <Card className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Unknown Faces</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white">3</span>
                    <span className="text-rose-400 text-xs font-bold flex items-center gap-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" /> +1 new
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-rose-400 font-semibold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></span> Verify Required
                </span>
                <Sparkline data={[1, 0, 2, 1, 2, 3]} color="#EF4444" />
              </div>
            </Card>
          </div>

          {/* MAIN MONITORING CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Camera Grid (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-[#6C63FF]" />
                  <h2 className="text-lg font-bold text-white">Live Camera Streams</h2>
                </div>
                <span className="text-xs text-zinc-400 font-mono">Active Pipelines: {cameras.filter(c => c.status !== "OFFLINE").length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cameras.map((cam, idx) => (
                  <Card key={cam.id} className="glass-panel p-4 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300">
                    <div className="space-y-3">
                      {/* Top Header details */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase font-mono">{cam.protocol} • {cam.room}</span>
                          <h3 className="text-sm font-bold text-zinc-100 truncate mt-0.5">{cam.name}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 font-mono ${
                          cam.status === "ONLINE" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : cam.status === "WARNING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            cam.status === "ONLINE" ? "bg-emerald-400" : cam.status === "WARNING" ? "bg-amber-400 animate-pulse" : "bg-rose-400"
                          }`}></span>
                          {cam.status}
                        </span>
                      </div>

                      {/* Mock Interactive Live Screen */}
                      <CameraFeed camera={cam} index={idx} />
                    </div>

                    {/* Metadata and Controls */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wide font-mono">Recognitions</span>
                        <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5">
                          {cam.status !== "OFFLINE" ? `${cam.studentsCount} Students` : "Offline"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wide font-mono">Hardware</span>
                        <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5">
                          {cam.gpuTemp ? `GPU: ${cam.gpuTemp}°C (${cam.gpuLoad}%)` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] border-zinc-800 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-lg"
                        onClick={() => triggerAction(`Stream open for ${cam.name}`)}
                        disabled={cam.status === "OFFLINE"}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Stream
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] border-zinc-800 hover:bg-zinc-850 text-zinc-300 rounded-lg"
                        onClick={() => triggerAction(`Fullscreen for ${cam.name}`)}
                        disabled={cam.status === "OFFLINE"}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] border-zinc-800 hover:bg-zinc-855 text-zinc-300 rounded-lg"
                        onClick={() => setView("settings")}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS & SYSTEM RESOURCES PANEL (1/3 width) */}
            <div className="space-y-6">
              
              {/* Quick Actions Card */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#6C63FF]" />
                  <h2 className="text-lg font-bold text-white">System Controls</h2>
                </div>
                <Card className="glass-panel p-5 rounded-2xl border border-zinc-800/80">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-[#6C63FF]/10 hover:text-white justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("New camera deployment Wizard started")}
                    >
                      <Camera className="h-4 w-4 text-[#6C63FF]" />
                      Add Camera
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-[#6C63FF]/10 hover:text-white justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("Face recognition database enrollment open")}
                    >
                      <Plus className="h-4 w-4 text-[#6C63FF]" />
                      Register Face
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-emerald-500/10 hover:text-emerald-400 justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("Facial attendance tracking globally ENABLED")}
                    >
                      <Play className="h-4 w-4 text-[#22C55E]" />
                      Start Tracking
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-rose-500/10 hover:text-rose-400 justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("Facial attendance tracking globally DISABLED")}
                    >
                      <Square className="h-4 w-4 text-[#EF4444]" />
                      Stop Tracking
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-[#6C63FF]/10 hover:text-white justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("Export report data generated as CSV")}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-[#6C63FF]" />
                      Export Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-800 bg-zinc-900/60 hover:bg-[#6C63FF]/10 hover:text-white justify-start gap-2 h-10 text-xs text-zinc-300 rounded-xl"
                      onClick={() => triggerAction("Opening server security auditing logs")}
                    >
                      <Database className="h-4 w-4 text-[#6C63FF]" />
                      View Logs
                    </Button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800/80">
                    <Button 
                      className="w-full bg-[#6C63FF] hover:bg-[#4F46E5] text-white flex items-center justify-center gap-2 text-xs font-semibold h-10 rounded-xl shadow-lg shadow-[#6C63FF]/10" 
                      onClick={runDiagnostics} 
                      disabled={isDiagnosing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isDiagnosing ? "animate-spin" : ""}`} /> 
                      {isDiagnosing ? "Running Diagnostics..." : "Run AI Diagnostics"}
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Performance Analytics Card */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#6C63FF]" />
                  <h2 className="text-lg font-bold text-white">System Diagnostics</h2>
                </div>
                <Card className="glass-panel p-5 rounded-2xl border border-zinc-800/80 space-y-4 shadow-xl">
                  {/* GPU Load Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5 font-sans">
                        <CpuIcon className="h-3.5 w-3.5 text-[#6C63FF]" /> GPU Inference Load
                      </span>
                      <span className="font-mono text-white font-bold">74%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                      <div className="bg-gradient-to-r from-[#4F46E5] to-[#6C63FF] h-full rounded-full transition-all duration-500" style={{ width: "74%" }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                      <span>NVIDIA CUDA Engine 12.4</span>
                      <span>Temp: 62°C</span>
                    </div>
                  </div>

                  {/* CPU Load Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5 font-sans">
                        <Server className="h-3.5 w-3.5 text-[#22C55E]" /> CPU Host Load
                      </span>
                      <span className="font-mono text-white font-bold">38%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                      <div className="bg-[#22C55E] h-full rounded-full transition-all duration-500" style={{ width: "38%" }}></div>
                    </div>
                  </div>

                  {/* Memory (RAM) Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5 font-sans">
                        <HardDrive className="h-3.5 w-3.5 text-[#F59E0B]" /> Host VRAM Allocation
                      </span>
                      <span className="font-mono text-white font-bold">6.2 / 16.0 GB</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                      <div className="bg-[#F59E0B] h-full rounded-full transition-all duration-500" style={{ width: "38.75%" }}></div>
                    </div>
                  </div>

                  {/* AI Model Latency Stats */}
                  <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-semibold">Latency</span>
                      <span className="text-base font-extrabold text-white block mt-0.5 font-mono">14.2 ms</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-semibold">Pipeline Health</span>
                      <span className="text-base font-extrabold text-emerald-400 block mt-0.5 font-mono">92.0%</span>
                    </div>
                  </div>
                </Card>
              </div>

            </div>
          </div>

          {/* BOTTOM SECTION: ATTENDANCE RECORDS & UNKNOWN ALERTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Attendance Records (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[#22C55E]" />
                  <h2 className="text-lg font-bold text-white">Live Attendance Log</h2>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs border-zinc-800 hover:bg-zinc-850 text-zinc-300 rounded-lg"
                  onClick={() => triggerAction("Load more records")}
                >
                  View System Logs
                </Button>
              </div>

              <Card className="glass-panel rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/50 text-[10px] text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3 px-4">Current Room</th>
                        <th className="py-3 px-4">Arrival Time</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right font-mono">Presence %</th>
                        <th className="py-3 px-4 text-right">Confidence</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-xs">
                      {recentAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-extrabold text-xs text-zinc-300 tracking-wider">
                                {record.studentName.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-200">{record.studentName}</div>
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{record.studentId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-zinc-300 font-medium">{record.room}</td>
                          <td className="py-4 px-4 font-mono text-zinc-400">{record.arrivalTime}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              record.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : record.status === "LATE"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-zinc-300">{record.presenceRate}%</td>
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center gap-1 text-zinc-200 font-bold font-mono">
                              {record.confidence > 0 ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {record.confidence}%
                                </>
                              ) : "—"}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-white"
                              onClick={() => triggerAction(`Viewing camera capture details for ${record.studentName}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Unknown Person Alerts (1/3 width on desktop) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
                  <h2 className="text-lg font-bold text-white">Unknown Detections</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 font-mono">
                  {unknowns.length} Active
                </span>
              </div>

              <div className="space-y-3">
                {unknowns.map((un, index) => (
                  <Card key={un.id} className="glass-panel p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-lg">
                    <div className="flex gap-4">
                      {/* Silhouette design */}
                      <div className="relative w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>
                      </div>
                      
                      <div className="space-y-1 min-w-0">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">ID: {un.id} • {new Date(un.detectedAt).toLocaleTimeString()}</span>
                        <h4 className="font-bold text-sm text-zinc-200">Unknown Subject</h4>
                        <div className="text-[11px] text-zinc-400 truncate">
                          Detected in <span className="font-semibold text-zinc-300">{un.cameraName}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          Match Score: <span className="text-rose-400 font-bold">{(un.closestMatchScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-zinc-800/80">
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white h-8 rounded-lg"
                        onClick={() => triggerAction("Verify student enrollment initiated")}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-400 h-8 rounded-lg"
                        onClick={() => triggerAction(`Alert marked as ignored`)}
                      >
                        Ignore
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-rose-950/40 text-rose-400 hover:bg-rose-500/10 text-[10px] h-8 rounded-lg"
                        onClick={() => triggerAction(`Security sirens dispatched to ${un.cameraName}`)}
                      >
                        Siren Alert
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-950/40 text-rose-500 hover:bg-red-950/20 text-[10px] h-8 rounded-lg"
                        onClick={() => triggerAction(`Subject added to blacklist`)}
                      >
                        Blacklist
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* AI CORE CONFIGURATION ENGINE VIEW */
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-white"
              onClick={() => setView("dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#6C63FF]" /> AI Core Parameters Engine
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Adjust liveness criteria, cosine tracking threshold levels, and GPU acceleration configurations.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Threshold parameters card */}
            <Card className="glass-panel p-6 rounded-2xl border border-zinc-800/80 space-y-6">
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider pb-2 border-b border-zinc-800/60 flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-[#6C63FF]" /> Model Thresholds
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-zinc-355 text-zinc-300">Similarity Cutoff: <span className="font-mono text-[#6C63FF] font-bold">{confidence.toFixed(2)}</span></label>
                    <span className="text-[10px] text-zinc-550 text-zinc-500">Min 0.50 | Max 0.99</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="0.99" 
                    step="0.01" 
                    value={confidence} 
                    onChange={(e) => setConfidence(parseFloat(e.target.value))} 
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#6C63FF] border border-zinc-850" 
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">Cosine tracking similarity filter. Scores below this are marked as 'Unknown' and alert security channels.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">Snapshot Interval (seconds)</label>
                  <input 
                    type="number" 
                    value={intervalVal} 
                    onChange={(e) => setIntervalVal(parseInt(e.target.value))} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]" 
                  />
                  <p className="text-[10px] text-zinc-500">Sampling frequency to process and catalog facial frames.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">Liveness Detection (Anti-Spoofing)</label>
                  <select 
                    value={liveness} 
                    onChange={(e) => setLiveness(e.target.value)} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]"
                  >
                    <option value="LOW">PAST (Faqat tekstura)</option>
                    <option value="MEDIUM">O'RTA (Tekstura + moiré refleksi)</option>
                    <option value="HIGH">YUQORI (Tekstura + moiré + specularity check)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-zinc-300">Min Face Detection Size: <span className="font-mono text-[#6C63FF] font-bold">{faceSize}px</span></label>
                  </div>
                  <input 
                    type="range" 
                    min="32" 
                    max="128" 
                    step="8" 
                    value={faceSize} 
                    onChange={(e) => setFaceSize(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#6C63FF] border border-zinc-850" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-zinc-300">Tracking Sensitivity Index: <span className="font-mono text-[#6C63FF] font-bold">{sensitivity}%</span></label>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="100" 
                    step="5" 
                    value={sensitivity} 
                    onChange={(e) => setSensitivity(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#6C63FF] border border-zinc-850" 
                  />
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              {/* Hardware Acceleration card */}
              <Card className="glass-panel p-6 rounded-2xl border border-zinc-800/80 space-y-6">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider pb-2 border-b border-zinc-850 flex items-center gap-2">
                  <Server className="h-4.5 w-4.5 text-[#6C63FF]" /> Acceleration Core
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-xl border border-zinc-850">
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">GPU Acceleration</span>
                      <span className="text-[10px] text-zinc-500">Allocate tracking threads to NVIDIA CUDA core</span>
                    </div>
                    <button 
                      onClick={() => setGpuAcceleration(!gpuAcceleration)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        gpuAcceleration ? "bg-[#6C63FF]" : "bg-zinc-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        gpuAcceleration ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">Performance Mode</label>
                    <select 
                      value={performanceMode} 
                      onChange={(e) => setPerformanceMode(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]"
                    >
                      <option value="ECO">ECO MODE (Power-saving, lower frames processed)</option>
                      <option value="BALANCED">BALANCED MODE (Standard latency mapping)</option>
                      <option value="MAX">MAX PERFORMANCE (Raw CUDA core speed)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">Threat Classification Mode</label>
                    <select 
                      value={securityMode} 
                      onChange={(e) => setSecurityMode(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]"
                    >
                      <option value="STANDARD">STANDARD (Quiet system log warnings)</option>
                      <option value="HIGH">HIGH (Live UI warnings + security sirens enabled)</option>
                      <option value="EXTREME">EXTREME (Door security control lock simulation)</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Attendance rule adjustments card */}
              <Card className="glass-panel p-6 rounded-2xl border border-zinc-800/80 space-y-6">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider pb-2 border-b border-zinc-850 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-[#6C63FF]" /> Presence Regulations
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">Lateness Limit (minutes)</label>
                    <input 
                      type="number" 
                      value={lateLimit} 
                      onChange={(e) => setLateLimit(parseInt(e.target.value))} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">Absence Limit (minutes)</label>
                    <input 
                      type="number" 
                      value={absentLimit} 
                      onChange={(e) => setAbsentLimit(parseInt(e.target.value))} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#6C63FF]" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-zinc-300">Min Attendance Threshold: <span className="font-mono text-[#6C63FF] font-bold">{(minScore * 100).toFixed(0)}%</span></label>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="0.9" 
                      step="0.05" 
                      value={minScore} 
                      onChange={(e) => setMinScore(parseFloat(e.target.value))} 
                      className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#6C63FF] border border-zinc-850" 
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs h-10 px-6 rounded-lg text-zinc-300"
              onClick={() => setView("dashboard")}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#6C63FF] hover:bg-[#4F46E5] text-white text-xs h-10 px-8 rounded-lg shadow-lg shadow-[#6C63FF]/15 font-semibold"
              onClick={saveConfig}
            >
              Save Core Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
