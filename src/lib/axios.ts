import axios from 'axios';
import { toast } from 'sonner';

/**
 * Vite Proxy (vite.config.ts) ishlatayotganimiz uchun 
 * to'liq URL emas, faqat relative path yozamiz.
 * Bu so'rovlarni avtomatik ravishda localhost:8080 ga yo'naltiradi.
 */
const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // DEBUG LOGS (Sizga muammoni ko'rishga yordam beradi)
    console.log(`🚀 [API REQUEST]: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Xatolik yuz berdi';

    if (status === 401) {
      localStorage.clear();
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    } else if (status === 403) {
      // If 403 on core user endpoints, it likely means the token is invalid/expired
      // (backend may return 403 instead of 401 in some cases)
      const url = error.config?.url || '';
      const coreAuthPaths = ['/user/profile', '/communication/notifications'];
      const isCoreAuthPath = coreAuthPaths.some(p => url.includes(p));
      if (isCoreAuthPath) {
        localStorage.clear();
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
      } else {
        toast.error('Kirish rad etildi: Sizda yetarli huquqlar yo\'q');
      }
    } else if (status === 503) {
      toast.error('AI serverlari band, iltimos 1 daqiqadan so\'ng qayta urinib ko\'ring');
    } else if (status >= 500) {
      toast.error(`Server xatosi (${status}): Iltimos, keyinroq urinib ko'ring yoki admin bilan bog'laning`);
    } else if (status >= 400) {
      toast.error(`Xatolik: ${message}`);
    }

    return Promise.reject(error);
  }
);
