# Frontend-to-Backend Migration Plan

## 1. Reverse Engineering (Database Schema)

Based on the Supabase `types.ts` and general LMS knowledge, we need the following JPA Entities (in addition to the already created `User`, `Profile`, `Organization`, `UserRole`):

### Core Entities
1.  **Subject:** Categories of learning (e.g., Math, IELTS).
    *   Fields: `id`, `name`, `organization_id`, `created_at`, `updated_at`.
2.  **Group:** Student classes.
    *   Fields: `id`, `name`, `description`, `color`, `is_active`, `organization_id`, `created_by`, `created_at`, `updated_at`.
3.  **GroupMember:** Mapping students to groups.
    *   Fields: `id`, `group_id`, `student_id`, `organization_id`, `joined_at`.
4.  **GroupTeacher:** Mapping teachers to groups.
    *   Fields: `id`, `group_id`, `teacher_id`, `subject_id`, `organization_id`, `assigned_at`.
5.  **Lesson:** Individual class sessions.
    *   Fields: `id`, `title`, `description`, `group_id`, `subject_id`, `teacher_id`, `room`, `starts_at`, `ends_at`, `is_canceled`, `organization_id`, `created_by`, `created_at`, `updated_at`.
6.  **Attendance:** Student presence in lessons.
    *   Fields: `id`, `lesson_id`, `student_id`, `status` (ENUM: present, absent, late, excused), `note`, `marked_by`, `organization_id`, `created_at`, `updated_at`.
7.  **Grade:** Student scores.
    *   Fields: `id`, `student_id`, `teacher_id`, `subject_id`, `lesson_id`, `score`, `max_score`, `comment`, `organization_id`, `created_at`, `updated_at`.
8.  **Event:** Calendar events.
    *   Fields: `id`, `title`, `description`, `location`, `starts_at`, `ends_at`, `all_day`, `color`, `organization_id`, `created_by`, `created_at`, `updated_at`.

### Communication & Feedback
9.  **Message / MessageRead:** Direct messages.
    *   Fields: `id`, `subject`, `body`, `sender_id`, `recipient_id`, `parent_id`, `is_broadcast`, `organization_id`, `created_at`.
10. **ChatThread / ChatParticipant / ChatMessage:** Group chats.
    *   Fields: `id`, `title`, `group_id`, `is_group`, `organization_id`, `created_by`, `created_at`, `updated_at`.
11. **Feedback:** Reviews/feedback between users.
    *   Fields: `id`, `title`, `body`, `type` (ENUM), `student_id`, `teacher_id`, `organization_id`, `created_at`.

### Financials
12. **Invoice:** Billing.
    *   Fields: `id`, `invoice_number`, `amount`, `currency`, `status`, `description`, `due_date`, `paid_at`, `organization_id`, `created_by`, `created_at`, `updated_at`.
13. **Payment:** Transactions.
    *   Fields: `id`, `invoice_id`, `student_id`, `amount`, `method`, `status`, `transaction_ref`, `organization_id`, `created_at`.

### Gamification & Testing (Optional/Advanced)
14. **CoinTransaction:** Gamification points.
    *   Fields: `id`, `student_id`, `amount`, `reason`, `source`, `awarded_by`, `meta`, `organization_id`, `created_at`.
15. **MockTest / MockQuestion / MockAttempt / MockAnswer:** IELTS/Testing module.
    *   (Can be implemented in Phase 2)

## 2. API Mapping & REST Controllers

We need the following Controllers based on the roles and pages:

### SuperAdmin & Admin Controllers (ROLE_SUPER_ADMIN, ROLE_ADMIN)
*   `AdminOrganizationController`: CRUD for organizations.
*   `AdminUserController`: Manage all users, assign roles (`/api/v1/admin/users`).
*   `AdminGroupController`: Manage groups and assignments (`/api/v1/admin/groups`).
*   `AdminSubjectController`: Manage subjects (`/api/v1/admin/subjects`).
*   `AdminFinancialController`: Manage invoices and overview (`/api/v1/admin/invoices`).

### Teacher Controllers (ROLE_TEACHER)
*   `TeacherGroupController`: View assigned groups and students (`/api/v1/teacher/groups`).
*   `TeacherLessonController`: Manage lessons (`/api/v1/teacher/lessons`).
*   `TeacherAttendanceController`: Mark attendance (`/api/v1/teacher/attendance`).
*   `TeacherGradeController`: Give grades/scores (`/api/v1/teacher/grades`).

### Student Controllers (ROLE_STUDENT)
*   `StudentDashboardController`: Overview of upcoming lessons, recent grades.
*   `StudentLessonController`: View schedule (`/api/v1/student/lessons`).
*   `StudentGradeController`: View own grades (`/api/v1/student/grades`).
*   `StudentAttendanceController`: View own attendance (`/api/v1/student/attendance`).
*   `StudentFinancialController`: View own invoices/payments (`/api/v1/student/invoices`).

### Parent Controllers (ROLE_PARENT)
*   `ParentChildrenController`: View linked students (`/api/v1/parent/children`).
*   *(Will reuse Student endpoints by passing child_id, protected by authorization logic)*

### Common Controllers (Authenticated Users)
*   `UserProfileController`: Edit own profile (`/api/v1/user/profile`).
*   `ChatController`: Messaging system (`/api/v1/chat`).
*   `EventController`: Calendar viewing (`/api/v1/events`).

## 3. Role Logic (Spring Security `@PreAuthorize`)

We will use method-level security in Spring Boot. Examples:

*   **Super Admin only:** `@PreAuthorize("hasRole('SUPER_ADMIN')")`
*   **Admins:** `@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")`
*   **Teachers:** `@PreAuthorize("hasRole('TEACHER')")`
*   **Students:** `@PreAuthorize("hasRole('STUDENT')")`
*   **Cross-role data access (e.g., viewing a group):**
    ```java
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or " +
                  "(hasRole('TEACHER') and @securityService.isTeacherOfGroup(#groupId)) or " +
                  "(hasRole('STUDENT') and @securityService.isMemberOfGroup(#groupId))")
    @GetMapping("/{groupId}")
    public GroupDto getGroup(@PathVariable UUID groupId) { ... }
    ```

## 4. Compatibility (DTOs)

The frontend expects specific JSON structures (snake_case or camelCase depending on axios setup). Since Supabase returns `snake_case`, but Java conventionally uses `camelCase`, we have two options:
1.  **Configure Jackson to use snake_case globally:**
    `spring.jackson.property-naming-strategy=SNAKE_CASE` in `application.yml`.
    *(Recommended for minimizing frontend changes).*
2.  **Update Frontend Axios:** Use a transformer to convert snake_case to camelCase.

We will go with **Option 1 (Jackson SNAKE_CASE)** so the frontend interfaces (like `student_id`, `created_at`) match exactly without rewriting all React components.

## 5. Full Stack Integration (Axios Config)

To disconnect from Supabase and connect to Spring Boot, the frontend needs this configuration:

**1. Create `src/lib/axios.ts`:**
```typescript
import axios from 'axios';

// The base URL pointing to your Spring Boot server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/auth'; // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

**2. Replace Supabase calls:**
Instead of `supabase.from('lessons').select('*')`, the frontend will do:
```typescript
const response = await api.get('/teacher/lessons');
const lessons = response.data;
```
*(This requires replacing React Query `queryFn` implementations across the frontend).*
