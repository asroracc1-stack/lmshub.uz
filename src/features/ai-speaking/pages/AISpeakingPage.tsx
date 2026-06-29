import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Settings, Play, StopCircle, VolumeX, Volume2, 
  MessageSquareText
} from "lucide-react";
import { useAISpeaking } from "../hooks/useAISpeaking";
import AIAvatarCanvas from "../components/AIAvatarCanvas";
import SpeakingSessionPanel from "../components/SpeakingSessionPanel";
import ImmersiveEnvironments from "../components/ImmersiveEnvironments";
import SpeakingAnalytics from "../components/SpeakingAnalytics";
import SpeakingHistory from "../components/SpeakingHistory";
import MicrophoneButton from "../components/MicrophoneButton";
import AISpeakingSettings from "../components/AISpeakingSettings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Memoize components to prevent redundant renders when session timer ticks every second
const MemoizedAIAvatarCanvas = React.memo(AIAvatarCanvas);
const MemoizedSpeakingSessionPanel = React.memo(SpeakingSessionPanel);
const MemoizedImmersiveEnvironments = React.memo(ImmersiveEnvironments);
const MemoizedSpeakingAnalytics = React.memo(SpeakingAnalytics);
const MemoizedSpeakingHistory = React.memo(SpeakingHistory);
const MemoizedMicrophoneButton = React.memo(MicrophoneButton);

export default function AISpeakingPage() {
  const [selectedEnvId, setSelectedEnvId] = useState("env-1");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");
  const [textInput, setTextInput] = useState("");

  const {
    avatarState,
    session,
    transcript,
    isMuted,
    waveformLevels,
    isSpeechSupported,
    setIsMuted,
    startSession,
    endSession,
    changeTopic,
    startListening,
    stopListeningAndProcess,
    processUserSpeech,
  } = useAISpeaking("IELTS Exam Room");

  const handleEnvironmentSelect = useCallback((envName: string, id: string) => {
    setSelectedEnvId(id);
    if (session.isActive) {
      changeTopic(envName);
    }
  }, [session.isActive, changeTopic]);

  const handleSendText = useCallback(() => {
    if (textInput.trim()) {
      processUserSpeech(textInput.trim());
      setTextInput("");
    }
  }, [textInput, processUserSpeech]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const renderedTranscript = useMemo(() => {
    return transcript.map((msg, mIdx) => (
      <div 
        key={mIdx}
        className={cn(
          "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-xs font-semibold leading-relaxed shadow-sm",
          msg.sender === "user"
            ? "bg-blue-600 text-white ml-auto rounded-tr-none"
            : "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 mr-auto rounded-tl-none"
        )}
      >
        <p>{msg.text}</p>
        <span className={cn(
          "text-[8px] mt-1 font-bold block text-right",
          msg.sender === "user" ? "text-blue-200" : "text-slate-400"
        )}>
          {msg.time}
        </span>
      </div>
    ));
  }, [transcript]);

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0B1220] text-slate-800 dark:text-slate-100 p-4 md:p-6 transition-colors duration-300">
      
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 select-none">
            <Link to="/super-admin/dashboard" className="hover:text-blue-500 transition-colors">Superadmin</Link>
            <span>/</span>
            <span className="text-slate-650 dark:text-slate-350">AI Speaking</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">AI Speaking Partner</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Practice speaking with your intelligent AI assistant.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!session.isActive ? (
            <Button 
              onClick={() => startSession("IELTS Exam Room")}
              className="rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" /> Start Session
            </Button>
          ) : (
            <Button 
              onClick={endSession}
              variant="destructive"
              className="rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <StopCircle className="w-4 h-4" /> End Session
            </Button>
          )}

          <Button
            variant="outline"
            onClick={toggleMute}
            className="rounded-xl h-10 w-10 p-0 bg-white/60 dark:bg-[#111827] border-slate-200 dark:border-slate-800"
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            disabled={!session.isActive}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-slate-500" />}
          </Button>

          <Button
            variant="outline"
            onClick={openSettings}
            className="rounded-xl h-10 px-4 bg-white/60 dark:bg-[#111827] border-slate-200 dark:border-slate-800 font-bold text-xs flex items-center gap-1.5 text-slate-650 dark:text-slate-400"
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!session.isActive ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-5xl mx-auto grid md:grid-cols-[1fr_360px] gap-6 py-6"
          >
            <div className="space-y-6">
              <Card className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 dark:from-slate-900/40 dark:via-[#111827] dark:to-indigo-950/20 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Bot className="w-48 h-48 text-blue-500" />
                </div>

                <div className="space-y-3 z-10">
                  <Badge className="bg-blue-500 text-white border-0 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
                    Enterprise Edition
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-white leading-tight">
                    Develop Fluency Anywhere with Gemini Live Integration
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    Interact naturally with our intelligent speaking avatar. Select from highly specific simulated environments to prepare for exams, business meetings, daily dialogues, and professional interviews.
                  </p>
                </div>

                <div className="pt-6 z-10">
                  <Button 
                    onClick={() => startSession(selectedEnvId === "env-1" ? "IELTS Exam Room" : "Business Meeting")}
                    size="lg"
                    className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg shadow-blue-500/20"
                  >
                    Start Practice Session <Play className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>

              <MemoizedImmersiveEnvironments selectedId={selectedEnvId} onSelect={handleEnvironmentSelect} />
            </div>

            <div className="space-y-6">
              <MemoizedSpeakingAnalytics />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active-session"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid lg:grid-cols-[340px_1fr_360px] gap-6"
          >
            {/* Left Column */}
            <div className="space-y-5 flex flex-col order-2 lg:order-1">
              <MemoizedSpeakingSessionPanel session={session} avatarState={avatarState} />
              <MemoizedImmersiveEnvironments selectedId={selectedEnvId} onSelect={handleEnvironmentSelect} />
            </div>

            {/* Center Column */}
            <div className="flex flex-col items-center justify-between gap-6 order-1 lg:order-2">
              <div className="w-full flex-1 min-h-[380px] md:min-h-[480px]">
                <MemoizedAIAvatarCanvas state={avatarState} />
              </div>
              
              <div className="py-4 w-full flex justify-center">
                {!isSpeechSupported ? (
                  <div className="w-full max-w-md mx-auto flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm">
                    <input
                      type="text"
                      placeholder="Type your speech response..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                      className="flex-1 bg-transparent border-0 outline-none text-sm px-3 text-slate-800 dark:text-slate-100"
                      disabled={avatarState === "thinking" || avatarState === "speaking"}
                    />
                    <Button 
                      onClick={handleSendText} 
                      disabled={!textInput.trim() || avatarState === "thinking" || avatarState === "speaking"}
                      className="rounded-xl h-9 px-4 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10"
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <MemoizedMicrophoneButton 
                    state={avatarState} 
                    isMuted={isMuted} 
                    onStartListening={startListening} 
                    onStopListening={stopListeningAndProcess} 
                    waveformLevels={waveformLevels}
                  />
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 flex flex-col order-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1">
                <TabsList className="grid grid-cols-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-1 mb-4 select-none shrink-0">
                  <TabsTrigger value="analytics" className="rounded-xl font-bold text-xs">Analytics</TabsTrigger>
                  <TabsTrigger value="transcript" className="rounded-xl font-bold text-xs flex items-center gap-1">
                    Live <MessageSquareText className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl font-bold text-xs">History</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="flex-1 focus:outline-none">
                  <MemoizedSpeakingAnalytics />
                </TabsContent>

                <TabsContent value="transcript" className="flex-1 focus:outline-none h-full min-h-[320px] flex flex-col">
                  <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-sm text-slate-850 dark:text-white">Conversation Transcript</h4>
                      <Badge variant="outline" className="text-[9px] font-bold bg-blue-500/10 text-blue-500 uppercase tracking-wider">
                        Dynamic Translation
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[340px] pr-1.5 thin-scrollbar">
                      {renderedTranscript}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="flex-1 focus:outline-none">
                  <MemoizedSpeakingHistory />
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AISpeakingSettings isOpen={showSettings} onClose={closeSettings} />
    </div>
  );
}
