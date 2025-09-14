import { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import crypto from 'crypto'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'

/**
 * Generate a new CSRF token
 */
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash token with secret for double-submit cookie pattern
 */
function hashToken(token: string): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex')
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken(token: string, hashedToken: string): boolean {
  const expectedHash = hashToken(token)
  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(hashedToken),
    Buffer.from(expectedHash)
  )
}

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern
 */
export function csrfProtection(options?: {
  skipPaths?: string[]
  cookieOptions?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
    path?: string
    maxAge?: number
  }
}) {
  const {
    skipPaths = [],
    cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: 3600 // 1 hour
    }
  } = options || {}

  return async (c: Context, next: Next) => {
    const method = c.req.method
    const path = c.req.path

    // Skip CSRF check for safe methods and excluded paths
    if (['GET', 'HEAD', 'OPTIONS'].includes(method) || skipPaths.includes(path)) {
      // Generate and set token for GET requests (to be used in forms)
      if (method === 'GET') {
        // Always generate a fresh token for GET to ensure the client can retrieve it.
        // This rotates the double-submit cookie and exposes the plain token via c.set for this response.
        const newToken = generateCSRFToken()
        const hashedToken = hashToken(newToken)

        setCookie(c, CSRF_TOKEN_NAME, hashedToken, cookieOptions)

        // Make token available to frontend (header/body via injectCSRFToken or explicit JSON)
        c.set('csrfToken', newToken)
      }
      
      return next()
    }

    // For state-changing requests, verify CSRF token
    const cookieToken = getCookie(c, CSRF_TOKEN_NAME)
    const headerToken = c.req.header(CSRF_HEADER_NAME)
    const bodyToken = (await c.req.raw.clone().json().catch(() => ({})))?.csrfToken

    const submittedToken = headerToken || bodyToken

    if (!cookieToken || !submittedToken) {
      console.warn(`[CSRF] Missing token - Cookie: ${!!cookieToken}, Submitted: ${!!submittedToken}`)
      
      return c.json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request'
        }
      }, 403)
    }

    // Verify token
    if (!verifyCSRFToken(submittedToken, cookieToken)) {
      const user = c.get('user')
      console.warn(`[CSRF] Invalid token for user ${user?.id} on ${path}`)
      
      // Log potential CSRF attack (best-effort; do not fail request if logging fails)
      try {
        const { db } = await import('@repo/database')
        // Prefer prescriptionAuditLog to avoid dependency on a generic audit model
        await db.prescriptionAuditLog.create({
          data: {
            userId: user?.id || 'anonymous',
            userEmail: user?.email || null,
            userName: user?.name || null,
            userRole: user?.role || null,
            action: 'SECURITY_ALERT',
            entityType: 'SECURITY',
            entityId: path,
            metadata: {
              method,
              path,
              ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
              userAgent: c.req.header('user-agent'),
              referer: c.req.header('referer')
            },
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
            userAgent: c.req.header('user-agent') || undefined,
            timestamp: new Date()
          }
        })
      } catch (error) {
        // Never let logging failure break CSRF handling
        console.error('[CSRF] Failed to log CSRF violation (non-fatal):', error)
      }
      
      return c.json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token'
        }
      }, 403)
    }

    // Rotate token after successful validation (optional, for extra security)
    const newToken = generateCSRFToken()
    const newHashedToken = hashToken(newToken)
    setCookie(c, CSRF_TOKEN_NAME, newHashedToken, cookieOptions)
    c.set('csrfToken', newToken)

    await next()
  }
}

/**
 * Helper to get CSRF token for frontend
 */
export function getCSRFToken(c: Context): string | undefined {
  return c.get('csrfToken')
}

/**
 * Helper to inject CSRF token into response
 */
export function injectCSRFToken(c: Context) {
  const token = c.get('csrfToken')
  if (token) {
    c.header('X-CSRF-Token', token)
  }
}
