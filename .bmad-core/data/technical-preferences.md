# Technical Preferences for BenPharm Online

## Project Context
- **Project Name**: BenPharm Online
- **Type**: E-commerce platform for pharmaceutical distribution
- **Location**: Benin City, Edo State, Nigeria
- **Current Status**: 70% complete (7/10 tasks done via TaskMaster)

## Framework and Architecture
- **Framework**: Next.js 14+ with App Router
- **Monorepo Structure**: TurboRepo with apps/ and packages/
- **State Management**: Jotai for client state + TanStack Query for server state (NOT useState/useEffect)
- **Database**: Supabase PostgreSQL with Prisma ORM
- **API Framework**: Hono in packages/api
- **Authentication**: better-auth (NOT Auth.js or Supabase Auth)
- **UI Framework**: Radix UI + shadcn/ui with Tailwind CSS
- **Form Handling**: react-hook-form with Zod validation

## Nigerian-Specific Requirements
- **Currency**: Nigerian Naira (₦) - ALWAYS use Naira symbol
- **Phone Format**: +234 validation for Nigerian numbers
- **Address Fields**: Include State and LGA (Local Government Area)
- **Payment Gateways Priority**:
  1. Flutterwave (primary) - 1.4% + ₦50 per transaction
  2. OPay (secondary) - 1.5% per transaction
  3. Paystack (tertiary) - 1.5% + ₦100 per transaction
- **SMS Provider**: Termii or Africa's Talking (Nigerian providers)
- **WhatsApp**: WhatsApp Business API for order notifications
- **NAFDAC**: Include NAFDAC registration number fields for medicines
- **Delivery Zones**: Benin City local, Edo State, National

## Development Patterns
- **API Routes**: Use Hono framework patterns in packages/api
- **Database Queries**: Type-safe with Prisma client
- **Component Structure**: Compound components with Radix UI
- **Error Handling**: Consider Nigerian network conditions (intermittent connectivity)
- **Loading States**: Always implement for better UX
- **File Uploads**: Use Supabase Storage (S3-compatible)

## Existing Rules to Follow
- Follow rules in .taskmaster/rules/ directory:
  - api.md - API development standards
  - database.md - Database patterns with Supabase
  - authentication.md - better-auth implementation
  - ui-styling.md - UI component standards
  - architecture-tech-stack.md - Overall architecture

## Current Implementation Status
### Completed:
- Database schema with Nigerian-specific fields
- Product catalog with wholesale/retail pricing
- User authentication with business types
- Shopping cart system
- Order management
- Admin dashboard foundation

### Pending (Priority Order):
1. Payment gateway integration (Flutterwave primary)
2. WhatsApp/SMS notifications
3. Inventory management with expiry tracking

## Code Generation Guidelines
- Always use TypeScript with strict mode
- Follow existing patterns in the codebase
- Include proper error handling for payment failures
- Add loading states for all async operations
- Implement Nigerian phone number validation
- Use Naira symbol (₦) for all currency displays
- Include LGA and State in address forms
- Add NAFDAC fields for pharmaceutical products

## Testing Requirements
- Test with Nigerian phone numbers (+234)
- Test payment flows with Naira amounts
- Verify State/LGA dropdowns work correctly
- Test with slow/intermittent connections
- Validate NAFDAC number formats

## Performance Considerations
- Optimize for mobile (most Nigerian users)
- Consider slow 3G/4G connections
- Implement progressive loading
- Cache product images aggressively
- Use CDN for static assets

## Security Requirements
- Secure payment data handling
- HTTPS everywhere
- Rate limiting on API endpoints
- Input sanitization for all forms
- Session-based auth with secure cookies
