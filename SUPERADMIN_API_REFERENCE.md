# SuperAdmin API Endpoints Reference

## Base URL
```
/api/v1
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer {access_token}
```

---

## Organizations Endpoints

### GET /organizations
**Purpose**: Fetch organizations with pagination and search

**Query Parameters**:
```
page: number (0-based)
size: number (default: 10)
query: string (optional search term)
```

**Request**:
```bash
GET /api/v1/organizations?page=0&size=10&query=academy
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "PDP Academy",
      "slug": "pdp-academy",
      "description": "Leading education platform",
      "address": {
        "region": "Toshkent sh.",
        "district": "Chilonzor",
        "streetAddress": "Bog'ishamol ko'chasi, 12",
        "fullAddress": "Toshkent, Chilonzor, Bog'ishamol ko'chasi, 12"
      },
      "phone": "+998900123456",
      "email": "info@pdp.uz",
      "logo_url": "https://...",
      "plan_id": "uuid-plan",
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "totalPages": 5,
  "totalElements": 48,
  "currentPage": 0
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)
- 500: Server error

---

### POST /organizations
**Purpose**: Create new organization

**Request Body**:
```json
{
  "name": "PDP Academy",
  "slug": "pdp-academy",
  "description": "Premium education center",
  "address": {
    "region": "Toshkent sh.",
    "district": "Chilonzor",
    "streetAddress": "Bog'ishamol ko'chasi"
  },
  "phone": "+998900123456",
  "email": "info@pdp.uz",
  "logo_url": "https://...",
  "plan_id": "uuid-plan",
  "is_active": true
}
```

**Response** (201 Created):
```json
{
  "id": "new-uuid",
  "name": "PDP Academy",
  // ... full organization object
}
```

**Error Responses**:
- 400: Bad Request (validation error)
- 409: Conflict (slug or email already exists)
- 500: Server error

---

### PUT /organizations/{id}
**Purpose**: Update existing organization

**Path Parameters**:
```
id: string (organization UUID)
```

**Request Body**: Same as POST

**Response** (200 OK): Updated organization object

**Error Responses**:
- 400: Bad Request
- 404: Organization not found
- 409: Conflict (slug/email conflict with another org)

---

### DELETE /organizations/{id}
**Purpose**: Delete organization

**Path Parameters**:
```
id: string (organization UUID)
```

**Response** (204 No Content)

**Error Responses**:
- 404: Not found
- 500: Server error (may have dependent users)

---

## Packages Endpoints

### GET /super-admin/packages
**Purpose**: Fetch all subscription packages

**Query Parameters**:
```
page: number (optional)
size: number (optional)
```

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "Premium",
    "description": "Professional plan",
    "price": 500000,
    "maxOrganizations": 5,
    "maxStudents": 1000,
    "maxTeachers": 50
  }
]
```

---

### POST /super-admin/packages
**Purpose**: Create subscription package

**Request Body**:
```json
{
  "name": "Pro Plan",
  "description": "Professional subscription",
  "price": 500000,
  "maxOrganizations": 5,
  "maxStudents": 1000,
  "maxTeachers": 50
}
```

**Response** (201 Created): New package object

---

### PUT /super-admin/packages/{id}
**Purpose**: Update package

**Response** (200 OK): Updated package object

---

### DELETE /super-admin/packages/{id}
**Purpose**: Delete package

**Response** (204 No Content)

---

## Users Endpoints

### GET /admin/users/all
**Purpose**: Fetch all users with pagination and search

**Query Parameters**:
```
page: number (0-based)
size: number (default: 10)
query: string (search by email/username/name)
search: string (alternative search parameter)
organizationId: string (filter by organization)
```

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": "uuid",
      "email": "student@example.com",
      "username": "student123",
      "full_name": "Javohir Aliyev",
      "phone_number": "+998901234567",
      "organization_id": "uuid",
      "group_id": "uuid",
      "subject": null,
      "telegram_chat_id": null,
      "telegram_username": null,
      "role": "student",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "totalPages": 3,
  "totalElements": 28
}
```

---

### GET /admin/users/by-role/{role}
**Purpose**: Fetch users by specific role

**Path Parameters**:
```
role: string (STUDENT, TEACHER, ADMIN, ADMINISTRATOR, PARENT, etc.)
```

**Query Parameters**: Same as `/admin/users/all`

**Response**: Same pagination structure with filtered results

---

### POST /admin/users
**Purpose**: Create new user

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass123",
  "full_name": "Full Name",
  "role": "student",
  "phone_number": "+998901234567",
  "organization_id": "uuid",
  "group_id": "uuid (optional)",
  "subject": "Mathematics (optional)",
  "telegram_chat_id": "123456789 (optional)",
  "telegram_username": "@username (optional)",
  "card_number": "8600123456789012 (required for admin)",
  "card_holder": "Name (required for admin)"
}
```

**Response** (201 Created): New user object

**Validation Notes**:
- Email must be valid
- Username: 3-50 characters
- Password: 6-100 characters
- For admin/administrator roles: card_number (16 digits) and card_holder are required

---

### PUT /admin/users/{id}
**Purpose**: Update user

**Path Parameters**:
```
id: string (user UUID)
```

**Request Body**: Same as POST (password optional for updates)

**Response** (200 OK): Updated user object

---

### DELETE /admin/users/{id}
**Purpose**: Delete user

**Response** (204 No Content)

---

### PUT /admin/users/{id}/password
**Purpose**: Change user password (optional endpoint)

**Request Body**:
```json
{
  "newPassword": "NewPassword123"
}
```

---

## Organizations → Groups Endpoints

### GET /admin/organizations/{orgId}/groups
**Purpose**: Fetch groups for specific organization

**Path Parameters**:
```
orgId: string (organization UUID)
```

**Query Parameters**:
```
page: number (optional)
size: number (optional)
```

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "Grade 10-A",
    "organization_id": "uuid",
    "teacher_id": "uuid"
  }
]
```

---

### GET /admin/groups
**Purpose**: Fetch all groups with optional filtering

**Query Parameters**:
```
page: number (optional)
size: number (optional, default: 1000)
organizationId: string (filter by organization)
```

**Response**: Array of group objects

---

## Files Upload Endpoint

### POST /files/upload
**Purpose**: Upload files (images, documents, etc)

**Content-Type**: `multipart/form-data`

**Form Fields**:
```
file: File (the file to upload)
```

**Response** (200 OK):
```json
{
  "url": "/uploads/images/uuid.jpg",
  "filename": "uuid.jpg",
  "size": 102400
}
```

**Error Responses**:
- 400: Invalid file type or size
- 413: Payload too large

---

## Standard Error Response Format

All error responses follow this format:

```json
{
  "error": "Error code",
  "message": "Human-readable error message in Uzbek",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Common Error Messages**:
- "Email noto'g'ri" (Invalid email)
- "Tashkilot nomi majburiy" (Organization name required)
- "Username kamida 3 ta belgi" (Username at least 3 characters)
- "Parol kamida 6 ta belgi" (Password at least 6 characters)
- "Karta raqami 16 ta raqam bo'lishi kerak" (Card number must be 16 digits)

---

## HTTP Status Codes Used

| Status | Meaning | Common Triggers |
|--------|---------|-----------------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Insufficient permissions for action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email/slug/username |
| 500 | Server Error | Unexpected server error |
| 503 | Service Unavailable | Server maintenance or overload |

---

## Pagination Details

**Page Numbering**: 0-based (first page is 0, second is 1, etc)

**Response Format**:
```json
{
  "content": [...],
  "totalPages": 5,
  "totalElements": 48,
  "currentPage": 0,
  "page": 0
}
```

**Frontend Usage**:
```typescript
// Fetch page 0 with 10 items per page
api.get("/organizations", { 
  params: { page: 0, size: 10 } 
})

// Next page
api.get("/organizations", { 
  params: { page: 1, size: 10 } 
})

// Last page (totalPages - 1)
api.get("/organizations", { 
  params: { page: 4, size: 10 } 
})
```

---

## Query Parameter Best Practices

**Search/Filter**:
```
/admin/users/all?query=john
/admin/users/all?search=academy
```

**Pagination**:
```
?page=0&size=10
```

**Combined**:
```
/admin/users/all?page=0&size=20&query=teacher&organizationId=uuid-org-123
```

---

## Authentication Flow

1. User logs in via `/api/auth/login`
2. Backend returns `access_token`
3. Frontend stores token in `localStorage`
4. For each request, axios interceptor adds:
   ```
   Authorization: Bearer {access_token}
   ```
5. If token expires (401 response):
   - Interceptor clears localStorage
   - Redirects user to `/auth` page
   - User must log in again
