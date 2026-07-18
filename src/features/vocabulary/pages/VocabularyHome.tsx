import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyProvider, useVocabularyStore } from '../store/vocabularyStore';
import { StatsDashboard } from '../components/StatsDashboard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Trophy, 
  Flame, 
  Sparkles,
  Award,
  Layers,
  Zap,
  Star,
  Activity,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const cefrLevels = [
  { code: 'A1', name: 'Beginner', desc: 'Kundalik eng oddiy iboralar va gaplar', gradient: 'from-blue-500 to-cyan-400' },
  { code: 'A2', name: 'Elementary', desc: 'Tez-tez ishlatiladigan sohalardagi iboralar', gradient: 'from-emerald-500 to-teal-400' },
  { code: 'B1', name: 'Intermediate', desc: 'Tanish mavzulardagi matnlar mazmunini tushunish', gradient: 'from-amber-500 to-orange-400' },
  { code: 'B2', name: 'Upper Intermediate', desc: 'Murakkab matnlar va erkin suhbat', gradient: 'from-rose-500 to-pink-400' },
  { code: 'C1', name: 'Advanced', desc: 'Keng koʻlamli qiyin matnlarni anglash', gradient: 'from-purple-500 to-indigo-400' },
  { code: 'C2', name: 'Proficient', desc: 'Eshitilgan va oʻqilgan deyarli hamma narsani tushunish', gradient: 'from-violet-600 to-fuchsia-500' }
];

const VocabularyHomeContent: React.FC = () => {
  const { role, user: authUser } = useAuth();
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

  const [isLevelConfirmed, setIsLevelConfirmed] = useState<boolean>(() => {
    return localStorage.getItem('vocab_level_confirmed') === 'true';
  });

  const [carouselIndex, setCarouselIndex] = useState(0);
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  // Navigate to specific lesson unit
  const handleSelectUnit = (unitNum: number) => {
    navigate(`${basePath}/vocabulary/lesson/${selectedLevel}/${unitNum}`);
  };

  const handleLevelCardSelect = (code: string) => {
    setSelectedLevel(code);
    setIsLevelConfirmed(true);
    localStorage.setItem('vocab_level_confirmed', 'true');
    toast.success(`${code} darajasi tanlandi!`);
  };

  const handleResetLevel = () => {
    setIsLevelConfirmed(false);
    localStorage.removeItem('vocab_level_confirmed');
  };

  // Carousel helpers
  const maxIndex = Math.max(0, roadmap.length - 3); // showing 3 cards at a time on desktop
  const handleNextSlide = () => {
    if (carouselIndex < roadmap.length - 1) {
      setCarouselIndex(prev => prev + 1);
    }
  };
  const handlePrevSlide = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    }
  };

  // Mock illustrations for unit card backgrounds
  const unitBackgrounds = [
    'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', // blue
    'linear-gradient(135deg, #14532d 0%, #22c55e 100%)', // green
    'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // dark slate
    'linear-gradient(135deg, #581c87 0%, #a855f7 100%)', // purple
    'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)'  // orange
  ];

  // 1. LEVEL SELECTION SCREEN (If not selected or confirmed)
  if (!isLevelConfirmed) {
    return (
      <div className="space-y-8 py-8 max-w-5xl mx-auto animate-fade-in">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-850 dark:text-white">
            Lugʻat darajasini tanlang 📚
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto font-semibold">
            Vocabulary AI oʻquv rejasini tuzishimiz uchun oʻzingizga mos CEFR darajasini tanlang.
          </p>
        </div>

        {/* Large level cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {cefrLevels.map((lvl) => (
            <div
              key={lvl.code}
              onClick={() => handleLevelCardSelect(lvl.code)}
              className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden min-h-[220px]"
            >
              {/* Background gradient hint */}
              <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-tr opacity-10 blur-xl group-hover:scale-125 transition-transform duration-500", lvl.gradient)} />

              <div className="space-y-4">
                {/* Large Letter code */}
                <span className={cn("text-5xl font-black bg-gradient-to-tr bg-clip-text text-transparent leading-none", lvl.gradient)}>
                  {lvl.code}
                </span>

                <div>
                  <h4 className="text-base font-black text-slate-855 dark:text-white group-hover:text-emerald-500 transition-colors">
                    {lvl.name}
                  </h4>
                  <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold leading-relaxed mt-1">
                    {lvl.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5 mt-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-450 dark:text-slate-400">
                  Oʻrganishni boshlash
                </span>
                <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-650 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. MAIN DASHBOARD & CAROUSEL LAYOUT
  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto animate-fade-in">
      {/* Upper header section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-850 dark:text-white flex items-center gap-2">
            Lugʻat Darslari
          </h2>
          <p className="text-xs font-bold text-slate-400">
            Tanlangan daraja: <span className="text-emerald-500 uppercase font-black">{selectedLevel}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(`${basePath}/vocabulary/search`)}
            className="rounded-2xl border border-slate-100 dark:border-white/5 bg-white/40 dark:bg-slate-800/40 text-slate-650 dark:text-slate-200 font-bold text-xs h-10 px-4 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Lugʻat (Dictionary)
          </Button>

          <Button
            onClick={handleResetLevel}
            variant="ghost"
            className="rounded-2xl h-10 px-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Darajani oʻzgartirish
          </Button>
        </div>
      </div>

      {/* Primary Header Stats Dashboard Card */}
      <div className="bg-white dark:bg-[#160e2a] border border-slate-150/40 dark:border-white/5 rounded-[2.5rem] shadow-xl p-8 relative overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Avatar and central name profile details */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center text-center">
            <div className="relative h-24 w-24 rounded-full border-4 border-amber-405 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-lg mb-3">
              <span className="text-4xl select-none">👤</span>
              <div className="absolute -bottom-1 right-2 h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-white border-2 border-white dark:border-[#160e2a]">
                <Star className="h-4 w-4 fill-current" />
              </div>
            </div>
            <h3 className="text-sm font-black text-slate-850 dark:text-white leading-tight">
              {authUser?.name || 'Oʻquvchi'}
            </h3>
            <span className="text-xs font-extrabold text-slate-400 capitalize">
              {cefrLevels.find(l => l.code === selectedLevel)?.name || 'Beginner'}
            </span>
          </div>

          {/* Stats matrix grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {/* Coins */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-none flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <span className="text-lg">🪙</span>
              </div>
              <div>
                <h4 className="text-base font-black leading-none">{stats?.coins || 1376}</h4>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Tanga</span>
              </div>
            </div>

            {/* Stars */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-none flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Star className="h-4.5 w-4.5 fill-current" />
              </div>
              <div>
                <h4 className="text-base font-black leading-none">{stats?.xp || 364}</h4>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Yulduz</span>
              </div>
            </div>

            {/* Ranking info */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-none">
              <span className="block text-xs font-black text-emerald-500">84-oʻrin</span>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase">Filial reytingi</span>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-none">
              <span className="block text-xs font-black text-rose-500">1-oʻrin</span>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase">Guruh reytingi</span>
            </div>

            {/* Monthly average */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-none col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-slate-450 dark:text-slate-400 font-extrabold uppercase block">Iyul oʻrtacha natijasi</span>
                <span className="text-xs font-black leading-none text-slate-800 dark:text-white">97.78%</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black rounded-lg border-none text-[10px]">
                +100%
              </Badge>
            </div>
          </div>

          {/* Metric skill progress bars */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* Grammar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-455 dark:text-slate-400">
                <span>Grammar</span>
                <span>100%</span>
              </div>
              <Progress value={100} className="h-1.5 rounded-full" />
            </div>

            {/* Vocabulary */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-455 dark:text-slate-400">
                <span>Vocabulary</span>
                <span>{stats ? Math.round((stats.wordsLearned / 200) * 100) : 100}%</span>
              </div>
              <Progress value={stats ? Math.min(100, (stats.wordsLearned / 200) * 100) : 100} className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-850" />
            </div>

            {/* Listening */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-455 dark:text-slate-400">
                <span>Listening</span>
                <span>100%</span>
              </div>
              <Progress value={100} className="h-1.5 rounded-full" />
            </div>

            {/* Pronunciation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-455 dark:text-slate-400">
                <span>Pronunciation</span>
                <span>{stats ? Math.round(stats.speakingAccuracy) : 100}%</span>
              </div>
              <Progress value={stats ? stats.speakingAccuracy : 100} className="h-1.5 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal units slider carousel */}
      <div className="space-y-4 relative">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-850 dark:text-white">Dars Rejalari (Units)</h4>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handlePrevSlide}
              disabled={carouselIndex === 0}
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-xl border border-slate-100 dark:border-white/5 text-slate-650 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleNextSlide}
              disabled={carouselIndex >= roadmap.length - 1}
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-xl border border-slate-100 dark:border-white/5 text-slate-650 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel Window */}
        <div className="overflow-hidden py-4 w-full">
          <div 
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${carouselIndex * 280}px)` }}
          >
            {roadmap.map((unit, index) => {
              const isCompleted = unit.stageCompleted === 3;
              const isLocked = !unit.isUnlocked;
              const isActive = unit.stageCompleted > 0 && unit.stageCompleted < 3 && unit.isUnlocked;
              const backgroundStyle = unitBackgrounds[index % unitBackgrounds.length];

              return (
                <div
                  key={unit.unit}
                  onClick={() => !isLocked && handleSelectUnit(unit.unit)}
                  className={cn(
                    "w-[256px] shrink-0 rounded-[2.5rem] p-6 text-white shadow-xl cursor-pointer hover:scale-[1.03] transition-all duration-300 flex flex-col justify-between relative overflow-hidden min-h-[300px]",
                    isLocked ? "bg-slate-900 border border-white/5 opacity-80" : ""
                  )}
                  style={!isLocked ? { background: backgroundStyle } : undefined}
                >
                  {/* Decorative glass hint */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />

                  {/* Header Title */}
                  <div className="relative z-10 space-y-1">
                    <span className="text-2xl font-black tracking-tight">Unit {selectedLevel}.{unit.unit}</span>
                    <p className="text-[10px] font-bold text-white/70 uppercase">
                      {isCompleted ? 'Kompilyatsiya qilingan' : isLocked ? 'Bloklangan' : 'Faol dars'}
                    </p>
                  </div>

                  {/* Locked elements details */}
                  {isLocked && (
                    <div className="relative z-10 flex flex-col items-center justify-center flex-1">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500/25 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-2">
                        <Lock className="h-5 w-5" />
                      </div>
                      <Badge className="bg-rose-500/20 text-rose-450 font-bold border-none text-[9px] uppercase tracking-wider">
                        Locked
                      </Badge>
                    </div>
                  )}

                  {/* Active/Completed elements details */}
                  {!isLocked && (
                    <div className="relative z-10 flex-1 flex flex-col justify-end mt-8">
                      {/* Subtitle details */}
                      <span className="text-xs font-black mb-4 block leading-snug">
                        {unit.unit === 1 ? 'Salomlashish va tanishuv iboralari' : unit.unit === 2 ? 'Kiyinish va liboslar lugʻati' : 'Sayohat va transport'}
                      </span>

                      {/* Yellow Pill progress indicator */}
                      <div className="w-full bg-white/10 p-1.5 rounded-full backdrop-blur-md">
                        <div 
                          className="bg-amber-400 text-slate-900 text-[10px] font-black text-center py-1 rounded-full flex items-center justify-center"
                          style={{ width: `${isCompleted ? 100 : unit.stageCompleted * 33.3}%` }}
                        >
                          {isCompleted ? '100%' : `${Math.round(unit.stageCompleted * 33.3)}%`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer details */}
                  <div className="relative z-10 pt-4 border-t border-white/10 text-[10px] font-extrabold uppercase text-white/50 tracking-wider flex justify-between items-center">
                    <span>
                      {isCompleted ? 'Iyul 14' : isLocked ? 'Mavjud emas' : 'Iyul 18'}
                    </span>
                    {!isLocked && (
                      <span className="text-amber-400 font-black">Stage {unit.stageCompleted}/3</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel indicators (Dots) */}
        <div className="flex justify-center gap-1.5 pt-2">
          {roadmap.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300 cursor-pointer",
                carouselIndex === i ? "bg-amber-500 w-4" : "bg-slate-300 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Upper activity level details (Chests) */}
      <StatsDashboard stats={stats} />
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
