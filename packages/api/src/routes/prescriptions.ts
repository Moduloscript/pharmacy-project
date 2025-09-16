import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db, PrescriptionStatus } from '@repo/database'
import { getSignedUploadUrl, getSignedUrl, getObjectMetadata } from '@repo/storage'
import { config } from '@repo/config'
import { sendPrescriptionStatusNotification, notifyPharmacistOfNewPrescription } from '../services/prescription-notifications'
import { prescriptionViewRateLimit, prescriptionUpdateRateLimit } from '../middleware/prescription-rate-limit'
import { csrfProtection, injectCSRFToken } from '../middleware/csrf-protection'
import { authMiddleware } from '../middleware/auth'
import { 
  validatePrescriptionUpdate,
  validatePrescriptionId,
  sanitizeText,
  validatePrescriptionFile
} from '../utils/prescription-security'
import {
  createPrescriptionAuditLog,
  auditPrescriptionView,
  auditPrescriptionStatusUpdate,
  auditSecurityEvent
} from '../services/prescription-audit'
import { PrescriptionAuditAction } from '@prisma/client'

const app = new Hono<AppBindings>()

// Apply authentication to all prescription routes
app.use('*', authMiddleware)

// Helper to check admin or pharmacist
function isAdminOrPharmacist(user: any) {
  return user?.role === 'admin' || user?.role === 'pharmacist'
}

// CSRF bootstrap endpoint for clients to obtain a token
app.get('/csrf', csrfProtection(), (c) => {
  injectCSRFToken(c)
  const token = c.get('csrfToken')
  return c.json({ success: true, csrfToken: token })
})

// Get prescriptions with filters
const getPrescriptionsSchema = z.object({
  status: z.nativeEnum(PrescriptionStatus).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  search: z.string().optional(),
  hasFile: z.enum(['true','false']).transform(v => v === 'true').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

app.get('/', prescriptionViewRateLimit, zValidator('query', getPrescriptionsSchema), async (c) => {
  const user = c.get('user')
  const { status, page, limit, search, hasFile, startDate, endDate } = c.req.valid('query')
  
  // Check if user is admin or pharmacist
  if (!isAdminOrPharmacist(user)) {
    // Log unauthorized access attempt
    await auditSecurityEvent(user?.id, 'ACCESS_DENIED', {
      path: c.req.path,
      method: c.req.method,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent')
    })
    
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Only administrators can access prescriptions'
      }
    }, 403)
  }
  
  // Log list view action
  await createPrescriptionAuditLog({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    action: 'VIEW_LIST',
    entityType: 'PRESCRIPTION',
    entityId: 'list',
    metadata: { status, page, limit, search, hasFile, startDate, endDate },
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    timestamp: new Date()
  })

  try {
    const offset = (page - 1) * limit

  // Build where clause using AND to combine independent filters
  const and: any[] = []
  if (status) {
    and.push({ status })
  }
  if (search) {
    and.push({
      OR: [
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customer: { businessName: { contains: search, mode: 'insensitive' } } } },
        { order: { customer: { user: { name: { contains: search, mode: 'insensitive' } } } } }
      ]
    })
  }
  if (hasFile) {
    and.push({
      OR: [
        { documentKey: { not: null } },
        { AND: [ { imageUrl: { not: null } }, { NOT: { imageUrl: { startsWith: '/uploads/' } } } ] }
      ]
    })
  }
  if (startDate || endDate) {
    const createdAt: any = {}
    if (startDate) createdAt.gte = new Date(startDate)
    if (endDate) createdAt.lte = new Date(endDate)
    and.push({ createdAt })
  }

  const whereClause: any = and.length ? { AND: and } : {}

    // Get total count
    const total = await db.prescription.count({ where: whereClause })

    // Get prescriptions
    const prescriptions = await db.prescription.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { createdAt: 'desc' }
      ],
      skip: offset,
      take: limit
    })

    const mapped = await Promise.all(
      prescriptions.map(async (p) => {
        let fileUrl: string | null = null
        let fileName: string | null = null
        if (p.documentKey) {
          try {
            fileUrl = await getSignedUrl(p.documentKey, {
              bucket: config.storage.bucketNames.prescriptions,
              expiresIn: 60 * 60, // 1 hour
            })
            fileName = p.documentKey.split('/').pop() || null
          } catch {
            // Fallback to redirect route so the browser can resolve the file directly
            fileUrl = `/api/prescriptions/${p.id}/file/redirect`
            fileName = p.documentKey.split('/').pop() || null
          }
        } else if (p.imageUrl && !p.imageUrl.startsWith('/uploads/')) {
          fileUrl = p.imageUrl
          fileName = p.imageUrl.split('/').pop() || null
        }
        return {
          id: p.id,
          orderId: p.orderId,
          orderNumber: p.order.orderNumber,
          status: p.status,
          imageUrl: p.imageUrl,
          fileUrl,
          fileName,
          notes: p.notes,
          reviewedBy: p.reviewedBy,
          reviewedAt: p.reviewedAt,
          rejectionReason: p.rejectionReason,
          clarificationRequest: p.clarificationRequest,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          customer: {
            id: p.order.customer.id,
            businessName: p.order.customer.businessName,
            contactName: p.order.customer.user.name,
            email: p.order.customer.user.email,
            phone: p.order.customer.phone
          },
          order: {
            id: p.order.id,
            orderNumber: p.order.orderNumber,
            status: p.order.status,
            total: Number(p.order.total),
            createdAt: p.order.createdAt,
            items: p.order.orderItems.map(item => ({
              id: item.id,
              productName: item.product.name,
              productSKU: item.product.sku,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice)
            }))
          }
        }
      })
    )

    return c.json({
      success: true,
      data: {
        prescriptions: mapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch prescriptions'
      }
    }, 500)
  }
})

// Update prescription with uploaded document key
const updateDocumentSchema = z.object({
  documentKey: z.string().min(1),
  fileName: z.string().optional(),
  fileSize: z.number().optional()
})

app.patch('/:prescriptionId/document', csrfProtection(), prescriptionUpdateRateLimit, zValidator('json', updateDocumentSchema), async (c) => {
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')
  const { documentKey, fileName, fileSize } = c.req.valid('json')
  
  // Validate prescription ID
  if (!validatePrescriptionId(prescriptionId)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid prescription ID format'
      }
    }, 400)
  }
  
  try {
    // Get prescription
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!prescription) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found'
        }
      }, 404)
    }
    
    // Check if user owns the prescription (customer) or is admin
    const isOwner = prescription.order.customer.userId === user.id
    const isAdmin = user.role === 'admin'
    
    if (!isOwner && !isAdmin) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to update this prescription'
        }
      }, 403)
    }
    
    // Verify the document key belongs to this user (for security)
    if (!isAdmin && !documentKey.startsWith(`${user.id}/`)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_DOCUMENT',
          message: 'Invalid document key'
        }
      }, 400)
    }
    
    // Update prescription with document info
    const updatedPrescription = await db.prescription.update({
      where: { id: prescriptionId },
      data: {
        documentKey,
        updatedAt: new Date()
      },
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    // Create audit log
    await createPrescriptionAuditLog({
      prescriptionId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      action: 'CREATE',
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId,
      metadata: {
        documentKey,
        fileName,
        fileSize
      },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
      timestamp: new Date()
    })
    
    // Send notification if this was the first document upload
    if (!prescription.documentKey && prescription.status === 'PENDING') {
      await notifyPharmacistOfNewPrescription(prescription.orderId, prescription.order.orderNumber)
    }
    
    return c.json({
      success: true,
      data: {
        prescription: {
          id: updatedPrescription.id,
          orderId: updatedPrescription.orderId,
          status: updatedPrescription.status,
          documentKey: updatedPrescription.documentKey,
          imageUrl: updatedPrescription.imageUrl,
          createdAt: updatedPrescription.createdAt,
          updatedAt: updatedPrescription.updatedAt
        }
      }
    })
  } catch (error) {
    console.error('Error updating prescription document:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update prescription document'
      }
    }, 500)
  }
})

// Get prescription file (JSON with signed URL)
app.get('/:prescriptionId/file', prescriptionViewRateLimit, async (c) => {
  try {
    const accept = c.req.header('accept')
    const ref = c.req.header('referer')
    console.log('[API /file] Request accept:', accept, 'referer:', ref)
  } catch {}
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')
  
  try {
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!prescription) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found'
        }
      }, 404)
    }
    
    // Check authorization (owner or admin/pharmacist)
    const isOwner = prescription.order.customer.userId === user.id
    const hasPriv = isOwner || isAdminOrPharmacist(user)
    
    if (!hasPriv) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to view this prescription'
        }
      }, 403)
    }
    
    if (!prescription.documentKey) {
      return c.json({
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No document uploaded for this prescription'
        }
      }, 404)
    }
    
    // Log view action
    await auditPrescriptionView(
      user.id, // userId
      prescriptionId, // prescriptionId
      {
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      }
    )
    
    // Get signed URL and metadata for the file
    const [meta, signedUrl] = await Promise.all([
      getObjectMetadata(prescription.documentKey, { bucket: config.storage.bucketNames.prescriptions }),
      getSignedUrl(prescription.documentKey, {
        bucket: config.storage.bucketNames.prescriptions,
        expiresIn: 60 * 60 // 1 hour
      })
    ])
    
    return c.json({
      success: true,
      data: {
        url: signedUrl,
        fileName: prescription.documentKey.split('/').pop(),
        contentType: meta.contentType ?? undefined,
        size: meta.size ?? undefined,
        lastModified: meta.lastModified ? meta.lastModified.toISOString() : undefined,
        exists: meta.exists,
        expiresIn: 3600
      }
    })
  } catch (error) {
    console.error('Error getting prescription file:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get prescription file'
      }
    }, 500)
  }
})

// Get prescription file redirect (useful for <img src> thumbnails)
app.get('/:prescriptionId/file/redirect', prescriptionViewRateLimit, async (c) => {
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')

  try {
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: { order: { include: { customer: true } } }
    })

    if (!prescription) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Prescription not found' } }, 404)
    }

    const isOwner = prescription.order.customer.userId === user.id
    const hasPriv = isOwner || isAdminOrPharmacist(user)
    if (!hasPriv) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'You do not have permission to view this prescription' } }, 403)
    }

    if (!prescription.documentKey && !(prescription.imageUrl && !prescription.imageUrl.startsWith('/uploads/'))) {
      return c.json({ success: false, error: { code: 'NO_DOCUMENT', message: 'No document uploaded for this prescription' } }, 404)
    }

    // Prefer documentKey signed URL; fallback to legacy imageUrl
    let targetUrl: string | null = null
    if (prescription.documentKey) {
      targetUrl = await getSignedUrl(prescription.documentKey, {
        bucket: config.storage.bucketNames.prescriptions,
        expiresIn: 60 * 60 // 1 hour
      })
    } else if (prescription.imageUrl && !prescription.imageUrl.startsWith('/uploads/')) {
      targetUrl = prescription.imageUrl
    }

    if (!targetUrl) {
      return c.json({ success: false, error: { code: 'NO_DOCUMENT', message: 'No document available' } }, 404)
    }

    // 302 redirect to the file so the browser can load it directly
    return c.redirect(targetUrl, 302)
  } catch (error) {
    console.error('Error redirecting to prescription file:', error)
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get file' } }, 500)
  }
})

// Update prescription status with CSRF protection
// TEMPORARILY DISABLED CSRF FOR DEBUGGING
app.patch('/:prescriptionId', prescriptionUpdateRateLimit, async (c) => {
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')
  
  // Validate prescription ID format
  if (!validatePrescriptionId(prescriptionId)) {
    await auditSecurityEvent(user?.id, 'VALIDATION_FAILED', {
      prescriptionId,
      reason: 'Invalid prescription ID format',
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
    })
    
    return c.json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid prescription ID format'
      }
    }, 400)
  }
  
  // Parse and validate request body
  const body = await c.req.json()
  const validationResult = validatePrescriptionUpdate.safeParse(body)
  
  if (!validationResult.success) {
    await auditSecurityEvent(user?.id, 'VALIDATION_FAILED', {
      prescriptionId,
      errors: validationResult.error.errors,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
    })
    
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: validationResult.error.errors
      }
    }, 400)
  }
  
  const { status, rejectionReason, clarificationRequest, notes } = validationResult.data
  
  // Check if user is admin or pharmacist
  if (!isAdminOrPharmacist(user)) {
    await auditSecurityEvent(user?.id, 'ACCESS_DENIED', {
      prescriptionId,
      attemptedAction: 'UPDATE_STATUS',
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
    })
    
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Only administrators or pharmacists can update prescriptions'
      }
    }, 403)
  }

  try {
    // Get prescription with order details
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })

    if (!prescription) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found'
        }
      }, 404)
    }

    // Validate required fields based on status
    if (status === 'REJECTED' && !rejectionReason) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason is required when rejecting a prescription'
        }
      }, 400)
    }

    if (status === 'CLARIFICATION' && !clarificationRequest) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Clarification details are required when requesting clarification'
        }
      }, 400)
    }

    // Update prescription
    const updatedPrescription = await db.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: status as PrescriptionStatus,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        clarificationRequest: status === 'CLARIFICATION' ? clarificationRequest : null,
        notes,
        reviewedBy: user.name || user.email,
        reviewedAt: new Date()
      }
    })
    
    // Log the status update
    await auditPrescriptionStatusUpdate(
      user.id,
      prescriptionId,
      prescription.status,
      status as PrescriptionStatus,
      {
        orderNumber: prescription.order.orderNumber,
        rejectionReason,
        clarificationRequest,
        notes,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent')
      }
    )

    // Update order status if prescription is approved
    if (status === 'APPROVED') {
      await db.order.update({
        where: { id: prescription.orderId },
        data: {
          status: 'PROCESSING',
          internalNotes: `Prescription approved by ${user.name || user.email} at ${new Date().toISOString()}`
        }
      })

      // Create order tracking entry
      await db.orderTracking.create({
        data: {
          orderId: prescription.orderId,
          status: 'PROCESSING',
          notes: 'Prescription verified and approved. Order is now being processed.',
          updatedBy: user.name || user.email
        }
      })
    } else if (status === 'REJECTED') {
      // Update order status to on-hold or cancelled
      await db.order.update({
        where: { id: prescription.orderId },
        data: {
          status: 'CANCELLED',
          internalNotes: `Prescription rejected by ${user.name || user.email}: ${rejectionReason}`
        }
      })

      // Create order tracking entry
      await db.orderTracking.create({
        data: {
          orderId: prescription.orderId,
          status: 'CANCELLED',
          notes: `Prescription rejected: ${rejectionReason}`,
          updatedBy: user.name || user.email
        }
      })
    }

    // Send notification to customer
    await sendPrescriptionStatusNotification({
      prescriptionId: prescription.id,
      orderId: prescription.orderId,
      customerId: prescription.order.customerId,
      orderNumber: prescription.order.orderNumber,
      status: status as 'APPROVED' | 'REJECTED' | 'CLARIFICATION',
      reason: rejectionReason,
      clarificationRequest,
      pharmacistName: user.name || undefined
    })

    return c.json({
      success: true,
      data: {
        prescription: updatedPrescription,
        message: `Prescription ${status.toLowerCase()} successfully`
      }
    })
  } catch (error) {
    console.error('Error updating prescription:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update prescription'
      }
    }, 500)
  }
})

// Get prescription statistics
app.get('/stats', async (c) => {
  const user = c.get('user')
  
  // Check if user is admin
  if (user.role !== 'admin') {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Only administrators can access prescription statistics'
      }
    }, 403)
  }

  try {
    const [total, pending, approved, rejected, clarificationRequested] = await Promise.all([
      db.prescription.count(),
      db.prescription.count({ where: { status: 'PENDING' } }),
      db.prescription.count({ where: { status: 'APPROVED' } }),
      db.prescription.count({ where: { status: 'REJECTED' } }),
      db.prescription.count({ where: { status: 'CLARIFICATION' } })
    ])

    // Get recent activity
    const recentActivity = await db.prescription.findMany({
      where: {
        reviewedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        order: {
          select: {
            orderNumber: true
          }
        }
      },
      orderBy: {
        reviewedAt: 'desc'
      },
      take: 10
    })

    return c.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        clarificationRequested,
        approvalRate: total > 0 ? (approved / total) * 100 : 0,
        recentActivity: recentActivity.map(p => ({
          id: p.id,
          orderNumber: p.order.orderNumber,
          status: p.status,
          reviewedBy: p.reviewedBy,
          reviewedAt: p.reviewedAt
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching prescription stats:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch prescription statistics'
      }
    }, 500)
  }
})

// Get prescription by ID
app.get('/:prescriptionId', prescriptionViewRateLimit, async (c) => {
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')
  
  // Validate prescription ID
  if (!validatePrescriptionId(prescriptionId)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid prescription ID format'
      }
    }, 400)
  }
  
  // Check if user is admin or pharmacist
  if (!isAdminOrPharmacist(user)) {
    await auditSecurityEvent(user?.id, 'ACCESS_DENIED', {
      prescriptionId,
      path: c.req.path
    })
    
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Only administrators or pharmacists can view prescriptions'
      }
    }, 403)
  }
  
  try {
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            orderItems: {
              include: {
                product: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            userName: true,
            timestamp: true,
            metadata: true
          }
        }
      }
    })
    
    if (!prescription) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found'
        }
      }, 404)
    }
    
    // Log view action
    await auditPrescriptionView(user.id, prescriptionId, {
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent')
    })
    
    return c.json({
      success: true,
      data: {
        prescription
      }
    })
  } catch (error) {
    console.error('Error fetching prescription:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch prescription'
      }
    }, 500)
  }
})

// Create prescription for an order
const createPrescriptionSchema = z.object({
  orderId: z.string().cuid(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
  prescribedBy: z.string().optional(),
  prescribedDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  dosageInstructions: z.string().optional(),
  refillsRemaining: z.number().int().min(0).optional(),
  isControlledSubstance: z.boolean().optional()
})

app.post('/', csrfProtection(), prescriptionUpdateRateLimit, zValidator('json', createPrescriptionSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')
  
  try {
    // Verify order exists and belongs to customer
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: {
              select: {
                isPrescriptionRequired: true,
                isControlled: true,  // Fixed: using correct field name
                name: true
              }
            }
          }
        }
      }
    })
    
    if (!order) {
      return c.json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      }, 404)
    }
    
    // Check if order has prescription items
    const prescriptionItems = order.orderItems.filter(item => 
      item.product.isPrescriptionRequired
    )
    
    if (prescriptionItems.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NO_PRESCRIPTION_ITEMS',
          message: 'This order does not contain any prescription-required items'
        }
      }, 400)
    }
    
    // Check if prescription already exists for this order
    const existingPrescription = await db.prescription.findFirst({
      where: { orderId: data.orderId }
    })
    
    if (existingPrescription) {
      return c.json({
        success: false,
        error: {
          code: 'PRESCRIPTION_EXISTS',
          message: 'A prescription already exists for this order'
        }
      }, 400)
    }
    
    // Create prescription
    const prescription = await db.prescription.create({
      data: {
        orderId: data.orderId,
        imageUrl: data.imageUrl,
        notes: sanitizeText(data.notes),
        prescribedBy: sanitizeText(data.prescribedBy),
        prescribedDate: data.prescribedDate ? new Date(data.prescribedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        dosageInstructions: sanitizeText(data.dosageInstructions),
        refillsRemaining: data.refillsRemaining,
        isControlledSubstance: data.isControlledSubstance || prescriptionItems.some(item => 
          item.product.isControlled  // Fixed: using correct field name
        ),
        requiresVerification: true,
        verificationLevel: prescriptionItems.some(item => 
          item.product.isControlled  // Fixed: using correct field name
        ) ? 2 : 1
      }
    })
    
    // Create audit log
    await createPrescriptionAuditLog({
      prescriptionId: prescription.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      action: 'CREATE',
      entityType: 'PRESCRIPTION',
      entityId: prescription.id,
      newValues: prescription,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent')
    })
    
    // Notify pharmacists/admins of new prescription to review
    await notifyPharmacistOfNewPrescription(order.id, order.orderNumber)
    
    return c.json({
      success: true,
      data: {
        prescription
      }
    }, 201)
  } catch (error) {
    console.error('Error creating prescription:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create prescription'
      }
    }, 500)
  }
})

// Get prescription files with signed URLs (with existence check and contentType)
app.get('/:prescriptionId/files', prescriptionViewRateLimit, async (c) => {
  const user = c.get('user')
  const prescriptionId = c.req.param('prescriptionId')
  
  // Validate prescription ID
  if (!validatePrescriptionId(prescriptionId)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid prescription ID format'
      }
    }, 400)
  }
  
  try {
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!prescription) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found'
        }
      }, 404)
    }
    
    // Check access permissions (owner or admin/pharmacist)
    const isOwner = prescription.order.customer.userId === user.id
    const hasPriv = isOwner || isAdminOrPharmacist(user)
    
    if (!hasPriv) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to view this prescription'
        }
      }, 403)
    }
    
  type RxFile = { url: string; uploadedAt: Date; key: string | null; contentType?: string | null; size?: number | null; lastModified?: string | null; exists?: boolean; kind?: 'image' | 'pdf' | 'other' }
  const files: RxFile[] = []

  // Helper to HEAD-check a URL and extract content-type for legacy external urls
  async function probe(url: string): Promise<{ ok: boolean; contentType: string | null; size: number | null; lastModified: string | null }> {
    try {
      const head = await fetch(url, { method: 'HEAD' })
      if (!head.ok) return { ok: false, contentType: null, size: null, lastModified: null }
      return {
        ok: true,
        contentType: head.headers.get('content-type'),
        size: head.headers.get('content-length') ? Number(head.headers.get('content-length')) : null,
        lastModified: head.headers.get('last-modified')
      }
    } catch {
      return { ok: false, contentType: null, size: null, lastModified: null }
    }
  }
    
    // Generate signed URL if document exists; verify it responds
    if (prescription.documentKey) {
      try {
        const meta = await getObjectMetadata(prescription.documentKey, { bucket: config.storage.bucketNames.prescriptions })
        const signedUrl = await getSignedUrl(prescription.documentKey, {
          bucket: config.storage.bucketNames.prescriptions,
          expiresIn: 60 * 60 * 24 // 24 hours
        })
        const kind: 'image' | 'pdf' | 'other' = meta.contentType?.startsWith('image/')
          ? 'image'
          : (meta.contentType === 'application/pdf' ? 'pdf' : 'other')
        files.push({
          url: signedUrl,
          uploadedAt: prescription.updatedAt,
          key: prescription.documentKey,
          contentType: meta.contentType ?? undefined,
          size: meta.size ?? undefined,
          lastModified: meta.lastModified ? meta.lastModified.toISOString() : null,
          exists: meta.exists,
          kind,
        })
      } catch {}
    }
    // Include legacy imageUrl if it exists and is not a placeholder
  if (prescription.imageUrl && !prescription.imageUrl.startsWith('/uploads/')) {
    const legacyUrl = prescription.imageUrl
    const check = await probe(legacyUrl)
    const kind: 'image' | 'pdf' | 'other' = (check.contentType?.startsWith('image/'))
      ? 'image'
      : (check.contentType === 'application/pdf' ? 'pdf' : 'other')
    files.push({
      url: legacyUrl,
      uploadedAt: prescription.updatedAt,
      key: null,
      contentType: check.contentType ?? undefined,
      size: check.size ?? undefined,
      lastModified: check.lastModified,
      exists: check.ok,
      kind,
    })
  }
    
    return c.json({
      success: true,
      data: {
        files
      }
    })
  } catch (error) {
    console.error('Error fetching prescription files:', error)
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch prescription files'
      }
    }, 500)
  }
})

export default app
