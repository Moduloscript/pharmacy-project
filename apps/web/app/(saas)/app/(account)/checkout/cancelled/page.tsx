import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PaymentCancelledClient } from './PaymentCancelledClient'

export const metadata: Metadata = {
  title: 'Payment Cancelled – BenPharma',
  description: 'Your payment was cancelled.',
  robots: 'noindex,nofollow',
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center">Loading...</div>}>
      <PaymentCancelledClient />
    </Suspense>
  )
}
