'use client'

import { EnhancedCheckoutForm } from '@/modules/saas/orders/components/EnhancedCheckoutForm'
import { useRouter } from 'next/navigation'

interface CheckoutPageProps {
  searchParams: { success?: string; orderId?: string }
}

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const router = useRouter()
  
  const handleCheckoutSuccess = (orderId: string) => {
    // Redirect to order confirmation page
    router.push(`/app/orders/${orderId}?success=true`)
  }
  
  const handleCheckoutCancel = () => {
    router.push('/app/cart')
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-muted-foreground">
            Complete your order with secure payment and delivery options
          </p>
        </div>
        
        <EnhancedCheckoutForm 
          onSuccess={handleCheckoutSuccess}
          onCancel={handleCheckoutCancel}
        />
      </div>
    </div>
  )
}
