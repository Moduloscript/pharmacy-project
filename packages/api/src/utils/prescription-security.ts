import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import crypto from 'crypto'

// Maximum lengths for different fields to prevent overflow attacks
const MAX_LENGTHS = {
  REASON: 500,
  NOTES: 1000,
  CLARIFICATION: 500,
  FILE_NAME: 255,
  URL: 2048
}

// Regex patterns for validation
const PATTERNS = {
  // Allow alphanumeric, spaces, and common punctuation, but no HTML/script tags
  SAFE_TEXT: /^[a-zA-Z0-9\s\-.,!?'"()\[\]{}:;\/]+$/,
  // Order number format
  ORDER_NUMBER: /^ORD-\d{6,}$/,
  // UUID format for IDs
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // Safe file name
  SAFE_FILENAME: /^[a-zA-Z0-9\-_.]+(\.jpg|\.jpeg|\.png|\.pdf|\.doc|\.docx)$/i
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  // Configure DOMPurify to be very restrictive
  const config = {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  }
  
  return DOMPurify.sanitize(input, config).trim()
}

/**
 * Sanitize and validate text input
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Remove any HTML/script tags
  let sanitized = sanitizeHtml(input)
  
  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

/**
 * Validate and sanitize prescription update data
 */
export const validatePrescriptionUpdate = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CLARIFICATION']),
  rejectionReason: z.string()
    .transform(val => sanitizeText(val, MAX_LENGTHS.REASON))
    .refine(val => !val || val.length <= MAX_LENGTHS.REASON, {
      message: `Rejection reason must be less than ${MAX_LENGTHS.REASON} characters`
    })
    .optional(),
  clarificationRequest: z.string()
    .transform(val => sanitizeText(val, MAX_LENGTHS.CLARIFICATION))
    .refine(val => !val || val.length <= MAX_LENGTHS.CLARIFICATION, {
      message: `Clarification request must be less than ${MAX_LENGTHS.CLARIFICATION} characters`
    })
    .optional(),
  notes: z.string()
    .transform(val => sanitizeText(val, MAX_LENGTHS.NOTES))
    .refine(val => !val || val.length <= MAX_LENGTHS.NOTES, {
      message: `Notes must be less than ${MAX_LENGTHS.NOTES} characters`
    })
    .optional()
}).refine(
  (data) => {
    // Ensure rejection reason is provided when rejecting
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return false
    }
    // Ensure clarification is provided when requesting clarification
    if (data.status === 'CLARIFICATION' && !data.clarificationRequest) {
      return false
    }
    return true
  },
  {
    message: 'Required field missing for the selected status'
  }
)

/**
 * Validate prescription ID format
 */
export function validatePrescriptionId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }
  
  // Check if it's a valid UUID or CUID (Prisma default)
  // CUID format: starts with 'c' followed by alphanumeric characters
  const CUID_PATTERN = /^c[a-z0-9]{24,}$/
  return PATTERNS.UUID.test(id) || CUID_PATTERN.test(id)
}

/**
 * Validate order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  if (!orderNumber || typeof orderNumber !== 'string') {
    return false
  }
  
  return PATTERNS.ORDER_NUMBER.test(orderNumber)
}

/**
 * Validate and sanitize file upload
 */
export function validatePrescriptionFile(file: {
  name: string
  size: number
  type: string
}): { valid: boolean; error?: string } {
  // Max file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  
  // Allowed MIME types
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit'
    }
  }
  
  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, PDF, and Word documents are allowed'
    }
  }
  
  // Check file name
  const sanitizedName = sanitizeText(file.name, MAX_LENGTHS.FILE_NAME)
  if (!PATTERNS.SAFE_FILENAME.test(sanitizedName)) {
    return {
      valid: false,
      error: 'Invalid file name'
    }
  }
  
  return { valid: true }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
  return crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('hex')
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionId: string): boolean {
  const expectedToken = generateCSRFToken(sessionId)
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  )
}

/**
 * Encrypt sensitive data
 */
export function encryptSensitiveData(data: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || 'default-encryption-key-change-it',
    'hex'
  )
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || 'default-encryption-key-change-it',
    'hex'
  )
  
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Mask sensitive information for logging
 */
export function maskSensitiveInfo(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const masked = { ...data }
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'phone',
    'email'
  ]
  
  for (const key in masked) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***'
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveInfo(masked[key])
    }
  }
  
  return masked
}
