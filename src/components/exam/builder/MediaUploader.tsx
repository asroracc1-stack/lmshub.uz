import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon, Music, Video, FileText,
  Upload, X, ExternalLink, Loader2, Play,
  Volume2, Eye, ZoomIn, Crop, Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaItem } from "./types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ============================================================
// MediaUploader — Unified media upload component
// Supports: Image, Audio, Video, PDF
// Features: Upload file, URL input, Drag & Drop, Preview
// ============================================================

type MediaType = "image" | "audio" | "video" | "pdf" | "all";

interface MediaUploaderProps {
  value?: MediaItem;
  onChange: (media: MediaItem | undefined) => void;
  accept?: MediaType;
  label?: string;
  compact?: boolean;
  className?: string;
  showPosition?: boolean;
}

const ACCEPT_MAP: Record<MediaType, Record<string, string[]>> = {
  image: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"] },
  audio: { "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".aac"] },
  video: { "video/*": [".mp4", ".webm", ".mov"], "application/x-youtube": [] },
  pdf:   { "application/pdf": [".pdf"] },
  all:   {
    "image/*": [], "audio/*": [], "video/*": [],
    "application/pdf": [], "application/msword": [],
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  audio: <Volume2 className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  pdf:   <FileText className="h-4 w-4" />,
  all:   <Upload className="h-4 w-4" />,
};

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  value, onChange, accept = "image", label, compact = false, className, showPosition = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value?.url || "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "url">("upload");

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      return res.data;
    } catch (e: any) {
      toast.error("Yuklashda xatolik: " + (e?.response?.data?.message || e?.message));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const detectType = (url: string): MediaItem["type"] => {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return "video";
    if (/\.(mp4|webm|mov)/.test(u)) return "video";
    if (/\.(mp3|wav|ogg|m4a|aac)/.test(u)) return "audio";
    if (/\.(pdf)/.test(u)) return "pdf";
    return "image";
  };

  const handleDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (!url) return;
    const fileType = file.type.startsWith("image") ? "image"
      : file.type.startsWith("audio") ? "audio"
      : file.type.startsWith("video") ? "video"
      : "pdf";
    onChange({ type: fileType, url, position: "top" });
    setUrlInput(url);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPT_MAP[accept],
    maxFiles: 1,
    disabled: uploading,
  });

  const handleUrlApply = () => {
    if (!urlInput.trim()) { onChange(undefined); return; }
    const type = accept === "all" ? detectType(urlInput) : (accept === "all" ? "image" : accept);
    onChange({ type: type as MediaItem["type"], url: urlInput.trim(), position: "top" });
  };

  if (compact && value?.url) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative h-12 w-16 rounded-lg border bg-muted overflow-hidden shrink-0">
          {value.type === "image" ? (
            <img src={value.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              {TYPE_ICONS[value.type]}
            </div>
          )}
          <button
            className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
            onClick={() => { onChange(undefined); setUrlInput(""); }}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
        {showPosition && (
          <Select
            value={value.position || "top"}
            onValueChange={(v) => onChange({ ...value, position: v as MediaItem["position"] })}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["top", "bottom", "left", "right", "inline"].map((p) => (
                <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {previewOpen && <MediaPreviewDialog media={value} onClose={() => setPreviewOpen(false)} />}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}

      {value?.url ? (
        // Preview with controls
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <MediaPreview media={value} />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {showPosition && (
              <Select
                value={value.position || "top"}
                onValueChange={(v) => onChange({ ...value, position: v as MediaItem["position"] })}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["top", "bottom", "left", "right", "inline"].map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                onClick={() => { onChange(undefined); setUrlInput(""); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {previewOpen && <MediaPreviewDialog media={value} onClose={() => setPreviewOpen(false)} />}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="upload" className="text-xs h-7">Yuklash</TabsTrigger>
            <TabsTrigger value="url" className="text-xs h-7">URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-1">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                "hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10",
                isDragActive && "border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]",
                uploading && "opacity-60 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <span className="text-xs text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600">
                    {TYPE_ICONS[accept]}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isDragActive ? "Tashlang..." : "Sudrab tashlang yoki bosing"}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-1">
            <div className="flex gap-2">
              <Input
                className="text-sm"
                placeholder="https://... URL kiriting"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlApply(); }}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleUrlApply}
                className="shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// ============================================================
// MediaPreview — Display media based on type
// ============================================================
export const MediaPreview: React.FC<{ media: MediaItem; className?: string }> = ({ media, className }) => {
  if (!media?.url) return null;

  if (media.type === "image") {
    return (
      <img
        src={media.url}
        alt={media.caption || ""}
        className={cn("max-w-full max-h-48 object-contain rounded-lg border", className)}
      />
    );
  }
  if (media.type === "audio") {
    return <audio controls src={media.url} className={cn("w-full h-10", className)} />;
  }
  if (media.type === "video") {
    const isYoutube = media.url.includes("youtube.com") || media.url.includes("youtu.be");
    if (isYoutube) {
      const videoId = media.url.includes("youtu.be")
        ? media.url.split("youtu.be/")[1]?.split("?")[0]
        : media.url.split("v=")[1]?.split("&")[0];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className={cn("w-full h-36 rounded-lg border", className)}
          allowFullScreen
        />
      );
    }
    return <video controls src={media.url} className={cn("max-w-full max-h-48 rounded-lg border", className)} />;
  }
  if (media.type === "pdf") {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer"
        className={cn("flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors text-sm", className)}>
        <FileText className="h-5 w-5 text-rose-500" />
        <span className="truncate">{media.url.split("/").pop() || "PDF fayl"}</span>
        <ExternalLink className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
      </a>
    );
  }
  return null;
};

// ============================================================
// MediaPreviewDialog
// ============================================================
const MediaPreviewDialog: React.FC<{ media: MediaItem; onClose: () => void }> = ({ media, onClose }) => (
  <Dialog open onOpenChange={() => onClose()}>
    <DialogContent className="max-w-3xl">
      <DialogTitle className="sr-only">Media Preview</DialogTitle>
      <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
        {media.type === "image" && (
          <img src={media.url} alt="" className="max-w-full max-h-[65vh] object-contain rounded-xl" />
        )}
        {media.type === "audio" && <audio controls src={media.url} className="w-full" />}
        {media.type === "video" && (
          <video controls src={media.url} className="max-w-full max-h-[65vh] rounded-xl" />
        )}
        {media.type === "pdf" && (
          <iframe src={media.url} className="w-full h-[65vh] rounded-xl border" />
        )}
      </div>
    </DialogContent>
  </Dialog>
);

// ============================================================
// MultiMediaUploader — multiple media items
// ============================================================
interface MultiMediaUploaderProps {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxItems?: number;
  className?: string;
}

export const MultiMediaUploader: React.FC<MultiMediaUploaderProps> = ({
  items, onChange, maxItems = 5, className
}) => {
  const addItem = (m: MediaItem | undefined) => {
    if (!m) return;
    onChange([...items, m]);
  };
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, m: MediaItem | undefined) => {
    if (!m) { removeItem(i); return; }
    onChange(items.map((item, idx) => idx === i ? m : item));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item, i) => (
          <div key={i} className="relative group rounded-xl border bg-card overflow-hidden">
            <div className="p-2">
              <MediaPreview media={item} />
            </div>
            <button
              className="absolute top-1 right-1 h-5 w-5 bg-rose-500 text-white rounded-full items-center justify-center hidden group-hover:flex"
              onClick={() => removeItem(i)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length < maxItems && (
          <MediaUploader
            onChange={addItem}
            accept="all"
            compact={false}
            showPosition={false}
          />
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
