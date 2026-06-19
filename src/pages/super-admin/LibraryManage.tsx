import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Loader2,
  Lock,
  Download,
  Info,
  Crop,
  Upload,
  CheckCircle2,
  BarChart2,
  Image as ImageIcon
} from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropUtils";

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
    subtitle: "Kutubxonadagi barcha materiallarni boshqarish.",
    addBtn: "Yangi material qo'shish",
    searchPlaceholder: "Nomi, muallifi yoki fan...",
    colViews: "O'qishlar",
    colDate: "Chop etilgan sana",
    noMaterials: "Ushbu bo'limda hech qanday material topilmadi.",
    statTotal: "Jami Materiallar",
    statFree: "FREE Materiallar",
    statPro: "PRO Materiallar",
    statElite: "ELITE Materiallar",
    deleteConfirm: "Materialni butunlay o'chirib tashlamoqchimisiz?",
    duplicateSuccess: "Material nusxalandi! 📋",
    archiveSuccess: "Material arxivlandi! 📦",
    deleteSuccess: "Material o'chirildi! 🗑️",
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
    selectAccess: "Kirish toifasini tanlang",
    pages: "bet",
    zoom: "Kattalashtirish"
  },
  ru: {
    title: "Управление Библиотекой",
    subtitle: "Управление всеми материалами в библиотеке.",
    addBtn: "Добавить материал",
    searchPlaceholder: "Название, автор или предмет...",
    colViews: "Просмотры",
    colDate: "Дата публикации",
    noMaterials: "В этом разделе материалы не найдены.",
    statTotal: "Всего материалов",
    statFree: "FREE материалы",
    statPro: "PRO материалы",
    statElite: "ELITE материалы",
    deleteConfirm: "Вы действительно хотите удалить этот материал?",
    duplicateSuccess: "Материал скопирован! 📋",
    archiveSuccess: "Материал архивирован! 📦",
    deleteSuccess: "Материал удален! 🗑️",
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
    selectAccess: "Выберите тип доступа",
    pages: "стр.",
    zoom: "Масштаб"
  },
  en: {
    title: "Library Management",
    subtitle: "Manage all materials in the library.",
    addBtn: "Add Material",
    searchPlaceholder: "Title, author or subject...",
    colViews: "Views",
    colDate: "Published Date",
    noMaterials: "No materials found in this section.",
    statTotal: "Total Materials",
    statFree: "FREE Materials",
    statPro: "PRO Materials",
    statElite: "ELITE Materials",
    deleteConfirm: "Are you sure you want to delete this material?",
    duplicateSuccess: "Material duplicated! 📋",
    archiveSuccess: "Material archived! 📦",
    deleteSuccess: "Material deleted! 🗑️",
    bulkDeleteConfirm: "Are you sure you want to delete the selected materials?",
    bulkArchiveSuccess: "Selected materials archived",
    bulkDeleteSuccess: "Selected materials deleted",
    bulkMoveSuccess: "Categories updated",
    bulkAccessSuccess: "Access tiers updated",
    bulkActionsSelected: "{{count}} materials selected",
    bulkDeleteBtn: "Delete",
    bulkArchiveBtn: "Archive",
    bulkMoveBtn: "Change Category",
    bulkAccessBtn: "Change Access",
    cancel: "Cancel",
    save: "Save",
    moveCategoryTitle: "Change Category",
    changeAccessTitle: "Change Access Tier",
    selectCategory: "Select Category",
    selectAccess: "Select Access Tier",
    pages: "pg",
    zoom: "Zoom"
  }
};

// 60 FPS Count-Up Animation Component
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = displayValue;
    const duration = 800; // ms

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentVal = Math.floor(progress * (value - startValue) + startValue);
      setDisplayValue(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export default function LibraryManage() {
  const navigate = useNavigate();
  const { id: routeEditId } = useParams<{ id?: string }>();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const lang = (i18n.language || "uz") as "uz" | "ru" | "en";
  const t = listTranslations[lang] || listTranslations["uz"];

  const role = user?.role?.toLowerCase() || "user";
  const rolePath = role === "super_admin" ? "super-admin" : role === "payment_manager" ? "pack-manager" : role;
  const basePath = `/${rolePath}`;

  // Database lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs (📖 Adabiy Kitoblar, 🎓 Maktab Darsliklari, 📚 O'quv Qo'llanmalar)
  const [activeTab, setActiveTab] = useState<"adabiy_kitoblar" | "maktab_darsliklari" | "oquv_qollanmalar">("adabiy_kitoblar");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMoveCategoryModal, setShowMoveCategoryModal] = useState(false);
  const [showChangeAccessModal, setShowChangeAccessModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [targetAccessType, setTargetAccessType] = useState("FREE");

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccess, setFilterAccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // SIDE DRAWER STATES
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Drawer Form States
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");
  const [formAccessType, setFormAccessType] = useState("FREE");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  // Drawer Upload / Cropper States
  const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<{ name: string; size: string; pageCount: number } | null>(null);

  // Drag over states
  const [isDragOverCover, setIsDragOverCover] = useState(false);
  const [isDragOverPdf, setIsDragOverPdf] = useState(false);

  // Detailed Stats Modal State
  const [selectedStatsMaterial, setSelectedStatsMaterial] = useState<Material | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── API URL Formatter ──
  const getFileUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const baseUrl = api.defaults.baseURL || "";
    const origin = baseUrl.replace("/api/v1", "");
    return `${origin}${url}`;
  };

  // Fetch initial content
  useEffect(() => {
    fetchCategories();
    fetchMaterials();
    fetchStats();
  }, []);

  // Sync route edit ID
  useEffect(() => {
    if (routeEditId) {
      openEditDrawer(routeEditId);
    }
  }, [routeEditId]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/library/categories");
      setCategories(res.data);
    } catch (e) {
      console.error("Categories fetch error:", e);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get("/library/materials", {
        params: { size: 500 } // Fetch a large batch for bookshelf rendering
      });
      setMaterials(res.data.content || []);
    } catch (e) {
      console.error("Materials fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/library/statistics");
      setStats(res.data);
    } catch (e) {
      console.error("Stats fetch error:", e);
    }
  };

  // Helper generators for spine gradients
  const getSpineGradient = (mId: string) => {
    const gradients = [
      "from-purple-800 to-purple-650",
      "from-indigo-800 to-indigo-650",
      "from-emerald-800 to-emerald-650",
      "from-teal-800 to-teal-650",
      "from-amber-800 to-amber-650",
      "from-rose-800 to-rose-650"
    ];
    let sum = 0;
    for (let i = 0; i < mId.length; i++) sum += mId.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  const getGradientForCategory = (catCode: string) => {
    const code = catCode?.toLowerCase() || "";
    if (code.includes("adabiy") || code.includes("literary")) return "from-indigo-600 to-purple-600";
    if (code.includes("maktab") || code.includes("school")) return "from-emerald-600 to-teal-600";
    if (code.includes("oquv") || code.includes("study") || code.includes("guide")) return "from-amber-600 to-orange-600";
    return "from-[#8B5CF6] to-[#6366F1]";
  };

  // CRUD Actions
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

  // Bulk actions
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

  // Card select/checkbox toggler
  const toggleSelectCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // DRAWER FORM ACTIONS
  const openCreateDrawer = () => {
    setEditingMaterialId(null);
    setFormTitle("");
    setFormAuthor("");
    setFormDescription("");
    setFormSubject("");
    setFormGrade("");
    setFormTopic("");
    setFormCategoryId(categories[0]?.id || "");
    setFormCoverImageUrl("");
    setFormPdfUrl("");
    setFormAccessType("FREE");
    setFormStatus("ACTIVE");
    setCoverImageSrc(null);
    setPdfMetadata(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/library/materials/${id}`);
      const m = res.data;
      setEditingMaterialId(id);
      setFormTitle(m.title);
      setFormAuthor(m.author || "");
      setFormDescription(m.description || "");
      setFormSubject(m.subject || "");
      setFormGrade(m.grade || "");
      setFormTopic(m.topic || "");
      setFormCategoryId(m.categoryId);
      setFormCoverImageUrl(m.coverImageUrl || "");
      setFormPdfUrl(m.pdfUrl || "");
      setFormAccessType(m.accessType || "FREE");
      setFormStatus(m.status || "ACTIVE");
      setCoverImageSrc(null);
      
      if (m.pdfUrl) {
        setPdfMetadata({
          name: m.pdfUrl.split("/").pop() || "material.pdf",
          size: "N/A",
          pageCount: 0
        });
      } else {
        setPdfMetadata(null);
      }

      setIsDrawerOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Material yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingMaterialId(null);
    // Remove params from URL if any
    if (routeEditId) {
      navigate("/super-admin/library-manage");
    }
  };

  // Inline Image crop handling inside Drawer
  const handleCoverUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm yuklash mumkin");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCroppedImage = async () => {
    if (!coverImageSrc || !croppedAreaPixels) return;
    try {
      setUploadingImage(true);
      const croppedBlob = await getCroppedImg(coverImageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        toast.error("Rasmni kesishda xatolik yuz berdi");
        return;
      }

      const file = new File([croppedBlob], "cover.webp", { type: "image/webp" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormCoverImageUrl(res.data);
      toast.success("Muqova yuklandi! 🖼️");
      setCoverImageSrc(null);
    } catch (e) {
      console.error(e);
      toast.error("Muqovani yuklashda xatolik");
    } finally {
      setUploadingImage(false);
    }
  };

  // PDF Upload & client-side metadata reader
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve((window as any).pdfjsLib);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const processPdfFile = async (file: File) => {
    try {
      const pdfjs = await loadPdfJS();
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument(typedarray).promise;
          const numPages = pdf.numPages;

          setPdfMetadata({
            name: file.name,
            size: parseFloat((file.size / (1024 * 1024)).toFixed(2)) + " MB",
            pageCount: numPages
          });
        } catch (err) {
          console.error(err);
          setPdfMetadata({
            name: file.name,
            size: parseFloat((file.size / (1024 * 1024)).toFixed(2)) + " MB",
            pageCount: 0
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      setPdfMetadata({
        name: file.name,
        size: parseFloat((file.size / (1024 * 1024)).toFixed(2)) + " MB",
        pageCount: 0
      });
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Faqat PDF yuklash mumkin");
      return;
    }
    try {
      setUploadingPdf(true);
      const formData = new FormData();
      formData.append("file", file);

      await processPdfFile(file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormPdfUrl(res.data);
      toast.success("PDF yuklandi! 📚");
    } catch (e) {
      console.error(e);
      toast.error("PDF yuklashda xatolik");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Submit Drawer Form
  const saveDrawerForm = async () => {
    if (!formTitle || !formAuthor || !formCategoryId) {
      toast.warning("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    if (!formPdfUrl) {
      toast.warning("Iltimos, material PDF faylini yuklang!");
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
      setSavingForm(true);
      if (editingMaterialId) {
        await api.put(`/library/materials/${editingMaterialId}`, payload);
        toast.success("Material yangilandi 💾");
      } else {
        await api.post("/library/materials", payload);
        toast.success("Yangi material yaratildi 🎉");
      }
      closeDrawer();
      fetchMaterials();
      fetchStats();
    } catch (e: any) {
      console.error(e);
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setSavingForm(false);
    }
  };

  // Rich formatting toolbar logic for Drawer
  const insertFormatting = (type: "bold" | "italic" | "underline" | "list" | "code") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    let replacement = "";
    switch (type) {
      case "bold":
        replacement = `**${selectedText || "qalin"}**`;
        break;
      case "italic":
        replacement = `*${selectedText || "qiya"}*`;
        break;
      case "underline":
        replacement = `<u>${selectedText || "chizilgan"}</u>`;
        break;
      case "list":
        replacement = `\n- ${selectedText || "element"}`;
        break;
      case "code":
        replacement = `\`${selectedText || "kod"}\``;
        break;
    }
    const newText = text.substring(0, start) + replacement + text.substring(end);
    if (newText.length <= 1000) {
      setFormDescription(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      }, 0);
    }
  };

  const formattingOptions = [
    { type: "bold" as const, label: "B", title: "Bold" },
    { type: "italic" as const, label: "I", title: "Italic" },
    { type: "underline" as const, label: "U", title: "Underline" },
    { type: "list" as const, label: "• List", title: "Bullet List" },
    { type: "code" as const, label: "</> Code", title: "Code Block" }
  ];

  // Filtering materials to display in grid (Local Tab-filter + search query)
  const filteredMaterials = materials.filter(m => {
    // Tab category filter
    const matchedCategory = categories.find(c => c.id === m.categoryId);
    if (!matchedCategory || matchedCategory.code !== activeTab) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchAuthor = m.author?.toLowerCase().includes(q);
      const matchSubject = m.subject?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchSubject) return false;
    }
    // Access Type
    if (filterAccess && m.accessType !== filterAccess) return false;
    // Status
    if (filterStatus && m.status !== filterStatus) return false;

    return true;
  });

  // Calculate dynamic stats from list
  const activeTabMaterials = materials.filter(m => {
    const cat = categories.find(c => c.id === m.categoryId);
    return cat && cat.code === activeTab;
  });
  const countTotal = activeTabMaterials.length;
  const countFree = activeTabMaterials.filter(m => m.accessType === "FREE").length;
  const countPro = activeTabMaterials.filter(m => m.accessType === "PRO").length;
  const countElite = activeTabMaterials.filter(m => m.accessType === "ELITE").length;

  return (
    <div className="w-full min-h-[90vh] bg-[#F8FAFC] dark:bg-[#070B17] text-slate-800 dark:text-white p-6 md:p-8 rounded-[24px] border border-black/5 dark:border-white/5 shadow-2xl relative transition-colors duration-500">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200 dark:border-white/5">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-8 w-8 text-[#8B5CF6]" />
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        
        <button
          onClick={openCreateDrawer}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#8B5CF6]/20 hover:scale-[1.01] shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          {t.addBtn}
        </button>
      </div>

      {/* ── STATISTICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          { key: "total", label: t.statTotal, val: countTotal, color: "border-l-purple-500 text-purple-600 dark:text-purple-400", bg: "bg-purple-500/5" },
          { key: "free", label: t.statFree, val: countFree, color: "border-l-emerald-500 text-emerald-600 dark:text-emerald-450", bg: "bg-emerald-500/5" },
          { key: "pro", label: t.statPro, val: countPro, color: "border-l-blue-500 text-blue-600 dark:text-blue-450", bg: "bg-blue-500/5" },
          { key: "elite", label: t.statElite, val: countElite, color: "border-l-amber-500 text-amber-600 dark:text-amber-450", bg: "bg-amber-500/5" }
        ].map((statCard) => (
          <div
            key={statCard.key}
            className={`p-5 bg-white dark:bg-[#0F172A] border border-slate-200/50 dark:border-white/5 rounded-[24px] border-l-4 ${statCard.color} shadow-sm relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300`}
          >
            <div className={`absolute -right-6 -bottom-6 w-20 h-20 ${statCard.bg} rounded-full blur-xl group-hover:scale-125 transition-all`} />
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-black uppercase tracking-wider relative z-10">{statCard.label}</p>
            <p className="text-3xl font-black mt-2 transition-transform origin-left relative z-10">
              <AnimatedNumber value={statCard.val} />
            </p>
          </div>
        ))}
      </div>

      {/* ── SEARCH & TAB BAR ── */}
      <div className="p-4 bg-white dark:bg-[#0F172A] border border-slate-200/50 dark:border-white/5 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shadow-sm">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { code: "adabiy_kitoblar", label: "📖 Adabiy Kitoblar" },
            { code: "maktab_darsliklari", label: "🎓 Maktab Darsliklari" },
            { code: "oquv_qollanmalar", label: "📚 O'quv Qo'llanmalar" }
          ].map((tabSpec) => {
            const isSelected = activeTab === tabSpec.code;
            return (
              <button
                key={tabSpec.code}
                onClick={() => {
                  setActiveTab(tabSpec.code as any);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  isSelected
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15 scale-[1.01]"
                    : "text-slate-500 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {tabSpec.label}
              </button>
            );
          })}
        </div>

        {/* Global search */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition-all"
            />
          </div>

          {/* Access filter */}
          <select
            value={filterAccess}
            onChange={(e) => setFilterAccess(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="">Barcha kirishlar</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ELITE">ELITE</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="HIDDEN">HIDDEN</option>
          </select>
        </div>
      </div>

      {/* ── NETFLIX-STYLE BOOKSHELF GRID ── */}
      {loading && materials.length === 0 ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-20 text-center bg-white dark:bg-[#0F172A] border border-slate-200/50 dark:border-white/5 rounded-[24px] text-slate-400 font-bold">
          {t.noMaterials}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-start pb-20">
          {filteredMaterials.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            const spineGrad = getSpineGradient(m.id);
            
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col select-none"
              >
                
                {/* Book Cover Box with realistic 3D volume */}
                <div
                  className={`relative aspect-[2/3] rounded-r-2xl overflow-hidden border border-slate-250 dark:border-white/10 shadow-[2px_4px_10px_rgba(0,0,0,0.1)] transition-all duration-500 ease-out group-hover:scale-105 group-hover:shadow-[0_15px_30px_rgba(139,92,246,0.25)] group-hover:border-[#8B5CF6]/50 bg-slate-100 dark:bg-[#070B17] ${
                    isSelected ? "ring-2 ring-[#8B5CF6] scale-102" : ""
                  }`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  
                  {/* Left Spine Overlay Effect */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[8px] bg-gradient-to-r ${spineGrad} z-10 opacity-70`} />

                  {/* Cover image or Kindle gradient layout */}
                  {m.coverImageUrl ? (
                    <img
                      src={getFileUrl(m.coverImageUrl)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                      alt={m.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory(activeTab)} p-4 pl-6 flex flex-col justify-between text-white text-left`}>
                      <div className="text-[6px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
                      <div className="my-auto space-y-1">
                        <h4 className="text-[9px] font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow-md">
                          {m.title}
                        </h4>
                        <p className="text-[7px] font-bold opacity-80 line-clamp-1">{m.author || "Muallif"}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/20 pt-1 text-[5px] font-black opacity-70">
                        <span>PREMIUM EDITION</span>
                        <span>📚</span>
                      </div>
                    </div>
                  )}

                  {/* Floating Selection Checkbox Bubble */}
                  <div
                    onClick={(e) => toggleSelectCard(m.id, e)}
                    className={`absolute top-3 right-3 h-5 w-5 rounded-full border transition-all flex items-center justify-center z-25 ${
                      isSelected
                        ? "bg-[#8B5CF6] border-[#8B5CF6] text-white scale-110 shadow-md"
                        : "bg-black/30 border-white/40 opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-black/50"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>

                  {/* Hover Backdrop-Blur overlay with Quick Actions */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2.5 z-20 p-4">
                    
                    {/* View Action */}
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/library/read/${m.id}`)}
                      className="w-full py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ko'rish
                    </button>

                    {/* Edit Action */}
                    <button
                      type="button"
                      onClick={() => openEditDrawer(m.id)}
                      className="w-full py-2 bg-[#8B5CF6] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#7c4fe3] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow shadow-[#8B5CF6]/20"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Tahrirlash
                    </button>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      O'chirish
                    </button>

                    {/* Stats Action */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatsMaterial(m)}
                      className="w-full py-2 bg-slate-800 text-slate-350 hover:bg-slate-750 rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      Statistika
                    </button>

                  </div>

                  {/* Access Badge Overlay */}
                  <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow z-15 ${
                    m.accessType === "FREE"
                      ? "bg-emerald-500 text-white"
                      : m.accessType === "PRO"
                      ? "bg-blue-600 text-white"
                      : "bg-amber-500 text-slate-950"
                  }`}>
                    {m.accessType}
                  </span>

                </div>

                {/* Book Card Metadata Info below Cover */}
                <div className="mt-3 text-left space-y-1 px-1">
                  <h4 className="text-xs font-black text-slate-850 dark:text-white line-clamp-1 truncate group-hover:text-[#8B5CF6] transition-colors leading-tight">
                    {m.title}
                  </h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-450 font-bold truncate leading-none">
                    {m.author || "N/A"}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-white/5 mt-1.5">
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {m.viewsCount}</span>
                    <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {m.createdAt ? new Date(m.createdAt).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' }) : "2026"}</span>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── FLOATING BULK ACTIONS BOTTOM SHEET ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-6 inset-x-4 max-w-4xl mx-auto bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-[24px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl z-40 text-slate-800 dark:text-white"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#8B5CF6] animate-pulse" />
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
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold rounded-xl transition-all"
              >
                <FolderSync className="h-4 w-4 text-[#8B5CF6]" />
                {t.bulkMoveBtn}
              </button>

              <button
                onClick={() => setShowChangeAccessModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold rounded-xl transition-all"
              >
                <KeyRound className="h-4 w-4 text-[#8B5CF6]" />
                {t.bulkAccessBtn}
              </button>

              <button
                onClick={handleBulkArchive}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold transition-all"
              >
                <Archive className="h-4 w-4" />
                {t.bulkArchiveBtn}
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 className="h-4 w-4" />
                {t.bulkDeleteBtn}
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDE DRAWER (CRUD FORM & LIVE PREVIEW) ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black z-50 pointer-events-auto backdrop-blur-[1px]"
            />

            {/* Slide-over Panel (700px width) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-white/10 z-[60] flex flex-col shadow-2xl overflow-hidden text-slate-850 dark:text-white"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-slate-50 dark:bg-[#070B17] border-b border-slate-200 dark:border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5.5 w-5.5 text-[#8B5CF6]" />
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight uppercase tracking-wide">
                      {editingMaterialId ? "Materialni Tahrirlash" : "Yangi material yaratish"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Kutubxona material rekvizitlari va PDF hujjatini yuklash
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                >
                  <X className="h-5.5 w-5.5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable Split columns) */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT PANEL (col-span-5): Uploads & Preview */}
                  <div className="md:col-span-5 space-y-6">
                    
                    {/* Cover Upload Card */}
                    <div className="p-4 bg-slate-50/50 dark:bg-[#070B17]/40 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-3">
                      <LabelText>Muqova rasmi</LabelText>
                      
                      {coverImageSrc ? (
                        <div className="space-y-3">
                          <div className="relative w-full h-56 rounded-xl overflow-hidden bg-black/20">
                            <Cropper
                              image={coverImageSrc}
                              crop={crop}
                              zoom={zoom}
                              aspect={2 / 3}
                              onCropChange={setCrop}
                              onCropComplete={(_, px) => setCroppedAreaPixels(px)}
                              onZoomChange={setZoom}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              value={zoom}
                              min={1}
                              max={3}
                              step={0.1}
                              aria-label="Zoom"
                              onChange={(e) => setZoom(Number(e.target.value))}
                              className="w-full accent-[#8B5CF6] h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCoverImageSrc(null)}
                              className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg hover:bg-slate-300"
                            >
                              Bekor qilish
                            </button>
                            <button
                              type="button"
                              onClick={handleUploadCroppedImage}
                              disabled={uploadingImage}
                              className="flex-1 py-1.5 bg-[#8B5CF6] text-white text-xs font-bold rounded-lg hover:bg-[#7c4fe3] disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {uploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crop className="h-3 w-3" />}
                              Saqlash
                            </button>
                          </div>
                        </div>
                      ) : formCoverImageUrl ? (
                        <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#070B17] border border-slate-250 dark:border-white/5 rounded-xl">
                          <div className="w-12 aspect-[2/3] rounded overflow-hidden border shrink-0">
                            <img src={getFileUrl(formCoverImageUrl)} className="w-full h-full object-cover" alt="Cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Yuklandi
                            </p>
                            <div className="flex gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => setCoverImageSrc(getFileUrl(formCoverImageUrl))}
                                className="text-[9px] text-[#8B5CF6] font-bold hover:underline"
                              >
                                Crop
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormCoverImageUrl("")}
                                className="text-[9px] text-red-500 font-bold hover:underline"
                              >
                                O'chirish
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOverCover(true); }}
                          onDragLeave={() => setIsDragOverCover(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOverCover(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleCoverUpload(file);
                          }}
                          className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[110px] relative cursor-pointer ${
                            isDragOverCover ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "border-slate-300 dark:border-white/10 hover:border-[#8B5CF6]/60"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCoverUpload(file);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <ImageIcon className="h-5 w-5 text-[#8B5CF6] mb-1.5" />
                          <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Drag & Drop / Rasm yuklash</p>
                        </div>
                      )}
                    </div>

                    {/* PDF Upload Card */}
                    <div className="p-4 bg-slate-50/50 dark:bg-[#070B17]/40 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-3">
                      <LabelText>PDF yuklash</LabelText>

                      {formPdfUrl ? (
                        <div className="p-3 bg-white dark:bg-[#070B17] border border-slate-250 dark:border-white/5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              PDF Yuklandi
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormPdfUrl("")}
                              className="text-red-500 hover:text-red-650"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] font-extrabold text-slate-350 truncate">{pdfMetadata?.name || "material.pdf"}</p>
                          <p className="text-[9px] text-slate-450 font-bold">
                            {pdfMetadata?.size ? `${pdfMetadata.size}  •  ` : ""}
                            {pdfMetadata?.pageCount ? `${pdfMetadata.pageCount} bet` : ""}
                          </p>
                        </div>
                      ) : uploadingPdf ? (
                        <div className="border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-[#070B17]/10 h-28">
                          <Loader2 className="h-5 w-5 text-[#8B5CF6] animate-spin mb-1.5" />
                          <p className="text-[9px] font-black uppercase text-[#8B5CF6]">Yuklanmoqda...</p>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOverPdf(true); }}
                          onDragLeave={() => setIsDragOverPdf(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOverPdf(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handlePdfUpload(file);
                          }}
                          className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[110px] relative cursor-pointer ${
                            isDragOverPdf ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "border-slate-300 dark:border-white/10 hover:border-[#8B5CF6]/60"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePdfUpload(file);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Upload className="h-5 w-5 text-red-500 mb-1.5" />
                          <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider">PDF yuklash yoki tashlang</p>
                        </div>
                      )}
                    </div>

                    {/* LIVE 3D PREVIEW CARD */}
                    <div className="p-4 bg-slate-50/50 dark:bg-[#070B17]/40 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-4">
                      <LabelText>Jonli ko'rinish (Live Preview)</LabelText>
                      
                      <div className="relative w-36 h-52 mx-auto" style={{ perspective: "1000px" }}>
                        <div
                          className="w-full h-full relative transition-transform duration-500 ease-out"
                          style={{ transformStyle: "preserve-3d", transform: "rotateY(-12deg) rotateX(6deg)" }}
                        >
                          {/* Spine */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-[10px] origin-right bg-gradient-to-r from-purple-800 to-purple-650"
                            style={{ transform: "rotateY(-90deg) translateZ(0px)", boxShadow: "inset -1px 0 3px rgba(0,0,0,0.4)" }}
                          />
                          
                          {/* Pages Stack */}
                          <div
                            className="absolute right-0 top-[2px] bottom-[2px] w-[8px] bg-slate-100 border-y border-r border-slate-300"
                            style={{
                              transform: "rotateY(0deg) translateZ(-8px)",
                              boxShadow: "inset 1px 0 3px rgba(0,0,0,0.1)",
                              backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 1px, #e2e8f0 1px, #e2e8f0 2px)"
                            }}
                          />

                          {/* Front cover */}
                          <div
                            className="absolute inset-0 rounded-r-lg overflow-hidden border border-white/20 select-none shadow-md"
                            style={{ transform: "translateZ(0px)" }}
                          >
                            {formCoverImageUrl ? (
                              <img src={getFileUrl(formCoverImageUrl)} className="w-full h-full object-cover" alt="Cover Preview" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory(activeTab)} p-3 flex flex-col justify-between text-white text-left`}>
                                <div className="text-[6px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
                                <div className="my-auto space-y-1">
                                  <h4 className="text-[8px] font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow-md">
                                    {formTitle || "NOMI"}
                                  </h4>
                                  <p className="text-[7px] font-bold opacity-80 line-clamp-1">{formAuthor || "Muallif"}</p>
                                </div>
                                <div className="flex items-center justify-between border-t border-white/20 pt-1 text-[5px] font-black opacity-70">
                                  <span>PREMIUM</span>
                                  <span>📚</span>
                                </div>
                              </div>
                            )}

                            {/* Access Badge */}
                            <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider shadow ${
                              formAccessType === "FREE" ? "bg-[#22C55E] text-white" : formAccessType === "PRO" ? "bg-[#3B82F6] text-white" : "bg-[#F59E0B] text-slate-950"
                            }`}>
                              {formAccessType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT PANEL (col-span-7): Input Fields */}
                  <div className="md:col-span-7 space-y-5">
                    
                    {/* Material Title */}
                    <div className="space-y-1.5">
                      <LabelText>Material nomi *</LabelText>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full h-11 px-4 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:border-[#8B5CF6]"
                        placeholder="Material nomini kiriting"
                      />
                    </div>

                    {/* Author */}
                    <div className="space-y-1.5">
                      <LabelText>Muallif *</LabelText>
                      <input
                        type="text"
                        required
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        className="w-full h-11 px-4 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:border-[#8B5CF6]"
                        placeholder="Muallif ismini kiriting"
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <LabelText>Kategoriya *</LabelText>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full h-11 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#8B5CF6]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#0F172A] text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject (Fan) */}
                    <div className="space-y-1.5">
                      <LabelText>Fan</LabelText>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full h-11 px-4 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:border-[#8B5CF6]"
                        placeholder="Fanni kiriting (masalan, Matematika)"
                      />
                    </div>

                    {/* Grade (Sinf) */}
                    <div className="space-y-1.5">
                      <LabelText>Sinf</LabelText>
                      <select
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        className="w-full h-11 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#8B5CF6]"
                      >
                        <option value="" className="bg-[#0F172A] text-slate-400">Sinfsiz (Barcha sinflar)</option>
                        {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((g) => (
                          <option key={g} value={g} className="bg-[#0F172A] text-white">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Topic (Mavzu) */}
                    <div className="space-y-1.5">
                      <LabelText>Mavzu</LabelText>
                      <input
                        type="text"
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        className="w-full h-11 px-4 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:border-[#8B5CF6]"
                        placeholder="Mavzuni kiriting"
                      />
                    </div>

                    {/* Access Tier Segmented buttons */}
                    <div className="space-y-1.5">
                      <LabelText>Kirish turi (Access Tier)</LabelText>
                      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 dark:bg-[#070B17] rounded-xl border border-slate-250 dark:border-white/10">
                        {accessOptions.map((opt) => {
                          const isSelected = formAccessType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFormAccessType(opt.value)}
                              className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15 scale-[1.01]"
                                  : "text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
                              }`}
                            >
                              {opt.value !== "FREE" && <Lock className="h-3 w-3" />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description Textarea with formatting toolbar */}
                    <div className="space-y-1.5">
                      <LabelText>Tavsif</LabelText>
                      <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl">
                        {formattingOptions.map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => insertFormatting(opt.type)}
                            title={opt.title}
                            className="h-8 px-2.5 rounded-lg text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          rows={4}
                          value={formDescription}
                          maxLength={1000}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Material haqida qisqacha tavsif yozing..."
                          className="w-full p-3.5 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:border-[#8B5CF6] resize-none"
                        />
                        <span className="absolute right-3.5 bottom-2.5 text-[9px] font-black text-slate-400">
                          {formDescription.length} / 1000
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Drawer Footer (Sticky Actions) */}
              <div className="p-6 bg-slate-50 dark:bg-[#070B17] border-t border-slate-200 dark:border-white/5 flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-300 dark:hover:bg-slate-750 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={savingForm}
                  onClick={saveDrawerForm}
                  className="flex-1 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7c4fe3] hover:to-[#5558e0] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2"
                >
                  {savingForm ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      {t.saving}
                    </>
                  ) : editingMaterialId ? (
                    "Yangilash"
                  ) : (
                    "Chop Etish"
                  )}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DETAIL STATISTICS QUICK MODAL ── */}
      <AnimatePresence>
        {selectedStatsMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-250 dark:border-white/10 rounded-[24px] p-6 shadow-2xl space-y-4 text-slate-850 dark:text-white relative"
            >
              <button
                onClick={() => setSelectedStatsMaterial(null)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex gap-4">
                <div className="w-16 aspect-[2/3] rounded overflow-hidden border shrink-0">
                  {selectedStatsMaterial.coverImageUrl ? (
                    <img src={getFileUrl(selectedStatsMaterial.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory(activeTab)}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wide line-clamp-2">
                    {selectedStatsMaterial.title}
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold mt-1">
                    Muallif: {selectedStatsMaterial.author || "N/A"}
                  </p>
                </div>
              </div>

              {/* Stats parameters list */}
              <div className="p-4 bg-slate-50 dark:bg-[#070B17] rounded-xl border border-slate-250 dark:border-white/5 text-xs font-bold text-slate-500 dark:text-slate-350 space-y-3">
                <div className="flex justify-between">
                  <span>Jami o'qishlar soni (Views)</span>
                  <span className="text-[#8B5CF6] font-black">{selectedStatsMaterial.viewsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Yuklab olishlar (Downloads)</span>
                  <span className="text-[#8B5CF6] font-black">{selectedStatsMaterial.downloadsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kirish huquqi (Tier)</span>
                  <span className="text-white bg-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{selectedStatsMaterial.accessType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="text-emerald-500 font-black">{selectedStatsMaterial.status}</span>
                </div>
              </div>

              {/* Quick operations */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleDuplicate(selectedStatsMaterial);
                    setSelectedStatsMaterial(null);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy className="h-4 w-4 text-[#8B5CF6]" />
                  Nusxalash
                </button>
                <button
                  onClick={() => {
                    handleArchive(selectedStatsMaterial);
                    setSelectedStatsMaterial(null);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Archive className="h-4 w-4 text-amber-500" />
                  Arxivlash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move Category Dialog overlay */}
      <AnimatePresence>
        {showMoveCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-[1px]">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-250 dark:border-white/10 rounded-[24px] p-6 shadow-2xl space-y-5 text-slate-850 dark:text-white"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <FolderSync className="h-4.5 w-4.5 text-[#8B5CF6]" />
                  {t.moveCategoryTitle}
                </h3>
                <button onClick={() => setShowMoveCategoryModal(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white">
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
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBulkMoveCategory}
                  className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowMoveCategoryModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Access Dialog overlay */}
      <AnimatePresence>
        {showChangeAccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-[1px]">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-250 dark:border-white/10 rounded-[24px] p-6 shadow-2xl space-y-5 text-slate-850 dark:text-white"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-[#8B5CF6]" />
                  {t.changeAccessTitle}
                </h3>
                <button onClick={() => setShowChangeAccessModal(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white">
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
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-[#070B17] border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="ELITE">ELITE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBulkChangeAccess}
                  className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowChangeAccessModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Utility styling components
const LabelText = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
    {children}
  </label>
);
