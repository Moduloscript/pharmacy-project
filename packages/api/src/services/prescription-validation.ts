import { db } from '@repo/database'
import { PrescriptionStatus } from '@prisma/client'

export interface PrescriptionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  prescriptionRequired: boolean
  prescriptionStatus?: PrescriptionStatus
  prescriptionId?: string
}

export interface OrderItemValidation {
  productId: string
  productName: string
  quantity: number
  requiresPrescription: boolean
  prescriptionId?: string
  validationResult?: PrescriptionValidationResult
}

/**
 * Service to handle prescription validation for orders
 */
export class PrescriptionValidationService {
  /**
   * Check if products in an order require prescriptions
   */
  static async checkPrescriptionRequirements(
    productIds: string[]
  ): Promise<Map<string, boolean>> {
    const products = await db.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        name: true,
        isPrescriptionRequired: true,
        isControlled: true
      }
    })

    const requirementsMap = new Map<string, boolean>()
    products.forEach(product => {
      requirementsMap.set(
        product.id, 
        product.isPrescriptionRequired || product.isControlled
      )
    })

    return requirementsMap
  }

  /**
   * Validate prescriptions for an order
   */
  static async validateOrderPrescriptions(
    customerId: string,
    orderItems: Array<{ productId: string; quantity: number }>
  ): Promise<{
    isValid: boolean
    errors: string[]
    itemValidations: OrderItemValidation[]
  }> {
    const errors: string[] = []
    const itemValidations: OrderItemValidation[] = []

    // Get prescription requirements for all products
    const productIds = orderItems.map(item => item.productId)
    const requirementsMap = await this.checkPrescriptionRequirements(productIds)

    // Get all products to have their names
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    })

    const productMap = new Map(products.map(p => [p.id, p.name]))

    // Check each item
    for (const item of orderItems) {
      const requiresPrescription = requirementsMap.get(item.productId) || false
      const productName = productMap.get(item.productId) || 'Unknown Product'

      const validation: OrderItemValidation = {
        productId: item.productId,
        productName,
        quantity: item.quantity,
        requiresPrescription
      }

      if (requiresPrescription) {
        // Check if customer has a valid prescription for this product
        const prescription = await this.findValidPrescription(
          customerId,
          item.productId
        )

        if (!prescription) {
          errors.push(`Prescription required for ${productName}`)
          validation.validationResult = {
            isValid: false,
            errors: [`No valid prescription found for ${productName}`],
            warnings: [],
            prescriptionRequired: true
          }
        } else if (prescription.status !== 'APPROVED') {
          errors.push(
            `Prescription for ${productName} is ${prescription.status.toLowerCase()}`
          )
          validation.validationResult = {
            isValid: false,
            errors: [`Prescription status is ${prescription.status}`],
            warnings: [],
            prescriptionRequired: true,
            prescriptionStatus: prescription.status,
            prescriptionId: prescription.id
          }
        } else {
          // Check if prescription is still valid (not expired)
          if (prescription.expiryDate && new Date(prescription.expiryDate) < new Date()) {
            errors.push(`Prescription for ${productName} has expired`)
            validation.validationResult = {
              isValid: false,
              errors: [`Prescription expired on ${prescription.expiryDate.toISOString().split('T')[0]}`],
              warnings: [],
              prescriptionRequired: true,
              prescriptionStatus: prescription.status,
              prescriptionId: prescription.id
            }
          } else if (prescription.refillsRemaining !== null && prescription.refillsRemaining <= 0) {
            errors.push(`No refills remaining for ${productName}`)
            validation.validationResult = {
              isValid: false,
              errors: [`No refills remaining on prescription`],
              warnings: [],
              prescriptionRequired: true,
              prescriptionStatus: prescription.status,
              prescriptionId: prescription.id
            }
          } else {
            // Prescription is valid
            validation.prescriptionId = prescription.id
            validation.validationResult = {
              isValid: true,
              errors: [],
              warnings: [],
              prescriptionRequired: true,
              prescriptionStatus: prescription.status,
              prescriptionId: prescription.id
            }
          }
        }
      } else {
        // No prescription required
        validation.validationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          prescriptionRequired: false
        }
      }

      itemValidations.push(validation)
    }

    return {
      isValid: errors.length === 0,
      errors,
      itemValidations
    }
  }

  /**
   * Find a valid prescription for a customer and product
   */
  static async findValidPrescription(
    customerId: string,
    productId: string
  ) {
    // First, find prescriptions linked to orders for this customer
    const prescriptions = await db.prescription.findMany({
      where: {
        order: {
          customerId
        },
        OR: [
          { status: 'APPROVED' },
          { status: 'PENDING' },
          { status: 'UNDER_REVIEW' }
        ]
      },
      include: {
        order: {
          include: {
            orderItems: {
              where: {
                productId
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Find the most recent valid prescription for this product
    for (const prescription of prescriptions) {
      if (prescription.order.orderItems.length > 0) {
        // Check if prescription is still valid
        if (prescription.expiryDate) {
          const expiryDate = new Date(prescription.expiryDate)
          if (expiryDate < new Date()) {
            continue // Skip expired prescriptions
          }
        }

        // Check refills
        if (prescription.refillsRemaining !== null && prescription.refillsRemaining <= 0) {
          continue // Skip prescriptions with no refills
        }

        return prescription
      }
    }

    return null
  }

  /**
   * Create a prescription requirement for an order
   */
  static async createPrescriptionRequirement(
    orderId: string,
    customerId: string,
    prescriptionItems: Array<{ productId: string; productName: string }>,
    client?: any
  ) {
    const prisma = client ?? db
    // Create a pending prescription record using the provided transaction client when available
    const prescription = await prisma.prescription.create({
      data: {
        orderId,
        status: 'PENDING',
        requiresVerification: true,
        notes: `Prescription required for: ${prescriptionItems.map(item => item.productName).join(', ')}`
      }
    })

    return prescription
  }

  /**
   * Link an uploaded prescription to an order
   */
  static async linkPrescriptionToOrder(
    orderId: string,
    prescriptionData: {
      imageUrl?: string
      documentKey?: string
      prescribedBy?: string
      prescribedDate?: Date
      expiryDate?: Date
      dosageInstructions?: string
      refillsRemaining?: number
    }
  ) {
    // Check if prescription already exists for this order
    let prescription = await db.prescription.findFirst({
      where: { orderId }
    })

    if (prescription) {
      // Update existing prescription
      prescription = await db.prescription.update({
        where: { id: prescription.id },
        data: {
          ...prescriptionData,
          status: 'UNDER_REVIEW',
          updatedAt: new Date()
        }
      })
    } else {
      // Create new prescription
      prescription = await db.prescription.create({
        data: {
          orderId,
          ...prescriptionData,
          status: 'UNDER_REVIEW',
          requiresVerification: true
        }
      })
    }

    return prescription
  }

  /**
   * Approve a prescription
   */
  static async approvePrescription(
    prescriptionId: string,
    reviewedBy: string,
    notes?: string
  ) {
    const prescription = await db.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        notes,
        updatedAt: new Date()
      }
    })

    // Update order status to allow processing
    if (prescription.orderId) {
      await db.order.update({
        where: { id: prescription.orderId },
        data: {
          status: 'PROCESSING',
          internalNotes: `Prescription approved by ${reviewedBy}`
        }
      })
    }

    return prescription
  }

  /**
   * Reject a prescription
   */
  static async rejectPrescription(
    prescriptionId: string,
    reviewedBy: string,
    rejectionReason: string
  ) {
    const prescription = await db.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason,
        updatedAt: new Date()
      }
    })

    // Cancel the order if prescription is rejected
    if (prescription.orderId) {
      await db.order.update({
        where: { id: prescription.orderId },
        data: {
          status: 'CANCELLED',
          internalNotes: `Order cancelled - Prescription rejected: ${rejectionReason}`
        }
      })
    }

    return prescription
  }

  /**
   * Check if an order can proceed based on prescription status
   */
  static async canProcessOrder(orderId: string): Promise<{
    canProcess: boolean
    reason?: string
  }> {
    // Get order with items
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                isPrescriptionRequired: true,
                isControlled: true
              }
            }
          }
        },
        prescriptions: true
      }
    })

    if (!order) {
      return { canProcess: false, reason: 'Order not found' }
    }

    // Check if any items require prescription
    const prescriptionItems = order.orderItems.filter(
      item => item.product.isPrescriptionRequired || item.product.isControlled
    )

    if (prescriptionItems.length === 0) {
      // No prescription required
      return { canProcess: true }
    }

    // Check if order has prescriptions
    if (!order.prescriptions || order.prescriptions.length === 0) {
      return {
        canProcess: false,
        reason: 'Prescription required but not uploaded'
      }
    }

    // Check prescription status
    const validPrescription = order.prescriptions.find(
      p => p.status === 'APPROVED'
    )

    if (!validPrescription) {
      const pendingPrescription = order.prescriptions.find(
        p => p.status === 'PENDING' || p.status === 'UNDER_REVIEW'
      )

      if (pendingPrescription) {
        return {
          canProcess: false,
          reason: 'Prescription is pending review'
        }
      }

      return {
        canProcess: false,
        reason: 'Prescription has been rejected or is invalid'
      }
    }

    // Check if prescription is expired
    if (validPrescription.expiryDate) {
      const expiryDate = new Date(validPrescription.expiryDate)
      if (expiryDate < new Date()) {
        return {
          canProcess: false,
          reason: 'Prescription has expired'
        }
      }
    }

    return { canProcess: true }
  }
}
