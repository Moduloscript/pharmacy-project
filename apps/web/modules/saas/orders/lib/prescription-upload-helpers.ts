import { CheckoutPrescriptionFile } from '../components/CheckoutPrescriptionUpload'
import { apiClient } from '@shared/lib/api-client'

export interface PrescriptionUploadResult {
  success: boolean
  prescriptionId?: string
  error?: string
}

/**
 * Upload prescription files after order creation
 */
export async function uploadPrescriptionAfterOrder(
  orderId: string,
  prescriptionFiles: CheckoutPrescriptionFile[],
  userId: string
): Promise<PrescriptionUploadResult> {
  if (!prescriptionFiles || prescriptionFiles.length === 0) {
    return { success: true }
  }

  try {
    console.log('🚀 Starting prescription upload for order:', orderId)
    
    // Get CSRF token
    const tokenResp = await fetch('/api/prescriptions/csrf', { credentials: 'include' })
    
    if (!tokenResp.ok) {
      console.error('❌ Failed to fetch CSRF endpoint:', tokenResp.status, tokenResp.statusText)
      return { success: false, error: `Failed to get security token: ${tokenResp.status}` }
    }
    
    let csrfToken = tokenResp.headers.get('X-CSRF-Token')
    
    if (!csrfToken) {
      // Fallback to JSON response if header not present
      try {
        const tokenData = await tokenResp.json()
        csrfToken = tokenData?.csrfToken
      } catch (e) {
        console.error('❌ Failed to parse CSRF response:', e)
      }
    }
    
    if (!csrfToken) {
      console.error('❌ No CSRF token found in response')
      return { success: false, error: 'Security token unavailable' }
    }
    
    console.log('✅ Got CSRF token')
    
    // Create prescription record (or detect existing)
    let prescriptionId: string | undefined

    const createResp = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ orderId })
    })

    if (!createResp.ok) {
      // Attempt to parse error for better handling
      let errCode: string | undefined
      try {
        const errJson = await createResp.json()
        errCode = errJson?.error?.code
        console.warn('⚠️ Prescription create returned', createResp.status, errCode)
      } catch {}

      if (createResp.status === 400 && errCode === 'PRESCRIPTION_EXISTS') {
        // Fetch order to get existing prescriptionId
        console.log('ℹ️ Prescription already exists. Fetching order to get prescriptionId...')
        const orderResp = await fetch(`/api/orders/${orderId}`, { credentials: 'include' })
        if (!orderResp.ok) {
          console.error('❌ Failed to fetch order after PRESCRIPTION_EXISTS')
          return { success: false, error: 'Prescription exists but order fetch failed' }
        }
        const orderJson = await orderResp.json().catch(() => ({}))
        prescriptionId = orderJson?.data?.order?.prescriptionId
        if (!prescriptionId) {
          console.error('❌ Could not resolve existing prescriptionId from order payload')
          return { success: false, error: 'Failed to resolve existing prescription' }
        }
        console.log('✅ Using existing prescription record:', prescriptionId)
      } else if (createResp.status === 400 && errCode === 'NO_PRESCRIPTION_ITEMS') {
        console.log('ℹ️ Order does not contain prescription items; skipping upload step')
        return { success: true }
      } else {
        console.error('❌ Failed to create prescription record')
        return { success: false, error: 'Failed to create prescription record' }
      }
    } else {
      const created = await createResp.json()
      prescriptionId = created?.data?.prescription?.id
      if (!prescriptionId) {
        console.error('❌ No prescription ID returned')
        return { success: false, error: 'Failed to get prescription ID' }
      }
      console.log('✅ Created prescription record:', prescriptionId)
    }
    
    // Upload the first file (main prescription)
    const mainFile = prescriptionFiles[0]

    // Build storage key that matches backend expectation: <userId>/<prescriptionId>/<timestamp>.<ext>
    const timestamp = Date.now()
    const ext = mainFile.file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const storageKey = `${userId}/${prescriptionId}/${timestamp}.${ext}`

    // Get signed upload URL (use typed API client which sends query params correctly)
    const signedUrlRes = await apiClient.uploads['signed-upload-url'].$post({
      query: {
        bucket: 'prescriptions',
        path: storageKey,
        contentType: mainFile.file.type
      }
    })

    if (!signedUrlRes.ok) {
      console.error('❌ Failed to get signed upload URL')
      return { success: false, error: 'Failed to get upload URL' }
    }

    const { signedUrl } = await signedUrlRes.json()
    console.log('✅ Got signed upload URL')
    
    // Upload file to storage
    const uploadResp = await fetch(signedUrl, {
      method: 'PUT',
      body: mainFile.file,
      headers: {
        'Content-Type': mainFile.file.type
      }
    })
    
    if (!uploadResp.ok) {
      console.error('❌ Failed to upload file to storage')
      return { success: false, error: 'Failed to upload file' }
    }
    
    console.log('✅ File uploaded to storage')
    
    // Refresh CSRF token before state-changing PATCH (middleware rotates token on prior POST)
    let csrfTokenForPatch = csrfToken
    try {
      const fresh = await fetch('/api/prescriptions/csrf', { credentials: 'include' })
      if (fresh.ok) {
        csrfTokenForPatch = fresh.headers.get('X-CSRF-Token') || (await fresh.json()).csrfToken || csrfToken
      }
    } catch {}

    // Update prescription with document key
    const updateResp = await fetch(`/api/prescriptions/${prescriptionId}/document`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfTokenForPatch
      },
      body: JSON.stringify({
        documentKey: storageKey,
        fileName: mainFile.file.name,
        fileSize: mainFile.file.size,
        prescribedBy: mainFile.prescribedBy,
        prescribedDate: mainFile.prescribedDate,
        notes: mainFile.notes
      }),
      credentials: 'include'
    })
    
    if (!updateResp.ok) {
      console.error('❌ Failed to update prescription record')
      return { success: false, error: 'Failed to update prescription' }
    }
    
    console.log('✅ Prescription uploaded successfully')
    
    return { success: true, prescriptionId }
    
  } catch (error) {
    console.error('❌ Error uploading prescription:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}