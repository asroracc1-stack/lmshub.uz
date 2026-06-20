import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkMinus,
  Search,
  BookOpen,
  Info,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function PdfViewerPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "user";
  const rolePath = role === "super_admin" ? "super-admin" : role === "payment_manager" ? "pack-manager" : role;
  const basePath = `/${rolePath}`;

  const [title, setTitle] = useState("Kitob o'qish");
  const [pdfUrl, setPdfUrl] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch material details and initial progress
  useEffect(() => {
    if (materialId) {
      fetchMaterialDetails();
    }
  }, [materialId]);

  const fetchMaterialDetails = async () => {
    try {
      setLoading(true);
      // Fetch material metadata
      const res = await api.get(`/library/materials/${materialId}`);
      setTitle(res.data.title);
      setIsFavorite(res.data.isFavorite || false);

      // Fetch starting progress
      const progressRes = await api.get(`/library/materials/${materialId}/progress`);
      const startingPage = progressRes.data?.lastPage || 1;
      setCurrentPage(startingPage);

      // Set secure streaming endpoint as source
      const streamUrl = `${api.defaults.baseURL}/library/materials/${materialId}/pdf-stream`;
      setPdfUrl(streamUrl);
    } catch (e: any) {
      console.error(e);
      if (e.response?.status === 403) {
        toast.error("Ushbu material uchun sizda faol obuna yo'q");
        navigate(`${basePath}/library`);
      } else {
        toast.error("Material yuklanishida xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced progress saving
  useEffect(() => {
    if (loading || !materialId) return;

    const saveProgressTimeout = setTimeout(async () => {
      try {
        await api.post(`/library/materials/${materialId}/progress`, {
          lastPage: currentPage
        });
      } catch (e) {
        console.error("Progress saqlashda xatolik:", e);
      }
    }, 2000); // Save progress after 2 seconds of inactivity on page

    return () => clearTimeout(saveProgressTimeout);
  }, [currentPage, materialId, loading]);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.0, prev + 0.15));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.6, prev - 0.15));
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

  // Dynamically update the iframe src hash without triggering a full iframe reload
  useEffect(() => {
    if (!iframeRef.current || !pdfUrl) return;
    const zoomPct = Math.round(scale * 100);
    const newSrc = `${pdfUrl}#page=${currentPage}&zoom=${zoomPct}&toolbar=0&navpanes=0`;
    
    // Only update the src attribute if it differs from the new target URL.
    // Since only the hash portion (#page=...) changes, modern browsers
    // will scroll to the target page smoothly instead of reloading the document.
    if (iframeRef.current.src !== newSrc) {
      iframeRef.current.src = newSrc;
    }
  }, [currentPage, scale, pdfUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">Material yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl text-white">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-slate-800 active:scale-95 rounded-xl transition-all shrink-0"
            title="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">{title}</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-primary animate-pulse" />
              LMSHub Viewer
            </p>
          </div>
        </div>

        {/* Custom PDF Controls */}
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/50">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300"
            title="Kichiklashtirish"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>
          <span className="text-xs font-bold text-slate-400 w-12 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300"
            title="Kattalashtirish"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />

          {/* Page navigation */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Oldingi bet"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0) setCurrentPage(val);
              }}
              className="w-10 h-7 text-center text-xs font-bold bg-slate-850 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
            />
            <span className="text-xs text-slate-400 font-bold select-none">/ bet</span>
          </div>
          <button
            onClick={handleNextPage}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300"
            title="Keyingi bet"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1" />

          {/* Favorite Bookmarking */}
          <button
            onClick={handleToggleFavorite}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all"
            title={isFavorite ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
          >
            <Bookmark className={`h-4.5 w-4.5 transition-colors ${isFavorite ? "text-rose-500 fill-rose-500" : "text-slate-300 hover:text-rose-450"}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300"
            title={isFullscreen ? "Kichik ekran" : "To'liq ekran"}
          >
            {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* ── Secure iframe Container ── */}
      <div
        ref={containerRef}
        className="flex-1 bg-[#0F172A] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
      >
        {/* Anti-download Overlay for context-menu blocking & click interception */}
        <div 
          className="absolute inset-x-0 top-0 h-10 bg-slate-900/10 pointer-events-auto"
          onContextMenu={(e) => e.preventDefault()}
        />

        {pdfUrl ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 select-none bg-slate-950"
            title="LMSHub PDF Built-in Viewer"
            allow="fullscreen"
          />
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-slate-500 text-sm">PDF oqimi yuklanmadi.</p>
          </div>
        )}

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[10px] text-slate-400 font-bold flex items-center gap-1.5 pointer-events-none select-none">
          <Info className="h-3.5 w-3.5 text-primary" />
          Matn topish uchun PDF ichida Ctrl+F tugmalarini bosing.
        </div>
      </div>
    </div>
  );
}
