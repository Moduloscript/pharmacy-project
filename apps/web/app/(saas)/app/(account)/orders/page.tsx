import { Metadata } from 'next'
import { OrderHistory } from '@/modules/saas/orders/components/OrderHistory'

export const metadata: Metadata = {
  title: 'Order History - BenPharm Online',
  description: 'View your order history and track deliveries'
}

export default function OrdersPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-muted-foreground">
            Track your orders and view purchase history
          </p>
        </div>
        
        <OrderHistory />
      </div>
    </div>
  )
}
