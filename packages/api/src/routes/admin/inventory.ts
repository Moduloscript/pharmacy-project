import { Hono } from 'hono';
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

/**
 * GET /admin/inventory/stats
 * Keep inventory router focused on stats only. Listing and updates live under /admin/products.
 */
inventoryRouter.get('/stats', async (c) => {
  try {
    // Total products
    const totalProducts = await db.product.count();

    // Compute stock status counts using each product's minStockLevel (fallback 10)
    const productsForStatus = await db.product.findMany({
      select: { stockQuantity: true, minStockLevel: true }
    });
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let inStockCount = 0;
    for (const p of productsForStatus) {
      const q = Number(p.stockQuantity) || 0;
      const threshold = (typeof p.minStockLevel === 'number' ? p.minStockLevel : undefined) ?? 10;
      if (q === 0) outOfStockCount++;
      else if (q <= threshold) lowStockCount++;
      else inStockCount++;
    }

    // Products by category
    const productsByCategory = await db.product.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { stockQuantity: true }
    });

    // Total inventory value (wholesalePrice * stockQuantity)
    // Decision documented: we use wholesale price as "inventory value" baseline.
    const productsForValue = await db.product.findMany({
      select: { wholesalePrice: true, stockQuantity: true },
      where: { stockQuantity: { gt: 0 } }
    });
    const totalInventoryValue = productsForValue.reduce((sum, p) => {
      const w = Number(p.wholesalePrice) || 0;
      const q = Number(p.stockQuantity) || 0;
      return sum + w * q;
    }, 0);

    // Low-stock alerts: top 10 with q == 0 or (0 < q <= threshold) using per-product threshold
    const productsForAlerts = await db.product.findMany({
      select: { id: true, name: true, category: true, stockQuantity: true, minStockLevel: true }
    });
    const lowStockAlerts = productsForAlerts
      .filter(p => {
        const q = Number(p.stockQuantity) || 0;
        const threshold = (typeof p.minStockLevel === 'number' ? p.minStockLevel : undefined) ?? 10;
        return q === 0 || (q > 0 && q <= threshold);
      })
      .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity))
      .slice(0, 10)
      .map(p => ({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, category: p.category }));

    const categoryStats = productsByCategory.map(cat => ({
      category: cat.category,
      productCount: (cat._count as any)?.id ?? 0,
      totalStock: (cat._sum as any)?.stockQuantity || 0,
    }));

    const stats = {
      totalProducts,
      stockStatus: { inStock: inStockCount, lowStock: lowStockCount, outOfStock: outOfStockCount },
      categoryBreakdown: categoryStats,
      totalInventoryValue,
      lowStockAlerts,
      stockHealthPercentage: totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0,
    };

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return c.json({ error: 'Failed to fetch inventory statistics' }, 500);
  }
});

export { inventoryRouter };
