import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';

import type { AppBindings } from '../../types/context';
const dashboardRouter = new Hono<AppBindings>();

// Apply auth middleware to all routes
dashboardRouter.use('*', authMiddleware);

// Validation middleware to check if user is admin
dashboardRouter.use('*', async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  await next();
});

// Query validation schemas
const filtersSchema = z.object({
  dateRange: z.enum(['today', '7days', '30days', '90days', '1year', 'custom']).default('30days'),
  customerType: z.enum(['all', 'retail', 'wholesale']).default('all'),
  category: z.string().optional(),
  customDateFrom: z.string().datetime().optional(),
  customDateTo: z.string().datetime().optional()
});

const topProductsSchema = z.object({
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).default('5'),
  dateRange: z.enum(['7days', '30days', '90days', '1year', 'custom']).default('30days'),
  customDateFrom: z.string().datetime().optional(),
  customDateTo: z.string().datetime().optional()
});

/**
 * GET /metrics
 * Get dashboard key metrics
 */
dashboardRouter.get('/metrics', zValidator('query', filtersSchema), async (c) => {
  try {
    const { 
      dateRange, 
      customerType,
      customDateFrom,
      customDateTo 
    } = c.req.valid('query');

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customDateFrom) startDate = new Date(customDateFrom);
        if (customDateTo) endDate = new Date(customDateTo);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Build customer filter
    const customerFilter = customerType === 'all' ? {} : {
      customer: {
        customerType: customerType.toUpperCase()
      }
    };

    // Get total revenue
    const revenueResult = await db.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'DELIVERED',
        ...customerFilter
      },
      _sum: {
        total: true
      }
    });

    // Get total orders
    const ordersResult = await db.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...customerFilter
      },
      _count: {
        id: true
      }
    });

    // Get active customers (customers who have placed orders in the period)
    const activeCustomersResult = await db.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...customerFilter
      },
      select: {
        customerId: true
      },
      distinct: ['customerId']
    });

    // Get low stock products
    const lowStockProducts = await db.product.count({
      where: {
        stockQuantity: {
          lte: 10 // Consider products with 10 or fewer items as low stock
        }
      }
    });

    // Get out of stock products
    const outOfStockProducts = await db.product.count({
      where: {
        stockQuantity: {
          lte: 0
        }
      }
    });

    // Get today's orders
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dailyOrders = await db.order.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    // Get this month's orders and revenue
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await db.order.aggregate({
      where: {
        createdAt: {
          gte: thisMonth
        },
        status: 'DELIVERED'
      },
      _sum: {
        total: true
      }
    });

    const monthlyCustomers = await db.customer.count({
      where: {
        createdAt: {
          gte: thisMonth
        }
      }
    });

    // Calculate average order value
    const totalRevenue = Number(revenueResult._sum.total) || 0;
    const totalOrders = Number(ordersResult._count.id) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // For growth calculations, get previous period data
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(previousStartDate.getTime() - periodLength);
    previousEndDate.setTime(previousEndDate.getTime() - periodLength);

    const previousRevenue = await db.order.aggregate({
      where: {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate
        },
        status: 'DELIVERED',
        ...customerFilter
      },
      _sum: {
        total: true
      }
    });

    const previousOrders = await db.order.aggregate({
      where: {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate
        },
        ...customerFilter
      },
      _count: {
        id: true
      }
    });

    // Calculate growth percentages

    const previousTotalRevenue = Number(previousRevenue._sum.total) || 0;
    const revenueGrowth = previousTotalRevenue
      ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
      : 0;

    const orderGrowth = previousOrders._count.id 
      ? ((totalOrders - previousOrders._count.id) / previousOrders._count.id) * 100
      : 0;

    // Mock some additional metrics (would be calculated from real data)
    const customerRetentionRate = 75.5; // Would calculate from actual customer behavior
    const orderFulfillmentRate = 94.2; // Would calculate from order statuses

    const metrics = {
      totalRevenue,
      totalOrders,
      activeCustomers: activeCustomersResult.length,
      lowStockProducts,
      outOfStockProducts,
      dailyOrders,
      monthlyRevenue: Number(monthlyRevenue._sum.total) || 0,
      monthlyNewCustomers: monthlyCustomers,
      averageOrderValue,
      revenueGrowth,
      orderGrowth,
      customerRetentionRate,
      orderFulfillmentRate
    };

    return c.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return c.json({ error: 'Failed to fetch dashboard metrics' }, 500);
  }
});

/**
 * GET /revenue-analytics
 * Get revenue analytics data for charts
 */
dashboardRouter.get('/revenue-analytics', zValidator('query', filtersSchema), async (c) => {
  try {
    const { 
      dateRange,
      customDateFrom,
      customDateTo 
    } = c.req.valid('query');

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customDateFrom) startDate = new Date(customDateFrom);
        if (customDateTo) endDate = new Date(customDateTo);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get daily revenue data using Prisma's raw query
    const revenueData = await db.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM(total) as revenue
      FROM "order" 
      WHERE "createdAt" >= ${startDate} 
        AND "createdAt" <= ${endDate}
        AND status = 'DELIVERED'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Format the results
    return c.json(
      Array.isArray(revenueData) 
        ? revenueData.map((item: any) => ({
            date: item.date.toISOString().split('T')[0],
            revenue: Number(item.revenue)
          }))
        : []
    );
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return c.json({ error: 'Failed to fetch revenue analytics' }, 500);
  }
});

/**
 * GET /top-products
 * Get top selling products
 */
dashboardRouter.get('/top-products', zValidator('query', topProductsSchema), async (c) => {
  try {
    const { 
      limit,
      dateRange,
      customDateFrom,
      customDateTo 
    } = c.req.valid('query');

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customDateFrom) startDate = new Date(customDateFrom);
        if (customDateTo) endDate = new Date(customDateTo);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get top products using Prisma's raw query
    const topProducts = await db.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi."unitPrice") as revenue
      FROM "product" p
      INNER JOIN "order_item" oi ON p.id = oi."productId"
      INNER JOIN "order" o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${startDate} 
        AND o."createdAt" <= ${endDate}
        AND o.status = 'DELIVERED'
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold DESC
      LIMIT ${limit}
    `;

    // Format the results
    return c.json(
      Array.isArray(topProducts) 
        ? topProducts.map((product: any) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            totalSold: Number(product.total_sold),
            revenue: Number(product.revenue)
          }))
        : []
    );
  } catch (error) {
    console.error('Error fetching top products:', error);
    return c.json({ error: 'Failed to fetch top products' }, 500);
  }
});

/**
 * GET /inventory-alerts
 * Get inventory alerts for low stock and out of stock products
 */
dashboardRouter.get('/inventory-alerts', async (c) => {
  try {
    const lowStockProducts = await db.product.findMany({
      where: {
        stockQuantity: {
          lte: 10
        }
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        category: true,
        minOrderQuantity: true
      }
    });

    const alerts = lowStockProducts.map(product => ({
      id: product.id,
      productId: product.id,
      productName: product.name,
      currentStock: product.stockQuantity,
      type: product.stockQuantity === 0 ? 'out_of_stock' : 'low_stock',
      severity: product.stockQuantity === 0 ? 'critical' : 
                product.stockQuantity <= 5 ? 'high' : 'medium',
      message: product.stockQuantity === 0 
        ? `${product.name} is out of stock`
        : `${product.name} has low stock (${product.stockQuantity} remaining)`,
      category: product.category,
      recommendedAction: product.stockQuantity === 0 
        ? `Restock immediately - minimum order: ${product.minOrderQuantity || 1}`
        : `Consider restocking soon - current: ${product.stockQuantity}, minimum: ${product.minOrderQuantity || 1}`,
      createdAt: new Date()
    }));

    return c.json(alerts);
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    return c.json({ error: 'Failed to fetch inventory alerts' }, 500);
  }
});

/**
 * GET /system-health
 * Get system health status
 */
dashboardRouter.get('/system-health', async (c) => {
  try {
    // Check database connection
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    const dbStart = Date.now();
    
    try {
      await db.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
      if (dbResponseTime > 1000) dbStatus = 'slow';
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    // Mock API health (would check actual API endpoints)
    const apiStatus = 'healthy';
    const apiResponseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms

    // Mock external services status (would check actual services)
    const flutterwaveStatus = 'healthy';
    const whatsappStatus = 'healthy';
    const smsStatus = 'healthy';

    const systemHealth = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        lastChecked: new Date()
      },
      api: {
        status: apiStatus,
        responseTime: apiResponseTime,
        lastChecked: new Date()
      },
      payments: {
        flutterwave: flutterwaveStatus,
        lastChecked: new Date()
      },
      notifications: {
        whatsapp: whatsappStatus,
        sms: smsStatus,
        lastChecked: new Date()
      },
      lastUpdated: new Date()
    };

    return c.json(systemHealth);
  } catch (error) {
    console.error('Error checking system health:', error);
    return c.json({ error: 'Failed to check system health' }, 500);
  }
});

export { dashboardRouter };
