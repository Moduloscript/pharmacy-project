'use client'

import { atom } from 'jotai'

/**
 * Payment completion handler for managing cart clearing and session state
 * after successful payment processing via webhooks or API callbacks
 */

export interface PaymentCompletionEvent {
  orderId: string
  paymentReference: string
  status: 'success' | 'failed' | 'pending' | 'cancelled'
  gateway: 'flutterwave' | 'paystack' | 'opay' | 'manual'
  amount: number
  currency: string
  customerEmail?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface PaymentCompletionHandler {
  onPaymentSuccess: (event: PaymentCompletionEvent) => Promise<void>
  onPaymentFailed: (event: PaymentCompletionEvent) => Promise<void>
  onPaymentPending: (event: PaymentCompletionEvent) => Promise<void>
  onPaymentCancelled: (event: PaymentCompletionEvent) => Promise<void>
}

// Atom to track payment completion state
export const paymentCompletionStateAtom = atom<{
  lastPaymentId: string | null
  lastPaymentStatus: PaymentCompletionEvent['status'] | null
  lastCompletedAt: Date | null
}>({
  lastPaymentId: null,
  lastPaymentStatus: null,
  lastCompletedAt: null
})

/**
 * Service for handling payment completion events and cart clearing
 */
export class PaymentCompletionService {
  private static instance: PaymentCompletionService
  private handlers: PaymentCompletionHandler[] = []

  private constructor() {}

  public static getInstance(): PaymentCompletionService {
    if (!PaymentCompletionService.instance) {
      PaymentCompletionService.instance = new PaymentCompletionService()
    }
    return PaymentCompletionService.instance
  }

  /**
   * Register a payment completion handler
   */
  public addHandler(handler: PaymentCompletionHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Remove a payment completion handler
   */
  public removeHandler(handler: PaymentCompletionHandler): void {
    const index = this.handlers.indexOf(handler)
    if (index > -1) {
      this.handlers.splice(index, 1)
    }
  }

  /**
   * Process payment completion event
   */
  public async processPaymentEvent(event: PaymentCompletionEvent): Promise<void> {
    try {
      // Update payment state
      if (typeof window !== 'undefined') {
        // Update local storage for client-side tracking
        localStorage.setItem('last_payment_event', JSON.stringify(event))
      }

      // Process based on payment status
      switch (event.status) {
        case 'success':
          await this.handlePaymentSuccess(event)
          break
        case 'failed':
          await this.handlePaymentFailed(event)
          break
        case 'pending':
          await this.handlePaymentPending(event)
          break
        case 'cancelled':
          await this.handlePaymentCancelled(event)
          break
        default:
          console.warn('Unknown payment status:', event.status)
      }
    } catch (error) {
      console.error('Error processing payment event:', error)
      throw error
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(event: PaymentCompletionEvent): Promise<void> {
    console.log('Payment successful:', event.paymentReference)

    // Clear cart via cart clearing mechanism
    if (typeof window !== 'undefined') {
      // Trigger cart clearing via custom event
      window.dispatchEvent(new CustomEvent('payment-success', {
        detail: {
          orderId: event.orderId,
          paymentReference: event.paymentReference,
          clearReason: 'payment_success'
        }
      }))
    }

    // Call all registered handlers
    await Promise.all(
      this.handlers.map(handler => handler.onPaymentSuccess(event))
    )

    // Track analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: event.paymentReference,
        currency: event.currency,
        value: event.amount,
        payment_method: event.gateway
      })
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(event: PaymentCompletionEvent): Promise<void> {
    console.log('Payment failed:', event.paymentReference)

    // Call all registered handlers
    await Promise.all(
      this.handlers.map(handler => handler.onPaymentFailed(event))
    )

    // Don't clear cart on failure - user can retry
  }

  /**
   * Handle pending payment
   */
  private async handlePaymentPending(event: PaymentCompletionEvent): Promise<void> {
    console.log('Payment pending:', event.paymentReference)

    // Call all registered handlers
    await Promise.all(
      this.handlers.map(handler => handler.onPaymentPending(event))
    )

    // Don't clear cart on pending - wait for final status
  }

  /**
   * Handle cancelled payment
   */
  private async handlePaymentCancelled(event: PaymentCompletionEvent): Promise<void> {
    console.log('Payment cancelled:', event.paymentReference)

    // Call all registered handlers
    await Promise.all(
      this.handlers.map(handler => handler.onPaymentCancelled(event))
    )

    // Don't clear cart on cancellation - user can retry
  }

  /**
   * Check for payment completion from URL parameters (for redirects)
   */
  public checkPaymentFromUrl(searchParams: URLSearchParams): PaymentCompletionEvent | null {
    const status = searchParams.get('status')
    const reference = searchParams.get('reference') || searchParams.get('tx_ref')
    const orderId = searchParams.get('order_id') || searchParams.get('orderId')
    const gateway = searchParams.get('gateway') || 'unknown'
    const amount = searchParams.get('amount')

    if (status && reference) {
      return {
        orderId: orderId || `unknown_${Date.now()}`,
        paymentReference: reference,
        status: this.normalizePaymentStatus(status),
        gateway: gateway as PaymentCompletionEvent['gateway'],
        amount: amount ? parseFloat(amount) : 0,
        currency: 'NGN', // Default to NGN for BenPharma
        timestamp: new Date()
      }
    }

    return null
  }

  /**
   * Normalize payment status from different gateways
   */
  private normalizePaymentStatus(status: string): PaymentCompletionEvent['status'] {
    const normalizedStatus = status.toLowerCase()
    
    if (['successful', 'success', 'completed', 'paid'].includes(normalizedStatus)) {
      return 'success'
    } else if (['failed', 'error', 'declined', 'rejected'].includes(normalizedStatus)) {
      return 'failed'
    } else if (['pending', 'processing', 'initiated'].includes(normalizedStatus)) {
      return 'pending'
    } else if (['cancelled', 'canceled', 'aborted'].includes(normalizedStatus)) {
      return 'cancelled'
    }

    return 'failed' // Default to failed for unknown statuses
  }

  /**
   * Create a default handler that integrates with the cart system
   */
  public static createCartIntegrationHandler(): PaymentCompletionHandler {
    return {
      onPaymentSuccess: async (event) => {
        console.log('Cart integration: Payment successful, clearing cart')
        // This will be picked up by the cart clearing event listener
      },
      onPaymentFailed: async (event) => {
        console.log('Cart integration: Payment failed, keeping cart')
      },
      onPaymentPending: async (event) => {
        console.log('Cart integration: Payment pending, keeping cart')
      },
      onPaymentCancelled: async (event) => {
        console.log('Cart integration: Payment cancelled, keeping cart')
      }
    }
  }
}

// Export singleton instance
export const paymentCompletionService = PaymentCompletionService.getInstance()

// Auto-register cart integration handler
paymentCompletionService.addHandler(
  PaymentCompletionService.createCartIntegrationHandler()
)

/**
 * Hook for React components to handle payment completion
 */
export const usePaymentCompletion = () => {
  const service = paymentCompletionService

  const handlePaymentFromUrl = (searchParams: URLSearchParams) => {
    const event = service.checkPaymentFromUrl(searchParams)
    if (event) {
      service.processPaymentEvent(event)
      return event
    }
    return null
  }

  const processPaymentEvent = (event: PaymentCompletionEvent) => {
    return service.processPaymentEvent(event)
  }

  return {
    handlePaymentFromUrl,
    processPaymentEvent,
    addHandler: service.addHandler.bind(service),
    removeHandler: service.removeHandler.bind(service)
  }
}
