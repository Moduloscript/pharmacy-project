# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Commands

### Development Commands

```bash
# Install dependencies (monorepo root)
cd ../.. && pnpm install

# Start API development server (from api package)
pnpm dev

# Type checking
pnpm type-check

# Lint and format
cd ../.. && pnpm lint     # Run biome linter
cd ../.. && pnpm format   # Format with biome

# Run API in isolation
pnpm --filter @repo/api dev

# Generate Prisma client (required before running)
cd ../database && pnpm generate

# Run database migrations
cd ../database && pnpm migrate
```

### Testing Commands

```bash
# No unit tests currently configured for API package
# E2E tests run from web package
cd ../../apps/web && pnpm e2e

# Type check all API code
pnpm type-check
```

## Architecture Overview

### Hono API Structure

This package implements a Hono-based API server with edge-runtime compatibility. The API follows a modular route-based architecture with OpenAPI documentation generation.

```
api/
├── src/
│   ├── app.ts                    # Main Hono app configuration & route mounting
│   ├── middleware/               # Cross-cutting concerns
│   │   ├── auth.ts              # Session authentication via @repo/auth
│   │   ├── cors.ts              # CORS configuration
│   │   ├── logger.ts            # Request logging
│   │   ├── admin.ts             # Admin role verification
│   │   ├── locale.ts            # Internationalization
│   │   ├── csrf-protection.ts   # CSRF token validation
│   │   └── prescription-rate-limit.ts  # Rate limiting for prescriptions
│   ├── routes/                  # API endpoints grouped by domain
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── products.ts          # Product catalog management
│   │   ├── orders.ts            # Order processing
│   │   ├── prescriptions.ts     # Prescription verification system
│   │   ├── payments/            # Payment gateway integrations
│   │   ├── notifications*.ts    # SMS/WhatsApp/Email notifications
│   │   └── admin/               # Admin dashboard endpoints
│   ├── services/                # Business logic layer
│   │   ├── prescription-audit.ts       # Audit logging for prescriptions
│   │   └── prescription-notifications.ts # Notification orchestration
│   └── utils/                   # Shared utilities
│       └── prescription-security.ts    # Security validation utilities
└── index.ts                     # Package export
```

### Request Flow

```
Client Request → CORS → Logger → Auth Middleware → Route Handler → Service Layer → Database/External Service
                                        ↓
                                  Rate Limiting
                                  CSRF Protection (for mutations)
                                  Role-based Access
```

### Key Integration Points

The API integrates with multiple workspace packages:

- **@repo/database**: Prisma ORM for PostgreSQL/Supabase
- **@repo/auth**: better-auth session management
- **@repo/payments**: Nigerian payment gateway orchestration
- **@repo/mail**: Email/SMS/WhatsApp notification providers
- **@repo/storage**: File upload handling (Supabase Storage)
- **@repo/queue**: Background job processing
- **@repo/ai**: OpenAI integration for support features

### OpenAPI Documentation

The API auto-generates OpenAPI documentation available at:
- `/api/docs` - Interactive Scalar documentation UI
- `/api/openapi` - OpenAPI schema JSON (merged with auth schema)
- `/api/app-openapi` - App-specific OpenAPI schema

### Route Organization

Routes are organized by business domain with consistent patterns:

```typescript
// Standard CRUD pattern
GET    /api/{resource}          // List with pagination
GET    /api/{resource}/{id}     // Get single item
POST   /api/{resource}          // Create new
PATCH  /api/{resource}/{id}     // Update existing
DELETE /api/{resource}/{id}     // Delete

// Nigerian-specific endpoints
POST   /api/payments/flutterwave/webhook
POST   /api/notifications/whatsapp/webhook
GET    /api/prescriptions       // Requires admin role
```

### Middleware Execution Order

1. **loggerMiddleware**: Logs all requests
2. **corsMiddleware**: Handles CORS for cross-origin requests
3. **authMiddleware**: Validates session (route-specific)
4. **adminMiddleware**: Checks admin role (admin routes only)
5. **csrfProtection**: Validates CSRF tokens (mutations)
6. **Rate limiters**: Prevents abuse (prescription routes)

### Security Features

- Session-based authentication via @repo/auth
- CSRF protection for state-changing operations
- Rate limiting on sensitive endpoints (prescriptions)
- Input validation using Zod schemas
- Audit logging for prescription operations
- XSS prevention via input sanitization

### Nigerian Business Logic

The API implements specific features for Nigerian pharmaceutical e-commerce:

- **Phone validation**: Nigerian format (+234 or 0[789][01]XXXXXXXX)
- **Payment orchestration**: Flutterwave → OPay → Paystack fallback
- **Prescription verification**: Required for certain products
- **WhatsApp Business**: Primary notification channel
- **Currency**: All amounts in NGN (Naira)
- **NAFDAC compliance**: Product registration validation

### Environment Dependencies

Required environment variables (set in root .env.local):

```bash
# Authentication
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Nigerian Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=...
FLUTTERWAVE_SECRET_KEY=...
FLUTTERWAVE_WEBHOOK_SECRET=...

# Notifications
WHATSAPP_API_TOKEN=...
WHATSAPP_PHONE_ID=...
TERMII_API_KEY=...
```

### Error Handling Pattern

Consistent error response format:

```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",        // Machine-readable
    message: "User message",   // Human-readable
    details?: any              // Optional debug info
  }
}
```

### Database Access

All database operations go through Prisma client from @repo/database:

```typescript
import { db } from "@repo/database"

// Example query with Nigerian business rules
const orders = await db.order.findMany({
  where: {
    customer: {
      businessType: "PHARMACY",
      state: "Lagos"
    }
  }
})
```

### Testing Approach

Currently no unit tests in API package. Testing strategy:
- Type checking via TypeScript strict mode
- E2E tests from web package cover API endpoints
- Manual testing with Hono dev server
- Use `/api/docs` for interactive API testing

### Common Development Tasks

```bash
# Add new route
1. Create route file in src/routes/
2. Import and mount in src/app.ts
3. Add Zod validation schemas
4. Implement business logic in services/
5. Test via /api/docs interface

# Debug requests
- Check console for [DEBUG] logs
- Use loggerMiddleware output
- Inspect via browser DevTools Network tab

# Handle authentication
- Routes requiring auth use authMiddleware
- Access user via c.get("user")
- Admin routes additionally use adminMiddleware
```

### Performance Considerations

- Edge-runtime compatible (no Node.js specific APIs)
- Stateless design for horizontal scaling
- Database connection pooling via Prisma
- Rate limiting on expensive operations
- Caching headers for static responses

## Code Patterns

### Route Handler Pattern

```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { authMiddleware } from "../middleware/auth"

const app = new Hono()

const schema = z.object({
  // validation schema
})

app.post("/", authMiddleware, zValidator("json", schema), async (c) => {
  const user = c.get("user")
  const data = c.req.valid("json")
  
  try {
    // business logic
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ 
      success: false, 
      error: { code: "ERROR_CODE", message: "Error message" }
    }, 500)
  }
})
```

### Service Layer Pattern

```typescript
// services/domain-service.ts
export async function processDomainAction(params: Params) {
  // Validate business rules
  // Perform database operations
  // Trigger side effects (notifications, etc.)
  // Return result
}
```

## Troubleshooting

**TypeScript errors**: Ensure Prisma client is generated (`cd ../database && pnpm generate`)

**Auth failures**: Check BETTER_AUTH_SECRET and BETTER_AUTH_URL in .env.local

**Database connection**: Verify DATABASE_URL and run migrations

**CORS issues**: Check origin configuration in middleware/cors.ts

**404 errors**: Check route mounting in app.ts and path prefixes

**Payment webhooks**: Use ngrok for local webhook testing with Nigerian gateways
