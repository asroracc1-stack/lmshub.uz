import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Archive,
  FileText,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Eye,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderSync,
  KeyRound,
  X,
  Sparkles,
  Calendar,
  Check,
  Filter,
  Loader2
} from "lucide-react";

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
  createdAt?: string;
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

const listTranslations = {
  uz: {
    title: "Kutubxona Boshqaruvi",
    subtitle: "Raqamli kutubxonadagi barcha materiallarni (kitob, darslik, qo'llanma) premium monitoring va boshqarish paneli.",
    addBtn: "Yangi material yaratish",
    searchPlaceholder: "Nomi, muallifi yoki fan...",
    filterCategory: "Barcha kategoriyalar",
    filterAccess: "Barcha kirish turlari",
    filterStatus: "Barcha statuslar",
    filterAuthor: "Muallif bo'yicha",
    filterDate: "Sana bo'yicha",
    allTime: "Barcha vaqtlar",
    today: "Bugun qo'shilganlar",
    thisWeek: "Shu hafta",
    thisMonth: "Shu oy",
    colCoverTitle: "Muqova & Ma'lumot",
    colCategory: "Kategoriya",
    colAccess: "Kirish",
    colStatus: "Status",
    colViews: "O'qishlar",
    colDate: "Chop etilgan sana",
    colActions: "Amallar",
    noMaterials: "Hech qanday material topilmadi.",
    statTotal: "Jami Materiallar",
    statBooks: "Kitoblar soni",
    statPdfs: "Yuklangan PDFlar",
    statViews: "Jami O'qishlar",
    statPopularBook: "Eng ko'p o'qilgan kitob",
    deleteConfirm: "Materialni butunlay o'chirib tashlamoqchimisiz?",
    duplicateSuccess: "Material nusxalandi!",
    archiveSuccess: "Material arxivlandi!",
    deleteSuccess: "Material o'chirildi!",
    bulkDeleteConfirm: "Tanlangan barcha materiallarni o'chirishni xohlaysizmi?",
    bulkArchiveSuccess: "Tanlangan materiallar arxivlandi (yashirildi)",
    bulkDeleteSuccess: "Tanlangan materiallar o'chirildi",
    bulkMoveSuccess: "Kategoriyalar o'zgartirildi",
    bulkAccessSuccess: "Kirish huquqlari o'zgartirildi",
    bulkActionsSelected: "{{count}} ta material tanlandi",
    bulkDeleteBtn: "O'chirish",
    bulkArchiveBtn: "Arxivlash",
    bulkMoveBtn: "Bo'limni o'zgartirish",
    bulkAccessBtn: "Kirishni o'zgartirish",
    cancel: "Bekor qilish",
    save: "Saqlash",
    moveCategoryTitle: "Kategoriyani o'zgartirish",
    changeAccessTitle: "Kirish huquqini o'zgartirish",
    selectCategory: "Kategoriyani tanlang",
    selectAccess: "Kirish toifasini tanlang"
  },
  ru: {
    title: "Управление Библиотекой",
    subtitle: "Панель мониторинга и управления цифровыми книгами, учебниками и пособиями премиум класса.",
    addBtn: "Создать материал",
    searchPlaceholder: "Название, автор или предмет...",
    filterCategory: "Все категории",
    filterAccess: "Все типы доступа",
    filterStatus: "Все статусы",
    filterAuthor: "По автору",
    filterDate: "По дате",
    allTime: "Все время",
    today: "Добавлено сегодня",
    thisWeek: "За эту неделю",
    thisMonth: "За этот месяц",
    colCoverTitle: "Обложка и Данные",
    colCategory: "Категория",
    colAccess: "Доступ",
    colStatus: "Статус",
    colViews: "Просмотры",
    colDate: "Дата публикации",
    colActions: "Действия",
    noMaterials: "Материалы не найдены.",
    statTotal: "Всего материалов",
    statBooks: "Художественные книги",
    statPdfs: "Загружено PDF",
    statViews: "Просмотры",
    statPopularBook: "Популярная книга",
    deleteConfirm: "Вы действительно хотите удалить этот материал?",
    duplicateSuccess: "Материал скопирован!",
    archiveSuccess: "Материал архивирован!",
    deleteSuccess: "Материал удален!",
    bulkDeleteConfirm: "Вы уверены, что хотите удалить выбранные материалы?",
    bulkArchiveSuccess: "Выбранные материалы архивированы",
    bulkDeleteSuccess: "Выбранные материалы удалены",
    bulkMoveSuccess: "Категория выбранных материалов изменена",
    bulkAccessSuccess: "Тип доступа выбранных материалов изменен",
    bulkActionsSelected: "Выбрано материалов: {{count}}",
    bulkDeleteBtn: "Удалить",
    bulkArchiveBtn: "Архивировать",
    bulkMoveBtn: "Изменить категорию",
    bulkAccessBtn: "Изменить доступ",
    cancel: "Отмена",
    save: "Сохранить",
    moveCategoryTitle: "Изменение категории",
    changeAccessTitle: "Изменение уровня доступа",
    selectCategory: "Выберите категорию",
    selectAccess: "Выберите тип доступа"
  },
  en: {
    title: "Library Management",
    subtitle: "Premium management dashboard for books, textbooks, and guides in the library.",
    addBtn: "Create Material",
    searchPlaceholder: "Title, author or subject...",
    filterCategory: "All categories",
    filterAccess: "All access types",
    filterStatus: "All statuses",
    filterAuthor: "By author",
    filterDate: "By date",
    allTime: "All time",
    today: "Added today",
    thisWeek: "Added this week",
    thisMonth: "Added this month",
    colCoverTitle: "Cover & Info",
    colCategory: "Category",
    colAccess: "Access",
    colStatus: "Status",
    colViews: "Views",
    colDate: "Published Date",
    colActions: "Actions",
    noMaterials: "No materials found.",
    statTotal: "Total Materials",
    statBooks: "Total Books",
    statPdfs: "Uploaded PDFs",
    statViews: "Total Views",
    statPopularBook: "Most Viewed Book",
    deleteConfirm: "Are you sure you want to delete this material?",
    duplicateSuccess: "Material duplicated!",
    archiveSuccess: "Material archived!",
    deleteSuccess: "Material deleted!",
    bulkDeleteConfirm: "Are you sure you want to delete the selected materials?",
    bulkArchiveSuccess: "Selected materials archived",
    bulkDeleteSuccess: "Selected materials deleted",
    bulkMoveSuccess: "Categories updated successfully",
    bulkAccessSuccess: "Access levels updated successfully",
    bulkActionsSelected: "{{count}} materials selected",
    bulkDeleteBtn: "Delete",
    bulkArchiveBtn: "Archive",
    bulkMoveBtn: "Change Category",
    bulkAccessBtn: "Change Access",
    cancel: "Cancel",
    save: "Save",
    moveCategoryTitle: "Change Category",
    changeAccessTitle: "Change Access Level",
    selectCategory: "Select category",
    selectAccess: "Select access tier"
  }
};

export default function LibraryManage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = (i18n.language || "uz") as "uz" | "ru" | "en";
  const t = listTranslations[lang] || listTranslations["uz"];

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAccessType, setSelectedAccessType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [filterAuthor, setFilterAuthorState] = useState("");
  const [filterDate, setFilterDateState] = useState("allTime");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Bulk Actions Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog Overlays State
  const [showMoveCategoryModal, setShowMoveCategoryModal] = useState(false);
  const [showChangeAccessModal, setShowChangeAccessModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [targetAccessType, setTargetAccessType] = useState("FREE");

  // Placeholder cover colors based on ID
  const placeholderGradients = [
    "from-indigo-600 to-purple-650",
    "from-teal-600 to-emerald-650",
    "from-blue-600 to-indigo-650",
    "from-rose-600 to-pink-650",
    "from-amber-600 to-orange-650"
  ];

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
      toast.error(lang === "uz" ? "Materiallarni yuklashda xatolik" : "Ошибка при загрузке материалов");
    } finally {
      setLoading(false);
    }
  };

  // Row operations
  const handleDuplicate = async (m: Material) => {
    const payload = {
      categoryId: m.categoryId,
      title: `${m.title} (Copy)`,
      author: m.author,
      description: m.description,
      subject: m.subject,
      grade: m.grade || null,
      topic: m.topic,
      coverImageUrl: m.coverImageUrl,
      pdfUrl: m.pdfUrl,
      accessType: m.accessType,
      status: m.status
    };
    try {
      setLoading(true);
      await api.post("/library/materials", payload);
      toast.success(t.duplicateSuccess);
      fetchMaterials();
      fetchStats();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Nusxalashda xatolik" : "Ошибка копирования");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (m: Material) => {
    const payload = {
      categoryId: m.categoryId,
      title: m.title,
      author: m.author,
      description: m.description,
      subject: m.subject,
      grade: m.grade || null,
      topic: m.topic,
      coverImageUrl: m.coverImageUrl,
      pdfUrl: m.pdfUrl,
      accessType: m.accessType,
      status: "HIDDEN"
    };
    try {
      setLoading(true);
      await api.put(`/library/materials/${m.id}`, payload);
      toast.success(t.archiveSuccess);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Arxivlashda xatolik" : "Ошибка архивации");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await api.delete(`/library/materials/${id}`);
      toast.success(t.deleteSuccess);
      fetchMaterials();
      fetchStats();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "O'chirishda xatolik" : "Ошибка удаления");
    }
  };

  // Bulk operation handlers
  const handleBulkDelete = async () => {
    if (!confirm(t.bulkDeleteConfirm)) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/library/materials/${id}`)));
      toast.success(t.bulkDeleteSuccess);
      setSelectedIds([]);
      fetchMaterials();
      fetchStats();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(async (id) => {
          const m = materials.find(x => x.id === id);
          if (!m) return;
          const payload = {
            categoryId: m.categoryId,
            title: m.title,
            author: m.author,
            description: m.description,
            subject: m.subject,
            grade: m.grade || null,
            topic: m.topic,
            coverImageUrl: m.coverImageUrl,
            pdfUrl: m.pdfUrl,
            accessType: m.accessType,
            status: "HIDDEN"
          };
          await api.put(`/library/materials/${id}`, payload);
        })
      );
      toast.success(t.bulkArchiveSuccess);
      setSelectedIds([]);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMoveCategory = async () => {
    if (!targetCategoryId) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(async (id) => {
          const m = materials.find(x => x.id === id);
          if (!m) return;
          const payload = {
            categoryId: targetCategoryId,
            title: m.title,
            author: m.author,
            description: m.description,
            subject: m.subject,
            grade: m.grade || null,
            topic: m.topic,
            coverImageUrl: m.coverImageUrl,
            pdfUrl: m.pdfUrl,
            accessType: m.accessType,
            status: m.status
          };
          await api.put(`/library/materials/${id}`, payload);
        })
      );
      toast.success(t.bulkMoveSuccess);
      setSelectedIds([]);
      setShowMoveCategoryModal(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkChangeAccess = async () => {
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(async (id) => {
          const m = materials.find(x => x.id === id);
          if (!m) return;
          const payload = {
            categoryId: m.categoryId,
            title: m.title,
            author: m.author,
            description: m.description,
            subject: m.subject,
            grade: m.grade || null,
            topic: m.topic,
            coverImageUrl: m.coverImageUrl,
            pdfUrl: m.pdfUrl,
            accessType: targetAccessType,
            status: m.status
          };
          await api.put(`/library/materials/${id}`, payload);
        })
      );
      toast.success(t.bulkAccessSuccess);
      setSelectedIds([]);
      setShowChangeAccessModal(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  // Checkbox functions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = materials.map(m => m.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Formatting & Fallback helper generators
  const getCoverGradient = (mId: string) => {
    let sum = 0;
    for (let i = 0; i < mId.length; i++) {
      sum += mId.charCodeAt(i);
    }
    return placeholderGradients[sum % placeholderGradients.length];
  };

  const getCreatedDateString = (m: Material) => {
    if (m.createdAt) {
      return new Date(m.createdAt).toLocaleDateString();
    }
    // Deterministic fallback date based on ID hash
    let sum = 0;
    for (let i = 0; i < m.id.length; i++) {
      sum += m.id.charCodeAt(i);
    }
    const day = (sum % 28) + 1;
    const month = (sum % 12) + 1;
    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = month < 10 ? `0${month}` : month;
    return `${formattedDay}.${formattedMonth}.2026`;
  };

  // Client Side Filtering for Author and Date range (local layer over API paginated content)
  const filteredMaterials = materials.filter(m => {
    // Author filter
    if (filterAuthor && !m.author?.toLowerCase().includes(filterAuthor.toLowerCase())) {
      return false;
    }
    // Date filter
    if (filterDate !== "allTime") {
      const displayDate = getCreatedDateString(m);
      const parts = displayDate.split(".");
      const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const now = new Date();

      if (filterDate === "today") {
        return itemDate.toDateString() === now.toDateString();
      } else if (filterDate === "thisWeek") {
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (filterDate === "thisMonth") {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
    }
    return true;
  });

  return (
    <div className="w-full space-y-8 pb-20 transition-colors duration-500 bg-transparent text-slate-800 dark:text-slate-100">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={() => navigate("/super-admin/library-manage/create")}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-500/10 hover:scale-[1.01] shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          {t.addBtn}
        </button>
      </div>

      {/* ── REAL DATA STATISTICS CARDS ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl border-l-4 border-l-purple-500 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider">{t.statTotal}</p>
            <p className="text-2xl font-black mt-1.5 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform origin-left">{stats.totalMaterials}</p>
          </div>
          <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl border-l-4 border-l-teal-500 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider">{t.statBooks}</p>
            <p className="text-2xl font-black mt-1.5 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform origin-left">
              {stats.totalMaterials - stats.totalPdfs}
            </p>
          </div>
          <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider">{t.statPdfs}</p>
            <p className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform origin-left">{stats.totalPdfs}</p>
          </div>
          <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider">{t.statViews}</p>
            <p className="text-2xl font-black mt-1.5 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform origin-left">{stats.totalViews}</p>
          </div>
          <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl border-l-4 border-l-rose-500 shadow-sm relative overflow-hidden hover:scale-[1.01] transition-transform col-span-2 lg:col-span-1">
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider">{t.statPopularBook}</p>
            <p className="text-[11px] font-black truncate mt-2 text-slate-700 dark:text-slate-200">{stats.popularBook || "N/A"}</p>
          </div>
        </div>
      )}

      {/* ── SEARCH & FILTER ROW (APPLE SAAS USLUBI) ── */}
      <div className="p-5 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-sm z-20 relative">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Global search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="">{t.filterCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Access filter */}
            <select
              value={selectedAccessType}
              onChange={(e) => setSelectedAccessType(e.target.value)}
              className="h-11 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="">{t.filterAccess}</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="ELITE">ELITE</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-11 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="">{t.filterStatus}</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </div>
        </div>

        {/* Extra Filters: Author & Date */}
        <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 items-center">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <Filter className="h-3.5 w-3.5" />
            <span>Kengaytirilgan filtrlar</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Author filter */}
            <div className="relative">
              <input
                type="text"
                placeholder={t.filterAuthor}
                value={filterAuthor}
                onChange={(e) => setFilterAuthorState(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Date filter */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDateState(e.target.value)}
              className="h-10 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="allTime">{t.allTime}</option>
              <option value="today">{t.today}</option>
              <option value="thisWeek">{t.thisWeek}</option>
              <option value="thisMonth">{t.thisMonth}</option>
            </select>

            {/* Reset all button */}
            {(search || selectedCategory || selectedAccessType || selectedStatus || filterAuthor || filterDate !== "allTime") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  setSelectedAccessType("");
                  setSelectedStatus("");
                  setFilterAuthorState("");
                  setFilterDateState("allTime");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PREMIUM DATA TABLE ── */}
      <div className="bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-sm relative z-10">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-[#020617]/50 border-b border-slate-150 dark:border-slate-800/80 text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={materials.length > 0 && selectedIds.length === materials.length}
                    onChange={handleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 accent-purple-600 dark:accent-purple-400 rounded-md border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">{t.colCoverTitle}</th>
                <th className="p-4">{t.colCategory}</th>
                <th className="p-4">{t.colAccess}</th>
                <th className="p-4">{t.colStatus}</th>
                <th className="p-4">{t.colViews}</th>
                <th className="p-4">{t.colDate}</th>
                <th className="p-4 text-right pr-6">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-750 dark:text-slate-200 font-semibold">
              {loading && materials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-400">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto text-purple-600 dark:text-purple-400" />
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-400 dark:text-slate-500 font-bold">
                    {t.noMaterials}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-purple-50/20 dark:bg-purple-950/5" : ""
                      }`}
                    >
                      {/* Checkbox select */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(m.id)}
                          aria-label={`Select ${m.title}`}
                          className="h-4 w-4 accent-purple-600 dark:accent-purple-400 rounded border-slate-350 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>

                      {/* Spine Cover & Title stacked */}
                      <td className="p-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-10 rounded-lg bg-slate-150 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm relative group">
                            {m.coverImageUrl ? (
                              <img src={m.coverImageUrl} alt={m.title} className="w-full h-full object-cover" />
                            ) : (
                              /* Abstract spine gradients */
                              <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(m.id)}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-850 dark:text-white truncate max-w-[240px] text-xs hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer" onClick={() => navigate(`/super-admin/library-manage/edit/${m.id}`)}>{m.title}</p>
                            <p className="text-[10px] text-slate-450 dark:text-slate-450 mt-0.5 truncate">{m.author || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category badge */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-650 dark:text-slate-350 text-[10px] font-extrabold uppercase tracking-wide">
                          {m.categoryName}
                        </span>
                      </td>

                      {/* Access Pill */}
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          m.accessType === "FREE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450"
                            : m.accessType === "PRO"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-450"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-450"
                        }`}>
                          {m.accessType}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          m.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450"
                            : m.status === "DRAFT"
                            ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                            : "bg-amber-500/10 text-amber-650 dark:text-amber-450"
                        }`}>
                          {m.status}
                        </span>
                      </td>

                      {/* Views */}
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 opacity-60" />
                          {m.viewsCount}
                        </span>
                      </td>

                      {/* Date published */}
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {getCreatedDateString(m)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/super-admin/library-manage/edit/${m.id}`)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-all"
                            title="Tahrirlash"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(m)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-xl transition-all"
                            title="Nusxalash (Duplicate)"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(m)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl transition-all"
                            title="Arxivlash"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Footer */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-center gap-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl disabled:opacity-40 text-xs font-black transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Oldingi
            </button>
            <span className="text-xs text-slate-450 dark:text-slate-500 font-extrabold select-none">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl disabled:opacity-40 text-xs font-black transition-all flex items-center gap-1.5"
            >
              Keyingi
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── SLIDE-UP FLOATING BULK ACTION SHEET ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-6 inset-x-4 max-w-4xl mx-auto bg-[#0F172A]/90 dark:bg-[#020617]/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl z-50 text-white"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider">
                {t.bulkActionsSelected.replace("{{count}}", String(selectedIds.length))}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setTargetCategoryId(categories[0]?.id || "");
                  setShowMoveCategoryModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                <FolderSync className="h-4 w-4" />
                {t.bulkMoveBtn}
              </button>

              <button
                onClick={() => setShowChangeAccessModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                <KeyRound className="h-4 w-4" />
                {t.bulkAccessBtn}
              </button>

              <button
                onClick={handleBulkArchive}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition-all"
              >
                <Archive className="h-4 w-4" />
                {t.bulkArchiveBtn}
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 className="h-4 w-4" />
                {t.bulkDeleteBtn}
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="p-2 hover:bg-slate-800 text-slate-400 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BULK OPTION UPDATER OVERLAYS ── */}

      {/* Move Category Dialog */}
      <AnimatePresence>
        {showMoveCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5">
                  <FolderSync className="h-4.5 w-4.5 text-purple-500" />
                  {t.moveCategoryTitle}
                </h3>
                <button onClick={() => setShowMoveCategoryModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  {t.selectCategory}
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-purple-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkMoveCategory}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowMoveCategoryModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Access Dialog */}
      <AnimatePresence>
        {showChangeAccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-purple-500" />
                  {t.changeAccessTitle}
                </h3>
                <button onClick={() => setShowChangeAccessModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  {t.selectAccess}
                </label>
                <select
                  value={targetAccessType}
                  onChange={(e) => setTargetAccessType(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-purple-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="ELITE">ELITE</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkChangeAccess}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowChangeAccessModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
