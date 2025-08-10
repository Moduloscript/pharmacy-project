# API Development Rules - supastarter Next.js

## 🔌 **Hono Framework Standards**

### **API Architecture Pattern**
- ✅ **Hono as primary API framework** for all backend logic
- ✅ **Type-safe RPC client** for frontend communication
- ✅ **Edge-runtime compatible** code for deployment flexibility
- ✅ **OpenAPI documentation** auto-generation capability

### **API Package Structure**
```typescript
// packages/api/
// ├── src/
// │   ├── routes/              # Feature-based route definitions
// │   │   ├── users.ts         # User management endpoints
// │   │   ├── organizations.ts # Organization endpoints
// │   │   ├── billing.ts       # Payment and billing endpoints
// │   │   └── index.ts         # Route exports
// │   ├── middleware/          # Custom middleware
// │   │   ├── auth.ts          # Authentication middleware
// │   │   ├── cors.ts          # CORS middleware
// │   │   ├── locale.ts        # Localization middleware
// │   │   └── ratelimit.ts     # Rate limiting middleware
// │   ├── types/              # API type definitions
// │   │   ├── requests.ts      # Request schemas
// │   │   ├── responses.ts     # Response schemas
// │   │   └── common.ts        # Common types
// │   ├── utils/              # API utilities
// │   │   ├── validation.ts    # Input validation helpers
// │   │   ├── errors.ts        # Error handling utilities
// │   │   └── responses.ts     # Response formatting
// │   └── index.ts            # Main app export
// └── package.json
```

### **API Design Principles**
- ✅ **Feature-based routing** organization
- ✅ **RESTful endpoint design** with proper HTTP methods
- ✅ **Consistent response format** across all endpoints
- ✅ **Comprehensive error handling** with meaningful messages

## 🛠️ **Endpoint Definition Standards**

### **Route Definition Pattern**
```typescript
// packages/api/src/routes/users.ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '@saas/database'

const app = new Hono()

// Input validation schema
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin']).default('user')
})

// GET endpoint
app.get('/', async (c) => {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  })
  
  return c.json({ users })
})

// POST endpoint with validation
app.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role
    }
  })
  
  return c.json({ user }, 201)
})

export default app
```

### **HTTP Method Conventions**
- ✅ **GET** - Retrieve data (list or single item)
- ✅ **POST** - Create new resources
- ✅ **PUT/PATCH** - Update existing resources
- ✅ **DELETE** - Remove resources
- ✅ **OPTIONS** - CORS preflight requests

### **Response Format Standards**
```typescript
// Success response format
{
  data: any,           // The actual response data
  message?: string,    // Optional success message
  meta?: {            // Optional metadata
    pagination?: {
      page: number,
      limit: number,
      total: number
    }
  }
}

// Error response format
{
  error: {
    code: string,       // Error code for programmatic handling
    message: string,    // Human-readable error message
    details?: any      // Additional error details
  }
}
```

## 🔒 **API Protection and Authentication**

### **Authentication Middleware**
```typescript
// packages/api/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { getSession } from '@saas/auth/lib/server'

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await getSession()
  
  if (!session) {
    return c.json(
      { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Authentication required' 
        } 
      }, 
      401
    )
  }
  
  // Add session and user to context
  c.set('session', session)
  c.set('user', session.user)
  
  await next()
})
```

### **Role-Based Authorization**
```typescript
// Role-based middleware
export const requireRole = (role: string) => 
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    
    if (!user || user.role !== role) {
      return c.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions' 
          } 
        }, 
        403
      )
    }
    
    await next()
  })

// Usage in routes
app.use('/admin/*', authMiddleware, requireRole('admin'))
```

### **API Key Authentication (Optional)**
```typescript
// API key middleware for external integrations
export const apiKeyMiddleware = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key')
  
  if (!apiKey) {
    return c.json({ error: { code: 'MISSING_API_KEY', message: 'API key required' } }, 401)
  }
  
  // Validate API key against database
  const validKey = await db.apiKey.findUnique({
    where: { key: apiKey, active: true }
  })
  
  if (!validKey) {
    return c.json({ error: { code: 'INVALID_API_KEY', message: 'Invalid API key' } }, 401)
  }
  
  c.set('apiKey', validKey)
  await next()
})
```

## 📊 **Input Validation and Error Handling**

### **Zod Validation Integration**
```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

// Request validation schemas
const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
})

// Query parameter validation
const getUsersQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('10'),
  search: z.string().optional()
})

app.get('/', zValidator('query', getUsersQuerySchema), async (c) => {
  const { page, limit, search } = c.req.valid('query')
  
  // Use validated query parameters
})
```

### **Error Handling Middleware**
```typescript
// Global error handler
export const errorHandler = createMiddleware(async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400)
    }
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return c.json({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Resource already exists'
        }
      }, 409)
    }
    
    return c.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
})
```

## 🌐 **Frontend API Integration**

### **TanStack Query Integration**
```typescript
// Frontend API client setup
// apps/web/lib/api-client.ts
import { hc } from 'hono/client'
import type { ApiType } from '@saas/api'

const client = hc<ApiType>('/api')

export { client as api }
```

### **Custom Hooks for API Calls**
```typescript
// apps/web/hooks/api/users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

// Query hook for fetching users
export const useUsers = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await api.users.$get({ 
        query: params 
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      return response.json()
    }
  })
}

// Mutation hook for creating users
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await api.users.$post({
        json: data
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error.message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate users query to refetch data
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}
```

### **Error Handling in Frontend**
```typescript
// Error handling component
export function ApiErrorHandler({ error }: { error: Error }) {
  if (error.message.includes('UNAUTHORIZED')) {
    return <div>Please log in to continue</div>
  }
  
  if (error.message.includes('FORBIDDEN')) {
    return <div>You don't have permission to access this resource</div>
  }
  
  return <div>An error occurred: {error.message}</div>
}

// Usage in components
export function UsersList() {
  const { data, isLoading, error } = useUsers()
  
  if (error) {
    return <ApiErrorHandler error={error} />
  }
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  return (
    <div>
      {data?.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

## 🚀 **Performance and Optimization**

### **Response Caching**
```typescript
// Cache middleware for GET endpoints
import { cache } from 'hono/cache'

app.get('/users', 
  cache({
    cacheName: 'api-cache',
    cacheControl: 'max-age=300', // 5 minutes
  }),
  async (c) => {
    // Expensive operation that can be cached
    const users = await db.user.findMany()
    return c.json({ users })
  }
)
```

### **Pagination Implementation**
```typescript
// Pagination utility
export const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit
})

// Paginated endpoint
app.get('/', zValidator('query', getUsersQuerySchema), async (c) => {
  const { page, limit, search } = c.req.valid('query')
  
  const where = search ? {
    OR: [
      { name: { contains: search } },
      { email: { contains: search } }
    ]
  } : {}
  
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      ...paginate(page, limit),
      select: { id: true, name: true, email: true }
    }),
    db.user.count({ where })
  ])
  
  return c.json({
    users,
    meta: {
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  })
})
```

## 🌍 **Internationalization Support**

### **Locale Middleware**
```typescript
// packages/api/src/middleware/locale.ts
export const localeMiddleware = createMiddleware(async (c, next) => {
  const acceptLanguage = c.req.header('Accept-Language')
  const locale = acceptLanguage?.split(',')[0]?.split('-')[0] || 'en'
  
  c.set('locale', locale)
  await next()
})

// Usage in endpoints
app.get('/messages', localeMiddleware, async (c) => {
  const locale = c.get('locale')
  const messages = await getLocalizedMessages(locale)
  
  return c.json({ messages })
})
```

## 📝 **OpenAPI Documentation**

### **API Documentation Setup**
```typescript
// Auto-generate OpenAPI documentation
import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// Define route with OpenAPI metadata
app.openapi({
  method: 'get',
  path: '/users',
  description: 'Get list of users',
  responses: {
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: z.object({
            users: z.array(userSchema)
          })
        }
      }
    }
  }
}, async (c) => {
  // Implementation
})

// Serve documentation
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'supastarter API'
  }
})
```

## 🧪 **API Testing**

### **Test Utilities**
```typescript
// API testing helper
import { testClient } from 'hono/testing'
import { app } from '../src/index'

export const createTestClient = () => testClient(app)

// Test example
describe('Users API', () => {
  it('should create a user', async () => {
    const client = createTestClient()
    
    const response = await client.users.$post({
      json: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })
    
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.user.email).toBe('test@example.com')
  })
})
```

---

## 🔧 **Implementation Checklist**

### **New API Endpoint:**
- [ ] Define route with proper HTTP method
- [ ] Add input validation with Zod schemas
- [ ] Implement authentication/authorization
- [ ] Add comprehensive error handling
- [ ] Include proper TypeScript types
- [ ] Add pagination for list endpoints
- [ ] Implement caching where appropriate
- [ ] Write tests for all scenarios
- [ ] Update API documentation

### **Code Review Checklist:**
- [ ] Follows Hono framework patterns
- [ ] Input validation comprehensive
- [ ] Authentication properly implemented
- [ ] Error handling robust
- [ ] Response format consistent
- [ ] Performance optimized
- [ ] Tests cover all scenarios
- [ ] Documentation updated
- [ ] Security considerations addressed
