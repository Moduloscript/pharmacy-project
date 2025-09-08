import { Context } from 'hono';

/**
 * Notification Rate Limiting Utilities
 * 
 * Prevents SMS bombing and API abuse for notification endpoints
 * Uses in-memory rate limiting with Redis fallback for production
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  blockDurationMs?: number;  // How long to block after exceeding limit
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  keyGenerator?: (c: Context) => string;  // Custom key generator
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Default rate limit configurations for different scenarios
 */
export const RateLimitConfigs = {
  // General notification sending - 100 per hour per IP
  GENERAL_NOTIFICATIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  } as RateLimitConfig,
  
  // Bulk notifications - 10 bulk requests per hour per user
  BULK_NOTIFICATIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  } as RateLimitConfig,
  
  // Per recipient - 5 notifications per recipient per 15 minutes
  PER_RECIPIENT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    // IMPORTANT: Do not parse request body here (c.req.json is async and not available in all contexts).
    // We rely on checkNotificationRateLimit to pass a fabricated context with req.path set to
    // a stable recipient-specific key (e.g., "recipient:+234..."), so we can safely return that.
    keyGenerator: (c: Context) => {
      return typeof (c as any)?.req?.path === 'string' ? (c as any).req.path : 'recipient:unknown';
    }
  } as RateLimitConfig,
  
  // Test endpoints - more restrictive
  TEST_ENDPOINTS: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  } as RateLimitConfig,
};

/**
 * Generate a rate limiting key based on request context
 */
function generateKey(c: Context, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(c);
  }
  
  // Default: use IP address and endpoint
  const ip = c.req.header('x-forwarded-for') || 
            c.req.header('x-real-ip') || 
            'unknown';
  const endpoint = c.req.path;
  return `${ip}:${endpoint}`;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(c: Context, config: RateLimitConfig): RateLimitResult {
  const key = generateKey(c, config);
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredEntries(now);
  }
  
  let entry = rateLimitStore.get(key);
  
  // Initialize or reset expired entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      blocked: false
    };
  }
  
  // Check if currently blocked
  if (entry.blocked && entry.resetTime > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blocked: true
    };
  }
  
  // Reset blocked status if block period expired
  if (entry.blocked && entry.resetTime <= now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      blocked: false
    };
  }
  
  // Check if limit exceeded
  const allowed = entry.count < config.maxRequests;
  
  if (!allowed && config.blockDurationMs) {
    // Block for the specified duration
    entry.blocked = true;
    entry.resetTime = now + config.blockDurationMs;
  }
  
  // Increment counter for this request
  if (!config.skipSuccessfulRequests || !allowed) {
    entry.count++;
  }
  
  // Update store
  rateLimitStore.set(key, entry);
  
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.blocked
  };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: Context, next: () => Promise<void>) => {
    const result = checkRateLimit(c, config);
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      const message = result.blocked 
        ? 'Request blocked due to rate limit violation. Try again later.'
        : 'Rate limit exceeded. Please slow down.';
        
      return c.json({
        success: false,
        error: message,
        code: result.blocked ? 'RATE_LIMIT_BLOCKED' : 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      }, 429);
    }
    
    await next();
  };
}

/**
 * Advanced rate limiting for notifications with recipient-based limits
 */
export function checkNotificationRateLimit(
  c: Context, 
  recipient: string, 
  notificationType: string
): RateLimitResult {
  // Multiple rate limit checks
  const generalLimit = checkRateLimit(c, RateLimitConfigs.GENERAL_NOTIFICATIONS);
  const recipientKey = `recipient:${recipient}`;
  const typeKey = `type:${notificationType}:${recipient}`;
  
  // Check recipient-specific limit
  const recipientLimit = checkRateLimit({
    ...c,
    req: {
      ...c.req,
      path: recipientKey
    }
  } as Context, RateLimitConfigs.PER_RECIPIENT);
  
  // Return the most restrictive result
  if (!generalLimit.allowed) return generalLimit;
  if (!recipientLimit.allowed) return recipientLimit;
  
  return {
    allowed: true,
    remaining: Math.min(generalLimit.remaining, recipientLimit.remaining),
    resetTime: Math.min(generalLimit.resetTime, recipientLimit.resetTime),
    blocked: false
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number) {
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime && !entry.blocked) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${keysToDelete.length} expired rate limit entries`);
  }
}

/**
 * Get current rate limit stats (for monitoring)
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitStore.size,
    blockedEntries: 0,
    activeEntries: 0,
    expiredEntries: 0
  };
  
  for (const entry of rateLimitStore.values()) {
    if (entry.blocked && entry.resetTime > now) {
      stats.blockedEntries++;
    } else if (entry.resetTime > now) {
      stats.activeEntries++;
    } else {
      stats.expiredEntries++;
    }
  }
  
  return stats;
}

/**
 * Reset rate limits for a specific key (admin function)
 */
export function resetRateLimit(key: string): boolean {
  const deleted = rateLimitStore.delete(key);
  console.log(`🔓 Rate limit reset for key: ${key}`);
  return deleted;
}

/**
 * Clear all rate limits (admin function - use with caution)
 */
export function clearAllRateLimits(): number {
  const count = rateLimitStore.size;
  rateLimitStore.clear();
  console.log(`🧹 Cleared all ${count} rate limit entries`);
  return count;
}
