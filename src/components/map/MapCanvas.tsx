import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useAdventureStore } from '@/store/useAdventureStore';
import { AvatarEngine } from './AvatarEngine';

// Hardcoded sample coordinates for regions if missing from DB
const REGION_COORDS: Record<string, { x: number, y: number }> = {
  'Nukus': { x: 150, y: 150 },
  'Xorazm': { x: 250, y: 200 },
  'Buxoro': { x: 400, y: 300 },
  'Navoiy': { x: 500, y: 250 },
  'Samarqand': { x: 650, y: 350 },
  'Jizzax': { x: 750, y: 320 },
  'Sirdaryo': { x: 820, y: 280 },
  'Toshkent': { x: 900, y: 200 },
  'Namangan': { x: 1000, y: 180 },
  'Farg\'ona': { x: 1050, y: 250 },
  'Andijon': { x: 1150, y: 220 },
};

export const MapCanvas: React.FC = () => {
  const { regions, currentRegionName, avatarLevel, setSelectedRegion, totalPoints } = useAdventureStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Map panning & zooming logic
  useGesture({
    onDrag: ({ offset: [dx, dy] }) => {
      setPosition({ x: dx, y: dy });
    },
    onPinch: ({ offset: [d] }) => {
      // Very basic zoom handling
      const newScale = Math.max(0.5, Math.min(3, d / 100));
      setScale(newScale);
    }
  }, {
    target: containerRef,
    drag: { from: () => [position.x, position.y] },
    pinch: { from: () => [scale * 100, 0] }
  });

  // Calculate avatar position based on current region
  const currentCoord = REGION_COORDS[currentRegionName] || REGION_COORDS['Nukus'] || { x: 150, y: 150 };

  // For premium SVG we generate a curved path between regions
  const generatePath = () => {
    if (!regions || regions.length === 0) return '';
    let d = `M ${REGION_COORDS[regions[0].name]?.x || 150} ${REGION_COORDS[regions[0].name]?.y || 150}`;
    
    for (let i = 1; i < regions.length; i++) {
      const prev = REGION_COORDS[regions[i-1].name] || { x: 150, y: 150 };
      const curr = REGION_COORDS[regions[i].name] || { x: 150, y: 150 };
      // Control points for a curved path
      const cx = (prev.x + curr.x) / 2;
      const cy = prev.y - 50; 
      d += ` Q ${cx} ${cy}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden bg-[#e0f2fe] dark:bg-[#0f172a] cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      <motion.div
        className="w-[1400px] h-[800px] absolute origin-center"
        style={{ x: position.x, y: position.y, scale }}
      >
        {/* Layer 1: Base Map Background (Abstract Uzbekistan shape placeholder) */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-2xl">
          <path 
            d="M100 200 Q400 50, 700 200 T 1300 200 L 1300 500 Q 800 600, 400 450 T 100 200 Z" 
            fill="currentColor" 
            className="text-white dark:text-slate-800 opacity-50 dark:opacity-40"
          />
          
          {/* Layer 2: Connecting Routes */}
          {regions.length > 0 && (
            <>
              {/* Background Path */}
              <path 
                d={generatePath()} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeDasharray="10 10"
                className="text-slate-300 dark:text-slate-700" 
              />
              
              {/* Foreground Animated Path */}
              <motion.path 
                d={generatePath()} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4"
                className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }} // Ideally this calculates based on progress
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </>
          )}

          {/* Layer 3: Checkpoints */}
          {regions.map((region, idx) => {
            const coord = REGION_COORDS[region.name] || { x: 150 + idx * 100, y: 150 + (idx % 2) * 50 };
            const isUnlocked = totalPoints >= region.requiredPoints;
            const isCurrent = currentRegionName === region.name;
            
            return (
              <g 
                key={region.id} 
                transform={`translate(${coord.x}, ${coord.y})`}
                onClick={() => setSelectedRegion(region)}
                className="cursor-pointer"
              >
                {/* Outer Glow for current region */}
                {isCurrent && (
                  <motion.circle 
                    r="25" 
                    fill="#3B82F6" 
                    className="opacity-20 dark:opacity-30"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                
                {/* Base Checkpoint */}
                <circle 
                  r="12" 
                  fill={isUnlocked ? '#3B82F6' : '#9CA3AF'} 
                  stroke="white" 
                  strokeWidth="3" 
                  className="drop-shadow-md"
                />
                
                {/* Region Label */}
                <text 
                  y="30" 
                  textAnchor="middle" 
                  className={`text-sm font-bold ${isUnlocked ? 'fill-slate-800 dark:fill-white drop-shadow-md' : 'fill-slate-500'}`}
                >
                  {region.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Layer 4: Avatar Engine */}
        {regions.length > 0 && (
          <motion.div
            className="absolute"
            initial={{ x: 150, y: 150 }}
            animate={{ x: currentCoord.x - 20, y: currentCoord.y - 45 }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            <AvatarEngine level={avatarLevel} isMoving={false} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
