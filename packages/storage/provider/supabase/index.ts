import { createClient } from '@supabase/supabase-js'
import { logger } from "@repo/logs"
import type {
  GetSignedUploadUrlHandler,
  GetSignedUrlHander,
  DeleteObjectHandler,
} from "../../types"

let supabaseClient: ReturnType<typeof createClient> | null = null

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing env variable NEXT_PUBLIC_SUPABASE_URL")
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error("Missing env variable SUPABASE_SERVICE_ROLE_KEY")
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })

  return supabaseClient
}

export const deleteObject: DeleteObjectHandler = async (path, { bucket }) => {
  const client = getSupabaseClient()
  try {
    const { error } = await client.storage
      .from(bucket)
      .remove([path])
    
    if (error) {
      throw error
    }
  } catch (e) {
    logger.error(e)
    throw new Error("Could not delete object")
  }
}

export const getSignedUploadUrl: GetSignedUploadUrlHandler = async (
  path,
  { bucket }
) => {
  const client = getSupabaseClient()
  try {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(path, {
        upsert: true
      })
    
    if (error) {
      throw error
    }
    
    if (!data?.signedUrl) {
      throw new Error("No signed URL returned")
    }
    
    return data.signedUrl
  } catch (e) {
    logger.error(e)
    throw new Error("Could not get signed upload url")
  }
}

export const getSignedUrl: GetSignedUrlHander = async (
  path,
  { bucket, expiresIn }
) => {
  const client = getSupabaseClient()
  try {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn || 3600)
    
    if (error) {
      throw error
    }
    
    if (!data?.signedUrl) {
      throw new Error("No signed URL returned")
    }
    
    return data.signedUrl
  } catch (e) {
    logger.error(e)
    throw new Error("Could not get signed url")
  }
}

// Helper function to upload file directly
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob | ArrayBuffer,
  contentType?: string
) => {
  const client = getSupabaseClient()
  try {
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true
      })
    
    if (error) {
      throw error
    }
    
    return data
  } catch (e) {
    logger.error(e)
    throw new Error("Could not upload file")
  }
}

export const getObjectMetadata: GetObjectMetadataHandler = async (path, { bucket }) => {
  const client = getSupabaseClient()
  try {
    // Supabase Storage doesn't have a direct head API via SDK; create a short signed URL and HEAD it
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, 60)

    if (error || !data?.signedUrl) {
      return { exists: false, contentType: null, size: null, lastModified: null }
    }

    const head = await fetch(data.signedUrl, { method: 'HEAD' })
    if (!head.ok) {
      return { exists: head.status !== 404, contentType: null, size: null, lastModified: null }
    }

    const ct = head.headers.get('content-type')
    const len = head.headers.get('content-length')
    const lm = head.headers.get('last-modified')
    return {
      exists: true,
      contentType: ct,
      size: len ? Number(len) : null,
      lastModified: lm ? new Date(lm) : null,
    }
  } catch (e) {
    logger.error(e)
    return { exists: false, contentType: null, size: null, lastModified: null }
  }
}
