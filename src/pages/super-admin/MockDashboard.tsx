import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Target, Clock, FileText, Edit2, Trash2, Copy, CheckCircle2,
  Lock, Globe, Loader2, Zap, Crown, Layers, Download, Upload, AlertCircle,
  Archive, FileJson, CheckSquare, Square, MoreVertical, ExternalLink, Image as ImageIcon,
  Music, HelpCircle, RefreshCw, BarChart3, Database, Filter, Eye, ChevronRight, X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface MockExam {
  id: string;
  title: string;
  description?: string;
  type: string;
  subType?: string;
  durationMinutes: number;
  difficulty: string;
  requiredPack: string;
  status: string;
  isAiImported: boolean;
  publishedAt?: string;
  createdAt: string;
}

interface MediaAsset {
  filename: string;
  contentType: string;
  fileSize: number;
  storageType: string;
  path?: string;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300" },
  UNDER_REVIEW: { label: "Under Review", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" },
  READY: { label: "Ready", cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  PUBLISHED: { label: "Published", cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" },
  ARCHIVED: { label: "Archived", cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400" },
};

const DIFF_BADGES: Record<string, { label: string; cls: string }> = {
  easy: { label: "Oson", cls: "bg-green-50 text-green-700 border-green-200" },
  medium: { label: "O'rta", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  hard: { label: "Qiyin", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  expert: { label: "Expert", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export default function MockDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  // ---- State ----
  const [activeTab, setActiveTab] = useState("mocks");
  const [exams, setExams] = useState<MockExam[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  // Import Dialogs State
  const [zipOpen, setZipOpen] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  const [urlOpen, setUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Manual creation states
  const [createOpen, setCreateOpen] = useState(false);

  // Media Library state
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaPage, setMediaPage] = useState(0);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);

  // ---- Load Mocks ----
  const loadMocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/exams", { params: { size: 500 } });
      const data = res.data?.content || res.data || [];
      setExams(data.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        type: d.type || "READING",
        subType: d.subType,
        durationMinutes: d.durationMinutes || d.duration_minutes || 60,
        difficulty: (d.difficulty || "medium").toLowerCase(),
        requiredPack: d.requiredPack || d.required_pack || "free",
        status: d.status || (d.isActive ? "PUBLISHED" : "DRAFT"),
        isAiImported: d.isAiImported || false,
        publishedAt: d.publishedAt || d.published_at,
        createdAt: d.createdAt || d.created_at,
      })));
    } catch (e) {
      toast.error("Mock imtihonlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Load Analytics ----
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.get("/admin/exams/analytics");
      setAnalytics(res.data);
    } catch (e) {
      console.warn("Analytics fetch failed: ", e);
    }
  }, []);

  // ---- Load Media Library ----
  const loadMedia = useCallback(async (pageIdx = 0, q = "") => {
    setMediaLoading(true);
    try {
      const res = await api.get("/files", {
        params: { page: pageIdx, size: 12, search: q }
      });
      setMedia(res.data?.content || []);
      setMediaTotalPages(res.data?.totalPages || 1);
    } catch (e) {
      console.warn("Media library listing failed: ", e);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMocks();
    loadAnalytics();
  }, [loadMocks, loadAnalytics]);

  useEffect(() => {
    if (activeTab === "media") {
      loadMedia(mediaPage, mediaSearch);
    }
  }, [activeTab, mediaPage, mediaSearch, loadMedia]);

  // ---- Bulk Actions ----
  const handleBulkPublish = async () => {
    if (!isSuperAdmin) {
      toast.error("Faqat Super Admin mocklarni nashr eta oladi!");
      return;
    }
    const tid = toast.loading("Nashr qilinmoqda...");
    try {
      await api.post("/admin/exams/bulk-publish", selectedIds);
      toast.success("Tanlangan mocklar nashr etildi ✅", { id: tid });
      setSelectedIds([]);
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Bulk operation failed", { id: tid });
    }
  };

  const handleBulkArchive = async () => {
    const tid = toast.loading("Arxivga o'tkazilmoqda...");
    try {
      await api.post("/admin/exams/bulk-archive", selectedIds);
      toast.success("Tanlangan mocklar arxivlandi ✅", { id: tid });
      setSelectedIds([]);
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Bulk operation failed", { id: tid });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm("Haqiqatan ham tanlangan barcha mocklarni o'chirasizmi?")) return;
    const tid = toast.loading("O'chirilmoqda...");
    try {
      await api.post("/admin/exams/bulk-delete", selectedIds);
      toast.success("Tanlangan mocklar o'chirib tashlandi 🗑️", { id: tid });
      setSelectedIds([]);
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Bulk operation failed", { id: tid });
    }
  };

  const handleBulkDuplicate = async () => {
    const tid = toast.loading("Nusxalanmoqda...");
    try {
      await api.post("/admin/exams/bulk-duplicate", selectedIds);
      toast.success("Tanlangan mocklar nusxalandi ✅", { id: tid });
      setSelectedIds([]);
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Bulk duplicate failed", { id: tid });
    }
  };

  const handleBulkExport = async () => {
    const tid = toast.loading("Eksport fayli tayyorlanmoqda...");
    try {
      const res = await api.post("/admin/exams/bulk-export", selectedIds, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mock_exams_export.zip";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ZIP eksport tayyor! 📥", { id: tid });
      setSelectedIds([]);
    } catch (e: any) {
      toast.error("Eksport qilishda xatolik yuz berdi", { id: tid });
    }
  };

  // ---- Single Operations ----
  const handleClone = async (mockId: string) => {
    const tid = toast.loading("Mock nusxalanmoqda...");
    try {
      await api.post(`/admin/exams/${mockId}/duplicate`);
      toast.success("Mock nusxalandi ✅", { id: tid });
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error("Nusxalashda xatolik: " + (e?.response?.data?.message || e?.message), { id: tid });
    }
  };

  const handleDeleteMock = async (mockId: string) => {
    if (!confirm("Ushbu mock test butunlay o'chirilsinmi?")) return;
    try {
      await api.delete(`/admin/exams/${mockId}`);
      toast.success("Mock o'chirildi🗑️");
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error("O'chirishda xatolik");
    }
  };

  // ---- Imports Action ----
  const handleZipImportSubmit = async () => {
    if (!zipFile) return;
    setZipBusy(true);
    const formData = new FormData();
    formData.append("file", zipFile);
    try {
      await api.post("/admin/exams/import-zip", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("ZIP paket muvaffaqiyatli import qilindi! Savollar ko'rib chiqishda (UNDER_REVIEW) ✅");
      setZipOpen(false);
      setZipFile(null);
      loadMocks();
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "ZIP tahlilida xatolik");
    } finally {
      setZipBusy(false);
    }
  };

  const handleUrlImportSubmit = async () => {
    if (!importUrl) return;
    setUrlBusy(true);
    try {
      const res = await api.post("/admin/exams/import-url", { url: importUrl });
      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      
      // Save data locally in builder session and open builder in "Preview Mode"
      localStorage.setItem("exam_builder_url_preview", JSON.stringify(data));
      toast.success("AI sahifani o'qidi! Preview rejimida tekshirishingiz mumkin.");
      setUrlOpen(false);
      setImportUrl("");
      
      // Route to builder with import preview flag
      navigate("/super-admin/exam-builder/new?import=url");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "AI tahlilida xatolik yuz berdi");
    } finally {
      setUrlBusy(false);
    }
  };

  const handlePdfImportSubmit = async () => {
    if (!pdfFile) return;
    setPdfBusy(true);
    const formData = new FormData();
    formData.append("file", pdfFile);
    try {
      const res = await api.post("/admin/exams/analyze-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });
      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      
      // Save for builder session
      localStorage.setItem("exam_builder_pdf_preview", JSON.stringify(data));
      toast.success("PDF AI tahlili yakunlandi! Tafsilotlarni tekshiring.");
      setPdfOpen(false);
      setPdfFile(null);
      
      // Route to builder with import preview flag
      navigate("/super-admin/exam-builder/new?import=pdf");
    } catch (e: any) {
      toast.error("PDF importda xatolik yuz berdi");
    } finally {
      setPdfBusy(false);
    }
  };

  // ---- Filter and Search logic ----
  const filteredExams = useMemo(() => {
    return exams.filter(mock => {
      // Search
      if (search && !mock.title.toLowerCase().includes(search.toLowerCase()) && !mock.description?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Type
      if (filterType !== "all") {
        if (filterType.startsWith("ielts_")) {
          const sub = filterType.replace("ielts_", "").toUpperCase();
          if (mock.type !== "IELTS" && mock.type !== sub) return false;
          if (mock.subType && mock.subType !== sub) return false;
        } else {
          if (mock.type !== filterType.toUpperCase()) return false;
        }
      }
      // Status
      if (filterStatus !== "all" && mock.status !== filterStatus) return false;
      // Difficulty
      if (filterDifficulty !== "all" && mock.difficulty !== filterDifficulty) return false;

      return true;
    });
  }, [exams, search, filterType, filterStatus, filterDifficulty]);

  const selectAll = () => {
    if (selectedIds.length === filteredExams.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExams.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Enterprise Mock CMS</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage thousands of standard mocks and digital items for LMSHub</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-violet-200 hover:bg-violet-50 text-violet-600 font-bold dark:border-slate-800">
                <Upload className="h-4 w-4" /> Import Mock
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs" onClick={() => setZipOpen(true)}>
                <FileJson className="h-4 w-4 text-purple-500" /> ZIP Import (Preferred)
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs" onClick={() => setUrlOpen(true)}>
                <ExternalLink className="h-4 w-4 text-blue-500" /> AI URL Import
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs" onClick={() => setPdfOpen(true)}>
                <FileText className="h-4 w-4 text-amber-500" /> AI PDF Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 border-0"
          >
            <Plus className="h-4 w-4" /> Yangi Mock yaratish
          </Button>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Jami mocklar", value: analytics?.totalMocks ?? exams.length, desc: `${analytics?.publishedMocks ?? 0} published, ${analytics?.underReviewMocks ?? 0} in review`, icon: Layers, color: "text-violet-600 bg-violet-50" },
          { label: "Barcha urinishlar", value: analytics?.totalAttempts ?? 0, desc: `Tugatilish darajasi: ${analytics?.completionRate ?? 0}%`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "O'rtacha natija", value: `${analytics?.avgScore ?? 0}%`, desc: `Eng qiyin tur: ${analytics?.mostDifficultQuestionType ?? "—"}`, icon: BarChart3, color: "text-amber-600 bg-amber-50" },
          { label: "Eng ko'p yechilgan", value: analytics?.mostSolvedExam ?? "—", desc: "Top mock imtihon", icon: Crown, color: "text-blue-600 bg-blue-50" },
        ].map(stat => (
          <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-lg font-black text-slate-800 dark:text-white truncate">{stat.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{stat.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="mocks" className="rounded-lg text-xs font-bold px-4 py-2">📚 Mocks Catalog</TabsTrigger>
          <TabsTrigger value="media" className="rounded-lg text-xs font-bold px-4 py-2">📂 Media Library</TabsTrigger>
        </TabsList>

        <TabsContent value="mocks" className="space-y-4">
          {/* Mocks toolbar filter */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9 h-9 text-xs rounded-xl"
                  placeholder="Mock nomi yoki tavsifi bo'yicha qidirish..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-slate-400 font-medium">Filters:</span>
              </div>

              {/* Exam type */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-36 rounded-xl"><SelectValue placeholder="Imtihon turi" /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="ielts_reading">📖 IELTS Reading</SelectItem>
                  <SelectItem value="ielts_listening">🎧 IELTS Listening</SelectItem>
                  <SelectItem value="ielts_writing">✍️ IELTS Writing</SelectItem>
                  <SelectItem value="ielts_speaking">🎤 IELTS Speaking</SelectItem>
                  <SelectItem value="sat">🎯 SAT</SelectItem>
                  <SelectItem value="national_cert">🏛️ Milliy sertifikat</SelectItem>
                  <SelectItem value="math">📐 Mathematics</SelectItem>
                  <SelectItem value="custom">⚙️ Custom Exam</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-28 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Barcha Statuslar</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Difficulty */}
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="h-9 w-28 rounded-xl"><SelectValue placeholder="Qiyinlik" /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Barcha darajalar</SelectItem>
                  <SelectItem value="easy">🟢 Oson</SelectItem>
                  <SelectItem value="medium">🟡 O'rta</SelectItem>
                  <SelectItem value="hard">🔴 Qiyin</SelectItem>
                  <SelectItem value="expert">⚫ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-indigo-900"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === filteredExams.length}
                  onCheckedChange={selectAll}
                />
                <span>Tanlandi: {selectedIds.length} ta mock exam</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-100/50" onClick={handleBulkDuplicate}>
                  <Copy className="h-3 w-3 mr-1" /> Duplicate
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-100/50" onClick={handleBulkExport}>
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
                {isSuperAdmin && (
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={handleBulkPublish}>
                    <Globe className="h-3 w-3 mr-1" /> Bulk Publish
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 border-amber-200 text-amber-700 bg-white hover:bg-amber-100/50" onClick={handleBulkArchive}>
                  <Archive className="h-3 w-3 mr-1" /> Archive
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-700 bg-white hover:bg-rose-50" onClick={handleBulkDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </motion.div>
          )}

          {/* Mocks List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs text-muted-foreground">Mocklar yuklanmoqda...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <Card className="p-16 text-center text-muted-foreground border-dashed rounded-2xl">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700 dark:text-slate-200">Mock imtihonlar topilmadi</p>
              <p className="text-xs mt-1">Sarlavha yoki filtr talablarini o'zgartirib ko'ring</p>
            </Card>
          ) : (
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <Checkbox
                          checked={selectedIds.length === filteredExams.length}
                          onCheckedChange={selectAll}
                        />
                      </th>
                      <th className="p-4">Mock nomi</th>
                      <th className="p-4">Turi</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Qiyinligi</th>
                      <th className="p-4">Vaqt</th>
                      <th className="p-4">Import turi</th>
                      <th className="p-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredExams.map((mock) => {
                      const status = STATUS_BADGES[mock.status] || STATUS_BADGES.DRAFT;
                      const diff = DIFF_BADGES[mock.difficulty] || DIFF_BADGES.medium;
                      return (
                        <tr key={mock.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={selectedIds.includes(mock.id)}
                              onCheckedChange={() => toggleSelect(mock.id)}
                            />
                          </td>
                          <td className="p-4 max-w-xs truncate">
                            <div className="font-bold text-slate-900 dark:text-white leading-normal truncate">{mock.title}</div>
                            {mock.description && (
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{mock.description}</div>
                            )}
                          </td>
                          <td className="p-4 font-bold uppercase tracking-wider text-slate-500">
                            {mock.type === "IELTS" && mock.subType ? `IELTS ${mock.subType}` : mock.type}
                          </td>
                          <td className="p-4">
                            <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-black border-none uppercase ${status.cls}`}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`px-2 py-0.5 rounded-full text-[10px] ${diff.cls}`}>
                              {diff.label}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-500">{mock.durationMinutes} daq</td>
                          <td className="p-4">
                            {mock.isAiImported ? (
                              <Badge className="bg-purple-100 text-purple-700 border-none rounded-lg text-[9px] uppercase tracking-wider px-2 font-black">
                                <Zap className="h-2.5 w-2.5 mr-0.5" /> AI Parse
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-none rounded-lg text-[9px] uppercase tracking-wider px-2">
                                Manual
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-violet-200 text-violet-600 hover:bg-violet-50 text-xs px-2.5"
                                onClick={() => navigate(`/super-admin/exam-builder/edit/${mock.id}`)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" /> Tahrirlash
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate(`/super-admin/mocks/take/${mock.id}`)}>
                                    <Eye className="h-4 w-4 text-slate-400" /> Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleClone(mock.id)}>
                                    <Copy className="h-4 w-4 text-slate-400" /> Clone
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 text-rose-600 cursor-pointer" onClick={() => handleDeleteMock(mock.id)}>
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3 border border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 h-9 text-xs rounded-xl"
                placeholder="Fayl nomi bo'yicha qidirish..."
                value={mediaSearch}
                onChange={e => { setMediaSearch(e.target.value); setMediaPage(0); }}
              />
            </div>

            <div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  hidden
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      const tid = toast.loading("Fayl yuklanmoqda...");
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        const res = await api.post("/files/upload", form, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        toast.success("Fayl muvaffaqiyatli yuklandi va saqlandi! ✅", { id: tid });
                        loadMedia(0, mediaSearch);
                      } catch {
                        toast.error("Yuklashda xatolik yuz berdi", { id: tid });
                      }
                    }
                  }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all">
                  <Upload className="h-4 w-4" /> Yangi Fayl Yuklash
                </span>
              </label>
            </div>
          </Card>

          {mediaLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs text-muted-foreground">Fayllar yuklanmoqda...</p>
            </div>
          ) : media.length === 0 ? (
            <Card className="p-16 text-center text-muted-foreground border-dashed rounded-2xl">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700 dark:text-slate-200">Media fayllari topilmadi</p>
              <p className="text-xs mt-1">Kutubxonaga birinchi bo'lib fayl yuklang</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((asset, i) => {
                const isImage = (asset.contentType || "").startsWith("image/");
                const isAudio = (asset.contentType || "").startsWith("audio/");
                const sizeStr = ((asset.fileSize || 0) / (1024 * 1024)).toFixed(2) + " MB";
                const downloadUrl = `/api/v1/files/view/${asset.filename}`;
                return (
                  <Card key={i} className="p-3 hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between border-slate-100 dark:border-slate-800">
                    <div className="h-28 w-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center mb-2">
                      {isImage ? (
                        <img src={downloadUrl} alt={asset.filename} className="w-full h-full object-contain" />
                      ) : isAudio ? (
                        <Music className="h-10 w-10 text-indigo-500" />
                      ) : (
                        <FileText className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={asset.filename}>
                        {asset.filename.includes("-") ? asset.filename.substring(asset.filename.indexOf("-") + 1) : asset.filename}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{asset.contentType} · {sizeStr}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 border-t pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(downloadUrl);
                          toast.success("URL nusxalandi! 📋");
                        }}
                      >
                        Copy URL
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-slate-500"
                        onClick={() => window.open(downloadUrl, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Media pagination */}
          {mediaTotalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setMediaPage(p => Math.max(0, p - 1))}
                disabled={mediaPage === 0}
              >
                Orqaga
              </Button>
              <span className="text-xs font-semibold text-slate-500">{mediaPage + 1} / {mediaTotalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setMediaPage(p => Math.min(mediaTotalPages - 1, p + 1))}
                disabled={mediaPage === mediaTotalPages - 1}
              >
                Keyingi
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* MODALS AND DIALOGS */}
      {/* ============================================================ */}

      {/* ZIP Import Dialog */}
      <Dialog open={zipOpen} onOpenChange={setZipOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">ZIP Mock Paket Importi</DialogTitle>
            <DialogDescription className="text-xs">
              Mocks ZIP faylini yuklang. ZIP tarkibida `exam.json` va unga bog'liq `audio/` hamda `images/` papkalari bo'lishi lozim.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById("zip-upload-input")?.click()}>
            <input
              type="file"
              id="zip-upload-input"
              accept=".zip"
              className="hidden"
              onChange={e => e.target.files?.[0] && setZipFile(e.target.files[0])}
            />
            {zipFile ? (
              <div className="text-center">
                <FileJson className="h-10 w-10 text-indigo-500 mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{zipFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(zipFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">ZIP faylni tanlang</p>
                <p className="text-[10px] mt-1">Max 50MB</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setZipOpen(false)} disabled={zipBusy}>Bekor qilish</Button>
            <Button
              size="sm"
              onClick={handleZipImportSubmit}
              disabled={zipBusy || !zipFile}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {zipBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URL Import Dialog */}
      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">AI URL Mock Tahlili</DialogTitle>
            <DialogDescription className="text-xs">
              Mavjud IELTS yoki SAT mock test sahifasining URL manzilini kiriting. Tizim avtomatik ravishda passages va savollarni aniqlab builderga yuklaydi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Input
              placeholder="https://example.com/ielts-reading-practice"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setUrlOpen(false)} disabled={urlBusy}>Bekor qilish</Button>
            <Button
              size="sm"
              onClick={handleUrlImportSubmit}
              disabled={urlBusy || !importUrl.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {urlBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Tahlil Qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Import Dialog */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">AI PDF Mock Tahlili</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu PDF yuklash yordamchi hisoblanadi. AI savollar va variantlarni tahlil qilgach, manually (qo'lda) builderda tasdiqlash shart.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById("pdf-upload-input")?.click()}>
            <input
              type="file"
              id="pdf-upload-input"
              accept=".pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && setPdfFile(e.target.files[0])}
            />
            {pdfFile ? (
              <div className="text-center">
                <FileText className="h-10 w-10 text-amber-500 mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{pdfFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">PDF faylni tanlang</p>
                <p className="text-[10px] mt-1">Max 20MB</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPdfOpen(false)} disabled={pdfBusy}>Bekor qilish</Button>
            <Button
              size="sm"
              onClick={handlePdfImportSubmit}
              disabled={pdfBusy || !pdfFile}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {pdfBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} PDF AI tahlili
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Create Selector Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 dark:text-white">Imtihon Turini Tanlang</DialogTitle>
            <DialogDescription className="text-xs">
              Notion-style rich builderga yo'naltirish uchun mock turini tanlang.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4 text-xs font-bold">
            {[
              { type: "reading", label: "IELTS Reading", icon: "📖", cls: "hover:bg-blue-50/50 hover:border-blue-300 text-blue-700 border-blue-100" },
              { type: "listening", label: "IELTS Listening", icon: "🎧", cls: "hover:bg-purple-50/50 hover:border-purple-300 text-purple-700 border-purple-100" },
              { type: "writing", label: "IELTS Writing", icon: "✍️", cls: "hover:bg-emerald-50/50 hover:border-emerald-300 text-emerald-700 border-emerald-100" },
              { type: "speaking", label: "IELTS Speaking", icon: "🎤", cls: "hover:bg-pink-50/50 hover:border-pink-300 text-pink-700 border-pink-100" },
              { type: "sat", label: "SAT Mock", icon: "🎯", cls: "hover:bg-violet-50/50 hover:border-violet-300 text-violet-700 border-violet-100" },
              { type: "national_cert", label: "Milliy Sertifikat", icon: "🏛️", cls: "hover:bg-amber-50/50 hover:border-amber-300 text-amber-700 border-amber-100" },
              { type: "math", label: "Mathematics", icon: "📐", cls: "hover:bg-slate-50/50 hover:border-slate-300 text-slate-700 border-slate-100" },
              { type: "custom", label: "Custom Exam", icon: "⚙️", cls: "hover:bg-rose-50/50 hover:border-rose-300 text-rose-700 border-rose-100" },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => {
                  setCreateOpen(false);
                  navigate(`/super-admin/exam-builder/new?kind=${item.type}`);
                }}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all ${item.cls}`}
              >
                <span className="text-2xl mb-1.5">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
