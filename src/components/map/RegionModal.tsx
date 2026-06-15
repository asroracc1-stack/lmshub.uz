import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdventureStore } from '@/store/useAdventureStore';
import { X, Award, MapPin, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const RegionModal: React.FC = () => {
  const { selectedRegion, setSelectedRegion, totalPoints } = useAdventureStore();
  const { t } = useTranslation();

  if (!selectedRegion) return null;

  const isUnlocked = totalPoints >= selectedRegion.requiredPoints;
  const progress = Math.min(100, Math.max(0, (totalPoints / selectedRegion.requiredPoints) * 100));

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setSelectedRegion(null)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white/20"
        >
          {/* Header Image Area */}
          <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 relative flex items-center justify-center">
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <MapPin className="w-16 h-16 text-white opacity-80" />
            <button 
              onClick={() => setSelectedRegion(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {selectedRegion.name}
                </h3>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {selectedRegion.theme || t('gamification.mysteryRegion', "Mystery Region")}
                </p>
              </div>
              {isUnlocked && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-full">
                  <Award className="w-6 h-6" />
                </div>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-300 mt-4 mb-6">
              {selectedRegion.description || t('gamification.regionDescription', "Ushbu hudud sizning sarguzashtingizdagi muhim nuqta hisoblanadi.")}
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{t('gamification.requiredPoints', 'Talab qilinadigan ball')}</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedRegion.requiredPoints} pts</span>
              </div>
              
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${isUnlocked ? 'bg-green-500' : 'bg-blue-500'}`}
                />
              </div>
              
              {!isUnlocked && (
                <p className="text-xs text-right text-slate-500">
                  {t('gamification.pointsNeeded', 'Yana {{points}} ball kerak', { points: selectedRegion.requiredPoints - totalPoints })}
                </p>
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setSelectedRegion(null)}
                className="w-full py-3 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                {t('gamification.backToMap', 'Xaritaga qaytish')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
