import { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import crypto from 'crypto'

interface SessionConfig {
  maxAge?: number // Maximum session age in milliseconds
  idleTimeout?: number // Idle timeout in milliseconds
  absoluteTimeout?: number // Absolute timeout in milliseconds
  renewalThreshold?: number // Renew session if less than this time remaining
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  domain?: string
}

interface SessionData {
  userId: string
  userRole: string
  createdAt: number
  lastActivity: number
  fingerprint?: string
  ipAddress?: string
}

// In-memory session store (use Redis in production)
const sessionStore = new Map<string, SessionData>()

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessionStore.entries()) {
    const age = now - session.createdAt
    const idle = now - session.lastActivity
    
    if (age > (24 * 60 * 60 * 1000) || idle > (30 * 60 * 1000)) {
      sessionStore.delete(sessionId)
    }
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate browser fingerprint for session validation
 */
function generateFingerprint(c: Context): string {
  const userAgent = c.req.header('user-agent') || ''
  const acceptLanguage = c.req.header('accept-language') || ''
  const acceptEncoding = c.req.header('accept-encoding') || ''
  
  return crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage + acceptEncoding)
    .digest('hex')
}

/**
 * Session security middleware for admin routes
 */
export function sessionSecurity(config?: SessionConfig) {
  const {
    maxAge = 24 * 60 * 60 * 1000, // 24 hours
    idleTimeout = 30 * 60 * 1000, // 30 minutes
    absoluteTimeout = 8 * 60 * 60 * 1000, // 8 hours for admin sessions
    renewalThreshold = 5 * 60 * 1000, // 5 minutes
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'Strict',
    domain
  } = config || {}

  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    // Skip for non-authenticated requests
    if (!user) {
      return next()
    }
    
    // Only apply enhanced security for admin users
    if (user.role !== 'admin') {
      return next()
    }

    const sessionId = getCookie(c, 'admin_session_id')
    const now = Date.now()
    
    if (sessionId) {
      const session = sessionStore.get(sessionId)
      
      if (!session) {
        // Session not found, possible security issue
        console.warn(`[SESSION] Session not found for ID: ${sessionId}`)
        
        // Log security event
        try {
          const { db } = await import('@repo/database')
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: 'SESSION_NOT_FOUND',
              entityType: 'SECURITY',
              entityId: sessionId,
              metadata: {
                ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
                userAgent: c.req.header('user-agent')
              },
              createdAt: new Date()
            }
          })
        } catch (error) {
          console.error('[SESSION] Failed to log security event:', error)
        }
        
        return c.json({
          success: false,
          error: {
            code: 'SESSION_INVALID',
            message: 'Your session is invalid. Please login again.'
          }
        }, 401)
      }
      
      // Check session validity
      const age = now - session.createdAt
      const idle = now - session.lastActivity
      
      // Check absolute timeout
      if (age > absoluteTimeout) {
        sessionStore.delete(sessionId)
        
        console.log(`[SESSION] Session expired (absolute timeout) for user ${user.id}`)
        
        return c.json({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired. Please login again.'
          }
        }, 401)
      }
      
      // Check idle timeout
      if (idle > idleTimeout) {
        sessionStore.delete(sessionId)
        
        console.log(`[SESSION] Session expired (idle timeout) for user ${user.id}`)
        
        return c.json({
          success: false,
          error: {
            code: 'SESSION_IDLE',
            message: 'Your session has timed out due to inactivity. Please login again.'
          }
        }, 401)
      }
      
      // Validate fingerprint (detect session hijacking)
      const currentFingerprint = generateFingerprint(c)
      if (session.fingerprint && session.fingerprint !== currentFingerprint) {
        sessionStore.delete(sessionId)
        
        console.warn(`[SESSION] Fingerprint mismatch for user ${user.id}`)
        
        // Log potential session hijacking
        try {
          const { db } = await import('@repo/database')
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: 'SESSION_HIJACK_DETECTED',
              entityType: 'SECURITY',
              entityId: sessionId,
              metadata: {
                originalFingerprint: session.fingerprint,
                currentFingerprint,
                originalIP: session.ipAddress,
                currentIP: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
                userAgent: c.req.header('user-agent')
              },
              createdAt: new Date()
            }
          })
        } catch (error) {
          console.error('[SESSION] Failed to log hijacking attempt:', error)
        }
        
        return c.json({
          success: false,
          error: {
            code: 'SESSION_INVALID',
            message: 'Session security check failed. Please login again.'
          }
        }, 401)
      }
      
      // Check IP address change (optional, might be too strict)
      const currentIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
      if (session.ipAddress && currentIP && session.ipAddress !== currentIP) {
        console.warn(`[SESSION] IP address changed for user ${user.id}: ${session.ipAddress} -> ${currentIP}`)
        
        // You might want to just log this instead of invalidating the session
        // as users might legitimately change IP addresses (mobile networks, VPNs, etc.)
      }
      
      // Update last activity
      session.lastActivity = now
      
      // Renew session if approaching timeout
      const timeRemaining = idleTimeout - idle
      if (timeRemaining < renewalThreshold) {
        const newSessionId = generateSessionId()
        sessionStore.delete(sessionId)
        sessionStore.set(newSessionId, session)
        
        setCookie(c, 'admin_session_id', newSessionId, {
          httpOnly: true,
          secure,
          sameSite,
          domain,
          maxAge: maxAge / 1000,
          path: '/'
        })
        
        console.log(`[SESSION] Session renewed for user ${user.id}`)
      }
    } else {
      // Create new session for admin user
      const newSessionId = generateSessionId()
      const fingerprint = generateFingerprint(c)
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
      
      const sessionData: SessionData = {
        userId: user.id,
        userRole: user.role,
        createdAt: now,
        lastActivity: now,
        fingerprint,
        ipAddress
      }
      
      sessionStore.set(newSessionId, sessionData)
      
      setCookie(c, 'admin_session_id', newSessionId, {
        httpOnly: true,
        secure,
        sameSite,
        domain,
        maxAge: maxAge / 1000,
        path: '/'
      })
      
      console.log(`[SESSION] New session created for admin user ${user.id}`)
    }
    
    // Add session info to context
    c.set('sessionId', sessionId || 'new')
    
    await next()
  }
}

/**
 * Invalidate a session
 */
export function invalidateSession(sessionId: string): void {
  sessionStore.delete(sessionId)
}

/**
 * Get active sessions for a user
 */
export function getUserSessions(userId: string): Array<{
  sessionId: string
  createdAt: Date
  lastActivity: Date
  ipAddress?: string
}> {
  const sessions = []
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessions.push({
        sessionId,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity),
        ipAddress: session.ipAddress
      })
    }
  }
  
  return sessions
}

/**
 * Invalidate all sessions for a user
 */
export function invalidateUserSessions(userId: string): void {
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessionStore.delete(sessionId)
    }
  }
}

/**
 * Get session statistics for monitoring
 */
export function getSessionStats(): {
  totalSessions: number
  adminSessions: number
  averageAge: number
  oldestSession: Date | null
} {
  const now = Date.now()
  let totalAge = 0
  let oldestTime = now
  let adminCount = 0
  
  for (const session of sessionStore.values()) {
    const age = now - session.createdAt
    totalAge += age
    
    if (session.createdAt < oldestTime) {
      oldestTime = session.createdAt
    }
    
    if (session.userRole === 'admin') {
      adminCount++
    }
  }
  
  const count = sessionStore.size
  
  return {
    totalSessions: count,
    adminSessions: adminCount,
    averageAge: count > 0 ? totalAge / count : 0,
    oldestSession: count > 0 ? new Date(oldestTime) : null
  }
}
