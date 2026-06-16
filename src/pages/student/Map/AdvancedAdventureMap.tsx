import React, { useState } from 'react';
import { useAdventure } from '@/hooks/useAdventure';
import { MapCanvas } from '@/components/map/MapCanvas';
import { LeaderboardSidebar } from '@/components/map/LeaderboardSidebar';
import { RegionModal } from '@/components/map/RegionModal';
import { Loader2, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdvancedAdventureMap: React.FC = () => {
  const { isLoading, stateData } = useAdventure();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading && !stateData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] min-h-[500px] rounded-[16px] flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#140D23]">
      
      {/* Mobile Header / Top Bar */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 z-50 flex justify-between gap-2 md:gap-4 pointer-events-none">
        <div className="flex gap-2 md:gap-4 pointer-events-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-2xl shadow-lg border border-white/20">
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">{t('gamification.travelPoints', 'Travel Points')}</p>
            <p className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">
              {stateData?.totalPoints || 0}
            </p>
          </div>
          <div className="hidden sm:block bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-white/20">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('gamification.currentAvatar', 'Current Avatar')}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {stateData?.avatarTitle || 'Beginner Traveler'} <span className="text-sm text-purple-500">(Lvl {stateData?.avatarLevel || 1})</span>
            </p>
          </div>
        </div>

        {/* Mobile Sidebar Toggle */}
        <button 
          className="md:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20 pointer-events-auto text-slate-800 dark:text-white"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Main Interactive SVG Map */}
      <div className="flex-1 relative h-full">
        <MapCanvas />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Leaderboard Sidebar - Responsive */}
      <div className={`
        fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 w-80 max-w-[85vw] h-full overflow-hidden flex flex-col
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <LeaderboardSidebar />
      </div>

      {/* Modals & Overlays */}
      <RegionModal />
    </div>
  );
};

export default AdvancedAdventureMap;
