import React, { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import {
  Plus,
  Trash2,
  Edit2,
  FileText,
  Image,
  Upload,
  Loader2,
  CheckCircle,
  Eye,
  DollarSign,
  Award,
  BookOpen,
  FolderOpen,
  Search,
  Filter,
  AlertTriangle,
  X,
  Sparkles,
  Crop
} from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropUtils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Material {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  coverImageUrl: string;
  pdfUrl: string;
  accessType: string;
  status: string;
  viewsCount: number;
  downloadsCount: number;
}

interface Stats {
  totalMaterials: number;
  totalPdfs: number;
  totalViews: number;
  popularBook: string;
  popularTextbook: string;
  popularGuide: string;
  freeCount: number;
  proCount: number;
  eliteCount: number;
}

export default function LibraryManage() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "user";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAccessType, setSelectedAccessType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");
  const [formAccessType, setFormAccessType] = useState("FREE");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  // Cover Image Cropper States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // PDF Upload State
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [search, selectedCategory, selectedAccessType, selectedStatus, page]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/library/categories");
      setCategories(res.data);
      if (res.data.length > 0) setFormCategoryId(res.data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/library/statistics");
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get("/library/materials", {
        params: {
          search: search || undefined,
          categoryId: selectedCategory || undefined,
          accessType: selectedAccessType || undefined,
          status: selectedStatus || undefined,
          page,
          size: 10
        }
      });
      setMaterials(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error("Materiallarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // Image upload with compression and crop
  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setShowCropperModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setUploadingImage(true);
      // Crop image to Blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        toast.error("Rasmni kesishda xatolik yuz berdi");
        return;
      }

      // Convert to compressed File
      const file = new File([croppedBlob], "cover.webp", { type: "image/webp" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormCoverImageUrl(res.data);
      toast.success("Muqova rasmi yuklandi! 🖼️");
      setShowCropperModal(false);
      setImageSrc(null);
    } catch (e) {
      console.error(e);
      toast.error("Rasmni yuklashda xatolik");
    } finally {
      setUploadingImage(false);
    }
  };

  // PDF Upload handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      toast.error("Faqat PDF yuklashga ruxsat beriladi");
      return;
    }

    try {
      setUploadingPdf(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormPdfUrl(res.data);
      toast.success("PDF material yuklandi! 📚");
    } catch (e) {
      console.error(e);
      toast.error("PDF material yuklashda xatolik yuz berdi");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategoryId) {
      toast.warning("Nomi va Kategoriyani to'ldirish shart");
      return;
    }

    const payload = {
      categoryId: formCategoryId,
      title: formTitle,
      author: formAuthor,
      description: formDescription,
      subject: formSubject,
      grade: formGrade || null,
      topic: formTopic,
      coverImageUrl: formCoverImageUrl,
      pdfUrl: formPdfUrl,
      accessType: formAccessType,
      status: formStatus
    };

    try {
      if (editingId) {
        await api.put(`/library/materials/${editingId}`, payload);
        toast.success("Material muvaffaqiyatli yangilandi");
      } else {
        await api.post("/library/materials", payload);
        toast.success("Yangi material yaratildi");
      }
      resetForm();
      fetchMaterials();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Saqlashda xatolik yuz berdi");
    }
  };

  // Editing populator
  const handleEditClick = (m: Material) => {
    setEditingId(m.id);
    setFormTitle(m.title);
    setFormAuthor(m.author || "");
    setFormDescription(m.description || "");
    setFormCategoryId(m.categoryId);
    setFormSubject(m.subject || "");
    setFormGrade(m.grade || "");
    setFormTopic(m.topic || "");
    setFormCoverImageUrl(m.coverImageUrl || "");
    setFormPdfUrl(m.pdfUrl || "");
    setFormAccessType(m.accessType);
    setFormStatus(m.status);
    setIsFormOpen(true);
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu materialni o'chirib tashlamoqchimisiz?")) return;
    try {
      await api.delete(`/library/materials/${id}`);
      toast.success("Material o'chirildi");
      fetchMaterials();
      fetchStats();
    } catch (e) {
      console.error(e);
      toast.error("O'chirishda xatolik yuz berdi");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormAuthor("");
    setFormDescription("");
    if (categories.length > 0) setFormCategoryId(categories[0].id);
    setFormSubject("");
    setFormGrade("");
    setFormTopic("");
    setFormCoverImageUrl("");
    setFormPdfUrl("");
    setFormAccessType("FREE");
    setFormStatus("ACTIVE");
    setIsFormOpen(false);
  };

  return (
    <div className="w-full space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            📚 Kutubxona Boshqaruvi
          </h1>
          <p className="text-xs text-slate-500">
            LMSHub platformasidagi raqamli kutubxona kitoblarini to'liq boshqarish (CRUD) paneli.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Yangi material qo'shish
        </button>
      </div>

      {/* ── Statistics Grid ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Jami materiallar</p>
            <p className="text-xl font-black mt-1 text-purple-400">{stats.totalMaterials}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Jami PDFlar</p>
            <p className="text-xl font-black mt-1 text-emerald-400">{stats.totalPdfs}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Jami O'qishlar</p>
            <p className="text-xl font-black mt-1 text-amber-400">{stats.totalViews}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Free / Pro / Elite</p>
            <p className="text-xs font-bold mt-2 flex gap-2">
              <span className="text-emerald-400">{stats.freeCount} F</span>
              <span className="text-purple-400">{stats.proCount} P</span>
              <span className="text-rose-400">{stats.eliteCount} E</span>
            </p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white lg:col-span-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Eng mashhur kitob</p>
            <p className="text-xs font-bold truncate mt-1.5 text-slate-200">{stats.popularBook}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Eng mashhur darslik</p>
            <p className="text-xs font-bold truncate mt-1.5 text-slate-200">{stats.popularTextbook}</p>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Eng mashhur qo'llanma</p>
            <p className="text-xs font-bold truncate mt-1.5 text-slate-200">{stats.popularGuide}</p>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="p-4 bg-white dark:bg-[#111827] border border-[#E8DDFB] dark:border-[#222738] rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Nomi, muallifi yoki mavzu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
          >
            <option value="">Barcha bo'limlar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAccessType}
            onChange={(e) => setSelectedAccessType(e.target.value)}
            className="h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
          >
            <option value="">Barcha toifalar</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ELITE">ELITE</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
          >
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="HIDDEN">HIDDEN</option>
          </select>
        </div>
      </div>

      {/* ── Table List ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E8DDFB] dark:border-[#222738] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="p-4">Muqova & Nomi</th>
                <th className="p-4">Bo'lim (Kategoriya)</th>
                <th className="p-4">Fan & Sinf</th>
                <th className="p-4">Kirish Turi</th>
                <th className="p-4">Status</th>
                <th className="p-4">Ko'rishlar</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Hech qanday material topilmadi.
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-9 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {m.coverImageUrl ? (
                            <img src={m.coverImageUrl} alt={m.title} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-white truncate">{m.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{m.author || "Muallifsiz"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {m.categoryName}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-450">
                      {m.subject || "Fan yo'q"}
                      {m.grade && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400">{m.grade}</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.accessType === "FREE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : m.accessType === "PRO"
                          ? "bg-purple-500/10 text-purple-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}>
                        {m.accessType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : m.status === "DRAFT"
                          ? "bg-slate-500/10 text-slate-400"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                      {m.viewsCount}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg disabled:opacity-50"
            >
              Oldingi
            </button>
            <span className="text-xs text-slate-400 font-bold">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg disabled:opacity-50"
            >
              Keyingi
            </button>
          </div>
        )}
      </div>

      {/* ── Slider Form Drawer ── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="fixed inset-0 bg-black"
            />

            {/* Slider container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800 h-full overflow-y-auto p-6 space-y-6 z-10 flex flex-col justify-between thin-scrollbar"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">
                      {editingId ? "Materialni tahrirlash" : "Yangi material yaratish"}
                    </h2>
                    <p className="text-[10px] text-slate-400">Kerakli maydonlarni to'ldiring.</p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-slate-700 dark:text-slate-200">
                  {/* Title & Author */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Nomi</label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Muallif</label>
                      <input
                        type="text"
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category & Access Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Kategoriya</label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Kirish Turi</label>
                      <select
                        value={formAccessType}
                        onChange={(e) => setFormAccessType(e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                        <option value="ELITE">ELITE</option>
                      </select>
                    </div>
                  </div>

                  {/* Fan, Sinf, Mavzu */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Fan (Subject)</label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="Matematika..."
                        className="w-full h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Sinf (Grade)</label>
                      <select
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      >
                        <option value="">Yo'q</option>
                        {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Mavzu (Topic)</label>
                      <input
                        type="text"
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        placeholder="Algebra..."
                        className="w-full h-9 px-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="HIDDEN">HIDDEN</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400">Tavsif (Description)</label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Uploads grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Cover Image drag-drop */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">Muqova rasmi (Cover)</label>
                      <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] hover:border-primary transition-all">
                        {formCoverImageUrl ? (
                          <div className="relative w-20 h-28 rounded overflow-hidden">
                            <img src={formCoverImageUrl} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFormCoverImageUrl("")}
                              className="absolute top-1 right-1 p-0.5 bg-black/70 rounded-full text-white hover:bg-black"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Image className="h-8 w-8 text-slate-400 mb-1" />
                            <p className="text-[10px] text-slate-500 text-center">Rasm tanlang (Drag & Drop)</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* PDF upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">PDF material fayli</label>
                      <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] hover:border-primary transition-all">
                        {formPdfUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle className="h-8 w-8 text-emerald-500 animate-bounce" />
                            <span className="text-[9px] font-bold text-slate-500 truncate max-w-full">Fayl yuklandi</span>
                            <button
                              type="button"
                              onClick={() => setFormPdfUrl("")}
                              className="text-[10px] text-red-500 font-bold hover:underline"
                            >
                              O'chirish
                            </button>
                          </div>
                        ) : uploadingPdf ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="h-7 w-7 text-primary animate-spin" />
                            <span className="text-[9px] text-slate-400 font-semibold">Yuklanmoqda...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-slate-400 mb-1" />
                            <p className="text-[10px] text-slate-500 text-center">Faqat .pdf fayl</p>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary text-white hover:bg-primary/95 text-xs font-bold rounded-xl shadow transition-colors"
                    >
                      {editingId ? "Yangilash" : "Yaratish"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-colors"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── React Easy Crop Modal ── */}
      <AnimatePresence>
        {showCropperModal && imageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[500px]"
            >
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Crop className="h-4 w-4 text-purple-400" />
                  Rasm muqovasini kesish (Crop)
                </h3>
                <button
                  onClick={() => {
                    setShowCropperModal(false);
                    setImageSrc(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cropper Container */}
              <div className="relative flex-1 bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 4} // book aspect ratio
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Slider zoom and Action buttons */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-4 text-white text-xs">
                  <span>Kattalashtirish</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUploadCroppedImage}
                    disabled={uploadingImage}
                    className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yuklanmoqda...
                      </>
                    ) : (
                      "Tanlash & Kesish (WebP)"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCropperModal(false);
                      setImageSrc(null);
                    }}
                    className="px-5 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-bold"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
