# BenPharm Online - System Architecture Document

## 1. Executive Summary

### 1.1 Document Purpose
This document defines the technical architecture for BenPharm Online, a pharmaceutical e-commerce platform serving Benin City, Edo State, and broader Nigerian markets. It complements the Product Requirements Document (PRD) with detailed technical specifications, implementation patterns, and architectural decisions.

### 1.2 System Overview
BenPharm Online is built on a modern monorepo architecture using Next.js 14+, Supabase PostgreSQL, and Hono API framework. The system prioritizes Nigerian market requirements including Naira currency, local payment gateways (Flutterwave, OPay, Paystack), and WhatsApp/SMS notifications.

### 1.3 Current Status
- **Completion**: 70% (7 of 10 major features implemented)
- **Completed**: Database schema, product catalog, authentication, cart, orders, admin dashboard
- **Pending**: Payment gateways, WhatsApp/SMS notifications, inventory management

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Web Browser (Mobile/Desktop) │ WhatsApp Business │ SMS     │
└────────────────┬───────────────┴─────────┬────────┴─────────┘
                 │                         │
                 ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│        Next.js 14 App Router (Server Components)            │
│  ┌──────────────┬──────────────┬────────────────────────┐  │
│  │   Marketing  │  SaaS App    │  Admin Dashboard       │  │
│  │   (Public)   │  (Protected) │  (Admin Only)          │  │
│  └──────────────┴──────────────┴────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
├─────────────────────────────────────────────────────────────┤
│                    Hono Framework API                        │
│  ┌──────────┬──────────┬──────────┬────────────────────┐  │
│  │ Products │  Orders  │ Payments │  Notifications     │  │
│  │   API    │   API    │   API    │      API          │  │
│  └──────────┴──────────┴──────────┴────────────────────┘  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│         Supabase PostgreSQL + Prisma ORM                    │
│  ┌──────────┬──────────┬──────────┬────────────────────┐  │
│  │ Products │  Orders  │  Users   │   Inventory        │  │
│  │  Tables  │  Tables  │  Tables  │    Tables          │  │
│  └──────────┴──────────┴──────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────┤
│ Flutterwave │ OPay │ Paystack │ WhatsApp API │ Termii SMS  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo Structure

```
pharmacy-project/
├── apps/
│   └── web/                        # Next.js 14 application
│       ├── app/                    # App Router pages
│       │   ├── (marketing)/        # Public marketing pages
│       │   ├── (saas)/            # Protected SaaS application
│       │   │   └── app/
│       │   │       ├── (account)/ # User dashboard
│       │   │       ├── admin/     # Admin panel
│       │   │       ├── products/  # Product catalog
│       │   │       ├── cart/      # Shopping cart
│       │   │       ├── checkout/  # Checkout flow
│       │   │       └── orders/    # Order management
│       │   └── api/               # API routes (if needed)
│       └── modules/               # Feature modules
│           └── saas/
│               ├── auth/          # Authentication components
│               ├── products/      # Product components
│               ├── cart/          # Cart components
│               ├── orders/        # Order components
│               ├── payments/      # Payment components
│               ├── admin/         # Admin components
│               └── inventory/     # Inventory components
├── packages/
│   ├── api/                       # Hono API server
│   │   └── src/
│   │       ├── routes/           # API route definitions
│   │       ├── middleware/       # Auth, CORS, etc.
│   │       └── types/           # API TypeScript types
│   ├── auth/                      # better-auth setup
│   │   └── lib/
│   │       ├── server.ts        # Server-side auth
│   │       └── client.ts        # Client-side auth
│   ├── database/                  # Prisma + Supabase
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema
│   │   │   └── migrations/      # Migration files
│   │   └── src/
│   │       └── client.ts        # Prisma client
│   ├── payments/                  # Payment integrations
│   │   └── provider/
│   │       ├── flutterwave/     # Primary gateway
│   │       ├── opay/            # Secondary gateway
│   │       └── paystack/        # Tertiary gateway
│   ├── mail/                      # Notifications
│   │   └── src/
│   │       └── provider/
│   │           ├── whatsapp.ts  # WhatsApp Business API
│   │           └── sms.ts       # Termii SMS
│   └── util/                      # Shared utilities
└── tooling/                       # Build tools
    ├── tailwind/                 # Tailwind config
    ├── typescript/               # TypeScript config
    └── eslint/                   # ESLint config
```

---

## 3. Technology Stack

### 3.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|----------|
| **Frontend Framework** | Next.js | 14+ | React framework with App Router |
| **UI Components** | Radix UI + shadcn/ui | Latest | Accessible component library |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS framework |
| **State Management** | Jotai + TanStack Query | Latest | Client & server state |
| **Form Handling** | react-hook-form + Zod | Latest | Form validation |
| **Database** | Supabase PostgreSQL | Latest | Primary database |
| **ORM** | Prisma | 5.x | Type-safe database access |
| **API Framework** | Hono | 4.x | Edge-compatible API |
| **Authentication** | better-auth | Latest | Flexible auth system |
| **Monorepo** | TurboRepo | Latest | Build system |
| **Package Manager** | pnpm | 8.x | Fast, disk-efficient |
| **Language** | TypeScript | 5.x | Type safety |

### 3.2 Nigerian-Specific Integrations

| Service | Provider | Purpose | Priority |
|---------|----------|---------|----------|
| **Payment Gateway** | Flutterwave | Primary payment processing | P0 |
| **Payment Gateway** | OPay | Secondary payment option | P1 |
| **Payment Gateway** | Paystack | Tertiary payment option | P2 |
| **SMS Provider** | Termii | SMS notifications | P0 |
| **WhatsApp** | WhatsApp Business API | Order notifications | P0 |
| **Maps** | Google Maps API | Delivery location | P1 |

---

## 4. Database Architecture

### 4.1 Schema Design Overview

```prisma
// Core Models with Nigerian-specific fields

model User {
  id                String   @id @default(cuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  email             String   @unique
  emailVerified     Boolean  @default(false)
  name              String
  phone             String?  // Nigerian format: +234XXXXXXXXXX
  businessName      String?
  customerType      CustomerType @default(RETAIL)
  businessRegNumber String?  // CAC registration
  state             String?  // Nigerian state
  lga               String?  // Local Government Area
  address           String?
  creditLimit       Decimal? @default(0)
  
  // Relationships
  orders            Order[]
  cart              Cart?
  notifications     NotificationPreference?
  
  @@map("users")
}

model Product {
  id                    String   @id @default(cuid())
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  name                 String
  genericName          String?
  brand                String
  category             String
  description          String?
  imageUrl             String?
  nafdacRegNumber      String?  // NAFDAC registration
  batchNumber          String?
  expiryDate           DateTime?
  wholesalePrice       Decimal  // In Naira
  retailPrice          Decimal  // In Naira
  stockQuantity        Int      @default(0)
  minOrderQty          Int      @default(1)
  reorderLevel         Int      @default(10)
  isPrescriptionRequired Boolean @default(false)
  isActive             Boolean  @default(true)
  
  // Relationships
  orderItems           OrderItem[]
  cartItems            CartItem[]
  inventoryLogs        InventoryLog[]
  
  @@index([category])
  @@index([nafdacRegNumber])
  @@map("products")
}

model Order {
  id                String   @id @default(cuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  orderNumber       String   @unique
  userId            String
  totalAmount       Decimal  // In Naira
  paymentStatus     PaymentStatus @default(PENDING)
  orderStatus       OrderStatus @default(RECEIVED)
  paymentMethod     PaymentMethod?
  paymentReference  String?
  deliveryAddress   String
  deliveryState     String   // Nigerian state
  deliveryLga       String   // Local Government Area
  deliveryFee       Decimal  @default(0)
  notes             String?
  
  // Relationships
  user              User     @relation(fields: [userId], references: [id])
  items             OrderItem[]
  payment           Payment?
  notifications     OrderNotification[]
  
  @@index([userId])
  @@index([orderStatus])
  @@map("orders")
}

model Payment {
  id                    String   @id @default(cuid())
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  orderId              String   @unique
  amount               Decimal  // In Naira
  gateway              PaymentGateway
  transactionReference String   @unique
  status               PaymentTransactionStatus
  gatewayResponse      Json?
  
  // Relationships
  order                Order    @relation(fields: [orderId], references: [id])
  
  @@index([transactionReference])
  @@map("payments")
}

// Enums
enum CustomerType {
  RETAIL
  PHARMACY
  CLINIC
  HOSPITAL
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum OrderStatus {
  RECEIVED
  PROCESSING
  READY
  DISPATCHED
  DELIVERED
  CANCELLED
}

enum PaymentMethod {
  CARD
  BANK_TRANSFER
  USSD
  CASH_ON_DELIVERY
}

enum PaymentGateway {
  FLUTTERWAVE
  OPAY
  PAYSTACK
}

enum PaymentTransactionStatus {
  PENDING
  SUCCESS
  FAILED
  ABANDONED
}
```

### 4.2 Database Security
- Row Level Security (RLS) enabled on all tables
- User data isolation through RLS policies
- Secure connection via Supabase connection pooling
- Environment-based database URLs (DATABASE_URL, DIRECT_URL)

---

## 5. API Architecture

### 5.1 Hono API Structure

```typescript
// packages/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Route imports
import products from './routes/products'
import orders from './routes/orders'
import cart from './routes/cart'
import payments from './routes/payments'
import notifications from './routes/notifications'
import inventory from './routes/inventory'
import admin from './routes/admin'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Mount routes
app.route('/products', products)
app.route('/orders', orders)
app.route('/cart', cart)
app.route('/payments', payments)
app.route('/notifications', notifications)
app.route('/inventory', inventory)
app.route('/admin', admin)

export default app
export type ApiType = typeof app
```

### 5.2 API Endpoint Patterns

```typescript
// RESTful endpoint structure
GET    /api/products              // List products
GET    /api/products/:id          // Get single product
POST   /api/products              // Create product (admin)
PUT    /api/products/:id          // Update product (admin)
DELETE /api/products/:id          // Delete product (admin)

GET    /api/orders                // List user orders
GET    /api/orders/:id            // Get order details
POST   /api/orders                // Create order
PUT    /api/orders/:id/status     // Update order status

POST   /api/cart/add              // Add to cart
PUT    /api/cart/update           // Update cart item
DELETE /api/cart/remove/:id       // Remove from cart
GET    /api/cart                  // Get cart

POST   /api/payments/initialize   // Initialize payment
POST   /api/payments/verify       // Verify payment
POST   /api/payments/webhook      // Payment webhook

POST   /api/notifications/send    // Send notification
GET    /api/notifications/preferences // Get preferences
PUT    /api/notifications/preferences // Update preferences
```

### 5.3 API Security
- Authentication middleware using better-auth
- Rate limiting per endpoint
- Input validation with Zod schemas
- CORS configuration for allowed origins
- API key authentication for webhook endpoints

---

## 6. Authentication Architecture

### 6.1 better-auth Configuration

```typescript
// packages/auth/src/config.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '@saas/database'

export const auth = betterAuth({
  database: prismaAdapter(db),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update session if older than 1 day
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})
```

### 6.2 Session Management
- Server-side sessions with secure httpOnly cookies
- Client-side session access via useSession hook
- Automatic session refresh
- Role-based access control (admin, user)

---

## 7. Payment Gateway Integration Architecture

### 7.1 Flutterwave Integration (Primary)

```typescript
// packages/payments/provider/flutterwave/index.ts
export class FlutterwaveProvider implements PaymentProvider {
  async initializePayment(order: Order): Promise<PaymentInitResponse> {
    const payload = {
      tx_ref: order.orderNumber,
      amount: order.totalAmount,
      currency: 'NGN',
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: order.user.email,
        phone_number: order.user.phone,
        name: order.user.name,
      },
      customizations: {
        title: 'BenPharm Online',
        description: `Payment for Order ${order.orderNumber}`,
        logo: process.env.NEXT_PUBLIC_LOGO_URL,
      },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`,
    }
    
    // Call Flutterwave API
    return await flutterwaveClient.initializeTransaction(payload)
  }
  
  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return await flutterwaveClient.verifyTransaction(reference)
  }
  
  async handleWebhook(payload: any): Promise<WebhookResponse> {
    // Verify webhook signature
    // Process payment update
    return { success: true }
  }
}
```

### 7.2 Payment Flow Architecture

```
User Checkout → Select Payment Method → Initialize Payment
     ↓                                          ↓
Display Cart                          Redirect to Gateway
     ↓                                          ↓
Confirm Order                          Process Payment
     ↓                                          ↓
Create Order Record                    Gateway Callback
     ↓                                          ↓
Generate Order Number                  Verify Payment
                                               ↓
                                        Update Order Status
                                               ↓
                                        Send Notifications
```

### 7.3 Fallback Strategy
1. Try Flutterwave first
2. If Flutterwave fails, offer OPay
3. If OPay fails, offer Paystack
4. Always provide bank transfer as final option

---

## 8. Notification Architecture

### 8.1 WhatsApp Business API Integration

```typescript
// packages/mail/src/provider/whatsapp.ts
export class WhatsAppProvider implements NotificationProvider {
  private client: WhatsAppBusinessClient
  
  async sendOrderConfirmation(order: Order): Promise<void> {
    const template = {
      name: 'order_confirmation',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.user.name },
            { type: 'text', text: order.orderNumber },
            { type: 'text', text: `₦${order.totalAmount}` },
          ],
        },
      ],
    }
    
    await this.client.sendTemplate(order.user.phone, template)
  }
}
```

### 8.2 SMS Integration (Termii)

```typescript
// packages/mail/src/provider/sms.ts
export class TermiiProvider implements SMSProvider {
  async sendSMS(phone: string, message: string): Promise<void> {
    const payload = {
      to: phone,
      from: 'BenPharm',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY,
    }
    
    await termiiClient.sendMessage(payload)
  }
}
```

### 8.3 Notification Queue System
- Use background jobs for sending notifications
- Retry failed notifications with exponential backoff
- Log all notification attempts
- User preference management for notification channels

---

## 9. Inventory Management Architecture

### 9.1 Real-time Stock Tracking

```typescript
// packages/api/src/routes/inventory.ts
export const inventoryRouter = new Hono()

// Stock update with audit log
inventoryRouter.put('/:productId/stock', async (c) => {
  const { productId } = c.req.param()
  const { quantity, reason, type } = await c.req.json()
  
  // Transaction to ensure consistency
  const result = await db.$transaction(async (tx) => {
    // Update product stock
    const product = await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          [type === 'add' ? 'increment' : 'decrement']: quantity,
        },
      },
    })
    
    // Create audit log
    await tx.inventoryLog.create({
      data: {
        productId,
        type,
        quantity,
        reason,
        previousStock: product.stockQuantity - quantity,
        newStock: product.stockQuantity,
        userId: c.get('user').id,
      },
    })
    
    // Check for low stock alert
    if (product.stockQuantity <= product.reorderLevel) {
      await sendLowStockAlert(product)
    }
    
    return product
  })
  
  return c.json(result)
})
```

### 9.2 Expiry Management

```typescript
// Scheduled job for expiry alerts
export async function checkExpiringProducts() {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  const expiringProducts = await db.product.findMany({
    where: {
      expiryDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
  })
  
  for (const product of expiringProducts) {
    await sendExpiryAlert(product)
  }
}
```

---

## 10. Security Architecture

### 10.1 Security Layers

| Layer | Security Measure | Implementation |
|-------|-----------------|----------------|
| **Network** | HTTPS/TLS | Enforced via hosting provider |
| **Application** | CORS | Configured in Hono middleware |
| **Authentication** | Session-based | better-auth with secure cookies |
| **Authorization** | RBAC | Role checks in middleware |
| **Database** | RLS | Supabase Row Level Security |
| **API** | Rate Limiting | Hono rate limit middleware |
| **Input** | Validation | Zod schemas on all inputs |
| **Payment** | PCI Compliance | Delegated to payment gateways |
| **Secrets** | Environment Variables | Secure .env management |

### 10.2 Data Protection
- Sensitive data encryption at rest (Supabase)
- No storage of payment card details
- Personal data isolation via RLS
- Audit logs for sensitive operations
- GDPR-compliant data handling

---

## 11. Performance Architecture

### 11.1 Optimization Strategies

| Area | Strategy | Implementation |
|------|----------|----------------|
| **Frontend** | Code Splitting | Next.js automatic splitting |
| **Images** | Optimization | Next.js Image component |
| **API** | Caching | Hono cache middleware |
| **Database** | Indexing | Strategic indexes on queries |
| **State** | Client Cache | TanStack Query caching |
| **Assets** | CDN | Vercel Edge Network |
| **Search** | Debouncing | Product search optimization |

### 11.2 Mobile Optimization
- Progressive Web App (PWA) capabilities
- Responsive design with mobile-first approach
- Reduced JavaScript bundle for 3G/4G
- Lazy loading for images and components
- Offline capability for browsing

---

## 12. Deployment Architecture

### 12.1 Infrastructure

```
Production Environment:
├── Vercel (Frontend)
│   ├── Next.js App
│   ├── Edge Functions
│   └── CDN Distribution
├── Supabase (Backend)
│   ├── PostgreSQL Database
│   ├── Connection Pooling
│   ├── Storage (S3-compatible)
│   └── Realtime (if needed)
└── External Services
    ├── Flutterwave API
    ├── WhatsApp Business API
    └── Termii SMS API
```

### 12.2 Environment Configuration

```bash
# Production Environment Variables
NEXT_PUBLIC_APP_URL=https://benpharm.ng
DATABASE_URL=postgresql://...@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://...@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

# Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_WEBHOOK_SECRET=...

# Notifications
WHATSAPP_API_KEY=...
WHATSAPP_PHONE_ID=...
TERMII_API_KEY=...

# Storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
```

---

## 13. Development Workflow Architecture

### 13.1 Git Workflow
```
main (production)
├── develop (staging)
│   ├── feature/payment-gateway
│   ├── feature/whatsapp-integration
│   └── feature/inventory-management
└── hotfix/critical-bug-fix
```

### 13.2 CI/CD Pipeline
1. Push to feature branch
2. Run automated tests
3. Merge to develop
4. Deploy to staging
5. Manual QA testing
6. Merge to main
7. Auto-deploy to production

---

## 14. Monitoring and Logging

### 14.1 Application Monitoring
- Vercel Analytics for frontend performance
- Supabase Dashboard for database metrics
- Custom dashboard for business metrics
- Error tracking with Sentry (optional)

### 14.2 Logging Strategy
```typescript
// Structured logging
logger.info('Order created', {
  orderId: order.id,
  userId: user.id,
  amount: order.totalAmount,
  paymentMethod: order.paymentMethod,
})
```

---

## 15. Disaster Recovery

### 15.1 Backup Strategy
- Automated daily database backups (Supabase)
- Point-in-time recovery capability
- Code repository backup (GitHub)
- Environment configuration backup

### 15.2 Recovery Procedures
1. Database restoration from backup
2. Environment variable restoration
3. Code deployment from repository
4. External service reconnection
5. Data integrity verification

---

## 16. Scalability Considerations

### 16.1 Horizontal Scaling
- Stateless application design
- Database connection pooling
- CDN for static assets
- Edge functions for API routes

### 16.2 Vertical Scaling
- Database performance tiers (Supabase)
- Increased connection limits
- Enhanced CPU/memory allocation
- Storage expansion as needed

---

## 17. Coding Standards

### 17.1 TypeScript Standards
```typescript
// Strict type checking enabled
// No any types without justification
// Proper error handling with try-catch
// Consistent naming conventions:
// - PascalCase for components and types
// - camelCase for functions and variables
// - UPPER_CASE for constants
```

### 17.2 Component Standards
```typescript
// Functional components with TypeScript
export function ProductCard({ product }: ProductCardProps) {
  // Hooks at the top
  const { user } = useSession()
  const addToCart = useAddToCart()
  
  // Event handlers
  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id })
  }
  
  // Render
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  )
}
```

### 17.3 API Standards
```typescript
// Consistent response format
interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: PaginationMeta
  }
}
```

---

## 18. Testing Architecture

### 18.1 Testing Strategy
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- E2E tests for critical user flows
- Manual testing for Nigerian-specific features

### 18.2 Test Coverage Requirements
- Minimum 70% code coverage
- 100% coverage for payment flows
- 100% coverage for authentication
- Manual testing for SMS/WhatsApp

---

## 19. Documentation Standards

### 19.1 Code Documentation
- JSDoc comments for public APIs
- Inline comments for complex logic
- README files in each package
- API documentation with examples

### 19.2 User Documentation
- User manual for customers
- Admin guide for staff
- API documentation for integrations
- Troubleshooting guide

---

## 20. Future Architecture Considerations

### 20.1 Phase 2 Enhancements
- Mobile application (React Native)
- Real-time inventory sync
- Advanced analytics dashboard
- Multi-branch support

### 20.2 Phase 3 Expansion
- B2B marketplace features
- Prescription management system
- Telemedicine integration
- AI-powered drug interactions checker

---

## Appendix A: Nigerian-Specific Configurations

### States and LGAs
- Implement dropdown with all 36 states + FCT
- Dynamic LGA loading based on selected state
- Store as structured data in database

### Phone Number Validation
```typescript
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/
```

### Currency Formatting
```typescript
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}
```

### NAFDAC Validation
```typescript
const NAFDAC_REGEX = /^[A-Z0-9]{2}-\d{4,6}$/
```

---

## Appendix B: Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `AUTH_001` | Invalid credentials | "Email or password is incorrect" |
| `PAYMENT_001` | Payment failed | "Payment could not be processed" |
| `STOCK_001` | Insufficient stock | "Product is out of stock" |
| `ORDER_001` | Order creation failed | "Could not create order" |
| `SMS_001` | SMS send failed | "Could not send SMS notification" |

---

## Document Version
- **Version**: 1.0.0
- **Last Updated**: August 10, 2025
- **Status**: Ready for Implementation
- **Next Review**: After Phase 1 Completion
