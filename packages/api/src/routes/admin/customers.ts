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
            banned: true,
          }
        },
        orders: {
          select: {
            total: true,
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
    const formattedCustomers = customers.map(customer => {
      // Calculate derived stats
      const totalOrders = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
      
      // Find the most recent order date
      let lastOrderDate: string | null = null;
      if (customer.orders.length > 0) {
        // Sort explicitly to be safe or Math.max
        const timestamps = customer.orders.map(o => o.createdAt.getTime());
        lastOrderDate = new Date(Math.max(...timestamps)).toISOString();
      }

      return {
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

        // Verification details
        verificationStatus: customer.verificationStatus,
        isActive: !customer.user.banned,
        verificationDocuments: customer.verificationDocuments,
        rejectionReason: (customer as any).rejectionReason ?? null,
        verifiedAt: (customer as any).verifiedAt?.toISOString() || null,
        creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
        
        // Calculated Stats
        totalOrders,
        totalSpent,
        lastOrderDate,

        // Timestamps
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        userCreatedAt: customer.user.createdAt.toISOString(),
      };
    });
    
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
    
    // Format customer data
    const totalOrders = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    
    // Find the most recent order date
    let lastOrderDate: string | null = null;
    if (customer.orders.length > 0) {
      const timestamps = customer.orders.map(o => o.createdAt.getTime());
      lastOrderDate = new Date(Math.max(...timestamps)).toISOString();
    }

    const formattedCustomer = {
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

      // Verification details
      verificationStatus: customer.verificationStatus,
      isActive: !customer.user.banned,
      verificationDocuments: customer.verificationDocuments,
      rejectionReason: (customer as any).rejectionReason ?? null,
      verifiedAt: (customer as any).verifiedAt?.toISOString() || null,
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      
      // Calculated Stats
      totalOrders,
      totalSpent,
      lastOrderDate,

      // Timestamps
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      userCreatedAt: customer.user.createdAt.toISOString(),
    };
    
    return c.json(formattedCustomer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['RETAIL', 'WHOLESALE', 'PHARMACY', 'CLINIC']).optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /admin/customers/:id
 * Update customer details
 */
customersRouter.put('/:id', zValidator('json', updateCustomerSchema), async (c) => {
  try {
    const customerId = c.req.param('id');
    const data = c.req.valid('json');
    
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    // Process updates using transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // 1. Update User fields if provided
      if (data.name || data.email || data.isActive !== undefined) {
        const userUpdateData: any = {};
        if (data.name) userUpdateData.name = data.name;
        if (data.email) userUpdateData.email = data.email;
        if (data.isActive !== undefined) userUpdateData.banned = !data.isActive;

        await tx.user.update({
          where: { id: customer.userId },
          data: userUpdateData
        });
      }

      // 2. Update Customer fields
      const customerUpdateData: any = {};
      if (data.phone) customerUpdateData.phone = data.phone;
      if (data.type) customerUpdateData.customerType = data.type;
      if (data.businessName !== undefined) customerUpdateData.businessName = data.businessName;
      if (data.businessAddress !== undefined) customerUpdateData.businessAddress = data.businessAddress;
      if (data.state !== undefined) customerUpdateData.state = data.state;
      if (data.lga !== undefined) customerUpdateData.lga = data.lga;
      if (data.licenseNumber !== undefined) customerUpdateData.pharmacyLicense = data.licenseNumber;
      if (data.taxId !== undefined) customerUpdateData.taxId = data.taxId;
      // isActive is NOT on the Customer table, removing to fix error. 
      // If needed, check User table or schema later.
      
      // Note: isActive is often on User table in some systems, but based on Customer Detail View it was pulled from data.isActive
      // Let's check where it came from in GET.
      // In GET: `isActive: data.isActive !== false` (customer doesn't have isActive?)
      // Wait, db.customer.findMany... includes... user. 
      // The GET helper `formattedCustomer` implies `isAuthenticated`? No.
      // Let's check schema via logic. GET doesn't show `isActive` on customer or user in select. 
      // It creates `isActive: data.isActive !== false` from... `data` is `response.json()`.
      // In GET handler, `formattedCustomers` doesn't strictly have `isActive` property mapped from DB!
      // Looking at `formattedCustomers` return (line 118...): it DOES NOT include `isActive`.
      // Yet `fetchCustomer` in frontend uses `isActive: data.isActive !== false`. 
      // This implies `data.isActive` might be missing and defaults to true?
      // Or maybe I missed it in the file view.
      
      // Checking `formattedCustomer` in GET /:id (lines 220-257): NONE OF THEM HAVE `isActive`.
      // So the frontend `fetchCustomer` (line 100) `isActive: data.isActive !== false`
      // receives `undefined` and defaults to `true`.
      
      // Meaning: THERE IS NO `isActive` field currently exposed in the GET API.
      // Only `verificationStatus`.
      
      // If I want to support deactivating customers, I should check if `User` or `Customer` has `isActive` or `banned`.
      // Since I don't have schema access, I will SKIP `isActive` update in DB for now to avoid breaking if field doesn't exist.
      // Or I can leave it out. The frontend handles it.
      
      return await tx.customer.update({
        where: { id: customerId },
        data: customerUpdateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });
    });
    
    return c.json({
      message: 'Customer updated successfully',
      customer: result
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return c.json({ error: 'Failed to update customer' }, 500);
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
