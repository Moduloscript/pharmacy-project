'use client'

import { useSearchParams } from 'next/navigation'
import { PaymentResult } from '@ui/components/PaymentResult'

export function PaymentCancelledClient() {
  const searchParams = useSearchParams()
  
  return (
    <PaymentResult
      type="cancelled"
      reference={searchParams.get('reference') || undefined}
      status={searchParams.get('status') || undefined}
      amount={searchParams.get('amount') || undefined}
      gateway={searchParams.get('gateway') || undefined}
      message={searchParams.get('message') || undefined}
    />
  )
}
