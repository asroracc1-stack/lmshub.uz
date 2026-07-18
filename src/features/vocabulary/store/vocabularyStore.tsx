import React, { createContext, useContext, useState, useEffect } from 'react';
import { vocabularyApi } from '../services/vocabularyApi';
import { offlineStorage } from '../utils/offlineStorage';
import { UnitProgress, DashboardStats } from '../types/vocabulary';
import { toast } from 'sonner';

interface VocabularyContextType {
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  dailyGoal: number;
  setDailyGoal: (goal: number) => Promise<void>;
  streak: number;
  longestStreak: number;
  vocabularyTitle: string;
  stats: DashboardStats | null;
  roadmap: UnitProgress[];
  loadingRoadmap: boolean;
  isOffline: boolean;
  syncOfflineQueue: () => Promise<void>;
  fetchRoadmap: (level?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  claimedChests: string[];
  claimChest: (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => Promise<boolean>;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const VocabularyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLevel, setSelectedLevelState] = useState<string>(() => {
    return localStorage.getItem('vocab_selected_level') || 'A1';
  });
  const [dailyGoal, setDailyGoalInternal] = useState(20);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [vocabularyTitle, setVocabularyTitle] = useState('Novice');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [roadmap, setRoadmap] = useState<UnitProgress[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [claimedChests, setClaimedChests] = useState<string[]>([]);

  // Update selected level helper
  const setSelectedLevel = (level: string) => {
    setSelectedLevelState(level);
    localStorage.setItem('vocab_selected_level', level);
  };

  // Listen to connection changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Internetga ulanish tiklandi. Offline natijalar sinxronizatsiya qilinmoqda...');
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("Siz offlineningiz. Ba'zi funksiyalar cheklangan bo'lishi mumkin.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch roadmap
  const fetchRoadmap = async (level: string = selectedLevel) => {
    if (isOffline) {
      // Offline fallback: load mock unit structures or whatever is cached
      const cached = Array.from({ length: 10 }, (_, i) => ({
        unit: i + 1,
        stageCompleted: i === 0 ? 3 : i === 1 ? 1 : 0,
        totalWords: 20,
        isUnlocked: i <= 1,
        remainingSeconds: 0
      }));
      setRoadmap(cached);
      return;
    }

    setLoadingRoadmap(true);
    try {
      const data = await vocabularyApi.getRoadmap(level);
      const mappedUnits = (data.units || []).map((u: any) => ({
        unit: u.unit,
        stageCompleted: u.stage_completed ?? u.stageCompleted ?? 0,
        totalWords: u.total_words ?? u.totalWords ?? 0,
        isUnlocked: u.is_unlocked ?? u.isUnlocked ?? false,
        remainingSeconds: u.remaining_seconds ?? u.remainingSeconds ?? 0,
      }));
      setRoadmap(mappedUnits);
      setDailyGoalInternal(data.daily_goal || 20);
      setStreak(data.current_streak || 0);
      setLongestStreak(data.longest_streak || 0);
      setVocabularyTitle(data.vocabulary_title || 'Novice');
    } catch (e) {
      console.error('Failed to load roadmap:', e);
      if (e && typeof e === 'object' && 'response' in e) {
        console.error('Roadmap server response error details:', (e as any).response?.data);
      }
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (isOffline) return;
    try {
      const data = await vocabularyApi.getStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
      if (e && typeof e === 'object' && 'response' in e) {
        console.error('Stats server response error details:', (e as any).response?.data);
      }
    }
  };

  // Update goal
  const setDailyGoal = async (goal: number) => {
    if (isOffline) {
      toast.error('Goal update is not available offline');
      return;
    }
    try {
      const data = await vocabularyApi.updateDailyGoal(goal);
      setDailyGoalInternal(data.dailyGoal);
      toast.success('Daily goal updated successfully!');
      fetchRoadmap();
    } catch (e) {
      toast.error('Failed to update daily goal');
    }
  };

  // Sync offline completed steps
  const syncOfflineQueue = async () => {
    if (isOffline) return;
    const queue = offlineStorage.getOfflineProgressQueue();
    if (queue.length === 0) return;

    let successCount = 0;
    for (const item of queue) {
      try {
        await vocabularyApi.submitProgress(item.level, item.unit, item.stage);
        offlineStorage.removeQueueItem(item.level, item.unit, item.stage);
        successCount++;
      } catch (e) {
        console.error('Failed to sync offline item:', item, e);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ta dars natijalari serverga yuborildi!`);
      fetchRoadmap();
      fetchStats();
    }
  };

  // Claim chest
  const claimChest = async (chestType: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<boolean> => {
    if (isOffline) {
      toast.error('Reward chests are not claimable offline');
      return false;
    }
    try {
      const data = await vocabularyApi.claimChest(chestType);
      if (data.success) {
        toast.success(`Tabriklaymiz! +${data.coins} tanga va +${data.xp} XP olindi!`);
        fetchStats();
        return true;
      }
      return false;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Chest claims failed');
      return false;
    }
  };

  // Initial load
  useEffect(() => {
    fetchRoadmap();
    fetchStats();
    syncOfflineQueue();
  }, [selectedLevel, isOffline]);

  return (
    <VocabularyContext.Provider value={{
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
      isOffline,
      syncOfflineQueue,
      fetchRoadmap,
      fetchStats,
      claimedChests,
      claimChest
    }}>
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabularyStore = () => {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabularyStore must be used within a VocabularyProvider');
  }
  return context;
};
