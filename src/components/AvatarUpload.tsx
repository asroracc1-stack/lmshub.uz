import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Upload, Trash2, Edit2, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import TigerPlayer from "./TigerPlayer";
import LogoEditorModal from "./LogoEditorModal";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  userId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-32 w-32",
  xl: "h-48 w-48",
};

export default function AvatarUpload({ userId, currentUrl, initials, onUploaded, size = "lg" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm fayli yuklash mumkin! 🖼️", {
        description: "PDF yoki boshqa formatlarni yo'lbarscha tushunmaydi.",
      });
      return;
    }
    
    const objectUrl = URL.createObjectURL(file);
    setSelectedImg(objectUrl);
    setEditorOpen(true);
  };

  const handleEditorSave = (url: string) => {
    onUploaded(url);
    setPreviewUrl(url);
    if (selectedImg) {
      URL.revokeObjectURL(selectedImg);
      setSelectedImg(null);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const displayUrl = previewUrl || (currentUrl ? `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}` : null);

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className={cn(
          "relative group cursor-pointer perspective-1000",
          isDragging && "scale-105"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Premium Neon Glow Background */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-2xl opacity-40 transition-all duration-700",
          "bg-gradient-to-tr from-primary via-purple-500 to-indigo-600 group-hover:opacity-70 group-hover:blur-3xl",
          isDragging && "opacity-90 blur-3xl"
        )} />

        <div className={cn(
          "relative rounded-full p-1.5 transition-all duration-500",
          "bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-2xl",
          isDragging && "ring-4 ring-primary ring-offset-4 ring-offset-slate-950 border-dashed"
        )}>
          <Avatar className={cn(
            sizeMap[size], 
            "relative overflow-hidden bg-slate-900 border-none transition-transform duration-700 group-hover:scale-105"
          )}>
            {imageLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
                <div className="scale-75">
                  <TigerPlayer text="" size={120} />
                </div>
              </div>
            )}
            
            {displayUrl ? (
              <AvatarImage 
                src={displayUrl} 
                alt="Avatar"
                onLoadingStatusChange={(status) => {
                  if (status === "loaded") setImageLoading(false);
                  if (status === "error") setImageLoading(false);
                }}
                className="object-cover w-full h-full"
              />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-950 text-white font-bold text-2xl">
                {initials}
              </AvatarFallback>
            )}

            {/* Hover Overlay */}
            <div className={cn(
              "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2",
              "bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500",
              isDragging && "opacity-100"
            )}>
              {isDragging ? (
                <Upload className="h-8 w-8 text-primary animate-bounce" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                    <Edit2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-white shadow-sm">O'zgartirish</span>
                </>
              )}
            </div>
          </Avatar>
        </div>

        {/* Floating Icons */}
        <div className="absolute -bottom-2 -right-2 z-30 group-hover:scale-110 transition-transform duration-500">
          <div className="w-10 h-10 rounded-full bg-gradient-primary p-0.5 shadow-glow">
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Drag Hint Border */}
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -inset-4 border-2 border-dashed border-primary/50 rounded-full animate-[spin_10s_linear_infinite]"
          />
        )}
      </div>

      {/* Removed redundant text labels for cleaner UI */}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      
      <LogoEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        imageSrc={selectedImg}
        onSave={handleEditorSave}
      />

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}
