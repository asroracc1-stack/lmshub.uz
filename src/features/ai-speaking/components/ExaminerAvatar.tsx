import React from 'react';
import { motion } from 'framer-motion';

export default function ExaminerAvatar({ name }: { name: string }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 p-4 bg-white/60 dark:bg-[#111827]/60 backdrop-blur-sm rounded-xl shadow-lg transition-colors duration-300"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <img
        src="/ai_examiner_avatar.png"
        alt="AI Examiner"
        className="w-32 h-32 object-cover rounded-full border-4 border-blue-500 shadow-xl"
      />
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
        {name}
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs">
        Your personal IELTS speaking examiner is ready to assess your fluency and confidence.
      </p>
    </motion.div>
  );
}
