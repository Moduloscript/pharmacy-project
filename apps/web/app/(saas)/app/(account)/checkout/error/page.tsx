import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PaymentErrorClient } from './PaymentErrorClient'

export const metadata: Metadata = {
  title: 'Payment Failed – BenPharma',
  description: 'There was an issue processing your payment.',
  robots: 'noindex,nofollow',
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center">Loading...</div>}>
      <PaymentErrorClient />
    </Suspense>
  )
}
