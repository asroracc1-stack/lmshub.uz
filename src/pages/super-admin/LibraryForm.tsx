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
  Image as ImageIcon,
  FileText,
  Upload,
  Check,
  CheckCircle2,
  X,
  Crop,
  ChevronLeft,
  Loader2,
  Lock
} from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropUtils";

interface Category {
  id: string;
  name: string;
  code: string;
}

const formTranslations = {
  uz: {
    backToList: "Orqaga",
    createTitle: "Yangi material yaratish",
    editTitle: "Materialni tahrirlash",
    subtitle: "LMSHub premium kutubxonasi uchun kitob va qo'llanmalarni boshqarish.",
    materialName: "Material nomi",
    authorName: "Muallif ismi",
    description: "Tavsif (Description)",
    topic: "Mavzu",
    subject: "Fan",
    grade: "Sinf",
    noGrade: "Sinfsiz (Barcha sinflar)",
    pdfTitle: "PDF Fayl yuklash",
    dragDropPdf: "PDF faylni yuklash yoki bu yerga tashlang",
    pdfFormat: "Faqat .pdf formatdagi fayl, Maks: 50MB",
    fileSize: "Hajmi",
    pageCount: "Sahifalar soni",
    publishBtn: "Chop etish (Publish)",
    updateBtn: "Yangilash (Save)",
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
    subtitle: "Управление книгами и пособиями для библиотеки LMSHub.",
    materialName: "Название материала",
    authorName: "Имя автора",
    description: "Описание",
    topic: "Тема",
    subject: "Предмет",
    grade: "Класс",
    noGrade: "Без класса (Все классы)",
    pdfTitle: "Загрузка PDF файла",
    dragDropPdf: "Загрузите PDF файл или перетащите сюда",
    pdfFormat: "Только .pdf файлы, Макс: 50MB",
    fileSize: "Размер",
    pageCount: "Количество страниц",
    publishBtn: "Опубликовать",
    updateBtn: "Сохранить изменения",
    saving: "Сохранение...",
    validationError: "Пожалуйста, заполните все обязательные поля!",
    pdfRequired: "Пожалуйста, загрузите PDF файл!",
    cropTitle: "Обрезка обложки",
    zoom: "Масштаб",
    cropActionBtn: "Обретать и Сохранить",
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
    materialName: "Material Title",
    authorName: "Author Name",
    description: "Description",
    topic: "Topic",
    subject: "Subject",
    grade: "Grade",
    noGrade: "No Grade (All grades)",
    pdfTitle: "Upload PDF Document",
    dragDropPdf: "Upload PDF file or drag & drop here",
    pdfFormat: "Only .pdf files, Max: 50MB",
    fileSize: "Size",
    pageCount: "Pages count",
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

  // Inline Cropper States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingForm, setSavingForm] = useState(false);

  // Drag and Drop States
  const [isDragOverCover, setIsDragOverCover] = useState(false);
  const [isDragOverPdf, setIsDragOverPdf] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Helper: Get absolute file URL
  const getFileUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    const baseUrl = api.defaults.baseURL || "";
    const origin = baseUrl.replace("/api/v1", "");
    return `${origin}${url}`;
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

  // PDF.js Client Side Processing
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

            setPdfMetadata({
              name: file.name,
              size: formatBytes(file.size),
              pageCount: numPages,
              thumbnail: thumbnailDataUrl
            });
          } else {
            setPdfMetadata({
              name: file.name,
              size: formatBytes(file.size),
              pageCount: numPages,
              thumbnail: ""
            });
          }
        } catch (err) {
          console.error("PDF.js render error:", err);
          setPdfMetadata({
            name: file.name,
            size: formatBytes(file.size),
            pageCount: 0,
            thumbnail: ""
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error("Failed to load PDF.js client script:", e);
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

      // Extract details locally
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
    if (!title || !author || !categoryId) {
      toast.warning(t.validationError);
      return;
    }
    if (!pdfUrl) {
      toast.warning(t.pdfRequired);
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
      navigate("/super-admin/library-manage");
    } catch (err) {
      console.error(err);
      toast.error(lang === "uz" ? "Saqlashda xatolik yuz berdi" : "Ошибка при сохранении");
    } finally {
      setSavingForm(false);
    }
  };

  // Rich text formatting toolbar logic
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
        replacement = `**${selectedText || "qalin matn"}**`;
        break;
      case "italic":
        replacement = `*${selectedText || "qiya matn"}*`;
        break;
      case "underline":
        replacement = `<u>${selectedText || "tagiga chizilgan matn"}</u>`;
        break;
      case "list":
        replacement = `\n- ${selectedText || "ro'yxat elementi"}`;
        break;
      case "code":
        replacement = `\`${selectedText || "kod"}\``;
        break;
    }
    const newText = text.substring(0, start) + replacement + text.substring(end);
    if (newText.length <= 1000) {
      setDescription(newText);
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

  // Selected Category Info
  const currentCategory = categories.find(c => c.id === categoryId);

  // Gradient generator for Fallback covers
  const getGradientForCategory = () => {
    if (!currentCategory) return "from-indigo-650 to-purple-600";
    const code = currentCategory.code?.toLowerCase() || "";
    if (code.includes("adabiy") || code.includes("literary")) return "from-indigo-600 to-purple-600";
    if (code.includes("maktab") || code.includes("school")) return "from-emerald-600 to-teal-600";
    if (code.includes("oquv") || code.includes("study") || code.includes("guide")) return "from-amber-600 to-orange-600";
    return "from-[#8B5CF6] to-[#6366F1]";
  };

  const accessOptions = [
    { value: "FREE", label: "FREE" },
    { value: "PRO", label: "PRO" },
    { value: "ELITE", label: "ELITE" }
  ];

  return (
    <div className="w-full min-h-[90vh] bg-[#070B17] text-white p-6 md:p-8 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden transition-all duration-300">
      
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/super-admin/library-manage")}
            className="p-3 bg-[#0F172A] border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-md hover:scale-[1.02] shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-[#8B5CF6]" />
              {id ? t.editTitle : t.createTitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          {/* ── LEFT COLUMN: FORM (65% -> col-span-6) ── */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* SECTION 1: MUQOVA RASMI */}
            <div className="p-6 bg-[#0F172A] border border-white/5 rounded-[24px] space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  Muqova rasmi
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Section 1</span>
              </div>

              {/* Inline Cropper Widget */}
              {imageSrc ? (
                <div className="space-y-4">
                  <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/10 bg-[#070B17]">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={2 / 3}
                      onCropChange={setCrop}
                      onCropComplete={(_, px) => setCroppedAreaPixels(px)}
                      onZoomChange={setZoom}
                    />
                  </div>
                  
                  {/* Slider & Apply button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#070B17] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-400 shrink-0">{t.zoom}:</span>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-label="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 sm:w-32 accent-[#8B5CF6] h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setImageSrc(null)}
                        className="px-4 py-2 bg-slate-800 text-slate-350 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadCroppedImage}
                        disabled={uploadingImage}
                        className="flex items-center justify-center gap-2 px-5 py-2 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Yuklanmoqda...
                          </>
                        ) : (
                          <>
                            <Crop className="h-3.5 w-3.5" />
                            Tasdiqlash & Saqlash
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : coverImageUrl ? (
                <div className="flex items-center gap-5 p-5 bg-[#070B17] border border-white/5 rounded-2xl relative overflow-hidden group">
                  <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shrink-0 select-none shadow">
                    <img src={getFileUrl(coverImageUrl)} className="w-full h-full object-cover" alt="Cropped Cover" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                      Muqova yuklandi
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      Muqova rasmi 2:3 nisbatda kesildi va muvaffaqiyatli saqlandi.
                    </p>
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setImageSrc(getFileUrl(coverImageUrl))}
                        className="text-[10px] text-[#8B5CF6] font-bold hover:underline uppercase tracking-wider transition-colors"
                      >
                        Qayta kesish (Recrop)
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl("")}
                        className="text-[10px] text-red-500 font-bold hover:underline uppercase tracking-wider transition-colors"
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-[#070B17]/40 relative overflow-hidden h-44 cursor-pointer group ${
                    isDragOverCover
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      : "border-white/10 hover:border-[#8B5CF6]/60"
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
                  <div className="p-3 bg-[#8B5CF6]/10 rounded-xl mb-3 text-[#8B5CF6] group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Rasm yuklash yoki bu yerga tashlang
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    PNG, JPG yoki WEBP • Tavsiya etilgan: 2:3 nisbat, Maks: 5MB
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 2: PDF YUKLASH */}
            <div className="p-6 bg-[#0F172A] border border-white/5 rounded-[24px] space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  PDF yuklash
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Section 2</span>
              </div>

              {pdfUrl ? (
                <div className="p-5 bg-[#070B17] border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                        PDF yuklandi
                      </div>
                      <p className="text-xs font-extrabold text-slate-350 truncate max-w-xs md:max-w-sm">
                        {pdfMetadata?.name || pdfUrl.split("/").pop() || "material.pdf"}
                      </p>
                      <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                        {pdfMetadata?.size && pdfMetadata.size !== "N/A" ? `${pdfMetadata.size}  •  ` : ""}
                        {pdfMetadata?.pageCount ? `${pdfMetadata.pageCount} ${t.page}` : ""}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setPdfUrl("")}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                    title="O'chirish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : uploadingPdf ? (
                <div className="border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-[#070B17]/20 h-36">
                  <Loader2 className="h-6 w-6 text-[#8B5CF6] animate-spin mb-3" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#8B5CF6]">
                    Fayl yuklanmoqda va qayta ishlanmoqda...
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Sahifalar soni va metadata tahlil qilinmoqda
                  </p>
                </div>
              ) : (
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
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-[#070B17]/40 relative overflow-hidden h-36 cursor-pointer group ${
                    isDragOverPdf
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      : "border-white/10 hover:border-[#8B5CF6]/60"
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
                  <div className="p-3 bg-red-500/10 rounded-xl mb-2.5 text-red-500 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {t.dragDropPdf}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {t.pdfFormat}
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 3: ASOSIY MA'LUMOTLAR */}
            <div className="p-6 bg-[#0F172A] border border-white/5 rounded-[24px] space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  Asosiy ma'lumotlar
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Section 3</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Material Nomi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    {t.materialName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                    placeholder="Material nomini kiriting"
                  />
                </div>

                {/* Muallif */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    {t.authorName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                    placeholder="Muallif ismini kiriting"
                  />
                </div>

                {/* Kategoriya */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    Kategoriya *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                  >
                    <option value="" disabled className="bg-[#0F172A] text-slate-400">Kategoriyani tanlang *</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0F172A] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    {t.subject}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                    placeholder="Fanni kiriting (masalan, Matematika)"
                  />
                </div>

                {/* Sinf */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    {t.grade}
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                  >
                    <option value="" className="bg-[#0F172A] text-slate-400">{t.noGrade}</option>
                    {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((g) => (
                      <option key={g} value={g} className="bg-[#0F172A] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mavzu */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    {t.topic}
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-12 px-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                    placeholder="Mavzuni kiriting (masalan, Tenglamalar)"
                  />
                </div>

                {/* Kirish Turi (Segmented Buttons) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    Kirish turi (Access Tier)
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#070B17] rounded-2xl border border-white/5">
                    {accessOptions.map((opt) => {
                      const isSelected = accessType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAccessType(opt.value)}
                          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-[#8B5CF6] text-white shadow-[0_4px_15px_rgba(139,92,246,0.35)] scale-[1.01]"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {opt.value !== "FREE" && <Lock className="h-3.5 w-3.5" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 4: TAVSIF */}
            <div className="p-6 bg-[#0F172A] border border-white/5 rounded-[24px] space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  Tavsif
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Section 4</span>
              </div>

              <div className="space-y-2">
                {/* Rich text helper bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#070B17] border border-white/5 rounded-2xl">
                  <div className="flex flex-wrap gap-1">
                    {formattingOptions.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => insertFormatting(opt.type)}
                        title={opt.title}
                        className="h-8 px-3 rounded-xl text-xs font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={6}
                    required
                    value={description}
                    maxLength={1000}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Material uchun qisqacha, premium tavsif kiriting..."
                    className="w-full p-4 bg-[#070B17] border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all resize-none"
                  />
                  <div className="absolute right-4 bottom-3 flex items-center">
                    <span className={`text-[10px] font-black tracking-wider transition-colors ${
                      description.length > 900 ? "text-red-500" : "text-slate-400"
                    }`}>
                      {description.length} / 1000
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (STEPS REMOVED) */}
            <div className="flex gap-4 p-6 bg-[#0F172A] border border-white/5 rounded-[24px] shadow-lg">
              <button
                type="button"
                onClick={() => navigate("/super-admin/library-manage")}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none hover:scale-[1.01]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={savingForm}
                onClick={handleSave}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7c4fe3] hover:to-[#5558e0] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2 select-none hover:scale-[1.01]"
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
            </div>

          </div>

          {/* ── RIGHT COLUMN: LIVE 3D PREVIEW (35% -> col-span-4) ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 px-1">
              <span>Jonli ko'rinish (Live Preview)</span>
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            </div>

            {/* Live Preview Container with soft glow shadow */}
            <div className="p-6 bg-[#0F172A] border border-white/5 rounded-[24px] shadow-[0_0_50px_rgba(139,92,246,0.05)] text-center space-y-6 overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl bg-[#8B5CF6]/5" />
              
              {/* Premium 3D Book Layout */}
              <div className="py-6 flex justify-center items-center">
                <div
                  className="relative w-44 h-64 preserve-3d group transition-transform duration-500 hover:scale-105"
                  style={{ perspective: "1000px" }}
                >
                  <div
                    className="w-full h-full relative transition-transform duration-500 ease-out"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: "rotateY(-15deg) rotateX(8deg)"
                    }}
                  >
                    {/* Spine Panel */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[14px] origin-right bg-gradient-to-r from-purple-800 to-purple-650"
                      style={{
                        transform: "rotateY(-90deg) translateZ(0px)",
                        boxShadow: "inset -2px 0 5px rgba(0,0,0,0.4)"
                      }}
                    />

                    {/* Pages Stack Side */}
                    <div
                      className="absolute right-0 top-[2px] bottom-[2px] w-[12px] bg-slate-100 border-y border-r border-slate-300"
                      style={{
                        transform: "rotateY(0deg) translateZ(-12px)",
                        boxShadow: "inset 2px 0 5px rgba(0,0,0,0.1)",
                        backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 1px, #e2e8f0 1px, #e2e8f0 2px)"
                      }}
                    />

                    {/* Back Cover */}
                    <div
                      className="absolute inset-0 rounded-r-lg bg-[#0F172A] border border-white/10"
                      style={{
                        transform: "translateZ(-14px)"
                      }}
                    />

                    {/* Front Cover Card */}
                    <div
                      className="absolute inset-0 rounded-r-lg overflow-hidden border border-white/20 select-none shadow-2xl"
                      style={{
                        transform: "translateZ(0px)",
                        transformStyle: "preserve-3d"
                      }}
                    >
                      {coverImageUrl ? (
                        <img src={getFileUrl(coverImageUrl)} className="w-full h-full object-cover" alt="Live preview cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory()} p-4 flex flex-col justify-between text-white text-left relative`}>
                          <div className="text-[7px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
                          <div className="my-auto space-y-1.5">
                            <h4 className="text-[10px] font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow">
                              {title || "MATERIAL NOMI"}
                            </h4>
                            <p className="text-[8px] font-bold opacity-80 line-clamp-1">{author || "Muallif"}</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/20 pt-1.5 text-[6px] font-black opacity-70">
                            <span>PREMIUM EDITION</span>
                            <span>📚</span>
                          </div>
                        </div>
                      )}

                      {/* Access Badge Overlay */}
                      <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow ${
                        accessType === "FREE"
                          ? "bg-[#22C55E] text-white"
                          : accessType === "PRO"
                          ? "bg-[#3B82F6] text-white"
                          : "bg-[#F59E0B] text-slate-950"
                      }`}>
                        {accessType}
                      </span>
                    </div>
                  </div>

                  {/* Soft Glow Shadow underneath the 3D Book */}
                  <div className="absolute -bottom-4 left-4 right-4 h-6 bg-[#8B5CF6]/15 rounded-full blur-xl group-hover:bg-[#8B5CF6]/25 transition-all duration-500 -z-10" />
                </div>
              </div>

              {/* Readout of parameters */}
              <div className="space-y-3.5 text-left pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-base font-extrabold text-white line-clamp-2 leading-snug">
                    {title || "Material Nomi"}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    {author || "Muallif ismi"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#070B17] text-slate-350 text-[9px] font-black uppercase tracking-wide border border-white/5">
                    {currentCategory?.name || "Kategoriya"}
                  </span>
                  {subject && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B17] text-slate-350 text-[9px] font-black uppercase tracking-wide border border-white/5">
                      {subject}
                    </span>
                  )}
                  {grade && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B17] text-slate-350 text-[9px] font-black uppercase tracking-wide border border-white/5">
                      {grade}
                    </span>
                  )}
                </div>

                {/* PDF details inside live preview */}
                {pdfMetadata && (
                  <div className="p-3.5 rounded-2xl bg-[#070B17] border border-white/5 text-[10px] font-bold text-slate-400 space-y-1">
                    <p className="truncate text-slate-300 font-extrabold">{pdfMetadata.name}</p>
                    <div className="flex items-center gap-2">
                      <span>{pdfMetadata.size}</span>
                      <span className="h-1 w-1 bg-slate-700 rounded-full" />
                      <span>{pdfMetadata.pageCount} bet</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
