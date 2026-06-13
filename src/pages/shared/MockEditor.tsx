import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Sparkles, Music, FileText, Wand2, Save, BrainCircuit, ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";

interface OptionState {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  imagePosition?: "top" | "bottom" | "left" | "right";
}

interface Q {
  prompt: string;
  qtype: "mcq" | "tfng" | "ynng" | "fill" | "short" | "matching" | "headings";
  options: OptionState[];
  imageUrl?: string;
  imagePosition?: "top" | "bottom" | "left" | "right";
  points: number;
  explanation?: string;
}

const newQ = (): Q => ({ 
  prompt: "", 
  qtype: "mcq", 
  options: [{text: "A", isCorrect: true}, {text: "B", isCorrect: false}, {text: "C", isCorrect: false}, {text: "D", isCorrect: false}], 
  points: 1 
});
const newSection = (): Section => ({ title: "", passage: "", questions: [newQ()] });

export default function MockEditor({ basePath = "/super-admin" }: { basePath?: string }) {
  const { profile } = useAuth();
  const nav = useNavigate();
  const { testId } = useParams<{ testId?: string }>();
  const isEdit = !!testId;

  const [kind, setKind] = useState<"reading" | "listening" | "writing" | "speaking" | "sat" | "national_cert">("reading");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState("medium");
  const [partType, setPartType] = useState("full");
  const [requiredPack, setRequiredPack] = useState("free");
  const [isPublished, setIsPublished] = useState(true);

  const [sections, setSections] = useState<Section[]>([newSection()]);
  const [writingPrompt, setWritingPrompt] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [aiText, setAiText] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const onPdfUpload = async (file: File) => {
    setPdfBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPdfUrl(res.data);
      toast.success("PDF variant yuklandi");
    } catch (e: any) { 
      toast.error("PDF yuklashda xatolik: " + (e.response?.data?.message || e.message)); 
    } finally {
      setPdfBusy(false);
    }
  };

  const onParsePdfAi = async (file: File) => {
    setAiBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/admin/exams/analyze-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000, // 4 minutes for large PDFs (Railway backend needs more time)
      });

      // Server returned plain text error (e.g. "AI xizmati sozlanmagan...")
      if (typeof res.data === "string" && !res.data.trim().startsWith("{")) {
        toast.error("AI xatolik: " + res.data, { duration: 8000 });
        return;
      }

      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        const mapped: Section[] = data.sections.map((s: any) => ({
          title: s.title ?? "",
          passage: s.passage ?? "",
          imageUrl: s.imageUrl ?? "",
          questions: (s.questions ?? []).filter((q: any) => q.prompt).map((q: any) => {
            const rawOptions = Array.isArray(q.options) ? q.options : [];
            const correctAns = String(q.correct_answer ?? "").trim();
            const opts = rawOptions.map(o => ({
                text: String(o),
                isCorrect: String(o).trim() === correctAns,
                imageUrl: "",
                imagePosition: "left" as const
            }));
            if (opts.length === 0 && correctAns) {
                opts.push({ text: correctAns, isCorrect: true, imageUrl: "", imagePosition: "left" as const });
            }
            return {
                prompt: q.prompt ?? "",
                qtype: ["mcq", "tfng", "ynng", "fill", "short", "matching", "headings"].includes(q.qtype) ? q.qtype : "short",
                options: opts,
                imageUrl: "",
                imagePosition: "top" as const,
                points: q.points ?? 1,
                explanation: q.explanation ?? "",
            };
          }),
        }));
        const totalQs = mapped.reduce((acc, s) => acc + s.questions.length, 0);
        if (totalQs === 0) {
          toast.error("AI PDF-dan savollarni ajrata olmadi.");
          return;
        }
        setSections(mapped);
        toast.success(`Muvaffaqiyatli: PDF tahlil qilindi, ${mapped.length} bo'lim va ${totalQs} ta savol olindi.`);
      } else {
        toast.error("AI PDF ma'lumotlarini noto'g'ri formatda qaytardi.");
      }
    } catch (e: any) {
      console.error("PDF AI Parse Error:", e);
      // Try to extract the actual message from server response
      const serverMsg = e.response?.data;
      if (typeof serverMsg === "string" && serverMsg.trim()) {
        toast.error("PDF AI xatolik: " + serverMsg, { duration: 8000 });
      } else {
        toast.error("PDF AI tahlilida xatolik: " + (e.response?.data?.message || e.message), { duration: 6000 });
      }
    } finally {
      setAiBusy(false);
    }
  };

  // Load existing test in edit mode
  useEffect(() => {
    if (!isEdit || !testId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/exams/${testId}`);
        const t = res.data;
        if (!t) { toast.error("Test topilmadi"); nav(`${basePath}/mocks`); return; }

        setKind(t.type?.toLowerCase() || "reading");
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setAudioUrl(t.audioUrl ?? t.audio_url ?? "");
        setPdfUrl(t.pdfUrl ?? t.pdf_url ?? "");
        setDuration(t.durationMinutes ?? t.duration_minutes ?? 60);
        setDifficulty(t.difficulty?.toLowerCase() || "medium");
        setRequiredPack(t.required_pack || t.requiredPack || "free");

        const isExam = ["reading", "listening", "sat", "national_cert"].includes(t.type?.toLowerCase());
        
        if (isExam && t.passages) {
            const built: Section[] = t.passages.map((p: any) => ({
                title: p.title || "",
                passage: p.content || "",
                imageUrl: p.imageUrl ?? p.image_url ?? "",
                questions: p.questions?.length ? p.questions.map((q: any) => ({
                    prompt: q.text || "",
                    qtype: q.questionType ?? q.question_type ?? "short",
                    options: Array.isArray(q.options) ? q.options.map((o: any) => ({
                        text: o.text || "",
                        isCorrect: o.isCorrect ?? o.is_correct ?? false,
                        imageUrl: o.imageUrl ?? o.image_url ?? "",
                        imagePosition: o.imagePosition ?? o.image_position ?? "left"
                    })) : [],
                    imageUrl: q.imageUrl ?? q.image_url ?? "",
                    imagePosition: q.imagePosition ?? q.image_position ?? "top",
                    points: q.points || 1,
                    explanation: q.explanation || ""
                })) : [newQ()]
            }));
            setSections(built.length ? built : [newSection()]);
        } else {
            // fallback for writing/speaking or if no passages
            setWritingPrompt(t.description || ""); // or wherever we store the main prompt
            setSections([newSection()]);
        }
      } catch (e: any) { 
        toast.error("Ma'lumotlarni yuklashda xatolik: " + (e.response?.data?.message || e.message)); 
      }
      finally { setLoading(false); }
    })();
  }, [isEdit, testId, basePath, nav]);

  const updS = (i: number, patch: Partial<Section>) => setSections((p) => p.map((s, x) => x === i ? { ...s, ...patch } : s));
  const updQ = (si: number, qi: number, patch: Partial<Q>) =>
    setSections((p) => p.map((s, x) => x === si ? { ...s, questions: s.questions.map((q, y) => y === qi ? { ...q, ...patch } : q) } : s));
  const addS = () => setSections((p) => [...p, newSection()]);
  const rmS = (i: number) => setSections((p) => p.filter((_, x) => x !== i));
  const addQ = (si: number) => setSections((p) => p.map((s, x) => x === si ? { ...s, questions: [...s.questions, newQ()] } : s));
  const rmQ = (si: number, qi: number) => setSections((p) => p.map((s, x) => x === si ? { ...s, questions: s.questions.filter((_, y) => y !== qi) } : s));

  const onAudioUpload = async (file: File) => {
    setAudioBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
        onUploadProgress: (e) => {
          // Progress can be tracked here if needed
          const percent = Math.round((e.loaded * 100) / (e.total || file.size));
          console.log("Upload progress:", percent);
        }
      });
      // The backend returns the URL string or full endpoint path
      let url = res.data;
      if (typeof url === 'string' && url.startsWith('/api/v1')) {
        // Just use the relative path, Vite proxy will handle it
        setAudioUrl(url);
      } else {
        setAudioUrl(url);
      }
      toast.success("Audio yuklandi");
    } catch (e: any) { 
        toast.error("Audio yuklashda xatolik: " + (e.response?.data?.message || e.message)); 
    }
    finally { setAudioBusy(false); }
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    } catch (e) {
      toast.error("Rasm yuklashda xatolik yuz berdi.");
      return null;
    }
  };

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
      const newPreviews = files.map(f => URL.createObjectURL(f));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onParseAi = async () => {
    const trimmedText = aiText.trim();
    if (!trimmedText || trimmedText.length < 50) { toast.error("Matn juda qisqa"); return; }
    setAiBusy(true);
    try {
      let res;
      if (images.length === 0) {
        // Rasm yuklanmagan bo'lsa, oddiy toza JSON formatida yuboramiz
        res = await api.post("/admin/exams/parse-ai", 
          { text: trimmedText },
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        // Rasm yuklangan bo'lsa, FormData (multipart/form-data) formatida yuboramiz
        const formData = new FormData();
        formData.append("text", trimmedText);
        images.forEach(img => {
          formData.append("images", img);
        });
        res = await api.post("/admin/exams/parse-ai", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      
      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        const mapped: Section[] = data.sections.map((s: any) => ({
          title: s.title ?? "",
          passage: s.passage ?? "",
          imageUrl: s.imageUrl ?? "",
          questions: (s.questions ?? []).filter((q: any) => q.prompt).map((q: any) => {
            const rawOptions = Array.isArray(q.options) ? q.options : [];
            const correctAns = String(q.correct_answer ?? "").trim();
            const opts = rawOptions.map(o => ({
                text: String(o),
                isCorrect: String(o).trim() === correctAns,
                imageUrl: "",
                imagePosition: "left" as const
            }));
            if (opts.length === 0 && correctAns) {
                opts.push({ text: correctAns, isCorrect: true, imageUrl: "", imagePosition: "left" as const });
            }
            return {
                prompt: q.prompt ?? "",
                qtype: ["mcq", "tfng", "ynng", "fill", "short", "matching", "headings"].includes(q.qtype) ? q.qtype : "short",
                options: opts,
                imageUrl: "",
                imagePosition: "top" as const,
                points: q.points ?? 1,
                explanation: q.explanation ?? "",
            };
          }),
        }));

        // Validate that we actually have questions
        const totalQs = mapped.reduce((acc, s) => acc + s.questions.length, 0);
        if (totalQs === 0) {
          toast.error("AI savollarni ajrata olmadi. Iltimos, matnni aniqroq kiriting.");
          return;
        }

        setSections(mapped);
        setImages([]); // Clear after success
        setPreviews([]);
        toast.success(`Muvaffaqiyatli: ${mapped.length} qism, ${totalQs} savol tayyorlandi.`);
      } else { 
        toast.error("AI ma'lumotni noto'g'ri formatda qaytardi. Iltimos, qayta urinib ko'ring."); 
      }
    } catch (e: any) { 
        console.error("AI Parse Error:", e);
        const retryAfter = e.response?.data?.details?.retryAfterSeconds || 30;

        if (e.response?.status === 429) {
            let secondsLeft = retryAfter;
            const toastId = toast.loading(`AI serverlari band. ${secondsLeft} soniyadan keyin qayta uriniladi...`, {
              duration: (retryAfter + 2) * 1000,
            });

            const timer = setInterval(() => {
              secondsLeft -= 1;
              if (secondsLeft > 0) {
                toast.loading(`AI serverlari band. ${secondsLeft} soniyadan keyin qayta uriniladi...`, { id: toastId });
              } else {
                clearInterval(timer);
                toast.dismiss(toastId);
                toast.success("Qayta urinish boshlanmoqda...", { duration: 2000 });
                onParseAi(); // Auto-retry
              }
            }, 1000);

        } else if (e.response?.status === 500 && e.response?.data?.message?.includes("kaliti")) {
            toast.error("Tizim sozlamalarida xatolik (API key topilmadi), iltimos administratorga murojaat qiling.");
        } else if (e.response?.status === 500) {
            toast.error(e.response?.data?.message || "Serverda xatolik: AI tahlili muvaffaqiyatsiz bo'ldi.");
        } else {
            toast.error("Xatolik: " + (e.response?.data?.message || e.message)); 
        }
    }
    finally { setAiBusy(false); }
  };
  const totalQuestions = useMemo(() => {
    return sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  }, [sections]);

  const save = async () => {
    if (!title.trim()) { toast.error("Sarlavha kerak"); return; }
    setSaving(true);
    try {
      const payload = {
        title,
        description: description || null,
        type: kind.toUpperCase(),
        audio_url: kind === "listening" ? audioUrl : null,
        pdf_url: pdfUrl || null,
        duration_minutes: duration,
        passing_score: 50,
        difficulty: difficulty.toUpperCase(),
        required_pack: requiredPack,
        sections: sections.filter(s => s.title.trim() || s.passage.trim() || s.questions.length > 0).map(s => ({
            title: s.title || "Section",
            passage: s.passage || "",
            image_url: s.imageUrl || null,
            questions: s.questions.filter(q => q.prompt && q.prompt.trim() !== "").map(q => ({
                prompt: q.prompt,
                qtype: q.qtype,
                options: q.options.map(o => ({
                    text: o.text,
                    is_correct: o.isCorrect,
                    image_url: o.imageUrl || null,
                    image_position: o.imagePosition || "left"
                })),
                image_url: q.imageUrl || null,
                image_position: q.imagePosition || "top",
                points: q.points || 1,
                explanation: q.explanation || ""
            }))
        }))
      };

      if (isEdit) {
        await api.put(`/admin/exams/${testId}`, payload);
      } else {
        await api.post("/admin/exams", payload);
      }

      toast.success(isEdit ? "Test yangilandi ✅" : "Test yaratildi ✅");
      nav(`${basePath}/mocks/c/${kind}`);
    } catch (e: any) { 
        if (e.response?.status === 409) {
            toast.error("Bu sarlavhali test bor, iltimos boshqa nom tanlang");
        } else {
            toast.error("Xatolik: " + (e.response?.data?.message || e.message)); 
        }
    }
    finally { setSaving(false); }
  };

  const isExam = ["reading", "listening", "sat", "national_cert"].includes(kind);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="text-3xl font-display font-bold">{isEdit ? "Mock testni tahrirlash" : "Yangi mock test"}</h1>
          <Badge variant="outline" className="capitalize">{kind}</Badge>
        </div>
      </div>

      {/* Meta */}
      <Card className="p-6 space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Turi</Label>
            <Select value={kind} onValueChange={(v: any) => setKind(v)} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reading">📖 IELTS Reading</SelectItem>
                <SelectItem value="listening">🎧 IELTS Listening</SelectItem>
                <SelectItem value="writing">✍️ IELTS Writing</SelectItem>
                <SelectItem value="speaking">🎤 IELTS Speaking</SelectItem>
                <SelectItem value="sat">🎯 SAT</SelectItem>
                <SelectItem value="national_cert">🏛️ Milliy sertifikat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vaqt (daq)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Qiyinlik</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Oson</SelectItem>
                <SelectItem value="medium">O'rta</SelectItem>
                <SelectItem value="hard">Qiyin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reja</Label>
            <Select value={requiredPack} onValueChange={setRequiredPack}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Bepul</SelectItem>
                <SelectItem value="pro">Pro pack</SelectItem>
                <SelectItem value="elite">Elite pack</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Sarlavha</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cambridge 18 - Test 1 Reading" />
        </div>
        <div className="space-y-1.5">
          <Label>Tavsif (ixtiyoriy)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>PDF Variant (ixtiyoriy)</Label>
          <div className="flex gap-3 items-center flex-wrap">
            <label className="cursor-pointer">
              <input type="file" accept="application/pdf" hidden disabled={pdfBusy} onChange={(e) => e.target.files?.[0] && onPdfUpload(e.target.files[0])} />
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/40 hover:bg-primary/5 transition-smooth">
                {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                PDF yuklash
              </span>
            </label>
            <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="yoki PDF URL kiriting" className="flex-1" />
            {pdfUrl && (
              <Button variant="ghost" className="text-rose-500" onClick={() => setPdfUrl("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Type Specific Fields */}
      {kind === "listening" && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2"><Music className="h-5 w-5 text-primary" /><h3 className="font-bold">Listening Audio</h3></div>
          <div className="flex gap-3 items-center flex-wrap">
            <label className="cursor-pointer">
              <input type="file" accept="audio/*" hidden disabled={audioBusy} onChange={(e) => e.target.files?.[0] && onAudioUpload(e.target.files[0])} />
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/40 hover:bg-primary/5 transition-smooth">
                {audioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Audio yuklash
              </span>
            </label>
            <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="yoki URL kiriting" className="flex-1" />
          </div>
          {audioUrl && <audio controls src={audioUrl} className="w-full mt-2" />}
        </Card>
      )}

      {/* Sections Management */}
      <Tabs defaultValue="manual">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual"><FileText className="h-4 w-4 mr-2" />Qo'lda kiritish</TabsTrigger>
          <TabsTrigger value="ai"><Wand2 className="h-4 w-4 mr-2" />AI orqali ajratish</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-3">
          <Card className="p-6 space-y-3 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border-violet-500/30">
            <Tabs defaultValue="text-ai">
              <TabsList className="grid w-full grid-cols-2 mb-3 bg-violet-500/10">
                <TabsTrigger value="text-ai" className="text-xs">Matn va Rasm orqali</TabsTrigger>
                <TabsTrigger value="pdf-ai" className="text-xs">PDF hujjat orqali</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text-ai" className="space-y-3">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" /><h3 className="font-bold">AI Matn Tahlili</h3></div>
                <p className="text-sm text-muted-foreground">Test matnini, savollarini va kalitini joylang.</p>
                <Textarea rows={10} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Passage + Questions + Answers..." />
                <div className="flex items-center gap-2">
                  <Button onClick={onParseAi} disabled={aiBusy} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20">
                    {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    AI bilan ajratish
                  </Button>
                  <input type="file" id="ai-images" multiple accept="image/*" className="hidden" onChange={onImageSelect} />
                  <Button variant="outline" size="icon" onClick={() => document.getElementById('ai-images')?.click()} title="Rasm yuklash">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded-md overflow-hidden border bg-muted">
                        <img src={src} className="w-full h-full object-cover" alt="Preview" />
                        <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf-ai" className="space-y-3">
                <div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-500" /><h3 className="font-bold">AI PDF Tahlili</h3></div>
                <p className="text-sm text-muted-foreground">PDF variantni yuklang, AI savollar, variantlar, to'g'ri javoblar va LaTeX yechimlarini tahlil qilib avtomatik to'ldiradi.</p>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-violet-500/30 rounded-xl p-8 bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                  <input type="file" id="ai-pdf-file" accept="application/pdf" className="hidden" onChange={(e) => {
                    if (e.target.files?.[0]) {
                      onParsePdfAi(e.target.files[0]);
                    }
                  }} />
                  <Button onClick={() => document.getElementById('ai-pdf-file')?.click()} disabled={aiBusy} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20">
                    {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    PDF yuklash va tahlil qilish
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Faqat .pdf formatdagi fayllar qabul qilinadi</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          {sections.map((s, si) => (
            <Card key={si} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary">{kind === "reading" ? `Passage ${si + 1}` : kind === "speaking" ? `Part ${si + 1}` : `Section ${si + 1}`}</Badge>
                {sections.length > 1 && <Button size="sm" variant="ghost" onClick={() => rmS(si)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
              
              <div className="grid gap-3">
                <Input placeholder="Sarlavha (masalan: Task 1 yoki Passage Title)" value={s.title} onChange={(e) => updS(si, { title: e.target.value })} />
                <Input placeholder="Rasm URL (Map/Diagram)" value={s.imageUrl} onChange={(e) => updS(si, { imageUrl: e.target.value })} />
                {(kind === "reading" || kind === "writing" || kind === "speaking") && (
                   <div className="space-y-1.5">
                     <Label className="text-xs">
                        {kind === "reading" ? "Passage Matni" : kind === "writing" ? "Task Prompt / Essay Topic" : "Speaking Topic / Cue Card"}
                     </Label>
                     <Textarea rows={kind === "reading" ? 12 : 6} placeholder="Matnni kiriting..." value={s.passage} onChange={(e) => updS(si, { passage: e.target.value })} />
                   </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Savollar ({s.questions.length})</p>
                  <Button size="sm" variant="outline" onClick={() => addQ(si)}><Plus className="h-3 w-3 mr-1" />Savol qo'shish</Button>
                </div>
                {s.questions.map((q, qi) => (
                  <Card key={qi} className="p-3 space-y-2 bg-muted/20 border-dashed">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold mt-2 w-6">#{qi + 1}</span>
                      <div className="flex-1 space-y-2">
                        <Textarea rows={2} placeholder="Savol matni..." className="text-sm" value={q.prompt} onChange={(e) => updQ(si, qi, { prompt: e.target.value })} />
                        <Textarea rows={2} placeholder="Yechim tushuntirishi (LaTeX formulalarini yozish uchun $...$ va $$...$$ dan foydalaning)..." className="text-sm border-violet-500/20" value={q.explanation || ""} onChange={(e) => updQ(si, qi, { explanation: e.target.value })} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" hidden onChange={async (e) => {
                               if (e.target.files?.[0]) {
                                   const url = await uploadSingleImage(e.target.files[0]);
                                   if (url) updQ(si, qi, { imageUrl: url });
                               }
                            }} />
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs pointer-events-none" asChild>
                              <span><ImageIcon className="h-3 w-3 mr-1" />Savol rasmi</span>
                            </Button>
                          </label>
                          {q.imageUrl && (
                             <Select value={q.imagePosition || "top"} onValueChange={(v: any) => updQ(si, qi, { imagePosition: v })}>
                               <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="top">Tepa</SelectItem>
                                 <SelectItem value="bottom">Past</SelectItem>
                                 <SelectItem value="left">Chap</SelectItem>
                                 <SelectItem value="right">O'ng</SelectItem>
                               </SelectContent>
                             </Select>
                          )}
                          {q.imageUrl && <Button variant="ghost" size="sm" className="h-8 text-rose-500" onClick={() => updQ(si, qi, { imageUrl: "" })}><X className="h-3 w-3" /></Button>}
                        </div>
                        {q.imageUrl && <img src={q.imageUrl} alt="preview" className="max-h-64 w-auto object-contain rounded border mt-2" />}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => rmQ(si, qi)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-2 pl-8">
                      <Select value={q.qtype} onValueChange={(v: any) => updQ(si, qi, { qtype: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="tfng">True/False/NG</SelectItem>
                          <SelectItem value="ynng">Yes/No/NG</SelectItem>
                          <SelectItem value="fill">Fill the blank</SelectItem>
                          <SelectItem value="short">Short answer</SelectItem>
                          <SelectItem value="matching">Matching</SelectItem>
                          <SelectItem value="headings">List of Headings</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end">
                         <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                             const opts = [...(q.options || []), { text: `Option ${(q.options || []).length + 1}`, isCorrect: false }];
                             updQ(si, qi, { options: opts });
                         }}><Plus className="h-3 w-3 mr-1" />Variant qo'shish</Button>
                      </div>
                    </div>
                    
                    <div className="pl-8 space-y-2 mt-2">
                       {(q.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-start gap-2">
                             <Button size="icon" variant={opt.isCorrect ? "default" : "outline"} className={`h-8 w-8 shrink-0 ${opt.isCorrect ? "bg-purple-500 hover:bg-purple-600" : ""}`} onClick={() => {
                                 const newOpts = [...q.options];
                                 if (q.qtype === "mcq") {
                                     newOpts.forEach((o, i) => newOpts[i] = { ...o, isCorrect: false });
                                 }
                                 newOpts[oi] = { ...newOpts[oi], isCorrect: !q.options[oi].isCorrect };
                                 updQ(si, qi, { options: newOpts });
                             }}>
                               {opt.isCorrect ? "✅" : "❌"}
                             </Button>
                             <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input className="h-8 text-xs flex-1" placeholder="Variant matni..." value={opt.text} onChange={(e) => {
                                      const newOpts = [...q.options];
                                      newOpts[oi] = { ...newOpts[oi], text: e.target.value };
                                      updQ(si, qi, { options: newOpts });
                                  }} />
                                  <label className="cursor-pointer shrink-0">
                                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                                       if (e.target.files?.[0]) {
                                           const url = await uploadSingleImage(e.target.files[0]);
                                           if (url) {
                                              const newOpts = [...q.options];
                                              newOpts[oi] = { ...newOpts[oi], imageUrl: url };
                                              updQ(si, qi, { options: newOpts });
                                           }
                                       }
                                    }} />
                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 pointer-events-none" asChild>
                                      <span><ImageIcon className="h-3 w-3" /></span>
                                    </Button>
                                  </label>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => {
                                      const newOpts = q.options.filter((_, i) => i !== oi);
                                      updQ(si, qi, { options: newOpts });
                                  }}><X className="h-4 w-4" /></Button>
                                </div>
                                {opt.imageUrl && (
                                   <div className="flex items-center gap-2">
                                     <img src={opt.imageUrl} alt="preview" className="h-12 object-contain rounded border" />
                                     <Select value={opt.imagePosition || "left"} onValueChange={(v: any) => {
                                         const newOpts = [...q.options];
                                         newOpts[oi] = { ...newOpts[oi], imagePosition: v };
                                         updQ(si, qi, { options: newOpts });
                                     }}>
                                       <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                                       <SelectContent>
                                         <SelectItem value="top">Tepa</SelectItem>
                                         <SelectItem value="bottom">Past</SelectItem>
                                         <SelectItem value="left">Chap</SelectItem>
                                         <SelectItem value="right">O'ng</SelectItem>
                                       </SelectContent>
                                     </Select>
                                     <Button variant="ghost" size="sm" className="h-8 text-rose-500" onClick={() => {
                                         const newOpts = [...q.options];
                                         newOpts[oi] = { ...newOpts[oi], imageUrl: "" };
                                         updQ(si, qi, { options: newOpts });
                                     }}><Trash2 className="h-3 w-3" /></Button>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))}
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={() => addQ(si)} className="w-full mt-2 border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Yangi savol qo'shish
                </Button>
              </div>
            </Card>
          ))}
          <Button variant="outline" onClick={addS} className="w-full border-dashed border-2 py-8 text-lg">
            <Plus className="h-4 w-4 mr-2" />{kind === "reading" ? "Yangi passage qo'shish" : kind === "speaking" ? "Yangi part qo'shish" : "Yangi bo'lim qo'shish"}
          </Button>
        </TabsContent>
      </Tabs>

      <Card className="p-4 flex items-center justify-between sticky bottom-4 z-30 shadow-elegant bg-background/95 backdrop-blur border-primary/20">
        <p className="text-sm text-muted-foreground font-medium">
          {sections.length} bo'lim · {totalQuestions} savol
        </p>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => nav(-1)} disabled={saving}>Bekor qilish</Button>
          <Button size="lg" onClick={save} disabled={saving || !title.trim()} className="bg-gradient-primary shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? "Saqlash" : "Test yaratish"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

