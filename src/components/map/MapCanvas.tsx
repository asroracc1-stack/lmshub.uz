import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { useAdventureStore } from '@/store/useAdventureStore';
import { AvatarEngine } from './AvatarEngine';

const UZ_TOPOJSON_URL = "/uzbekistan.json";

// Accurate [longitude, latitude] coordinates for Uzbekistan regions
const CITY_COORDS: Record<string, [number, number]> = {
  'Nukus': [59.6143, 42.4619],
  'Xorazm': [60.6316, 41.5500],
  'Buxoro': [64.4286, 39.7747],
  'Navoiy': [65.3792, 40.0844],
  'Qashqadaryo': [65.7950, 38.8615], // Qarshi
  'Surxondaryo': [67.2771, 37.2246], // Termez
  'Samarqand': [66.9597, 39.6270],
  'Jizzax': [67.8280, 40.1158],
  'Sirdaryo': [68.7816, 40.4915],
  'Toshkent': [69.2401, 41.2995],
  'Namangan': [71.6726, 41.0010],
  'Farg\'ona': [71.7828, 40.3842],
  'Andijon': [72.3594, 40.7829],
};

// Map default viewport configuration
const mapConfig = {
  projectionConfig: {
    scale: 3500,
    center: [64.5, 41.5] as [number, number]
  }
};

export const MapCanvas: React.FC = () => {
  const { regions, currentRegionName, avatarLevel, setSelectedRegion, totalPoints } = useAdventureStore();
  
  // Create an ordered list of coordinates based on the backend regions
  // Fallback to Nukus if a region is not found in the dictionary
  const pathCoords = regions.map(r => CITY_COORDS[r.name] || CITY_COORDS['Nukus']);
  
  const currentRegionCoords = CITY_COORDS[currentRegionName] || CITY_COORDS['Nukus'];

  return (
    <div className="relative w-full h-full bg-[#f0f8ff] dark:bg-[#0f172a] overflow-hidden flex items-center justify-center">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={mapConfig.projectionConfig}
        className="w-full h-full max-h-[90vh] touch-none outline-none"
      >
        <Geographies geography={UZ_TOPOJSON_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#FDE68A" // Sandy gold color like the user's reference
                stroke="#B45309"
                strokeWidth={1}
                style={{
                  default: { outline: 'none' },
                  hover: { fill: '#FCD34D', outline: 'none', transition: 'all 0.3s' },
                  pressed: { outline: 'none' }
                }}
                className="dark:fill-slate-700 dark:stroke-slate-900"
              />
            ))
          }
        </Geographies>

        {/* Draw Paths Connecting the Cities */}
        {pathCoords.map((coord, index) => {
          if (index === 0) return null;
          const prevCoord = pathCoords[index - 1];
          // Determine if the path is unlocked (i.e. user has reached the target region)
          const isUnlocked = totalPoints >= regions[index].requiredPoints;
          
          return (
            <Line
              key={`line-${index}`}
              from={prevCoord}
              to={coord}
              stroke={isUnlocked ? "#3B82F6" : "#9CA3AF"} // Blue for unlocked, Gray for locked
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={isUnlocked ? "0" : "5,5"}
              className="drop-shadow-md transition-colors duration-700"
            />
          );
        })}

        {/* Draw Checkpoints (Markers) */}
        {regions.map((region, idx) => {
          const coord = CITY_COORDS[region.name] || CITY_COORDS['Nukus'];
          const isUnlocked = totalPoints >= region.requiredPoints;
          const isCurrent = currentRegionName === region.name;
          const isFinish = idx === regions.length - 1;
          
          return (
            <Marker 
              key={region.id} 
              coordinates={coord}
              onClick={() => setSelectedRegion(region)}
              style={{ default: { cursor: 'pointer' }, hover: { cursor: 'pointer' }, pressed: { cursor: 'pointer' } }}
            >
              {isCurrent && (
                <motion.circle
                  r={15}
                  fill="#3B82F6"
                  className="opacity-30"
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              
              {isFinish ? (
                // Draw a finish flag
                <g transform="translate(-10, -25)">
                  <path d="M0,0 L0,30" stroke="#EF4444" strokeWidth="2" />
                  <path d="M0,0 L20,10 L0,20 Z" fill="#EF4444" />
                </g>
              ) : (
                <circle 
                  r={isCurrent ? 8 : 6} 
                  fill={isUnlocked ? '#10B981' : '#F87171'} // Green for unlocked, Red for locked
                  stroke="#FFFFFF" 
                  strokeWidth={2}
                  className="drop-shadow-lg"
                />
              )}
              
              <text
                textAnchor="middle"
                y={isFinish ? 15 : 20}
                style={{
                  fontFamily: 'system-ui',
                  fill: isUnlocked ? '#1E293B' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF',
                  pointerEvents: 'none'
                }}
              >
                {region.name}
              </text>
            </Marker>
          );
        })}

        {/* Draw the Avatar */}
        {regions.length > 0 && (
          <Marker coordinates={currentRegionCoords}>
            <g transform="translate(-20, -45)">
              <AvatarEngine level={avatarLevel} isMoving={true} />
            </g>
          </Marker>
        )}
      </ComposableMap>
    </div>
  );
};
