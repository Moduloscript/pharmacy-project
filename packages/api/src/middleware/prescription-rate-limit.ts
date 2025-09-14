import { Context, Next } from 'hono'
import { db } from '@repo/database'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (c: Context) => string // Function to generate rate limit key
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  message?: string // Custom error message
}

// In-memory store for rate limiting (consider using Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export function prescriptionRateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 10,
    keyGenerator = (c) => {
      const user = c.get('user')
      return `prescription_${user?.id || 'anonymous'}_${c.req.path}`
    },
    skipSuccessfulRequests = false,
    message = 'Too many requests. Please try again later.'
  } = config

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs
      }
      rateLimitStore.set(key, entry)
    }
    
    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      
      // Log rate limit violation
      const user = c.get('user')
      console.warn(`Rate limit exceeded for user ${user?.id} on ${c.req.path}`)
      
      // Store rate limit violation in database for monitoring
      try {
        await db.auditLog.create({
          data: {
            userId: user?.id,
            action: 'RATE_LIMIT_EXCEEDED',
            entityType: 'PRESCRIPTION_API',
            entityId: c.req.path,
            metadata: {
              ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
              userAgent: c.req.header('user-agent'),
              path: c.req.path,
              method: c.req.method
            },
            createdAt: new Date()
          }
        })
      } catch (error) {
        console.error('Failed to log rate limit violation:', error)
      }
      
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter
        }
      }, 429, {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        'Retry-After': retryAfter.toString()
      })
    }
    
    // Increment counter before processing request
    if (!skipSuccessfulRequests) {
      entry.count++
    }
    
    // Process request
    await next()
    
    // Increment counter after successful request if configured
    if (skipSuccessfulRequests && c.res.status < 400) {
      entry.count++
    }
    
    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - entry.count)
    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())
  }
}

// Specific rate limiters for different prescription operations
export const prescriptionViewRateLimit = prescriptionRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 30, // 30 requests per minute for viewing
  message: 'Too many prescription view requests. Please wait before trying again.'
})

export const prescriptionUpdateRateLimit = prescriptionRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 5, // Only 5 updates per minute
  message: 'Too many prescription update requests. Please wait before trying again.'
})

export const prescriptionBulkRateLimit = prescriptionRateLimit({
  windowMs: 300000, // 5 minutes
  maxRequests: 10, // 10 bulk operations per 5 minutes
  message: 'Too many bulk prescription operations. Please wait before trying again.'
})
