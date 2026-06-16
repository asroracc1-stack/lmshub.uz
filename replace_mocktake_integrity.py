import re

with open('src/pages/shared/MockTake.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_vars = """  const [selectedSection, setSelectedSection] = useState(0);
  const [violations, setViolations] = useState<{violationType: string, timestamp: string, details: string}[]>([]);
  const [showViolationModal, setShowViolationModal] = useState<{show: boolean, count: number, reason: string}>({show: false, count: 0, reason: ''});
  const [examLocked, setExamLocked] = useState<{locked: boolean, reason: string}>({locked: false, reason: ''});
  const isSubmittingRef = useRef(false);"""
content = re.sub(r'  const \[selectedSection, setSelectedSection\] = useState\(0\);', state_vars, content)

# 2. Add useEffect for focus/visibility tracking
tracking_effect = """
  // ================= EXAM INTEGRITY SYSTEM =================
  useEffect(() => {
    if (status !== "playing" || isSubmittingRef.current || examLocked.locked) return;

    const handleViolation = (reason: string) => {
      setViolations(prev => {
        const currentCount = prev.length + 1;
        const newViolations = [...prev, {
          violationType: reason,
          timestamp: new Date().toISOString(),
          details: reason
        }];

        if (currentCount >= 3) {
           setExamLocked({locked: true, reason: 'Multiple attempts to leave the examination environment.'});
           // Auto submit
           setTimeout(() => autoSubmitExam(newViolations), 500);
           return newViolations;
        }

        setShowViolationModal({
          show: true,
          count: currentCount,
          reason: reason
        });
        return newViolations;
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation('Browser Tab Changed / Minimized');
    };

    const onBlur = () => {
      // Small delay to ensure it's a real blur
      setTimeout(() => {
        if (!document.hasFocus()) handleViolation('Window Lost Focus');
      }, 200);
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('Exited Fullscreen Mode');
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    // Initial fullscreen request if not already
    const requestFs = async () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
           await document.documentElement.requestFullscreen();
        } catch(e) {
           console.log("Fullscreen request denied initially");
        }
      }
    };
    requestFs();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [status, examLocked.locked]);

  const autoSubmitExam = async (finalViolations: any[]) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null,
        violations: finalViolations,
        auto_submitted: true
      };
      const res = await api.post("/exams/submit", payload);
      if (document.fullscreenElement) {
         try { await document.exitFullscreen(); } catch(e){}
      }
      setTimeout(() => {
        window.location.href = `/student/exams/${exam.id}/result`;
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to auto-submit exam.");
    }
  };
"""

content = re.sub(r'  // 2\) Taimer mantig\'i', tracking_effect + '\n  // 2) Taimer mantig\'i', content)

# 3. Update the submit handler to include violations and set isSubmittingRef
submit_replacement = """  const handleExamSubmit = async () => {
    if (!exam) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null,
        violations: violations,
        auto_submitted: false
      };
      const res = await api.post("/exams/submit", payload);
"""
content = re.sub(r'  const handleExamSubmit = async \(\) => \{\n    if \(\!exam\) return;\n    try \{\n      const payload = \{[^}]+\};\n      const res = await api.post\("/exams/submit", payload\);', submit_replacement, content)

# 4. Inject Modal UI into the JSX
modals_jsx = """
      {/* EXAM INTEGRITY VIOLATION SCREEN */}
      {examLocked.locked && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-3xl font-serif text-[#0f2c59] dark:text-slate-100 mb-4">Exam Integrity Violation</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mb-8">
            Your exam has been automatically submitted.
          </p>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 p-6 rounded-lg text-left max-w-lg w-full">
             <p className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Reason:</p>
             <p className="text-red-700 dark:text-red-300 font-serif text-lg">{examLocked.reason}</p>
          </div>
          <p className="mt-8 text-slate-400 animate-pulse text-sm">Processing results...</p>
        </div>
      )}

      {/* WARNING MODAL */}
      <AlertDialog open={showViolationModal.show} onOpenChange={(open) => {
         if (!open) {
            setShowViolationModal(prev => ({...prev, show: false}));
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
               document.documentElement.requestFullscreen().catch(()=>console.log("Fs error"));
            }
         }
      }}>
        <AlertDialogContent className="bg-white border-2 border-[#0f2c59] rounded-none">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
               <AlertCircle className="w-8 h-8 text-red-600" />
               <AlertDialogTitle className="text-2xl font-serif text-[#0f2c59]">
                 {showViolationModal.count === 2 ? 'Final Warning' : 'Exam Security Warning'}
               </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-slate-700 font-sans space-y-4 pt-4 border-t border-slate-200">
              {showViolationModal.count === 2 ? (
                 <>
                   <p className="font-bold text-red-600">You have left the examination environment again.</p>
                   <p>One more violation will automatically submit your exam.</p>
                 </>
              ) : (
                 <>
                   <p>You have left the examination window.</p>
                   <p>This activity has been recorded.</p>
                 </>
              )}
              
              <div className="bg-slate-100 p-4 border border-slate-300">
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Violation Details</p>
                 <p className="text-slate-800">{showViolationModal.reason}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4 text-orange-800 font-bold flex justify-between items-center">
                 <span>Remaining warnings:</span>
                 <span className="text-2xl">{3 - showViolationModal.count}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 border-t border-slate-200 pt-4">
            <Button onClick={() => setShowViolationModal(prev => ({...prev, show: false}))} className="bg-[#0f2c59] hover:bg-[#1a365d] text-white rounded-none px-8 font-bold tracking-wider uppercase">
              I Understand, Return to Exam
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
"""

content = re.sub(r'\{/\* Start Screen \*/\}', modals_jsx + '\n      {/* Start Screen */}', content)

# 5. Fix any missing imports like XCircle if it doesn't exist. It should exist from lucide-react.
# In MockTake.tsx, XCircle might be missing. Let's add it.
content = re.sub(r'X, PenLine', 'X, PenLine, XCircle', content)

with open('src/pages/shared/MockTake.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("MockTake.tsx updated successfully!")
