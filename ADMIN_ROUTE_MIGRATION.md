# JWT Access Control - Admin Route Migration Guide

## Pattern for Updating Admin Routes

All admin API routes should follow this pattern:

### Before (Unprotected)
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // ... handler logic
    return Response.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

### After (Protected)
```typescript
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

async function handler(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    // User is now authenticated and has 'admin' role
    const userId = request.user!.sub  // Access authenticated user ID
    
    // ... handler logic
    return Response.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export const POST = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)
```

## Admin Routes to Update

### High Priority (Core Admin Operations)

```
/api/admin/courses
├── POST      - Create course                 ✓ UPDATED
├── GET       - List courses
├── DELETE    - Delete course
└── PUT       - Update course

/api/admin/topics
├── POST      - Create topic
├── GET       - List topics
├── DELETE    - Delete topic
└── PUT       - Update topic

/api/admin/topics/[id]
├── POST      - Add video/quiz to topic
└── DELETE    - Remove video/quiz

/api/admin/lessons
├── POST      - Create lesson
├── GET       - List lessons
└── DELETE    - Delete lesson

/api/admin/lessons/[id]
├── PUT       - Update lesson
└── GET       - Get lesson details

/api/admin/users
├── GET       - List all users
├── DELETE    - Remove user
└── PUT       - Update user role

/api/admin/analytics
├── GET       - Get admin dashboard stats
└── GET       - User engagement data
```

### Medium Priority (Quiz Management)

```
/api/admin/lessons/quiz
├── POST      - Add quiz question
├── PUT       - Update question
└── DELETE    - Delete question

/api/admin/lessons/quiz/options
├── POST      - Add quiz option
├── PUT       - Update option
└── DELETE    - Delete option
```

### Implementation Steps

1. **Import middleware** at top of file:
   ```typescript
   import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'
   ```

2. **Wrap handler logic** in async function:
   ```typescript
   async function handler(request: AuthenticatedRequest) {
     // existing logic
   }
   ```

3. **Export with middleware**:
   ```typescript
   export const POST = (req: AuthenticatedRequest) => 
     withAuthFlow('admin', handler)(req)
   ```

4. **Use `request.user!.sub`** for authenticated user ID:
   ```typescript
   const userId = request.user!.sub
   ```

5. **Test with valid admin JWT** via `/dev/set-token`

## Client Routes (Similar Pattern)

For client routes (e.g., `/api/client/enrollments`), use:

```typescript
export const GET = (req: AuthenticatedRequest) => 
  withAuthFlow(['client', 'admin'], handler)(req)
```

This allows both client and admin users to access the route.

## Quick Copy-Paste Template

```typescript
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

// For admin routes
async function handler(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const userId = request.user!.sub
    const userRole = request.user!.role

    // Your logic here

    return Response.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export const POST = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)

export const GET = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)

export const PUT = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)

export const DELETE = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)
```

## Testing Updated Routes

```bash
# Get admin token from /dev/set-token page
TOKEN="your-admin-jwt-token"

# Test POST endpoint
curl -X POST http://localhost:3000/api/admin/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","level":"Beginner"}'

# Should return 201 with data
# Without token should return 401
# With non-admin token should return 403
```

## Batch Update Script

If needed to update multiple files at once:

```bash
# Find all admin routes
grep -r "export async function" app/api/admin/

# Replace pattern in all files
# (requires manual verification)
```

## Verification Checklist

- [ ] Route is wrapped with `withAuthFlow('admin', handler)`
- [ ] Handler function receives `AuthenticatedRequest` type
- [ ] No bare `Request` parameter
- [ ] Using `request.user!.sub` for user ID (not hardcoded)
- [ ] 401 returned for missing token
- [ ] 403 returned for non-admin users
- [ ] 200/201 returned for authenticated admins
- [ ] Error messages don't leak system details
