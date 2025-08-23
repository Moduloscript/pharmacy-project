import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PaymentPendingClient } from './PaymentPendingClient'

export const metadata: Metadata = {
  title: 'Payment Pending – BenPharma',
  description: 'Your payment is being processed.',
  robots: 'noindex,nofollow',
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center">Loading...</div>}>
      <PaymentPendingClient />
    </Suspense>
  )
}
