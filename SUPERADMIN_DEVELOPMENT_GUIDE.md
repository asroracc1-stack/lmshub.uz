# SuperAdmin Development Guide - Code Patterns & Examples

## Quick Start: Adding New CRUD Entity to SuperAdmin

### Step 1: Define Interfaces
```typescript
interface MyEntity {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

interface MyEntityForm {
  name: string;
  description: string;
  status: "active" | "inactive";
}
```

### Step 2: Create Zod Schema
```typescript
import { z } from "zod";

const myEntitySchema = z.object({
  name: z.string({ required_error: "Nomi majburiy" })
    .trim()
    .min(2, "Nomi kamida 2 ta belgi bo'lishi kerak")
    .max(100, "Nomi 100 tadan oshmasligi kerak"),
  description: z.string()
    .max(500, "Tavsif 500 tadan oshmasligi kerak")
    .optional(),
  status: z.enum(["active", "inactive"], { required_error: "Status majburiy" }),
});
```

### Step 3: Create Page Component
```typescript
import { useState, useEffect } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function MyEntityPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MyEntity | null>(null);
  const [form, setForm] = useState<MyEntityForm>({
    name: "",
    description: "",
    status: "active",
  });

  // Fetch query
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-entities"],
    queryFn: async () => {
      const { data } = await api.get("/my-entities");
      return data;
    },
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (payload: MyEntityForm) => {
      if (editing) {
        return api.put(`/my-entities/${editing.id}`, payload);
      }
      return api.post("/my-entities", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      toast.success(editing ? "Muvaffaqiyatli yangilandi" : "Muvaffaqiyatli qo'shildi");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/my-entities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      toast.success("Muvaffaqiyatli o'chirildi");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik");
    },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", description: "", status: "active" });
  };

  const openEdit = (entity: MyEntity) => {
    setEditing(entity);
    setForm({
      name: entity.name,
      description: entity.description || "",
      status: entity.status,
    });
    setOpen(true);
  };

  const submit = () => {
    const parsed = myEntitySchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    mutation.mutate(parsed.data);
  };

  if (isLoading) {
    return <div>Yuklanyapti...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mening Entitylari</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="h-4 w-4 mr-2" /> Yangi qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Tahrirlash" : "Yangi yaratish"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nomi *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nomi kiritish"
                />
              </div>

              <div>
                <Label>Tavsif</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Qisqacha tavsif"
                />
              </div>

              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                  className="w-full p-2 border rounded"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Faolsiz</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                variant="hero"
                onClick={submit}
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {data.map((entity: MyEntity) => (
          <div key={entity.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{entity.name}</h3>
              <p className="text-sm text-gray-500">{entity.description}</p>
              <p className="text-xs text-gray-400">{entity.status === "active" ? "Faol" : "Faolsiz"}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => openEdit(entity)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-600"
                onClick={() => deleteMutation.mutate(entity.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Common Patterns

### 1. Debounced Search
```typescript
import { useDebounce } from "@/hooks/useDebounce";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300); // 300ms delay

const { data } = useQuery({
  queryKey: ["users", debouncedSearch, page],
  queryFn: async () => {
    const { data } = await api.get("/admin/users/all", {
      params: { 
        search: debouncedSearch,
        page,
        size: 10
      }
    });
    return data;
  },
  enabled: debouncedSearch.length > 0 // Only fetch if search has value
});

// In component
<Input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Qidirish..."
/>
```

### 2. Pagination
```typescript
const [page, setPage] = useState(0);
const [pageSize] = useState(10);

const { data } = useQuery({
  queryKey: ["items", page],
  queryFn: async () => {
    const { data } = await api.get("/items", {
      params: { page, size: pageSize }
    });
    return data;
  }
});

// Calculate pagination info
const totalPages = data?.totalPages || 0;
const hasNextPage = page < totalPages - 1;
const hasPrevPage = page > 0;

// In component
<div className="flex gap-2">
  <Button 
    onClick={() => setPage(p => p - 1)} 
    disabled={!hasPrevPage}
  >
    Oldingi
  </Button>
  <span>{page + 1} / {totalPages}</span>
  <Button 
    onClick={() => setPage(p => p + 1)} 
    disabled={!hasNextPage}
  >
    Keyingi
  </Button>
</div>
```

### 3. Conditional Fields in Form
```typescript
const [form, setForm] = useState({
  role: "student",
  cardNumber: "",
  cardHolder: "",
});

// Show card fields only for admin roles
const showCardFields = form.role === "admin" || form.role === "administrator";

return (
  <>
    {/* ... other fields ... */}
    {showCardFields && (
      <>
        <Input
          value={form.cardNumber}
          onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
          placeholder="Karta raqami"
        />
        <Input
          value={form.cardHolder}
          onChange={(e) => setForm({ ...form, cardHolder: e.target.value })}
          placeholder="Karta egasi ismi"
        />
      </>
    )}
  </>
);
```

### 4. Hierarchical Data Fetching
```typescript
// Organization → Groups dependency
const { data: orgs } = useQuery({
  queryKey: ["organizations"],
  queryFn: async () => {
    const { data } = await api.get("/organizations", { params: { size: 1000 } });
    return data.content || [];
  }
});

// Only fetch groups when organization is selected
const { data: groups } = useQuery({
  queryKey: ["groups", selectedOrgId],
  queryFn: async () => {
    const { data } = await api.get(`/admin/organizations/${selectedOrgId}/groups`);
    return data || [];
  },
  enabled: !!selectedOrgId // Don't fetch until org is selected
});
```

### 5. Form Prefill for Edit Mode
```typescript
const [editing, setEditing] = useState<Entity | null>(null);

useEffect(() => {
  if (editing) {
    setForm({
      name: editing.name,
      email: editing.email,
      phone: editing.phone || "",
      // ... fill all fields
    });
  }
}, [editing]);

const openEdit = (entity: Entity) => {
  setEditing(entity); // Triggers useEffect above
  setOpen(true);
};
```

---

## Error Handling Patterns

### Pattern 1: Client-Side Validation Error
```typescript
const parsed = schema.safeParse(form);
if (!parsed.success) {
  // Display first validation error
  toast.error(parsed.error.errors[0].message);
  return;
}
// Proceed with API call
```

### Pattern 2: API Error with Fallback
```typescript
catch (error: any) {
  // Prefer backend error message, fallback to generic message
  const message = error.response?.data?.message || "Xatolik yuz berdi";
  toast.error(message);
  
  // Optional: Log error for debugging
  console.error("Operation failed:", error);
}
```

### Pattern 3: Status-Specific Handling
```typescript
if (status === 401) {
  // Unauthorized - handled by interceptor, redirects to login
  return;
} else if (status === 403) {
  toast.error("Sizda yetarli huquqlar yo'q");
} else if (status === 409) {
  toast.error("Bu email/slug allaqachon mavjud");
} else if (status >= 500) {
  toast.error("Server xatosi. Keyinroq qayta urinib ko'ring");
}
```

### Pattern 4: Loading States
```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await api.post("/endpoint", data);
    toast.success("Muvaffaqiyatli");
  } catch (error) {
    toast.error("Xatolik");
  } finally {
    setLoading(false);
  }
};

// Disable button while loading
<Button disabled={loading}>
  {loading && <Loader2 className="animate-spin mr-2" />}
  Saqlash
</Button>
```

---

## React Query Best Practices

### 1. Consistent Query Keys
```typescript
// Good - hierarchical and specific
queryKey: ["users", role, page, search, orgId]
queryKey: ["organizations", page, search]
queryKey: ["packages"]

// Bad - too generic, can cause issues
queryKey: ["data"]
queryKey: ["items"]
```

### 2. Invalidate Related Queries
```typescript
onSuccess: () => {
  // Invalidate direct queries
  queryClient.invalidateQueries({ queryKey: ["users"] });
  
  // Invalidate dependent queries (e.g., dashboard stats)
  queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  
  // Show success message
  toast.success("Success");
  
  // Reset UI state
  setOpen(false);
  resetForm();
}
```

### 3. Conditional Queries
```typescript
const { data: groups = [] } = useQuery({
  queryKey: ["groups", orgId],
  queryFn: async () => {
    if (!orgId) return [];
    const { data } = await api.get(`/orgs/${orgId}/groups`);
    return data;
  },
  enabled: !!orgId // Only fetch if orgId exists
});
```

### 4. Mutation with Loading State
```typescript
const mutation = useMutation({
  mutationFn: async (payload) => api.post("/endpoint", payload),
  onSuccess: () => {
    toast.success("Success");
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || "Error");
  },
});

// Check loading state
<Button disabled={mutation.isPending}>
  {mutation.isPending && <Loader2 className="animate-spin" />}
  Save
</Button>
```

---

## Form Validation Examples

### Example 1: Basic Required Fields
```typescript
const schema = z.object({
  name: z.string()
    .min(1, "Nomi majburiy")
    .min(2, "Nomi kamida 2 ta belgi"),
  email: z.string()
    .min(1, "Email majburiy")
    .email("Email noto'g'ri")
});
```

### Example 2: Custom Pattern Validation
```typescript
const schema = z.object({
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, "Faqat kichik harflar, raqam va '-' ishlat")
});
```

### Example 3: Conditional Validation
```typescript
const schema = z.object({
  role: z.enum(["admin", "teacher", "student"]),
  cardNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "admin") {
    if (!data.cardNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin uchun karta raqami majburiy",
        path: ["cardNumber"]
      });
    }
  }
});
```

### Example 4: Dependent Field Validation
```typescript
const schema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ["confirmPassword"]
});
```

---

## Component Reusability

### Generic Dialog Form Component
```typescript
interface DialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  children: React.ReactNode;
}

export function DialogForm({
  open,
  onOpenChange,
  title,
  onSubmit,
  isSubmitting,
  children
}: DialogFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {children}
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="hero"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin mr-2" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage
<DialogForm
  open={open}
  onOpenChange={setOpen}
  title={editing ? "Tahrirlash" : "Yangi yaratish"}
  onSubmit={handleSubmit}
  isSubmitting={isSubmitting}
>
  {/* Form fields */}
</DialogForm>
```

---

## Testing Patterns

### Mock API Response
```typescript
import { rest } from "msw";
import { server } from "./mocks/server";

it("should load and display organizations", async () => {
  server.use(
    rest.get("/api/v1/organizations", (req, res, ctx) => {
      return res(
        ctx.json({
          content: [
            { id: "1", name: "PDP Academy" }
          ],
          totalPages: 1
        })
      );
    })
  );

  render(<Organizations />);
  
  await waitFor(() => {
    expect(screen.getByText("PDP Academy")).toBeInTheDocument();
  });
});
```

### Mock API Error
```typescript
server.use(
  rest.post("/api/v1/organizations", (req, res, ctx) => {
    return res(
      ctx.status(409),
      ctx.json({ message: "Bu slug allaqachon mavjud" })
    );
  })
);
```

---

## Performance Optimization

### 1. Memoization for List Items
```typescript
import { memo } from "react";

const OrganizationCard = memo(({ org, onEdit, onDelete }: Props) => (
  <div>
    {/* Render org */}
  </div>
));

// In parent
{orgs.map(org => (
  <OrganizationCard 
    key={org.id} 
    org={org} 
    onEdit={openEdit}
    onDelete={remove}
  />
))}
```

### 2. Defer Non-Critical Updates
```typescript
import { useDeferredValue } from "react";

const [search, setSearch] = useState("");
const debouncedSearch = useDeferredValue(search);

// UI updates immediately, query updates when debouncedSearch settles
```

### 3. Virtual Scrolling for Large Lists
```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});

const virtualItems = virtualizer.getVirtualItems();

<div ref={parentRef} style={{ height: "500px", overflow: "auto" }}>
  {virtualItems.map(item => (
    <div key={item.key} data-index={item.index}>
      {items[item.index].name}
    </div>
  ))}
</div>
```

---

## Useful Constants

### Uzbek Regions
```typescript
const REGIONS = [
  "Toshkent sh.", "Toshkent vil.", "Andijon", "Farg'ona", 
  "Namangan", "Buxoro", "Xorazm", "Samarqand", 
  "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", 
  "Qoraqalpog'iston R."
];
```

### User Roles
```typescript
const ROLES = [
  "super_admin", "admin", "administrator",
  "teacher", "student", "user", "parent", "payment_manager"
];
```

### Common Toast Messages
```typescript
const MESSAGES = {
  success: (entity: string) => `${entity} muvaffaqiyatli qo'shildi`,
  updated: (entity: string) => `${entity} muvaffaqiyatli yangilandi`,
  deleted: (entity: string) => `${entity} muvaffaqiyatli o'chirildi`,
  error: (action: string) => `${action}da xatolik yuz berdi`,
};
```
