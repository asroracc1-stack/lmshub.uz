import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ExamTimerProps {
  totalMinutes: number; // total exam duration in minutes
  onTimeUp?: () => void;
}

export default function ExamTimer({ totalMinutes, onTimeUp }: ExamTimerProps) {
  const totalSeconds = totalMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <motion.div
      className="w-full max-w-md mx-auto mb-4"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        <span>Time Remaining</span>
        <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
