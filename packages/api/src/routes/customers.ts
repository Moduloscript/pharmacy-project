import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { 
  createCustomerProfile, 
  updateCustomerVerificationStatus,
  getCustomersByVerificationStatus,
  userNeedsCustomerProfile 
} from '@repo/auth/lib/user';
import { CustomerType, BusinessVerificationStatus } from '@prisma/client';
import type { AppBindings } from '../types/context';

const customersRouter = new Hono<AppBindings>();

// Validation schemas
const createCustomerProfileSchema = z.object({
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'PHARMACY', 'CLINIC']),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
  // Personal address (for retail customers)
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  // Business information (for business customers)
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  pharmacyLicense: z.string().optional(),
  taxId: z.string().optional(),
  establishedYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  description: z.string().optional(),
  verificationDocuments: z.array(z.string()).optional(),
});

const updateVerificationSchema = z.object({
  customerId: z.string(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']),
  creditLimit: z.number().positive().optional(),
});

// POST /api/customers/profile - Create customer profile after signup
customersRouter.post('/profile', authMiddleware, zValidator('json', createCustomerProfileSchema), async (c) => {
  try {
    const user = c.get('user');
    const data = c.req.valid('json');
    
    if (!user?.id) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    // Check if customer profile already exists
    const needsProfile = await userNeedsCustomerProfile(user.id);
    if (!needsProfile) {
      return c.json({ error: 'Customer profile already exists' }, 400);
    }

    // Validate business fields for business customers
    if (data.customerType !== 'RETAIL') {
      if (!data.businessName || !data.businessAddress || !data.businessPhone) {
        return c.json({ 
          error: 'Business name, address, and phone are required for business customers' 
        }, 400);
      }

      // Pharmacy license required for pharmacy customers
      if (data.customerType === 'PHARMACY' && !data.pharmacyLicense) {
        return c.json({ 
          error: 'Pharmacy license number is required for pharmacy customers' 
        }, 400);
      }
    } else {
      // Personal address required for retail customers
      if (!data.address || !data.state || !data.lga) {
        return c.json({ 
          error: 'Personal address, state, and LGA are required for retail customers' 
        }, 400);
      }
    }

    // Create customer profile
    const result = await createCustomerProfile({
      userId: user.id,
      ...data,
    });

    if (result.error) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({ 
      message: 'Customer profile created successfully',
      customer: result.customer 
    }, 201);

  } catch (error) {
    console.error('Error creating customer profile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/customers/profile - Get current user's customer profile
customersRouter.get('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    if (!user?.id) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const needsProfile = await userNeedsCustomerProfile(user.id);

    // Include customerType and verificationStatus if profile exists
    let customerType: string | null = null;
    let verificationStatus: string | null = null;
    try {
      const { db } = await import('@repo/database');
      const customer = await db.customer.findUnique({
        where: { userId: user.id },
        select: { customerType: true, verificationStatus: true },
      });
      customerType = customer?.customerType ?? null;
      verificationStatus = customer?.verificationStatus ?? null;
    } catch (e) {
      // If database import or query fails, fall back to minimal response; do not crash the request.
    }
    
    return c.json({ 
      needsProfile,
      customerType,
      verificationStatus,
      message: needsProfile ? 'Customer profile required' : 'Customer profile exists'
    });

  } catch (error) {
    console.error('Error checking customer profile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /api/customers/verification - Update customer verification status (Admin only)
customersRouter.put('/verification', authMiddleware, zValidator('json', updateVerificationSchema), async (c) => {
  try {
    const user = c.get('user');
    const { customerId, status, creditLimit } = c.req.valid('json');
    
    if (user?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const result = await updateCustomerVerificationStatus(
      customerId, 
      status as BusinessVerificationStatus,
      creditLimit
    );

    if (result.error) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({ 
      message: 'Customer verification status updated successfully',
      customer: result.customer 
    });

  } catch (error) {
    console.error('Error updating customer verification:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/customers/pending-verification - Get customers pending verification (Admin only)
customersRouter.get('/pending-verification', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    if (user?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const customers = await getCustomersByVerificationStatus(BusinessVerificationStatus.PENDING);

    return c.json({ 
      customers,
      count: customers.length 
    });

  } catch (error) {
    console.error('Error fetching pending customers:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/customers/verification-stats - Get verification statistics (Admin only)
customersRouter.get('/verification-stats', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    if (user?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const [pending, verified, rejected] = await Promise.all([
      getCustomersByVerificationStatus(BusinessVerificationStatus.PENDING),
      getCustomersByVerificationStatus(BusinessVerificationStatus.VERIFIED),
      getCustomersByVerificationStatus(BusinessVerificationStatus.REJECTED),
    ]);

    return c.json({ 
      stats: {
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
        total: pending.length + verified.length + rejected.length
      }
    });

  } catch (error) {
    console.error('Error fetching verification stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { customersRouter };
