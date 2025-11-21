import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';
import { ProductImageService } from '../../services/productImageService';
import { mapProductToAdminInventoryDTO } from '../../utils/dto/productInventory';
import {
  ListBatchesQueryDTO,
  ListMovementsQueryDTO,
  CreateProductBatchDTO,
  CreateAdjustmentDTO,
} from '../../utils/dto';
import { inventoryService } from '../../services/inventory';
import { logger } from '@repo/logs';

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
  notes: z.string().optional(), // optional free-text notes for audit trail
  adjustmentNotes: z.string().optional(), // legacy/alias support
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(), // ISO date string (optional)
});

const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    stockQuantity: z.number().int().min(0),
    reason: z.string().optional(),
    notes: z.string().optional(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(), // ISO date string (optional)
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
  retailPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
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
      // category is an enum; use direct equality (no mode)
      where.category = { equals: category };
    }
    
    // Note: Do not filter by stockStatus at the DB level, because per-product
    // thresholds (minStockLevel) vary. We will filter after mapping to DTOs.
    
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
        imageUrl: true,
        wholesalePrice: true,
        retailPrice: true,
        stockQuantity: true,
        minOrderQuantity: true,
        minStockLevel: true,
        isPrescriptionRequired: true,
        nafdacNumber: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { bulkPriceRules: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });
    
    // Map to DTOs
    let formattedProducts = products.map(mapProductToAdminInventoryDTO);

    // Apply stockStatus filter using server-computed status based on minStockLevel
    if (stockStatus && stockStatus !== 'all') {
      const statusMap: Record<string, 'out_of_stock' | 'low_stock' | 'in_stock'> = {
        'out-of-stock': 'out_of_stock',
        'low-stock': 'low_stock',
        'in-stock': 'in_stock',
      };
      const desired = statusMap[stockStatus];
      if (desired) {
        formattedProducts = formattedProducts.filter(p => p.stockStatus === desired);
      }
    }
    
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
      include: { _count: { select: { bulkPriceRules: true } } }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Map to DTO-like shape for admin consumers (but include full product fields for edit forms)
    const dto = mapProductToAdminInventoryDTO(product);

    // Include additional fields needed by edit forms without breaking InventoryTable
    const full = {
      ...dto,
      manufacturer: product.manufacturer,
      nafdacNumber: product.nafdacNumber,
      strength: product.strength,
      dosageForm: product.dosageForm,
      activeIngredient: product.activeIngredient,
      sku: product.sku,
      barcode: product.barcode,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel,
      packSize: product.packSize,
      unit: product.unit,
      weight: product.weight,
      isActive: product.isActive,
      isRefrigerated: product.isRefrigerated,
      isControlled: product.isControlled,
      slug: product.slug,
      images: product.images,
      tags: product.tags,
      hasExpiry: product.hasExpiry,
      shelfLifeMonths: product.shelfLifeMonths,
      minOrderQuantity: product.minOrderQuantity,
      hasBulkRules: !!(product._count?.bulkPriceRules > 0),
    };
    
    return c.json(full);
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
      wholesalePrice: updatedProduct.wholesalePrice == null ? undefined : Number(updatedProduct.wholesalePrice),
      cost: updatedProduct.cost == null ? undefined : Number(updatedProduct.cost),
      sku: updatedProduct.sku,
      barcode: updatedProduct.barcode,
      stockQuantity: updatedProduct.stockQuantity,
      minStockLevel: updatedProduct.minStockLevel,
      maxStockLevel: updatedProduct.maxStockLevel,
      packSize: updatedProduct.packSize,
      unit: updatedProduct.unit,
      weight: updatedProduct.weight == null ? undefined : Number(updatedProduct.weight),
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
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    };
    
    return c.json(formattedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle Prisma constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
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
const { stockQuantity, adjustmentReason, notes, adjustmentNotes, batchNumber, expiryDate } = c.req.valid('json');
    const user = c.get('user');
    
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
    
    // Create inventory movement audit log
    const delta = updatedProduct.stockQuantity - product.stockQuantity;
    try {
      await db.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'ADJUSTMENT',
          quantity: delta,
          reason: adjustmentReason || null,
          previousStock: product.stockQuantity,
          newStock: updatedProduct.stockQuantity,
          userId: user?.id || null,
          notes: (notes || adjustmentNotes) ?? null,
          batchNumber: batchNumber ?? null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }
      });
    } catch (logErr) {
      console.error('Failed to log inventory movement:', logErr);
      // do not fail the request if logging fails
    }
    
    // Compute normalized helpers based on minStockLevel
    const lowStockThreshold = (typeof product.minStockLevel === 'number' ? product.minStockLevel : undefined) ?? 10;
    let stockStatus: 'out_of_stock' | 'low_stock' | 'in_stock';
    if (updatedProduct.stockQuantity === 0) stockStatus = 'out_of_stock';
    else if (updatedProduct.stockQuantity <= lowStockThreshold) stockStatus = 'low_stock';
    else stockStatus = 'in_stock';

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
      // Normalized + alias
      nafdacNumber: updatedProduct.nafdacNumber,
      nafdacRegNumber: updatedProduct.nafdacNumber,
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
      // normalized helpers
      lowStockThreshold,
      stockStatus,
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
    const user = c.get('user');
    
    // Validate all products exist and fetch current stock
    const productIds = updates.map((u: { id: string }) => u.id);
    const existingProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQuantity: true, minStockLevel: true }
    });
    
    if (existingProducts.length !== productIds.length) {
      return c.json({ error: 'One or more products not found' }, 404);
    }

    const existingMap = new Map(existingProducts.map(p => [p.id, p]));
    
    // Perform bulk updates and movement logging inside a transaction for consistency
    await db.$transaction(async (tx) => {
      for (const update of updates) {
        const prev = existingMap.get(update.id)!;
        const updated = await tx.product.update({
          where: { id: update.id },
          data: { stockQuantity: update.stockQuantity },
        });
        const delta = updated.stockQuantity - prev.stockQuantity;
        await tx.inventoryMovement.create({
          data: {
            productId: update.id,
            type: 'BULK_ADJUSTMENT',
            quantity: delta,
            reason: update.reason || null,
            previousStock: prev.stockQuantity,
            newStock: updated.stockQuantity,
            userId: user?.id || null,
            notes: update.notes ?? null,
            batchNumber: update.batchNumber ?? null,
            expiryDate: update.expiryDate ? new Date(update.expiryDate) : null,
          }
        });
      }
    });
    
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
      const images = product.images ? JSON.parse(product.images as string) : [];
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

// GET /admin/products/:id/movements - list movements with filters and pagination
productsRouter.get('/:id/movements', zValidator('query', ListMovementsQueryDTO), async (c) => {
  try {
    const productId = c.req.param('id');
    const { page, pageSize, type, dateFrom, dateTo, createdBy } = c.req.valid('query');

    const result = await inventoryService.listMovements(productId, {
      page,
      pageSize,
      type,
      dateFrom: dateFrom ? new Date(dateFrom as any) : undefined,
      dateTo: dateTo ? new Date(dateTo as any) : undefined,
      createdBy,
    });

    return c.json(result);
  } catch (error: any) {
    const errInfo = {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    };
    console.error('Error fetching inventory movements (debug):', errInfo);
    if (process.env.NODE_ENV !== 'production') {
      return c.json({ error: 'Failed to fetch inventory movements', details: errInfo }, 500);
    }
    return c.json({ error: 'Failed to fetch inventory movements' }, 500);
  }
});

// GET /admin/products/:id/batches - list product batches from normalized table with pagination/filters
productsRouter.get('/:id/batches', zValidator('query', ListBatchesQueryDTO), async (c) => {
  try {
    const productId = c.req.param('id');
    const { page, pageSize, expiryAfter, expiryBefore, search } = c.req.valid('query');

    const result = await inventoryService.listBatches(productId, {
      page,
      pageSize,
      expiryAfter: expiryAfter ? new Date(expiryAfter as any) : undefined,
      expiryBefore: expiryBefore ? new Date(expiryBefore as any) : undefined,
      search,
    });

    return c.json(result);
  } catch (error) {
    console.error('Error listing batches:', error);
    return c.json({ error: 'Failed to list batches' }, 500);
  }
});

// POST /admin/products/:id/batches - create a new batch
productsRouter.post(
  '/:id/batches',
  zValidator('json', CreateProductBatchDTO.partial({ productId: true })),
  async (c) => {
    try {
      const productId = c.req.param('id');
      const body = c.req.valid('json');
      const created = await inventoryService.createBatch(productId, {
        batchNumber: body.batchNumber,
        qty: body.qty,
        costPrice: body.costPrice as any,
        expiryDate: body.expiryDate ? new Date(body.expiryDate as any) : undefined,
      });
      return c.json(created, 201);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return c.json({ error: 'Batch with this number already exists for this product' }, 409);
      }
      console.error('Error creating batch:', error);
      return c.json({ error: 'Failed to create batch' }, 500);
    }
  }
);

// POST /admin/products/:id/adjustments - create an inventory adjustment (IN/OUT/ADJUSTMENT)
productsRouter.post(
  '/:id/adjustments',
  zValidator('json', CreateAdjustmentDTO.partial({ productId: true })),
  async (c) => {
    try {
      const productId = c.req.param('id');
      const body = c.req.valid('json');
      const user = c.get('user');

      logger.info('admin.products.adjustments.request', {
        productId,
        type: body.type,
        qty: body.qty,
        batchId: body.batchId,
        batchNumber: body.batchNumber,
        idempotencyKey: body.idempotencyKey,
        userId: user?.id,
        referenceId: body.referenceId,
        referenceType: body.referenceType,
      });

      const created = await inventoryService.createAdjustment(productId, {
        type: body.type,
        qty: body.qty,
        reason: body.reason,
        batchId: body.batchId,
        batchNumber: body.batchNumber,
        idempotencyKey: body.idempotencyKey,
        createdBy: user?.id,
        referenceId: body.referenceId,
        referenceType: body.referenceType,
      });

      logger.info('admin.products.adjustments.success', {
        productId,
        movementId: created.id,
        newStock: created.newStock,
        batchId: created.batchId,
      });

      return c.json(created, 201);
    } catch (error: any) {
      const msg = (error?.message as string) || 'Failed to create adjustment';
      const code = msg.includes('Insufficient') ? 400 : 500;
      logger.error('admin.products.adjustments.error', {
        message: msg,
        code,
        details: error?.stack || String(error),
      });
      return c.json({ error: msg }, code);
    }
  }
);

// ==========================
// Bulk Pricing Rules (normalized)
// ==========================

const BulkRuleSchema = z
  .object({
    minQty: z.number().int().positive(),
    discountPercent: z.number().min(0).max(100).optional(),
    unitPrice: z.number().positive().optional(),
  })
  .refine((v) => ((v.discountPercent ? 1 : 0) + (v.unitPrice ? 1 : 0)) === 1, {
    message: 'Provide either discountPercent or unitPrice (but not both)',
    path: ['discountPercent'],
  });

const BulkRulesBodySchema = z.object({ rules: z.array(BulkRuleSchema) });

// GET /admin/products/:id/bulk-pricing - list normalized rules only
productsRouter.get('/:id/bulk-pricing', async (c) => {
  try {
    const productId = c.req.param('id');

    const rows = await db.productBulkPriceRule.findMany({
      where: { productId },
      orderBy: { minQty: 'asc' },
      select: { minQty: true, discountPercent: true, unitPrice: true },
    });
    const rules = rows.map((r) => ({
      minQty: r.minQty,
      discountPercent: r.discountPercent != null ? Number(r.discountPercent) : undefined,
      unitPrice: r.unitPrice != null ? Number(r.unitPrice) : undefined,
    }));
    return c.json({ rules });
  } catch (error) {
    console.error('Error fetching bulk pricing rules:', error);
    return c.json({ error: 'Failed to fetch bulk pricing rules' }, 500);
  }
});

// PUT /admin/products/:id/bulk-pricing - replace rules transactionally
productsRouter.put('/:id/bulk-pricing', zValidator('json', BulkRulesBodySchema), async (c) => {
  try {
    const productId = c.req.param('id');
    const { rules } = c.req.valid('json');

    // Ensure product exists (optional)
    const exists = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) return c.json({ error: 'Product not found' }, 404);

    await db.$transaction(async (tx) => {
      await tx.productBulkPriceRule.deleteMany({ where: { productId } });
      if (rules.length > 0) {
        await tx.productBulkPriceRule.createMany({
          data: rules.map((r: { minQty: number; discountPercent?: number; unitPrice?: number }) => ({
            productId,
            minQty: r.minQty,
            discountPercent: r.discountPercent ?? null,
            unitPrice: r.unitPrice ?? null,
          })),
          skipDuplicates: true,
        });
      }
    });

    const rows = await db.productBulkPriceRule.findMany({
      where: { productId },
      orderBy: { minQty: 'asc' },
      select: { minQty: true, discountPercent: true, unitPrice: true },
    });
    const saved = rows.map((r) => ({
      minQty: r.minQty,
      discountPercent: r.discountPercent != null ? Number(r.discountPercent) : undefined,
      unitPrice: r.unitPrice != null ? Number(r.unitPrice) : undefined,
    }));
    return c.json({ rules: saved });
  } catch (error: any) {
    const errInfo = { message: error?.message, code: error?.code, meta: (error as any)?.meta };
    console.error('Error saving bulk pricing rules:', errInfo);
    return c.json({ error: 'Failed to save bulk pricing rules' }, 500);
  }
});

export { productsRouter };
