import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Maximize2,
  Minimize2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function PdfViewerPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const role = user?.role?.toLowerCase() || "user";
  const rolePath = role === "super_admin" ? "super-admin" : role === "payment_manager" ? "pack-manager" : role;
  const basePath = `/${rolePath}`;

  const [title, setTitle] = useState("Kitob o'qish");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch material details and load PDF as blob
  useEffect(() => {
    if (materialId) {
      fetchMaterialDetails();
    }
  }, [materialId]);

  // Clean up object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchMaterialDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch material metadata
      const res = await api.get(`/library/materials/${materialId}`);
      setTitle(res.data.title);
      setIsFavorite(res.data.isFavorite || false);

      // Fetch PDF as Blob (inherits Auth headers automatically)
      const streamUrl = `/library/materials/${materialId}/pdf-stream`;
      const response = await api.get(streamUrl, { responseType: "blob" });
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

    } catch (e: any) {
      console.error("[PDF Viewer] PDF load error:", e);
      if (e.response?.status === 403) {
        toast.error("Ushbu material uchun sizda faol obuna yo'q");
        navigate(`${basePath}/library`);
      } else {
        setError("Fayl mavjud emas yoki URL noto'g'ri.");
        toast.error("Material yuklanishida xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        toast.error("To'liq ekran rejimiga o'tishda xatolik");
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFavorite = async () => {
    if (!materialId) return;
    try {
      const res = await api.post(`/library/materials/${materialId}/favorite`);
      setIsFavorite(res.data.isFavorite);
      toast.success(res.data.isFavorite ? "Sevimlilarga qo'shildi ❤️" : "Sevimlilardan o'chirildi");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen space-y-4 ${
        theme === "dark" ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-600"
      }`}>
        <Loader2 className="h-10 w-10 text-purple-650 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">PDF yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen text-center p-6 select-none ${
        theme === "dark" ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-600"
      }`}>
        <div className="p-4 bg-red-500/10 rounded-full text-red-500 mb-6 border border-red-500/20 shadow-lg animate-pulse">
          <BookOpen className="h-10 w-10" />
        </div>
        <h3 className={`text-2xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>PDF yuklanmadi</h3>
        <p className={`text-sm max-w-sm leading-relaxed mt-2.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          Fayl mavjud emas yoki URL noto'g'ri.
        </p>
        <div className="flex gap-4 mt-8">
          <button
            onClick={fetchMaterialDetails}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 hover:scale-[1.01]"
          >
            Qayta urinish
          </button>
          <button
            onClick={() => navigate(-1)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700/60"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] space-y-4 p-2 transition-colors duration-300 ${
        isFullscreen 
          ? (theme === "dark" ? "bg-[#020617] p-4 h-screen" : "bg-slate-50 p-4 h-screen") 
          : "bg-transparent"
      }`}
    >
      {/* ── Top Control Bar ── */}
      <div className={`flex items-center justify-between gap-4 p-4 border rounded-2xl shadow-xl transition-colors duration-350 select-none ${
        theme === "dark" 
          ? "bg-[#0F172A]/90 border-[rgba(255,255,255,0.08)] text-white" 
          : "bg-white border-slate-200 text-slate-800"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className={`p-2.5 active:scale-95 rounded-xl transition-all shrink-0 border ${
              theme === "dark"
                ? "hover:bg-slate-800 border-transparent hover:border-[rgba(255,255,255,0.08)] text-white"
                : "hover:bg-slate-100 border-transparent hover:border-slate-200 text-slate-700"
            }`}
            title="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-left">
            <h2 className="text-sm font-bold truncate">{title}</h2>
            <p className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}>
              <BookOpen className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
              LMSHub Viewer
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${
          theme === "dark"
            ? "bg-slate-950/65 border-[rgba(255,255,255,0.08)] text-white"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}>
          {/* Favorite Bookmarking */}
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 active:scale-95 rounded-lg transition-all ${
              theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-200"
            }`}
            title={isFavorite ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
          >
            <Bookmark className={`h-4.5 w-4.5 transition-colors ${isFavorite ? "text-rose-500 fill-rose-500" : "text-slate-500 hover:text-rose-600"}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 active:scale-95 rounded-lg transition-all ${
              theme === "dark" ? "hover:bg-slate-800 text-slate-350" : "hover:bg-slate-200 text-slate-600"
            }`}
            title={isFullscreen ? "Kichik ekran" : "To'liq ekran"}
          >
            {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* ── Secure iframe Container ── */}
      <div
        className={`flex-1 border rounded-2xl overflow-hidden shadow-2xl relative flex items-stretch justify-stretch min-h-0 w-full ${
          theme === "dark"
            ? "bg-[#0F172A] border-[rgba(255,255,255,0.08)]"
            : "bg-white border-slate-200"
        }`}
      >
        {pdfUrl ? (
          <iframe 
            src={pdfUrl} 
            className="w-full h-full border-none"
            title={title}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full space-y-3">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <p className={`text-xs font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Fayl yuklanmoqda...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
