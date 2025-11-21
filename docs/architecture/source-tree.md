# Source Tree Structure

## Project Root Structure

```
pharmacy-project/
├── .bmad-core/                     # BMAD Method framework
│   ├── agents/                     # AI agent definitions
│   ├── data/                      # Technical preferences
│   └── core-config.yaml           # BMAD configuration
├── .taskmaster/                    # TaskMaster AI setup
│   ├── rules/                     # Development rules
│   │   ├── api.md                 # API development patterns
│   │   ├── database.md            # Database patterns
│   │   ├── authentication.md     # Auth implementation
│   │   ├── ui-styling.md          # UI component patterns
│   │   └── architecture-tech-stack.md
│   └── docs/
├── .windsurf/                      # Windsurf IDE configuration
│   └── rules/                     # BMAD agent rules
├── apps/                          # Applications
│   └── web/                       # Next.js main application
├── packages/                      # Shared packages
│   ├── api/                       # Hono API server
│   ├── auth/                      # Authentication
│   ├── database/                  # Prisma + Supabase
│   ├── payments/                  # Payment providers
│   ├── mail/                      # Notifications
│   └── util/                      # Shared utilities
├── tooling/                       # Build configuration
│   ├── eslint/                    # ESLint config
│   ├── tailwind/                  # Tailwind config
│   └── typescript/                # TypeScript config
├── docs/                          # Documentation
│   ├── prd/                       # Product requirements (sharded)
│   └── architecture/              # Architecture docs (sharded)
├── TASKS.md                       # Comprehensive task documentation
├── BENIN_PHARMA_PRD.md           # Original PRD
└── package.json                   # Root package configuration
```

## Apps Directory Structure

### Main Web Application (`apps/web/`)

```
apps/web/
├── app/                           # Next.js 14 App Router
│   ├── (marketing)/              # Public marketing pages
│   │   ├── layout.tsx            # Marketing layout
│   │   ├── page.tsx              # Homepage
│   │   ├── about/                # About page
│   │   ├── pricing/              # Pricing page
│   │   └── contact/              # Contact page
│   ├── (saas)/                   # Protected SaaS application
│   │   ├── layout.tsx            # Auth-protected layout
│   │   └── app/
│   │       ├── (account)/        # User account pages
│   │       │   ├── layout.tsx    # Account layout
│   │       │   ├── dashboard/    # User dashboard
│   │       │   ├── products/     # Product catalog
│   │       │   │   ├── page.tsx  # Product list
│   │       │   │   └── [id]/     # Product details
│   │       │   ├── cart/         # Shopping cart
│   │       │   │   └── page.tsx
│   │       │   ├── checkout/     # Checkout process
│   │       │   │   └── page.tsx
│   │       │   ├── orders/       # Order history
│   │       │   │   ├── page.tsx  # Orders list
│   │       │   │   └── [id]/     # Order details
│   │       │   └── profile/      # User profile
│   │       │       └── page.tsx
│   │       └── admin/            # Admin panel (role-protected)
│   │           ├── layout.tsx    # Admin layout
│   │           ├── page.tsx      # Admin dashboard
│   │           ├── products/     # Product management
│   │           ├── orders/       # Order management
│   │           ├── customers/    # Customer management
│   │           └── inventory/    # Inventory management
│   ├── (auth)/                   # Authentication pages
│   │   ├── layout.tsx            # Auth layout
│   │   ├── login/                # Login page
│   │   ├── signup/               # Registration
│   │   ├── forgot-password/      # Password reset
│   │   └── verify-email/         # Email verification
│   ├── api/                      # API routes (minimal, most logic in packages/api)
│   │   ├── auth/                 # Auth callbacks
│   │   └── webhooks/             # Payment webhooks
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root redirect
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/                    # Form components
│   │   ├── contact-form.tsx
│   │   └── newsletter-form.tsx
│   └── layout/                   # Layout components
│       ├── header.tsx
│       ├── footer.tsx
│       ├── navigation.tsx
│       └── sidebar.tsx
├── modules/                      # Feature-based modules
│   └── saas/                     # SaaS-specific modules
│       ├── auth/                 # Authentication modules
│       │   ├── components/
│       │   │   ├── login-form.tsx
│       │   │   ├── signup-form.tsx
│       │   │   └── business-signup-form.tsx
│       │   ├── hooks/
│       │   │   ├── use-login.ts
│       │   │   └── use-signup.ts
│       │   └── types/
│       ├── products/             # Product catalog modules
│       │   ├── components/
│       │   │   ├── product-catalog.tsx
│       │   │   ├── product-card.tsx
│       │   │   ├── product-search.tsx
│       │   │   ├── product-filters.tsx
│       │   │   └── product-form.tsx
│       │   ├── hooks/
│       │   │   ├── use-products.ts
│       │   │   ├── use-product.ts
│       │   │   └── use-product-search.ts
│       │   └── types/
│       ├── cart/                 # Shopping cart modules
│       │   ├── components/
│       │   │   ├── shopping-cart.tsx
│       │   │   ├── cart-item.tsx
│       │   │   └── cart-summary.tsx
│       │   ├── hooks/
│       │   │   ├── use-cart.ts
│       │   │   └── use-add-to-cart.ts
│       │   └── store/
│       │       └── cart-store.ts
│       ├── orders/               # Order management modules
│       │   ├── components/
│       │   │   ├── checkout-form.tsx
│       │   │   ├── order-summary.tsx
│       │   │   ├── order-history.tsx
│       │   │   └── order-status.tsx
│       │   ├── hooks/
│       │   │   ├── use-create-order.ts
│       │   │   └── use-orders.ts
│       │   └── types/
│       ├── payments/             # Payment modules
│       │   ├── components/
│       │   │   ├── flutterwave-checkout.tsx
│       │   │   ├── opay-checkout.tsx
│       │   │   └── payment-status.tsx
│       │   ├── hooks/
│       │   │   ├── use-payment.ts
│       │   │   └── use-payment-verification.ts
│       │   └── types/
│       ├── admin/                # Admin panel modules
│       │   ├── components/
│       │   │   ├── admin-dashboard.tsx
│       │   │   ├── orders-table.tsx
│       │   │   ├── customers-table.tsx
│       │   │   └── stats-cards.tsx
│       │   ├── hooks/
│       │   │   ├── use-admin-stats.ts
│       │   │   └── use-admin-orders.ts
│       │   └── types/
│       └── inventory/            # Inventory management modules
│           ├── components/
│           │   ├── inventory-list.tsx
│           │   ├── low-stock-alerts.tsx
│           │   └── stock-adjustment-form.tsx
│           ├── hooks/
│           │   ├── use-inventory.ts
│           │   └── use-stock-alerts.ts
│           └── types/
├── lib/                          # Utility functions
│   ├── utils.ts                  # General utilities
│   ├── validations.ts            # Zod schemas
│   ├── constants.ts              # App constants
│   └── nigerian-utils.ts         # Nigerian-specific utilities
├── content/                      # MDX content
│   ├── legal/                    # Legal documents
│   │   ├── privacy-policy.md
│   │   └── terms.md
│   └── blog/                     # Blog posts (future)
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── styles/                       # Additional styles
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind configuration
└── package.json                  # App dependencies
```

## Packages Directory Structure

### API Package (`packages/api/`)

```
packages/api/
├── src/
│   ├── index.ts                  # Main Hono app
│   ├── routes/                   # API route definitions
│   │   ├── products.ts           # Product endpoints
│   │   ├── orders.ts             # Order endpoints
│   │   ├── cart.ts               # Cart endpoints
│   │   ├── payments/             # Payment endpoints
│   │   │   ├── index.ts          # Main payment routes
│   │   │   ├── flutterwave.ts    # Flutterwave specific
│   │   │   ├── opay.ts           # OPay specific
│   │   │   └── paystack.ts       # Paystack specific
│   │   ├── notifications.ts      # Notification endpoints
│   │   ├── inventory.ts          # Inventory endpoints
│   │   ├── admin.ts              # Admin endpoints
│   │   └── auth.ts               # Auth endpoints (if needed)
│   ├── middleware/               # Hono middleware
│   │   ├── auth.ts               # Authentication middleware
│   │   ├── cors.ts               # CORS middleware
│   │   ├── validation.ts         # Input validation
│   │   ├── rate-limit.ts         # Rate limiting
│   │   └── error-handler.ts      # Error handling
│   ├── types/                    # API-specific types
│   │   ├── requests.ts           # Request types
│   │   ├── responses.ts          # Response types
│   │   └── common.ts             # Common types
│   └── utils/                    # API utilities
│       ├── validation.ts         # Validation helpers
│       ├── errors.ts             # Error utilities
│       └── responses.ts          # Response helpers
└── package.json
```

### Database Package (`packages/database/`)

```
packages/database/
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
│       └── [timestamp]_[name]/
├── src/
│   ├── client.ts                 # Prisma client export
│   ├── types.ts                  # Generated types
│   └── seed.ts                   # Database seeding
├── index.ts                      # Main export
└── package.json
```

### Authentication Package (`packages/auth/`)

```
packages/auth/
├── src/
│   ├── config.ts                 # better-auth configuration
│   ├── lib/
│   │   ├── server.ts             # Server-side auth functions
│   │   └── client.ts             # Client-side auth hooks
│   ├── middleware.ts             # Auth middleware
│   └── types.ts                  # Auth types
├── index.ts                      # Main export
└── package.json
```

### Payments Package (`packages/payments/`)

```
packages/payments/
├── src/
│   ├── index.ts                  # Main payment interface
│   ├── provider/                 # Payment provider implementations
│   │   ├── flutterwave/
│   │   │   ├── index.ts          # Flutterwave provider
│   │   │   ├── types.ts          # Flutterwave types
│   │   │   └── utils.ts          # Flutterwave utilities
│   │   ├── opay/
│   │   │   ├── index.ts          # OPay provider
│   │   │   ├── types.ts          # OPay types
│   │   │   └── utils.ts          # OPay utilities
│   │   └── paystack/
│   │       ├── index.ts          # Paystack provider
│   │       ├── types.ts          # Paystack types
│   │       └── utils.ts          # Paystack utilities
│   ├── types/                    # Common payment types
│   │   ├── common.ts             # Shared interfaces
│   │   └── providers.ts          # Provider interfaces
│   └── utils/                    # Payment utilities
│       ├── validation.ts         # Payment validation
│       └── formatting.ts         # Amount formatting
└── package.json
```

### Mail/Notifications Package (`packages/mail/`)

```
packages/mail/
├── src/
│   ├── index.ts                  # Main notification interface
│   ├── provider/
│   │   ├── whatsapp.ts           # WhatsApp Business API
│   │   ├── sms.ts                # SMS provider (Termii)
│   │   └── email.ts              # Email provider (backup)
│   ├── templates/                # Message templates
│   │   ├── order-confirmation.ts
│   │   ├── payment-success.ts
│   │   ├── order-status.ts
│   │   └── low-stock-alert.ts
│   ├── types/                    # Notification types
│   │   ├── providers.ts
│   │   ├── templates.ts
│   │   └── common.ts
│   └── utils/                    # Notification utilities
│       ├── queue.ts              # Message queue
│       ├── retry.ts              # Retry logic
│       └── validation.ts         # Phone validation
└── package.json
```

### Utilities Package (`packages/util/`)

```
packages/util/
├── src/
│   ├── currency.ts               # Naira formatting
│   ├── phone.ts                  # Nigerian phone validation
│   ├── address.ts                # Nigerian address utilities
│   ├── date.ts                   # Date utilities
│   ├── validation.ts             # Common validation
│   ├── constants.ts              # Shared constants
│   └── types.ts                  # Common types
├── index.ts                      # Main export
└── package.json
```

## File Naming Conventions

### React Components
- **PascalCase**: `ProductCard.tsx`, `OrderSummary.tsx`
- **Compound Components**: `ProductCard.Header.tsx`
- **Page Components**: `page.tsx` (App Router convention)
- **Layout Components**: `layout.tsx` (App Router convention)

### TypeScript Files
- **Hooks**: `use-products.ts`, `use-cart.ts`
- **Utilities**: `nigerian-utils.ts`, `payment-utils.ts`
- **Types**: `product-types.ts`, `order-types.ts`
- **API Routes**: `products.ts`, `orders.ts`

### Style Files
- **Global Styles**: `globals.css`
- **Component Styles**: `component.module.css` (if using CSS modules)
- **Tailwind Config**: `tailwind.config.js`

## Import/Export Conventions

### Barrel Exports
```typescript
// packages/api/src/routes/index.ts
export { default as products } from './products'
export { default as orders } from './orders'
export { default as cart } from './cart'
export { default as payments } from './payments'

// packages/util/src/index.ts
export * from './currency'
export * from './phone'
export * from './address'
export * from './validation'
```

### Component Exports
```typescript
// Named exports for components
export function ProductCard({ product }: ProductCardProps) {
  // Component implementation
}

// Default export for pages
export default function ProductsPage() {
  // Page implementation
}
```

### Type Exports
```typescript
// Export types alongside implementations
export interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // Implementation
}
```

## Path Aliases Configuration

### TypeScript Paths (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/modules/*": ["./modules/*"],
      "@saas/api": ["../../packages/api/src"],
      "@saas/auth": ["../../packages/auth/src"],
      "@saas/database": ["../../packages/database/src"],
      "@saas/payments": ["../../packages/payments/src"],
      "@saas/mail": ["../../packages/mail/src"],
      "@saas/util": ["../../packages/util/src"]
    }
  }
}
```

### Import Examples
```typescript
// App imports
import { ProductCard } from '@/modules/saas/products/components/ProductCard'
import { formatNaira } from '@/lib/nigerian-utils'

// Package imports  
import { db } from '@saas/database'
import { getSession } from '@saas/auth/lib/server'
import { FlutterwaveProvider } from '@saas/payments/provider/flutterwave'
```

This source tree structure provides:
1. **Clear separation** between apps and packages
2. **Feature-based organization** for maintainability
3. **Nigerian-specific modules** for local requirements
4. **Consistent naming conventions** for predictability
5. **Scalable architecture** for future growth
