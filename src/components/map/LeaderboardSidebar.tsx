import React from 'react';
import { useAdventureStore } from '@/store/useAdventureStore';
import { Trophy, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LeaderboardSidebar: React.FC = () => {
  const { leaderboard } = useAdventureStore();
  const { t } = useTranslation();

  return (
    <div className="w-full h-full bg-white/90 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 p-6 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)] dark:bg-slate-900/90 z-50">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('gamification.globalTravelers', 'Global Sayohatchilar')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar pb-10">
        {leaderboard.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            <Medal className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Hozircha sayohatchilar yo'q.</p>
          </div>
        )}
        
        {leaderboard.map((user, idx) => (
          <div 
            key={user.userId || idx} 
            className="flex items-center gap-4 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors border border-white/20"
          >
            <div className="flex-shrink-0 w-8 text-center font-bold text-slate-500 dark:text-slate-400">
              {idx === 0 ? <Medal className="w-6 h-6 text-yellow-500 mx-auto" /> : 
               idx === 1 ? <Medal className="w-6 h-6 text-slate-400 mx-auto" /> : 
               idx === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> : 
               `#${idx + 1}`}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white truncate">{user.fullName || 'Anonymous'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.avatarTitle} • {user.region}</p>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-blue-600 dark:text-blue-400">{user.points}</p>
              <p className="text-[10px] text-slate-500 uppercase">{t('gamification.pts', 'Pts')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
