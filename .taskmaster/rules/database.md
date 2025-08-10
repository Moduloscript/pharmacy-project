# Database & ORM Rules - supastarter Next.js (Supabase)

## 🗄️ **Database Architecture Standards**

### **Supabase Database Pattern**
- ✅ **Supabase PostgreSQL** as primary database provider
- ✅ **Prisma ORM** for database interactions and schema management
- ✅ **Row Level Security (RLS)** enabled for all user-facing tables
- ✅ **Connection pooling** with both `DATABASE_URL` and `DIRECT_URL`
- ✅ **Type-safe database operations** with generated Prisma types

### **Supabase Database Package Structure**
```typescript
// packages/database/
// ├── prisma/                    # Prisma setup for Supabase
// │   ├── schema.prisma         # Database schema with Supabase config
// │   └── migrations/           # Migration files
// ├── src/
// │   ├── client.ts             # Prisma client export
// │   └── types.ts              # Generated Prisma types
// ├── index.ts                  # Main export
// └── package.json
```

### **Supabase Environment Configuration**
```bash
# .env.local
# Supabase Database URLs (with connection pooling)
DATABASE_URL="postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[aws-region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[aws-region].pooler.supabase.com:5432/postgres"

# Supabase Storage (S3-compatible)
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_ENDPOINT="https://[YOUR-PROJECT-REF].supabase.co/storage/v1/s3"
```

## 🔧 **Supabase Prisma Configuration**

### **Supabase Schema Configuration**
```prisma
// packages/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### **Supabase Connection Setup**
- ✅ **`DATABASE_URL`** - Connection pooled URL for general queries
- ✅ **`DIRECT_URL`** - Direct connection for migrations and schema operations
- ✅ **Connection pooling** via PgBouncer built into Supabase
- ✅ **Regional deployment** for optimal performance

### **Row Level Security (RLS) Requirements**
- ✅ **Enable RLS** for all user-facing tables in Supabase dashboard
- ✅ **Create RLS policies** for proper data access control
- ✅ **Test RLS policies** with different user contexts
- ✅ **Document RLS rules** for team understanding

```sql
-- Example RLS policy setup in Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);
```

### **Prisma Schema Conventions**
```prisma
model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  email     String   @unique
  name      String
  
  // Relationships
  posts     Post[]
  
  @@map("users")
}
```

## 🐉 **Drizzle Configuration**

### **Switching to Drizzle**
```typescript
// packages/database/index.ts
export * from "./drizzle" // Change from "./prisma"
```

### **Drizzle Auth Adapter**
```typescript
// packages/auth/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql" or "sqlite"
  }),
})
```

### **Schema Export Configuration**
```typescript
// packages/database/drizzle/schema/index.ts
export * from "./postgres" // Default
// export * from "./mysql"    // For MySQL
// export * from "./sqlite"   // For SQLite
```

### **Database Client Setup**
```typescript
// packages/database/drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema/postgres"

const databaseUrl = process.env.DATABASE_URL as string

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

export const db = drizzle(databaseUrl, {
  schema,
})
```

## 📊 **Schema Design Standards**

### **Model Naming Conventions**
- ✅ **PascalCase for models** (User, Post, Organization)
- ✅ **camelCase for fields** (createdAt, updatedAt, userId)
- ✅ **Explicit table mapping** with @@map directive
- ✅ **Consistent ID strategy** (cuid() for Prisma, UUIDs for Drizzle)

### **Standard Fields Pattern**
```prisma
// Common fields for most models
model ModelName {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Model-specific fields
  
  @@map("model_names")
}
```

### **Relationship Patterns**
```prisma
// One-to-many relationship
model User {
  id    String @id @default(cuid())
  posts Post[]
}

model Post {
  id       String @id @default(cuid())
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Many-to-many relationship
model User {
  id           String        @id @default(cuid())
  organizations UserOrganization[]
}

model Organization {
  id    String             @id @default(cuid())
  users UserOrganization[]
}

model UserOrganization {
  userId         String
  organizationId String
  role           String
  
  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
  
  @@id([userId, organizationId])
}
```

## 🔄 **Database Client Usage**

### **Client Import Pattern**
```typescript
// Import database client
import { db } from "@saas/database"

// Use in Server Components, API routes, and server actions
async function getUsers() {
  return await db.user.findMany()
}
```

### **Query Patterns**
```typescript
// Basic CRUD operations
const createUser = async (data: CreateUserData) => {
  return await db.user.create({
    data: {
      email: data.email,
      name: data.name,
    },
  })
}

const getUserById = async (id: string) => {
  return await db.user.findUnique({
    where: { id },
    include: {
      posts: true,
    },
  })
}

const updateUser = async (id: string, data: UpdateUserData) => {
  return await db.user.update({
    where: { id },
    data,
  })
}
```

### **Error Handling Pattern**
```typescript
import { Prisma } from "@prisma/client"

const handleDatabaseError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new Error('Unique constraint violation')
      case 'P2025':
        throw new Error('Record not found')
      default:
        throw new Error('Database operation failed')
    }
  }
  throw error
}
```

## 🔄 **Migration Management**

### **Migration Workflow**
- ✅ **Schema-first approach** - define schema, then migrate
- ✅ **Run migrations** in development and production
- ✅ **Version control migrations** - commit migration files
- ✅ **Test migrations** on staging before production

### **Supabase Migration Commands**
```bash
# Push schema to Supabase (development)
pnpm --filter database push

# Generate Prisma client
pnpm --filter database generate

# Production migrations
npx prisma migrate deploy

# Development migrations (when using migrate instead of push)
npx prisma migrate dev --name migration_name
```

### **Supabase-Specific Migration Workflow**
1. **Update Prisma schema** in `packages/database/prisma/schema.prisma`
2. **Push to Supabase** using `pnpm --filter database push`
3. **Enable RLS manually** in Supabase dashboard for new tables
4. **Create RLS policies** through Supabase dashboard or SQL commands
5. **Test RLS policies** with different user contexts
6. **Generate Prisma client** to get updated types

### **Migration Best Practices**
- ✅ **Descriptive migration names** with timestamps
- ✅ **Enable RLS immediately** after table creation
- ✅ **Test RLS policies** thoroughly before deployment
- ✅ **Use `DIRECT_URL`** for migrations to avoid pooling issues
- ✅ **Document RLS policies** in code comments
- ✅ **Rollback strategy** for failed migrations

## 🎯 **Database Operations in API**

### **API Route Database Usage**
```typescript
// apps/web/app/api/users/route.ts
import { db } from "@saas/database"
import { getSession } from "@saas/auth/lib/server"

export async function GET() {
  const session = await getSession()
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const users = await db.user.findMany({
    where: {
      // Add filters based on user permissions
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  })
  
  return Response.json(users)
}
```

### **Hono API Database Integration**
```typescript
// packages/api/src/routes/users.ts
import { Hono } from 'hono'
import { db } from "@saas/database"
import { authMiddleware } from '../middleware/auth'

const app = new Hono()

app.use('*', authMiddleware)

app.get('/', async (c) => {
  const users = await db.user.findMany()
  return c.json(users)
})

export default app
```

## 📁 **Supabase Storage Integration**

### **Storage Configuration**
```typescript
// Supabase Storage setup for file uploads
// Default bucket: 'avatars' for user avatars and organization logos
// Configured in config/index.ts

// Storage environment variables in .env.local
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_ENDPOINT="https://[YOUR-PROJECT-REF].supabase.co/storage/v1/s3"
```

### **Storage Bucket Setup**
- ✅ **Create 'avatars' bucket** in Supabase dashboard
- ✅ **Disable public access** - access controlled at API level
- ✅ **Configure file size limits** and allowed file types
- ✅ **Generate S3 access keys** for programmatic access

### **File Upload Integration**
```typescript
// Example file upload with Supabase Storage
import { supabaseStorage } from '@/lib/storage'

const uploadAvatar = async (file: File, userId: string) => {
  const fileName = `${userId}/${Date.now()}-${file.name}`
  
  const { data, error } = await supabaseStorage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
    
  if (error) throw error
  return data.path
}
```

## 🔍 **Database Studio and Tools**

### **Supabase Dashboard**
```bash
# Access Supabase dashboard at:
# https://app.supabase.com/project/[YOUR-PROJECT-REF]

# Features available:
# - Table editor for direct data manipulation
# - SQL editor for custom queries
# - Authentication management
# - Storage file browser
# - Realtime logs and metrics
```

### **Prisma Studio**
```bash
# Launch Prisma Studio for database inspection
npx prisma studio
```

### **Database Inspection Tools**
- ✅ **Supabase dashboard** for comprehensive database management
- ✅ **Prisma Studio** for local database inspection
- ✅ **Query logging** in development
- ✅ **Performance monitoring** through Supabase metrics
- ✅ **Real-time logs** for debugging

## 📈 **Performance Optimization**

### **Query Optimization**
```typescript
// Use select to limit fields
const users = await db.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
})

// Use include carefully for relations
const userWithPosts = await db.user.findUnique({
  where: { id },
  include: {
    posts: {
      select: {
        id: true,
        title: true,
      },
    },
  },
})
```

### **Indexing Strategy**
```prisma
// Add indexes for frequently queried fields
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
  
  @@index([email])
  @@index([name])
}
```

### **Connection Management**
- ✅ **Connection pooling** for production
- ✅ **Connection limits** based on deployment
- ✅ **Connection timeout** configuration
- ✅ **Graceful connection handling**

## 🧪 **Database Testing**

### **Test Database Setup**
```typescript
// Test database configuration
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
})
```

### **Test Data Management**
```typescript
// Test utilities for database operations
export const createTestUser = async (overrides = {}) => {
  return await db.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      ...overrides,
    },
  })
}

export const cleanupTestData = async () => {
  await db.user.deleteMany({
    where: {
      email: {
        endsWith: '@test.com',
      },
    },
  })
}
```

## 🔒 **Database Security**

### **Data Protection**
- ✅ **Input sanitization** for all queries
- ✅ **Parameterized queries** (handled by ORM)
- ✅ **Role-based data access** with proper filtering
- ✅ **Sensitive data encryption** when necessary

### **Access Control**
```typescript
// Filter data based on user permissions
const getUserPosts = async (userId: string) => {
  return await db.post.findMany({
    where: {
      OR: [
        { userId: userId },           // Own posts
        { visibility: 'public' },    // Public posts
      ],
    },
  })
}
```

---

## 🔧 **Implementation Checklist**

### **New Supabase Database Feature:**
- [ ] Design schema with proper relationships in Prisma
- [ ] Configure `DATABASE_URL` and `DIRECT_URL` in environment
- [ ] Push schema to Supabase using `pnpm --filter database push`
- [ ] **Enable RLS** for all new tables in Supabase dashboard
- [ ] **Create RLS policies** for proper data access control
- [ ] Test RLS policies with different user contexts
- [ ] Add necessary indexes for performance
- [ ] Implement type-safe queries with Prisma client
- [ ] Add comprehensive error handling
- [ ] Generate Prisma client with updated types
- [ ] Write comprehensive tests including RLS scenarios
- [ ] Document schema, operations, and RLS policies

### **Supabase Storage Integration:**
- [ ] Create storage bucket in Supabase dashboard
- [ ] Configure S3 access keys for programmatic access
- [ ] Set file size limits and allowed file types
- [ ] Implement file upload/download functionality
- [ ] Test storage operations with different user roles
- [ ] Add proper error handling for storage operations

### **Code Review Checklist:**
- [ ] Schema design follows Supabase conventions
- [ ] **RLS is enabled** for all user-facing tables
- [ ] **RLS policies** are comprehensive and tested
- [ ] Migration workflow uses proper Supabase commands
- [ ] Queries are optimized and type-safe
- [ ] Connection pooling configured correctly
- [ ] Error handling includes Supabase-specific scenarios
- [ ] Storage integration follows security best practices
- [ ] Tests cover database operations and RLS policies
- [ ] Performance implications considered
- [ ] Documentation updated with Supabase-specific details
