import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Book,
  Image as ImageIcon,
  FileText,
  Upload,
  Check,
  CheckCircle2,
  X,
  Crop,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Info,
  Award,
  Zap,
  Globe
} from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropUtils";

interface Category {
  id: string;
  name: string;
  code: string;
}

// Local Translations for Form Page
const formTranslations = {
  uz: {
    backToList: "Orqaga",
    createTitle: "Yangi material yaratish",
    editTitle: "Materialni tahrirlash",
    subtitle: "LMSHub premium kutubxonasi uchun kitob va qo'llanmalarni boshqarish.",
    step1: "Asosiy ma'lumotlar",
    step2: "Kategoriya",
    step3: "Muqova rasmi",
    step4: "PDF & Obuna",
    step5: "Tasdiqlash",
    livePreview: "Jonli ko'rinish (Live Preview)",
    materialName: "Material nomi",
    authorName: "Muallif ismi",
    description: "Tavsif (Description)",
    topic: "Mavzu",
    subject: "Fan",
    grade: "Sinf",
    selectGrade: "Sinfni tanlang",
    noGrade: "Sinfsiz (Barcha sinflar)",
    categoryTitle: "Kutubxona Bo'limi (Kategoriya)",
    categoryDesc: "Material qaysi toifaga mansubligini belgilang. Bu uning kutubxonada joylashishini belgilaydi.",
    literaryBook: "Adabiy Kitoblar",
    literaryBookDesc: "Badiiy asarlar, hikoyalar va romanlar",
    schoolTextbook: "Maktab Darsliklari",
    schoolTextbookDesc: "Umumiy o'rta ta'lim maktab darsliklari",
    studyGuide: "O'quv Qo'llanmalar",
    studyGuideDesc: "Qo'shimcha darsliklar, SAT, sertifikat qo'llanmalari",
    dragDropCover: "Rasm yuklash yoki bu yerga tashlang (Drag & Drop)",
    coverFormats: "PNG, JPG yoki WEBP formatlari qo'llab-quvvatlanadi",
    coverSizes: "Tavsiya etilgan o'lcham: 600x900px (2:3 nisbat), Maks: 5MB",
    change: "O'zgartirish",
    crop: "Kesish",
    delete: "O'chirish",
    pdfTitle: "PDF Fayl yuklash",
    pdfDesc: "Kitob yoki qo'llanmaning elektron PDF formatini yuklang.",
    dragDropPdf: "PDF faylni yuklash yoki bu yerga tashlang",
    pdfFormat: "Faqat .pdf formatdagi fayl, Maks: 50MB",
    fileName: "Fayl nomi",
    fileSize: "Hajmi",
    pageCount: "Sahifalar soni",
    fileStatus: "Status",
    accessTypeTitle: "Kirish huquqi (Access Type)",
    free: "FREE",
    freeDesc: "Barcha foydalanuvchilar o'qishi mumkin",
    pro: "PRO",
    proDesc: "PRO obuna egalari uchun ochiq",
    elite: "ELITE",
    eliteDesc: "Faqat ELITE obunachilar uchun",
    finalReviewTitle: "Barcha ma'lumotlarni tekshiring",
    finalReviewDesc: "Materialni chop etishdan oldin kiritilgan ma'lumotlarni tasdiqlang.",
    publishBtn: "Chop etish (Publish)",
    updateBtn: "Yangilash (Save changes)",
    saving: "Saqlanmoqda...",
    validationError: "Iltimos, barcha majburiy maydonlarni to'ldiring!",
    pdfRequired: "Iltimos, material PDF faylini yuklang!",
    cropTitle: "Muqovani kesish",
    zoom: "Kattalashtirish",
    cropActionBtn: "Kesish & Saqlash",
    cancel: "Bekor qilish",
    page: "bet",
    successCreate: "Yangi material yaratildi 🎉",
    successUpdate: "Material yangilandi 💾"
  },
  ru: {
    backToList: "Назад",
    createTitle: "Создание материала",
    editTitle: "Редактирование материала",
    subtitle: "Управление книгами и пособиями для премиум библиотеки LMSHub.",
    step1: "Основная информация",
    step2: "Категория",
    step3: "Обложка",
    step4: "PDF и Доступ",
    step5: "Подтверждение",
    livePreview: "Предварительный просмотр",
    materialName: "Название материала",
    authorName: "Имя автора",
    description: "Описание (Description)",
    topic: "Тема",
    subject: "Предмет",
    grade: "Класс",
    selectGrade: "Выберите класс",
    noGrade: "Без класса (Все классы)",
    categoryTitle: "Раздел библиотеки (Категория)",
    categoryDesc: "Укажите категорию материала для правильного размещения в библиотеке.",
    literaryBook: "Художественные Книги",
    literaryBookDesc: "Романы, повести и рассказы",
    schoolTextbook: "Школьные Учебники",
    schoolTextbookDesc: "Учебники для общего среднего образования",
    studyGuide: "Учебные Пособия",
    studyGuideDesc: "Материалы по SAT, подготовке к сертификатам",
    dragDropCover: "Загрузите изображение или перетащите сюда",
    coverFormats: "Поддерживаются PNG, JPG или WEBP",
    coverSizes: "Рекомендуется: 600x900px (2:3), Макс: 5MB",
    change: "Изменить",
    crop: "Обрезать",
    delete: "Удалить",
    pdfTitle: "Загрузка PDF файла",
    pdfDesc: "Загрузите электронную версию книги в формате PDF.",
    dragDropPdf: "Загрузите PDF файл или перетащите сюда",
    pdfFormat: "Только .pdf файлы, Макс: 50MB",
    fileName: "Имя файла",
    fileSize: "Размер",
    pageCount: "Количество страниц",
    fileStatus: "Статус",
    accessTypeTitle: "Тип доступа (Access Type)",
    free: "FREE",
    freeDesc: "Доступно всем пользователям",
    pro: "PRO",
    proDesc: "Для владельцев подписки PRO",
    elite: "ELITE",
    eliteDesc: "Только для подписчиков ELITE",
    finalReviewTitle: "Проверьте введенные данные",
    finalReviewDesc: "Подтвердите информацию перед публикацией материала.",
    publishBtn: "Опубликовать",
    updateBtn: "Сохранить изменения",
    saving: "Сохранение...",
    validationError: "Пожалуйста, заполните все обязательные поля!",
    pdfRequired: "Пожалуйста, загрузите PDF файл!",
    cropTitle: "Обрезка обложки",
    zoom: "Масштаб",
    cropActionBtn: "Обрезать и Сохранить",
    cancel: "Отмена",
    page: "стр",
    successCreate: "Материал успешно создан 🎉",
    successUpdate: "Материал успешно обновлен 💾"
  },
  en: {
    backToList: "Back",
    createTitle: "Create Material",
    editTitle: "Edit Material",
    subtitle: "Manage books and textbooks for LMSHub premium library.",
    step1: "Basic Details",
    step2: "Category",
    step3: "Cover Image",
    step4: "PDF & Access",
    step5: "Review & Publish",
    livePreview: "Live Preview",
    materialName: "Material Title",
    authorName: "Author Name",
    description: "Description",
    topic: "Topic",
    subject: "Subject",
    grade: "Grade",
    selectGrade: "Select grade",
    noGrade: "No Grade (All grades)",
    categoryTitle: "Library Section (Category)",
    categoryDesc: "Select the section for this book to determine its placement.",
    literaryBook: "Literary Books",
    literaryBookDesc: "Fiction literature, stories, and novels",
    schoolTextbook: "School Textbooks",
    schoolTextbookDesc: "Textbooks for general secondary schools",
    studyGuide: "Study Guides",
    studyGuideDesc: "Extra materials, SAT, and cert guides",
    dragDropCover: "Upload image or drag & drop here",
    coverFormats: "PNG, JPG, or WEBP formats are supported",
    coverSizes: "Recommended: 600x900px (2:3 ratio), Max: 5MB",
    change: "Change",
    crop: "Crop",
    delete: "Delete",
    pdfTitle: "Upload PDF Document",
    pdfDesc: "Upload the digital document file in PDF format.",
    dragDropPdf: "Upload PDF file or drag & drop here",
    pdfFormat: "Only .pdf files, Max: 50MB",
    fileName: "File name",
    fileSize: "Size",
    pageCount: "Pages count",
    fileStatus: "Status",
    accessTypeTitle: "Access Tier",
    free: "FREE",
    freeDesc: "Available to all registered users",
    pro: "PRO",
    proDesc: "Accessible for PRO plan members",
    elite: "ELITE",
    eliteDesc: "Accessible only to ELITE plan members",
    finalReviewTitle: "Verify details",
    finalReviewDesc: "Confirm the library material metadata before publishing.",
    publishBtn: "Publish Material",
    updateBtn: "Save Changes",
    saving: "Saving...",
    validationError: "Please fill in all required fields!",
    pdfRequired: "Please upload a PDF file!",
    cropTitle: "Crop Cover Image",
    zoom: "Zoom",
    cropActionBtn: "Crop & Save",
    cancel: "Cancel",
    page: "pg",
    successCreate: "Library material created successfully 🎉",
    successUpdate: "Library material updated successfully 💾"
  }
};

export default function LibraryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = (i18n.language || "uz") as "uz" | "ru" | "en";
  const t = formTranslations[lang] || formTranslations["uz"];

  const [categories, setCategories] = useState<Category[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [accessType, setAccessType] = useState("FREE");
  const [status, setStatus] = useState("ACTIVE");

  // PDF Metadata State (extracted client-side)
  const [pdfMetadata, setPdfMetadata] = useState<{
    name: string;
    size: string;
    pageCount: number;
    thumbnail: string;
  } | null>(null);

  // Cropper Modal States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingForm, setSavingForm] = useState(false);

  // Drag and Drop States
  const [isDragOverCover, setIsDragOverCover] = useState(false);
  const [isDragOverPdf, setIsDragOverPdf] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchMaterialDetails();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/library/categories");
      setCategories(res.data);
    } catch (e) {
      console.error("Categories fetch error:", e);
    }
  };

  const fetchMaterialDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/library/materials/${id}`);
      const m = res.data;
      setTitle(m.title);
      setAuthor(m.author || "");
      setDescription(m.description || "");
      setSubject(m.subject || "");
      setGrade(m.grade || "");
      setTopic(m.topic || "");
      setCategoryId(m.categoryId);
      setCoverImageUrl(m.coverImageUrl || "");
      setPdfUrl(m.pdfUrl || "");
      setAccessType(m.accessType || "FREE");
      setStatus(m.status || "ACTIVE");

      if (m.pdfUrl) {
        setPdfMetadata({
          name: m.pdfUrl.split("/").pop() || "material.pdf",
          size: "N/A",
          pageCount: 0,
          thumbnail: ""
        });
      }
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Materialni yuklashda xatolik" : "Ошибка при загрузке материала");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get human readable file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // PDF.js Client Side Processing (dynamic loader)
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

          // Render first page as thumbnail
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          const canvasContext = canvas.getContext("2d");
          if (canvasContext) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext, viewport }).promise;
            const thumbnailDataUrl = canvas.toDataURL("image/jpeg");

            setPdfMetadata(prev => ({
              name: file.name,
              size: formatBytes(file.size),
              pageCount: numPages,
              thumbnail: thumbnailDataUrl
            }));
          } else {
            setPdfMetadata(prev => ({
              name: file.name,
              size: formatBytes(file.size),
              pageCount: numPages,
              thumbnail: ""
            }));
          }
        } catch (err) {
          console.error("PDF.js render error:", err);
          setPdfMetadata(prev => ({
            name: file.name,
            size: formatBytes(file.size),
            pageCount: 0,
            thumbnail: ""
          }));
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error("Failed to load PDF.js client script:", e);
      // Fallback metadata
      setPdfMetadata({
        name: file.name,
        size: formatBytes(file.size),
        pageCount: 0,
        thumbnail: ""
      });
    }
  };

  // Upload Handlers
  const handleCoverUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(lang === "uz" ? "Faqat rasm yuklash mumkin" : "Только изображения разрешены");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropperModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setUploadingImage(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        toast.error(lang === "uz" ? "Rasmni kesishda xatolik yuz berdi" : "Ошибка обрезки изображения");
        return;
      }

      const file = new File([croppedBlob], "cover.webp", { type: "image/webp" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setCoverImageUrl(res.data);
      toast.success(lang === "uz" ? "Muqova yuklandi! 🖼️" : "Обложка загружена! 🖼️");
      setShowCropperModal(false);
      setImageSrc(null);
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Muqovani yuklashda xatolik" : "Ошибка при загрузке обложки");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error(lang === "uz" ? "Faqat PDF yuklash mumkin" : "Разрешены только PDF файлы");
      return;
    }
    try {
      setUploadingPdf(true);
      const formData = new FormData();
      formData.append("file", file);

      // Perform local parsing first for real-time stats
      await processPdfFile(file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setPdfUrl(res.data);
      toast.success(lang === "uz" ? "PDF yuklandi! 📚" : "PDF загружен! 📚");
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "PDF yuklashda xatolik" : "Ошибка загрузки PDF");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Submit Logic
  const handleSave = async () => {
    if (!title || !categoryId) {
      toast.warning(t.validationError);
      setCurrentStep(1);
      return;
    }
    if (!pdfUrl) {
      toast.warning(t.pdfRequired);
      setCurrentStep(4);
      return;
    }

    const payload = {
      categoryId,
      title,
      author,
      description,
      subject,
      grade: grade || null,
      topic,
      coverImageUrl,
      pdfUrl,
      accessType,
      status
    };

    try {
      setSavingForm(true);
      if (id) {
        await api.put(`/library/materials/${id}`, payload);
        toast.success(t.successUpdate);
      } else {
        await api.post("/library/materials", payload);
        toast.success(t.successCreate);
      }
      navigate(`/${lang === "uz" ? "super-admin" : "super-admin"}/library-manage`);
    } catch (err) {
      console.error(err);
      toast.error(lang === "uz" ? "Saqlashda xatolik yuz berdi" : "Ошибка при сохранении");
    } finally {
      setSavingForm(false);
    }
  };

  // Step validation triggers
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!title || !author || !description) {
        toast.warning(t.validationError);
        return;
      }
    }
    if (currentStep === 2) {
      if (!categoryId) {
        toast.warning(lang === "uz" ? "Iltimos, kategoriyalardan birini tanlang!" : "Пожалуйста, выберите одну из категорий!");
        return;
      }
    }
    if (currentStep === 4) {
      if (!pdfUrl) {
        toast.warning(t.pdfRequired);
        return;
      }
    }
    setCurrentStep(prev => Math.min(5, prev + 1));
  };

  // Get selected category details
  const currentCategory = categories.find(c => c.id === categoryId);

  // Background cover colors/gradients based on selected category code
  const getGradientForCategory = () => {
    if (!currentCategory) return "from-indigo-600 to-purple-650";
    if (currentCategory.code === "adabiy_kitoblar") return "from-indigo-600 to-purple-600";
    if (currentCategory.code === "maktab_darsliklari") return "from-emerald-600 to-teal-600";
    return "from-amber-600 to-orange-600";
  };

  return (
    <div className="w-full min-h-[90vh] bg-transparent pb-12">
      {/* ── Top Nav ── */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/super-admin/library-manage")}
          className="p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0 hover:scale-[1.02]"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {id ? t.editTitle : t.createTitle}
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-medium">
            {t.subtitle}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ── LEFT SIDE: 5-STEP WIZARD ── */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stepper Header */}
            <div className="p-4 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div
                    key={num}
                    onClick={() => {
                      if (num < currentStep) setCurrentStep(num);
                    }}
                    className={`flex items-center gap-2 cursor-pointer transition-all ${
                      currentStep === num
                        ? "text-purple-600 dark:text-purple-400 scale-[1.02]"
                        : currentStep > num
                        ? "text-emerald-500 dark:text-emerald-450"
                        : "text-slate-400 dark:text-slate-650"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        currentStep === num
                          ? "bg-purple-600/10 dark:bg-purple-400/10 border-2 border-purple-500"
                          : currentStep > num
                          ? "bg-emerald-500/10 dark:bg-emerald-450/10 border border-emerald-500"
                          : "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {currentStep > num ? <Check className="h-3.5 w-3.5" /> : num}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                      {num === 1 ? t.step1 : num === 2 ? t.step2 : num === 3 ? t.step3 : num === 4 ? t.step4 : t.step5}
                    </span>
                    {num < 5 && <ChevronRight className="h-3.5 w-3.5 text-slate-350 dark:text-slate-700" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content Card */}
            <div className="p-6 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-sm min-h-[380px] flex flex-col justify-between">
              <div>
                
                {/* ── STEP 1: Basic Info ── */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-500" />
                        {t.step1}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Kutubxona materialining nomi, muallifi va qisqacha tavsifini kiriting.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Name input (Floating labels style) */}
                      <div className="relative group">
                        <input
                          type="text"
                          required
                          value={title}
                          maxLength={100}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-12 px-4 pt-4 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-850 dark:text-white placeholder-transparent focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <label className="absolute left-4 top-2 text-[9px] uppercase font-black text-slate-400 dark:text-slate-550 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-450 peer-focus:top-2 peer-focus:text-[9px] peer-focus:font-black peer-focus:text-purple-500 pointer-events-none">
                          {t.materialName} *
                        </label>
                        <span className="absolute right-3 bottom-1.5 text-[8px] text-slate-400 font-bold">
                          {title.length}/100
                        </span>
                      </div>

                      {/* Author Input */}
                      <div className="relative group">
                        <input
                          type="text"
                          required
                          value={author}
                          maxLength={80}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-12 px-4 pt-4 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-850 dark:text-white placeholder-transparent focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <label className="absolute left-4 top-2 text-[9px] uppercase font-black text-slate-400 dark:text-slate-550 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-450 peer-focus:top-2 peer-focus:text-[9px] peer-focus:font-black peer-focus:text-purple-500 pointer-events-none">
                          {t.authorName} *
                        </label>
                        <span className="absolute right-3 bottom-1.5 text-[8px] text-slate-400 font-bold">
                          {author.length}/80
                        </span>
                      </div>

                      {/* Topic Input */}
                      <div className="relative group">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-12 px-4 pt-4 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-850 dark:text-white placeholder-transparent focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <label className="absolute left-4 top-2 text-[9px] uppercase font-black text-slate-400 dark:text-slate-550 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-450 peer-focus:top-2 peer-focus:text-[9px] peer-focus:font-black peer-focus:text-purple-500 pointer-events-none">
                          {t.topic}
                        </label>
                      </div>

                      {/* Subject Input */}
                      <div className="relative group">
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-12 px-4 pt-4 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-850 dark:text-white placeholder-transparent focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <label className="absolute left-4 top-2 text-[9px] uppercase font-black text-slate-400 dark:text-slate-550 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-450 peer-focus:top-2 peer-focus:text-[9px] peer-focus:font-black peer-focus:text-purple-500 pointer-events-none">
                          {t.subject}
                        </label>
                      </div>

                      {/* Grade Selector */}
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                          {t.grade}
                        </label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full h-11 px-3 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
                        >
                          <option value="">{t.noGrade}</option>
                          {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description textarea */}
                      <div className="md:col-span-2 relative group">
                        <textarea
                          rows={4}
                          required
                          value={description}
                          maxLength={1000}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder=" "
                          className="peer w-full p-4 pt-5 bg-slate-50/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-850 dark:text-white placeholder-transparent focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                        />
                        <label className="absolute left-4 top-2 text-[9px] uppercase font-black text-slate-400 dark:text-slate-550 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-450 peer-focus:top-2 peer-focus:text-[9px] peer-focus:font-black peer-focus:text-purple-500 pointer-events-none">
                          {t.description} *
                        </label>
                        <span className="absolute right-4 bottom-2.5 text-[8px] text-slate-400 font-bold">
                          {description.length}/1000
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: Category ── */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-purple-500" />
                        {t.categoryTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t.categoryDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Premium card: Adabiy Kitoblar */}
                      {(() => {
                        const litCat = categories.find(c => c.code === "adabiy_kitoblar");
                        const idVal = litCat?.id || "lit-temp-id";
                        const isSelected = categoryId === idVal;
                        return (
                          <div
                            onClick={() => setCategoryId(idVal)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between h-44 overflow-hidden ${
                              isSelected
                                ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.02]"
                                : "border-slate-200/70 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-350 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl transition-transform group-hover:scale-125" />
                            <div className="text-3xl">📖</div>
                            <div className="space-y-1 z-10">
                              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                                {t.literaryBook}
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                {t.literaryBookDesc}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Premium card: Maktab Darsliklari */}
                      {(() => {
                        const schoolCat = categories.find(c => c.code === "maktab_darsliklari");
                        const idVal = schoolCat?.id || "school-temp-id";
                        const isSelected = categoryId === idVal;
                        return (
                          <div
                            onClick={() => setCategoryId(idVal)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between h-44 overflow-hidden ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.02]"
                                : "border-slate-200/70 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-350 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl transition-transform group-hover:scale-125" />
                            <div className="text-3xl">🎓</div>
                            <div className="space-y-1 z-10">
                              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                                {t.schoolTextbook}
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                {t.schoolTextbookDesc}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Premium card: O'quv Qo'llanmalar */}
                      {(() => {
                        const guideCat = categories.find(c => c.code === "oquv_qollanmalar");
                        const idVal = guideCat?.id || "guide-temp-id";
                        const isSelected = categoryId === idVal;
                        return (
                          <div
                            onClick={() => setCategoryId(idVal)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between h-44 overflow-hidden ${
                              isSelected
                                ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/10 shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]"
                                : "border-slate-200/70 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-350 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl transition-transform group-hover:scale-125" />
                            <div className="text-3xl">📚</div>
                            <div className="space-y-1 z-10">
                              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                                {t.studyGuide}
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                {t.studyGuideDesc}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: Cover Upload ── */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-purple-500" />
                        {t.step3}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Kitob muqovasi uchun jozibali, premium rasm yuklang. Bu rasm kutubxonada asosiy ro'l o'ynaydi.
                      </p>
                    </div>

                    {coverImageUrl ? (
                      /* High End Large Book Preview Panel */
                      <div className="flex flex-col md:flex-row items-center gap-6 p-5 bg-slate-50 dark:bg-[#020617]/40 border border-slate-200 dark:border-slate-800 rounded-3xl relative overflow-hidden group">
                        <div className="w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-slate-250 dark:border-slate-800 shrink-0 select-none relative group-hover:scale-[1.01] transition-transform">
                          <img src={coverImageUrl} className="w-full h-full object-cover" alt="Cover Preview" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setImageSrc(coverImageUrl);
                                setShowCropperModal(true);
                              }}
                              className="p-1.5 bg-white text-slate-800 rounded-lg hover:scale-105 transition-transform"
                              title={t.crop}
                            >
                              <Crop className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoverImageUrl("")}
                              className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-105 transition-transform"
                              title={t.delete}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 text-center md:text-left">
                          <div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                              Muqova yuklandi!
                            </h4>
                            <p className="text-[10px] text-slate-450 dark:text-slate-450 font-bold mt-1 leading-relaxed">
                              Rasm 2:3 nisbatda avtomatik kesilgan va optimallashgan WebP formatda saqlangan.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setImageSrc(coverImageUrl);
                                setShowCropperModal(true);
                              }}
                              className="px-4 py-2 bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                              {t.crop}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoverImageUrl("")}
                              className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverCover(true);
                        }}
                        onDragLeave={() => setIsDragOverCover(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverCover(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleCoverUpload(file);
                        }}
                        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 dark:bg-[#020617]/20 relative overflow-hidden h-64 ${
                          isDragOverCover
                            ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                            : "border-slate-200/80 dark:border-slate-800 hover:border-purple-400"
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCoverUpload(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="p-4 bg-purple-500/10 rounded-2xl mb-3 text-purple-500">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                          {t.dragDropCover}
                        </h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold mt-1">
                          {t.coverFormats}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-550 mt-2 font-medium">
                          {t.coverSizes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── STEP 4: PDF & Access ── */}
                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-500" />
                        {t.pdfTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t.pdfDesc}
                      </p>
                    </div>

                    {pdfUrl ? (
                      /* Premium PDF Metadata & Page Counts */
                      <div className="p-5 bg-slate-50 dark:bg-[#020617]/40 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row items-center gap-6">
                        
                        {/* Dynamic Rendered Thumbnail or Default Icon */}
                        <div className="w-24 aspect-[2/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 overflow-hidden shadow-md flex items-center justify-center shrink-0 relative group">
                          {pdfMetadata?.thumbnail ? (
                            <img src={pdfMetadata.thumbnail} className="w-full h-full object-cover" alt="PDF Cover Page" />
                          ) : (
                            <FileText className="h-10 w-10 text-red-500" />
                          )}
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setPdfUrl("")}
                              className="p-1 bg-red-500 text-white rounded-full hover:scale-105 transition-transform"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 space-y-3.5">
                          <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white truncate max-w-sm">
                              {pdfMetadata?.name || "material.pdf"}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap items-center justify-center md:justify-start gap-3">
                              <span>{t.fileSize}: <span className="font-extrabold text-slate-800 dark:text-white">{pdfMetadata?.size || "N/A"}</span></span>
                              <span className="h-1 w-1 bg-slate-300 rounded-full" />
                              <span>{t.pageCount}: <span className="font-extrabold text-slate-800 dark:text-white">{pdfMetadata?.pageCount || "N/A"} {t.page}</span></span>
                            </p>
                          </div>

                          <div className="flex items-center justify-center md:justify-start gap-2.5">
                            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Muvaffaqiyatli yuklandi
                            </span>
                            <button
                              type="button"
                              onClick={() => setPdfUrl("")}
                              className="text-[10px] text-red-500 font-extrabold hover:underline uppercase tracking-wider"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : uploadingPdf ? (
                      <div className="border-2 border-dashed border-purple-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-purple-500/5 h-48">
                        <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin mb-3" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Fayl yuklanmoqda va qayta ishlanmoqda...
                        </h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-450 mt-1 font-semibold">
                          Sahifalar soni va muqovalar aniqlanmoqda
                        </p>
                      </div>
                    ) : (
                      /* Drag & Drop PDF Zone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverPdf(true);
                        }}
                        onDragLeave={() => setIsDragOverPdf(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverPdf(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handlePdfUpload(file);
                        }}
                        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 dark:bg-[#020617]/20 relative overflow-hidden h-48 ${
                          isDragOverPdf
                            ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                            : "border-slate-200/80 dark:border-slate-800 hover:border-purple-400"
                        }`}
                      >
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePdfUpload(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="p-3 bg-red-500/10 rounded-2xl mb-2.5 text-red-500">
                          <Upload className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                          {t.dragDropPdf}
                        </h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-455 font-semibold mt-1">
                          {t.pdfFormat}
                        </p>
                      </div>
                    )}

                    {/* Access Tier selection: Pricing style */}
                    <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">
                        {t.accessTypeTitle}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* FREE pricing card */}
                        <div
                          onClick={() => setAccessType("FREE")}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden ${
                            accessType === "FREE"
                              ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.01]"
                              : "border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 tracking-wider">
                              {t.free}
                            </span>
                            {accessType === "FREE" && <div className="h-4 w-4 bg-emerald-500 text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></div>}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-white mt-3">0 UZS</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-snug">
                              {t.freeDesc}
                            </p>
                          </div>
                        </div>

                        {/* PRO pricing card */}
                        <div
                          onClick={() => setAccessType("PRO")}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden ${
                            accessType === "PRO"
                              ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.01]"
                              : "border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-450 tracking-wider">
                              {t.pro}
                            </span>
                            {accessType === "PRO" && <div className="h-4 w-4 bg-blue-500 text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></div>}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-white mt-3">Premium Pack</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-snug">
                              {t.proDesc}
                            </p>
                          </div>
                        </div>

                        {/* ELITE pricing card */}
                        <div
                          onClick={() => setAccessType("ELITE")}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden ${
                            accessType === "ELITE"
                              ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.01]"
                              : "border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#020617]/30 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-450 tracking-wider">
                              {t.elite}
                            </span>
                            {accessType === "ELITE" && <div className="h-4 w-4 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></div>}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-white mt-3">Elite Package</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-snug">
                              {t.eliteDesc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 5: Final Review ── */}
                {currentStep === 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        {t.finalReviewTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t.finalReviewDesc}
                      </p>
                    </div>

                    {/* Summary sheet */}
                    <div className="p-5 bg-slate-50/50 dark:bg-[#020617]/30 border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-4">
                      
                      <div className="flex flex-col sm:flex-row gap-5 items-start">
                        {/* Cover Image in review */}
                        <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 select-none shadow">
                          {coverImageUrl ? (
                            <img src={coverImageUrl} className="w-full h-full object-cover" alt="Review Cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory()} p-2 flex flex-col justify-between text-white text-[8px] font-bold`}>
                              <div className="uppercase opacity-60">LMSHub</div>
                              <div className="font-extrabold line-clamp-3 leading-tight text-center">{title || "Nomi"}</div>
                              <div className="text-right opacity-80">{author || "Muallif"}</div>
                            </div>
                          )}
                        </div>

                        {/* Title details review */}
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1 text-left">
                            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              accessType === "FREE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450"
                                : accessType === "PRO"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-450"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-450"
                            }`}>
                              {accessType} Access
                            </span>
                            <h4 className="text-base font-black text-slate-900 dark:text-white mt-1 leading-snug">
                              {title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                              by {author}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                            <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Bo'lim / Kategoriya</p>
                              <p className="mt-0.5 text-slate-800 dark:text-white">{currentCategory?.name || "Kategoriya"}</p>
                            </div>
                            {subject && (
                              <div>
                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Fan & Sinf</p>
                                <p className="mt-0.5 text-slate-800 dark:text-white">{subject} {grade ? `(${grade})` : ""}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PDF info in review */}
                      <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-850 dark:text-white truncate">
                            {pdfMetadata?.name || "material.pdf"}
                          </p>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">
                            {pdfMetadata?.pageCount || "N/A"} {t.page}  •  {pdfMetadata?.size || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Description review */}
                      {description && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800">
                          <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Qisqacha Tavsif</p>
                          <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed mt-1 font-semibold">
                            {description}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Step Form Bottom Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-8 shrink-0">
                <button
                  type="button"
                  disabled={currentStep === 1 || savingForm}
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none shrink-0"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  Oldingi
                </button>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md shadow-purple-500/10 transition-all flex items-center justify-center gap-2 select-none"
                  >
                    Keyingi
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingForm}
                    onClick={handleSave}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 select-none hover:scale-[1.01]"
                  >
                    {savingForm ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        {t.saving}
                      </>
                    ) : id ? (
                      t.updateBtn
                    ) : (
                      t.publishBtn
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ── RIGHT SIDE: LIVE 3D PREVIEW CARD ── */}
          <div className="space-y-4 sticky top-6">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>{t.livePreview}</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Glowing container representing the book card */}
            <div className="p-6 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-sm text-center space-y-6 overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl bg-purple-600/10" />

              {/* 3D shadow book item */}
              <div className="mx-auto w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-[10px_15px_30px_rgba(0,0,0,0.3),-2px_0px_5px_rgba(255,255,255,0.15)_inset] bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 select-none relative group transition-transform duration-500 hover:scale-105">
                {coverImageUrl ? (
                  <img src={coverImageUrl} className="w-full h-full object-cover" alt="Live preview cover" />
                ) : (
                  /* Kindle/Apple style placeholder with category dynamic gradient */
                  <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory()} p-5 flex flex-col justify-between text-white text-left relative`}>
                    <div className="text-[8px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
                    <div className="my-auto space-y-1.5">
                      <h4 className="text-xs font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow">
                        {title || "MATERIAL NOMI"}
                      </h4>
                      <p className="text-[9px] font-bold opacity-80 line-clamp-1">{author || "Muallif"}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-2 text-[7px] font-black opacity-70">
                      <span>PREMIUM EDITION</span>
                      <span>📚</span>
                    </div>
                  </div>
                )}

                {/* Live access badge overlay */}
                <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow ${
                  accessType === "FREE"
                    ? "bg-emerald-500 text-white"
                    : accessType === "PRO"
                    ? "bg-blue-600 text-white"
                    : "bg-amber-500 text-slate-950"
                }`}>
                  {accessType}
                </span>
              </div>

              {/* Metadata display */}
              <div className="space-y-2 text-left pt-2 border-t border-slate-100 dark:border-slate-850">
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-white line-clamp-2 leading-snug">
                  {title || "Material Nomi"}
                </h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {author || "Muallif ismi"}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[9px] font-black uppercase tracking-wide">
                    {currentCategory?.name || "Kategoriya"}
                  </span>
                  {subject && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[9px] font-black uppercase tracking-wide">
                      {subject}
                    </span>
                  )}
                  {grade && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[9px] font-black uppercase tracking-wide">
                      {grade}
                    </span>
                  )}
                </div>

                {pdfMetadata && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#020617]/25 border border-slate-200/50 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-450 space-y-1.5">
                    <p className="truncate text-slate-650 dark:text-slate-350 font-extrabold">{pdfMetadata.name}</p>
                    <div className="flex items-center gap-2">
                      <span>{pdfMetadata.size}</span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full" />
                      <span>{pdfMetadata.pageCount} {t.page}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── CROPPING PRES-SET OVERLAY MODAL ── */}
      <AnimatePresence>
        {showCropperModal && imageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[520px] shadow-2xl"
            >
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <Crop className="h-4.5 w-4.5 text-purple-400" />
                  {t.cropTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCropperModal(false);
                    setImageSrc(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Easy Cropper */}
              <div className="relative flex-1 bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={2 / 3} // Locked 2:3 aspect ratio as requested
                  onCropChange={setCrop}
                  onCropComplete={(_, px) => setCroppedAreaPixels(px)}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Slider & Confirmations */}
              <div className="p-5 bg-slate-900 border-t border-slate-800/80 space-y-4 shrink-0">
                <div className="flex items-center gap-4 text-white text-xs font-bold">
                  <span>{t.zoom}</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleUploadCroppedImage}
                    disabled={uploadingImage}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yuklanmoqda...
                      </>
                    ) : (
                      t.cropActionBtn
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCropperModal(false);
                      setImageSrc(null);
                    }}
                    className="px-5 py-3 bg-slate-800 text-slate-350 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {t.cancel}
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
