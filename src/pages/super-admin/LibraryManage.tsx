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
  Image as ImageIcon,
  MoreVertical,
  ChevronDown,
  ExternalLink,
  BookMarked,
  Layers,
  ArrowUpRight,
  Flame,
  Globe
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

const listTranslations = {
  uz: {
    title: "Kutubxona Tizimi",
    subtitle: "Enterprise-grade raqamli kutubxona boshqaruvi.",
    addBtn: "Yangi Material",
    searchPlaceholder: "Nomi, muallifi yoki fani bo'yicha qidirish...",
    colViews: "Ko'rishlar",
    colDate: "Sana",
    noMaterials: "Hech qanday material topilmadi.",
    statTotal: "Jami Materiallar",
    statFree: "FREE Tier",
    statPro: "PRO Tier",
    statElite: "ELITE Tier",
    duplicateSuccess: "Material nusxalandi! 📋",
    archiveSuccess: "Material arxivlandi! 📦",
    deleteSuccess: "Material o'chirildi! 🗑️",
    bulkDeleteConfirm: "Tanlangan materiallarni butunlay o'chirishni xohlaysizmi?",
    bulkArchiveSuccess: "Tanlangan materiallar arxivlandi",
    bulkDeleteSuccess: "Tanlangan materiallar o'chirildi",
    bulkMoveSuccess: "Kategoriyalar o'zgartirildi",
    bulkAccessSuccess: "Kirish huquqlari o'zgartirildi",
    bulkActionsSelected: "{{count}} ta material tanlandi",
    bulkDeleteBtn: "O'chirish",
    bulkArchiveBtn: "Arxivlash",
    bulkMoveBtn: "Kategoriyani o'zgartirish",
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
    title: "Цифровая Библиотека",
    subtitle: "Управление цифровыми материалами корпоративного уровня.",
    addBtn: "Новый Материал",
    searchPlaceholder: "Поиск по названию, автору или предмету...",
    colViews: "Просмотры",
    colDate: "Дата",
    noMaterials: "Материалы не найдены.",
    statTotal: "Всего материалов",
    statFree: "FREE материалы",
    statPro: "PRO материалы",
    statElite: "ELITE материалы",
    duplicateSuccess: "Материал скопирован! 📋",
    archiveSuccess: "Материал архивирован! 📦",
    deleteSuccess: "Материал удален! 🗑️",
    bulkDeleteConfirm: "Вы действительно хотите удалить выбранные материалы?",
    bulkArchiveSuccess: "Выбранные материалы архивированы",
    bulkDeleteSuccess: "Выбранные материалы удалены",
    bulkMoveSuccess: "Категория изменена",
    bulkAccessSuccess: "Тип доступа изменен",
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
    title: "Digital Library",
    subtitle: "Enterprise-grade digital library asset management.",
    addBtn: "Add Material",
    searchPlaceholder: "Search by title, author, subject...",
    colViews: "Views",
    colDate: "Date",
    noMaterials: "No materials found.",
    statTotal: "Total Materials",
    statFree: "FREE Tier",
    statPro: "PRO Tier",
    statElite: "ELITE Tier",
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

const accessOptions = [
  { value: "FREE", label: "FREE" },
  { value: "PRO", label: "PRO" },
  { value: "ELITE", label: "ELITE" }
];

const statusOptions = [
  { value: "ACTIVE", label: "Faol (Active)" },
  { value: "DRAFT", label: "Qoralama (Draft)" },
  { value: "HIDDEN", label: "Yashirin (Hidden)" }
];

// Count-Up Animation Component
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

// Deterministic Page count generator
const getPagesCount = (mId: string) => {
  if (!mId) return 180;
  let sum = 0;
  for (let i = 0; i < mId.length; i++) {
    sum += mId.charCodeAt(i);
  }
  return (sum % 280) + 120;
};

// Deterministic Accent generator for covers
const getCoverAccent = (mId: string) => {
  const placeholderAccents = [
    "from-indigo-600 to-purple-650",
    "from-teal-650 to-emerald-650",
    "from-blue-600 to-indigo-650",
    "from-rose-600 to-pink-650",
    "from-amber-600 to-orange-650"
  ];
  if (!mId) return placeholderAccents[0];
  let sum = 0;
  for (let i = 0; i < mId.length; i++) {
    sum += mId.charCodeAt(i);
  }
  return placeholderAccents[sum % placeholderAccents.length];
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
  const [loading, setLoading] = useState(true);

  // Layout View Tabs: "TABLE" (📋 Directory) vs "DASHBOARD" (📊 Analytics & Categories)
  const [activeView, setActiveView] = useState<"TABLE" | "DASHBOARD">("TABLE");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMoveCategoryModal, setShowMoveCategoryModal] = useState(false);
  const [showChangeAccessModal, setShowChangeAccessModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [targetAccessType, setTargetAccessType] = useState("FREE");

  // Custom Deletion Confirmation Modal
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccess, setFilterAccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Mobile Dropdown toggles
  const [activeDropdownMenuId, setActiveDropdownMenuId] = useState<string | null>(null);

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
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");
  const [formAccessType, setFormAccessType] = useState("FREE");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  // SEO Form States
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formMetaKeywords, setFormMetaKeywords] = useState("");

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

  // Casing Normalizer to support both snake_case and camelCase serialization from backend
  const normalizeMaterial = (m: any): Material => {
    if (!m) return m;
    const catId = m.categoryId || m.category_id || (m.category && m.category.id) || "";
    const catName = m.categoryName || m.category_name || (m.category && m.category.name) || "";
    const catCode = m.categoryCode || m.category_code || (m.category && m.category.code) || "";
    
    return {
      id: m.id || "",
      categoryId: catId,
      categoryName: catName,
      categoryCode: catCode,
      title: m.title || "",
      author: m.author || "",
      description: m.description || "",
      subject: m.subject || "",
      grade: m.grade || "",
      topic: m.topic || "",
      coverImageUrl: m.coverImageUrl || m.cover_image_url || "",
      pdfUrl: m.pdfUrl || m.pdf_url || "",
      accessType: m.accessType || m.access_type || "FREE",
      status: m.status || "ACTIVE",
      viewsCount: m.viewsCount !== undefined ? m.viewsCount : (m.views_count !== undefined ? m.views_count : 0),
      downloadsCount: m.downloadsCount !== undefined ? m.downloadsCount : (m.downloads_count !== undefined ? m.downloads_count : 0),
      createdAt: m.createdAt || m.created_at || "",
    };
  };

  // Get absolute URL helper
  const getFileUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    const baseUrl = api.defaults.baseURL || "";
    if (!baseUrl.startsWith("http")) {
      return cleanUrl;
    }
    const origin = baseUrl.replace(/\/api\/v1\/?$/, "");
    return `${origin}${cleanUrl}`;
  };

  // Fetch initial content
  useEffect(() => {
    fetchCategories();
    fetchMaterials();
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
        params: { size: 500 }
      });
      const rawContent = res.data.content || [];
      const normalized = rawContent.map((m: any) => normalizeMaterial(m));
      setMaterials(normalized);
    } catch (e) {
      console.error("Materials fetch error:", e);
    } finally {
      setLoading(false);
    }
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

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;
    try {
      await api.delete(`/library/materials/${materialToDelete.id}`);
      toast.success(t.deleteSuccess);
      setMaterialToDelete(null);
      fetchMaterials();
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

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList: Material[]) => {
    const allFilteredIds = filteredList.map(m => m.id);
    const areAllSelected = allFilteredIds.every(id => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // DRAWER FORM ACTIONS
  const openCreateDrawer = () => {
    setEditingMaterialId(null);
    setFormTitle("");
    setFormAuthor("");
    setFormDescription("");
    setFormSubject("");
    setFormGrade("");
    setFormCategoryId(categories[0]?.id || "");
    setFormCoverImageUrl("");
    setFormPdfUrl("");
    setFormAccessType("FREE");
    setFormStatus("ACTIVE");
    setCoverImageSrc(null);
    setPdfMetadata(null);
    setFormMetaTitle("");
    setFormMetaDescription("");
    setFormMetaKeywords("");
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/library/materials/${id}`);
      const m = normalizeMaterial(res.data);
      setEditingMaterialId(id);
      setFormTitle(m.title);
      setFormAuthor(m.author);
      setFormDescription(m.description);
      setFormSubject(m.subject);
      setFormGrade(m.grade);
      setFormCategoryId(m.categoryId);
      setFormCoverImageUrl(m.coverImageUrl);
      setFormPdfUrl(m.pdfUrl);
      setFormAccessType(m.accessType);
      setFormStatus(m.status);
      setCoverImageSrc(null);

      // Parse SEO details from topic JSON
      let metaTitle = "";
      let metaDescription = "";
      let metaKeywords = "";
      if (m.topic && m.topic.startsWith("{")) {
        try {
          const parsed = JSON.parse(m.topic);
          metaTitle = parsed.metaTitle || "";
          metaDescription = parsed.metaDescription || "";
          metaKeywords = parsed.metaKeywords || "";
        } catch (e) {
          metaTitle = m.title;
          metaDescription = m.description;
        }
      } else {
        metaTitle = m.title;
        metaDescription = m.description;
      }
      setFormMetaTitle(metaTitle);
      setFormMetaDescription(metaDescription);
      setFormMetaKeywords(metaKeywords);
      
      if (m.pdfUrl) {
        setPdfMetadata({
          name: m.pdfUrl.split("/").pop() || "material.pdf",
          size: "N/A",
          pageCount: getPagesCount(m.id)
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
    if (routeEditId) {
      navigate("/super-admin/library-manage");
    }
  };

  // Image Upload crop
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

  // PDF Load
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

  // Submit Form
  const saveDrawerForm = async () => {
    if (!formTitle || !formAuthor || !formCategoryId) {
      toast.warning("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    if (!formPdfUrl) {
      toast.warning("Iltimos, material PDF faylini yuklang!");
      return;
    }

    // Serialize SEO variables into topic string
    const seoData = {
      metaTitle: formMetaTitle || formTitle,
      metaDescription: formMetaDescription || formDescription,
      metaKeywords: formMetaKeywords || ""
    };

    const payload = {
      categoryId: formCategoryId,
      title: formTitle,
      author: formAuthor,
      description: formDescription,
      subject: formSubject,
      grade: formGrade || null,
      topic: JSON.stringify(seoData),
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
    } catch (e: any) {
      console.error(e);
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setSavingForm(false);
    }
  };

  // Text formatting
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

  // Filtering materials
  const filteredMaterials = materials.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchAuthor = m.author?.toLowerCase().includes(q);
      const matchSubject = m.subject?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchSubject) return false;
    }
    if (filterCategory && m.categoryId !== filterCategory) return false;
    if (filterAccess && m.accessType !== filterAccess) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  // Calculate stats dynamically from data list
  const totalCount = materials.length;
  const pdfCount = materials.length; // all materials in the library are PDFs
  const viewsSum = materials.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
  const downloadsSum = materials.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);
  const premiumCount = materials.filter(m => m.accessType === "PRO" || m.accessType === "ELITE").length;

  const popularBook = [...materials]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0]?.title || "N/A";

  const popularCategory = (() => {
    const counts: Record<string, number> = {};
    materials.forEach(m => {
      if (m.categoryName) {
        counts[m.categoryName] = (counts[m.categoryName] || 0) + (m.viewsCount || 0);
      }
    });
    let max = -1;
    let popularName = "N/A";
    Object.entries(counts).forEach(([name, views]) => {
      if (views > max) {
        max = views;
        popularName = name;
      }
    });
    return popularName;
  })();

  const recentUploads = [...materials]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  // Category summary mapping
  const categorySummaryList = categories.map(cat => {
    const catMats = materials.filter(m => m.categoryId === cat.id);
    const catViews = catMats.reduce((sum, item) => sum + (item.viewsCount || 0), 0);
    const catDownloads = catMats.reduce((sum, item) => sum + (item.downloadsCount || 0), 0);
    const lastUpdated = (() => {
      if (catMats.length === 0) return "N/A";
      const sorted = [...catMats].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const dateStr = sorted[0]?.createdAt;
      return dateStr ? new Date(dateStr).toLocaleDateString() : "Bugun";
    })();

    return {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      count: catMats.length,
      views: catViews,
      downloads: catDownloads,
      lastUpdate: lastUpdated
    };
  });

  return (
    <div className="w-full min-h-[90vh] bg-[#F8FAFC] dark:bg-[#020617] text-[#0F172A] dark:text-[#F8FAFC] p-6 md:p-8 rounded-[24px] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-2xl relative transition-colors duration-500">
      
      {/* ── HEADER & NAVIGATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-[#8B5CF6]" />
            <h1 className="text-3xl font-black tracking-tight text-[#0F172A] dark:text-white">
              {t.title}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Selection */}
          <div className="flex p-1 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl shadow-sm shrink-0">
            <button
              onClick={() => setActiveView("TABLE")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === "TABLE"
                  ? "bg-[#8B5CF6] text-white shadow"
                  : "text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              Katalog
            </button>
            <button
              onClick={() => setActiveView("DASHBOARD")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === "DASHBOARD"
                  ? "bg-[#8B5CF6] text-white shadow"
                  : "text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              Tahlil & Bo'limlar
            </button>
          </div>

          <button
            onClick={openCreateDrawer}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#8B5CF6]/20 hover:scale-[1.01] shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t.addBtn}
          </button>
        </div>
      </div>

      {/* ── VIEW TABS ROUTER ── */}
      {activeView === "DASHBOARD" ? (
        /* ==================== 📊 DASHBOARD TAB ==================== */
        <div className="space-y-8 animate-fadeIn">
          {/* Dashboard Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Jami Materiallar", val: totalCount, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
              { label: "Jami O'qishlar", val: viewsSum, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Yuklab Olishlar", val: downloadsSum, icon: Download, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Premium Kitoblar", val: premiumCount, icon: Lock, color: "text-amber-500", bg: "bg-amber-500/10" }
            ].map((metric, i) => (
              <div
                key={i}
                className="p-5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-[#64748B] dark:text-slate-400 font-extrabold uppercase tracking-wider">{metric.label}</p>
                    <p className="text-3xl font-black tracking-tight mt-2 text-[#0F172A] dark:text-white">
                      <AnimatedNumber value={metric.val} />
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${metric.bg}`}>
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#8B5CF6]/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-305" />
              </div>
            ))}
          </div>

          {/* Category Cards Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-[#0F172A] dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#8B5CF6]" />
              Bo'limlar Boshqaruvi
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categorySummaryList.map((catSummary) => {
                const icon = catSummary.code === "adabiy_kitoblar" ? "📖" : catSummary.code === "maktab_darsliklari" ? "🎓" : "📚";
                return (
                  <div
                    key={catSummary.id}
                    onClick={() => {
                      setFilterCategory(catSummary.id);
                      setActiveView("TABLE");
                    }}
                    className="p-6 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm hover:shadow-xl hover:border-[#8B5CF6]/50 hover:scale-[1.01] transition-all duration-300 cursor-pointer flex flex-col justify-between group text-left"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-3xl">{icon}</span>
                        <ArrowUpRight className="h-5 w-5 text-[#64748B] group-hover:text-[#8B5CF6] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                      </div>
                      <h3 className="font-extrabold text-base text-[#0F172A] dark:text-white uppercase tracking-wide group-hover:text-[#8B5CF6] transition-colors">
                        {catSummary.name}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] text-xs text-[#64748B] dark:text-slate-400 font-bold">
                      <div>
                        <p className="text-[10px] uppercase font-medium opacity-75">Materiallar</p>
                        <p className="text-sm font-black text-[#0F172A] dark:text-white mt-0.5">{catSummary.count} ta</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-medium opacity-75">Ko'rishlar</p>
                        <p className="text-sm font-black text-[#0F172A] dark:text-white mt-0.5">{catSummary.views} ta</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-medium opacity-75">Yuklashlar</p>
                        <p className="text-sm font-black text-[#0F172A] dark:text-white mt-0.5">{catSummary.downloads} ta</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-medium opacity-75">So'nggi yangilanish</p>
                        <p className="text-sm font-black text-[#0F172A] dark:text-white mt-0.5">{catSummary.lastUpdate}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular and Recent grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Popular card */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-[120px] pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400">Eng mashhur kitob</span>
                </div>
                <h3 className="text-2xl font-black text-[#0F172A] dark:text-white leading-tight mt-2 max-w-xs truncate">
                  {popularBook}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
                  Ushbu kitob o'quvchilar tomonidan eng ko'p mutolaa qilingan va yuklab olingan.
                </p>
              </div>

              <div className="flex items-center gap-6 mt-8 pt-4 border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] text-xs text-[#64748B] dark:text-slate-400 font-bold">
                <div>
                  <p className="text-[10px] uppercase font-medium">Mashhur bo'lim</p>
                  <p className="text-sm font-black text-purple-500 mt-0.5">{popularCategory}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium">Ko'rishlar</p>
                  <p className="text-sm font-black text-[#0F172A] dark:text-white mt-0.5">{viewsSum ? Math.floor(viewsSum * 0.4) : 0} ta</p>
                </div>
              </div>
            </div>

            {/* Recent Uploads list */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400">Yaqinda yuklanganlar</h3>
              
              <div className="divide-y divide-[#E2E8F0] dark:divide-[rgba(255,255,255,0.08)]">
                {recentUploads.map((m, index) => (
                  <div key={m.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 aspect-[2/3] rounded overflow-hidden shadow shrink-0 border border-slate-200/50 dark:border-white/5">
                        {m.coverImageUrl ? (
                          <img src={getFileUrl(m.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${getCoverAccent(m.id)}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#0F172A] dark:text-white truncate group-hover:text-[#8B5CF6] transition-colors">{m.title}</p>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-bold truncate mt-0.5">{m.author || "Muallif"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-semibold">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                      </span>
                      <button
                        onClick={() => openEditDrawer(m.id)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== 📋 MATERIALS CATALOG TAB ==================== */
        <div className="space-y-6 animate-fadeIn">
          
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-20 relative">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-[#64748B] dark:text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Category selector */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-11 px-3.5 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#64748B] dark:text-slate-300 focus:outline-none"
              >
                <option value="">Barcha bo'limlar</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Access type filter */}
              <select
                value={filterAccess}
                onChange={(e) => setFilterAccess(e.target.value)}
                className="h-11 px-3.5 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#64748B] dark:text-slate-300 focus:outline-none"
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
                className="h-11 px-3.5 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#64748B] dark:text-slate-300 focus:outline-none"
              >
                <option value="">Barcha statuslar</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>

              {/* Clear filters button */}
              {(searchQuery || filterCategory || filterAccess || filterStatus) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterCategory("");
                    setFilterAccess("");
                    setFilterStatus("");
                  }}
                  className="px-4 h-11 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl transition-all"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          </div>

          {/* PREMIUM DATA MANAGEMENT TABLE */}
          {loading && materials.length === 0 ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="h-10 w-10 animate-spin text-[#8B5CF6]" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            /* Premium Empty State */
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] text-center p-6 shadow-sm">
              <div className="p-4 bg-purple-550/5 dark:bg-[#8B5CF6]/5 rounded-full mb-4">
                <BookOpen className="h-10 w-10 text-[#8B5CF6]" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">Kutubxona materiallari topilmadi</h3>
              <p className="text-xs md:text-sm text-[#64748B] dark:text-slate-400 font-semibold max-w-sm mt-2">
                Filtr mezonlariga mos keladigan kitob yoki hujjat topilmadi. Tizimga ilk materialingizni joylashtiring.
              </p>
              <button
                onClick={openCreateDrawer}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-bold uppercase transition-all shadow"
              >
                <Plus className="h-4 w-4" />
                Ilk materialni yaratish
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto rounded-[20px] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0F172A] shadow-sm">
                <table className="w-full border-collapse text-left text-xs font-bold text-[#0F172A] dark:text-slate-100">
                  <thead className="bg-[#F8FAFC] dark:bg-[#070B17] border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] text-[#64748B] dark:text-slate-400 select-none uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredMaterials.length > 0 && filteredMaterials.every(m => selectedIds.includes(m.id))}
                          onChange={() => toggleSelectAll(filteredMaterials)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                        />
                      </th>
                      <th className="p-4 w-16">Muqova</th>
                      <th className="p-4 min-w-[200px]">Material nomi & Preview</th>
                      <th className="p-4">Muallif</th>
                      <th className="p-4">Bo'lim</th>
                      <th className="p-4">Fan</th>
                      <th className="p-4">Sinf</th>
                      <th className="p-4">Access Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Views</th>
                      <th className="p-4 text-center">Downloads</th>
                      <th className="p-4">Yaratilgan sana</th>
                      <th className="p-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[rgba(255,255,255,0.08)]">
                    {filteredMaterials.map((m) => {
                      const isSelected = selectedIds.includes(m.id);
                      const spineGrad = getCoverAccent(m.id);
                      const pageCount = getPagesCount(m.id);
                      
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? "bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/10" : ""
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(m.id)}
                              className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                            />
                          </td>
                          <td className="p-4">
                            <div className="w-10 aspect-[2/3] rounded overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-sm group-hover:scale-105 transition-transform bg-[#020617] shrink-0">
                              {m.coverImageUrl ? (
                                <img src={getFileUrl(m.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${spineGrad}`} />
                              )}
                            </div>
                          </td>
                          <td className="p-4 min-w-[200px]">
                            {/* Premium Row Mini Card Layout */}
                            <div className="space-y-1">
                              <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight line-clamp-1">
                                {m.title}
                              </p>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                  📄 PDF
                                </span>
                                <span className="text-[10px] text-[#64748B] dark:text-slate-450 font-semibold">
                                  {pageCount} bet
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-extrabold text-[#0F172A] dark:text-white whitespace-nowrap">{m.author || "—"}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-200/30">
                              {m.categoryName || "Unassigned"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-[#64748B] dark:text-slate-300 whitespace-nowrap">{m.subject || "—"}</td>
                          <td className="p-4 whitespace-nowrap">
                            {m.grade ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/60 font-semibold">
                                {m.grade}
                              </span>
                            ) : (
                              <span className="text-[#64748B] dark:text-slate-500 font-medium">Barchasi</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                              m.accessType === "FREE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20"
                                : m.accessType === "PRO"
                                ? "bg-blue-600/10 text-blue-650 dark:text-blue-400 border-blue-600/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20"
                            }`}>
                              {m.accessType}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                m.status === "ACTIVE" ? "bg-emerald-500" : m.status === "DRAFT" ? "bg-yellow-500" : "bg-gray-500"
                              }`} />
                              <span className="text-[10px] uppercase">{m.status}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center font-extrabold text-[#0F172A] dark:text-white">{m.viewsCount}</td>
                          <td className="p-4 text-center font-extrabold text-[#0F172A] dark:text-white">{m.downloadsCount}</td>
                          <td className="p-4 text-[#64748B] dark:text-slate-450 whitespace-nowrap font-semibold">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-4 text-right">
                            {/* Inline Actions Row Control */}
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open PDF */}
                              <button
                                onClick={() => window.open(getFileUrl(m.pdfUrl), "_blank")}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-all"
                                title="Faylni ochish"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              
                              {/* View as Student / Preview */}
                              <button
                                onClick={() => navigate(`${basePath}/library/read/${m.id}`)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-all"
                                title="Talaba sifatida ko'rish"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Edit details */}
                              <button
                                onClick={() => openEditDrawer(m.id)}
                                className="p-1.5 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-lg transition-all"
                                title="Tahrirlash"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Analytics modal */}
                              <button
                                onClick={() => setSelectedStatsMaterial(m)}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-all"
                                title="Tahlil"
                              >
                                <BarChart2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Download */}
                              <button
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = getFileUrl(m.pdfUrl);
                                  link.setAttribute("download", `${m.title}.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all"
                                title="Yuklab olish"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setMaterialToDelete(m)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                                title="O'chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE ADAPTIVE CARD VIEW (NO HORIZONTAL SCROLL) */}
              <div className="block md:hidden space-y-4">
                {filteredMaterials.map((m) => {
                  const spineGrad = getCoverAccent(m.id);
                  const isSelected = selectedIds.includes(m.id);
                  const isMenuOpen = activeDropdownMenuId === m.id;
                  
                  return (
                    <div
                      key={m.id}
                      className={`p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm relative overflow-hidden transition-all ${
                        isSelected ? "ring-2 ring-[#8B5CF6] scale-[1.01]" : ""
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Checkbox placement */}
                        <div className="flex items-center shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(m.id)}
                            className="h-4.5 w-4.5 rounded border-gray-300 dark:border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                          />
                        </div>

                        {/* Cover image mini */}
                        <div className="w-12 aspect-[2/3] rounded overflow-hidden shadow border border-slate-200/50 dark:border-white/5 bg-[#020617] shrink-0">
                          {m.coverImageUrl ? (
                            <img src={getFileUrl(m.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${spineGrad}`} />
                          )}
                        </div>

                        {/* Data list info */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white line-clamp-2 leading-tight">
                              {m.title}
                            </h4>
                            {/* Toggle Dropdown Menu */}
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setActiveDropdownMenuId(isMenuOpen ? null : m.id)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-[#64748B] dark:text-slate-400"
                              >
                                <MoreVertical className="h-4.5 w-4.5" />
                              </button>

                              {/* Dropdown float */}
                              <AnimatePresence>
                                {isMenuOpen && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownMenuId(null)} />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                      className="absolute right-0 top-7 w-40 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl shadow-xl z-40 p-1 text-left text-xs font-semibold text-[#0F172A] dark:text-slate-200"
                                    >
                                      <button
                                        onClick={() => { setActiveDropdownMenuId(null); window.open(getFileUrl(m.pdfUrl), "_blank"); }}
                                        className="w-full py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg flex items-center gap-1.5"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Faylni ochish
                                      </button>
                                      <button
                                        onClick={() => { setActiveDropdownMenuId(null); navigate(`${basePath}/library/read/${m.id}`); }}
                                        className="w-full py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg flex items-center gap-1.5"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        Talaba Ko'rishi
                                      </button>
                                      <button
                                        onClick={() => { setActiveDropdownMenuId(null); openEditDrawer(m.id); }}
                                        className="w-full py-2 px-3 hover:bg-[#8B5CF6]/10 hover:text-[#8B5CF6] rounded-lg flex items-center gap-1.5 text-[#8B5CF6]"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Tahrirlash
                                      </button>
                                      <button
                                        onClick={() => { setActiveDropdownMenuId(null); setSelectedStatsMaterial(m); }}
                                        className="w-full py-2 px-3 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg flex items-center gap-1.5 text-blue-500"
                                      >
                                        <BarChart2 className="h-3.5 w-3.5" />
                                        Tahlil
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveDropdownMenuId(null);
                                          const link = document.createElement("a");
                                          link.href = getFileUrl(m.pdfUrl);
                                          link.setAttribute("download", `${m.title}.pdf`);
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="w-full py-2 px-3 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-lg flex items-center gap-1.5 text-emerald-500"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        Yuklab olish
                                      </button>
                                      <button
                                        onClick={() => { setActiveDropdownMenuId(null); setMaterialToDelete(m); }}
                                        className="w-full py-2 px-3 hover:bg-red-500/10 hover:text-red-500 rounded-lg flex items-center gap-1.5 text-red-500"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        O'chirish
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <p className="text-xs text-[#64748B] dark:text-slate-400 font-bold">{m.author || "Muallif yozilmagan"}</p>
                          
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-[9px] font-black uppercase tracking-wider">
                              📄 PDF
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-350 border-slate-200 dark:border-slate-700/60 shadow-sm">
                              {m.accessType}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-350 border-slate-200 dark:border-slate-700/60">
                              {m.categoryName}
                            </span>
                            {m.subject && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-350 border-slate-200 dark:border-slate-700/60">
                                {m.subject}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 pt-2 text-[10px] text-[#64748B] dark:text-slate-450 font-bold border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] mt-2">
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {m.viewsCount}</span>
                            <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {m.downloadsCount}</span>
                            <span className="ml-auto flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            className="fixed bottom-6 inset-x-4 max-w-4xl mx-auto bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl z-40 text-[#0F172A] dark:text-white"
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
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SPLIT-SCREEN DRAWER (CRUD FORM & LIVE PREVIEW + SEO PREVIEW) ── */}
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

            {/* Split Screen Slide-over Panel (1024px width) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-full max-w-[1100px] bg-white dark:bg-[#0F172A] border-l border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] z-[60] flex flex-col shadow-2xl overflow-hidden text-[#0F172A] dark:text-white"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-[#F8FAFC] dark:bg-[#070B17] border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-[#8B5CF6]" />
                  <div>
                    <h3 className="text-base font-black text-[#0F172A] dark:text-white leading-none uppercase tracking-wide">
                      {editingMaterialId ? "Materialni Tahrirlash" : "Yangi material yaratish"}
                    </h3>
                    <p className="text-[10px] text-[#64748B] dark:text-slate-400 font-semibold mt-1">
                      Material rekvizitlari, PDF hujjati, cover rasm va SEO meta-ma'lumotlarini sozlash.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-all"
                >
                  <X className="h-5.5 w-5.5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable Split screen layout) */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* LEFT SIDE (Form Editor - 60% Width) */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6 lg:border-r border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] text-left">
                  
                  {/* Basic Info section */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] pb-1.5">Asosiy ma'lumotlar</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Material Title */}
                      <div className="space-y-1.5">
                        <LabelText>Material nomi *</LabelText>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
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
                          className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
                          placeholder="Muallif ismini kiriting"
                        />
                      </div>
                    </div>

                    {/* Description Textarea with formatting toolbar */}
                    <div className="space-y-1.5">
                      <LabelText>Tavsif</LabelText>
                      <div className="flex flex-wrap gap-1 p-1 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-t-xl border-b-0">
                        {formattingOptions.map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => insertFormatting(opt.type)}
                            title={opt.title}
                            className="h-8 px-2.5 rounded-lg text-xs font-black text-slate-500 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
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
                          className="w-full p-3.5 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-b-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] resize-none"
                        />
                        <span className="absolute right-3.5 bottom-2.5 text-[9px] font-black text-slate-400">
                          {formDescription.length} / 1000
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Categorization & Taxonomy */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] pb-1.5">Kategoriyalashtirish</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Category Selector */}
                      <div className="space-y-1.5">
                        <LabelText>Kategoriya *</LabelText>
                        <select
                          value={formCategoryId}
                          onChange={(e) => setFormCategoryId(e.target.value)}
                          className="w-full h-11 px-3 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-slate-200 focus:outline-none focus:border-[#8B5CF6]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#0F172A] text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <LabelText>Fan</LabelText>
                        <input
                          type="text"
                          value={formSubject}
                          onChange={(e) => setFormSubject(e.target.value)}
                          className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
                          placeholder="Matematika, Kimyo..."
                        />
                      </div>

                      {/* Grade */}
                      <div className="space-y-1.5">
                        <LabelText>Sinf</LabelText>
                        <select
                          value={formGrade}
                          onChange={(e) => setFormGrade(e.target.value)}
                          className="w-full h-11 px-3 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-slate-200 focus:outline-none focus:border-[#8B5CF6]"
                        >
                          <option value="" className="bg-[#0F172A] text-slate-400">Sinfsiz (Barcha sinflar)</option>
                          {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((g) => (
                            <option key={g} value={g} className="bg-[#0F172A] text-white">
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Media & Files uploads */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] pb-1.5">Fayllar & Muqova</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cover upload container */}
                      <div className="p-4 bg-[#F8FAFC] dark:bg-[#070B17]/40 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl space-y-3">
                        <LabelText>Muqova rasmi</LabelText>
                        
                        {coverImageSrc ? (
                          <div className="space-y-3">
                            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black/20">
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
                                className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg hover:bg-slate-350"
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
                                Crop & Save
                              </button>
                            </div>
                          </div>
                        ) : formCoverImageUrl ? (
                          <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#070B17] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl">
                            <div className="w-12 aspect-[2/3] rounded overflow-hidden border shrink-0 bg-[#020617]">
                              <img src={getFileUrl(formCoverImageUrl)} className="w-full h-full object-cover" alt="Cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                Rasm yuklandi
                              </p>
                              <div className="flex gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setCoverImageSrc(getFileUrl(formCoverImageUrl))}
                                  className="text-[10px] text-[#8B5CF6] font-bold hover:underline"
                                >
                                  Tahrirlash
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormCoverImageUrl("")}
                                  className="text-[10px] text-red-500 font-bold hover:underline"
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
                              isDragOverCover ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "border-slate-350 dark:border-slate-700 hover:border-[#8B5CF6]/60"
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
                            <ImageIcon className="h-6 w-6 text-[#8B5CF6] mb-1.5" />
                            <p className="text-[10px] font-black text-[#0F172A] dark:text-white uppercase tracking-wider">Muqova yuklash / Tashlash</p>
                          </div>
                        )}
                      </div>

                      {/* PDF upload container */}
                      <div className="p-4 bg-[#F8FAFC] dark:bg-[#070B17]/40 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl space-y-3">
                        <LabelText>PDF Material fayli *</LabelText>

                        {formPdfUrl ? (
                          <div className="p-3 bg-white dark:bg-[#070B17] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl space-y-1.5">
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
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-[10px] font-extrabold text-[#64748B] dark:text-slate-450 truncate">{pdfMetadata?.name || "material.pdf"}</p>
                            <p className="text-[9px] text-[#64748B] dark:text-slate-500 font-bold">
                              {pdfMetadata?.size ? `${pdfMetadata.size}  •  ` : ""}
                              {pdfMetadata?.pageCount ? `${pdfMetadata.pageCount} bet` : ""}
                            </p>
                          </div>
                        ) : uploadingPdf ? (
                          <div className="border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col items-center justify-center text-center bg-[#070B17]/10 h-28">
                            <Loader2 className="h-6 w-6 text-[#8B5CF6] animate-spin mb-1.5" />
                            <p className="text-[10px] font-black uppercase text-[#8B5CF6]">Yuklanmoqda...</p>
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
                              isDragOverPdf ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "border-slate-350 dark:border-slate-700 hover:border-[#8B5CF6]/60"
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
                            <Upload className="h-6 w-6 text-red-500 mb-1.5" />
                            <p className="text-[10px] font-black text-[#0F172A] dark:text-white uppercase tracking-wider">PDF yuklash yoki tashlang</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Access Level and status Settings */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] pb-1.5">Kirish & Status</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Access level segmented control */}
                      <div className="space-y-1.5">
                        <LabelText>Kirish turi (Access Tier)</LabelText>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8FAFC] dark:bg-[#020617] rounded-xl border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
                          {accessOptions.map((opt) => {
                            const isSelected = formAccessType === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormAccessType(opt.value)}
                                className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#8B5CF6] text-white shadow-md"
                                    : "text-[#64748B] dark:text-slate-450 hover:bg-slate-200 dark:hover:bg-white/5"
                                }`}
                              >
                                {opt.value !== "FREE" && <Lock className="h-3 w-3" />}
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Status select control */}
                      <div className="space-y-1.5">
                        <LabelText>Material holati (Status)</LabelText>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8FAFC] dark:bg-[#020617] rounded-xl border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
                          {statusOptions.map((opt) => {
                            const isSelected = formStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormStatus(opt.value)}
                                className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center ${
                                  isSelected
                                    ? "bg-[#8B5CF6] text-white shadow-md"
                                    : "text-[#64748B] dark:text-slate-455 hover:bg-slate-200 dark:hover:bg-white/5"
                                }`}
                              >
                                {opt.label.split(" ")[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEO Information section */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] pb-1.5">SEO Ma'lumotlari</h4>
                    
                    <div className="space-y-4">
                      {/* Meta Title */}
                      <div className="space-y-1.5">
                        <LabelText>Meta Title</LabelText>
                        <input
                          type="text"
                          value={formMetaTitle}
                          onChange={(e) => setFormMetaTitle(e.target.value)}
                          className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-450 focus:outline-none"
                          placeholder={formTitle || "Google sarlavhasi"}
                        />
                      </div>

                      {/* Meta Description */}
                      <div className="space-y-1.5">
                        <LabelText>Meta Description</LabelText>
                        <textarea
                          rows={3}
                          value={formMetaDescription}
                          maxLength={160}
                          onChange={(e) => setFormMetaDescription(e.target.value)}
                          className="w-full p-3.5 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-450 focus:outline-none resize-none"
                          placeholder={formDescription || "Google tavsifi (maksimal 160 ta belgi)"}
                        />
                        <span className="text-[9px] font-black text-slate-400 block text-right mt-1">
                          {formMetaDescription.length} / 160 belgi
                        </span>
                      </div>

                      {/* Meta Keywords */}
                      <div className="space-y-1.5">
                        <LabelText>Meta Kalit So'zlar (Keywords)</LabelText>
                        <input
                          type="text"
                          value={formMetaKeywords}
                          onChange={(e) => setFormMetaKeywords(e.target.value)}
                          className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-white placeholder-slate-450 focus:outline-none"
                          placeholder="kitob, adabiyot, roman, darslik (vergul bilan ajrating)"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT SIDE (Live Preview & Google SEO Preview - 40% Width) */}
                <div className="hidden lg:flex lg:w-[420px] bg-[#F8FAFC] dark:bg-[#070B17] p-6 flex-col justify-between overflow-y-auto space-y-8 select-none shrink-0 border-l border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
                  
                  {/* Live Card Preview Box */}
                  <div className="space-y-4">
                    <LabelText>Live Preview (Jonli Ko'rinish)</LabelText>
                    
                    <div className="relative w-44 h-64 mx-auto mt-4" style={{ perspective: "1000px" }}>
                      <div
                        className="w-full h-full relative transition-transform duration-500 ease-out"
                        style={{ transformStyle: "preserve-3d", transform: "rotateY(-12deg) rotateX(6deg)" }}
                      >
                        {/* Spine */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-[12px] origin-right bg-gradient-to-r ${getCoverAccent(formTitle)} z-10 opacity-80`}
                          style={{ transform: "rotateY(-90deg) translateZ(0px)", boxShadow: "inset -1px 0 3px rgba(0,0,0,0.4)" }}
                        />
                        
                        {/* Pages Stack */}
                        <div
                          className="absolute right-0 top-[2px] bottom-[2px] w-[8px] bg-slate-100 border-y border-r border-slate-350"
                          style={{
                            transform: "rotateY(0deg) translateZ(-8px)",
                            boxShadow: "inset 1px 0 3px rgba(0,0,0,0.1)",
                            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 1px, #e2e8f0 1px, #e2e8f0 2px)"
                          }}
                        />

                        {/* Front cover */}
                        <div
                          className="absolute inset-0 rounded-r-xl overflow-hidden border border-white/20 select-none shadow-xl bg-[#020617]"
                          style={{ transform: "translateZ(0px)" }}
                        >
                          {formCoverImageUrl ? (
                            <img src={getFileUrl(formCoverImageUrl)} className="w-full h-full object-cover" alt="Cover Preview" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getCoverAccent(formTitle)} p-4 flex flex-col justify-between text-white text-left`}>
                              <div className="text-[7px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
                              <div className="my-auto space-y-1.5">
                                <h4 className="text-xs font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow-md">
                                  {formTitle || "KITOBLAR NOMI"}
                                </h4>
                                <p className="text-[8px] font-bold opacity-80 line-clamp-1">{formAuthor || "Muallif"}</p>
                              </div>
                              <div className="flex items-center justify-between border-t border-white/20 pt-1.5 text-[6px] font-black opacity-70">
                                <span>PREMIUM EDITION</span>
                                <span>📚</span>
                              </div>
                            </div>
                          )}

                          {/* Access Badge */}
                          <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow ${
                            formAccessType === "FREE" ? "bg-[#22C55E] text-white" : formAccessType === "PRO" ? "bg-[#3B82F6] text-white" : "bg-[#F59E0B] text-slate-950"
                          }`}>
                            {formAccessType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata fields list */}
                  <div className="p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm text-left text-xs font-bold text-[#64748B] dark:text-slate-400 space-y-2.5">
                    <div className="flex justify-between pb-1.5 border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
                      <span className="font-extrabold uppercase text-[10px]">Tafsilotlar</span>
                      <span className="text-purple-500 font-extrabold uppercase text-[10px]">Active Preview</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nomi:</span>
                      <span className="text-[#0F172A] dark:text-white truncate max-w-[200px]">{formTitle || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Muallif:</span>
                      <span className="text-[#0F172A] dark:text-white truncate max-w-[200px]">{formAuthor || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fan:</span>
                      <span className="text-[#0F172A] dark:text-white">{formSubject || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinf:</span>
                      <span className="text-[#0F172A] dark:text-white">{formGrade || "Barchasi"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fayl formati:</span>
                      <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-[9px] font-black uppercase tracking-wider">
                        📄 PDF
                      </span>
                    </div>
                  </div>

                  {/* Google SEO Result Preview Card */}
                  <div className="p-5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm space-y-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-[#8B5CF6]" />
                      <span className="text-[10px] uppercase font-black tracking-wider text-[#64748B] dark:text-slate-400">Google Qidiruv Natijasi</span>
                    </div>
                    
                    <div className="space-y-1 mt-2.5">
                      <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-base font-medium hover:underline cursor-pointer leading-tight line-clamp-1">
                        {formMetaTitle || formTitle || "LMSHub Digital Library"}
                      </div>
                      <div className="text-[#006621] dark:text-[#34a853] text-xs font-semibold flex items-center gap-1 leading-none">
                        https://lmshub.uz › library › read
                      </div>
                      <div className="text-[#545454] dark:text-[#bdc1c6] text-xs leading-relaxed line-clamp-2 pt-0.5 font-medium">
                        {formMetaDescription || formDescription || "Raqamli kutubxona materialining qisqacha tavsifi va mutolaa sahifasi."}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Drawer Footer (Sticky Actions) */}
              <div className="p-6 bg-[#F8FAFC] dark:bg-[#070B17] border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-750 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={savingForm}
                  onClick={saveDrawerForm}
                  className="flex-1 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7c4fe3] hover:to-[#5558e0] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2"
                >
                  {savingForm ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saqlanmoqda...
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

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {materialToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-[2px]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-2xl space-y-5 text-[#0F172A] dark:text-white text-left"
            >
              <div className="flex items-center gap-3 text-red-500">
                <Trash2 className="h-6 w-6" />
                <h3 className="text-lg font-black uppercase tracking-wider">Delete Material?</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-[#64748B] dark:text-slate-450 uppercase tracking-widest leading-none">Material:</p>
                <p className="text-base font-black text-[#0F172A] dark:text-white">{materialToDelete.title}</p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 font-semibold leading-relaxed pt-1.5 border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)]">
                  This action cannot be undone. All views, downloads and progress logs associated with this material will be permanently deleted from the cloud directory.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setMaterialToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#0F172A] dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
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
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-2xl space-y-4 text-[#0F172A] dark:text-white relative text-left"
            >
              <button
                onClick={() => setSelectedStatsMaterial(null)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-150 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex gap-4">
                <div className="w-12 aspect-[2/3] rounded overflow-hidden border border-slate-250 dark:border-white/5 bg-[#020617] shrink-0">
                  {selectedStatsMaterial.coverImageUrl ? (
                    <img src={getFileUrl(selectedStatsMaterial.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getCoverAccent(selectedStatsMaterial.id)}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm uppercase text-[#0F172A] dark:text-white tracking-wide line-clamp-2">
                    {selectedStatsMaterial.title}
                  </h3>
                  <p className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold mt-1">
                    Muallif: {selectedStatsMaterial.author || "Muallifsiz"}
                  </p>
                </div>
              </div>

              {/* Stats list parameters */}
              <div className="p-4 bg-[#F8FAFC] dark:bg-[#070B17] rounded-xl border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] text-xs font-bold text-[#64748B] dark:text-slate-350 space-y-3">
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
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-2xl space-y-5 text-[#0F172A] dark:text-white text-left"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <FolderSync className="h-4.5 w-4.5 text-[#8B5CF6]" />
                  {t.moveCategoryTitle}
                </h3>
                <button onClick={() => setShowMoveCategoryModal(false)} className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white">
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
                  className="w-full h-11 px-3 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-slate-350 focus:outline-none"
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
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#64748B] dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider"
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
              className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 shadow-2xl space-y-5 text-[#0F172A] dark:text-white text-left"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-[#8B5CF6]" />
                  {t.changeAccessTitle}
                </h3>
                <button onClick={() => setShowChangeAccessModal(false)} className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white">
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
                  className="w-full h-11 px-3 bg-[#F8FAFC] dark:bg-[#020617] border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0F172A] dark:text-slate-350 focus:outline-none"
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
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#64748B] dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider"
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

// Utility label styling
const LabelText = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 block mb-1">
    {children}
  </label>
);
