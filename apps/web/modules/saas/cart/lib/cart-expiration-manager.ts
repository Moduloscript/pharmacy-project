'use client'

import { atom } from 'jotai'

/**
 * Cart expiration manager for handling time-based cart cleanup
 * while preserving concurrent session persistence
 */

export interface CartExpirationConfig {
  // Cart expiration times in milliseconds
  activeSessionTimeout: number // 2 hours of inactivity
  checkoutSessionTimeout: number // 30 minutes in checkout
  abandonedCartTimeout: number // 24 hours for abandoned carts
  concurrentSessionGrace: number // 5 minutes grace for tab switching
  
  // Activity tracking
  trackingInterval: number // How often to check for expiration
  activityEvents: string[] // Events that extend cart lifetime
}

export interface CartActivity {
  lastActivity: Date
  lastHeartbeat: Date
  sessionId: string
  tabId: string
  isActive: boolean
  inCheckout: boolean
  activityType: 'browsing' | 'checkout' | 'payment' | 'idle'
}

export interface ExpirationEvent {
  cartId: string
  sessionId: string
  reason: 'inactivity' | 'abandoned' | 'checkout_timeout' | 'manual'
  lastActivity: Date
  itemCount: number
  metadata?: Record<string, any>
}

// Default configuration
const DEFAULT_EXPIRATION_CONFIG: CartExpirationConfig = {
  activeSessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
  checkoutSessionTimeout: 30 * 60 * 1000, // 30 minutes  
  abandonedCartTimeout: 24 * 60 * 60 * 1000, // 24 hours
  concurrentSessionGrace: 5 * 60 * 1000, // 5 minutes
  trackingInterval: 60 * 1000, // 1 minute
  activityEvents: [
    'click', 'scroll', 'keypress', 'mousemove', 'touchstart',
    'cart_add', 'cart_update', 'cart_remove', 'checkout_start'
  ]
}

// Atoms for expiration management
export const cartExpirationConfigAtom = atom<CartExpirationConfig>(DEFAULT_EXPIRATION_CONFIG)

export const cartActivityAtom = atom<CartActivity>({
  lastActivity: new Date(),
  lastHeartbeat: new Date(),
  sessionId: '',
  tabId: '',
  isActive: true,
  inCheckout: false,
  activityType: 'browsing'
})

export const cartExpirationStateAtom = atom<{
  isExpired: boolean
  expiresAt: Date | null
  warningThreshold: Date | null
  lastExpirationCheck: Date
}>({
  isExpired: false,
  expiresAt: null,
  warningThreshold: null,
  lastExpirationCheck: new Date()
})

/**
 * Cart expiration manager service
 */
export class CartExpirationManager {
  private static instance: CartExpirationManager
  private config: CartExpirationConfig
  private activityTrackers: Map<string, NodeJS.Timeout> = new Map()
  private expirationTimer: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  private constructor(config: CartExpirationConfig = DEFAULT_EXPIRATION_CONFIG) {
    this.config = config
  }

  public static getInstance(config?: CartExpirationConfig): CartExpirationManager {
    if (!CartExpirationManager.instance) {
      CartExpirationManager.instance = new CartExpirationManager(config)
    }
    return CartExpirationManager.instance
  }

  /**
   * Initialize the expiration manager
   */
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }

    this.isInitialized = true
    this.setupActivityTracking()
    this.setupHeartbeat()
    this.setupExpirationTimer()
    this.setupVisibilityHandling()
    this.setupBeforeUnloadHandling()

    console.log('Cart expiration manager initialized')
  }

  /**
   * Cleanup the expiration manager
   */
  public cleanup(): void {
    this.stopActivityTracking()
    this.stopHeartbeat()
    this.stopExpirationTimer()
    this.isInitialized = false
  }

  /**
   * Update cart activity
   */
  public updateActivity(activityType: CartActivity['activityType'] = 'browsing'): void {
    const now = new Date()
    
    if (typeof window !== 'undefined') {
      const activity: CartActivity = {
        lastActivity: now,
        lastHeartbeat: now,
        sessionId: this.getSessionId(),
        tabId: this.getTabId(),
        isActive: !document.hidden,
        inCheckout: activityType === 'checkout' || activityType === 'payment',
        activityType
      }

      // Store in localStorage for cross-tab sync
      localStorage.setItem('cart_activity', JSON.stringify(activity))
      
      // Update expiration time
      this.updateExpirationTime(activity)
    }
  }

  /**
   * Check if cart should expire
   */
  public shouldExpire(): ExpirationEvent | null {
    const activity = this.getCurrentActivity()
    if (!activity) return null

    const now = new Date()
    const timeSinceActivity = now.getTime() - activity.lastActivity.getTime()
    
    // Determine timeout based on current state
    let timeout: number
    let reason: ExpirationEvent['reason']

    if (activity.inCheckout) {
      timeout = this.config.checkoutSessionTimeout
      reason = 'checkout_timeout'
    } else if (activity.isActive) {
      timeout = this.config.activeSessionTimeout
      reason = 'inactivity'
    } else {
      timeout = this.config.abandonedCartTimeout
      reason = 'abandoned'
    }

    if (timeSinceActivity > timeout) {
      return {
        cartId: this.getCartId(),
        sessionId: activity.sessionId,
        reason,
        lastActivity: activity.lastActivity,
        itemCount: this.getCartItemCount(),
        metadata: {
          activityType: activity.activityType,
          inCheckout: activity.inCheckout,
          timeSinceActivity
        }
      }
    }

    return null
  }

  /**
   * Get warning threshold for cart expiration
   */
  public getExpirationWarning(): Date | null {
    const activity = this.getCurrentActivity()
    if (!activity) return null

    const timeout = activity.inCheckout 
      ? this.config.checkoutSessionTimeout 
      : this.config.activeSessionTimeout

    const warningTime = timeout * 0.8 // Warning at 80% of timeout
    return new Date(activity.lastActivity.getTime() + warningTime)
  }

  /**
   * Extend cart lifetime (called during active usage)
   */
  public extendCartLifetime(activityType: CartActivity['activityType'] = 'browsing'): void {
    this.updateActivity(activityType)
  }

  /**
   * Start checkout mode (shorter timeout)
   */
  public startCheckoutMode(): void {
    this.updateActivity('checkout')
  }

  /**
   * Start payment mode (maintain session during payment)
   */
  public startPaymentMode(): void {
    this.updateActivity('payment')
  }

  /**
   * End checkout mode (return to normal timeout)
   */
  public endCheckoutMode(): void {
    this.updateActivity('browsing')
  }

  /**
   * Check for concurrent sessions and handle gracefully
   */
  public handleConcurrentSessions(): boolean {
    const activities = this.getAllSessionActivities()
    const currentSessionId = this.getSessionId()
    const now = new Date()

    // Find other active sessions
    const otherActiveSessions = activities.filter(activity => 
      activity.sessionId !== currentSessionId &&
      (now.getTime() - activity.lastHeartbeat.getTime()) < this.config.concurrentSessionGrace
    )

    if (otherActiveSessions.length > 0) {
      console.log(`Found ${otherActiveSessions.length} concurrent sessions`)
      
      // Extend grace period for all sessions
      this.updateActivity('browsing')
      
      return true // Concurrent sessions detected
    }

    return false // No concurrent sessions
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return

    this.config.activityEvents.forEach(eventType => {
      const handler = () => this.updateActivity('browsing')
      
      if (eventType.startsWith('cart_')) {
        // Custom cart events
        window.addEventListener(eventType, handler)
      } else {
        // Standard DOM events
        document.addEventListener(eventType, handler, { passive: true })
      }
      
      const timeoutId = setTimeout(() => {
        // Cleanup after a reasonable time
      }, 24 * 60 * 60 * 1000) // 24 hours
      
      this.activityTrackers.set(eventType, timeoutId)
    })
  }

  /**
   * Setup heartbeat for cross-tab sync
   */
  private setupHeartbeat(): void {
    if (typeof window === 'undefined') return

    this.heartbeatInterval = setInterval(() => {
      const activity = this.getCurrentActivity()
      if (activity && activity.isActive) {
        activity.lastHeartbeat = new Date()
        localStorage.setItem('cart_activity', JSON.stringify(activity))
      }
    }, 30000) // 30 seconds heartbeat
  }

  /**
   * Setup expiration timer
   */
  private setupExpirationTimer(): void {
    if (typeof window === 'undefined') return

    this.expirationTimer = setInterval(() => {
      const expirationEvent = this.shouldExpire()
      
      if (expirationEvent) {
        console.log('Cart expired:', expirationEvent)
        
        // Dispatch expiration event
        window.dispatchEvent(new CustomEvent('cart-expired', {
          detail: expirationEvent
        }))
      }
    }, this.config.trackingInterval)
  }

  /**
   * Setup visibility change handling
   */
  private setupVisibilityHandling(): void {
    if (typeof window === 'undefined') return

    document.addEventListener('visibilitychange', () => {
      const activity = this.getCurrentActivity()
      if (activity) {
        activity.isActive = !document.hidden
        activity.activityType = document.hidden ? 'idle' : 'browsing'
        localStorage.setItem('cart_activity', JSON.stringify(activity))
      }
    })
  }

  /**
   * Setup before unload handling
   */
  private setupBeforeUnloadHandling(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('beforeunload', () => {
      const activity = this.getCurrentActivity()
      if (activity) {
        activity.isActive = false
        activity.activityType = 'idle'
        localStorage.setItem('cart_activity', JSON.stringify(activity))
      }
    })
  }

  /**
   * Stop activity tracking
   */
  private stopActivityTracking(): void {
    this.activityTrackers.forEach((timeoutId, eventType) => {
      clearTimeout(timeoutId)
      
      if (eventType.startsWith('cart_')) {
        window.removeEventListener(eventType, () => this.updateActivity('browsing'))
      } else {
        document.removeEventListener(eventType, () => this.updateActivity('browsing'))
      }
    })
    
    this.activityTrackers.clear()
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Stop expiration timer
   */
  private stopExpirationTimer(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer)
      this.expirationTimer = null
    }
  }

  /**
   * Update expiration time based on activity
   */
  private updateExpirationTime(activity: CartActivity): void {
    const timeout = activity.inCheckout 
      ? this.config.checkoutSessionTimeout 
      : this.config.activeSessionTimeout

    const expiresAt = new Date(activity.lastActivity.getTime() + timeout)
    const warningThreshold = new Date(activity.lastActivity.getTime() + (timeout * 0.8))

    if (typeof window !== 'undefined') {
      localStorage.setItem('cart_expiration', JSON.stringify({
        expiresAt: expiresAt.toISOString(),
        warningThreshold: warningThreshold.toISOString(),
        lastExpirationCheck: new Date().toISOString()
      }))
    }
  }

  /**
   * Get current activity from storage
   */
  private getCurrentActivity(): CartActivity | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem('cart_activity')
      if (stored) {
        const activity = JSON.parse(stored)
        return {
          ...activity,
          lastActivity: new Date(activity.lastActivity),
          lastHeartbeat: new Date(activity.lastHeartbeat)
        }
      }
    } catch (error) {
      console.error('Error reading cart activity:', error)
    }

    return null
  }

  /**
   * Get all session activities (for concurrent session detection)
   */
  private getAllSessionActivities(): CartActivity[] {
    if (typeof window === 'undefined') return []

    try {
      // In a real implementation, this would check multiple storage keys
      // or use a more sophisticated session tracking mechanism
      const current = this.getCurrentActivity()
      return current ? [current] : []
    } catch (error) {
      console.error('Error reading session activities:', error)
      return []
    }
  }

  /**
   * Get current session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server'

    let sessionId = sessionStorage.getItem('cart_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('cart_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Get current tab ID
   */
  private getTabId(): string {
    if (typeof window === 'undefined') return 'server'

    let tabId = sessionStorage.getItem('cart_tab_id')
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('cart_tab_id', tabId)
    }
    return tabId
  }

  /**
   * Get cart ID (placeholder - should integrate with actual cart system)
   */
  private getCartId(): string {
    if (typeof window === 'undefined') return 'unknown'
    return localStorage.getItem('cart_id') || 'default_cart'
  }

  /**
   * Get cart item count (placeholder - should integrate with actual cart system)
   */
  private getCartItemCount(): number {
    if (typeof window === 'undefined') return 0
    
    try {
      // Use per-session/per-tab cart key to count items (sessionStorage ONLY)
      const stateRaw = sessionStorage.getItem('benpharm-cart-session')
      const state = stateRaw ? JSON.parse(stateRaw) : null
      const sessionId = state?.session?.id
      const tabId = state?.metadata?.tabId || sessionStorage.getItem('cart_tab_id')
      if (!sessionId || !tabId) return 0

      const dynKey = `benpharm-cart-items-${sessionId}-${tabId}`

      const fromSession = sessionStorage.getItem(dynKey)
      if (fromSession) {
        const cart = JSON.parse(fromSession)
        return Array.isArray(cart) ? cart.length : cart.items?.length || 0
      }
      
      // No longer falling back to localStorage
    } catch (error) {
      console.error('Error reading cart item count:', error)
    }
    
    return 0
  }
}

// Export singleton instance
export const cartExpirationManager = CartExpirationManager.getInstance()

/**
 * Hook for React components to use cart expiration
 */
export const useCartExpiration = () => {
  const manager = cartExpirationManager

  const extendCart = (activityType?: CartActivity['activityType']) => {
    manager.extendCartLifetime(activityType)
  }

  const startCheckout = () => {
    manager.startCheckoutMode()
  }

  const endCheckout = () => {
    manager.endCheckoutMode()
  }

  const startPayment = () => {
    manager.startPaymentMode()
  }

  const checkExpiration = () => {
    return manager.shouldExpire()
  }

  const getWarningTime = () => {
    return manager.getExpirationWarning()
  }

  const handleConcurrentSessions = () => {
    return manager.handleConcurrentSessions()
  }

  return {
    extendCart,
    startCheckout,
    endCheckout,
    startPayment,
    checkExpiration,
    getWarningTime,
    handleConcurrentSessions,
    initialize: () => manager.initialize(),
    cleanup: () => manager.cleanup()
  }
}
