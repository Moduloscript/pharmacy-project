# Coding Standards

## TypeScript Standards

### Strict Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Definitions
```typescript
// Use explicit types, avoid 'any'
interface User {
  id: string
  name: string
  email: string
  phone?: string // Nigerian format: +234XXXXXXXXXX
}

// Use enums for constants
enum CustomerType {
  RETAIL = 'RETAIL',
  PHARMACY = 'PHARMACY',
  CLINIC = 'CLINIC',
  HOSPITAL = 'HOSPITAL'
}

// Use discriminated unions for different states
type PaymentStatus = 
  | { status: 'pending'; reference?: never }
  | { status: 'processing'; reference: string }
  | { status: 'completed'; reference: string; amount: number }
  | { status: 'failed'; reference: string; error: string }
```

### Naming Conventions
- **PascalCase**: Components, types, interfaces, enums
- **camelCase**: Functions, variables, methods
- **UPPER_SNAKE_CASE**: Constants, environment variables
- **kebab-case**: File names, CSS classes

```typescript
// Components
export function ProductCard({ product }: ProductCardProps) {}

// Types and Interfaces
interface ProductCardProps {
  product: Product
}

type PaymentProvider = 'flutterwave' | 'opay' | 'paystack'

// Constants
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/
const MAX_CART_ITEMS = 50

// Functions and variables
const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`
const isValidNigerianPhone = (phone: string) => NIGERIAN_PHONE_REGEX.test(phone)
```

## React Component Standards

### Component Structure
```typescript
// Use functional components with TypeScript
interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
  variant?: 'default' | 'compact'
}

export function ProductCard({ 
  product, 
  onAddToCart,
  variant = 'default' 
}: ProductCardProps) {
  // 1. Hooks at the top
  const { user } = useSession()
  const addToCart = useAddToCart()
  
  // 2. Computed values and state
  const canAddToCart = user && product.stockQuantity > 0
  const displayPrice = user?.customerType === 'RETAIL' 
    ? product.retailPrice 
    : product.wholesalePrice
  
  // 3. Event handlers
  const handleAddToCart = useCallback(() => {
    if (canAddToCart) {
      addToCart.mutate({ productId: product.id })
      onAddToCart?.(product.id)
    }
  }, [canAddToCart, addToCart, product.id, onAddToCart])
  
  // 4. Early returns
  if (!product) return null
  
  // 5. Main render
  return (
    <Card className={cn('product-card', {
      'product-card--compact': variant === 'compact'
    })}>
      <CardContent>
        {/* Component JSX */}
      </CardContent>
    </Card>
  )
}
```

### Compound Components Pattern
```typescript
// Use compound components for complex UI
export function OrderSummary({ children }: OrderSummaryProps) {
  return (
    <Card className="order-summary">
      {children}
    </Card>
  )
}

OrderSummary.Header = function OrderSummaryHeader({ children }: HeaderProps) {
  return <CardHeader>{children}</CardHeader>
}

OrderSummary.Items = function OrderSummaryItems({ items }: ItemsProps) {
  return (
    <CardContent>
      {items.map(item => (
        <OrderItem key={item.id} item={item} />
      ))}
    </CardContent>
  )
}

OrderSummary.Total = function OrderSummaryTotal({ total }: TotalProps) {
  return (
    <CardFooter>
      <span className="total">Total: {formatNaira(total)}</span>
    </CardFooter>
  )
}
```

### Hook Standards
```typescript
// Custom hooks should be pure and reusable
export function useNigerianPhoneValidation() {
  const validatePhone = useCallback((phone: string) => {
    const cleaned = phone.replace(/\s+/g, '')
    return NIGERIAN_PHONE_REGEX.test(cleaned)
  }, [])
  
  const formatPhone = useCallback((phone: string) => {
    const cleaned = phone.replace(/\s+/g, '')
    if (cleaned.startsWith('0')) {
      return `+234${cleaned.slice(1)}`
    }
    if (cleaned.startsWith('234')) {
      return `+${cleaned}`
    }
    if (cleaned.startsWith('+234')) {
      return cleaned
    }
    return phone
  }, [])
  
  return { validatePhone, formatPhone }
}
```

## API Standards

### Hono Route Structure
```typescript
// packages/api/src/routes/products.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@saas/database'
import { authMiddleware } from '../middleware/auth'

const app = new Hono()

// Input validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  brand: z.string().min(1).max(100),
  nafdacRegNumber: z.string().optional(),
  wholesalePrice: z.number().positive(),
  retailPrice: z.number().positive(),
  stockQuantity: z.number().int().min(0),
})

const updateProductSchema = createProductSchema.partial()

// GET /products - List products
app.get('/', 
  zValidator('query', z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
    category: z.string().optional(),
    search: z.string().optional(),
  })),
  async (c) => {
    const { page, limit, category, search } = c.req.valid('query')
    
    const where = {
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { genericName: { contains: search, mode: 'insensitive' } },
        ]
      })
    }
    
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      db.product.count({ where })
    ])
    
    return c.json({
      data: products,
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  }
)

// POST /products - Create product (admin only)
app.post('/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', createProductSchema),
  async (c) => {
    const data = c.req.valid('json')
    
    const product = await db.product.create({
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
    
    return c.json({ data: product }, 201)
  }
)

export default app
```

### Response Format Standards
```typescript
// Consistent API response format
interface ApiResponse<T = any> {
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

// Success response
return c.json({
  data: result,
  meta: { pagination: paginationData }
})

// Error response
return c.json({
  error: {
    code: 'PRODUCT_NOT_FOUND',
    message: 'The requested product was not found'
  }
}, 404)
```

## Database Standards

### Prisma Schema Conventions
```prisma
// Use consistent naming
model Product {
  id                    String   @id @default(cuid())
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  // Nigerian-specific fields
  nafdacRegNumber      String?  // NAFDAC registration
  wholesalePrice       Decimal  // In Naira
  retailPrice          Decimal  // In Naira
  
  // Relationships
  orderItems           OrderItem[]
  
  // Indexes for performance
  @@index([category])
  @@index([nafdacRegNumber])
  @@map("products")
}
```

### Database Query Patterns
```typescript
// Use transactions for multi-table operations
export async function createOrderWithItems(orderData: CreateOrderData) {
  return await db.$transaction(async (tx) => {
    // 1. Create order
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: orderData.userId,
        totalAmount: orderData.totalAmount,
        // ... other fields
      }
    })
    
    // 2. Create order items
    await tx.orderItem.createMany({
      data: orderData.items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }))
    })
    
    // 3. Update stock levels
    for (const item of orderData.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { decrement: item.quantity }
        }
      })
    }
    
    return order
  })
}
```

## Error Handling Standards

### Client-Side Error Handling
```typescript
// Use Error Boundaries for React errors
export function ProductErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ProductError />}
      onError={(error) => {
        console.error('Product component error:', error)
        // Report to error tracking service
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Handle async errors in components
export function ProductList() {
  const { data: products, error, isLoading } = useProducts()
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading products</AlertTitle>
        <AlertDescription>
          {error.message || 'Failed to load products. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }
  
  if (isLoading) {
    return <ProductListSkeleton />
  }
  
  return <ProductGrid products={products} />
}
```

### API Error Handling
```typescript
// Consistent error handling in API routes
export const errorHandler = async (c: Context, next: Next) => {
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
    
    if (error.code === 'P2002') { // Prisma unique constraint
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
}
```

## Nigerian-Specific Standards

### Currency Handling
```typescript
// Always use Naira symbol and formatting
export function formatNaira(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

// Example: formatNaira(1500) => "₦1,500"
```

### Phone Number Validation
```typescript
export const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/

export function validateNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '')
  return NIGERIAN_PHONE_REGEX.test(cleaned)
}

export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '')
  
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`
  }
  if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  
  return cleaned.startsWith('+234') ? cleaned : phone
}
```

### Address Standards
```typescript
interface NigerianAddress {
  street: string
  city: string
  state: string        // Nigerian state
  lga: string          // Local Government Area
  postalCode?: string  // Optional in Nigeria
  country: 'Nigeria'
}

// State and LGA validation
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
] as const
```

## Testing Standards

### Unit Test Structure
```typescript
// Use descriptive test names
describe('formatNaira utility', () => {
  it('should format positive numbers with Naira symbol', () => {
    expect(formatNaira(1500)).toBe('₦1,500')
    expect(formatNaira(1500.50)).toBe('₦1,500.50')
  })
  
  it('should handle zero amount', () => {
    expect(formatNaira(0)).toBe('₦0')
  })
  
  it('should handle string input', () => {
    expect(formatNaira('1500')).toBe('₦1,500')
  })
})
```

### Component Testing
```typescript
// Test components with Nigerian context
describe('ProductCard component', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Paracetamol 500mg',
    brand: 'Emzor',
    nafdacRegNumber: 'A4-1234',
    retailPrice: 500,
    wholesalePrice: 450,
    stockQuantity: 100,
    // ... other fields
  }
  
  it('should display retail price for retail customers', () => {
    render(
      <ProductCard product={mockProduct} />,
      {
        wrapper: ({ children }) => (
          <SessionProvider user={{ customerType: 'RETAIL' }}>
            {children}
          </SessionProvider>
        )
      }
    )
    
    expect(screen.getByText('₦500')).toBeInTheDocument()
  })
  
  it('should display wholesale price for pharmacy customers', () => {
    render(
      <ProductCard product={mockProduct} />,
      {
        wrapper: ({ children }) => (
          <SessionProvider user={{ customerType: 'PHARMACY' }}>
            {children}
          </SessionProvider>
        )
      }
    )
    
    expect(screen.getByText('₦450')).toBeInTheDocument()
  })
})
```

## Performance Standards

### Code Splitting
```typescript
// Lazy load heavy components
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const PaymentProvider = lazy(() => import('./PaymentProvider'))

// Use Suspense with loading states
<Suspense fallback={<DashboardSkeleton />}>
  <AdminDashboard />
</Suspense>
```

### Memoization
```typescript
// Memoize expensive calculations
const ProductCard = memo(({ product, onAddToCart }: ProductCardProps) => {
  const formattedPrice = useMemo(() => 
    formatNaira(product.retailPrice), 
    [product.retailPrice]
  )
  
  const isInStock = useMemo(() => 
    product.stockQuantity > 0, 
    [product.stockQuantity]
  )
  
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  )
})
```

These coding standards ensure:
1. **Consistency** across the codebase
2. **Nigerian compliance** for local market needs
3. **Type safety** with comprehensive TypeScript usage
4. **Performance** through modern React patterns
5. **Maintainability** with clear code structure
