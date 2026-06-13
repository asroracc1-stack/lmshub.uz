import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Camera, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orgId?: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export default function LogoUpload({ orgId, currentUrl, onUploaded }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("dynamic.logoupload.faqat_rasm_fayli_yuklash_mumkin"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("dynamic.logoupload.rasm_2mb_dan_kichik_bo_lishi_kerak"));
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data: url } = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Vite proxy handles /api/v1 prefix, but if we need full URL:
      const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;

      setPreview(fullUrl);
      onUploaded(fullUrl);
      toast.success(t("dynamic.logoupload.logo_yuklandi"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Yuklashda xatolik");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-glow group bg-muted grid place-items-center">
        {preview ? (
          <img src={preview} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-8 w-8 text-muted-foreground" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm",
            "opacity-0 group-hover:opacity-100 transition-smooth",
            uploading && "opacity-100",
          )}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>
      <div className="text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary hover:underline font-medium"
          disabled={uploading}
        >
          Logo yuklash
        </button>
        <p className="text-xs text-muted-foreground">PNG/JPG, max 2MB</p>
      </div>
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
    </div>
  );
}
