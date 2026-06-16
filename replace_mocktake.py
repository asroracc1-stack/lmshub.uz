import re

with open('src/pages/shared/MockTake.tsx.bak', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the MockTake component
split_idx = content.find('export default function MockTake() {')
if split_idx == -1:
    print("Could not find MockTake function")
    exit(1)

# Keep everything before the component
header = content[:split_idx]

# Add missing imports if needed
if "import confetti" not in header:
    header = header.replace('import { ExamResultDashboard } from "@/components/exam/ExamResultDashboard";', 'import { ExamResultDashboard } from "@/components/exam/ExamResultDashboard";\nimport confetti from "canvas-confetti";')

# New MockTake component
new_component = """export default function MockTake() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const { testId } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get("review") === "true";

  const [exam, setExam] = useState<ExamData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [sections, setSections] = useState<{ title: string; passage: string; imageUrl: string }[]>([]);
  const [questions, setQuestions] = useState<NormalQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [writingAnswer, setWritingAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [grading, setGrading] = useState(false);
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const startedAt = useRef<number>(0);
  const questionStartRef = useRef<Record<string, number>>({});
  const timeSpentRef = useRef<Record<string, number>>({}); 

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      started && !result && !showSuccessAnimation && currentLocation.pathname !== nextLocation.pathname
  );

  useBeforeUnload(
    (event) => {
      if (started && !result && !showSuccessAnimation) {
        event.preventDefault();
        return (event.returnValue = "Test davom etmoqda. Chiqmoqchimisiz?");
      }
    },
    { capture: true }
  );

  useEffect(() => {
    if (started && !result) {
      document.body.classList.add("exam-mode");
      return () => document.body.classList.remove("exam-mode");
    }
  }, [started, result]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    setLoadError(null);
    api.get<ExamData>(`/admin/exams/${testId}?t=${Date.now()}`)
      .then((res) => {
        const data = res.data;
        setExam(data);
        const { sections: s, questions: q } = normalize(data);
        setSections(s);
        setQuestions(q);
        setTimeLeft((data.duration_minutes ?? 60) * 60);
        
        try {
          const saved = localStorage.getItem(`lmshub_exam_${testId}`);
          if (saved) {
            setAnswers(JSON.parse(saved));
            toast.info("Oldingi javoblaringiz tiklandi", { duration: 3000 });
          }
        } catch { /* ignore */ }
        
        if (isReviewMode) {
          api.get(`/student/exams/${testId}/result`)
            .then((resResult) => {
              setResult(resResult.data);
              setStarted(true); 
            })
            .catch(() => toast.error("Natijani yuklashda xatolik yuz berdi"));
        }
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? err?.message ?? "Exam yuklanmadi");
      })
      .finally(() => setLoading(false));
  }, [testId, isReviewMode]);

  // Keyboard Shortcuts (A, B, C, D, Left, Right)
  useEffect(() => {
    if (!started || result || showReviewScreen || showSuccessAnimation) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      
      const currentQ = questions[activeQuestionIndex];
      if (!currentQ) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setActiveQuestionIndex(i => Math.min(i + 1, questions.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setActiveQuestionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "f" || e.key === "F") {
        toggleFlag(currentQ.id);
      } else if (currentQ.qtype === 'mcq' && currentQ.options && currentQ.options.length > 0) {
         const key = e.key.toUpperCase();
         const optIndex = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(key);
         if (optIndex !== -1 && optIndex < currentQ.options.length) {
            onAnswer(currentQ.id, currentQ.options[optIndex].text);
         }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, result, activeQuestionIndex, questions, showReviewScreen, showSuccessAnimation]);

  // Timer
  useEffect(() => {
    if (!started || result || isPaused || showSuccessAnimation) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); submit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, result, isPaused, showSuccessAnimation]);
  
  // Track Time Spent per question
  useEffect(() => {
    if (!started || isPaused || result || showSuccessAnimation) return;
    const currentQ = questions[activeQuestionIndex];
    if (!currentQ) return;
    const interval = setInterval(() => {
      timeSpentRef.current[currentQ.id] = (timeSpentRef.current[currentQ.id] || 0) + 1;
    }, 1000);
    return () => clearInterval(interval);
  }, [started, isPaused, result, activeQuestionIndex, questions, showSuccessAnimation]);

  const onAnswer = (qid: string, val: string) => {
    setAnswers((p) => {
      const next = { ...p, [qid]: val };
      try { localStorage.setItem(`lmshub_exam_${testId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleFlag = (qid: string) => setFlagged((p) => { const n = new Set(p); n.has(qid) ? n.delete(qid) : n.add(qid); return n; });

  const submit = async (auto = false) => {
    if (submitting || !exam) return;
    setSubmitting(true);
    setShowSuccessAnimation(true);
    window.scrollTo(0,0);

    // Audio Chime
    try {
      const audio = new Audio("https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3");
      audio.volume = 0.6;
      audio.play().catch(() => console.log("Audio play blocked by browser"));
    } catch(e){}

    // Confetti
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
      });
    }, 1000);

    try {
      const kind = (exam.type ?? "").toLowerCase();
      const elapsedSec = Math.floor((Date.now() - startedAt.current) / 1000);

      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null
      };

      const res = await api.post("/exams/submit", payload);
      try { localStorage.removeItem(`lmshub_exam_${testId}`); } catch { /* ignore */ }
      
      // Delay to show animation
      setTimeout(() => {
        setResult({ ...res.data, kind, elapsedSec, timeSpent: timeSpentRef.current });
        setShowSuccessAnimation(false);
      }, 4000);
      
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Natijani yuborishda xatolik: " + (err.response?.data?.message || err.message));
      setShowSuccessAnimation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = () => {
    setShowReviewScreen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0B1121]">
      <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Exam...</p>
    </div>
  );

  if (loadError || !exam) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0B1121] text-white">
      <AlertCircle className="h-12 w-12 text-rose-500" />
      <h2 className="text-2xl font-bold">Exam Not Found</h2>
      <p className="text-slate-400">{loadError}</p>
      <Button variant="outline" onClick={() => nav(-1)}>Go Back</Button>
    </div>
  );

  const kind = (exam.type ?? "").toLowerCase();

  if (showSuccessAnimation) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#070b19] flex flex-col items-center justify-center overflow-hidden">
        <dotlottie-wc src="https://lottie.host/52a57e71-839c-47e3-8d85-813ad8949eed/Zf3wrO3gZ7.lottie" style={{ width: 450, height: 450 }} autoplay loop></dotlottie-wc>
        <h2 className="text-4xl font-black text-white mt-8 tracking-widest uppercase" style={{ animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>Exam Completed</h2>
        <p className="text-slate-400 mt-4 font-bold uppercase tracking-widest text-sm">Uploading and analyzing your responses...</p>
      </div>
    );
  }

  if (result) {
    return <ExamResultDashboard result={result} questions={questions} exam={exam} />;
  }

  if (!started) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-[#070b19]">
        <div className="w-full max-w-3xl">
          <Card className="p-0 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-950 p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Official Test Environment</h1>
                  <p className="text-slate-400 text-sm">LMSHub Certification Platform</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">{exam.type}</Badge>
            </div>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{exam.title}</h2>
              {exam.description && <p className="text-slate-600 dark:text-slate-400">{exam.description}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold text-slate-500">Duration</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" /> {exam.duration_minutes} minutes
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold text-slate-500">Questions</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Flag className="h-5 w-5 text-blue-500" /> {questions.length} items
                  </span>
                </div>
              </div>
              <div className="p-5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-sm text-blue-800 dark:text-blue-300 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Exam Rules & Instructions</h3>
                <ul className="list-disc pl-5 space-y-1.5 opacity-90 font-medium">
                  <li>Do not switch tabs or minimize the browser window during the exam.</li>
                  <li>Ensure your internet connection is stable.</li>
                  <li>Use keyboard shortcuts (A, B, C, D) to select answers and Arrow Keys to navigate.</li>
                  <li>The exam will auto-submit when the timer reaches zero.</li>
                </ul>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-500/20" onClick={() => { setStarted(true); startedAt.current = Date.now(); }}>
                Start Exam <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const currentQuestion = questions[activeQuestionIndex];
  const isReading = kind === "reading";
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const flaggedCount = flagged.size;

  // REVIEW SCREEN
  if (showReviewScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-100 dark:bg-[#070b19] flex flex-col p-4 md:p-8">
        <Card className="w-full max-w-5xl mx-auto p-6 md:p-10 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Review Exam</h2>
              <p className="text-slate-500 text-sm mt-1 font-semibold">Review your answers before final submission.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-center px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                 <span className="block text-2xl font-black text-slate-900 dark:text-white">{answeredCount}</span>
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Answered</span>
               </div>
               <div className="text-center px-6 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                 <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{flaggedCount}</span>
                 <span className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Marked</span>
               </div>
               <div className="text-center px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                 <span className="block text-2xl font-black text-slate-900 dark:text-white">{questions.length - answeredCount}</span>
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unanswered</span>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4 mb-8">
            {questions.map((q, idx) => {
              const hasAns = !!answers[q.id];
              const isFlg = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveQuestionIndex(idx);
                    setShowReviewScreen(false);
                  }}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-lg font-black border-2 transition-all hover:scale-105",
                    hasAns && !isFlg ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : isFlg ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {q.position}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
            <Button variant="outline" size="lg" className="rounded-xl font-bold" onClick={() => setShowReviewScreen(false)}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Return to Exam
            </Button>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 rounded-xl text-lg h-14" onClick={() => submit(false)}>
              Submit Exam
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 🚀 EXAM COMMAND CENTER HEADER */}
      <header className={cn(
        "h-[80px] shrink-0 border-b flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300",
        theme === "dark" ? "bg-[#0B1121] border-slate-800 shadow-lg" : "bg-white border-slate-200 shadow-md"
      )}>
        <div className="flex items-center gap-5 w-1/3">
           <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
             <Shield className="h-7 w-7 text-white" />
           </div>
           <div>
             <h1 className="font-black text-lg md:text-xl leading-tight truncate text-slate-900 dark:text-white tracking-tight">{exam.title}</h1>
             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{exam.type} EXAMINATION</p>
           </div>
        </div>

        {/* TIMER */}
        <div className="w-1/3 flex justify-center">
          <div className={cn(
            "flex items-center justify-center gap-3 px-8 py-2.5 rounded-2xl font-mono text-3xl font-black tracking-[0.15em] transition-colors border-2 shadow-inner",
            timeLeft < 30 ? "bg-rose-600 text-white border-rose-500" :
            timeLeft < 60 ? "bg-rose-500 text-white border-rose-400" :
            timeLeft < 300 ? "bg-amber-500 text-white border-amber-400" :
            timeLeft < 900 ? "bg-yellow-500 text-white border-yellow-400" :
            "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700",
            timeLeft < 30 ? "animate-pulse shadow-[0_0_30px_rgba(225,29,72,0.5)]" : ""
          )}>
            {fmt(timeLeft)}
          </div>
        </div>

        <div className="w-1/3 flex items-center justify-end gap-6">
           <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider text-slate-500">
             <div className="flex flex-col items-end">
               <span className="text-emerald-500 text-lg">{answeredCount}</span>
               <span className="text-[9px]">Answered</span>
             </div>
             <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
             <div className="flex flex-col items-center">
               <span className="text-amber-500 text-lg">{flaggedCount}</span>
               <span className="text-[9px]">Flagged</span>
             </div>
             <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
             <div className="flex flex-col items-start">
               <span className="text-slate-400 text-lg">{questions.length - answeredCount}</span>
               <span className="text-[9px]">Remaining</span>
             </div>
           </div>
           
           <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-2" />
           <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={toggleFullscreen}>
             {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowCalculator(!showCalculator)}>
             <Calculator className="h-6 w-6" />
           </Button>
           <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 h-12 text-sm uppercase tracking-wider" onClick={handleSubmitRequest}>
             Finish
           </Button>
        </div>
      </header>

      {/* 🧩 QUESTION & PASSAGE AREA */}
      <main className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#070b19]">
        {/* PASSAGE (if Reading) */}
        {isReading && sections[currentQuestion?.section_index] && (sections[currentQuestion?.section_index].passage || sections[currentQuestion?.section_index].imageUrl) && (
          <div className="w-1/2 h-full overflow-y-auto border-r border-slate-200 dark:border-slate-800 p-8 xl:p-12">
            <h2 className="text-2xl font-black mb-6 dark:text-white text-slate-900">{sections[currentQuestion.section_index].title}</h2>
            {sections[currentQuestion.section_index].imageUrl && (
              <img src={getFullImageUrl(sections[currentQuestion.section_index].imageUrl)} className="max-w-full rounded-2xl mb-6 shadow-md" />
            )}
            <div className="prose dark:prose-invert prose-lg max-w-none text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
              {sections[currentQuestion.section_index].passage}
            </div>
          </div>
        )}

        {/* QUESTION AREA (ONLY ONE QUESTION) */}
        <div className={cn("h-full overflow-y-auto flex flex-col items-center p-8 xl:p-12 relative", isReading ? "w-1/2" : "w-full max-w-4xl mx-auto")}>
          
          <div className="w-full max-w-3xl flex-1 flex flex-col mt-10">
            {currentQuestion && (
              <motion.div 
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-10"
              >
                {/* QUESTION HEADER */}
                <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-2xl font-black text-white dark:text-slate-900 shadow-md">
                      {currentQuestion.position}
                    </div>
                    <Badge variant="outline" className="text-xs uppercase font-extrabold px-3 py-1 border-slate-300 dark:border-slate-700 text-slate-500">
                      {currentQuestion.qtype}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className={cn("rounded-xl font-bold transition-colors border-2", flagged.has(currentQuestion.id) ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10" : "border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600")}
                    onClick={() => toggleFlag(currentQuestion.id)}
                  >
                    <Flag className={cn("w-5 h-5 mr-2", flagged.has(currentQuestion.id) ? "fill-current" : "")} /> 
                    {flagged.has(currentQuestion.id) ? "Marked for Review" : "Mark for Review"}
                  </Button>
                </div>

                {/* PROMPT */}
                <div className="text-2xl md:text-3xl font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                  {currentQuestion.prompt}
                </div>

                {/* MEDIA */}
                {currentQuestion.imageUrl && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" />
                )}

                {/* OPTIONS */}
                {currentQuestion.options && currentQuestion.options.length > 0 ? (
                  <div className="space-y-4">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestion.id] === opt.text;
                      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onAnswer(currentQuestion.id, opt.text)}
                          className={cn(
                            "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group relative overflow-hidden",
                            isSelected 
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-[0_8px_30px_rgba(99,102,241,0.15)]" 
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1121] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <div className={cn(
                            "h-12 w-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-colors shrink-0",
                            isSelected 
                              ? "border-indigo-500 bg-indigo-500 text-white" 
                              : "border-slate-300 dark:border-slate-600 text-slate-500 group-hover:border-indigo-400 group-hover:text-indigo-500"
                          )}>
                            {labels[oIdx]}
                          </div>
                          <div className="flex-1">
                            {opt.imageUrl && <img src={getFullImageUrl(opt.imageUrl)} className="h-16 object-contain mb-3" />}
                            <span className={cn("text-xl font-medium", isSelected ? "text-indigo-900 dark:text-indigo-100 font-bold" : "text-slate-700 dark:text-slate-300")}>
                              {opt.text}
                            </span>
                          </div>
                          
                          {/* Inner Radio Indicator */}
                          <div className={cn(
                            "absolute right-6 h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center",
                            isSelected ? "border-indigo-500" : "border-slate-300 dark:border-slate-600 opacity-0 group-hover:opacity-100"
                          )}>
                            {isSelected && <div className="h-3 w-3 bg-indigo-500 rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full">
                    <Textarea 
                      rows={6} 
                      className="w-full p-6 text-xl rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:bg-[#0B1121] resize-none"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* 🧭 PROFESSIONAL EXAM NAVIGATOR */}
      <footer className="h-[90px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] px-8 flex items-center justify-between shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        
        <div className="flex items-center gap-6">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
            disabled={activeQuestionIndex === 0}
            className="h-14 px-8 rounded-2xl border-2 font-bold text-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-6 h-6 mr-3" /> Previous
          </Button>
        </div>

        {/* Central Bubble Navigator */}
        <div className="flex-1 max-w-3xl mx-8 overflow-x-auto py-2 hide-scrollbar flex items-center justify-center gap-2.5">
          {questions.map((q, idx) => {
            const isCurrent = idx === activeQuestionIndex;
            const hasAns = !!answers[q.id];
            const isFlg = flagged.has(q.id);
            
            return (
              <button
                key={q.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-black text-sm transition-all border-2",
                  isCurrent 
                    ? "border-purple-600 bg-purple-600 text-white scale-110 shadow-lg shadow-purple-500/30 z-10"
                    : hasAns 
                      ? isFlg ? "border-amber-500 bg-amber-500 text-white" : "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : isFlg ? "border-amber-500 text-amber-500" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1121] text-slate-500 hover:border-slate-400"
                )}
              >
                {q.position}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-6">
          <Button 
            size="lg" 
            onClick={() => {
              if (activeQuestionIndex === questions.length - 1) {
                handleSubmitRequest();
              } else {
                setActiveQuestionIndex(Math.min(questions.length - 1, activeQuestionIndex + 1));
              }
            }}
            className="h-14 px-8 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            {activeQuestionIndex === questions.length - 1 ? "Review" : "Next"} <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
        </div>

      </footer>

      <AnimatePresence>
        {showScratchpad && <Scratchpad onClose={() => setShowScratchpad(false)} />}
        {showCalculator && <div className="fixed bottom-24 left-8 z-[100] shadow-2xl rounded-xl overflow-hidden border border-slate-700"><DesmosCalculator /></div>}
      </AnimatePresence>
    </div>
  );
}
"""

with open('src/pages/shared/MockTake.tsx', 'w', encoding='utf-8') as f:
    f.write(header + new_component)

print("MockTake.tsx generated successfully.")
