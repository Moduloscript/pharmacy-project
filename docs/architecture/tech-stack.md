# Technology Stack Architecture

## Core Technology Stack

### Frontend Framework
- **Next.js 14+**: React framework with App Router
- **React 18+**: UI library with Server Components
- **TypeScript 5.x**: Type safety and developer experience

### UI and Styling
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-styled component library
- **Tailwind CSS 3.x**: Utility-first styling
- **Framer Motion**: Animations (optional)

### State Management
- **Jotai**: Client-side atom-based state (NOT useState/useEffect)
- **TanStack Query**: Server state and caching
- **Zustand**: Global state if needed (minimal usage)

### Forms and Validation
- **react-hook-form**: Form state management
- **Zod**: Runtime type validation and parsing
- **@hookform/resolvers/zod**: Integration between RHF and Zod

### Database and ORM
- **Supabase PostgreSQL**: Primary database
- **Prisma ORM 5.x**: Type-safe database access
- **Connection Pooling**: Via Supabase (PgBouncer)

### API Framework
- **Hono 4.x**: Edge-compatible API framework
- **better-auth**: Authentication (NOT Auth.js or Supabase Auth)
- **Zod**: API validation schemas

### Build System
- **TurboRepo**: Monorepo build system
- **pnpm 8.x**: Package manager
- **TypeScript**: Strict mode enabled

## Nigerian-Specific Technologies

### Payment Gateways
1. **Flutterwave** (Primary)
   - SDK: @flutterwave/node-sdk
   - Transaction Fee: 1.4% + ₦50
   - Methods: Cards, Bank Transfer, USSD, Mobile Money

2. **OPay** (Secondary)
   - SDK: opay-node-sdk
   - Transaction Fee: 1.5%
   - Methods: Cards, Bank Transfer, Wallet

3. **Paystack** (Tertiary)
   - SDK: paystack-node
   - Transaction Fee: 1.5% + ₦100
   - Methods: Cards, Bank Transfer, USSD, QR

### Communication Services
- **WhatsApp Business API**: Order notifications
- **Termii SMS**: Nigerian SMS provider
- **Africa's Talking**: Backup SMS provider

### Utilities and Helpers
- **libphonenumber-js**: Phone number validation
- **date-fns**: Date manipulation
- **currency.js**: Naira currency handling

## Development Tools

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Testing
- **Vitest**: Unit testing
- **Testing Library**: Component testing
- **Playwright**: E2E testing
- **MSW**: API mocking

### Deployment
- **Vercel**: Frontend hosting
- **Supabase**: Database and backend services
- **GitHub Actions**: CI/CD (if needed)

## Environment Configuration

### Required Environment Variables
```bash
# App
NEXT_PUBLIC_APP_URL=https://benpharm.ng
NEXT_PUBLIC_APP_NAME="BenPharm Online"

# Database
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres

# Authentication
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://benpharm.ng

# Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_WEBHOOK_SECRET=...

OPAY_PUBLIC_KEY=...
OPAY_SECRET_KEY=...

PAYSTACK_PUBLIC_KEY=pk_...
PAYSTACK_SECRET_KEY=sk_...

# Notifications
WHATSAPP_API_KEY=...
WHATSAPP_PHONE_ID=...
TERMII_API_KEY=...

# Storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
```

## Package Structure Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@radix-ui/react-*": "^1.0.0",
    "tailwindcss": "^3.0.0",
    "jotai": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "hono": "^4.0.0",
    "better-auth": "^1.0.0"
  }
}
```

### Nigerian Integration Dependencies
```json
{
  "dependencies": {
    "@flutterwave/node-sdk": "^1.0.0",
    "paystack": "^2.0.0",
    "libphonenumber-js": "^1.0.0",
    "currency.js": "^2.0.0"
  }
}
```

## Development Workflow

### Local Development
1. Clone repository
2. Install dependencies: `pnpm install`
3. Setup environment variables
4. Run database migrations: `pnpm db:push`
5. Start development: `pnpm dev`

### Production Build
1. Build all packages: `pnpm build`
2. Run tests: `pnpm test`
3. Deploy to Vercel
4. Run database migrations on production

## Performance Considerations

### Bundle Optimization
- Code splitting by routes
- Dynamic imports for heavy components
- Tree shaking enabled
- Minimal client-side JavaScript

### Database Performance
- Connection pooling via Supabase
- Strategic database indexes
- Optimized Prisma queries
- Read replicas if needed

### Nigerian Network Optimization
- CDN for static assets
- Optimized for 3G/4G connections
- Progressive loading
- Offline capabilities where possible

## Security Stack

### Application Security
- HTTPS everywhere
- CSP headers
- CORS configuration
- Rate limiting

### Authentication Security
- Secure session cookies
- JWT tokens (short-lived)
- Password hashing
- 2FA support

### Payment Security
- PCI compliance (delegated to gateways)
- Webhook signature verification
- No card data storage
- Audit logging

## Monitoring and Analytics

### Performance Monitoring
- Vercel Analytics
- Core Web Vitals tracking
- API response time monitoring

### Error Tracking
- Error boundaries in React
- API error logging
- User feedback collection

### Business Analytics
- Custom analytics for pharmacy metrics
- Payment success rate tracking
- Inventory turnover analysis

## Scalability Planning

### Horizontal Scaling
- Stateless application design
- CDN for asset delivery
- Database connection pooling

### Vertical Scaling
- Supabase scaling options
- Vercel function scaling
- Storage expansion

This technology stack is specifically chosen for:
1. **Nigerian Market**: Local payment gateways and communication channels
2. **Pharmacy Needs**: Real-time inventory and compliance features  
3. **Performance**: Optimized for Nigerian internet infrastructure
4. **Developer Experience**: Modern tools with excellent TypeScript support
5. **Scalability**: Can grow with the business needs
