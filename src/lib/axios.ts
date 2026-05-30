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
  withCredentials: true, // Cookie'lar va autentifikatsiya tokenlarini yuborish uchun
  headers: {
    'Content-Type': 'application/json', // Barcha so'rovlar uchun Content-Type
  },
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
  (error) => {
    // Agar 401 Unauthorized xatosi kelsa, foydalanuvchini tizimdan chiqarish mumkin
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized, logging out...');
      // localStorage.removeItem('accessToken');
      // window.location.href = '/login'; // Login sahifasiga yo'naltirish
    }
    return Promise.reject(error);
  }
);

// Ham nomli (api), ham default eksport (api) sifatida chiqarish
export default api;
