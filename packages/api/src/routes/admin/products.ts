import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';
import { ProductImageService } from '../../services/productImageService';

import type { AppBindings } from '../../types/context';
const productsRouter = new Hono<AppBindings>();
const imageService = new ProductImageService();

// Helper function to refresh expired image URLs
const refreshImageUrlsIfNeeded = async (images: any[]): Promise<any[]> => {
  if (!Array.isArray(images) || images.length === 0) {
    return images;
  }

  const refreshedImages = [];
  
  for (const image of images) {
    try {
      // Check if URL might be expired by testing it
      // For simplicity, we'll refresh URLs that are more than 6 days old
      const refreshedUrl = await imageService.refreshImageUrl(image.key);
      refreshedImages.push({
        ...image,
        url: refreshedUrl
      });
    } catch (error) {
      console.warn(`Failed to refresh URL for image ${image.key}:`, error);
      // Keep original image if refresh fails
      refreshedImages.push(image);
    }
  }
  
  return refreshedImages;
};

// Apply auth middleware to all routes
productsRouter.use('*', authMiddleware);

// Admin-only middleware
productsRouter.use('*', async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  await next();
});

// Query validation schemas
const productsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
  search: z.string().optional(),
  category: z.string().optional(),
  stockStatus: z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']).default('all'),
});

const updateStockSchema = z.object({
  stockQuantity: z.number().int().min(0),
  adjustmentReason: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    stockQuantity: z.number().int().min(0),
  }))
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  nafdacNumber: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  activeIngredient: z.string().optional(),
  retailPrice: z.number().positive().optional(),
  wholesalePrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().positive().optional(),
  packSize: z.string().optional(),
  unit: z.string().min(1).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isActive: z.boolean().optional(),
  isPrescriptionRequired: z.boolean().optional(),
  isRefrigerated: z.boolean().optional(),
  isControlled: z.boolean().optional(),
  tags: z.string().optional(),
  hasExpiry: z.boolean().optional(),
  shelfLifeMonths: z.number().int().positive().optional(),
  minOrderQuantity: z.number().int().positive().optional(),
  bulkPricing: z.string().optional(),
});

/**
 * GET /admin/products
 * Get all products (for inventory management)
 */
productsRouter.get('/', zValidator('query', productsQuerySchema), async (c) => {
  try {
    const { page, limit, search, category, stockStatus } = c.req.valid('query');
    
    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    
    // Stock status filtering
    switch (stockStatus) {
      case 'out-of-stock':
        where.stockQuantity = { equals: 0 };
        break;
      case 'low-stock':
        where.AND = [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: { lte: 10 } }
        ];
        break;
      case 'in-stock':
        where.stockQuantity = { gt: 10 };
        break;
    }
    
    // Add search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { nafdacNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get products
    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        category: true,
        description: true,
        images: true,
        wholesalePrice: true,
        retailPrice: true,
        stockQuantity: true,
        minOrderQuantity: true,
        isPrescriptionRequired: true,
        nafdacNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });
    
    // Format products for frontend (matching expected format)
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      category: product.category,
      description: product.description,
      imageUrl: product.images ? (() => {
        try {
          // images is already parsed from JSONB, no need for JSON.parse
          const images = product.images as any;
          return Array.isArray(images) && images.length > 0 ? images[0]?.url : null;
        } catch (error) {
          console.error('Error extracting imageUrl:', error, product.images);
          return null;
        }
      })() : null,
      wholesalePrice: Number(product.wholesalePrice),
      retailPrice: Number(product.retailPrice),
      stockQuantity: product.stockQuantity,
      minOrderQty: product.minOrderQuantity,
      isPrescriptionRequired: product.isPrescriptionRequired,
      nafdacRegNumber: product.nafdacNumber,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }));
    
    return c.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

/**
 * GET /admin/products/:id
 * Get single product details
 */
productsRouter.get('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Format product for frontend - include all fields that ProductEditForm expects
    const formattedProduct = {
      id: product.id,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      category: product.category,
      description: product.description,
      manufacturer: product.manufacturer,
      nafdacNumber: product.nafdacNumber,
      strength: product.strength,
      dosageForm: product.dosageForm,
      activeIngredient: product.activeIngredient,
      retailPrice: Number(product.retailPrice),
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : undefined,
      cost: product.cost ? Number(product.cost) : undefined,
      sku: product.sku,
      barcode: product.barcode,
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel,
      packSize: product.packSize,
      unit: product.unit,
      weight: product.weight ? Number(product.weight) : undefined,
      dimensions: product.dimensions,
      isActive: product.isActive,
      isPrescriptionRequired: product.isPrescriptionRequired,
      isRefrigerated: product.isRefrigerated,
      isControlled: product.isControlled,
      slug: product.slug,
      images: product.images ? (() => {
        try {
          // images is already parsed from JSONB, no need for JSON.parse
          const images = product.images as any;
          return Array.isArray(images) ? images : [];
        } catch {
          return [];
        }
      })() : [],
      imageUrl: product.images ? (() => {
        try {
          // images is already parsed from JSONB, no need for JSON.parse
          const images = product.images as any;
          return Array.isArray(images) && images.length > 0 ? images[0]?.url : null;
        } catch {
          return null;
        }
      })() : null,
      tags: product.tags,
      hasExpiry: product.hasExpiry,
      shelfLifeMonths: product.shelfLifeMonths,
      minOrderQuantity: product.minOrderQuantity,
      bulkPricing: product.bulkPricing,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
    
    return c.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

/**
 * PUT /admin/products/:id
 * Update full product details
 */
productsRouter.put('/:id', zValidator('json', updateProductSchema), async (c) => {
  try {
    const productId = c.req.param('id');
    const updateData = c.req.valid('json');
    
    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // If SKU is being updated, check for conflicts
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingSkuProduct = await db.product.findUnique({
        where: { sku: updateData.sku },
      });
      
      if (existingSkuProduct) {
        return c.json({ error: 'SKU already exists' }, 400);
      }
    }
    
    // Prepare update data, filtering out undefined values
    const cleanUpdateData: any = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdateData[key] = value;
      }
    });
    
    // Update product
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: cleanUpdateData,
    });
    
    // Format response to match frontend expectations
    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      genericName: updatedProduct.genericName,
      brandName: updatedProduct.brandName,
      category: updatedProduct.category,
      description: updatedProduct.description,
      manufacturer: updatedProduct.manufacturer,
      nafdacNumber: updatedProduct.nafdacNumber,
      strength: updatedProduct.strength,
      dosageForm: updatedProduct.dosageForm,
      activeIngredient: updatedProduct.activeIngredient,
      retailPrice: Number(updatedProduct.retailPrice),
      wholesalePrice: updatedProduct.wholesalePrice ? Number(updatedProduct.wholesalePrice) : undefined,
      cost: updatedProduct.cost ? Number(updatedProduct.cost) : undefined,
      sku: updatedProduct.sku,
      barcode: updatedProduct.barcode,
      stockQuantity: updatedProduct.stockQuantity,
      minStockLevel: updatedProduct.minStockLevel,
      maxStockLevel: updatedProduct.maxStockLevel,
      packSize: updatedProduct.packSize,
      unit: updatedProduct.unit,
      weight: updatedProduct.weight ? Number(updatedProduct.weight) : undefined,
      dimensions: updatedProduct.dimensions,
      isActive: updatedProduct.isActive,
      isPrescriptionRequired: updatedProduct.isPrescriptionRequired,
      isRefrigerated: updatedProduct.isRefrigerated,
      isControlled: updatedProduct.isControlled,
      slug: updatedProduct.slug,
      imageUrl: updatedProduct.images ? (() => {
        try {
          // images is already parsed from JSONB, no need for JSON.parse
          const images = updatedProduct.images as any;
          return Array.isArray(images) && images.length > 0 ? images[0]?.url : null;
        } catch {
          return null;
        }
      })() : null,
      tags: updatedProduct.tags,
      hasExpiry: updatedProduct.hasExpiry,
      shelfLifeMonths: updatedProduct.shelfLifeMonths,
      minOrderQuantity: updatedProduct.minOrderQuantity,
      bulkPricing: updatedProduct.bulkPricing,
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    };
    
    return c.json(formattedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle Prisma constraint errors
    if (error.code === 'P2002') {
      return c.json({ error: 'Duplicate value for unique field' }, 400);
    }
    
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

/**
 * PUT /admin/products/:id/stock
 * Update product stock quantity
 */
productsRouter.put('/:id/stock', zValidator('json', updateStockSchema), async (c) => {
  try {
    const productId = c.req.param('id');
    const { stockQuantity, adjustmentReason } = c.req.valid('json');
    
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Update stock
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        stockQuantity: stockQuantity,
      },
    });
    
    // Format for frontend
    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      genericName: updatedProduct.genericName,
      brandName: updatedProduct.brandName,
      category: updatedProduct.category,
      description: updatedProduct.description,
      imageUrl: updatedProduct.images ? (() => {
        try {
          // images is already parsed from JSONB, no need for JSON.parse
          const images = updatedProduct.images as any;
          return Array.isArray(images) && images.length > 0 ? images[0]?.url : null;
        } catch {
          return null;
        }
      })() : null,
      wholesalePrice: Number(updatedProduct.wholesalePrice),
      retailPrice: Number(updatedProduct.retailPrice),
      stockQuantity: updatedProduct.stockQuantity,
      minOrderQty: updatedProduct.minOrderQuantity,
      isPrescriptionRequired: updatedProduct.isPrescriptionRequired,
      nafdacRegNumber: updatedProduct.nafdacNumber,
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    };
    
    return c.json(formattedProduct);
  } catch (error) {
    console.error('Error updating stock:', error);
    return c.json({ error: 'Failed to update stock' }, 500);
  }
});

/**
 * PUT /admin/products/bulk-update
 * Bulk update stock for multiple products
 */
productsRouter.put('/bulk-update', zValidator('json', bulkUpdateSchema), async (c) => {
  try {
    const { updates } = c.req.valid('json');
    
    // Validate all products exist
    const productIds = updates.map(u => u.id);
    const existingProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    });
    
    if (existingProducts.length !== productIds.length) {
      return c.json({ error: 'One or more products not found' }, 404);
    }
    
    // Perform bulk updates
    const updatePromises = updates.map(update => 
      db.product.update({
        where: { id: update.id },
        data: {
          stockQuantity: update.stockQuantity,
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    return c.json({ 
      message: `Successfully updated ${updates.length} products`,
      updatedCount: updates.length 
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    return c.json({ error: 'Failed to bulk update products' }, 500);
  }
});

/**
 * POST /admin/products/:id/refresh-images
 * Refresh expired image URLs for a product
 */
productsRouter.post('/:id/refresh-images', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, images: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    if (!product.images) {
      return c.json({ message: 'No images to refresh', images: [] });
    }
    
    try {
      const images = JSON.parse(product.images);
      const refreshedImages = await refreshImageUrlsIfNeeded(images);
      
      // Update product with refreshed URLs
      await db.product.update({
        where: { id: productId },
        data: { images: JSON.stringify(refreshedImages) }
      });
      
      return c.json({
        message: 'Image URLs refreshed successfully',
        images: refreshedImages,
        imageCount: refreshedImages.length
      });
    } catch (parseError) {
      console.error('Error parsing images JSON:', parseError);
      return c.json({ error: 'Invalid images data format' }, 500);
    }
  } catch (error) {
    console.error('Error refreshing image URLs:', error);
    return c.json({ error: 'Failed to refresh image URLs' }, 500);
  }
});

/**
 * GET /admin/products/categories
 * Get all product categories
 */
productsRouter.get('/categories', async (c) => {
  try {
    const categories = await db.product.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });
    
    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      count: cat._count.id
    }));
    
    return c.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

export { productsRouter };
