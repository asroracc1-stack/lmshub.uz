import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyProvider, useVocabularyStore } from '../store/vocabularyStore';
import { StatsDashboard } from '../components/StatsDashboard';
import { CurvedRoadmap } from '../components/CurvedRoadmap';
import { ChestReward } from '../components/ChestReward';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Flame, 
  Crown, 
  Search, 
  Settings, 
  WifiOff, 
  Activity, 
  Award,
  BookOpen
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const VocabularyHomeContent: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const {
    selectedLevel,
    setSelectedLevel,
    dailyGoal,
    setDailyGoal,
    streak,
    longestStreak,
    vocabularyTitle,
    stats,
    roadmap,
    loadingRoadmap,
    isOffline
  } = useVocabularyStore();

  const [showGoalModal, setShowGoalModal] = useState(false);
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  const handleSelectUnit = (unitNum: number) => {
    navigate(`${basePath}/vocabulary/lesson/${selectedLevel}/${unitNum}`);
  };

  const handleLockedClick = () => {
    toast.error('Bu dars hozircha bloklangan. Barcha darslarni ochish uchun Premium paket sotib oling!');
    navigate(`${basePath}/packs`);
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Top Banner / Hero header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-tr from-[#1f1a3a] to-[#0e0a1a] text-white p-8 sm:p-10 border border-white/5 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px]" />

        <div className="relative space-y-3 flex-1">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full px-3 py-1 text-[10px] tracking-wider uppercase border-none">
            {vocabularyTitle}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none flex items-center gap-3">
            <BookOpen className="h-9 w-9 text-emerald-400" />
            Vocabulary AI
          </h2>
          <p className="text-xs text-slate-350 max-w-lg leading-relaxed font-semibold">
            Ingliz tili lugʻatini Duolingo va ELSA Speak metodologiyalari asosida oʻrganing. Kundalik unvonlar, xazina sandiqlari va AI talaffuz tahlili.
          </p>
        </div>

        {/* Action button triggers */}
        <div className="flex flex-wrap gap-3 relative z-10 shrink-0">
          <Button
            onClick={() => navigate(`${basePath}/vocabulary/search`)}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 px-4 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Qidiruv & Bookmarks
          </Button>

          <Button
            onClick={() => setShowGoalModal(true)}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 px-4 flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Maqsadlar: {dailyGoal}/kun
          </Button>

          {isOffline && (
            <Badge className="bg-rose-500 text-white font-black rounded-full px-3.5 py-1.5 text-xs flex items-center gap-1.5 border-none">
              <WifiOff className="h-4 w-4" />
              Offline rejimi
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <StatsDashboard stats={stats} />

      {/* Level Selection Badges */}
      <div className="flex flex-col gap-3">
        <h4 className="text-base font-black tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
          <Activity className="h-5 w-5 text-emerald-500" />
          CEFR darajangizni tanlang
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {levels.map((lvl) => {
            const isSelected = lvl === selectedLevel;
            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-sm font-black border transition-all duration-300 cursor-pointer shadow-sm",
                  isSelected
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20 scale-105"
                    : "bg-white/40 dark:bg-[#160e2a]/40 border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roadmap & Chest Rewards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Roadmap Canvas */}
        <div className="lg:col-span-7 bg-white/45 dark:bg-[#110b21]/45 border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-xl p-6 backdrop-blur-xl relative">
          <CurvedRoadmap 
            units={roadmap} 
            onSelectUnit={handleSelectUnit} 
          />
        </div>

        {/* Sidebar: Checst + Weak Words */}
        <div className="lg:col-span-5 space-y-8">
          {/* Claimable Chests widget */}
          <ChestReward />

          {/* AI Leaderboard / Streak Panel */}
          <div className="bg-white/40 dark:bg-[#160e2a]/40 border border-slate-100 dark:border-white/5 shadow-md p-6 rounded-[2.5rem] backdrop-blur-xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500 animate-bounce" />
              Streak statistikalari
            </h4>
            <div className="space-y-4 font-semibold text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5">
                <span>Hozirgi streak:</span>
                <span className="font-extrabold text-slate-850 dark:text-white flex items-center gap-1">
                  <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                  {streak} kun
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5">
                <span>Eng uzun streak:</span>
                <span className="font-extrabold text-slate-850 dark:text-white">{longestStreak} kun</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Premium Unvoni:</span>
                <span className="font-extrabold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {vocabularyTitle}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Customization Modal */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="max-w-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border-none shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black tracking-tight text-center">
              Kunlik maqsadni tanlang
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {[10, 20, 30, 50].map((goalNum) => (
              <Button
                key={goalNum}
                onClick={async () => {
                  await setDailyGoal(goalNum);
                  setShowGoalModal(false);
                }}
                className={cn(
                  "h-12 w-full rounded-2xl font-bold border shadow-sm transition-all",
                  dailyGoal === goalNum
                    ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border-none hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {goalNum} soʻz / kun
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function VocabularyHome() {
  return (
    <VocabularyProvider>
      <VocabularyHomeContent />
    </VocabularyProvider>
  );
}
