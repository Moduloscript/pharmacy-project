# Authentication & User Management Rules - supastarter Next.js

## 🔐 **better-auth Framework Standards**

### **Authentication Provider Pattern**
- ✅ **Always use better-auth** as the primary authentication provider
- ✅ **Session-based authentication** with secure cookies
- ✅ **Full control over user data** and authentication flow
- ✅ **Provider-agnostic approach** to avoid vendor lock-in

### **Auth Package Structure**
```typescript
// packages/auth/
// ├── src/
// │   ├── config.ts        # Authentication configuration
// │   ├── lib/
// │   │   ├── server.ts    # Server-side auth functions
// │   │   └── client.ts    # Client-side auth functions
// │   ├── providers/       # OAuth and other providers
// │   ├── middleware.ts    # Auth middleware
// │   └── types.ts         # Auth types
// └── package.json
```

### **Authentication Configuration**
- ✅ **Centralized auth config** in packages/auth/src/config.ts
- ✅ **Environment-based settings** for different environments
- ✅ **Secure session configuration** with proper expiration
- ✅ **CSRF protection** enabled by default

## 👤 **User and Session Management**

### **Session Hook Usage**
```typescript
// Client-side session access
import { useSession } from '@saas/auth'

const { user, session, loaded, reloadSession } = useSession()

// Always check if loaded before using user/session
if (!loaded) return <div>Loading...</div>

// User and session can be null if not authenticated
if (!user) return <div>Please log in</div>
```

### **Server-side Session Access**
```typescript
// Server Components and API routes
import { getSession } from "@saas/auth/lib/server"

async function ServerComponent() {
  const session = await getSession()
  
  if (!session) {
    // Handle unauthenticated state
    return <div>Unauthorized</div>
  }
  
  return <div>Welcome, {session.user.name}</div>
}
```

### **User Type Definition**
```typescript
type User = {
  id: string
  createdAt: Date
  updatedAt: Date
  email: string
  emailVerified: boolean
  name: string
  image?: string | null
  role: "admin" | "user"
  onboardingComplete: boolean
}
```

### **Session Type Definition**
```typescript
type Session = {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  impersonatedBy?: string | null
}
```

## 🛡️ **Route Protection Patterns**

### **Route Group Structure**
```typescript
// apps/web/app/
// ├── (marketing)/        # Public marketing pages
// ├── (saas)/            # Protected SaaS application
// │   ├── layout.tsx     # Auth-protected layout
// │   └── dashboard/     # Protected routes
// └── (auth)/           # Authentication pages
//     ├── login/
//     ├── signup/
//     └── forgot-password/
```

### **Protected Layout Implementation**
```typescript
// apps/web/app/(saas)/layout.tsx
import { getSession } from "@saas/auth/lib/server"
import { redirect } from "next/navigation"

export default async function SaasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div className="min-h-screen">
      {/* Protected layout content */}
      {children}
    </div>
  )
}
```

### **Middleware Protection**
- ✅ **Use auth middleware** for route-level protection
- ✅ **Redirect unauthenticated users** to login
- ✅ **Handle role-based access** in middleware
- ✅ **Protect API endpoints** with middleware

## 🚪 **OAuth Integration**

### **OAuth Provider Setup**
```typescript
// packages/auth/src/providers/
// ├── google.ts          # Google OAuth setup
// ├── github.ts          # GitHub OAuth setup
// └── index.ts           # Provider exports
```

### **OAuth Configuration**
- ✅ **Environment-based OAuth credentials**
- ✅ **Proper redirect URLs** for each provider
- ✅ **Scope configuration** for required permissions
- ✅ **Error handling** for OAuth failures

### **OAuth Implementation Pattern**
```typescript
// OAuth provider configuration
export const googleProvider = {
  providerId: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
  scopes: ['openid', 'profile', 'email']
}
```

## 🎨 **Authentication UI Components**

### **Authentication Pages Structure**
```typescript
// apps/web/app/(auth)/
// ├── login/
// │   └── page.tsx       # Login page
// ├── signup/
// │   └── page.tsx       # Signup page
// ├── forgot-password/
// │   └── page.tsx       # Password reset
// └── layout.tsx         # Auth layout
```

### **Form Component Patterns**
- ✅ **Use react-hook-form** for form management
- ✅ **Zod validation schemas** for input validation
- ✅ **Loading states** during authentication
- ✅ **Error handling** with user-friendly messages

### **Authentication Form Example**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginForm() {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })
  
  // Form implementation
}
```

## 🔄 **Session State Management**

### **Session Loading States**
- ✅ **Check loaded state** before using session data
- ✅ **Show loading indicators** during authentication
- ✅ **Handle session expiration** gracefully
- ✅ **Automatic session refresh** when possible

### **Session Reload Patterns**
```typescript
// Reload session after user data changes
const { reloadSession } = useSession()

// After updating user profile
const updateProfile = async (data: UpdateProfileData) => {
  await api.updateProfile(data)
  await reloadSession() // Refresh session with new data
}
```

### **Session Persistence**
- ✅ **Secure session cookies** with httpOnly flag
- ✅ **Session expiration** handled automatically
- ✅ **Remember me functionality** with longer expiration
- ✅ **Session invalidation** on logout

## 🛠️ **API Authentication**

### **API Route Protection**
```typescript
// Protect API routes with auth middleware
import { getSession } from "@saas/auth/lib/server"

export async function POST(request: Request) {
  const session = await getSession()
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Continue with authenticated logic
}
```

### **Hono API Authentication**
```typescript
// packages/api/src/middleware/auth.ts
import { getSession } from "@saas/auth/lib/server"

export const authMiddleware = async (c: Context, next: Next) => {
  const session = await getSession()
  
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('session', session)
  c.set('user', session.user)
  
  await next()
}
```

## 🎯 **Role-Based Access Control**

### **User Roles**
```typescript
// Standard user roles
type UserRole = "admin" | "user"

// Role-based permission checking
export const hasAdminRole = (user: User) => user.role === 'admin'
export const canAccessAdmin = (user: User) => hasAdminRole(user)
```

### **Permission Guards**
```typescript
// Component-level permission guards
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  
  if (!user || !hasAdminRole(user)) {
    return <div>Access denied</div>
  }
  
  return <>{children}</>
}
```

### **Route-Level Permissions**
- ✅ **Check user role** in protected layouts
- ✅ **Redirect unauthorized users** appropriately
- ✅ **Show/hide UI elements** based on permissions
- ✅ **API-level permission checks** in all endpoints

## 🔒 **Security Best Practices**

### **Password Security**
- ✅ **Strong password requirements** (minimum 8 characters)
- ✅ **Password hashing** handled by better-auth
- ✅ **Password reset functionality** with secure tokens
- ✅ **Rate limiting** on authentication endpoints

### **Session Security**
- ✅ **Secure session cookies** (httpOnly, secure, sameSite)
- ✅ **Session expiration** and refresh
- ✅ **CSRF protection** enabled
- ✅ **XSS protection** with proper sanitization

### **Input Validation**
- ✅ **Zod schemas** for all authentication forms
- ✅ **Server-side validation** for all inputs
- ✅ **Sanitize user inputs** before processing
- ✅ **Email validation** and verification

## 🧪 **Testing Authentication**

### **Authentication Testing Strategy**
- ✅ **Mock authentication state** in tests
- ✅ **Test protected routes** with different user roles
- ✅ **Test OAuth flows** with mock providers
- ✅ **Test session management** scenarios

### **Test Utilities**
```typescript
// Test helper for creating authenticated users
export const createTestSession = (overrides?: Partial<User>) => {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      onboardingComplete: true,
      ...overrides
    },
    session: {
      id: 'test-session-id',
      userId: 'test-user-id',
      // ... other session fields
    }
  }
}
```

---

## 🔧 **Implementation Checklist**

### **New Authentication Feature:**
- [ ] Use better-auth patterns and APIs
- [ ] Implement proper loading states
- [ ] Add comprehensive error handling
- [ ] Include client and server-side validation
- [ ] Test with different user roles
- [ ] Ensure security best practices
- [ ] Add proper TypeScript types
- [ ] Update documentation

### **Code Review Checklist:**
- [ ] better-auth integration correct
- [ ] Session handling implemented properly
- [ ] Route protection in place
- [ ] Error handling comprehensive
- [ ] Security measures implemented
- [ ] Tests cover authentication scenarios
- [ ] Loading states handled appropriately
- [ ] TypeScript types are accurate
