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

  // States to trace canvas page rendering
  const [renderingPage, setRenderingPage] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Fetch material details and initial progress
  useEffect(() => {
    if (materialId) {
      console.log("[PDF Viewer] Fetching material with ID:", materialId);
      fetchMaterialDetails();
    }
  }, [materialId]);

  // Load PDF.js script dynamically from CDN and configure worker Src robustly
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const configureWorker = (pdfjs: any) => {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        console.log("[PDF Viewer] PDF.js worker configured:", pdfjs.GlobalWorkerOptions.workerSrc);
      };

      if ((window as any).pdfjsLib) {
        configureWorker((window as any).pdfjsLib);
        resolve((window as any).pdfjsLib);
        return;
      }

      console.log("[PDF Viewer] PDF.js script not loaded yet. Creating script tag...");
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        console.log("[PDF Viewer] PDF.js library script loaded successfully.");
        configureWorker(pdfjs);
        resolve(pdfjs);
      };
      script.onerror = () => {
        console.error("[PDF Viewer] PDF.js script download failed.");
        reject(new Error("PDF.js yuklanmadi"));
      };
      document.body.appendChild(script);
    });
  };

  const fetchMaterialDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch material metadata
      const res = await api.get(`/library/materials/${materialId}`);
      console.log("[PDF Viewer] API response metadata:", res.data);
      console.log("[PDF Viewer] Material PDF URL:", res.data.pdfUrl);
      
      setTitle(res.data.title);
      setIsFavorite(res.data.isFavorite || false);

      // Fetch starting progress
      let startingPage = 1;
      try {
        const progressRes = await api.get(`/library/materials/${materialId}/progress`);
        startingPage = progressRes.data?.lastPage || 1;
        console.log("[PDF Viewer] API progress response lastPage:", startingPage);
      } catch (progressErr) {
        console.warn("Progress load error, using default page 1:", progressErr);
      }

      // Fetch PDF as arraybuffer (automatically inherits Auth headers from Axios interceptor)
      const streamUrl = `/library/materials/${materialId}/pdf-stream`;
      console.log("[PDF Viewer] Fetching PDF binary stream from:", streamUrl);
      
      const response = await api.get(streamUrl, { responseType: "arraybuffer" });
      console.log("[PDF Viewer] Network response status:", response.status);
      
      const pdfData = new Uint8Array(response.data);
      const pdfjs = await loadPdfJS();
      
      console.log("[PDF Viewer] PDF.js loaded. Initializing document load task...");
      const loadingTask = pdfjs.getDocument({ data: pdfData });
      
      const pdf = await loadingTask.promise;
      console.log("[PDF Viewer] Document load status: SUCCESS. Total pages:", pdf.numPages);

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(Math.min(startingPage, pdf.numPages || 1));

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

  // Debounced progress saving
  useEffect(() => {
    if (loading || error || !materialId || !pdfDoc) return;

    const saveProgressTimeout = setTimeout(async () => {
      try {
        console.log("[PDF Viewer] Saving user progress. Page:", currentPage);
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
    if (!pdfDoc || !canvasElement) {
      console.log("[PDF Viewer] Render aborted: pdfDoc ready:", !!pdfDoc, "canvasElement ready:", !!canvasElement);
      return;
    }

    let isCancelled = false;

    const render = async () => {
      try {
        setRenderingPage(true);
        setRenderError(null);
        console.log("[PDF Viewer] Starting canvas render for page:", currentPage, "scale:", scale);

        if (renderTaskRef.current) {
          console.log("[PDF Viewer] Cancelling previous rendering task...");
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const context = canvasElement.getContext("2d");
        if (!context) {
          throw new Error("Canvas 2D context is not available");
        }

        canvasElement.height = viewport.height;
        canvasElement.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        console.log("[PDF Viewer] Page render status: SUCCESS for page:", currentPage);
        
        setRenderingPage(false);
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("[PDF Viewer] Canvas render error:", err);
          setRenderError("PDF sahifasini chizishda xatolik yuz berdi");
          setRenderingPage(false);
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
  }, [pdfDoc, currentPage, scale, canvasElement]);

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

  // Center loader screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-slate-350 space-y-4">
        <Loader2 className="h-10 w-10 text-[#8B5CF6] animate-spin" />
        <p className="text-sm font-semibold tracking-wide">PDF yuklanmoqda...</p>
      </div>
    );
  }

  // Error screen layout matching specifications exactly
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-center p-6 select-none">
        <div className="p-4 bg-red-500/10 rounded-full text-red-500 mb-6 border border-red-500/20 shadow-lg animate-pulse">
          <BookOpen className="h-10 w-10" />
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight">PDF yuklanmadi</h3>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mt-2.5">
          Fayl mavjud emas yoki URL noto'g'ri.
        </p>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => {
              console.log("[PDF Viewer] User clicked retry button");
              fetchMaterialDetails();
            }}
            className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#8B5CF6]/20 hover:scale-[1.01]"
          >
            Qayta urinish
          </button>
          <button
            onClick={() => {
              console.log("[PDF Viewer] User clicked back button");
              navigate(-1);
            }}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-750 text-slate-355 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700/60"
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
        isFullscreen ? "bg-[#020617] p-4 h-screen" : "bg-transparent"
      }`}
    >
      {/* ── Top Control Bar ── */}
      <div className="flex items-center justify-between gap-4 p-4 bg-[#0F172A]/90 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-xl text-white select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-slate-800 active:scale-95 rounded-xl transition-all shrink-0 border border-transparent hover:border-[rgba(255,255,255,0.08)]"
            title="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-left">
            <h2 className="text-sm font-bold truncate">{title}</h2>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-purple-400 animate-pulse" />
              LMSHub Viewer
            </p>
          </div>
        </div>

        {/* Custom PDF Controls */}
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/65 p-1.5 rounded-xl border border-[rgba(255,255,255,0.08)]">
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
        className="flex-1 bg-[#0F172A] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-auto shadow-2xl relative flex items-start justify-center p-4 min-h-0 w-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Render level Loading Spinner overlay */}
        {renderingPage && (
          <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 space-y-3">
            <Loader2 className="h-8 w-8 text-[#8B5CF6] animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sahifa yuklanmoqda...</p>
          </div>
        )}

        {/* Render level Error overlay */}
        {renderError && (
          <div className="absolute inset-0 bg-[#0F172A] flex flex-col items-center justify-center z-10 p-6 text-center space-y-3">
            <div className="p-3 bg-red-500/10 rounded-full text-red-500 border border-red-500/20">
              <Info className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">{renderError}</h4>
            <button
              onClick={() => {
                console.log("[PDF Viewer] Retrying page render for page:", currentPage);
                setCurrentPage(currentPage);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-700/60"
            >
              Qayta urinish
            </button>
          </div>
        )}

        <div className="relative inline-block select-none">
          {/* React callback ref mapping to prevent null state bindings on render */}
          <canvas
            ref={setCanvasElement}
            className="shadow-2xl transition-all duration-300 rounded-lg dark:invert-[0.9] dark:hue-rotate-180 bg-white"
          />
        </div>

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[10px] text-slate-450 font-bold flex items-center gap-1.5 pointer-events-none select-none">
          <Info className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
          Kattalashtirish uchun yuqoridagi + tugmasini bosing.
        </div>
      </div>
    </div>
  );
}
