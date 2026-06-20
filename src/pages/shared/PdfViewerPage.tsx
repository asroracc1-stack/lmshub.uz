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
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Fetch material details and initial progress
  useEffect(() => {
    if (materialId) {
      fetchMaterialDetails();
    }
  }, [materialId]);

  // Load PDF.js script dynamically from CDN
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
      script.onerror = () => reject(new Error("PDF.js yuklanmadi"));
      document.body.appendChild(script);
    });
  };

  const fetchMaterialDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch material metadata
      const res = await api.get(`/library/materials/${materialId}`);
      setTitle(res.data.title);
      setIsFavorite(res.data.isFavorite || false);

      // Fetch starting progress
      let startingPage = 1;
      try {
        const progressRes = await api.get(`/library/materials/${materialId}/progress`);
        startingPage = progressRes.data?.lastPage || 1;
      } catch (progressErr) {
        console.warn("Progress load error, using default page 1:", progressErr);
      }

      // Fetch PDF as arraybuffer (automatically inherits Auth headers from Axios interceptor)
      const streamUrl = `/library/materials/${materialId}/pdf-stream`;
      const response = await api.get(streamUrl, { responseType: "arraybuffer" });
      const pdfData = new Uint8Array(response.data);

      const pdfjs = await loadPdfJS();
      const loadingTask = pdfjs.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(Math.min(startingPage, pdf.numPages || 1));

    } catch (e: any) {
      console.error("PDF load error:", e);
      if (e.response?.status === 403) {
        toast.error("Ushbu material uchun sizda faol obuna yo'q");
        navigate(`${basePath}/library`);
      } else {
        setError("PDF fayl yuklanmadi");
        toast.error("Material yuklanishida xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced progress saving
  useEffect(() => {
    if (loading || error || !materialId || !pdfDoc) return;

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
  }, [currentPage, materialId, loading, error, pdfDoc]);

  // Render PDF page onto canvas
  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Canvas render error:", err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, prev + 0.15));
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-[70vh] space-y-4 text-slate-400">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-semibold">PDF yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-[70vh] space-y-4 text-center p-6 bg-[#020617] rounded-3xl border border-red-500/20">
        <div className="p-4 bg-red-500/10 rounded-full text-red-500">
          <BookOpen className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-red-500">{error}</h3>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
          Faylni yuklashda xatolik yuz berdi. Iltimos, internet aloqasini tekshirib qayta urinib ko'ring.
        </p>
        <button
          onClick={fetchMaterialDetails}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-[1.01]"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] space-y-4 p-2 transition-colors duration-300 ${
        isFullscreen ? "bg-[#020617] p-4 h-screen" : "bg-transparent"
      }`}
    >
      {/* ── Top Control Bar ── */}
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl text-white select-none">
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
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-purple-400 animate-pulse" />
              LMSHub Viewer
            </p>
          </div>
        </div>

        {/* Custom PDF Controls */}
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/50">
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
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0 && val <= numPages) setCurrentPage(val);
              }}
              className="w-10 h-7 text-center text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="text-xs text-slate-400 font-bold select-none">/ {numPages} bet</span>
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* ── Secure Canvas Container ── */}
      <div
        className="flex-1 bg-[#0F172A] border border-slate-800/80 rounded-2xl overflow-auto shadow-2xl relative flex items-start justify-center p-4 min-h-0 w-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative inline-block select-none">
          <canvas
            ref={canvasRef}
            className="shadow-2xl transition-all duration-300 rounded-lg dark:invert-[0.9] dark:hue-rotate-180 bg-white"
          />
        </div>

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[10px] text-slate-400 font-bold flex items-center gap-1.5 pointer-events-none select-none">
          <Info className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
          Kattalashtirish uchun yuqoridagi + tugmasini bosing.
        </div>
      </div>
    </div>
  );
}
