import re

with open('src/components/exam/ExamResultDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the icons import to include ShieldAlert, ShieldCheck
content = re.sub(r'CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, LineChart, FastForward, Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight', 
                 'CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, LineChart, FastForward, Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight, ShieldAlert, ShieldCheck, History', content)

# 2. Add the Integrity Report JSX section
integrity_jsx = """
        {/* EXAM INTEGRITY REPORT */}
        <div className="p-8 border-b border-slate-300 bg-slate-50 dark:bg-black/40">
          <h2 className="text-xl font-serif text-[#0f2c59] dark:text-slate-100 uppercase tracking-widest border-b-2 border-[#0f2c59] dark:border-slate-700 pb-2 mb-6 flex items-center gap-2">
            {result.autoSubmitted || (result.violations && result.violations.length > 0) ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            Exam Integrity Report
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 font-sans text-sm">
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                 <span className="text-slate-500 uppercase tracking-wider font-bold">Integrity Status</span>
                 <span className={cn("font-bold", result.autoSubmitted ? "text-red-600" : (result.violations && result.violations.length > 0 ? "text-amber-600" : "text-emerald-600"))}>
                   {result.autoSubmitted ? "Auto Submitted (Violation)" : (result.violations && result.violations.length > 0 ? "Warning Issued" : "Clean Record")}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                 <span className="text-slate-500 uppercase tracking-wider font-bold">Auto Submitted</span>
                 <span className="font-bold text-slate-800 dark:text-slate-200">
                   {result.autoSubmitted ? "Yes" : "No"}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                 <span className="text-slate-500 uppercase tracking-wider font-bold">Warnings Count</span>
                 <span className="font-bold text-slate-800 dark:text-slate-200">
                   {result.violations ? result.violations.length : 0}
                 </span>
               </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-slate-800 p-4 font-sans">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <History className="w-4 h-4" /> Violation Timeline
               </p>
               {result.violations && result.violations.length > 0 ? (
                 <div className="space-y-3">
                   {result.violations.map((v: any, i: number) => {
                      const date = new Date(v.timestamp);
                      const timeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') + ':' + date.getSeconds().toString().padStart(2, '0');
                      return (
                        <div key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 items-start">
                          <span className="text-red-500 font-mono font-bold whitespace-nowrap">{timeStr}</span>
                          <span>-</span>
                          <span className="font-semibold">{v.violationType}</span>
                        </div>
                      );
                   })}
                 </div>
               ) : (
                 <div className="flex items-center gap-2 text-emerald-600 text-sm mt-4">
                   <CheckCircle2 className="w-4 h-4" /> No violations recorded.
                 </div>
               )}
            </div>
          </div>
        </div>
"""

content = re.sub(r'        \{/\* TOPIC ANALYTICS \*/\}', integrity_jsx + '\n        {/* TOPIC ANALYTICS */}', content)

with open('src/components/exam/ExamResultDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("ExamResultDashboard updated successfully!")
