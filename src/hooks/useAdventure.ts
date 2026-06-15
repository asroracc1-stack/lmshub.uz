import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAdventureStore } from '@/store/useAdventureStore';
import { toast } from 'sonner';

export const useAdventure = () => {
  const queryClient = useQueryClient();
  const { setAdventureState, setRegions, setLeaderboard } = useAdventureStore();

  const fetchState = async () => {
    const res = await api.get('/api/adventure/state');
    return res.data;
  };

  const fetchMap = async () => {
    const res = await api.get('/api/adventure/map');
    return res.data;
  };

  const fetchLeaderboard = async () => {
    const res = await api.get('/api/adventure/leaderboard');
    return res.data;
  };

  const { data: stateData, isLoading: loadingState } = useQuery({
    queryKey: ['adventureState'],
    queryFn: fetchState,
  });

  const { data: mapData, isLoading: loadingMap } = useQuery({
    queryKey: ['adventureMap'],
    queryFn: fetchMap,
  });

  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['adventureLeaderboard'],
    queryFn: fetchLeaderboard,
  });

  // Sync with store
  if (stateData) setAdventureState(stateData);
  if (mapData?.regions) setRegions(mapData.regions);
  if (leaderboardData) setLeaderboard(leaderboardData);

  const calculateMutation = useMutation({
    mutationFn: async (data: { testsSolved: number; correctAnswers: number; streakDays: number; achievementsEarned: number; newCoins: number }) => {
      const res = await api.post('/api/adventure/calculate', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adventureState'] });
      queryClient.invalidateQueries({ queryKey: ['adventureLeaderboard'] });
      toast.success('Sayohat balingiz hisoblandi!');
    },
  });

  return {
    stateData,
    mapData,
    leaderboardData,
    isLoading: loadingState || loadingMap || loadingLeaderboard,
    triggerCalculation: calculateMutation.mutate,
    isCalculating: calculateMutation.isPending,
  };
};
