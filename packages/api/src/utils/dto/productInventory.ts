// Admin Product Inventory DTO and mapper
// Keep UI-compat fields while adding normalized fields for future use.

export type StockStatus = 'out_of_stock' | 'low_stock' | 'in_stock'

export interface AdminProductDTO {
  id: string
  name: string
  genericName?: string | null
  brandName?: string | null
  category: string
  description?: string | null
  imageUrl?: string | null
  wholesalePrice: number
  retailPrice: number
  stockQuantity: number
  // UI-compat fields
  minOrderQty: number
  isPrescriptionRequired: boolean
  // Normalized field name
  nafdacNumber?: string | null
  // Temporary alias for backward compatibility with older UI
  nafdacRegNumber?: string | null
  createdAt: string
  updatedAt: string
  // New normalized helpers
  lowStockThreshold: number
  stockStatus: StockStatus
}

function toNumber(n: any, fallback = 0): number {
  if (n === null || n === undefined) return fallback
  const v = typeof n === 'string' ? parseFloat(n) : n
  return Number.isFinite(v) ? Number(v) : fallback
}

function extractPrimaryImage(images: any): string | null {
  try {
    const arr = Array.isArray(images) ? images : typeof images === 'string' ? JSON.parse(images) : []
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0]
      if (first && typeof first === 'object' && first.url) return first.url as string
      if (typeof first === 'string') return first
    }
  } catch {}
  return null
}

export function mapProductToAdminInventoryDTO(p: any): AdminProductDTO {
  const wholesalePrice = toNumber(p.wholesalePrice)
  const retailPrice = toNumber(p.retailPrice)
  const stockQuantity = toNumber(p.stockQuantity)
  const lowStockThreshold = (typeof p.minStockLevel === 'number' ? p.minStockLevel : undefined) ?? 10

  let stockStatus: StockStatus
  if (stockQuantity === 0) stockStatus = 'out_of_stock'
  else if (stockQuantity <= lowStockThreshold) stockStatus = 'low_stock'
  else stockStatus = 'in_stock'

  const imageUrl = p.imageUrl ?? extractPrimaryImage(p.images)

  return {
    id: p.id,
    name: p.name,
    genericName: p.genericName ?? null,
    brandName: p.brandName ?? null,
    category: p.category,
    description: p.description ?? null,
    imageUrl,
    wholesalePrice,
    retailPrice,
    stockQuantity,
    // compatibility
    minOrderQty: (typeof p.minOrderQuantity === 'number' ? p.minOrderQuantity : undefined) ?? 1,
    isPrescriptionRequired: !!p.isPrescriptionRequired,
    // Normalized + alias for backward compatibility
    nafdacNumber: p.nafdacNumber ?? null,
    nafdacRegNumber: p.nafdacNumber ?? (p.nafdacRegNumber ?? null),
    createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
    updatedAt: (p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt)).toISOString(),
    // normalized helpers
    lowStockThreshold,
    stockStatus,
  }
}
