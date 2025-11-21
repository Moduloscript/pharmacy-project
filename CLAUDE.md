# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive pharmaceutical e-commerce and management system built as a monorepo using:
- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Hono API framework with PostgreSQL database
- **Database**: PostgreSQL with Prisma ORM and Zod validation
- **Architecture**: Turborepo monorepo with pnpm package manager

The system serves both B2C and B2W pharmacy operations with features including product management, prescription handling, order processing, payments (Nigerian payment gateways), and inventory management.

## Common Development Commands

### Essential Development Setup
**Critical**: This project requires Node.js >=20 and uses pnpm as the package manager. Do not use npm or yarn.

```bash
# Install dependencies (required first step)
pnpm install

# Copy environment template (create your local environment)
cp .env.local.example .env.local

# Run database migrations after setup
pnpm --filter database migrate

# Generate Prisma client and types
pnpm --filter database generate
```

### Main Commands (run from root)
```bash
# Development with hot reload (runs all workspaces with --concurrency 15)
pnpm dev

# Run only the web application
pnpm --filter web dev

# Build all packages and apps
pnpm build

# Start production server
pnpm start

# Lint all code (runs biome linter)
pnpm lint

# Format code with biome
pnpm format

# Clean build artifacts and turbo cache
pnpm clean

# Type checking across all packages
turbo type-check
```

### Package-Specific Commands
```bash
# Run commands in specific packages
pnpm --filter web dev           # Only web app
pnpm --filter api build         # Only API package
pnpm --filter database migrate  # Only database operations
pnpm --filter database generate # Generate Prisma client

# Install dependencies in specific package
pnpm --filter web add react-query

# Run scripts in all packages matching pattern
pnpm --filter "./packages/*" build
```

### Cache Management
```bash
# Clear turbo cache after env changes or new packages
turbo clean

# Clear node_modules (nuclear option)
pnpm clean && pnpm install

# Clear specific package cache
turbo clean --filter web
```

### Database Operations
```bash
cd packages/database

# Generate Prisma client and Zod types
pnpm generate

# Push schema changes to database
pnpm push

# Run migrations
pnpm migrate

# Open Prisma Studio admin interface
pnpm studio

# Type checking
pnpm type-check
```

### Web App Specific
```bash
cd apps/web

# Development server
pnpm dev

# Run E2E tests (interactive mode)
pnpm e2e

# Run E2E tests in CI (headless)
pnpm e2e:ci

# Type checking
pnpm type-check
```

## Architecture Overview

### Monorepo Structure
- `apps/web/` - Main Next.js application with marketing and SaaS features
- `packages/api/` - Hono-based API backend with middleware and routes
- `packages/database/` - Prisma schema, database client, and validation types
- `packages/auth/` - Authentication system with Better Auth
- `packages/payments/` - Multi-gateway payment processing (Flutterwave, Paystack, OPay)
- `packages/mail/` - Email system with multiple providers and templates
- `packages/storage/` - File storage abstraction
- `packages/i18n/` - Internationalization support
- `packages/utils/` - Shared utilities

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **UI**: Radix UI + shadcn/ui + Tailwind CSS 4.0
- **State**: Jotai (client state) + TanStack Query (server state)
- **Database**: PostgreSQL + Prisma ORM + Zod validation
- **API**: Hono framework (edge-compatible)
- **Auth**: Better Auth with passkey support
- **Build**: TurboRepo + pnpm workspaces
- **Validation**: TypeScript (strict mode) + Zod schemas
- **Testing**: Playwright for E2E tests

### High-Level Data Flow
```
Client (Browser) ←→ Next.js App ←→ Hono API ←→ Prisma/PostgreSQL ←→ External Services
                                                                    ↓
                                                           Nigerian Payment Gateways
                                                           WhatsApp/SMS APIs
                                                           File Storage (S3)
```

### Key Business Domains
- **Product Management**: Pharmaceutical products with NAFDAC registration, categories, bulk pricing
- **Customer Management**: Retail/wholesale customers with business verification and credit limits
- **Order Processing**: Prescription handling, order tracking, delivery management
- **Inventory Management**: Batch tracking, expiry management, stock movements (FEFO)
- **Payment Processing**: Nigerian payment gateways with orchestrator and retry logic
- **Notifications**: SMS, WhatsApp, email notifications with rate limiting and preferences

### Database Schema Highlights
- **Products**: Include NAFDAC numbers, expiry dates, batch tracking, controlled substances, bulk pricing rules
- **Customers**: Business verification, credit terms, Nigerian locations (State/LGA), phone validation
- **Orders**: Prescription attachments, delivery tracking, multi-payment support, order status workflow
- **Inventory**: Batch-based tracking, FEFO allocation, movement logging with audit trails
- **Payments**: Multi-gateway support with retry logic, webhook processing, Nigerian currency handling
- **Notifications**: Multi-channel (SMS/WhatsApp/Email) with rate limiting and opt-out management

## Nigerian-Specific Requirements

### Payment Gateway Priority and Implementation
The system implements a payment orchestrator with intelligent fallback logic for the Nigerian market:

1. **Flutterwave** (Primary) - 1.4% + ₦50 per transaction
2. **OPay** (Secondary) - 1.5% per transaction
3. **Paystack** (Tertiary) - 1.5% + ₦100 per transaction

**Implementation files:**
- `packages/payments/provider/flutterwave/`
- `packages/payments/provider/orchestrator.ts`
- `packages/api/src/routes/payments/`

### Nigerian Data Validation Patterns
```typescript
// Phone number format validation
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/

// Currency formatting for Naira
const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount)

// NAFDAC registration validation
const NAFDAC_REGEX = /^[A-Z0-9]{2}-\d{4,6}$/

// Nigerian business registration validation
const BUSINESS_REG_REGEX = /^\d{2}-\d{4}-\d{4}$/
```

### Communication Providers
- **WhatsApp Business API**: Order confirmations and delivery updates
- **Termii SMS**: Fallback notifications and OTP verification
- **Implementation**: `packages/mail/src/provider/whatsapp.ts` and `packages/mail/src/provider/sms.ts`

### Required Environment Variables for Nigerian Operations
```bash
# Payment Gateways (required for testing)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_WEBHOOK_SECRET=...
OPAY_SECRET_KEY=...
PAYSTACK_SECRET_KEY=...

# Nigerian Communications
WHATSAPP_API_TOKEN=...
WHATSAPP_PHONE_ID=...
TERMII_API_KEY=...
SMS_SENDER_ID=BenPharm

# Database (PostgreSQL with Nigerian timezone)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Components**: Functional components with proper TypeScript interfaces
- **Forms**: react-hook-form + Zod validation schemas
- **API**: Consistent response format with comprehensive error handling
- **Testing**: Minimum 70% coverage, 100% for payments/auth flows
- **Nigerian Compliance**: Always include NGN currency, +234 phone format, State/LGA fields

### Authentication Flow
- Uses Better Auth with passkey support
- Organization-based membership system with role management
- Session management with impersonation support for admin users
- Business verification workflow for wholesale customers

### Payment Integration
- Multi-gateway payment orchestrator with intelligent fallback
- Comprehensive retry logic with configurable delays and exponential backoff
- Webhook handling for payment confirmation and status updates
- Nigerian currency handling and transaction fee calculation

### Prescription Handling
- Image upload and PDF preview capabilities with zoom/pan
- Multi-stage approval workflow (Pending → Under Review → Approved/Rejected)
- Comprehensive audit logging for regulatory compliance
- Security logging for access control and data protection

### Development Workflow
```
TASKS.md (specs) → Code Implementation → Testing → Progress Update → Commit
```

Always check detailed task specifications in TASKS.md before starting implementation. Update task progress regularly and mark tasks completed when done.

### Branch & Commit Strategy
```bash
# Branch naming convention
feature/payment-gateway-integration
feature/whatsapp-notifications
bugfix/checkout-flow-error

# Commit message format
feat: implement Flutterwave payment integration with retry logic
fix: resolve Nigerian phone number validation error
docs: update API documentation for payment webhooks
```

## Testing Strategy

### Test Types & Coverage Requirements
- **Unit Tests**: Business logic functions and utility validations
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Critical user flows (Playwright)
- **Manual Testing**: Nigerian-specific features (SMS, payments, WhatsApp)

### Running Tests
```bash
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
- **Nigerian integrations**: Manual testing required for SMS/WhatsApp functionality

### Common Testing Issues & Solutions
- **Build failures**: Run `turbo clean` and `pnpm install`
- **Type errors**: Ensure `packages/database/prisma/schema.prisma` is generated with `pnpm generate`
- **Payment testing**: Use Nigerian test phone numbers (+234) and test cards from Flutterwave
- **Environment issues**: Verify all required env vars are set in `.env.local`

## Important Implementation Notes

### Project Status: ~70% Complete

**✅ Completed Features:**
- Database schema with Nigerian-specific fields
- Product catalog with wholesale/retail pricing and bulk rules
- User authentication with business registration
- Shopping cart with quantity validation
- Order management with prescription handling
- Admin dashboard foundation
- **Nigerian payment system** (Flutterwave + orchestrator + retry logic)

**🚧 In Progress:**
- WhatsApp/SMS notification system with rate limiting
- Inventory management with stock tracking and low-stock alerts
- Enhanced admin interfaces for batch management

### Development Priorities
1. **P0 (Critical)**: Complete notification system (WhatsApp/SMS)
2. **P1 (High)**: Inventory management and automated low-stock alerts
3. **P2 (Medium)**: Mobile app and advanced analytics

### Critical File Locations for Development
- **Payment orchestration**: `packages/payments/src/lib/payment-orchestrator.ts`
- **Order processing**: `packages/api/src/routes/orders/` + `apps/web/modules/saas/orders/`
- **Database schema**: `packages/database/prisma/schema.prisma`
- **Nigerian validation**: `packages/payments/src/lib/nigerian-utils.ts`
- **Notifications**: `packages/mail/src/provider/whatsapp.ts` and `packages/mail/src/provider/sms.ts`

### Key Documentation References
- **TASKS.md**: Detailed implementation specifications and file paths
- **BENIN_PHARMA_PRD.md**: Complete product requirements and business logic
- **PROJECT_WORKFLOW_RULES.md**: Development workflow and team processes
- **docs/architecture.md**: Technical architecture and system design

---

**Remember**: This is a Nigerian pharmaceutical e-commerce platform. Always consider local requirements (currency, phone formats, payment preferences, regulatory compliance) when implementing features. The system must handle Nigerian business operations, payment gateways, and communication patterns effectively.