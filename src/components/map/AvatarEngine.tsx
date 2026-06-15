import React from 'react';
import { motion } from 'framer-motion';

interface AvatarEngineProps {
  level: number;
  isMoving?: boolean;
}

export const AvatarEngine: React.FC<AvatarEngineProps> = ({ level, isMoving = false }) => {
  // Determine avatar style based on level
  const getAvatarColors = () => {
    if (level >= 50) return { body: '#8B5CF6', hat: '#FDE047', pack: '#4C1D95' }; // Master
    if (level >= 25) return { body: '#3B82F6', hat: '#60A5FA', pack: '#1E3A8A' }; // Scholar
    if (level >= 10) return { body: '#10B981', hat: '#34D399', pack: '#064E3B' }; // Explorer
    return { body: '#6B7280', hat: '#9CA3AF', pack: '#374151' }; // Beginner
  };

  const colors = getAvatarColors();

  // Animation variants
  const walkAnimation = {
    y: [0, -5, 0],
    rotate: [-5, 5, -5],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  };

  const idleAnimation = {
    y: [0, -2, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  };

  return (
    <motion.svg
      width="40"
      height="50"
      viewBox="0 0 40 50"
      animate={isMoving ? walkAnimation : idleAnimation}
      className="drop-shadow-lg"
      style={{ zIndex: 50, position: 'relative' }}
    >
      {/* Backpack */}
      <rect x="5" y="15" width="30" height="25" rx="5" fill={colors.pack} />
      
      {/* Body */}
      <rect x="10" y="20" width="20" height="25" rx="10" fill={colors.body} />
      
      {/* Head */}
      <circle cx="20" cy="12" r="10" fill="#FCA5A5" />
      
      {/* Hat */}
      <path d="M5 10 Q20 -5 35 10 Z" fill={colors.hat} />
      
      {/* Eyes */}
      <circle cx="16" cy="10" r="1.5" fill="#111827" />
      <circle cx="24" cy="10" r="1.5" fill="#111827" />
    </motion.svg>
  );
};
