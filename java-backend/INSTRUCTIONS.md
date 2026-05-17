# Java Spring Boot Migration Guide for Lovable (Antigravity) LMS/CRM Platform

Loyiha Supabase o'rniga Java Spring Boot 3.x backendiga ko'chirilmoqda. Men quyidagi core qismlarni yozdim:

## Yaratilgan komponentlar:
1. **Roles Enum:** `AppRole` (SuperAdmin, Admin, Teacher, Student, Parent, Manager, Support).
2. **Entities:** `User`, `Profile`, `Organization`.
3. **Repositories:** `UserRepository`, `ProfileRepository`, `OrganizationRepository`.
4. **Security & JWT:** `SecurityConfig`, `JwtTokenProvider`, `JwtTokenFilter`, `CustomUserDetailsService`.
5. **Auth Service & Controller:** `AuthService`, `AuthController` (Login uchun `LoginRequest` va `LoginResponse` DTOlari bilan).
6. **Exception Handling:** Custom `GlobalExceptionHandler`, `ErrorResponse`, `ResourceNotFoundException`.
7. **Config:** `application.yml` (PostgreSQL va JWT config), `WebConfig` (CORS), `OpenApiConfig` (Swagger).
8. **DB Migrations:** Liquibase YAML fayllari `db/changelog`.
9. **API Endpoint Security:** `UserProfileController` da namuna ko'rsatilgan `@PreAuthorize("hasAnyRole(...)")`.

## Frontend (Lovable/Vite/Axios) konfiguratsiyasini o'zgartirish

Frontendni yangi Java Backend-ga ulash uchun quyidagi o'zgarishlarni qilishingiz kerak:

1. **`.env` faylini o'zgartirish:**
Supabase URL o'rniga o'zimizning Spring Boot serverni ko'rsatamiz:
```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

2. **Supabase client o'rniga Axios yaratish:**
`src/lib/api.ts` (yoki `axios.ts` / `http.ts` faylini yarating):
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: JWT tokenni qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: 401 Unauthorized handle qilish (logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
```

3. **Login funksiyasini yangilash:**
```typescript
import api from '@/lib/api';

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { accessToken, user } = response.data;
  
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
};
```

4. **Ma'lumot olish (Masalan Profile):**
```typescript
import api from '@/lib/api';

export const getProfile = async () => {
  const response = await api.get('/user/profile');
  return response.data;
};
```

## Keyingi qadamlar (Batafsil arxitektura)
Siz qolgan entity-larni (Lesson, Grade, Attendance, Payment) Supabase-ning `public` jadvallariga mos ravishda, yuqoridagi `User` va `Profile` entity-laridan o'rnak olgan holda yaratib chiqsangiz bo'ladi. Service qatlamida esa mantiqlarni, Controller-larda esa Role-based ruxsatlarni (`@PreAuthorize`) bersangiz yetarli.
