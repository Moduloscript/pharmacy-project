# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Quick Start Commands

### Essential Development Commands

```bash
# Install dependencies (use pnpm, required by packageManager setting)
pnpm install

# Start development server (runs all workspaces with --concurrency 15)
pnpm dev

# Run only the web application
pnpm --filter web dev

# Build for production
pnpm build

# Lint and format code
pnpm lint            # Run biome linter
pnpm format          # Format with biome

# Type checking
pnpm --filter web type-check

# End-to-end testing
pnpm --filter web e2e        # Interactive mode
pnpm --filter web e2e:ci     # CI mode

# Clean turbo cache and build artifacts
pnpm clean
```

### Environment Setup

```bash
# Copy environment template (create your local environment)
cp .env.local.example .env.local

# Run database migrations
pnpm --filter database migrate

# Generate Prisma client
pnpm --filter database generate
```

> **Critical**: This project requires Node.js >=20 and uses pnpm as the package manager. Do not use npm or yarn.

## Repository Architecture

### Monorepo Structure

```
benpharma-project/
├── apps/
│   └── web/                    # Next.js 14+ app (main application)
├── packages/
│   ├── api/                    # Hono API server
│   ├── auth/                   # better-auth authentication
│   ├── database/               # Prisma + Supabase setup
│   ├── payments/               # Nigerian payment gateways
│   ├── mail/                   # Email/SMS/WhatsApp providers
│   ├── i18n/                   # Internationalization
│   └── utils/                  # Shared utilities
├── tooling/
│   ├── tailwind/               # Tailwind CSS config
│   ├── typescript/             # Shared TypeScript configs
│   └── scripts/                # Build and utility scripts
└── config/                     # Shared workspace configuration
```

### Technology Stack

- **Framework**: Next.js 14+ with App Router
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **State**: Jotai (client state) + TanStack Query (server state)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **API**: Hono framework (edge-compatible)
- **Auth**: better-auth with session management
- **Build**: TurboRepo + pnpm workspaces
- **Language**: TypeScript (strict mode)

### High-Level Data Flow

```
Client (Browser) ←→ Next.js App ←→ Hono API ←→ Prisma/Supabase ←→ External Services
                                                                    ↓
                                                           Payment Gateways
                                                           WhatsApp/SMS APIs
```

Understanding complex workflows (payment processing, order management, notifications) requires examining multiple files across packages. Key areas:
- Payment orchestration: `packages/payments/providers/nigerian/`
- Order processing: `packages/api/src/routes/orders.ts` + `apps/web/modules/saas/orders/`
- Database schema: `packages/database/prisma/schema.prisma`

## Development Workflow

### Project Management Integration

This project uses a dual-workflow system:

1. **TASKS.md** - Contains detailed technical specifications, file paths, and implementation details
2. **TaskMaster AI** - Tracks task progress and status updates
3. **PROJECT_WORKFLOW_RULES.md** - Defines the complete workflow patterns

### Daily Development Process

```
Read TASKS.md → Update TaskMaster → Code → Test → Update Progress → Commit
```

Specific steps:
1. Check TASKS.md for technical specifications before starting any feature
2. Update task status in TaskMaster AI (`pending → in progress → review → completed`)
3. Follow exact file paths and code examples provided in TASKS.md
4. Implement Nigerian-specific requirements (currency, phone validation, payment gateways)
5. Update progress in TaskMaster every 2-3 hours
6. Mark tasks completed when done

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Components**: Functional components with proper TypeScript interfaces
- **Forms**: react-hook-form + Zod validation
- **API**: Consistent response format with error handling
- **Testing**: Minimum 70% coverage, 100% for payments/auth flows
- **Nigerian Compliance**: Always include NGN currency, +234 phone format, State/LGA fields

### Branch & Commit Strategy

```bash
# Branch naming
feature/payment-gateway-integration
feature/whatsapp-notifications
bugfix/checkout-flow-error

# Commit messages
feat: implement Flutterwave payment integration
fix: resolve checkout validation error
docs: update API documentation
```

## Nigerian-Specific Integrations

### Payment Gateway Priority

This project implements a payment orchestrator with fallback logic:

1. **Flutterwave** (Primary) - 1.4% + ₦50 per transaction
2. **OPay** (Secondary) - 1.5% per transaction  
3. **Paystack** (Tertiary) - 1.5% + ₦100 per transaction

Implementation files:
- `packages/payments/providers/nigerian/flutterwave.ts`
- `packages/payments/providers/nigerian/orchestrator.ts`
- `apps/web/modules/saas/checkout/EnhancedCheckoutPage.tsx`

### Communication Providers

- **WhatsApp Business API**: Order confirmations and updates
- **Termii SMS**: Fallback notifications and verification
- Implementation: `packages/mail/src/provider/whatsapp.ts` and `packages/mail/src/provider/sms.ts`

### Nigerian Data Validation

```typescript
// Phone number format
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/

// Currency formatting  
const formatNaira = (amount: number) => 
  new Intl.NumberFormat('en-NG', { 
    style: 'currency', 
    currency: 'NGN' 
  }).format(amount)

// NAFDAC registration validation
const NAFDAC_REGEX = /^[A-Z0-9]{2}-\d{4,6}$/
```

### Required Environment Variables

```bash
# Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_WEBHOOK_SECRET=...

# Notifications  
WHATSAPP_API_TOKEN=...
WHATSAPP_PHONE_ID=...
TERMII_API_KEY=...
SMS_SENDER_ID=BenPharm

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## TurboRepo & pnpm Commands

### Understanding Turbo Tasks

Turbo tasks are defined in `turbo.json` and run across the monorepo:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^generate", "^build"] },
    "dev": { "cache": false, "persistent": true },  
    "generate": { "cache": false },
    "lint": {},
    "start": { "dependsOn": ["^generate", "^build"] }
  }
}
```

### Package-Specific Commands

```bash
# Run commands in specific packages
pnpm --filter web dev           # Only web app
pnpm --filter api build         # Only API package  
pnpm --filter database migrate  # Only database operations

# Install dependencies in specific package
pnpm --filter web add react-query

# Run scripts in all packages matching pattern
pnpm --filter "./packages/*" build
```

### Cache Management

```bash
# Clear turbo cache
turbo clean

# Clear node_modules (nuclear option)
pnpm clean:all && pnpm install

# Clear specific package cache
turbo clean --filter web
```

> **Important**: After changing environment variables or adding new packages, run `turbo clean` to clear cache and prevent stale builds.

## Testing Strategy

### Test Types & Coverage

- **Unit Tests**: Utilities and business logic functions
- **Integration Tests**: API endpoints and database operations  
- **E2E Tests**: Critical user flows (Playwright)
- **Manual Testing**: Nigerian-specific features (SMS, payments)

### Running Tests

```bash
# Unit tests (if implemented)
pnpm test

# E2E tests
pnpm --filter web e2e        # Interactive mode with UI
pnpm --filter web e2e:ci     # Headless CI mode

# Type checking across all packages
turbo type-check
```

### Test Coverage Requirements

- **General code**: Minimum 70% coverage
- **Payment flows**: 100% coverage (critical for financial operations)
- **Authentication**: 100% coverage (security critical)
- **Nigerian integrations**: Manual testing required for SMS/WhatsApp

## Project Status

### Current Completion: ~70% (7 of 10 major features)

**✅ Completed Features:**
- Database schema with Nigerian-specific fields
- Product catalog with wholesale/retail pricing
- User authentication with business registration
- Shopping cart with quantity validation
- Order management system
- Admin dashboard foundation
- **Nigerian payment system** (Flutterwave + orchestrator)

**🚧 In Progress:**
- WhatsApp/SMS notification system
- Inventory management with stock tracking
- Enhanced admin interfaces

### Development Priorities

1. **P0 (Critical)**: Complete notification system (WhatsApp/SMS)
2. **P1 (High)**: Inventory management and low-stock alerts  
3. **P2 (Medium)**: Mobile app and advanced analytics

## Key Documentation References

- **TASKS.md**: Detailed implementation specifications and file paths
- **BENIN_PHARMA_PRD.md**: Complete product requirements and business logic
- **docs/architecture.md**: Technical architecture and system design
- **PROJECT_WORKFLOW_RULES.md**: Development workflow and team processes
- **BMAD_INTEGRATION_GUIDE.md**: AI-assisted development methodology

## Getting Help

### Common Issues

**Build failures**: Run `turbo clean` and `pnpm install`
**Type errors**: Check `packages/database/prisma/schema.prisma` is generated
**Payment testing**: Use Nigerian test phone numbers (+234) and test cards
**Environment issues**: Verify all required env vars are set in `.env.local`

### Development Resources

- **Nigerian Payment Testing**: Use Flutterwave test environment
- **Phone/SMS Testing**: Use Termii test API with Nigerian numbers
- **Database**: Supabase dashboard for direct data inspection
- **API Testing**: Hono has built-in development server at `/api/*`

---

**Remember**: This is a Nigerian pharmaceutical e-commerce platform. Always consider local requirements (currency, phone formats, payment preferences, regulatory compliance) when implementing features.
