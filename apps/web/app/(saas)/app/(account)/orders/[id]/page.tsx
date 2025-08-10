import { Metadata } from 'next'
import { OrderDetails } from '@/modules/saas/orders/components/OrderDetails'

export const metadata: Metadata = {
  title: 'Order Details - BenPharm Online',
  description: 'View detailed information about your order'
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <OrderDetails orderId={params.id} />
      </div>
    </div>
  )
}
