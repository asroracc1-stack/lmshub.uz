import re

with open('src/pages/shared/MockTake.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "  return (\n    <div className=\"w-full min-h-screen bg-slate-50 dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-x-hidden font-sans\">\n      {/* 🚀 PREMIUM HUD HEADER */}"
end_marker = "      {/* ⚠️ NAVIGATION GUARD ALERT */}"

if start_marker not in content:
    print("Start marker not found")
if end_marker not in content:
    print("End marker not found")

new_code = """  const currentQuestion = questions[activeQuestionIndex];
  const currentSection = sections[currentQuestion?.section_index || 0];
  const isReading = kind === "reading";
  const showPassage = isReading && (currentSection?.passage || currentSection?.imageUrl);
  const flaggedCount = flagged.size;

  if (showReviewScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-100 dark:bg-[#070b19] flex flex-col p-4 md:p-8">
        <Card className="w-full max-w-5xl mx-auto p-6 md:p-10 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Review</h2>
              <p className="text-slate-500 text-sm mt-1">Review your answers before final submission.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                 <span className="block text-xl font-bold text-slate-900 dark:text-white">{answeredCount}</span>
                 <span className="text-[10px] uppercase font-bold text-slate-500">Answered</span>
               </div>
               <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                 <span className="block text-xl font-bold text-amber-600 dark:text-amber-400">{flaggedCount}</span>
                 <span className="text-[10px] uppercase font-bold text-amber-600/70">Flagged</span>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 mb-8">
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
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all hover:scale-105",
                    hasAns 
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                      : isFlg 
                        ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500"
                  )}
                >
                  {q.position}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-white/10">
            <Button variant="outline" size="lg" onClick={() => setShowReviewScreen(false)}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Return to Exam
            </Button>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8" onClick={() => handleSubmitRequest()}>
              Submit Exam
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-x-hidden font-sans">
      {/* 🚀 OFFICIAL COMMAND CENTER HEADER */}
      <header className={cn(
        "h-[72px] shrink-0 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300",
        theme === "dark" ? "bg-slate-900 border-slate-800 shadow-md" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
             <Shield className="h-6 w-6 text-white" />
           </div>
           <div>
             <h1 className="font-bold text-sm md:text-base leading-tight max-w-[200px] md:max-w-[400px] truncate">{exam.title}</h1>
             <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">{exam.type}</p>
           </div>
        </div>

        {/* Dynamic Timer */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full font-mono text-lg md:text-xl font-black tracking-widest transition-colors border",
            timeLeft < 60 
              ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
              : timeLeft < 300 
                ? "bg-amber-500 text-white border-amber-600"
                : timeLeft < 900
                  ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
          )}>
            <Clock className={cn("h-5 w-5", timeLeft < 60 && "animate-spin")} />
            {fmt(timeLeft)}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setShowCalculator(!showCalculator)} className="hidden md:flex"><Calculator className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => setShowScratchpad(!showScratchpad)} className="hidden md:flex"><PenLine className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)}><Pause className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={toggle}>{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
           
           <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
           <Button variant="outline" className="hidden sm:flex font-bold" onClick={() => setShowReviewScreen(true)}>
             Review
           </Button>
           <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => handleSubmitRequest()}>
             Finish
           </Button>
        </div>
      </header>

      {(kind === "listening" || exam.title.toLowerCase().includes("listening")) && (
        <div className="w-full bg-slate-900 border-b border-slate-800 py-2 px-6 flex justify-center">
          <div className="w-full max-w-3xl">
             <CustomAudioPlayer src={exam.audio_url || (exam as any).audioUrl} isExternalPaused={isPaused} />
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center"
          >
            <Shield className="h-24 w-24 text-blue-500 mb-6 opacity-50" />
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Exam Paused</h2>
            <p className="text-slate-400 mb-8 max-w-md">Your timer is stopped. Note that in official exams, pauses may not be allowed. Return when you are ready.</p>
            <Button size="lg" onClick={() => setIsPaused(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 rounded-full text-lg font-bold shadow-2xl shadow-blue-500/20">
              <Play className="h-6 w-6 mr-2 fill-current" /> Resume Exam
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXAM WORKSPACE */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row h-[calc(100vh-72px)] overflow-hidden relative">
        
        {/* PASSAGE PANEL (For Reading/PDF) */}
        {showPassage && (
          <div className="w-full lg:w-1/2 h-[40vh] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1021] flex flex-col">
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
          showPassage ? "w-full lg:w-1/2" : "w-full max-w-4xl mx-auto"
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
            
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[40%] no-scrollbar px-4">
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
      </main>

      {/* ⚠️ NAVIGATION GUARD ALERT */}"""

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
