'use client'

import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Alert, AlertDescription } from '@ui/components/alert'
import { 
  extendCartLifetimeAtom, 
  initializeCartExpirationAtom,
  cartSummaryAtom,
  useCartExpiration
} from '../lib/cart-store'

interface CartExpirationWarningProps {
  className?: string
  showCountdown?: boolean
  autoExtendOnActivity?: boolean
}

export function CartExpirationWarning({
  className,
  showCountdown = true,
  autoExtendOnActivity = true
}: CartExpirationWarningProps) {
  const [cartSummary] = useAtom(cartSummaryAtom)
  const [, extendCartLifetime] = useAtom(extendCartLifetimeAtom)
  const [, initializeExpiration] = useAtom(initializeCartExpirationAtom)
  const { getWarningTime, checkExpiration } = useCartExpiration()

  const [warningTime, setWarningTime] = useState<Date | null>(null)
  const [isShowingWarning, setIsShowingWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [hasExpired, setHasExpired] = useState(false)

  // Initialize expiration manager
  useEffect(() => {
    if (cartSummary.items.length > 0) {
      initializeExpiration()
    }
  }, [cartSummary.items.length, initializeExpiration])

  // Check for expiration and warnings
  useEffect(() => {
    const checkExpirationStatus = () => {
      const warning = getWarningTime()
      const expiration = checkExpiration()
      
      setWarningTime(warning)
      setHasExpired(!!expiration)
      
      if (warning && !expiration) {
        const now = new Date()
        const remaining = warning.getTime() - now.getTime()
        
        if (remaining > 0 && remaining <= 10 * 60 * 1000) { // Show warning in last 10 minutes
          setIsShowingWarning(true)
          setTimeRemaining(remaining)
        } else {
          setIsShowingWarning(false)
        }
      } else {
        setIsShowingWarning(false)
      }
    }

    // Check immediately
    checkExpirationStatus()

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkExpirationStatus, 30000)

    return () => clearInterval(interval)
  }, [getWarningTime, checkExpiration])

  // Countdown timer
  useEffect(() => {
    if (!isShowingWarning || timeRemaining <= 0) {
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000
        if (newTime <= 0) {
          setIsShowingWarning(false)
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isShowingWarning, timeRemaining])

  // Auto-extend cart on activity
  useEffect(() => {
    if (!autoExtendOnActivity) return

    const handleActivity = () => {
      if (isShowingWarning || hasExpired) {
        extendCartLifetime('browsing')
        setIsShowingWarning(false)
        setHasExpired(false)
      }
    }

    const events = ['click', 'scroll', 'keypress', 'mousemove']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [autoExtendOnActivity, isShowingWarning, hasExpired, extendCartLifetime])

  // Listen for cart expiration events
  useEffect(() => {
    const handleExpirationWarning = (event: CustomEvent) => {
      setIsShowingWarning(true)
      setHasExpired(true)
    }

    window.addEventListener('cart-expiration-warning', handleExpirationWarning as EventListener)
    
    return () => {
      window.removeEventListener('cart-expiration-warning', handleExpirationWarning as EventListener)
    }
  }, [])

  // Don't show if cart is empty
  if (cartSummary.isEmpty) {
    return null
  }

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle extending cart lifetime
  const handleExtendCart = () => {
    extendCartLifetime('browsing')
    setIsShowingWarning(false)
    setHasExpired(false)
    setTimeRemaining(0)
  }

  // Expired state
  if (hasExpired) {
    return (
      <Alert className={`border-red-200 bg-red-50 dark:bg-red-950/20 ${className}`}>
<AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <div>
<strong className="text-destructive">Cart Expired</strong>
<p className="text-sm text-destructive mt-1">
              Your cart has expired due to inactivity. Items have been cleared for security.
            </p>
          </div>
          <Button 
            onClick={handleExtendCart} 
            size="sm" 
            variant="outline"
className="ml-4 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Start New Session
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Warning state
  if (isShowingWarning && timeRemaining > 0) {
    return (
      <Alert className={`border-amber-200 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
<Clock className="h-4 w-4 text-highlight" />
        <AlertDescription className="flex items-center justify-between">
          <div>
<strong className="text-highlight">Cart Expiring Soon</strong>
<p className="text-sm text-highlight mt-1">
              Your cart will expire in {showCountdown && formatTimeRemaining(timeRemaining)}. 
              Continue shopping to extend your session.
            </p>
          </div>
          <Button 
            onClick={handleExtendCart} 
            size="sm" 
            className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Extend Session
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

export default CartExpirationWarning

/**
 * Hook to use cart expiration warning in any component
 */
export const useCartExpirationWarning = () => {
  const { getWarningTime, checkExpiration, extendCart } = useCartExpiration()
  const [, extendCartLifetime] = useAtom(extendCartLifetimeAtom)

  const [warningState, setWarningState] = useState({
    isWarning: false,
    isExpired: false,
    timeRemaining: 0
  })

  const extendSession = () => {
    extendCartLifetime('browsing')
    setWarningState({
      isWarning: false,
      isExpired: false,
      timeRemaining: 0
    })
  }

  const checkStatus = () => {
    const warning = getWarningTime()
    const expiration = checkExpiration()
    
    if (expiration) {
      setWarningState({
        isWarning: false,
        isExpired: true,
        timeRemaining: 0
      })
    } else if (warning) {
      const now = new Date()
      const remaining = warning.getTime() - now.getTime()
      
      if (remaining > 0 && remaining <= 10 * 60 * 1000) {
        setWarningState({
          isWarning: true,
          isExpired: false,
          timeRemaining: remaining
        })
      }
    } else {
      setWarningState({
        isWarning: false,
        isExpired: false,
        timeRemaining: 0
      })
    }
  }

  return {
    ...warningState,
    extendSession,
    checkStatus
  }
}
