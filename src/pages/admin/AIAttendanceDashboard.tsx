import React, { useState, useEffect } from "react";
import { 
  Camera, Shield, AlertTriangle, Cpu, RefreshCw, Plus, 
  Settings, CheckCircle, Wifi, WifiOff, Activity, Sliders, Users,
  Play, Square, Download, FileSpreadsheet, Eye, Maximize2, MoreHorizontal,
  Server, HardDrive, ShieldAlert, Check, X, ShieldX,
  Volume2, Settings2, Trash2, ArrowLeft, ArrowUpRight, ArrowDownRight,
  TrendingUp, BarChart3, Database, KeyRound, Monitor, Zap, HelpCircle,
  Lock, EyeOff, Search, ChevronLeft, ChevronRight, FileDown, LockIcon, AlertCircle, Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/axios"; // Axios wrapper
import { useTranslation } from "react-i18next";

// Roles
type UserRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "SECURITY" | "RECEPTION";

// REST API States
type ApiState = "SUCCESS" | "LOADING" | "EMPTY" | "ERROR" | "OFFLINE" | "FORBIDDEN";

interface CameraDevice {
  id: string; 
  name: string; 
  ipAddress: string; 
  status: "ONLINE" | "OFFLINE" | "WARNING";
  protocol: "RTSP" | "ONVIF";
  room: string;
  studentsCount: number;
  lastDetectionTime: string;
}

interface UnknownDetection {
  id: string; 
  detectedAt: string; 
  cameraName: string;
  room: string;
  confidence: number;
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
}

export default function AIAttendanceDashboard() {
  const { t } = useTranslation();
  
  // Role & API State Simulator (For production demo & testing)
  const [currentRole, setCurrentRole] = useState<UserRole>("SUPER_ADMIN");
  const [apiState, setApiState] = useState<ApiState>("SUCCESS");
  const [showDevControls, setShowDevControls] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "cameras" | "history" | "unknowns" | "settings">("dashboard");

  // Core Data Lists
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownDetection[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Filtering, Searching & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "LATE" | "ABSENT">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // AI Configuration Parameters (User-friendly and realistic)
  const [recognitionThreshold, setRecognitionThreshold] = useState(0.80);
  const [snapshotInterval, setSnapshotInterval] = useState(10);
  const [lateMinutesLimit, setLateMinutesLimit] = useState(15);
  const [minAttendancePercent, setMinAttendancePercent] = useState(70);

  // Form submission and action loading states
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [isAttendanceRunning, setIsAttendanceRunning] = useState(false);

  // Load production-aligned mock data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Attempt real API fetches with fallback to clean mock data
    try {
      const camRes = await api.get("/cameras");
      setCameras(camRes.data || getMockCameras());
    } catch {
      setCameras(getMockCameras());
    }

    try {
      const unkRes = await api.get("/unknowns");
      setUnknowns(unkRes.data || getMockUnknowns());
    } catch {
      setUnknowns(getMockUnknowns());
    }

    setAttendance(getMockAttendance());
  };

  // Mock Generators
  const getMockCameras = (): CameraDevice[] => [
    { id: "cam-1", name: "Main Entrance", ipAddress: "192.168.10.51", status: "ONLINE", protocol: "ONVIF", room: "Foyer Hall", studentsCount: 14, lastDetectionTime: "12:35:10 PM" },
    { id: "cam-2", name: "Lecture Hall A Camera", ipAddress: "192.168.10.52", status: "ONLINE", protocol: "RTSP", room: "Auditorium 102", studentsCount: 38, lastDetectionTime: "12:34:45 PM" },
    { id: "cam-3", name: "IT Lab West Camera", ipAddress: "192.168.10.53", status: "ONLINE", protocol: "RTSP", room: "Lab 305", studentsCount: 22, lastDetectionTime: "12:32:15 PM" },
    { id: "cam-4", name: "Library Corridor", ipAddress: "192.168.10.54", status: "WARNING", protocol: "ONVIF", room: "Library 2F", studentsCount: 0, lastDetectionTime: "12:20:00 PM" },
    { id: "cam-5", name: "Physics Lab South", ipAddress: "192.168.10.55", status: "OFFLINE", protocol: "RTSP", room: "Lab 108", studentsCount: 0, lastDetectionTime: "—" }
  ];

  const getMockUnknowns = (): UnknownDetection[] => [
    { id: "unk-101", detectedAt: "12:24:05 PM", cameraName: "Main Entrance", room: "Foyer Hall", confidence: 54 },
    { id: "unk-102", detectedAt: "12:15:30 PM", cameraName: "Library Corridor", room: "Library 2F", confidence: 42 },
    { id: "unk-103", detectedAt: "11:58:12 AM", cameraName: "Physics Lab South", room: "Lab 108", confidence: 38 }
  ];

  const getMockAttendance = (): AttendanceRecord[] => [
    { id: "att-1", studentName: "Jasur Akhmedov", studentId: "LMS-10829", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:32 AM", status: "PRESENT", presenceRate: 98 },
    { id: "att-2", studentName: "Madina Tursunova", studentId: "LMS-10842", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:35 AM", status: "PRESENT", presenceRate: 99 },
    { id: "att-3", studentName: "Diyorbek Sadullayev", studentId: "LMS-10901", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:41 AM", status: "PRESENT", presenceRate: 95 },
    { id: "att-4", studentName: "Sardor Oripov", studentId: "LMS-10421", faculty: "Computer Science", groupName: "CS-202", room: "Lab 305", arrivalTime: "08:52 AM", status: "LATE", presenceRate: 88 },
    { id: "att-5", studentName: "Kamola Bekmirzayeva", studentId: "LMS-10332", faculty: "Languages", groupName: "ENG-101", room: "Library 2F", arrivalTime: "08:44 AM", status: "PRESENT", presenceRate: 96 },
    { id: "att-6", studentName: "Rayhon Qodirova", studentId: "LMS-10291", faculty: "Computer Science", groupName: "CS-202", room: "Lab 305", arrivalTime: "—", status: "ABSENT", presenceRate: 74 },
    { id: "att-7", studentName: "Bobur Karimov", studentId: "LMS-10512", faculty: "Computer Science", groupName: "CS-204", room: "Auditorium 102", arrivalTime: "08:31 AM", status: "PRESENT", presenceRate: 92 },
    { id: "att-8", studentName: "Aziza Vahobova", studentId: "LMS-10641", faculty: "Languages", groupName: "ENG-101", room: "Library 2F", arrivalTime: "09:05 AM", status: "LATE", presenceRate: 81 }
  ];

  // Helper for role access
  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(currentRole);
  };

  // API triggers simulation
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

  const handleExportReport = () => {
    setIsActionLoading("export");
    setTimeout(() => {
      setIsActionLoading(null);
      toast.success("Attendance log data exported successfully as CSV");
    }, 1000);
  };

  const handleCameraAction = (cameraName: string, action: string) => {
    toast.success(`Action: '${action}' processed for camera '${cameraName}'`);
  };

  const handleUnknownAction = (id: string, action: string) => {
    setIsActionLoading(id);
    setTimeout(() => {
      setIsActionLoading(null);
      setUnknowns(prev => prev.filter(u => u.id !== id));
      toast.success(`Unknown profile ID: ${id} marked as: ${action}`);
    }, 600);
  };

  const handleSaveSettings = () => {
    setIsActionLoading("settings");
    setTimeout(() => {
      setIsActionLoading(null);
      toast.success("AI Configuration Engine rules applied globally");
    }, 700);
  };

  // Filter and Paginate Attendance Records
  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ? true : record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
  const paginatedAttendance = filteredAttendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      
      {/* REST API STATE & ROLE SIMULATOR DECK */}
      {showDevControls && (
        <div className="bg-muted/80 backdrop-blur border-b border-border p-3 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-bold text-muted-foreground uppercase">Integration & Role Tester:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-muted-foreground">Active Role:</label>
              <select 
                value={currentRole} 
                onChange={(e) => {
                  setCurrentRole(e.target.value as UserRole);
                  toast.info(`Switched interface layout for role: ${e.target.value}`);
                }}
                className="bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                <option value="ADMIN">Admin (Ops & Hardware)</option>
                <option value="TEACHER">Teacher (Classes Only)</option>
                <option value="SECURITY">Security (Alerts & Feeds)</option>
                <option value="RECEPTION">Reception (View Only)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-muted-foreground">Spring Boot API State Simulation:</label>
              <select 
                value={apiState} 
                onChange={(e) => {
                  setApiState(e.target.value as ApiState);
                  toast.info(`Simulating backend response: ${e.target.value}`);
                }}
                className="bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="SUCCESS">Success (Operational)</option>
                <option value="LOADING">Loading (Skeletons)</option>
                <option value="EMPTY">Empty State (No Data)</option>
                <option value="ERROR">Error State (HTTP 500 / 503)</option>
                <option value="OFFLINE">Offline State (Connection Loss)</option>
                <option value="FORBIDDEN">Forbidden State (HTTP 403)</option>
              </select>
            </div>
          </div>
          <button 
            onClick={() => setShowDevControls(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-background/80 rounded p-1 font-bold"
            title="Hide simulator controls"
          >
            ✕
          </button>
        </div>
      )}

      {/* OFFLINE MODE BANNER */}
      {apiState === "OFFLINE" && (
        <div className="bg-destructive/15 text-destructive border-b border-destructive/20 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 animate-bounce" />
          No Network Connection Detected. Operating on local cache. Actions will queue until connection is restored.
        </div>
      )}

      {/* CORE WRAPPER */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* COMPACT BREADCRUMBS & SYSTEM STATE */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <span>Modules</span>
            <span>/</span>
            <span>Attendance</span>
            <span>/</span>
            <span className="text-foreground font-medium">AI Terminal</span>
          </div>
          {apiState === "SUCCESS" && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Pipeline Active
            </div>
          )}
        </div>

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Attendance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Real-time classroom attendance powered by neural face verification.</p>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            {/* Header controls depend on user permissions */}
            {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
              <>
                {isAttendanceRunning ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="h-9 px-4 rounded-xl gap-2 font-semibold shadow-sm text-xs"
                    onClick={handleStopAttendance}
                    disabled={isActionLoading !== null || apiState === "LOADING"}
                  >
                    {isActionLoading === "stop_att" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                    Stop Attendance
                  </Button>
                ) : (
                  <Button 
                    variant="default"
                    size="sm"
                    className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2 font-semibold shadow-sm text-xs"
                    onClick={handleStartAttendance}
                    disabled={isActionLoading !== null || apiState === "LOADING"}
                  >
                    {isActionLoading === "start_att" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Start Attendance
                  </Button>
                )}
              </>
            )}

            {hasAccess(["SUPER_ADMIN", "ADMIN"]) && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 px-4 rounded-xl gap-2 text-xs border-border bg-card hover:bg-accent text-foreground font-semibold"
                onClick={handleAddCamera}
                disabled={apiState === "LOADING"}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Camera
              </Button>
            )}

            {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 px-4 rounded-xl gap-2 text-xs border-border bg-card hover:bg-accent text-foreground font-semibold"
                onClick={handleExportReport}
                disabled={isActionLoading !== null || apiState === "LOADING"}
              >
                {isActionLoading === "export" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </Button>
            )}

            {!showDevControls && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 rounded-xl border border-border"
                onClick={() => setShowDevControls(true)}
                title="Show developer controls"
              >
                <Sliders className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* CORE NAV TABS */}
        <div className="flex border-b border-border overflow-x-auto no-scrollbar gap-1">
          {[
            { id: "dashboard", label: "Overview", icon: Monitor, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "SECURITY", "RECEPTION"] },
            { id: "cameras", label: "Cameras", icon: Camera, roles: ["SUPER_ADMIN", "ADMIN", "SECURITY"] },
            { id: "history", label: "Attendance Logs", icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
            { id: "unknowns", label: "Security Alerts", icon: AlertTriangle, roles: ["SUPER_ADMIN", "ADMIN", "SECURITY"] },
            { id: "settings", label: "AI Configurations", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN"] },
          ].map((tab) => {
            const Icon = tab.icon;
            // Only render tabs that the active role has access to
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
                className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap tracking-wide transition-all ${
                  activeTab === tab.id 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* RENDERING DYNAMIC INTEGRATION STATES (FORBIDDEN, ERROR, EMPTY, LOADING) */}
        {apiState === "FORBIDDEN" ? (
          <Card className="p-8 text-center bg-card border border-border rounded-2xl flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
            <div className="p-3 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
              <LockIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Permission Denied</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your role ({currentRole}) does not have permissions to access this dashboard feature. Contact the administrator to update permissions.
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl px-6 border-border" onClick={() => setCurrentRole("SUPER_ADMIN")}>
              Assume Super Admin Role
            </Button>
          </Card>
        ) : apiState === "ERROR" ? (
          <Card className="p-8 text-center bg-card border border-border rounded-2xl flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
            <div className="p-3 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Backend Connection Failed</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                The application could not reach the server at `/api/v1/attendance`. Spring Boot application may be down or database connectivity was lost.
              </p>
            </div>
            <Button variant="default" size="sm" className="rounded-xl px-6" onClick={() => { setApiState("SUCCESS"); loadData(); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Connection
            </Button>
          </Card>
        ) : apiState === "EMPTY" ? (
          <Card className="p-12 text-center bg-card border border-border rounded-2xl flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
            <div className="p-4 bg-muted rounded-full text-muted-foreground">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Configured Camera Streams</h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                Configure your first ONVIF or RTSP camera stream in the settings tab to begin scanning classroom attendance.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="rounded-xl px-6" onClick={() => setActiveTab("settings")}>
                Configure Camera
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl px-6 border-border" onClick={() => setApiState("SUCCESS")}>
                Restore Mock Data
              </Button>
            </div>
          </Card>
        ) : (
          /* SUCCESS OR LOADING PIPELINE RENDERING */
          <div className="space-y-6">
            
            {/* VIEW TAB: OVERVIEW / DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* 1. SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Attendance Rate (Only visible to Admin, Teacher, Super Admin) */}
                  {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Attendance</span>
                        <div className="flex items-baseline gap-1.5">
                          {apiState === "LOADING" ? (
                            <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                          ) : (
                            <span className="text-2xl font-bold tracking-tight">94.2%</span>
                          )}
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                            <ArrowUpRight className="h-3 w-3" /> +1.2%
                          </span>
                        </div>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                        <Activity className="h-5 w-5" />
                      </div>
                    </Card>
                  )}

                  {/* Present/Late count */}
                  {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Present Students</span>
                        <div className="flex items-baseline gap-1">
                          {apiState === "LOADING" ? (
                            <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                          ) : (
                            <span className="text-2xl font-bold tracking-tight">1,428</span>
                          )}
                          <span className="text-xs text-muted-foreground">/ 1,516 total</span>
                        </div>
                      </div>
                      <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Users className="h-5 w-5" />
                      </div>
                    </Card>
                  )}

                  {/* Active/Offline Cameras */}
                  <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Streams</span>
                      <div className="flex items-baseline gap-2">
                        {apiState === "LOADING" ? (
                          <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                        ) : (
                          <>
                            <span className="text-2xl font-bold tracking-tight">4 Active</span>
                            <span className="text-xs text-rose-500 font-semibold">1 offline</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-[#6C63FF]/10 rounded-xl border border-[#6C63FF]/20 text-[#6C63FF]">
                      <Camera className="h-5 w-5" />
                    </div>
                  </Card>

                  {/* Unknown Alerts (Security, Admin, Super Admin) */}
                  {hasAccess(["SUPER_ADMIN", "ADMIN", "SECURITY"]) && (
                    <Card className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Security Alerts</span>
                        <div className="flex items-baseline gap-1.5">
                          {apiState === "LOADING" ? (
                            <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                          ) : (
                            <span className="text-2xl font-bold tracking-tight">{unknowns.length}</span>
                          )}
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold border border-rose-500/20">Active</span>
                        </div>
                      </div>
                      <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-500">
                        <AlertTriangle className="h-5 w-5 animate-pulse" />
                      </div>
                    </Card>
                  )}
                </div>

                {/* 2. CAMERA AND ATTENDANCE LOG GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Live Camera Grid (2/3 width on desktop) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                        <Camera className="h-4 w-4 text-primary" /> Active Camera Monitors
                      </h2>
                      <span className="text-xs text-muted-foreground font-mono">Total Feeds: {cameras.length}</span>
                    </div>

                    {apiState === "LOADING" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(n => (
                          <Card key={n} className="p-4 space-y-3 bg-card border border-border rounded-xl">
                            <div className="h-4 w-1/2 bg-muted animate-pulse rounded"></div>
                            <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
                            <div className="h-8 bg-muted animate-pulse rounded"></div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cameras.slice(0, 4).map((cam) => (
                          <Card key={cam.id} className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between hover:shadow-md transition duration-200">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">{cam.protocol} • {cam.room}</span>
                                  <h3 className="text-sm font-bold truncate text-foreground mt-0.5">{cam.name}</h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 font-mono shrink-0 border ${
                                  cam.status === "ONLINE" 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                    : cam.status === "WARNING"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${
                                    cam.status === "ONLINE" ? "bg-emerald-500 animate-pulse" : cam.status === "WARNING" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                                  }`}></span>
                                  {cam.status}
                                </span>
                              </div>

                              {/* Realistic clean camera feed interface (No CUDA graphics, simple connection info) */}
                              <div className="relative w-full h-[140px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center text-center">
                                {cam.status === "OFFLINE" ? (
                                  <div className="p-4 text-zinc-500">
                                    <WifiOff className="h-8 w-8 mx-auto mb-1.5 text-zinc-600" />
                                    <p className="text-[10px] font-semibold font-mono">STREAM DISCONNECTED</p>
                                    <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{cam.ipAddress}</p>
                                  </div>
                                ) : (
                                  <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-900 text-left relative">
                                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                                      <span>FPS: 24</span>
                                      <span>{cam.ipAddress}</span>
                                    </div>
                                    
                                    <div className="my-auto text-center py-2">
                                      <Monitor className="h-6 w-6 text-zinc-600 mx-auto mb-1 opacity-70" />
                                      <p className="text-[10px] font-mono text-zinc-400 font-semibold uppercase">Channel Active</p>
                                      {cam.studentsCount > 0 ? (
                                        <p className="text-[9px] text-emerald-400 font-bold font-mono mt-0.5">
                                          {cam.studentsCount} students detected
                                        </p>
                                      ) : (
                                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Scanning empty classroom</p>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                      <span>Codec: H.264</span>
                                      <span>Last: {cam.lastDetectionTime}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Camera Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] border-border bg-background hover:bg-accent text-foreground rounded-lg"
                                onClick={() => handleCameraAction(cam.name, "Open Stream Feed")}
                                disabled={cam.status === "OFFLINE"}
                              >
                                <Play className="h-3 w-3 mr-1" /> Open View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] border-border bg-background hover:bg-accent text-foreground rounded-lg"
                                onClick={() => setActiveTab("settings")}
                              >
                                <Settings className="h-3 w-3 mr-1" /> Settings
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Unknown Alerts (Security, Admin, Super Admin) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                        <ShieldAlert className="h-4 w-4 text-rose-500" /> Unknown Alerts
                      </h2>
                      <span className="text-xs text-muted-foreground font-mono">Requires Audit</span>
                    </div>

                    {apiState === "LOADING" ? (
                      <div className="space-y-3">
                        {[1, 2].map(n => (
                          <Card key={n} className="p-4 space-y-2 bg-card border border-border rounded-xl">
                            <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                            <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
                            <div className="h-4 w-1/2 bg-muted animate-pulse rounded"></div>
                          </Card>
                        ))}
                      </div>
                    ) : unknowns.length === 0 ? (
                      <Card className="p-6 text-center bg-card border border-border rounded-2xl">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <h4 className="text-xs font-bold">All Detections Cleared</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">No unknown faces pending verification.</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {unknowns.map((un) => (
                          <Card key={un.id} className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between hover:shadow-sm transition duration-200">
                            <div className="flex gap-3">
                              {/* Standard Silhouette design with absolute fallback */}
                              <div className="relative w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-mono text-muted-foreground tracking-wide block">Alert ID: {un.id} • {un.detectedAt}</span>
                                <h4 className="font-bold text-xs text-foreground">Unrecognized Subject</h4>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Room: <span className="font-semibold text-foreground">{un.room}</span> ({un.cameraName})
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  Match Confidence: <span className="text-rose-500 font-bold">{un.confidence}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Core Security Actions */}
                            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-border">
                              <Button 
                                size="sm" 
                                className="bg-[#22C55E] hover:bg-[#22C55E]/90 text-[10px] text-white h-7 rounded-lg font-semibold"
                                onClick={() => handleUnknownAction(un.id, "Approved & Enrolled")}
                                disabled={isActionLoading === un.id}
                              >
                                {isActionLoading === un.id ? "Processing" : "Approve"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-border hover:bg-accent text-[10px] h-7 rounded-lg text-muted-foreground font-semibold"
                                onClick={() => handleUnknownAction(un.id, "Ignored")}
                                disabled={isActionLoading === un.id}
                              >
                                Ignore
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-rose-200 hover:bg-rose-50/50 text-[10px] h-7 rounded-lg text-rose-600 font-semibold"
                                onClick={() => handleUnknownAction(un.id, "Alert Broadcasted")}
                                disabled={isActionLoading === un.id}
                              >
                                Alert
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-200 hover:bg-red-50/50 text-[10px] h-7 rounded-lg text-red-600 font-semibold"
                                onClick={() => handleUnknownAction(un.id, "Blacklisted")}
                                disabled={isActionLoading === un.id}
                              >
                                Blacklist
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* 3. ATTENDANCE LOG TABLE PREVIEW */}
                {hasAccess(["SUPER_ADMIN", "ADMIN", "TEACHER"]) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Recent Attendance Log
                      </h2>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-xs border-border bg-card hover:bg-accent rounded-lg"
                        onClick={() => setActiveTab("history")}
                      >
                        Open Full History Logs
                      </Button>
                    </div>

                    <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Faculty</th>
                              <th className="py-3 px-4">Group</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Confidence</th>
                              <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 text-xs">
                            {apiState === "LOADING" ? (
                              [1, 2, 3].map(n => (
                                <tr key={n}>
                                  <td className="py-3 px-4"><div className="h-5 w-32 bg-muted animate-pulse rounded"></div></td>
                                  <td className="py-3 px-4"><div className="h-5 w-24 bg-muted animate-pulse rounded"></div></td>
                                  <td className="py-3 px-4"><div className="h-5 w-12 bg-muted animate-pulse rounded"></div></td>
                                  <td className="py-3 px-4"><div className="h-5 w-16 bg-muted animate-pulse mx-auto rounded"></div></td>
                                  <td className="py-3 px-4"><div className="h-5 w-8 bg-muted animate-pulse ml-auto rounded"></div></td>
                                  <td className="py-3 px-4"><div className="h-5 w-8 bg-muted animate-pulse mx-auto rounded"></div></td>
                                </tr>
                              ))
                            ) : (
                              attendance.slice(0, 3).map((record) => (
                                <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                                  <td className="py-3 px-4 font-bold text-foreground">{record.studentName}</td>
                                  <td className="py-3 px-4 text-muted-foreground">{record.faculty}</td>
                                  <td className="py-3 px-4 font-semibold text-muted-foreground">{record.groupName}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      record.status === "PRESENT"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : record.status === "LATE"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                    }`}>
                                      {record.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-foreground font-semibold">{record.presenceRate}%</td>
                                  <td className="py-3 px-4 text-center">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                      onClick={() => triggerAction(`Inspect logs for ${record.studentName}`)}
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
                    </Card>
                  </div>
                )}

              </div>
            )}

            {/* VIEW TAB: ALL CAMERAS */}
            {activeTab === "cameras" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Registered Streams ({cameras.length})</h2>
                  {hasAccess(["SUPER_ADMIN", "ADMIN"]) && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                      onClick={runCameraDiscovery}
                      disabled={isDiscovering}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isDiscovering ? "animate-spin" : ""}`} /> 
                      ONVIF Auto Discovery Probe
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cameras.map((cam) => (
                    <Card key={cam.id} className="p-5 bg-card border border-border rounded-2xl flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{cam.protocol} Connection</span>
                            <h3 className="text-base font-bold text-foreground mt-0.5">{cam.name}</h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            cam.status === "ONLINE" 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                              : cam.status === "WARNING"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}>
                            {cam.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs border-t border-b border-border py-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Classroom Assign:</span>
                            <span className="font-medium text-foreground">{cam.room}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IPv4 Address:</span>
                            <span className="font-mono text-foreground font-semibold">{cam.ipAddress}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Active Scan Target:</span>
                            <span className="font-semibold text-foreground">{cam.studentsCount} Students detected</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Frame Read:</span>
                            <span className="font-mono text-foreground">{cam.lastDetectionTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-border hover:bg-accent text-foreground text-xs rounded-xl"
                          onClick={() => handleCameraAction(cam.name, "Test Camera Latency")}
                        >
                          Ping Latency
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-rose-200 hover:bg-rose-50/50 text-rose-600 text-xs rounded-xl"
                          onClick={() => {
                            setCameras(prev => prev.filter(c => c.id !== cam.id));
                            toast.success(`Removed stream: ${cam.name}`);
                          }}
                          disabled={!hasAccess(["SUPER_ADMIN", "ADMIN"])}
                        >
                          Remove Stream
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW TAB: ATTENDANCE HISTORY LOG (Paginated + Filters) */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-foreground">Attendance Records Archive</h2>
                  
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search student, group..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    
                    <select 
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                      className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PRESENT">Present Only</option>
                      <option value="LATE">Late Only</option>
                      <option value="ABSENT">Absent Only</option>
                    </select>
                  </div>
                </div>

                <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Faculty</th>
                          <th className="py-3 px-4">Group</th>
                          <th className="py-3 px-4">Assigned Room</th>
                          <th className="py-3 px-4">Arrival Time</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Confidence</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs">
                        {paginatedAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                              No attendance records found matching filters.
                            </td>
                          </tr>
                        ) : (
                          paginatedAttendance.map((record) => (
                            <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-foreground">{record.studentName}</td>
                              <td className="py-3.5 px-4 text-muted-foreground">{record.faculty}</td>
                              <td className="py-3.5 px-4 font-semibold text-muted-foreground">{record.groupName}</td>
                              <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{record.room}</td>
                              <td className="py-3.5 px-4 font-mono text-muted-foreground">{record.arrivalTime}</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  record.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : record.status === "LATE"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-foreground font-semibold">{record.presenceRate}%</td>
                              <td className="py-3.5 px-4 text-center">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                  onClick={() => triggerAction(`Inspect raw audit trail for ${record.studentName}`)}
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

            {/* VIEW TAB: SECURITY ALERTS (UNKNOWN DETECTIONS) */}
            {activeTab === "unknowns" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-500" /> Active Security Alerts ({unknowns.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unknowns.map((un) => (
                    <Card key={un.id} className="p-5 bg-card border border-border rounded-2xl flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="relative w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground block">ID: {un.id} • {un.detectedAt}</span>
                            <h4 className="font-bold text-sm text-foreground">Unidentified Face</h4>
                            <p className="text-xs text-muted-foreground font-medium">Room: {un.room}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs border-t border-border pt-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Origin Camera:</span>
                            <span className="font-semibold text-foreground">{un.cameraName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cosine Similarity Score:</span>
                            <span className="font-mono text-rose-500 font-bold">{un.confidence}% Match</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-5">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 rounded-lg font-semibold"
                          onClick={() => handleUnknownAction(un.id, "Approved Student")}
                          disabled={isActionLoading === un.id}
                        >
                          Approve Profile
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-border hover:bg-accent text-muted-foreground text-xs h-8 rounded-lg font-semibold"
                          onClick={() => handleUnknownAction(un.id, "Ignored")}
                          disabled={isActionLoading === un.id}
                        >
                          Ignore Event
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-rose-200 hover:bg-rose-50/50 text-rose-600 text-xs h-8 rounded-lg font-semibold col-span-2"
                          onClick={() => handleUnknownAction(un.id, "Dispatched Alert")}
                          disabled={isActionLoading === un.id}
                        >
                          Dispatch Campus Security
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW TAB: AI CONFIGURATIONS & SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="pb-3 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground">AI Configuration Engine</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Parameters controlling facial alignment, thresholds, and administrative rules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Model Parameters */}
                  <Card className="p-6 bg-card border border-border rounded-2xl space-y-6 shadow-sm">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-primary" /> Model Settings
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-foreground">Match Threshold: <span className="font-mono text-primary font-bold">{recognitionThreshold.toFixed(2)}</span></label>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="0.99" 
                          step="0.01" 
                          value={recognitionThreshold} 
                          onChange={(e) => setRecognitionThreshold(parseFloat(e.target.value))} 
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border border-border" 
                        />
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Minimum cosine similarity filter to identify student presence. Higher score decreases false positives but increases false negatives.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground block">Snapshot Extraction Interval (seconds)</label>
                        <input 
                          type="number" 
                          value={snapshotInterval} 
                          onChange={(e) => setSnapshotInterval(parseInt(e.target.value))} 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Cooldown frequency for facial scans per camera. Higher intervals lower server payload.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Attendance Rules */}
                  <Card className="p-6 bg-card border border-border rounded-2xl space-y-6 shadow-sm">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-primary" /> Presence Regulations
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground block">Lateness Limit Grace Period (minutes)</label>
                        <input 
                          type="number" 
                          value={lateMinutesLimit} 
                          onChange={(e) => setLateMinutesLimit(parseInt(e.target.value))} 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Arriving after this duration will automatically label the log status as 'LATE'.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-foreground">Min Passing Attendance: <span className="font-mono text-primary font-bold">{minAttendancePercent}%</span></label>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="95" 
                          step="5" 
                          value={minAttendancePercent} 
                          onChange={(e) => setMinAttendancePercent(parseInt(e.target.value))} 
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border border-border" 
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Form Controls */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="border-border text-xs rounded-xl h-9 px-5 bg-card text-foreground"
                    onClick={() => setActiveTab("dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded-xl h-9 px-6 font-semibold"
                    onClick={handleSaveSettings}
                    disabled={isActionLoading === "settings"}
                  >
                    {isActionLoading === "settings" ? "Saving..." : "Apply Configurations"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="border-t border-border mt-auto py-6 bg-muted/20 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <span>LMSHub Attendance Control Module</span>
          <span>Target API Layer: v1.0.8-RELEASE</span>
        </div>
      </footer>
    </div>
  );
}
