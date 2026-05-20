# SuperAdmin Section - Quick Reference & Execution Checklist

## Quick Navigation

### Main Files Reference

| What | File | Lines |
|------|------|-------|
| Organization CRUD | `src/pages/super-admin/Organizations.tsx` | ~550 |
| Package Management | `src/pages/super-admin/Packages.tsx` | ~300 |
| User Management Core | `src/pages/super-admin/UsersManager.tsx` | ~800+ |
| Organization Settings | `src/components/OrganizationSettingsModal.tsx` | ~100 |
| Logo Upload | `src/components/LogoUpload.tsx` | ~80 |
| API Configuration | `src/lib/axios.ts` | ~70 |
| Auth Config | `src/lib/auth.ts` | ~50 |

### Pages (23 Total)

**User Management**:
- `AllUsers.tsx` - All users wrapper
- `Students.tsx` - Students wrapper (UsersManager with role filter)
- `Teachers.tsx` - Teachers wrapper
- `Administrators.tsx` - Administrators wrapper
- `Admins.tsx` - Admins wrapper
- `Parents.tsx` - Parents page
- `RegularUsers.tsx` - Regular users wrapper
- `PackManagers.tsx` - Payment managers

**Business Management**:
- `Organizations.tsx` ⭐ Main - Organization CRUD
- `Packages.tsx` ⭐ Main - Subscription packages
- `Finance.tsx` - Financial tracking
- `PaymentReceivers.tsx` - Payment receiver management

**System**:
- `Dashboard.tsx` - Main dashboard
- `Profile.tsx` - Admin profile
- `AuditLogs.tsx` - Audit logging
- `Calendar.tsx` - Calendar management
- `Messages.tsx` - System messages
- `Subscriptions.tsx` - Subscription management
- `PricingPlans.tsx` - Pricing management
- `TelegramLinks.tsx` - Telegram integration
- `LMSNews.tsx` - News/announcements
- `StartupPitch.tsx` - Startup info
- `WelcomeBanner.tsx` - Dashboard banner component

---

## Data Models at a Glance

### Organization
```typescript
{
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: {
    region: string;
    district: string;
    streetAddress: string;
    fullAddress?: string;
  };
  phone?: string;
  email: string;
  logo_url?: string;
  plan_id?: string;
  is_active: boolean;
  created_at: string;
}
```

### User
```typescript
{
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  phone_number?: string;
  organization_id?: string;
  group_id?: string;
  subject?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  card_number?: string; // Required for admin/administrator
  card_holder?: string; // Required for admin/administrator
  role: AppRole;
  created_at: string;
}
```

### Package
```typescript
{
  id: string;
  name: string;
  description?: string;
  price: number;
  maxOrganizations?: number;
  maxStudents?: number;
  maxTeachers?: number;
}
```

### AppRole
```typescript
"super_admin" | "admin" | "administrator" | "teacher" 
| "student" | "user" | "parent" | "payment_manager" | "pack_manager"
```

---

## API Endpoints Quick Reference

### Organizations
```
GET    /organizations                 - List (with pagination/search)
POST   /organizations                 - Create
PUT    /organizations/{id}            - Update
DELETE /organizations/{id}            - Delete
```

### Packages
```
GET    /super-admin/packages          - List
POST   /super-admin/packages          - Create
PUT    /super-admin/packages/{id}     - Update
DELETE /super-admin/packages/{id}     - Delete
```

### Users
```
GET    /admin/users/all               - All users (paginated)
GET    /admin/users/by-role/{role}    - Users by role (paginated)
POST   /admin/users                   - Create user
PUT    /admin/users/{id}              - Update user
DELETE /admin/users/{id}              - Delete user
```

### Groups
```
GET    /admin/organizations/{orgId}/groups  - Org's groups
GET    /admin/groups                        - All groups (filtered)
```

### Files
```
POST   /files/upload                  - Upload file (multipart/form-data)
```

---

## Common Operations Checklist

### When Adding a New SuperAdmin Page

- [ ] Create page file in `src/pages/super-admin/`
- [ ] Define TypeScript interfaces for data models
- [ ] Create Zod schema for form validation
- [ ] Set up useState for form state and UI state (open, editing, loading, page, etc)
- [ ] Create useQuery for data fetching with React Query
- [ ] Create useMutation for create/update/delete operations
- [ ] Implement error handling (toast messages)
- [ ] Add query invalidation on success
- [ ] Create Dialog form component
- [ ] Implement search/filter/pagination if needed
- [ ] Add loading states (skeletons, disabled buttons)
- [ ] Test form validation with Zod
- [ ] Test API calls with error scenarios

### When Adding Form Validation

- [ ] Import `z` from zod
- [ ] Define schema with required/optional fields
- [ ] Add .min() / .max() / .regex() / .email() as needed
- [ ] Use .superRefine() for complex cross-field validation
- [ ] Call `schema.safeParse(form)` before API call
- [ ] Display first error with `toast.error(parsed.error.errors[0].message)`
- [ ] Show validation error in toast, not in UI field (pattern used in project)

### When Calling API

- [ ] Use `api.get()`, `api.post()`, `api.put()`, `api.delete()`
- [ ] Pass params in second argument: `api.get(url, { params: {...} })`
- [ ] Wrap in try-catch or use mutation error handler
- [ ] On error: `error.response?.data?.message` for backend error
- [ ] Show toast: `toast.error(message)`
- [ ] On success: `toast.success(message)`
- [ ] Invalidate React Query: `queryClient.invalidateQueries({ queryKey: ["key"] })`
- [ ] Reset form: `resetForm()`
- [ ] Close dialog: `setOpen(false)`

### When Handling Pagination

- [ ] Store page state: `const [page, setPage] = useState(0)` (0-based)
- [ ] Add query params: `{ page, size: 10 }`
- [ ] Calculate has next/prev: `page < totalPages - 1`, `page > 0`
- [ ] Handle page change: `setPage(p => p + 1)` or `setPage(p => p - 1)`
- [ ] Display current page: `Page ${page + 1} / ${totalPages}`
- [ ] Disable buttons at boundaries: `disabled={page === 0}`, `disabled={page >= totalPages - 1}`

### When Handling Search

- [ ] Use debounce hook: `const debouncedSearch = useDebounce(search, 300)`
- [ ] Reset page on search change: `useEffect(() => setPage(0), [debouncedSearch])`
- [ ] Pass to query: `queryKey: ["items", debouncedSearch, page]`
- [ ] Pass to API: `params: { query: debouncedSearch }`
- [ ] Enable query only if search exists: `enabled: debouncedSearch.length > 0`

### When Handling File Upload

- [ ] Create FormData: `const formData = new FormData()`
- [ ] Append file: `formData.append("file", file)`
- [ ] POST with headers: `api.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })`
- [ ] Validate: file type, file size (< 2MB)
- [ ] Handle response: URL string returned
- [ ] Store in form: `setForm(f => ({ ...f, logo_url: url }))`

---

## Error Messages Used (Reference)

### Organization
- "Tashkilot nomi majburiy" - Organization name required
- "Nom kamida 2 ta belgi" - Name at least 2 characters
- "Faqat kichik harflar, raqam va '-'" - Only lowercase, numbers, dash
- "Viloyat tanlanishi shart" - Region selection required
- "Tuman/Shahar kiritilishi shart" - District required
- "Mahalla/Ko'cha kiritilishi shart" - Street address required
- "Email noto'g'ri" - Invalid email

### User
- "Email majburiy" - Email required
- "Email noto'g'ri" - Invalid email
- "Username kamida 3 ta belgi" - Username at least 3 characters
- "Parol kamida 6 ta belgi" - Password at least 6 characters
- "F.I.O kiriting" - Enter full name
- "Telefon kiriting" - Enter phone
- "Admin/Administrator uchun Karta raqami majburiy!" - Card number required for admin
- "Karta raqami 16 ta raqam bo'lishi kerak" - Card must be 16 digits

### API
- "Yuklashda xatolik" - Error loading
- "Saqlashda xatolik" - Error saving
- "O'chirishda xatolik" - Error deleting
- "Sizda yetarli huquqlar yo'q" - Insufficient permissions
- "AI serverlari band" - AI servers busy (503)

### Success
- "Yangilandi" - Updated
- "Qo'shildi" - Added
- "O'chirildi" - Deleted
- "Logo yuklandi" - Logo uploaded
- "Muvaffaqiyatli qo'shildi" - Successfully added
- "Muvaffaqiyatli yangilandi" - Successfully updated
- "Muvaffaqiyatli o'chirildi" - Successfully deleted

---

## React Query Pattern (Copy-Paste Template)

### Query
```typescript
const { data = [], isLoading, error } = useQuery({
  queryKey: ["entity-name", filter, page, search],
  queryFn: async () => {
    const { data } = await api.get("/endpoint", {
      params: { page, size: 10, query: search }
    });
    return data;
  },
  enabled: !!dependency // Optional: only fetch if condition met
});
```

### Mutation (Create/Update)
```typescript
const mutation = useMutation({
  mutationFn: async (payload) => {
    if (editing) {
      return api.put(`/endpoint/${editing.id}`, payload);
    }
    return api.post("/endpoint", payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["entity-name"] });
    toast.success(editing ? "Yangilandi" : "Qo'shildi");
    setOpen(false);
    resetForm();
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "Xatolik yuz berdi");
  }
});
```

### Mutation (Delete)
```typescript
const deleteMutation = useMutation({
  mutationFn: async (id: string) => api.delete(`/endpoint/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["entity-name"] });
    toast.success("O'chirildi");
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "O'chirishda xatolik");
  }
});
```

---

## Zod Schema Template

```typescript
const schema = z.object({
  // Text fields
  name: z.string({ required_error: "Nomi majburiy" })
    .trim()
    .min(2, "Nomi kamida 2 ta belgi")
    .max(100, "Nomi 100 tadan oshmasligi kerak"),
  
  // Email
  email: z.string({ required_error: "Email majburiy" })
    .email("Email noto'g'ri"),
  
  // Phone
  phone: z.string().max(20, "Telefon 20 tadan oshmasligi kerak").optional(),
  
  // Enum/Select
  role: z.enum(["student", "teacher", "admin"], { required_error: "Role majburiy" }),
  
  // Optional text
  description: z.string().max(500).optional().or(z.literal("")),
  
  // UUID
  organizationId: z.string().uuid("UUID noto'g'ri").optional().or(z.literal("")),
  
}).superRefine((data, ctx) => {
  // Custom validation logic
  if (data.role === "admin" && !data.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Admin uchun telefon majburiy",
      path: ["phone"]
    });
  }
});
```

---

## Common UI Patterns Used

### Search Input
```tsx
<div className="relative w-full sm:max-w-xs">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Qidirish..."
    className="pl-9"
  />
</div>
```

### Loading Grid (Skeleton)
```tsx
{loading ? (
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass rounded-2xl p-5 animate-pulse space-y-4">
        <div className="h-12 w-12 rounded-xl bg-muted/40" />
        <div className="h-5 w-3/4 rounded bg-muted/50" />
      </div>
    ))}
  </div>
) : (
  // Content
)}
```

### Empty State
```tsx
{data.length === 0 ? (
  <div className="glass rounded-2xl p-16 text-center">
    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <p className="font-display text-lg">Hali ma'lumot yo'q</p>
    <Button variant="hero" onClick={openCreate}>
      <Plus className="h-4 w-4" /> Yangi qo'shish
    </Button>
  </div>
) : (
  // List
)}
```

### Confirmation Dialog
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button size="icon" variant="ghost" className="text-destructive">
      <Trash2 className="h-4 w-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
      <AlertDialogDescription>
        Bu amalni qaytarib bo'lmaydi.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Bekor</AlertDialogCancel>
      <AlertDialogAction onClick={() => delete()} className="bg-destructive">
        O'chirish
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Debugging Tips

### Check API Call
```typescript
// In axios.ts interceptor - already logs all requests
console.log(`🚀 [API REQUEST]: ${method} ${url}`);
```

### Check Zod Validation
```typescript
const parsed = schema.safeParse(form);
console.log("Validation result:", parsed);
if (!parsed.success) {
  console.log("Errors:", parsed.error.errors);
}
```

### Check React Query Cache
```typescript
// In component
const state = queryClient.getQueryData(["users", page, search]);
console.log("Cached data:", state);
```

### Check Form State
```typescript
// Add this to help identify form issues
console.log("Current form:", form);
console.log("Editing:", editing);
```

---

## Performance Tips

### 1. Use Debounce for Search
```typescript
const debouncedSearch = useDebounce(search, 300);
// This prevents 1 API call per keystroke
```

### 2. Only Fetch When Ready
```typescript
enabled: !!selectedOrgId // Don't fetch groups until org is selected
```

### 3. Memoize List Items
```typescript
const Item = memo(({ item, onEdit }) => (...));
// Prevents re-rendering unchanged items
```

### 4. Use Proper Query Keys
```typescript
// Specific query keys prevent cache conflicts
queryKey: ["users", role, page, search, orgId]
```

---

## Important Reminders

⚠️ **Always**:
- Validate form with Zod before API call
- Invalidate related queries after mutations
- Reset form and close dialog on success
- Show toast messages for feedback
- Handle errors with try-catch or mutation error handlers
- Use proper loading states (disable buttons, show spinners)

⚠️ **Never**:
- Pass raw form data to API (validate first)
- Forget to reset pagination when search changes
- Leave API errors silently failing
- Create infinite queries without enabled condition
- Hardcode magic numbers (use constants)

✅ **Best Practices**:
- Follow established patterns - don't reinvent
- Keep components focused (one responsibility)
- Extract repeated logic into hooks/utilities
- Use TypeScript interfaces for all data
- Document complex validation logic
- Test error scenarios, not just happy path

---

## Resources

**Documentation Files Created**:
1. `SUPERADMIN_OVERVIEW.md` - Complete architecture guide
2. `SUPERADMIN_API_REFERENCE.md` - All endpoints documented
3. `SUPERADMIN_DEVELOPMENT_GUIDE.md` - Code patterns & examples

**Key Source Files**:
- `src/pages/super-admin/Organizations.tsx` - Reference for CRUD pattern
- `src/pages/super-admin/UsersManager.tsx` - Reference for complex forms
- `src/lib/axios.ts` - API & error handling setup
- `src/lib/auth.ts` - Role & auth definitions
