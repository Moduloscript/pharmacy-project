import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';

const inventoryRouter = new Hono();

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
      where.category = { equals: category, mode: 'insensitive' };
    }
    
    // Stock status filtering
    switch (stockStatus) {
      case 'out-of-stock':
        where.stock_quantity = { equals: 0 };
        break;
      case 'low-stock':
        where.AND = [
          { stock_quantity: { gt: 0 } },
          { stock_quantity: { lte: 10 } } // Low stock threshold
        ];
        break;
      case 'in-stock':
        where.stock_quantity = { gt: 10 };
        break;
      // 'all' - no additional filter
    }
    
    // Add search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { generic_name: { contains: search, mode: 'insensitive' } },
        { brand_name: { contains: search, mode: 'insensitive' } },
        { nafdac_reg_number: { contains: search, mode: 'insensitive' } },
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
        orderBy = { stock_quantity: sortOrder };
        break;
      case 'category':
        orderBy = { category: sortOrder };
        break;
      case 'price':
        orderBy = { retail_price: sortOrder };
        break;
      case 'updated':
      default:
        orderBy = { updated_at: sortOrder };
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
        generic_name: true,
        brand_name: true,
        category: true,
        image_url: true,
        wholesale_price: true,
        retail_price: true,
        stock_quantity: true,
        min_order_qty: true,
        is_prescription_required: true,
        nafdac_reg_number: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
      skip,
      take: limit,
    });
    
    // Format inventory data with status indicators
    const formattedInventory = products.map(product => {
      let stockStatus: string;
      if (product.stock_quantity === 0) {
        stockStatus = 'out-of-stock';
      } else if (product.stock_quantity <= 10) {
        stockStatus = 'low-stock';
      } else {
        stockStatus = 'in-stock';
      }
      
      return {
        ...product,
        wholesale_price: Number(product.wholesale_price),
        retail_price: Number(product.retail_price),
        stockStatus,
        stockValue: Number(product.wholesale_price) * product.stock_quantity,
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
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
      where: { stock_quantity: 0 }
    });
    
    const lowStockCount = await db.product.count({
      where: {
        AND: [
          { stock_quantity: { gt: 0 } },
          { stock_quantity: { lte: 10 } }
        ]
      }
    });
    
    const inStockCount = await db.product.count({
      where: { stock_quantity: { gt: 10 } }
    });
    
    // Products by category
    const productsByCategory = await db.product.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      _sum: {
        stock_quantity: true
      }
    });
    
    // Total inventory value (based on wholesale price)
    const inventoryValue = await db.product.aggregate({
      _sum: {
        wholesale_price: true
      },
      where: {
        stock_quantity: { gt: 0 }
      }
    });
    
    // Low stock products (for alerts)
    const lowStockProducts = await db.product.findMany({
      where: {
        OR: [
          { stock_quantity: 0 },
          {
            AND: [
              { stock_quantity: { gt: 0 } },
              { stock_quantity: { lte: 10 } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        stock_quantity: true,
        category: true,
      },
      orderBy: { stock_quantity: 'asc' },
      take: 10 // Top 10 most critical
    });
    
    // Format category stats
    const categoryStats = productsByCategory.map(cat => ({
      category: cat.category,
      productCount: cat._count.id,
      totalStock: cat._sum.stock_quantity || 0,
    }));
    
    const stats = {
      totalProducts,
      stockStatus: {
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      categoryBreakdown: categoryStats,
      totalInventoryValue: Number(inventoryValue._sum.wholesale_price) || 0,
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
      select: { id: true, name: true, stock_quantity: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Update product stock
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        stock_quantity,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        stock_quantity: true,
        wholesale_price: true,
        retail_price: true,
        updated_at: true,
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
        wholesale_price: Number(updatedProduct.wholesale_price),
        retail_price: Number(updatedProduct.retail_price),
        previousStock: product.stock_quantity,
        adjustment: stock_quantity - product.stock_quantity,
        updatedAt: updatedProduct.updated_at.toISOString(),
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
    const productIds = updates.map(u => u.productId);
    const existingProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock_quantity: true }
    });
    
    if (existingProducts.length !== productIds.length) {
      return c.json({ error: 'One or more products not found' }, 404);
    }
    
    // Perform bulk updates
    const updatePromises = updates.map(update => 
      db.product.update({
        where: { id: update.productId },
        data: {
          stock_quantity: update.stock_quantity,
          updated_at: new Date(),
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
        stock_quantity: true,
        updated_at: true,
      }
    });
    
    return c.json({
      message: `Successfully updated stock for ${updates.length} products`,
      updatedProducts: updatedProducts.map(p => ({
        ...p,
        updatedAt: p.updated_at.toISOString(),
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
          { stock_quantity: 0 },
          {
            AND: [
              { stock_quantity: { gt: 0 } },
              { stock_quantity: { lte: 10 } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        generic_name: true,
        category: true,
        stock_quantity: true,
        min_order_qty: true,
        wholesale_price: true,
        retail_price: true,
        updated_at: true,
      },
      orderBy: { stock_quantity: 'asc' },
    });
    
    const formattedProducts = lowStockProducts.map(product => ({
      ...product,
      wholesale_price: Number(product.wholesale_price),
      retail_price: Number(product.retail_price),
      stockStatus: product.stock_quantity === 0 ? 'out-of-stock' : 'low-stock',
      updatedAt: product.updated_at.toISOString(),
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
        stock_quantity: true
      },
      _avg: {
        retail_price: true
      }
    });
    
    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      productCount: cat._count.id,
      totalStock: cat._sum.stock_quantity || 0,
      averagePrice: Number(cat._avg.retail_price) || 0,
    }));
    
    return c.json({ categories: formattedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

export { inventoryRouter };
