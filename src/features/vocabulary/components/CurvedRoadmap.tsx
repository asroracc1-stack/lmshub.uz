import React, { useRef, useEffect, useState } from 'react';
import { UnitProgress } from '../types/vocabulary';
import { RoadmapNode } from './RoadmapNode';

interface CurvedRoadmapProps {
  units: UnitProgress[];
  onSelectUnit: (unitNum: number) => void;
}

export const CurvedRoadmap: React.FC<CurvedRoadmapProps> = ({
  units,
  onSelectUnit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgPath, setSvgPath] = useState('');

  // Find the first uncompleted unit to highlight as active
  const activeUnitNum = units.find(u => u.stageCompleted < 3 && u.isUnlocked)?.unit || 1;

  // Calculate coordinates and draw SVG paths when units update
  useEffect(() => {
    if (!containerRef.current || units.length <= 1) return;

    const calculatePath = () => {
      const nodes = containerRef.current?.querySelectorAll('.relative.flex.flex-col');
      if (!nodes || nodes.length === 0) return;

      let d = '';
      const points: { x: number; y: number }[] = [];

      nodes.forEach((node, i) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        const parentRect = containerRef.current!.getBoundingClientRect();

        const circle = node.querySelector('.rounded-full');
        if (!circle) return;
        const circleRect = circle.getBoundingClientRect();

        // Get coordinates relative to the parent container
        const x = (circleRect.left + circleRect.width / 2) - parentRect.left;
        const y = (circleRect.top + circleRect.height / 2) - parentRect.top;
        points.push({ x, y });
      });

      // Construct cubic bezier curve path linking all coordinate points
      if (points.length > 1) {
        d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
          const curr = points[i];
          const next = points[i + 1];
          const cpY1 = curr.y + (next.y - curr.y) / 2;
          const cpY2 = next.y - (next.y - curr.y) / 2;
          d += ` C ${curr.x} ${cpY1}, ${next.x} ${cpY2}, ${next.x} ${next.y}`;
        }
      }

      setSvgPath(d);
    };

    // Delay briefly to allow DOM positioning to settle
    const timer = setTimeout(calculatePath, 150);
    window.addEventListener('resize', calculatePath);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePath);
    };
  }, [units]);

  return (
    <div ref={containerRef} className="relative w-full py-8 overflow-hidden min-h-[500px]">
      {/* SVG Connector Overlay */}
      {svgPath && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* Backdrop trace line */}
          <path
            d={svgPath}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="10, 10"
          />
          {/* Glowing trace line for completed track */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#gradient-energy)"
            strokeWidth="6"
            strokeLinecap="round"
            className="opacity-90 shadow-2xl"
          />
          {/* Gradients */}
          <defs>
            <linearGradient id="gradient-energy" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Roadmap Nodes Layout */}
      <div className="relative z-10 flex flex-col gap-12 w-full max-w-lg mx-auto">
        {units.map((unit, index) => {
          // Winding offset logic (sinusoidal pattern)
          const offset = Math.sin(index * 1.5) * 70;
          const isActive = unit.unit === activeUnitNum;

          return (
            <RoadmapNode
              key={unit.unit}
              unit={unit}
              isActive={isActive}
              onSelect={onSelectUnit}
              xOffset={offset}
            />
          );
        })}
      </div>
    </div>
  );
};
