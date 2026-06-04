import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  RotateCw, RefreshCcw, ZoomIn, ZoomOut, Maximize2, 
  Minimize2, Palette, Sun, Moon, Wand2, Check, X, Loader2
} from "lucide-react";
import getCroppedImg from "@/lib/cropUtils";
import TigerPlayer from "./TigerPlayer";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onSave: (url: string) => void;
}

const FILTERS = [
  { id: "none", name: "Original", css: "none" },
  { id: "grayscale", name: "B & W", css: "grayscale(100%)" },
  { id: "brighten", name: "Brighten", css: "brightness(120%)" },
  { id: "warm", name: "Warm", css: "sepia(30%) brightness(110%)" },
  { id: "cool", name: "Cool", css: "hue-rotate(30deg) brightness(105%)" },
];

export default function LogoEditorModal({ open, onOpenChange, imageSrc, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("none");

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setLoading(true);
    try {
      const filterCss = FILTERS.find(f => f.id === activeFilter)?.css || "none";
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, { horizontal: false, vertical: false }, filterCss);
      if (!croppedImageBlob) throw new Error("Failed to crop image");

      const formData = new FormData();
      formData.append("file", croppedImageBlob, "profile.webp");

      const res = await api.post("/files/upload/profile", formData, {
        headers: {
          // Let the browser auto-set Content-Type with the correct boundary.
          // Without this, axios global 'application/json' header overrides multipart.
          "Content-Type": undefined,
        },
      });

      onSave(res.data);
      toast.success("Rasm yangilandi! Zo'r! 🐯", {
        description: "Profil rasmingiz endi yanada jozibali.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    setActiveFilter("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950/90 backdrop-blur-3xl border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-[2.5rem] p-0 overflow-hidden border-none">
        <div className="p-8 pb-4 bg-slate-900/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              Rasm Tahrirlash
            </DialogTitle>
            <p className="sr-only">Profil rasmini kesish va filtrlar qo'llash oynasi</p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          <div className="relative h-[350px] w-full rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-inner">
            {imageSrc && (
              <div style={{ filter: FILTERS.find(f => f.id === activeFilter)?.css }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  onCropChange={setCrop}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={true}
                  style={{
                    containerStyle: { background: "transparent" },
                    cropAreaStyle: { border: "2px solid rgba(168, 85, 247, 0.5)", boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)" }
                  }}
                />
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center">
                <TigerPlayer text="Chiroyli qilib joylayapman... 🐯" size={180} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Filters */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Palette className="h-3 w-3" /> Filtrlar
              </p>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300",
                      activeFilter === f.id 
                        ? "bg-primary text-white shadow-glow shadow-primary/20" 
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Kattalashtirish</p>
                <div className="flex items-center gap-4">
                  <ZoomOut className="h-4 w-4 text-slate-500" />
                  <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([v]) => setZoom(v)} className="flex-1" />
                  <ZoomIn className="h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)} className="bg-white/5 border-white/5 hover:bg-white/10 h-12 rounded-2xl gap-2 font-bold text-xs text-white">
                  <RotateCw className="h-4 w-4" /> Burish
                </Button>
                <Button variant="outline" onClick={handleReset} className="bg-white/5 border-white/5 hover:bg-white/10 h-12 rounded-2xl gap-2 font-bold text-xs text-white">
                  <RefreshCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90 shadow-glow font-black text-white uppercase tracking-[0.2em] text-[11px] h-14 rounded-2xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tasdiqlash & Saqlash"}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 h-14 text-slate-400 hover:bg-white/5 rounded-2xl font-bold"
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
