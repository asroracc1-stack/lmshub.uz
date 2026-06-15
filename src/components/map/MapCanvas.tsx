import React from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from 'react-simple-maps';
import { useAdventureStore } from '@/store/useAdventureStore';
import { AvatarEngine } from './AvatarEngine';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const UZ_TOPOJSON_URL = "/world.json";

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

const FALLBACK_REGIONS = [
  { id: '1', name: 'Nukus', requiredPoints: 0, theme: 'Cho\'l hikmatlari', description: 'Sayohatning boshlanishi.', orderIndex: 1, svgPath: '' },
  { id: '2', name: 'Xorazm', requiredPoints: 50, theme: 'Qadimiy shahar', description: 'Tarix bilan yuzlashish.', orderIndex: 2, svgPath: '' },
  { id: '3', name: 'Buxoro', requiredPoints: 120, theme: 'Ilm markazi', description: 'Bilimlar sarchashmasi.', orderIndex: 3, svgPath: '' },
  { id: '4', name: 'Navoiy', requiredPoints: 200, theme: 'Sanoat va qudrat', description: 'Kuch va iroda.', orderIndex: 4, svgPath: '' },
  { id: '5', name: 'Qashqadaryo', requiredPoints: 300, theme: 'Buyuklar yurti', description: 'Amir Temur vatani.', orderIndex: 5, svgPath: '' },
  { id: '6', name: 'Surxondaryo', requiredPoints: 400, theme: 'Quyoshli o\'lka', description: 'Eng issiq nuqta.', orderIndex: 6, svgPath: '' },
  { id: '7', name: 'Samarqand', requiredPoints: 550, theme: 'Yer yuzi sayqali', description: 'Go\'zallik va ilm.', orderIndex: 7, svgPath: '' },
  { id: '8', name: 'Jizzax', requiredPoints: 700, theme: 'Tabiat inoyati', description: 'Tog\'lar salobati.', orderIndex: 8, svgPath: '' },
  { id: '9', name: 'Sirdaryo', requiredPoints: 850, theme: 'Daryo bo\'yi', description: 'Suv - hayot manbai.', orderIndex: 9, svgPath: '' },
  { id: '10', name: 'Toshkent', requiredPoints: 1000, theme: 'Poytaxt', description: 'Zamonaviy bilimlar.', orderIndex: 10, svgPath: '' },
  { id: '11', name: 'Namangan', requiredPoints: 1200, theme: 'Gullar shahri', description: 'Nafosat va go\'zallik.', orderIndex: 11, svgPath: '' },
  { id: '12', name: 'Farg\'ona', requiredPoints: 1500, theme: 'Vodiy gavhari', description: 'Hunarmandlar makoni.', orderIndex: 12, svgPath: '' },
  { id: '13', name: 'Andijon', requiredPoints: 2000, theme: 'Bobur yurti', description: 'Marra chizig\'i!', orderIndex: 13, svgPath: '' },
];

export const MapCanvas: React.FC = () => {
  const { regions: storeRegions, currentRegionName, avatarLevel, setSelectedRegion, totalPoints } = useAdventureStore();
  const [position, setPosition] = React.useState({ coordinates: [64.5, 41.5] as [number, number], zoom: 1 });

  const regions = storeRegions && storeRegions.length > 0 ? storeRegions : FALLBACK_REGIONS;
  
  const pathCoords = regions.map(r => CITY_COORDS[r.name] || CITY_COORDS['Nukus']);
  
  // Find current region from state, or default to Nukus
  const currentRegion = currentRegionName && CITY_COORDS[currentRegionName] ? currentRegionName : 'Nukus';
  const currentRegionCoords = CITY_COORDS[currentRegion];

  function handleZoomIn() {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }

  function handleZoomOut() {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }

  function handleReset() {
    setPosition({ coordinates: [64.5, 41.5], zoom: 1 });
  }

  function handleMoveEnd(position: any) {
    setPosition(position);
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden flex items-center justify-center">
      
      {/* Zoom / Pan Controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-20">
        <button onClick={handleZoomIn} className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg border border-white/20 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={handleReset} className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg border border-white/20 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
          <Maximize className="w-5 h-5" />
        </button>
        <button onClick={handleZoomOut} className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg border border-white/20 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 3500 }}
        className="w-full h-full outline-none"
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          maxZoom={4}
          filterZoomEvent={(e: any) => {
             // Disable scroll to zoom globally to prevent page jumps, rely on UI buttons or explicit pan
             if (e.type === 'wheel') return false; 
             return true;
          }}
        >
          {/* Map Geographies */}
          <Geographies geography={UZ_TOPOJSON_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                if (geo.id !== "860") return null;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#FDE047" // Beautiful gold map
                    stroke="#D97706"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#FCD34D', outline: 'none', transition: 'all 0.3s' },
                      pressed: { outline: 'none' }
                    }}
                    className="dark:fill-slate-800 dark:stroke-indigo-500/50 drop-shadow-[0_10px_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  />
                );
              })
            }
          </Geographies>

          {/* Connected Routes */}
          {pathCoords.map((coord, index) => {
            if (index === 0) return null;
            const prevCoord = pathCoords[index - 1];
            const isUnlocked = totalPoints >= regions[index].requiredPoints;
            
            return (
              <Line
                key={`line-${index}`}
                from={prevCoord}
                to={coord}
                stroke={isUnlocked ? "#3B82F6" : "#CBD5E1"} // Bright blue vs light gray
                strokeWidth={isUnlocked ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={isUnlocked ? "0" : "4,4"}
                className={`transition-colors duration-700 ${!isUnlocked && 'dark:stroke-slate-700'}`}
              />
            );
          })}

          {/* Checkpoints */}
          {regions.map((region, idx) => {
            const coord = CITY_COORDS[region.name] || CITY_COORDS['Nukus'];
            const isUnlocked = totalPoints >= region.requiredPoints;
            const isCurrent = currentRegion === region.name;
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
                    r={12}
                    fill="#3B82F6"
                    className="opacity-40"
                    animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                
                {isFinish ? (
                  <g transform="translate(-8, -20)">
                    <path d="M0,0 L0,24" stroke="#EF4444" strokeWidth="2" />
                    <path d="M0,0 L16,8 L0,16 Z" fill="#EF4444" className="drop-shadow-md" />
                  </g>
                ) : (
                  <circle 
                    r={isCurrent ? 6 : 4} 
                    fill={isUnlocked ? '#10B981' : '#F87171'}
                    stroke="#FFFFFF" 
                    strokeWidth={1.5}
                    className="drop-shadow-sm"
                  />
                )}
                
                <text
                  textAnchor="middle"
                  y={isFinish ? 15 : 12}
                  className={`font-semibold ${isUnlocked ? 'fill-slate-800 dark:fill-white drop-shadow-md' : 'fill-slate-500 dark:fill-slate-500'}`}
                  style={{ fontSize: '7px', pointerEvents: 'none' }}
                >
                  {region.name}
                </text>
              </Marker>
            );
          })}

          {/* Animated Avatar */}
          <Marker coordinates={currentRegionCoords}>
            <g transform="translate(-15, -35) scale(0.7)">
              <AvatarEngine level={avatarLevel} isMoving={true} />
            </g>
          </Marker>

        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
