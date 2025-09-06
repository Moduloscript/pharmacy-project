import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';

import type { AppBindings } from '../../types/context';
const inventoryRouter = new Hono<AppBindings>();

// Apply auth middleware to all routes
inventoryRouter.use('*', authMiddleware);

// Admin-only middleware
inventoryRouter.use('*', async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  await next();
});

// Query validation schemas
const inventoryQuerySchema = z.object({
  category: z.string().optional(),
  stockStatus: z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']).default('all'),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'stock', 'category', 'price', 'updated']).default('updated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateStockSchema = z.object({
  stock_quantity: z.number().int().min(0),
  adjustment_reason: z.string().optional(),
  adjustment_notes: z.string().optional(),
});

const bulkUpdateStockSchema = z.object({
  updates: z.array(z.object({
    productId: z.string(),
    stock_quantity: z.number().int().min(0),
    adjustment_reason: z.string().optional(),
  }))
});

const lowStockThresholdSchema = z.object({
  low_stock_threshold: z.number().int().min(0).default(10),
});

/**
 * GET /admin/inventory
 * Get all products with inventory information
 */
inventoryRouter.get('/', zValidator('query', inventoryQuerySchema), async (c) => {
  try {
    const { category, stockStatus, page, limit, search, sortBy, sortOrder } = c.req.valid('query');
    
    // Build where clause
    const where: any = {};
    
    if (category) {
      // ProductCategory is an enum; cast the incoming string for filtering
      where.category = { equals: category as any };
    }
    
    // Stock status filtering
    switch (stockStatus) {
      case 'out-of-stock':
        where.stockQuantity = { equals: 0 };
        break;
      case 'low-stock':
        where.AND = [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: { lte: 10 } } // Low stock threshold
        ];
        break;
      case 'in-stock':
        where.stockQuantity = { gt: 10 };
        break;
      // 'all' - no additional filter
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
    
    // Build orderBy clause
    let orderBy: any;
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'stock':
        orderBy = { stockQuantity: sortOrder };
        break;
      case 'category':
        orderBy = { category: sortOrder };
        break;
      case 'price':
        orderBy = { retailPrice: sortOrder };
        break;
      case 'updated':
      default:
        orderBy = { updatedAt: sortOrder };
        break;
    }
    
    // Get total count for pagination
    const totalCount = await db.product.count({ where });
    
    // Get inventory data
    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        category: true,
        imageUrl: true,
        wholesalePrice: true,
        retailPrice: true,
        stockQuantity: true,
        minOrderQuantity: true,
        isPrescriptionRequired: true,
        nafdacNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: limit,
    });
    
    // Format inventory data with status indicators
    const formattedInventory = products.map(product => {
      let stockStatus: string;
      if (product.stockQuantity === 0) {
        stockStatus = 'out-of-stock';
      } else if (product.stockQuantity <= 10) {
        stockStatus = 'low-stock';
      } else {
        stockStatus = 'in-stock';
      }
      
      return {
        ...product,
        wholesalePrice: Number(product.wholesalePrice),
        retailPrice: Number(product.retailPrice),
        stockStatus,
        stockValue: Number(product.wholesalePrice) * product.stockQuantity,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    
    return c.json({
      inventory: formattedInventory,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return c.json({ error: 'Failed to fetch inventory' }, 500);
  }
});

/**
 * GET /admin/inventory/stats
 * Get inventory statistics for dashboard
 */
inventoryRouter.get('/stats', async (c) => {
  try {
    // Total products
    const totalProducts = await db.product.count();
    
    // Stock status counts
    const outOfStockCount = await db.product.count({
      where: { stockQuantity: 0 }
    });
    
    const lowStockCount = await db.product.count({
      where: {
        AND: [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: { lte: 10 } }
        ]
      }
    });
    
    const inStockCount = await db.product.count({
      where: { stockQuantity: { gt: 10 } }
    });
    
    // Products by category
    const productsByCategory = await db.product.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      _sum: {
        stockQuantity: true
      }
    });
    
    // Total inventory value (based on wholesale price)
    const inventoryValue = await db.product.aggregate({
      _sum: {
        wholesalePrice: true
      },
      where: {
        stockQuantity: { gt: 0 }
      }
    });
    
    // Low stock products (for alerts)
    const lowStockProducts = await db.product.findMany({
      where: {
        OR: [
          { stockQuantity: 0 },
          {
            AND: [
              { stockQuantity: { gt: 0 } },
              { stockQuantity: { lte: 10 } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        category: true,
      },
      orderBy: { stockQuantity: 'asc' },
      take: 10 // Top 10 most critical
    });
    
    // Format category stats
    const categoryStats = productsByCategory.map(cat => ({
      category: cat.category,
      productCount: (cat._count as any)?.id ?? 0,
      totalStock: (cat._sum as any)?.stockQuantity || 0,
    }));
    
    const stats = {
      totalProducts,
      stockStatus: {
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      categoryBreakdown: categoryStats,
      totalInventoryValue: Number((inventoryValue._sum as any)?.wholesalePrice) || 0,
      lowStockAlerts: lowStockProducts,
      stockHealthPercentage: totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0,
    };
    
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return c.json({ error: 'Failed to fetch inventory statistics' }, 500);
  }
});

/**
 * PUT /admin/inventory/:id/stock
 * Update stock quantity for a specific product
 */
inventoryRouter.put('/:id/stock', zValidator('json', updateStockSchema), async (c) => {
  try {
    const productId = c.req.param('id');
    const { stock_quantity, adjustment_reason, adjustment_notes } = c.req.valid('json');
    
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stockQuantity: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Update product stock
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        stockQuantity: stock_quantity,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        wholesalePrice: true,
        retailPrice: true,
        updatedAt: true,
      }
    });
    
    // TODO: Log stock adjustment in audit trail
    // const stockAdjustment = await db.stockAdjustment.create({
    //   data: {
    //     productId,
    //     previousQuantity: product.stock_quantity,
    //     newQuantity: stock_quantity,
    //     adjustmentType: stock_quantity > product.stock_quantity ? 'INCREASE' : 'DECREASE',
    //     reason: adjustment_reason,
    //     notes: adjustment_notes,
    //     adjustedBy: user.id,
    //   }
    // });
    
    return c.json({
      message: 'Stock updated successfully',
      product: {
        ...updatedProduct,
        wholesalePrice: Number(updatedProduct.wholesalePrice),
        retailPrice: Number(updatedProduct.retailPrice),
        previousStock: product.stockQuantity,
        adjustment: stock_quantity - product.stockQuantity,
        updatedAt: updatedProduct.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return c.json({ error: 'Failed to update stock' }, 500);
  }
});

/**
 * POST /admin/inventory/bulk-update
 * Bulk update stock quantities for multiple products
 */
inventoryRouter.post('/bulk-update', zValidator('json', bulkUpdateStockSchema), async (c) => {
  try {
    const { updates } = c.req.valid('json');
    
    // Validate all product IDs exist
    const productIds = updates.map((u: any) => u.productId);
    const existingProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stockQuantity: true }
    });
    
    if (existingProducts.length !== productIds.length) {
      return c.json({ error: 'One or more products not found' }, 404);
    }
    
    // Perform bulk updates
    const updatePromises = updates.map((update: any) =>
      db.product.update({
        where: { id: update.productId },
        data: {
          stockQuantity: update.stock_quantity,
          updatedAt: new Date(),
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    // Get updated products
    const updatedProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        updatedAt: true,
      }
    });
    
    return c.json({
      message: `Successfully updated stock for ${updates.length} products`,
      updatedProducts: updatedProducts.map(p => ({
        ...p,
        updatedAt: p.updatedAt.toISOString(),
      }))
    });
  } catch (error) {
    console.error('Error bulk updating stock:', error);
    return c.json({ error: 'Failed to bulk update stock' }, 500);
  }
});

/**
 * GET /admin/inventory/low-stock
 * Get products with low or zero stock
 */
inventoryRouter.get('/low-stock', async (c) => {
  try {
    const lowStockProducts = await db.product.findMany({
      where: {
        OR: [
          { stockQuantity: 0 },
          {
            AND: [
              { stockQuantity: { gt: 0 } },
              { stockQuantity: { lte: 10 } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        category: true,
        stockQuantity: true,
        minOrderQuantity: true,
        wholesalePrice: true,
        retailPrice: true,
        updatedAt: true,
      },
      orderBy: { stockQuantity: 'asc' },
    });
    
    const formattedProducts = lowStockProducts.map(product => ({
      ...product,
      wholesalePrice: Number(product.wholesalePrice),
      retailPrice: Number(product.retailPrice),
      stockStatus: product.stockQuantity === 0 ? 'out-of-stock' : 'low-stock',
      updatedAt: product.updatedAt.toISOString(),
    }));
    
    return c.json({
      lowStockProducts: formattedProducts,
      count: formattedProducts.length
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return c.json({ error: 'Failed to fetch low stock products' }, 500);
  }
});

/**
 * GET /admin/inventory/categories
 * Get all product categories with stock info
 */
inventoryRouter.get('/categories', async (c) => {
  try {
    const categories = await db.product.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      _sum: {
        stockQuantity: true
      },
      _avg: {
        retailPrice: true
      }
    });
    
    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      productCount: (cat._count as any)?.id ?? 0,
      totalStock: (cat._sum as any)?.stockQuantity || 0,
      averagePrice: Number((cat._avg as any)?.retailPrice) || 0,
    }));
    
    return c.json({ categories: formattedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

export { inventoryRouter };
