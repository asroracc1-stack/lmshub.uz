import re

with open('src/pages/shared/MockTake.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ExamResultDashboard and confetti imports
if "import { ExamResultDashboard }" not in content:
    content = content.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { ExamResultDashboard } from "@/components/exam/ExamResultDashboard";\nimport confetti from "canvas-confetti";')

# 2. Add timeSpent state and effect
state_marker = "const [answers, setAnswers] = useState<Record<string, string>>({});"
if "const [timeSpent" not in content and state_marker in content:
    content = content.replace(state_marker, "const [answers, setAnswers] = useState<Record<string, string>>({});\n  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});\n  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);")

# 3. Add timer effect to track time per question
timer_effect_str = "  // Dynamic Timer\n  useEffect(() => {"
new_timer_effect = """  // Time spent tracker
  useEffect(() => {
    if (!hasStarted || isPaused || result || showSuccessAnimation) return;
    const currentQ = questions[activeQuestionIndex];
    if (!currentQ) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, isPaused, result, activeQuestionIndex, questions, showSuccessAnimation]);

  // Dynamic Timer
  useEffect(() => {"""
if "Time spent tracker" not in content and timer_effect_str in content:
    content = content.replace(timer_effect_str, new_timer_effect)

# 4. Modify handleSubmitRequest
submit_fn_start = "const handleSubmitRequest = async () => {"
submit_fn_old = """  const handleSubmitRequest = async () => {
    if (!window.confirm("Haqiqatan ham imtihonni yakunlamoqchimisiz?")) return;
    
    try {
      setIsSubmitting(true);
      const res = await api.post(`/exam/submit`, {
        exam_id: exam.id,
        answers
      });
      setResult(res.data);
      window.scrollTo(0,0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };"""
  
submit_fn_new = """  const handleSubmitRequest = async () => {
    if (!window.confirm("Haqiqatan ham imtihonni yakunlamoqchimisiz?")) return;
    
    try {
      setIsSubmitting(true);
      setShowSuccessAnimation(true);
      window.scrollTo(0,0);

      // Play Audio
      const audio = new Audio("https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3");
      audio.volume = 0.6;
      audio.play().catch(()=>console.log("Audio play blocked by browser"));

      // Trigger Confetti
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
        });
      }, 1500);
      
      const res = await api.post(`/exam/submit`, {
        exam_id: exam.id,
        answers,
        time_spent: timeSpent
      });
      
      // Wait for animation
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setResult(res.data);
      }, 4000);
      
    } catch (err: any) {
      setShowSuccessAnimation(false);
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };"""

if submit_fn_start in content:
    # Need to regex or strict replace. Since I have exact old string, I'll try exact replace first.
    if submit_fn_old in content:
        content = content.replace(submit_fn_old, submit_fn_new)
    else:
        print("Could not find exact submit function, will need regex.")
        # Regex replacement for submit
        content = re.sub(r'const handleSubmitRequest = async \(\) => \{[\s\S]*?\n  \};', submit_fn_new, content, count=1)


# 5. Modify the Return Result block
# In MockTake.tsx, if (result) return <ExamResultDashboard ... />

# Let's find "if (result) {"
if "if (result) {" in content:
    # replace everything from "if (result) {" to the next "if (!hasStarted) {"
    pattern = r'if \(result\) \{[\s\S]*?if \(!hasStarted\) \{'
    replacement = """if (showSuccessAnimation) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
        <dotlottie-wc src="https://lottie.host/52a57e71-839c-47e3-8d85-813ad8949eed/Zf3wrO3gZ7.lottie" style={{ width: 400, height: 400 }} autoplay loop></dotlottie-wc>
        <h2 className="text-3xl font-black text-white mt-8 animate-pulse tracking-widest">SUBMITTING EXAM...</h2>
        <p className="text-slate-400 mt-2 font-medium">Please wait while your score is calculated</p>
      </div>
    );
  }

  if (result) {
    return (
      <ExamResultDashboard 
        result={result} 
        questions={questions} 
        onRestart={() => {
           setResult(null);
           setHasStarted(false);
           setAnswers({});
           setTimeSpent({});
           setFlagged(new Set());
           setActiveQuestionIndex(0);
           setTimeLeft(exam.durationMinutes * 60);
        }} 
      />
    );
  }

  if (!hasStarted) {"""
    content = re.sub(pattern, replacement, content, count=1)

with open('src/pages/shared/MockTake.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("MockTake updated successfully.")
