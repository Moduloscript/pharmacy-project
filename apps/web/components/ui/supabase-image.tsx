'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Package } from 'lucide-react'

interface SupabaseImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
  fallbackIcon?: React.ReactNode
  onError?: (error: any) => void
  onLoad?: () => void
}

export function SupabaseImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes,
  priority = false,
  fallbackIcon,
  onError,
  onLoad,
}: SupabaseImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // If no source, show fallback immediately
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        {fallbackIcon || <Package className="w-8 h-8 text-gray-400" />}
      </div>
    )
  }

  // Handle Supabase storage URLs
  const isSupabaseUrl = src.includes('supabase.co/storage/')
  const hasQueryParams = src.includes('?')
  
  // For Supabase URLs with query parameters (signed URLs), use regular img tag
  // to avoid Next.js optimization issues with dynamic query strings
  if (isSupabaseUrl && hasQueryParams) {
    // For signed URLs, use regular img tag to avoid Next.js image optimization issues
    return (
      <>
        {hasError ? (
          <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
            {fallbackIcon || <Package className="w-8 h-8 text-gray-400" />}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
            onError={(e) => {
              setHasError(true)
              onError?.(e)
            }}
            onLoad={() => {
              setIsLoading(false)
              onLoad?.()
            }}
          />
        )}
      </>
    )
  }

  // For non-signed URLs, use Next.js Image component
  return (
    <>
      {hasError ? (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          {fallbackIcon || <Package className="w-8 h-8 text-gray-400" />}
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={className}
          sizes={sizes}
          priority={priority}
          onError={(e) => {
            setHasError(true)
            onError?.(e)
          }}
          onLoad={() => {
            setIsLoading(false)
            onLoad?.()
          }}
        />
      )}
    </>
  )
}
