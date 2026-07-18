import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVocabularyStore } from '../store/vocabularyStore';
import confetti from 'canvas-confetti';

export const ChestReward: React.FC = () => {
  const { claimChest, isOffline } = useVocabularyStore();
  const [openingType, setOpeningType] = useState<string | null>(null);
  const [lootResult, setLootResult] = useState<{ coins: number; xp: number } | null>(null);

  const chests = [
    {
      type: 'DAILY' as const,
      name: 'Kunlik Sandiq',
      desc: 'Har kuni 1 dars yakunlangach ochiladi.',
      reward: '+15 Coins, +10 XP',
      color: 'from-amber-400 to-amber-600 shadow-amber-500/20'
    },
    {
      type: 'WEEKLY' as const,
      name: 'Haftalik Sandiq',
      desc: '7 kunlik oʻquv streak yigʻilganda ochiladi.',
      reward: '+100 Coins, +75 XP',
      color: 'from-emerald-400 to-emerald-600 shadow-emerald-500/20'
    },
    {
      type: 'MONTHLY' as const,
      name: 'Oylik Sandiq',
      desc: '30 kunlik oʻquv faolligida ochiladi.',
      reward: '+400 Coins, +300 XP',
      color: 'from-purple-500 to-purple-700 shadow-purple-500/20'
    }
  ];

  const handleOpenChest = async (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    if (isOffline) return;
    setOpeningType(type);
    setLootResult(null);

    try {
      const success = await claimChest(type);
      if (success) {
        // Trigger confetti explosion
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });

        // Mock loot details matching backend
        const coins = type === 'DAILY' ? 15 : type === 'WEEKLY' ? 100 : 400;
        const xp = type === 'DAILY' ? 10 : type === 'WEEKLY' ? 75 : 300;
        setLootResult({ coins, xp });
      } else {
        setOpeningType(null);
      }
    } catch (e) {
      setOpeningType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          Xazina sandiqlari
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Kunlik va haftalik maqsadlarga erishib, koʻproq tanga va XP yutib oling.
        </p>
      </div>

      {/* Chests list grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {chests.map((c, i) => (
          <div 
            key={i} 
            className="flex flex-col items-center bg-white/40 dark:bg-[#160e2a]/40 border border-slate-100 dark:border-white/5 shadow-md p-6 rounded-[2.5rem] backdrop-blur-xl hover:scale-[1.02] transition-transform duration-300"
          >
            {/* Animated Chest Graphic */}
            <motion.div
              animate={openingType === c.type ? {
                rotate: [0, 8, -8, 8, -8, 0],
                scale: [1, 1.1, 1.1, 1]
              } : {}}
              transition={{ duration: 0.6 }}
              className={`h-24 w-24 rounded-3xl bg-gradient-to-tr ${c.color} flex items-center justify-center text-white shadow-xl relative mb-4`}
            >
              <Gift className="h-12 w-12" />
              <Sparkles className="absolute top-2 right-2 h-5 w-5 text-white/50 animate-pulse" />
            </motion.div>

            <h5 className="font-extrabold text-sm text-slate-850 dark:text-white mb-1.5">{c.name}</h5>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 text-center leading-relaxed mb-3.5 px-2 flex-1">{c.desc}</p>
            <span className="text-xs font-black text-amber-500 dark:text-amber-400 mb-4">{c.reward}</span>

            <Button
              onClick={() => handleOpenChest(c.type)}
              disabled={isOffline || openingType !== null}
              className="w-full h-10 rounded-2xl text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none shadow-md hover:opacity-90"
            >
              Ochish 🔑
            </Button>
          </div>
        ))}
      </div>

      {/* Loot Reveal Overlay Modal */}
      <AnimatePresence>
        {lootResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 text-center max-w-sm w-full shadow-2xl relative"
            >
              <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Sandiq ochildi! 🎁</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Xazina sandigʻidan quyidagi mukofotlarni qoʻlga kiritdingiz:</p>

              <div className="flex justify-center gap-4 mb-6">
                <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl text-amber-500 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                  <span>+{lootResult.coins} Coins</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl text-emerald-500 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                  <span>+{lootResult.xp} XP (Stars)</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setLootResult(null);
                  setOpeningType(null);
                }}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 border-none"
              >
                Muloqotni yopish 👍
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
