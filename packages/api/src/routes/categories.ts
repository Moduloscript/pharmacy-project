import { db } from "@repo/database";
import { authMiddleware } from "../middleware/auth";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { AppBindings } from '../types/context';
const categoriesRouter = new Hono<AppBindings>();

// Nigerian pharmacy-specific product categories
const PHARMACY_CATEGORIES = [
  'Analgesics & Pain Relief',
  'Antibiotics',
  'Antifungals',
  'Antivirals',
  'Cardiovascular',
  'Dermatology',
  'Diabetes Care',
  'Digestive Health',
  'First Aid',
  'Herbal Medicine',
  'Hypertension',
  'Immunizations',
  'Malaria Treatment',
  'Maternal Health',
  'Mental Health',
  'Nutritional Supplements',
  'Ophthalmology',
  'Oral Care',
  'Pediatrics',
  'Prescription Drugs',
  'Respiratory',
  'Sexual Health',
  'Skin Care',
  'Vitamins & Minerals',
  'Women\'s Health'
];

// Get all categories
categoriesRouter.get('/', async (c) => {
  try {
    // Get categories from database with product counts
    const categoriesWithCounts = await db.product.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      orderBy: {
        category: 'asc'
      }
    });

    // Format the response
    const categories = categoriesWithCounts.map(item => ({
      name: item.category,
      count: item._count.category
    }));

    return c.json({ 
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// Get predefined pharmacy categories (for UI dropdowns)
categoriesRouter.get('/predefined', async (c) => {
  try {
    return c.json({ 
      categories: PHARMACY_CATEGORIES,
      total: PHARMACY_CATEGORIES.length
    });
  } catch (error) {
    console.error('Error fetching predefined categories:', error);
    return c.json({ error: 'Failed to fetch predefined categories' }, 500);
  }
});

// Get products by category
categoriesRouter.get('/:categoryName/products', zValidator('query', z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
  sort: z.enum(['name', 'price_low', 'price_high', 'stock', 'newest']).default('name')
})), async (c) => {
  const categoryName = decodeURIComponent(c.req.param('categoryName'));
  const { page, limit, sort } = c.req.valid('query');

  try {
    const skip = (page - 1) * limit;
    
    // Determine sort order
    let orderBy: any = { name: 'asc' };
    switch (sort) {
      case 'price_low':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price_high':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'stock':
        orderBy = { stockQuantity: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where: {
          category: {
            equals: categoryName as any
          }
        },
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          genericName: true,
          brandName: true,
          category: true,
          description: true,
          imageUrl: true,
          wholesalePrice: true,
          retailPrice: true,
          stockQuantity: true,
          minOrderQuantity: true,
          isPrescriptionRequired: true,
          nafdacNumber: true,
          createdAt: true
        }
      }),
      db.product.count({
        where: {
          category: {
            equals: categoryName as any,
          }
        }
      })
    ]);

    return c.json({
      category: categoryName,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return c.json({ error: 'Failed to fetch products by category' }, 500);
  }
});

// Get category statistics (admin only)
categoriesRouter.get('/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const stats = await db.product.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      _sum: {
        stockQuantity: true
      },
      _avg: {
        retailPrice: true,
        wholesalePrice: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    const categoryStats = stats.map(stat => ({
      category: stat.category,
      total_products: (stat._count as any)?.category ?? 0,
      total_stock: (stat._sum as any)?.stockQuantity || 0,
      avg_retail_price: Math.round((Number((stat._avg as any)?.retailPrice) || 0) * 100) / 100,
      avg_wholesale_price: Math.round((Number((stat._avg as any)?.wholesalePrice) || 0) * 100) / 100
    }));

    return c.json({
      stats: categoryStats,
      total_categories: categoryStats.length
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    return c.json({ error: 'Failed to fetch category statistics' }, 500);
  }
});

export { categoriesRouter };
