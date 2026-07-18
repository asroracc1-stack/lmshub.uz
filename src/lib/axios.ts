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

      if (url.includes('/admin/weekly-schedules/generate')) {
        return {
          data: {
            message: "Darslar muvaffaqiyatli generatsiya qilindi!",
            count: 12
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/admin/weekly-schedules')) {
        return {
          data: [
            {
              id: "ws-mock-1",
              groupId: "mock-group-1",
              groupName: "9 A uz",
              subjectId: "mock-subject-1",
              subjectName: "Java",
              teacherId: "mock-teacher-1",
              teacherName: "Nurmamatov B",
              room: "102",
              dayOfWeek: 1,
              startTime: "09:00:00",
              endTime: "09:45:00"
            },
            {
              id: "ws-mock-2",
              groupId: "mock-group-1",
              groupName: "9 A uz",
              subjectId: "mock-subject-1",
              subjectName: "Java",
              teacherId: "mock-teacher-1",
              teacherName: "Nurmamatov B",
              room: "102",
              dayOfWeek: 2,
              startTime: "09:00:00",
              endTime: "09:45:00"
            },
            {
              id: "ws-mock-3",
              groupId: "mock-group-1",
              groupName: "9 A uz",
              subjectId: "mock-subject-2",
              subjectName: "Ingliz tili",
              teacherId: "mock-teacher-2",
              teacherName: "Normamatov D",
              room: "204",
              dayOfWeek: 3,
              startTime: "09:00:00",
              endTime: "09:45:00"
            },
            {
              id: "ws-mock-4",
              groupId: "mock-group-1",
              groupName: "9 A uz",
              subjectId: "mock-subject-1",
              subjectName: "Java",
              teacherId: "mock-teacher-1",
              teacherName: "Nurmamatov B",
              room: "102",
              dayOfWeek: 4,
              startTime: "09:00:00",
              endTime: "09:45:00"
            },
            {
              id: "ws-mock-5",
              groupId: "mock-group-1",
              groupName: "9 A uz",
              subjectId: "mock-subject-3",
              subjectName: "F of BD",
              teacherId: "mock-teacher-3",
              teacherName: "Tojiqulov J",
              room: "305",
              dayOfWeek: 5,
              startTime: "09:00:00",
              endTime: "09:45:00"
            }
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/roadmap')) {
        return {
          data: {
            level: "A1",
            daily_goal: 20,
            current_streak: 5,
            longest_streak: 15,
            vocabulary_title: "Top Learner",
            units: [
              { unit: 1, stageCompleted: 3, totalWords: 20, isUnlocked: true, remainingSeconds: 0 },
              { unit: 2, stageCompleted: 1, totalWords: 20, isUnlocked: true, remainingSeconds: 0 },
              { unit: 3, stageCompleted: 0, totalWords: 20, isUnlocked: true, remainingSeconds: 0 },
              { unit: 4, stageCompleted: 0, totalWords: 20, isUnlocked: false, remainingSeconds: 83700 },
              { unit: 5, stageCompleted: 0, totalWords: 20, isUnlocked: false, remainingSeconds: 0 }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/progress')) {
        return {
          data: { success: true, coins_earned: 10, xp_earned: 8, new_stage: 1 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/stats')) {
        return {
          data: {
            wordsLearned: 145,
            masteredWords: 95,
            learningWords: 40,
            reviewWords: 10,
            speakingAccuracy: 86.5,
            writingAccuracy: 91.0,
            streak: 5,
            longestStreak: 15,
            minutesStudied: 195.5,
            coins: 350,
            xp: 1450,
            vocabularyTitle: "Top Learner",
            learningSpeedChart: [
              { name: 'Mon', words: 5 },
              { name: 'Tue', words: 8 },
              { name: 'Wed', words: 12 },
              { name: 'Thu', words: 15 },
              { name: 'Fri', words: 18 },
              { name: 'Sat', words: 22 },
              { name: 'Sun', words: 25 }
            ],
            retentionRateChart: [
              { name: 'Day 1', rate: 100 },
              { name: 'Day 3', rate: 92 },
              { name: 'Day 7', rate: 85 },
              { name: 'Day 14', rate: 79 },
              { name: 'Day 30', rate: 75 }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/words/unit')) {
        const mockWords = [
          {
            id: "mock-w-1",
            word: "introduce",
            translation: "tanishtirmoq",
            ipaUs: "ˌɪntrəˈdus",
            ipaUk: "ˌɪntrəˈdjuːs",
            partOfSpeech: "verb",
            definition: "To present someone by name to another person.",
            exampleSentence: "Let me introduce you to my sister.",
            uzbekExample: "Sizni singlim bilan tanishtirishga ruxsat bering.",
            imageUrl: "",
            audioUsUrl: "",
            audioUkUrl: "",
            level: "A1",
            unit: 1,
            synonyms: "present, acquaint",
            antonyms: "",
            difficultyScore: 1.0,
            collocations: "introduce a friend; introduce myself",
            commonMistakes: "Do not say 'introduce with'. Say 'introduce to'.",
            pronunciationTips: "Ensure the stress is on the last syllable: intro-DUCE.",
            category: "General"
          },
          {
            id: "mock-w-2",
            word: "address",
            translation: "manzil",
            ipaUs: "əˈdrɛs",
            ipaUk: "əˈdrɛs",
            partOfSpeech: "noun",
            definition: "The particulars of the place where someone lives or an organization is situated.",
            exampleSentence: "What is your home address?",
            uzbekExample: "Sizning uy manzilingiz nima?",
            imageUrl: "",
            audioUsUrl: "",
            audioUkUrl: "",
            level: "A1",
            unit: 1,
            synonyms: "residence, location",
            antonyms: "",
            difficultyScore: 1.0,
            collocations: "home address; email address",
            commonMistakes: "Double 'd' and double 's' are required in spelling.",
            pronunciationTips: "The 'a' sound is soft and brief.",
            category: "General"
          },
          {
            id: "mock-w-3",
            word: "environment",
            translation: "atrof-muhit",
            ipaUs: "ɪnˈvaɪrənmənt",
            ipaUk: "ɪnˈvaɪərənmənt",
            partOfSpeech: "noun",
            definition: "The surroundings or conditions in which a person, animal, or plant lives or operates.",
            exampleSentence: "We must protect the natural environment.",
            uzbekExample: "Biz tabiiy atrof-muhitni himoya qilishimiz kerak.",
            imageUrl: "",
            audioUsUrl: "",
            audioUkUrl: "",
            level: "A1",
            unit: 1,
            synonyms: "surroundings, ecosystem",
            antonyms: "",
            difficultyScore: 1.0,
            collocations: "protect the environment; environmental damage",
            commonMistakes: "Do not forget the silent 'n' before 'ment'.",
            pronunciationTips: "Pronounce the 'n' sound clearly in envir-o-n-ment.",
            category: "Nature"
          }
        ];
        return {
          data: mockWords,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/words')) {
        return {
          data: {
            content: [
              {
                id: "mock-w-1",
                word: "introduce",
                translation: "tanishtirmoq",
                level: "A1",
                category: "General",
                definition: "To present someone by name to another person."
              },
              {
                id: "mock-w-2",
                word: "address",
                translation: "manzil",
                level: "A1",
                category: "General",
                definition: "The particulars of the place where someone lives."
              },
              {
                id: "mock-w-3",
                word: "environment",
                translation: "atrof-muhit",
                level: "A1",
                category: "Nature",
                definition: "The surroundings in which we live."
              }
            ],
            totalPages: 1,
            totalElements: 3
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/bookmarks') || url.includes('/vocabulary/reviews') || url.includes('/vocabulary/weak-words')) {
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/words/bookmark') || url.includes('/vocabulary/words/favorite')) {
        return {
          data: { success: true, is_bookmarked: true, is_favorite: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/claim-chest')) {
        return {
          data: { success: true, coins: 15, xp: 10 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/ai/pronounce-check')) {
        return {
          data: {
            score: 92.0,
            stress_score: 90.0,
            intonation_score: 95.0,
            fluency_score: 92.0,
            feedback: "Zo'r talaffuz, 'o' unlisini biroz cho'zibroq ayting.",
            verdict: "Excellent",
            missing_sounds: [],
            wrong_sounds: ["o"]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        } as any;
      }

      if (url.includes('/vocabulary/ai/generate-word-data')) {
        return {
          data: {
            word: "achieve",
            translation: "erishmoq",
            ipa_us: "əˈtʃiv",
            ipa_uk: "əˈtʃiːv",
            part_of_speech: "verb",
            definition: "Successfully bring about or reach a desired objective or result by effort, skill, or courage.",
            example_sentence: "He achieved his goals through hard work.",
            uzbek_example: "U tinimsiz mehnat orqali oʻz maqsadlariga erishdi.",
            synonyms: "attain, accomplish, realize",
            antonyms: "fail, lose",
            collocations: "achieve goals; achieve success",
            common_mistakes: "Spelt with 'i' before 'e': a-c-h-i-e-v-e.",
            pronunciation_tips: "Put stress on the second syllable: a-CHIEVE.",
            category: "General"
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
