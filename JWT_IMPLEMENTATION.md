# JWT-Based Access Control Implementation

## Overview

This system implements JWT-based authentication and role-based authorization for separating admin and client access. The parent system issues JWTs, and this application verifies and enforces access control.

## Architecture

### Authentication Flow

1. **Parent System** issues JWT containing:
   ```json
   {
     "sub": "user_id",
     "role": "admin" | "client",
     "exp": timestamp,
     "iat": timestamp
   }
   ```

2. **Client** stores JWT in localStorage/sessionStorage
3. **Client** sends JWT in requests via:
   - `Authorization: Bearer <token>` header, OR
   - `token` HTTP-only cookie
4. **Backend** verifies JWT and enforces access control

### Key Components

#### 1. **lib/auth.ts** - Core Auth Utilities
- `extractJWT()` - Extract token from Authorization header or cookie
- `verifyToken()` - Verify signature and expiry
- `decodeToken()` - Decode without verification (client-side only)
- `hasRole()` - Check if user has required role(s)

#### 2. **lib/auth-middleware.ts** - Express-like Middleware
- `withAuth()` - Verify JWT and attach user to request
- `withRole()` - Check if user has required role
- `withAuthFlow()` - Combine both (recommended)

#### 3. **lib/auth-client.ts** - Client-Side Utilities
- `getUserRoleFromJWT()` - Get role for UI routing
- `isAuthenticated()` - Check if user is logged in
- `isAdmin()` - Convenience check for admin role
- `getUserIdFromJWT()` - Get user ID for requests

#### 4. **components/protected-route.tsx** - Route Protection
- Client-side route protection wrapper
- Redirects unauthenticated users to login
- Redirects unauthorized users based on role

## Implementation Guide

### Backend Route Protection

#### Admin-Only Route

```typescript
// app/api/admin/courses/route.ts
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

async function handler(request: AuthenticatedRequest) {
  // request.user contains: { sub, role, exp, ... }
  const userId = request.user!.sub
  
  // Your logic here
  return Response.json({ success: true })
}

export const POST = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)
```

#### Client-Only Route (or Client + Admin)

```typescript
// app/api/client/enrollments/route.ts
async function handler(request: AuthenticatedRequest) {
  // request.user available
  return Response.json({ success: true })
}

export const GET = (req: AuthenticatedRequest) => 
  withAuthFlow(['client', 'admin'], handler)(req)
```

#### Multiple Required Roles

```typescript
export const DELETE = (req: AuthenticatedRequest) => 
  withAuthFlow(['admin', 'moderator'], handler)(req)
```

### Frontend Route Protection

#### Protect Page with ProtectedRoute

```typescript
// app/admin/page.tsx
import { ProtectedRoute } from '@/components/protected-route'

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin Dashboard</div>
    </ProtectedRoute>
  )
}
```

#### Conditional Rendering Based on Role

```typescript
'use client'

import { isAdmin, getUserRoleFromJWT } from '@/lib/auth-client'

export function Navigation() {
  const userRole = getUserRoleFromJWT()
  
  return (
    <nav>
      <a href="/courses">Courses</a>
      {isAdmin() && <a href="/admin">Admin</a>}
    </nav>
  )
}
```

#### Making Authenticated Requests from Client

```typescript
'use client'

import { getJWTFromClient } from '@/lib/auth-client'

async function fetchAdminData() {
  const token = getJWTFromClient()
  
  const response = await fetch('/api/admin/dashboard', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  
  const data = await response.json()
  return data
}
```

## Error Responses

### 401 Unauthorized
**Cause**: Missing or invalid JWT
```json
{
  "error": "Unauthorized: Missing authentication token"
}
```
**Action**: Redirect to login page

### 403 Forbidden
**Cause**: Token is expired or user lacks required role
```json
{
  "error": "Forbidden: Token verification failed: ..."
}
```
**Action**: Redirect to appropriate page or show error

## Security Principles

1. **Backend is Source of Truth** - Frontend routing is UX only
2. **Always Verify** - Backend verifies every request
3. **Default Deny** - Routes require explicit auth, default is unauthorized
4. **Short-lived Tokens** - JWT expiry is checked on every request
5. **Frontend Cannot Bypass** - Even if client modifies JWT, backend rejects it

## Environment Variables

```dotenv
# .env.local
EXTERNAL_JWT_SECRET=your-shared-secret-with-parent-system
NEXT_PUBLIC_LOGIN_URL=http://localhost:3000/dev/set-token
```

## Testing

### Set Test Token (Development)

The `/dev/set-token` page allows you to set a test JWT for local development:

```bash
# Visit http://localhost:3000/dev/set-token
# Create or paste a test token
# It will be stored in localStorage
```

### Test Token Example

```javascript
// Use jwt.io or a JWT library to create test tokens

// Admin token
{
  "sub": "test-user-123",
  "role": "admin",
  "exp": 2000000000,
  "iat": 1700000000
}

// Client token
{
  "sub": "test-user-456",
  "role": "client",
  "exp": 2000000000,
  "iat": 1700000000
}
```

## Migration Checklist

- [ ] All `/api/admin/*` routes wrapped with `withAuthFlow('admin', handler)`
- [ ] All `/api/client/*` routes wrapped with `withAuthFlow(['client', 'admin'], handler)`
- [ ] Admin pages wrapped with `<ProtectedRoute requiredRole="admin">`
- [ ] Client pages wrapped with `<ProtectedRoute requiredRole="client">`
- [ ] Frontend navigation uses `isAdmin()` for conditional rendering
- [ ] API calls include JWT in Authorization header
- [ ] Environment variables set in production
- [ ] JWT secret shared with parent system

## Troubleshooting

### Token Not Being Sent
- Ensure token is stored in localStorage/sessionStorage
- Verify Authorization header format: `Bearer <token>`
- Check that cookie is being set with HTTP-only flag (if using cookies)

### 403 Forbidden on Valid Token
- Verify JWT payload has `role` field with value `admin` or `client`
- Check that token hasn't expired
- Ensure route is wrapped with correct `withAuthFlow()` call

### Infinite Redirect Loop
- Verify `NEXT_PUBLIC_LOGIN_URL` is set correctly
- Ensure login page doesn't require authentication
- Check ProtectedRoute requiredRole matches JWT role

## References

- [jose (JWT Library)](https://github.com/panva/jose)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [JWT.io - JWT Debugger](https://jwt.io)
