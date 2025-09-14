import { getSignedUrl, getSignedUploadUrl, deleteObject } from '@repo/storage'
import { config } from '@repo/config'
import { db } from '@repo/database'

interface PrescriptionFileUpload {
  userId: string
  prescriptionId: string
  file: {
    name: string
    type: string
    size: number
  }
}

interface PrescriptionFileAccess {
  prescriptionId: string
  userId: string
  isAdmin?: boolean
}

/**
 * Generate a storage key for prescription files
 * Format: {userId}/{prescriptionId}/{timestamp}.{ext}
 */
export function generatePrescriptionStorageKey(
  userId: string,
  prescriptionId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
  return `${userId}/${prescriptionId}/${timestamp}.${ext}`
}

/**
 * Get a signed upload URL for prescription files
 */
export async function getPrescriptionUploadUrl(
  data: PrescriptionFileUpload
): Promise<{ uploadUrl: string; storageKey: string }> {
  const storageKey = generatePrescriptionStorageKey(
    data.userId,
    data.prescriptionId,
    data.file.name
  )

  const uploadUrl = await getSignedUploadUrl(storageKey, {
    bucket: config.storage.bucketNames.prescriptions,
    contentType: data.file.type
  })

  return {
    uploadUrl,
    storageKey
  }
}

/**
 * Get a signed URL for viewing a prescription file
 */
export async function getPrescriptionViewUrl(
  storageKey: string,
  access: PrescriptionFileAccess
): Promise<string> {
  // Verify access permissions
  const prescription = await db.prescription.findUnique({
    where: { id: access.prescriptionId },
    include: {
      order: {
        include: {
          customer: true
        }
      }
    }
  })

  if (!prescription) {
    throw new Error('Prescription not found')
  }

  // Check if user has access
  const isOwner = prescription.order.customer.userId === access.userId
  const isAdmin = access.isAdmin === true

  if (!isOwner && !isAdmin) {
    throw new Error('Access denied')
  }

  // Generate signed URL with expiry
  const signedUrl = await getSignedUrl(storageKey, {
    bucket: config.storage.bucketNames.prescriptions,
    expiresIn: 60 * 60 * 24 // 24 hours
  })

  return signedUrl
}

/**
 * Delete a prescription file from storage
 */
export async function deletePrescriptionFile(
  storageKey: string,
  access: PrescriptionFileAccess
): Promise<void> {
  // Verify access permissions
  const prescription = await db.prescription.findUnique({
    where: { id: access.prescriptionId },
    include: {
      order: {
        include: {
          customer: true
        }
      }
    }
  })

  if (!prescription) {
    throw new Error('Prescription not found')
  }

  // Only admin can delete prescription files
  if (!access.isAdmin) {
    throw new Error('Only administrators can delete prescription files')
  }

  // Delete from storage
  await deleteObject(storageKey, {
    bucket: config.storage.bucketNames.prescriptions
  })
}

/**
 * Get all prescription files for a prescription
 */
export async function getPrescriptionFiles(
  prescriptionId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<Array<{ url: string; uploadedAt: Date }>> {
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
    throw new Error('Prescription not found')
  }

  // Check access
  const isOwner = prescription.order.customer.userId === userId
  if (!isOwner && !isAdmin) {
    throw new Error('Access denied')
  }

  const files: Array<{ url: string; uploadedAt: Date }> = []

  // If there's a document key, generate signed URL
  if (prescription.documentKey) {
    const url = await getSignedUrl(prescription.documentKey, {
      bucket: config.storage.bucketNames.prescriptions,
      expiresIn: 60 * 60 * 24 // 24 hours
    })
    
    files.push({
      url,
      uploadedAt: prescription.updatedAt
    })
  }

  // Legacy support for imageUrl field
  if (prescription.imageUrl && !prescription.imageUrl.startsWith('/uploads/')) {
    files.push({
      url: prescription.imageUrl,
      uploadedAt: prescription.updatedAt
    })
  }

  return files
}

/**
 * Migrate legacy prescription URLs to Supabase Storage
 */
export async function migratePrescriptionToStorage(
  prescriptionId: string,
  fileUrl: string
): Promise<string> {
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
    throw new Error('Prescription not found')
  }

  // Generate new storage key
  const storageKey = `${prescription.order.customer.userId}/${prescriptionId}/migrated-${Date.now()}.pdf`

  // For migration, you would download from old URL and upload to Supabase
  // This is a placeholder - actual implementation would depend on where files are currently stored
  
  // Update prescription with new storage key
  await db.prescription.update({
    where: { id: prescriptionId },
    data: {
      documentKey: storageKey,
      imageUrl: null // Clear old URL
    }
  })

  return storageKey
}
