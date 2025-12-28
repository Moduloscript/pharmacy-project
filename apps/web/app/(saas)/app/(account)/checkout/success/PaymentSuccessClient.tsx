'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { PaymentResult } from '@ui/components/PaymentResult'
import { useAtom } from 'jotai'
import { clearCartAtom } from '@saas/cart/lib/cart-store'
import { usePaymentCompletion } from '@saas/payments/lib/payment-completion-handler'

export function PaymentSuccessClient() {
  const searchParams = useSearchParams()
  const [, clearCart] = useAtom(clearCartAtom)
  const { handlePaymentFromUrl } = usePaymentCompletion()
  const hasTriggeredClearCart = useRef(false)
  
  const status = searchParams.get('status')
  const reference = searchParams.get('reference')
  const gateway = searchParams.get('gateway')
  
  // Handle payment completion using the new service
  useEffect(() => {
    // Only trigger once and only for successful payments
    // Convert status to lowercase for case-insensitive comparison
    const normalizedStatus = status?.toLowerCase();
    if (!hasTriggeredClearCart.current && 
        (normalizedStatus === 'successful' || normalizedStatus === 'success' || normalizedStatus === 'completed')) {
      
      hasTriggeredClearCart.current = true
      
      // Use the payment completion handler
      const paymentEvent = handlePaymentFromUrl(searchParams)
      
      if (paymentEvent && paymentEvent.status === 'success') {
        // Clear cart with payment success reason
        clearCart('payment_success')
      }
      
      // Fallback: Clear cart directly if payment completion service didn't handle it
      if (!paymentEvent) {
        clearCart('payment_success')
        
        // Track successful payment
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: reference,
            currency: 'NGN',
            value: searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : 0,
            payment_method: gateway
          })
        }
      }
    }
  }, [status, reference, gateway, searchParams, clearCart, handlePaymentFromUrl])
  
  return (
    <PaymentResult
      type="success"
      reference={reference || undefined}
      status={status || undefined}
      amount={searchParams.get('amount') || undefined}
      gateway={gateway || undefined}
      message={searchParams.get('message') || undefined}
    />
  )
}
