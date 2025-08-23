'use client'

import { CheckCircle2, XCircle, Clock, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { cn } from '@ui/lib'

export interface PaymentResultProps {
  type: 'success' | 'error' | 'pending' | 'cancelled'
  reference?: string
  status?: string
  amount?: string
  gateway?: string
  message?: string
  className?: string
}

const resultConfig = {
  success: {
    icon: CheckCircle2,
    title: 'Payment Successful!',
    description: 'Your payment has been processed successfully.',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  error: {
    icon: XCircle,
    title: 'Payment Failed',
    description: 'There was an issue processing your payment.',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  pending: {
    icon: Clock,
    title: 'Payment Pending',
    description: 'Your payment is being processed. Please wait.',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  cancelled: {
    icon: X,
    title: 'Payment Cancelled',
    description: 'Your payment was cancelled.',
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
}

export function PaymentResult({
  type,
  reference,
  status,
  amount,
  gateway,
  message,
  className,
}: PaymentResultProps) {
  const config = resultConfig[type]
  const Icon = config.icon

  return (
    <div className={cn('flex min-h-[60vh] items-center justify-center p-4', className)}>
      <Card className={cn('w-full max-w-lg', config.borderColor, config.bgColor)}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background">
            <Icon className={cn('h-8 w-8', config.iconColor)} />
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription className="text-base">
            {message || config.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Payment Details */}
          {(reference || status || amount || gateway) && (
            <div className="space-y-2 rounded-lg bg-background/50 p-4">
              <h4 className="font-medium text-sm">Payment Details</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {reference && (
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono">{reference}</span>
                  </div>
                )}
                {status && (
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="capitalize">{status.toLowerCase()}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span>₦{parseFloat(amount).toLocaleString()}</span>
                  </div>
                )}
                {gateway && (
                  <div className="flex justify-between">
                    <span>Gateway:</span>
                    <span>{gateway}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/app">Return to Dashboard</Link>
            </Button>
            
            {type === 'error' && (
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/app/checkout">Try Again</Link>
              </Button>
            )}
            
            {type === 'success' && (
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/app/orders">View Orders</Link>
              </Button>
            )}
          </div>

          {/* Support Info */}
          {(type === 'error' || type === 'pending') && (
            <div className="border-t pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <Link href="/support" className="text-primary hover:underline">
                  Contact support
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
