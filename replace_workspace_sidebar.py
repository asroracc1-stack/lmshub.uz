import re

with open('src/pages/shared/MockTake.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire <main> block
start_marker = "      {/* EXAM WORKSPACE */}\n      <main className=\"flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row h-[calc(100vh-72px)] overflow-hidden relative\">"
end_marker = "      {/* ⚠️ NAVIGATION GUARD ALERT */}"

new_code = """      {/* EXAM WORKSPACE */}
      <main className="flex-1 w-full flex flex-col xl:flex-row h-[calc(100vh-72px)] overflow-hidden relative">
        
        {/* PASSAGE PANEL (For Reading/PDF) */}
        {showPassage && (
          <div className="w-full xl:w-5/12 h-[40vh] xl:h-full border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1021] flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
               <span className="font-bold text-sm uppercase tracking-wider text-slate-500">Passage Material</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
              {currentSection.imageUrl && (
                <img src={getFullImageUrl(currentSection.imageUrl)} alt="Reference" className="max-w-full rounded-xl border border-slate-200 dark:border-slate-700 mb-6" />
              )}
              {currentSection.passage && (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 text-base md:text-lg leading-loose whitespace-pre-wrap font-medium">
                  {currentSection.passage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTION PANEL */}
        <div className={cn(
          "flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#070b19]",
          showPassage ? "w-full xl:flex-1" : "w-full xl:flex-1 max-w-5xl mx-auto"
        )}>
          {currentQuestion ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar flex flex-col">
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-blue-600 text-white font-black text-lg flex items-center justify-center rounded-lg shadow-md">
                     {currentQuestion.position}
                   </div>
                   <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">Question {currentQuestion.position} of {questions.length}</span>
                 </div>
                 <Button 
                   variant="outline" 
                   className={cn("h-10 gap-2 font-bold transition-colors", flagged.has(currentQuestion.id) ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30" : "")}
                   onClick={() => toggleFlag(currentQuestion.id)}
                 >
                   <Flag className={cn("h-4 w-4", flagged.has(currentQuestion.id) && "fill-current")} /> 
                   Mark for Review
                 </Button>
              </div>

              {/* Question Content */}
              <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed mb-8">
                {currentQuestion.imageUrl && (currentQuestion.imagePosition === "top" || !currentQuestion.imagePosition) && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 object-contain" />
                )}
                {currentQuestion.imageUrl && currentQuestion.imagePosition === "left" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="float-left mr-6 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 object-contain" />
                )}
                
                {/* Using renderInlinePrompt for inline blanks */}
                {renderInlinePrompt(currentQuestion)}

                {currentQuestion.imageUrl && currentQuestion.imagePosition === "right" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="float-right ml-6 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 object-contain" />
                )}
                {currentQuestion.imageUrl && currentQuestion.imagePosition === "bottom" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 object-contain" />
                )}
              </div>

              {/* Options for MCQ */}
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && currentQuestion.qtype !== "matching" && currentQuestion.qtype !== "headings" && (
                <div className="space-y-3 mt-auto">
                  {currentQuestion.options.map((optObj, idx) => {
                    const letter = ["A", "B", "C", "D", "E", "F", "G", "H"][idx] ?? String(idx + 1);
                    const isSelected = answers[currentQuestion.id] === optObj.text;
                    return (
                      <button
                        key={optObj.id || idx}
                        onClick={() => onAnswer(currentQuestion.id, optObj.text)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]",
                          isSelected 
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-600/10 shadow-md shadow-blue-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 bg-white dark:bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        )}>
                          {letter}
                        </div>
                        <span className={cn("text-base md:text-lg font-medium", isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300")}>
                          {optObj.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TFNG / YNNG Options */}
              {(currentQuestion.qtype === "tfng" || currentQuestion.qtype === "ynng") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
                  {(currentQuestion.qtype === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"]).map((v) => {
                    const isSelected = answers[currentQuestion.id] === v;
                    return (
                      <button
                        key={v}
                        onClick={() => onAnswer(currentQuestion.id, v)}
                        className={cn(
                          "p-6 rounded-xl border-2 font-black tracking-widest text-sm transition-all active:scale-95",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-blue-300"
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matching Dropdown */}
              {(currentQuestion.qtype === "matching" || currentQuestion.qtype === "headings") && Array.isArray(currentQuestion.options) && (
                <div className="mt-auto">
                  <select
                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold focus:border-blue-500 focus:ring-0 outline-none"
                    value={answers[currentQuestion.id] ?? ""}
                    onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                  >
                    <option value="">— Select an Option —</option>
                    {currentQuestion.options.map((o) => <option key={o.id || o.text} value={o.text}>{o.text}</option>)}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">Loading question...</div>
          )}

          {/* BOTTOM NAVIGATION BAR */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 shrink-0 flex items-center justify-between">
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-6 font-bold"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex(i => i - 1)}
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Previous
            </Button>
            
            <div className="hidden md:flex xl:hidden items-center gap-1 overflow-x-auto max-w-[40%] no-scrollbar px-4">
               {questions.map((q, idx) => {
                 const isActive = activeQuestionIndex === idx;
                 const hasAns = !!answers[q.id];
                 const isFlg = flagged.has(q.id);
                 return (
                   <button
                     key={q.id}
                     onClick={() => setActiveQuestionIndex(idx)}
                     className={cn(
                       "h-8 w-8 rounded flex items-center justify-center text-[10px] font-black shrink-0 transition-all",
                       isActive ? "border-2 border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 scale-110" 
                         : hasAns ? "bg-emerald-500 text-white" 
                         : isFlg ? "bg-amber-500 text-white" 
                         : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                     )}
                   >
                     {q.position}
                   </button>
                 );
               })}
            </div>

            {activeQuestionIndex === questions.length - 1 ? (
              <Button size="lg" className="h-12 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowReviewScreen(true)}>
                Review <Grid className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button size="lg" className="h-12 px-6 font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100" onClick={() => setActiveQuestionIndex(i => i + 1)}>
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* STATUS SIDEBAR (Desktop) */}
        <div className="hidden xl:flex flex-col w-[320px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full p-6">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-xs flex items-center gap-2"><Target className="w-4 h-4 text-blue-600" /> Exam Status</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Answered</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Remaining</span>
                <span className="font-bold text-slate-900 dark:text-white">{questions.length - answeredCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Flagged</span>
                <span className="font-bold text-amber-500">{flaggedCount}</span>
              </div>
              
              <div className="pt-2">
                 <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-slate-500">Completion</span>
                   <span className="text-blue-600">{Math.round((answeredCount/questions.length)*100)}%</span>
                 </div>
                 <Progress value={(answeredCount/questions.length)*100} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
               <div className="grid grid-cols-5 gap-2">
                 {questions.map((q, idx) => {
                   const isActive = activeQuestionIndex === idx;
                   const hasAns = !!answers[q.id];
                   const isFlg = flagged.has(q.id);
                   return (
                     <button
                       key={q.id}
                       onClick={() => setActiveQuestionIndex(idx)}
                       className={cn(
                         "aspect-square rounded flex items-center justify-center text-xs font-black transition-all border",
                         isActive ? "border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 scale-110 shadow-md" 
                           : hasAns ? "bg-emerald-500 border-emerald-500 text-white" 
                           : isFlg ? "bg-amber-500 border-amber-500 text-white" 
                           : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300"
                       )}
                     >
                       {q.position}
                     </button>
                   );
                 })}
               </div>
            </div>
        </div>
      </main>

"""

parts = content.split(start_marker)
if len(parts) == 2:
    prefix = parts[0]
    rest = parts[1]
    subparts = rest.split(end_marker)
    if len(subparts) >= 2:
        suffix = end_marker + subparts[1]
        final_content = prefix + new_code + suffix
        with open('src/pages/shared/MockTake.tsx', 'w', encoding='utf-8') as f:
            f.write(final_content)
        print("Successfully replaced.")
    else:
        print("End marker split failed")
else:
    print("Start marker split failed")
