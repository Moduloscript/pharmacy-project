import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';
import { getSignedUrl } from '@repo/storage';
import { config } from '@repo/config';

import type { AppBindings } from '../../types/context';
const customersRouter = new Hono<AppBindings>();

// Apply auth middleware to all routes
customersRouter.use('*', authMiddleware);

// Admin-only middleware
customersRouter.use('*', async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  await next();
});

// Query validation schemas
const customersQuerySchema = z.object({
  type: z.enum(['all', 'retail', 'wholesale', 'pharmacy', 'clinic']).default('all'),
  verificationStatus: z.enum(['all', 'pending', 'verified', 'rejected', 'expired']).default('all'),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
  search: z.string().optional(),
});

const updateVerificationSchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']),
  creditLimit: z.number().positive().optional(),
  rejectionReason: z.string().optional(),
});

/**
 * GET /admin/customers
 * Get all customers for admin management
 */
customersRouter.get('/', zValidator('query', customersQuerySchema), async (c) => {
  try {
    const { type, verificationStatus, page, limit, search } = c.req.valid('query');
    
    // Build where clause
    const where: any = {};
    
    if (type !== 'all') {
      where.customerType = type.toUpperCase();
    }
    
    if (verificationStatus !== 'all') {
      where.verificationStatus = verificationStatus.toUpperCase();
    }
    
    // Add search functionality
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { phone: { contains: search } },
        { businessPhone: { contains: search } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalCount = await db.customer.count({ where });
    
    // Get customers with user data
    const customers = await db.customer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    });
    
    // Format customers for frontend
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      userId: customer.userId,
      userName: customer.user.name,
      userEmail: customer.user.email,
      emailVerified: customer.user.emailVerified,
      type: customer.customerType,
      phone: customer.phone,
      // Personal information
      address: customer.address,
      city: customer.city,
      state: customer.state,
      lga: customer.lga,
      // Business information
      businessName: customer.businessName,
      businessAddress: customer.businessAddress,
      businessPhone: customer.businessPhone,
      businessEmail: customer.businessEmail,
      pharmacyLicense: customer.pharmacyLicense,
      taxId: customer.taxId,
      establishedYear: customer.establishedYear,
      description: customer.description,
      // Verification details
      verificationStatus: customer.verificationStatus,
      verificationDocuments: customer.verificationDocuments,
      rejectionReason: (customer as any).rejectionReason ?? null,
      verifiedAt: (customer as any).verifiedAt?.toISOString() || null,
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      // Timestamps
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      userCreatedAt: customer.user.createdAt.toISOString(),
    }));
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    
    return c.json({
      customers: formattedCustomers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

/**
 * GET /admin/customers/:id
 * Get single customer details
 */
customersRouter.get('/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        user: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Last 10 orders
        }
      },
    });
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    return c.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

/**
 * PUT /admin/customers/:id/verification
 * Update customer verification status
 */
customersRouter.put('/:id/verification', zValidator('json', updateVerificationSchema), async (c) => {
  try {
    const customerId = c.req.param('id');
    const { status, creditLimit, rejectionReason } = c.req.valid('json');
    
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    // Prepare update data
    const updateData: any = {
      verificationStatus: status,
    };
    
    if (status === 'VERIFIED') {
      updateData.verifiedAt = new Date();
      updateData.rejectionReason = null;
      if (creditLimit) {
        updateData.creditLimit = creditLimit;
      }
    } else if (status === 'REJECTED') {
      updateData.verifiedAt = null;
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
    } else {
      // PENDING or EXPIRED
      updateData.verifiedAt = null;
      updateData.rejectionReason = null;
    }
    
    const updatedCustomer = await db.customer.update({
      where: { id: customerId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    });
    
    return c.json({
      message: 'Customer verification status updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Error updating customer verification:', error);
    return c.json({ error: 'Failed to update customer verification' }, 500);
  }
});

/**
 * GET /admin/customers/stats
 * Get customer statistics for dashboard
 */
// GET /admin/customers/:id/documents - Get signed preview URLs for verification documents
customersRouter.get('/:id/documents', async (c) => {
  try {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const customerId = c.req.param('id');
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    const keys: string[] = Array.isArray((customer as any).verificationDocuments)
      ? ((customer as any).verificationDocuments as string[])
      : [];

    const bucket = config.storage.bucketNames.documents;

    const documents = await Promise.all(
      keys.map(async (key) => {
        try {
          const signedUrl = await getSignedUrl(key, { bucket, expiresIn: 60 * 60 });
          return { key, signedUrl };
        } catch {
          return { key, signedUrl: null };
        }
      }),
    );

    return c.json({ documents });
  } catch (error) {
    console.error('Error fetching customer documents:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

customersRouter.get('/stats', async (c) => {
  try {
    // Get total customers
    const totalCustomers = await db.customer.count();
    
    // Get customers by type
    const customersByType = await db.customer.groupBy({
      by: ['customerType'],
      _count: {
        id: true
      }
    });
    
    // Get customers by verification status
    const customersByStatus = await db.customer.groupBy({
      by: ['verificationStatus'],
      _count: {
        id: true
      }
    });
    
    // Get new customers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = await db.customer.count({
      where: {
        createdAt: {
          gte: thisMonth
        }
      }
    });
    
    // Format type stats
    const typeStats = customersByType.reduce((acc, item) => {
      acc[item.customerType.toLowerCase()] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Format status stats  
    const statusStats = customersByStatus.reduce((acc, item) => {
      acc[item.verificationStatus.toLowerCase()] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    const stats = {
      totalCustomers,
      newCustomersThisMonth,
      customersByType: {
        retail: typeStats.retail || 0,
        wholesale: typeStats.wholesale || 0,
        pharmacy: typeStats.pharmacy || 0,
        clinic: typeStats.clinic || 0,
      },
      customersByStatus: {
        pending: statusStats.pending || 0,
        verified: statusStats.verified || 0,
        rejected: statusStats.rejected || 0,
        expired: statusStats.expired || 0,
      }
    };
    
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return c.json({ error: 'Failed to fetch customer statistics' }, 500);
  }
});

export { customersRouter };
