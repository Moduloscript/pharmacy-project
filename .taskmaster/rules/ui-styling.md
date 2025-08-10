# UI Components & Styling Rules - supastarter Next.js

## 🎨 **Design System Standards**

### **Tailwind CSS Foundation**
- ✅ **Tailwind CSS as primary styling solution**
- ✅ **Utility-first approach** with semantic component abstractions
- ✅ **Consistent design tokens** through Tailwind configuration
- ✅ **Responsive-first design** with mobile-first breakpoints

### **Tailwind Configuration Structure**
```typescript
// tooling/tailwind/src/config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './apps/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50: '#...',
          500: '#...',
          900: '#...',
        },
        // Semantic colors
        success: '#...',
        warning: '#...',
        error: '#...',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        // Custom spacing scale
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugins
  ],
}

export default config
```

### **Design Token Hierarchy**
- ✅ **Color system** with consistent palette and semantic meanings
- ✅ **Typography scale** with readable font sizes and line heights
- ✅ **Spacing system** following 4px/8px grid
- ✅ **Shadow system** for depth and elevation
- ✅ **Border radius system** for consistent roundness

## ⚛️ **Radix UI Component Foundation**

### **Headless Component Pattern**
- ✅ **Radix UI for primitive components** (accessibility-first)
- ✅ **shadcn/ui compatibility** for styled component generation
- ✅ **Custom styling** with Tailwind CSS classes
- ✅ **Compound component patterns** for complex UI elements

### **Component Installation Pattern**
```bash
# Install shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form

# Custom component generation
npx shadcn-ui@latest add --help
```

### **Base Component Structure**
```typescript
// apps/web/components/ui/button.tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## 🧩 **Component Architecture**

### **Component Organization**
```typescript
// apps/web/components/
// ├── ui/                    # Base UI components (shadcn/ui)
// │   ├── button.tsx
// │   ├── card.tsx
// │   ├── dialog.tsx
// │   └── form.tsx
// ├── forms/                 # Form-specific components
// │   ├── login-form.tsx
// │   ├── signup-form.tsx
// │   └── contact-form.tsx
// ├── layout/                # Layout components
// │   ├── header.tsx
// │   ├── sidebar.tsx
// │   ├── footer.tsx
// │   └── navigation.tsx
// ├── marketing/             # Marketing site components
// │   ├── hero-section.tsx
// │   ├── feature-grid.tsx
// │   └── pricing-table.tsx
// ├── dashboard/             # Dashboard-specific components
// │   ├── stats-cards.tsx
// │   ├── charts.tsx
// │   └── data-tables.tsx
// └── common/                # Shared components
//     ├── loading-spinner.tsx
//     ├── error-boundary.tsx
//     └── seo-meta.tsx
```

### **Component Composition Patterns**
```typescript
// Compound component pattern
export function Card({ children, ...props }: CardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm" {...props}>
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, ...props }: CardHeaderProps) {
  return (
    <div className="flex flex-col space-y-1.5 p-6" {...props}>
      {children}
    </div>
  )
}

Card.Title = function CardTitle({ children, ...props }: CardTitleProps) {
  return (
    <h3 className="text-lg font-semibold leading-none tracking-tight" {...props}>
      {children}
    </h3>
  )
}

Card.Content = function CardContent({ children, ...props }: CardContentProps) {
  return (
    <div className="p-6 pt-0" {...props}>
      {children}
    </div>
  )
}

// Usage
<Card>
  <Card.Header>
    <Card.Title>User Profile</Card.Title>
  </Card.Header>
  <Card.Content>
    {/* Content */}
  </Card.Content>
</Card>
```

### **Polymorphic Component Pattern**
```typescript
// Flexible component that can render as different elements
type AsChild = { asChild?: boolean }
type ElementProps<T extends keyof JSX.IntrinsicElements> = 
  JSX.IntrinsicElements[T] & AsChild

export function Text<T extends keyof JSX.IntrinsicElements = 'p'>({
  as,
  asChild,
  className,
  children,
  ...props
}: ElementProps<T> & { as?: T }) {
  const Component = asChild ? Slot : (as || 'p')
  
  return (
    <Component
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

// Usage
<Text>Regular paragraph</Text>
<Text as="span">Span element</Text>
<Text asChild><Link>Link element</Link></Text>
```

## 🎯 **Form Components and Patterns**

### **React Hook Form Integration**
```typescript
// Form component with validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof formSchema>

export function LoginForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    // Handle form submission
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
          className={form.formState.errors.email ? 'border-destructive' : ''}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...form.register('password')}
          className={form.formState.errors.password ? 'border-destructive' : ''}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
```

### **Form Component Abstractions**
```typescript
// Reusable form field component
export function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className={required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ''}>
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

// Usage
<FormField label="Email" error={errors.email?.message} required>
  <Input type="email" {...register('email')} />
</FormField>
```

## 📱 **Responsive Design Patterns**

### **Breakpoint System**
```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large desktop
}

// Responsive utilities
const responsive = {
  // Grid layouts
  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  // Spacing
  'p-4 md:p-6 lg:p-8',
  // Typography
  'text-sm md:text-base lg:text-lg',
  // Layout
  'flex-col md:flex-row',
}
```

### **Mobile-First Component Design**
```typescript
// Mobile-first responsive component
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

// Responsive navigation
export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow">
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Desktop navigation */}
      <div className="hidden md:flex md:space-x-8">
        {/* Navigation items */}
      </div>
      
      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          {/* Mobile navigation items */}
        </div>
      )}
    </nav>
  )
}
```

## 🌙 **Theme System and Dark Mode**

### **CSS Variables for Theming**
```css
/* apps/web/app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    /* ... more variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... dark mode variables */
  }
}
```

### **Theme Provider Setup**
```typescript
// apps/web/components/providers/theme-provider.tsx
'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemeProvider>
  )
}

// Theme toggle component
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

## 🎭 **Animation and Transitions**

### **Tailwind Animation Classes**
```typescript
// Loading animations
export function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  )
}

// Fade animations
export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
```

### **Framer Motion Integration (Optional)**
```typescript
'use client'

import { motion } from 'framer-motion'

export function AnimatedCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-lg border bg-card p-6 shadow-sm"
    >
      {children}
    </motion.div>
  )
}
```

## ♿ **Accessibility Standards**

### **Semantic HTML and ARIA**
```typescript
// Accessible modal component
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <DialogHeader>
          <DialogTitle id="modal-title">{title}</DialogTitle>
        </DialogHeader>
        <div id="modal-description">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Accessible form with proper labeling
export function AccessibleForm() {
  return (
    <form>
      <fieldset>
        <legend className="text-lg font-semibold">Personal Information</legend>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              aria-describedby="firstName-error"
            />
            <p id="firstName-error" className="sr-only">
              This field is required
            </p>
          </div>
        </div>
      </fieldset>
    </form>
  )
}
```

### **Focus Management**
```typescript
// Focus trap for modals
import { useFocusTrap } from '@/hooks/use-focus-trap'

export function FocusTrapModal({ children, isOpen }: ModalProps) {
  const trapRef = useFocusTrap(isOpen)

  return (
    <div ref={trapRef} className="fixed inset-0 z-50">
      {children}
    </div>
  )
}

// Skip navigation link
export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
    >
      Skip to main content
    </a>
  )
}
```

## 🧪 **Component Testing**

### **Component Testing with Testing Library**
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })
})
```

### **Visual Regression Testing with Storybook**
```typescript
// Component story
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-x-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}
```

---

## 🔧 **Implementation Checklist**

### **New Component Development:**
- [ ] Follow compound component patterns where appropriate
- [ ] Implement proper TypeScript types with generics
- [ ] Add responsive design with mobile-first approach
- [ ] Include accessibility features (ARIA, keyboard navigation)
- [ ] Support both light and dark themes
- [ ] Add loading and error states
- [ ] Write comprehensive tests (unit + integration)
- [ ] Create Storybook stories for documentation
- [ ] Follow Tailwind CSS utility-first approach

### **Code Review Checklist:**
- [ ] Components follow established patterns
- [ ] Accessibility standards met
- [ ] Responsive design implemented
- [ ] Theme support included
- [ ] TypeScript types comprehensive
- [ ] Tests cover all variants and states
- [ ] Performance optimized (memo, lazy loading)
- [ ] Documentation complete (JSDoc, Storybook)
