import { Metadata } from 'next'
import { ShoppingCart } from '@/modules/saas/cart/components/ShoppingCart'

export const metadata: Metadata = {
  title: 'Shopping Cart - BenPharm Online',
  description: 'Review and manage your shopping cart items'
}

export default function CartPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <ShoppingCart />
    </div>
  )
}
