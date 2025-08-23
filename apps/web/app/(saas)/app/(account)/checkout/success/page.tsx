import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PaymentSuccessClient } from './PaymentSuccessClient'

export const metadata: Metadata = {
  title: 'Payment Successful – BenPharma',
  description: 'Your payment has been processed successfully.',
  robots: 'noindex,nofollow',
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center">Loading...</div>}>
      <PaymentSuccessClient />
    </Suspense>
  )
}
