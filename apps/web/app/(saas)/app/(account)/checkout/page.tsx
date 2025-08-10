import { Metadata } from 'next'
import { CheckoutForm } from '@/modules/saas/orders/components/CheckoutForm'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Checkout - BenPharm Online',
  description: 'Complete your order with secure checkout'
}

interface CheckoutPageProps {
  searchParams: { success?: string; orderId?: string }
}

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const handleCheckoutSuccess = (orderId: string) => {
    // Redirect to order confirmation page
    redirect(`/app/orders/${orderId}?success=true`)
  }
  
  const handleCheckoutCancel = () => {
    redirect('/app/cart')
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
        
        <CheckoutForm 
          onSuccess={handleCheckoutSuccess}
          onCancel={handleCheckoutCancel}
        />
      </div>
    </div>
  )
}
