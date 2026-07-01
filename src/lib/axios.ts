import axios from 'axios';

// VITE_API_BASE_URL muhit o'zgaruvchisini o'qish
// .env.development yoki .env.production fayllaridan olinadi
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.DEV) {
  console.warn("Warning: VITE_API_BASE_URL is not defined in your .env file");
}

// Axios instansiyasini yaratish
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // NOTE: Do NOT set 'Content-Type' here globally.
  // For JSON requests, Axios sets it automatically.
  // For FormData (file uploads), the browser must set it with the correct boundary.
});

// So'rov yuborishdan oldin token qo'shish (agar mavjud bo'lsa)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token'); // AuthContext.tsx dagi setAuth bilan mos kelishi uchun
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Javobni qayta ishlash (masalan, xatolarni boshqarish)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
    if (isNetworkError && import.meta.env.DEV) {
      const config = error.config;
      const url = config.url || '';
      console.warn(`[Mock Fallback] Intercepted failed request to: ${url}`);

      if (url.includes('/auth/login')) {
        return {
          data: {
            access_token: 'mock-dev-token',
            user: {
              id: 'mock-user-id',
              email: 'user@lmshub.uz',
              role: 'USER',
              username: 'user_dev',
              firstName: 'Regular',
              lastName: 'User',
              phone: '+998901234567'
            }
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/user/profile')) {
        return {
          data: {
            id: 'mock-user-id',
            email: 'user@lmshub.uz',
            role: 'USER',
            username: 'user_dev',
            fullName: 'Regular User',
            firstName: 'Regular',
            lastName: 'User',
            phone: '+998901234567',
            coins: 350,
            examDate: '2026-12-31'
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/user/stats')) {
        return {
          data: {
            totalMinutes: 320.5,
            streak: 5,
            targetBand: 7.5,
            avgScore: 6.8,
            examDaysLeft: 45,
            weeklyData: [
              { day: 'Pa', minutes: 45, reading: 6.5, listening: null, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Ju', minutes: 30, reading: null, listening: 7.0, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Sha', minutes: 60, reading: 7.0, listening: null, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Ya', minutes: 15, reading: null, listening: 6.5, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Du', minutes: 50, reading: 6.0, listening: null, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Se', minutes: 40, reading: null, listening: 7.5, writing: null, speaking: null, sat: null, nationalCert: null },
              { day: 'Cho', minutes: 80, reading: 7.5, listening: null, writing: null, speaking: null, sat: null, nationalCert: null }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/user/gamification/contributions')) {
        const daily_contributions = [];
        const today = new Date();
        for (let i = 90; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = d.toLocaleDateString('en-CA');
          const studied = Math.random() > 0.4;
          daily_contributions.push({
            date: dateStr,
            minutes: studied ? Math.floor(Math.random() * 90) + 10 : 0,
            lessons: studied ? Math.floor(Math.random() * 3) : 0,
            quizzes: studied ? Math.floor(Math.random() * 2) : 0,
            mocks: studied && Math.random() > 0.8 ? 1 : 0,
            xp: studied ? Math.floor(Math.random() * 150) + 20 : 0,
            coins: studied ? Math.floor(Math.random() * 15) + 2 : 0,
          });
        }
        return {
          data: {
            current_streak: 5,
            longest_streak: 12,
            total_study_hours: 45.5,
            total_xp: 2450,
            total_coins: 350,
            daily_contributions
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/user/gamification/progress')) {
        return {
          data: {
            total_distance: 0,
            current_region: "Start Village",
            xp: 0,
            coins: 0,
            streak: 3,
            checkpoints: [
              { id: '1', name: 'Start Village Chest', target_distance: 25000, reward_type: 'COIN_BOX', reward_value: '50', unlocked: false, claimed: false },
              { id: '2', name: 'Reading Forest Chest', target_distance: 80000, reward_type: 'COIN_BOX', reward_value: '100', unlocked: false, claimed: false },
              { id: '3', name: 'Listening Ocean Chest', target_distance: 150000, reward_type: 'XP_BOOST', reward_value: '200', unlocked: false, claimed: false }
            ],
            progress_percentage: 0
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/student/ielts-dashboard/summary')) {
        return {
          data: {
            target_band: 7.5,
            current_band: 6.5,
            progress_percentage: 65,
            daily_streak: 5,
            longest_streak: 12,
            week_checklist: [true, true, true, false, false, false, false],
            target_band_trend: 'up',
            average_score_trend: 'up',
            days_until_exam: 45,
            total_practice_time: '45.5h',
            weekly_results: [
              { day: 'Mon', reading: 6.5, listening: 7.0, writing: 6.0, speaking: 6.5 },
              { day: 'Tue', reading: 7.0, listening: 6.5, writing: 6.5, speaking: 6.0 },
              { day: 'Wed', reading: 6.5, listening: 7.5, writing: 6.0, speaking: 7.0 },
            ],
            today_goals: [
              { id: '1', title: 'Reading practice', subtitle: '1 passage', type: 'reading', progress: 100, is_completed: true },
              { id: '2', title: 'Vocabulary quiz', subtitle: '20 words', type: 'vocabulary', progress: 0, is_completed: false }
            ],
            achievements: [
              { id: '1', title: 'First Steps', description: 'Complete first practice test', date: '2026-06-01', icon_type: 'trophy' },
              { id: '2', title: 'Streak Master', description: 'Reach a 7-day streak', date: '2026-06-08', icon_type: 'flame' }
            ],
            leaderboard: [
              { rank: 1, name: 'Alice Smith', avatar_url: null, band_score: 8.0, is_current_user: false },
              { rank: 2, name: 'Student Developer', avatar_url: null, band_score: 6.5, is_current_user: true },
              { rank: 3, name: 'Bob Jones', avatar_url: null, band_score: 6.0, is_current_user: false }
            ],
            recent_tests: [
              { id: '1', title: 'Reading Mock Test 4', subtitle: 'Academic Reading', type: 'reading', score: 7.0, date: '2026-06-12' },
              { id: '2', title: 'Listening Mock Test 2', subtitle: 'General Listening', type: 'listening', score: 6.5, date: '2026-06-10' }
            ],
            is_premium: true,
            taken_tests_count: 12,
            overall_progress: 72
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }
    }

    // Agar 401 Unauthorized xatosi kelsa, foydalanuvchini tizimdan chiqarish mumkin
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/')) {
        console.error('Unauthorized, logging out...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('smart-clock-settings');
        localStorage.removeItem('sidebar_collapsed_admin');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// Ham nomli (api), ham default eksport (api) sifatida chiqarish
export default api;
