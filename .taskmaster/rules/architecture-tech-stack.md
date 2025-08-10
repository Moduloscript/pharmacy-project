# Architecture & Tech Stack Rules - supastarter Next.js

## 🏗️ **Monorepo Architecture Standards**

### **TurboRepo Structure**
- ✅ **Follow monorepo pattern** using TurboRepo for dependency management
- ✅ **Apps-packages separation** - apps contain applications, packages contain shared code
- ✅ **Code sharing enabled** between different packages and apps
- ✅ **Consistent package naming** following supastarter conventions

### **Repository Structure**
```
apps/
├── web/                 # Main Next.js application (marketing + SaaS)

packages/
├── auth/               # Authentication setup (better-auth)
├── api/                # API server with Hono (all feature logic)
├── database/           # Prisma database setup
├── i18n/              # Translations and localization
├── mail/              # Mail templates and providers
├── storage/           # Storage providers and upload logic
├── util/              # Shared utilities and helpers

tooling/
├── eslint/            # ESLint configuration
├── tailwind/          # Tailwind CSS configuration
├── typescript/        # TypeScript configuration

config/                # Project-wide configuration
```

### **Package Dependencies**
- ✅ **Packages must be self-contained** with proper dependencies
- ✅ **Use workspace dependencies** for internal package references
- ✅ **Avoid circular dependencies** between packages
- ✅ **Export clean APIs** from each package

## ⚛️ **Next.js Framework Standards**

### **App Router Usage**
- ✅ **Use App Router exclusively** (not Pages Router)
- ✅ **Server Components by default** - only use Client Components when necessary
- ✅ **Route handlers for API** endpoints alongside Hono
- ✅ **Proper file-based routing** following Next.js 13+ conventions

### **Next.js Project Structure**
```typescript
// apps/web/app/
// ├── (marketing)/        # Marketing pages route group
// ├── (saas)/            # SaaS application route group
// ├── api/               # API route handlers
// ├── globals.css        # Global styles
// ├── layout.tsx         # Root layout
// └── page.tsx           # Home page
```

### **Server/Client Component Guidelines**
- ✅ **Server Components** for data fetching, static content, SEO-critical pages
- ✅ **Client Components** for interactivity, hooks, browser APIs
- ✅ **"use client" directive** only when necessary
- ✅ **Minimize client bundle** by keeping interactive components small

## 🗄️ **Database Layer Standards**

### **Prisma ORM Pattern**
- ✅ **Prisma as single source of truth** for database schema
- ✅ **Type-safe database queries** using Prisma client
- ✅ **Schema-first approach** - define schema, generate types
- ✅ **Migration-based workflow** for schema changes

### **Database Package Structure**
```typescript
// packages/database/
// ├── prisma/
// │   ├── schema.prisma      # Database schema definition
// │   └── migrations/        # Migration files
// ├── src/
// │   ├── client.ts         # Prisma client setup
// │   └── types.ts          # Generated types
// └── package.json
```

### **Schema Conventions**
- ✅ **Use consistent naming** (camelCase for fields, PascalCase for models)
- ✅ **Include audit fields** (createdAt, updatedAt) on most models
- ✅ **Proper relationships** with appropriate cascade rules
- ✅ **Indexes on frequently queried fields**

## 🔌 **API Architecture Standards**

### **Hono Framework Usage**
- ✅ **Hono for main API logic** in packages/api
- ✅ **Edge-runtime compatible** code
- ✅ **Type-safe RPC client** for frontend communication
- ✅ **Middleware for common concerns** (auth, CORS, logging)

### **API Package Structure**
```typescript
// packages/api/
// ├── src/
// │   ├── routes/           # Route definitions
// │   ├── middleware/       # Custom middleware
// │   ├── types/           # API types
// │   └── index.ts         # Main app export
// └── package.json
```

### **Route Organization**
- ✅ **Feature-based routing** (users, organizations, billing)
- ✅ **Consistent HTTP methods** (GET, POST, PUT, DELETE)
- ✅ **Proper status codes** and error handling
- ✅ **Input validation** using Zod schemas

## 🔐 **Authentication Standards**

### **better-auth Integration**
- ✅ **better-auth as authentication provider** (not Auth.js or Supabase Auth)
- ✅ **Configurable and flexible** authentication setup
- ✅ **Full control over user data** and authentication flow
- ✅ **Provider-agnostic approach** to avoid vendor lock-in

### **Auth Package Structure**
```typescript
// packages/auth/
// ├── src/
// │   ├── config.ts        # Authentication configuration
// │   ├── providers/       # OAuth and other providers
// │   ├── middleware.ts    # Auth middleware
// │   └── types.ts         # Auth types
// └── package.json
```

### **Authentication Patterns**
- ✅ **Session-based authentication** with secure cookies
- ✅ **Role-based access control** (RBAC) support
- ✅ **OAuth provider integration** (Google, GitHub, etc.)
- ✅ **Custom authentication flows** when needed

## 🎨 **UI/Styling Standards**

### **Tailwind CSS Configuration**
- ✅ **Tailwind as primary styling solution**
- ✅ **Utility-first approach** with component abstractions
- ✅ **Design system consistency** through Tailwind config
- ✅ **Responsive design** built-in with Tailwind classes

### **Radix UI + shadcn/ui Pattern**
- ✅ **Radix UI for headless components** (accessibility-first)
- ✅ **shadcn/ui compatibility** for pre-designed components
- ✅ **Component generation** using CLI commands
- ✅ **Customizable component themes**

### **Styling Package Structure**
```typescript
// tooling/tailwind/
// ├── src/
// │   ├── config.ts        # Tailwind configuration
// │   ├── plugins/         # Custom Tailwind plugins
// │   └── themes/          # Theme definitions
// └── package.json
```

## 📊 **State Management Standards**

### **TanStack Query Integration**
- ✅ **TanStack Query for server state** management
- ✅ **React Query patterns** for data fetching
- ✅ **Optimistic updates** where appropriate
- ✅ **Background refetching** and caching strategies

### **State Management Patterns**
```typescript
// Client state: React useState, useReducer
// Server state: TanStack Query
// Global state: React Context (when needed)
// Form state: react-hook-form
```

### **Query Organization**
- ✅ **Custom hooks** for data fetching
- ✅ **Query key factories** for consistent caching
- ✅ **Mutation handling** with proper error states
- ✅ **Background sync** for real-time features

## 📝 **Content Management Standards**

### **Content Collections Usage**
- ✅ **Content Collections for content management**
- ✅ **MDX support** for rich content
- ✅ **Type-safe content** with generated schemas
- ✅ **Git-based workflow** for content updates

### **Content Structure**
```typescript
// content/
// ├── blog/               # Blog posts
// ├── docs/               # Documentation
// ├── legal/              # Legal pages
// └── config/             # Content configuration
```

### **Content Patterns**
- ✅ **Frontmatter for metadata** in MDX files
- ✅ **Content validation** using schemas
- ✅ **Static generation** for content pages
- ✅ **SEO optimization** built-in

## 🧪 **Development Standards**

### **Code Quality Tools**
- ✅ **ESLint** for code linting (tooling/eslint)
- ✅ **Prettier** for code formatting
- ✅ **TypeScript strict mode** enabled
- ✅ **Husky** for git hooks

### **Development Workflow**
- ✅ **Feature branch workflow** with proper PR reviews
- ✅ **Conventional commits** for clear history
- ✅ **Automated testing** at package level
- ✅ **CI/CD pipeline** for deployment

### **Package Management**
- ✅ **pnpm** for package management (faster, efficient)
- ✅ **Workspace dependencies** properly configured
- ✅ **Lock file committed** for reproducible builds
- ✅ **Dependency updates** managed through Dependabot

## 🚀 **Performance Standards**

### **Bundle Optimization**
- ✅ **Code splitting** by routes and features
- ✅ **Dynamic imports** for heavy components
- ✅ **Tree shaking** enabled for unused code
- ✅ **Bundle analysis** for size monitoring

### **Runtime Performance**
- ✅ **Server-side rendering** where beneficial
- ✅ **Static generation** for content pages
- ✅ **Image optimization** using Next.js Image
- ✅ **Loading states** for better UX

---

## 🔧 **Implementation Checklist**

### **New Feature Development:**
- [ ] Follow monorepo package structure
- [ ] Use appropriate tech stack components (Hono for API, Prisma for DB)
- [ ] Implement proper TypeScript types
- [ ] Follow authentication patterns with better-auth
- [ ] Use TanStack Query for server state
- [ ] Style with Tailwind CSS and Radix UI
- [ ] Add proper error handling and loading states
- [ ] Write tests for critical functionality

### **Code Review Checklist:**
- [ ] Follows monorepo architecture
- [ ] Uses Server Components appropriately
- [ ] Database queries are type-safe with Prisma
- [ ] API endpoints follow Hono patterns
- [ ] Authentication properly integrated
- [ ] UI follows design system
- [ ] Performance considerations addressed
- [ ] Tests include critical paths
