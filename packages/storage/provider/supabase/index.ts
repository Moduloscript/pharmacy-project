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
