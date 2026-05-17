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

interface Q {
  prompt: string;
  qtype: "mcq" | "tfng" | "ynng" | "fill" | "short" | "matching" | "headings";
  options: string;
  correct_answer: string;
  points: number;
  explanation?: string;
}
interface Section { title: string; passage: string; questions: Q[]; }

const newQ = (): Q => ({ prompt: "", qtype: "mcq", options: "A,B,C,D", correct_answer: "", points: 1 });
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
  const [aiBusy, setAiBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

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
        setAudioUrl(t.audioUrl ?? "");
        setDuration(t.durationMinutes ?? 60);
        setDifficulty(t.difficulty?.toLowerCase() || "medium");
        // partType and requiredPack might not be in Java DTO yet, but we'll keep the state
        // setIsPublished(t.isActive ?? true);

        const isExam = ["reading", "listening", "sat", "national_cert"].includes(t.type?.toLowerCase());
        
        if (isExam && t.passages) {
            const built: Section[] = t.passages.map((p: any) => ({
                title: p.title || "",
                passage: p.content || "",
                questions: p.questions?.length ? p.questions.map((q: any) => ({
                    prompt: q.text || "",
                    qtype: q.questionType || "short",
                    options: Array.isArray(q.options) ? q.options.map((o: any) => o.text).join(", ") : "",
                    correct_answer: q.correctAnswer || "",
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
          questions: (s.questions ?? []).filter((q: any) => q.prompt).map((q: any) => ({
            prompt: q.prompt ?? "",
            qtype: ["mcq", "tfng", "ynng", "fill", "short", "matching", "headings"].includes(q.qtype) ? q.qtype : "short",
            options: Array.isArray(q.options) ? q.options.join(", ") : "",
            correct_answer: q.correct_answer ?? "",
            points: q.points ?? 1,
            explanation: q.explanation ?? "",
          })),
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
        duration_minutes: duration,
        passing_score: 50,
        difficulty: difficulty.toUpperCase(),
        sections: sections.filter(s => s.title.trim() || s.passage.trim() || s.questions.length > 0).map(s => ({
            title: s.title || "Section",
            passage: s.passage || "",
            image_url: s.imageUrl || null,
            questions: s.questions.filter(q => q.prompt && q.prompt.trim() !== "").map(q => ({
                prompt: q.prompt,
                qtype: q.qtype,
                options: q.options ? q.options.split(",").map(o => o.trim()).filter(Boolean) : [],
                correct_answer: q.correct_answer || "",
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
    <div className="max-w-5xl mx-auto space-y-5">
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
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" /><h3 className="font-bold">AI Tahlil</h3></div>
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
                      <Textarea rows={2} placeholder="Savol matni..." className="flex-1 text-sm" value={q.prompt} onChange={(e) => updQ(si, qi, { prompt: e.target.value })} />
                      <Button size="sm" variant="ghost" onClick={() => rmQ(si, qi)}><Trash2 className="h-3 w-3" /></Button>
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
                      <Input className="h-8 text-xs" placeholder="To'g'ri javob" value={q.correct_answer} onChange={(e) => updQ(si, qi, { correct_answer: e.target.value })} />
                    </div>
                    {(q.qtype === "mcq" || q.qtype === "matching" || q.qtype === "headings") && (
                      <Input className="ml-8 h-8 text-xs" placeholder="Variantlar (vergul bilan): A, B, C, D" value={q.options} onChange={(e) => updQ(si, qi, { options: e.target.value })} />
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          ))}
          <Button variant="outline" onClick={addS} className="w-full border-dashed border-2">
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
