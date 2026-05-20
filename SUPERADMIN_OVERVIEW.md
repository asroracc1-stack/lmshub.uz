# SuperAdmin Section - Comprehensive Overview

## Project Location
`c:\Users\asus\LMSHub.uz`

---

## 1. SuperAdmin Directory Structure

### Main Directory
```
src/pages/super-admin/
├── Dashboard.tsx
├── Organizations.tsx          # ⭐ Main org management
├── Packages.tsx              # ⭐ Subscription packages CRUD
├── UsersManager.tsx          # ⭐ Core user management component
├── AllUsers.tsx              # Wrapper for UsersManager
├── Students.tsx              # Wrapper: UsersManager(filterRole="student")
├── Teachers.tsx              # Wrapper: UsersManager(filterRole="teacher")
├── Administrators.tsx        # Wrapper: UsersManager(filterRole="administrator")
├── Admins.tsx                # Wrapper: UsersManager(filterRole="admin")
├── Parents.tsx               # Parent-specific page
├── RegularUsers.tsx          # Wrapper: UsersManager(filterRole="user")
├── PackManagers.tsx          # Payment managers
├── PaymentReceivers.tsx      # Payment receiver management
├── Finance.tsx               # Financial tracking
├── AuditLogs.tsx             # Audit logging
├── Calendar.tsx              # Calendar management
├── Messages.tsx              # System messages
├── Profile.tsx               # Admin profile settings
├── LMSNews.tsx               # News/announcements
├── Subscriptions.tsx         # Subscription management
├── PricingPlans.tsx          # Pricing plan management
├── TelegramLinks.tsx         # Telegram integration
└── StartupPitch.tsx          # Startup information

src/components/super-admin/
└── WelcomeBanner.tsx         # Dashboard welcome banner
```

---

## 2. Key Components & Their Responsibilities

### A. Organizations.tsx (Lines 1-550+)
**Purpose**: Complete CRUD for Organizations (Tashkilot)

#### Interfaces:
```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: { 
    region: string; 
    district: string; 
    streetAddress: string; 
    fullAddress?: string;
  } | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  plan_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}
```

#### Zod Schema for Organizations:
```typescript
const orgSchema = z.object({
  name: z.string({ required_error: "Tashkilot nomi majburiy" })
    .trim()
    .min(2, "Nom kamida 2 ta belgi")
    .max(100),
  slug: z.string({ required_error: "Slug majburiy" })
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Faqat kichik harflar, raqam va '-'"),
  description: z.string().max(500).optional(),
  address: z.object({
    region: z.string().min(1, "Viloyat tanlanishi shart"),
    district: z.string().min(1, "Tuman/Shahar kiritilishi shart"),
    streetAddress: z.string().min(1, "Mahalla/Ko'cha kiritilishi shart")
  }).nullable().optional(),
  phone: z.string().max(30).optional(),
  email: z.string({ required_error: "Email majburiy" })
    .email("Email noto'g'ri")
    .min(1, "Email kiritish majburiy"),
  plan_id: z.string().uuid().optional().or(z.literal("")),
});
```

#### API Endpoints Used:
- **GET** `/organizations` - Fetch organizations with pagination & search
- **POST** `/organizations` - Create new organization
- **PUT** `/organizations/{id}` - Update organization
- **DELETE** `/organizations/{id}` - Delete organization
- **GET** `/super-admin/packages` - Fetch available packages

#### Data Flow:
```
User Input → Form State (setForm) 
  → Zod Validation (orgSchema.safeParse)
  → API Call (api.post/put)
  → Error Handling (toast.error/success)
  → React Query Invalidation (queryClient.invalidateQueries)
  → Component Re-render
```

#### Key Features:
- ✅ Search functionality (real-time)
- ✅ Pagination (page size: 10)
- ✅ Logo upload via `LogoUpload` component
- ✅ Address management (Region/District/Street)
- ✅ Plan association
- ✅ Active/Inactive toggle
- ✅ Confirmation dialogs for deletion
- ✅ Auto-slug generation from name

---

### B. Packages.tsx (Subscription Management)
**Purpose**: CRUD for subscription packages

#### Interfaces:
```typescript
interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxOrganizations: number | null;
  maxStudents: number | null;
  maxTeachers: number | null;
}
```

#### API Endpoints:
- **GET** `/super-admin/packages` - Fetch all packages
- **POST** `/super-admin/packages` - Create package
- **PUT** `/super-admin/packages/{id}` - Update package
- **DELETE** `/super-admin/packages/{id}` - Delete package

#### Form State:
```typescript
{
  name: string;
  description: string;
  price: string;
  maxOrganizations: string;
  maxStudents: string;
  maxTeachers: string;
}
```

#### React Query Pattern:
```typescript
// Fetch query
const { data: packages = [], isLoading } = useQuery<SubscriptionPackage[]>({
  queryKey: ["packages"],
  queryFn: async () => {
    const { data } = await api.get("/super-admin/packages");
    return data;
  }
});

// Mutation for create/update
const mutation = useMutation({
  mutationFn: async (payload: any) => {
    if (editing) {
      return api.put(`/super-admin/packages/${editing.id}`, payload);
    }
    return api.post("/super-admin/packages", payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["packages"] });
    toast.success(editing ? "Tarif muvaffaqiyatli yangilandi!" : "Yangi tarif qo'shildi!");
    setOpen(false);
    resetForm();
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "Xatolik yuz berdi");
  }
});
```

---

### C. UsersManager.tsx (Core User Management)
**Purpose**: Universal user CRUD component used across multiple pages

#### Key Interfaces:
```typescript
interface UserRow {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone_number: string | null;
  organization_id: string | null;
  group_id: string | null;
  subject: string | null;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  card_number?: string | null;
  card_holder?: string | null;
  role: AppRole;
  created_at: string;
}

interface Org {
  id: string;
  name: string;
}
```

#### Zod Schema for User Creation:
```typescript
const createSchema = z.object({
  email: z.string().email("Email noto'g'ri"),
  username: z.string().min(3, "Username kamida 3 ta belgi").max(50),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100),
  full_name: z.string().min(2, "F.I.O kiriting").max(100),
  role: z.enum([
    "super_admin", "admin", "administrator", 
    "teacher", "student", "user", "parent", "payment_manager"
  ]),
  phone_number: z.string().min(5).max(30),
  organization_id: z.string().uuid().optional().or(z.literal("")),
  group_id: z.string().optional().or(z.literal("")),
  subject: z.string().optional().or(z.literal("")),
  telegram_chat_id: z.string().optional().or(z.literal("")),
  telegram_username: z.string().optional().or(z.literal("")),
  card_number: z.string().optional().or(z.literal("")),
  card_holder: z.string().optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  // Custom validation: Admins require card details
  if (val.role === "admin" || val.role === "administrator") {
    if (!val.card_number || val.card_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta raqami majburiy!",
        path: ["card_number"],
      });
    }
    if (!val.card_holder || val.card_holder.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta egasi ismi majburiy!",
        path: ["card_holder"],
      });
    }
    // Card must be 16 digits
    if (val.card_number && val.card_number.replace(/\D/g, "").length !== 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Karta raqami 16 ta raqam bo'lishi kerak",
        path: ["card_number"],
      });
    }
  }
});
```

#### API Endpoints:
- **GET** `/admin/users/all` - All users
- **GET** `/admin/users/by-role/{role}` - Users by role
- **POST** `/admin/users` - Create user
- **PUT** `/admin/users/{id}` - Update user
- **DELETE** `/admin/users/{id}` - Delete user
- **GET** `/organizations` - Fetch organizations list
- **GET** `/admin/organizations/{orgId}/groups` - Fetch groups
- **GET** `/admin/groups` - Fetch all groups

#### React Query Patterns:
```typescript
// Users query with search & pagination
const { data, isLoading } = useQuery({
  queryKey: ["users", filterRole, page, debouncedSearch, orgIdParam],
  queryFn: async () => {
    const endpoint = filterRole 
      ? `/admin/users/by-role/${filterRole.toUpperCase()}` 
      : "/admin/users/all";
    
    const { data } = await api.get<any>(endpoint, { 
      params: { 
        page, 
        size: pageSize, 
        query: debouncedSearch || "",
        search: debouncedSearch || "",
        organizationId: orgIdParam || profile?.organization_id,
      } 
    });
    return data;
  },
});

// User mutation
const mutation = useMutation({
  mutationFn: async (payload: any) => {
    if (editing) {
      return api.put(`/admin/users/${editing.id}`, payload);
    }
    return api.post("/admin/users", payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    toast.success(editing ? "Foydalanuvchi muvaffaqiyatli yangilandi" : "Foydalanuvchi qo'shildi");
    setOpen(false);
    reset();
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "Xatolik yuz berdi");
  },
});
```

#### Page Wrapper Pattern:
Used in `Students.tsx`, `Teachers.tsx`, `Administrators.tsx`:
```typescript
export default function Students() {
  return <UsersManager 
    filterRole="student" 
    title="Talabalar" 
    description="Tizimdagi barcha talabalar" 
  />;
}
```

---

### D. Related Components

#### OrganizationSettingsModal.tsx
**Purpose**: Settings modal for organization details

#### LogoUpload.tsx
**Purpose**: Reusable logo upload component

#### Key Features:
- Image file validation (only image/* types)
- Size validation (max 2MB)
- Base64 preview
- API upload to `/files/upload`
- Error handling for upload failures

---

## 3. Zod Schema Definitions Summary

| Entity | Location | Schema Type | Key Validations |
|--------|----------|------------|-----------------|
| **Organization** | Organizations.tsx | `z.object()` | name(2-100), slug(2-50, alphanumeric-dash), email, address object, phone optional, plan_id optional |
| **User** | UsersManager.tsx | `z.object().superRefine()` | email, username(3-50), password(6-100), role enum, phone, card validation for admins |
| **Subscription Package** | Packages.tsx | Manual validation | name, price required, maxOrganizations/maxStudents/maxTeachers optional |

---

## 4. API Integration Architecture

### Base Configuration (`src/lib/axios.ts`)

```typescript
const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
```

### Request Interceptor:
- ✅ Automatically adds `Authorization: Bearer {token}` header
- ✅ Debug logging for all requests

### Response Interceptor (Error Handling):
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Status-specific error handling:
    if (status === 401) {
      // Unauthorized → Clear storage & redirect to auth
      localStorage.clear();
      window.location.href = '/auth';
    } else if (status === 403) {
      // Forbidden → Insufficient permissions
      toast.error('Kirish rad etildi: Sizda yetarli huquqlar yo\'q');
    } else if (status === 503) {
      // Service unavailable
      toast.error('AI serverlari band, iltimos 1 daqiqadan so\'ng qayta urinib ko\'ring');
    } else if (status >= 500) {
      // Server error
      toast.error(`Server xatosi (${status}): Iltimos, keyinroq urinib ko'ring`);
    } else if (status >= 400) {
      // Client error
      toast.error(`Xatolik: ${message}`);
    }

    return Promise.reject(error);
  }
);
```

---

## 5. Error Handling Patterns

### Form Validation Errors (Zod):
```typescript
const parsed = orgSchema.safeParse(form);
if (!parsed.success) {
  toast.error(parsed.error.errors[0].message);
  return;
}
```

### API Call Error Handling:
```typescript
try {
  if (editing) {
    await api.put(`/organizations/${editing.id}`, payload);
    toast.success("Yangilandi");
  } else {
    await api.post("/organizations", payload);
    toast.success("Qo'shildi");
  }
} catch (error: any) {
  toast.error(error.response?.data?.message || "Saqlashda xatolik");
} finally {
  setSubmitting(false);
}
```

### React Query Mutation Error Handling:
```typescript
const mutation = useMutation({
  mutationFn: async (payload) => api.post("/endpoint", payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["cache-key"] });
    toast.success("Success message");
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "Default error");
  }
});
```

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  React Component (Organizations.tsx)                     │
│  - Form State: useState(form)                            │
│  - UI State: useState(open, editing, loading, etc)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  User Interaction                                        │
│  - Input changes → Update form state                     │
│  - Submit button → Trigger validation                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Zod Validation                                          │
│  - Schema validation (orgSchema.safeParse)               │
│  - If error → Show toast.error & return                  │
│  - If success → Proceed to API call                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  API Call (axios instance)                              │
│  - POST /organizations (create)                          │
│  - PUT /organizations/{id} (update)                      │
│  - Request Interceptor adds Auth header                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Processing (Java)                              │
│  - Validate request payload                              │
│  - Process business logic                                │
│  - Return success/error response                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Response Interceptor                                    │
│  - Check status code                                     │
│  - If error → Toast error & handle appropriately         │
│  - If success → Return data                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Success Handler                                         │
│  - Show success toast                                    │
│  - Close dialog                                          │
│  - Reset form state                                      │
│  - Invalidate React Query cache                          │
│  - Component re-renders with fresh data                  │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Key Libraries & Technologies

| Library | Version | Purpose |
|---------|---------|---------|
| **React** | Latest | UI framework |
| **React Router** | Latest | Navigation |
| **@tanstack/react-query** | Latest | Server state management |
| **axios** | Latest | HTTP client |
| **zod** | Latest | Schema validation |
| **sonner** | Latest | Toast notifications |
| **shadcn/ui** | Latest | UI components |
| **Tailwind CSS** | Latest | Styling |

---

## 8. Authentication & Authorization

### Role System (`src/lib/auth.ts`):
```typescript
export type AppRole =
  | "super_admin"
  | "admin"
  | "administrator"
  | "teacher"
  | "student"
  | "user"
  | "parent"
  | "payment_manager"
  | "pack_manager";

export const roleLabel: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  administrator: "Administrator",
  teacher: "O'qituvchi",
  student: "Talaba",
  // ... etc
};
```

### Auth Context (`src/contexts/AuthContext.tsx`):
- Manages user, profile, and role
- Used in components: `const { user: me, profile, role: myRole } = useAuth();`

---

## 9. File Upload System

### LogoUpload Component Flow:
```
User selects file
  ↓
File validation (type, size)
  ↓
Create FormData
  ↓
POST /files/upload
  ↓
Backend processes image
  ↓
Return URL
  ↓
Store in form state (logo_url)
  ↓
Display preview
```

### Endpoint:
- **POST** `/files/upload` - Upload files (images, documents, etc)

---

## 10. SuperAdmin Pages Quick Reference

| Page | Component | Purpose | Filter/Query |
|------|-----------|---------|-------------|
| AllUsers | UsersManager | All system users | None |
| Students | UsersManager | Student-only list | `filterRole="student"` |
| Teachers | UsersManager | Teacher-only list | `filterRole="teacher"` |
| Administrators | UsersManager | Administrator-only list | `filterRole="administrator"` |
| Admins | UsersManager | Admin-only list | `filterRole="admin"` |
| Organizations | Organizations | Org CRUD management | None |
| Packages | Packages | Package management | None |
| Finance | Finance | Financial tracking | None |
| AuditLogs | AuditLogs | System audit logs | None |
| PaymentReceivers | PaymentReceivers | Payment receiver management | None |
| Profile | Profile | Admin profile settings | None |

---

## 11. Important Constants & Configurations

### Region List (Organizations):
```typescript
const REGIONS = [
  "Toshkent sh.", "Toshkent vil.", "Andijon", "Farg'ona", 
  "Namangan", "Buxoro", "Xorazm", "Samarqand", 
  "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", 
  "Qoraqalpog'iston R."
];
```

### Pagination:
- Default page size: **10 items per page**
- Page numbering: **0-based** (page 0, page 1, etc)

### API Base URL:
- Development: `/api/v1` (proxied via Vite)
- Production: Backend URL configured in environment

---

## 12. Summary & Key Takeaways

### Architecture:
✅ **Separation of Concerns**: Each page has single responsibility (Organizations, Users, etc)
✅ **Reusable Components**: UsersManager used for multiple user type pages
✅ **Consistent Patterns**: All forms follow same validation → API → error handling pattern
✅ **React Query for Caching**: Efficient data management & automatic refetching

### Data Validation:
✅ **Zod Schemas**: Strong type safety & validation
✅ **Multi-level Validation**: Client-side (Zod) + Server-side (Backend)
✅ **Custom Validations**: superRefine for complex rules (e.g., admin card requirements)

### Error Handling:
✅ **Interceptors**: Centralized error handling in axios
✅ **Toast Notifications**: User-friendly error messages
✅ **Status-specific Handling**: Different responses for 401/403/500/etc

### API Integration:
✅ **Consistent Endpoints**: RESTful patterns (/resource, /resource/{id})
✅ **Pagination**: Consistent page/size parameters
✅ **Search/Filter**: Query parameters for filtering results

### State Management:
✅ **Form State**: Local useState for form inputs
✅ **UI State**: Dialog open/close, editing mode, loading states
✅ **Server State**: React Query for API data & caching
✅ **Auth State**: Context API for user/role information
