import { create } from 'zustand';

interface MapRegion {
  id: string;
  name: string;
  theme: string;
  description: string;
  requiredPoints: number;
  orderIndex: number;
  svgPath: string;
}

interface AdventureState {
  totalPoints: number;
  currentRegionId: string | null;
  currentRegionName: string;
  avatarLevel: number;
  avatarTitle: string;
  regions: MapRegion[];
  leaderboard: any[];
  selectedRegion: MapRegion | null;
  
  setAdventureState: (data: any) => void;
  setRegions: (regions: MapRegion[]) => void;
  setLeaderboard: (leaderboard: any[]) => void;
  setSelectedRegion: (region: MapRegion | null) => void;
}

export const useAdventureStore = create<AdventureState>((set) => ({
  totalPoints: 0,
  currentRegionId: null,
  currentRegionName: 'Nukus',
  avatarLevel: 1,
  avatarTitle: 'Beginner Traveler',
  regions: [],
  leaderboard: [],
  selectedRegion: null,

  setAdventureState: (data) => set((state) => ({ ...state, ...data })),
  setRegions: (regions) => set({ regions }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
}));
