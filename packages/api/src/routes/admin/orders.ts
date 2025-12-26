import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@repo/database';
import { authMiddleware } from '../../middleware/auth';

import type { AppBindings } from '../../types/context';
const ordersRouter = new Hono<AppBindings>();

// Apply auth middleware to all routes
ordersRouter.use('*', authMiddleware);

// Admin-only middleware
ordersRouter.use('*', async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  await next();
});

// Query validation schemas
const ordersQuerySchema = z.object({
  status: z.enum(['all', 'received', 'processing', 'ready', 'dispatched', 'delivered', 'cancelled']).default('all'),
  customerType: z.enum(['all', 'retail', 'wholesale', 'pharmacy', 'clinic']).default('all'),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
});

const updateStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
});

const updateNotesSchema = z.object({
  internalNotes: z.string(),
});

/**
 * GET /admin/orders
 * Get all orders for admin management
 */
ordersRouter.get('/', zValidator('query', ordersQuerySchema), async (c) => {
  try {
    const { status, customerType, page, limit } = c.req.valid('query');
    
    // Build where clause
    const where: any = {};
    
    if (status !== 'all') {
      where.status = status.toUpperCase();
    }
    
    if (customerType !== 'all') {
      where.customer = {
        customerType: customerType.toUpperCase()
      };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get orders with customer and items data
    const orders = await db.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            phone: true,
            customerType: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                category: true,
                isPrescriptionRequired: true,
                isControlled: true,
              }
            }
          }
        },
        prescriptions: {
          select: { id: true, status: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    });
    
    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      requiresPrescription: order.orderItems.some(oi => (oi.product as any)?.isPrescriptionRequired || (oi.product as any)?.isControlled),
      prescriptionStatus: order.prescriptions?.[0]?.status ?? null,
      customer: {
        id: order.customer.id,
        name: order.customer.user.name,
        email: order.customer.user.email,
        phone: order.customer.phone,
        type: order.customer.customerType,
      },
      items: order.orderItems.map(item => ({
        id: item.id,
        product: {
          name: item.product.name,
          category: item.product.category,
          isPrescriptionRequired: (item.product as any)?.isPrescriptionRequired ?? false,
          isControlled: (item.product as any)?.isControlled ?? false,
        },
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.subtotal),
      })),
      totalAmount: Number(order.total),
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress,
      deliveryFee: Number(order.deliveryFee),
      state: order.deliveryState,
      lga: order.deliveryLGA,
      notes: order.internalNotes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }));
    
    return c.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

/**
 * GET /admin/orders/:id
 * Get single order details
 */
ordersRouter.get('/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true
          }
        },
        payments: true,
      },
    });
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    return c.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

/**
 * PUT /admin/orders/:id/status
 * Update order status
 */
ordersRouter.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  try {
    const orderId = c.req.param('id');
    const { status } = c.req.valid('json');
    
    const order = await db.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    // Validate status transition - allow admins full control except for terminal states
    type OrderStatus = 'RECEIVED' | 'PROCESSING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    
    const currentStatus = order.status as OrderStatus;
    const newStatus = status as OrderStatus;
    
    // Define terminal states that cannot be changed once reached
    const terminalStates: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
    
    // Define valid non-terminal statuses that admins can set
    const allowedStatuses: OrderStatus[] = ['RECEIVED', 'PROCESSING', 'READY', 'DISPATCHED'];
    
    console.log('Debug Order Status Update:', { 
      orderId, 
      currentStatus, 
      newStatus,
      isTerminalState: terminalStates.includes(currentStatus),
      isAllowedStatus: allowedStatuses.includes(newStatus)
    });

    // Prevent changing from terminal states (finalized orders cannot be reopened easily)
    if (terminalStates.includes(currentStatus)) {
      return c.json({ 
        error: `Cannot change status from ${currentStatus}. This is a final state.` 
      }, 400);
    }

    // Allow admins to set any valid status, including moving backwards (e.g. READY -> PROCESSING)
    // The only restriction is handled above: cannot move OUT of a terminal state.
    // And logically, we should check if newStatus is valid Enum value, which Zod already did.
    
    // Optional: add specific business rules if needed, e.g. cannot go from RECEIVED -> DELIVERED directly?
    // For now, allow maximum flexibility for admins to fix mistakes.
    
    // 1. Update the order status (without includes to avoid potential Prisma issues)
    await db.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // 2. Fetch the updated order with all necessary relations
    const updatedOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            phone: true,
            customerType: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                category: true,
              }
            }
          }
        }
      },
    });

    if (!updatedOrder) {
      return c.json({ error: 'Failed to retrieve updated order' }, 500);
    }
    // Enqueue delivery status update notification (non-blocking)
    try {
      const { enhancedNotificationService } = await import('@repo/mail');
      await enhancedNotificationService.sendDeliveryUpdate({
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        customerId: updatedOrder.customer.id,
        status: updatedOrder.status,
      });
    } catch (notifyErr) {
      console.warn('Order status updated but failed to queue notification:', notifyErr);
    }
    
    return c.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    return c.json({ error: 'Failed to update order status' }, 500);
  }
});

/**
 * PUT /admin/orders/:id/notes
 * Update order internal notes
 */
ordersRouter.put('/:id/notes', zValidator('json', updateNotesSchema), async (c) => {
  try {
    const orderId = c.req.param('id');
    const { internalNotes } = c.req.valid('json');
    
    const order = await db.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        internalNotes,
        updatedAt: new Date(),
      },
    });
    
    return c.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order notes:', error);
    return c.json({ error: 'Failed to update order notes' }, 500);
  }
});

/**
 * GET /admin/orders/stats
 * Get order statistics for dashboard
 */
ordersRouter.get('/stats', async (c) => {
  try {
    // Get date ranges for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Total orders
    const totalOrders = await db.order.count();
    
    // Today's orders
    const todayOrders = await db.order.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });
    
    // This month orders
    const thisMonthOrders = await db.order.count({
      where: {
        createdAt: {
          gte: thisMonth
        }
      }
    });
    
    // Last month orders for growth calculation
    const lastMonthOrders = await db.order.count({
      where: {
        createdAt: {
          gte: lastMonth,
          lt: thisMonth
        }
      }
    });
    
    // Order growth percentage
    const orderGrowth = lastMonthOrders > 0 
      ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
      : 0;
    
    // Orders by status
    const ordersByStatus = await db.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    const statusStats = ordersByStatus.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    const stats = {
      totalOrders,
      dailyOrders: todayOrders,
      monthlyOrders: thisMonthOrders,
      orderGrowth,
      ordersByStatus: statusStats,
      pendingOrders: statusStats.received || 0,
      processingOrders: statusStats.processing || 0,
      readyOrders: statusStats.ready || 0,
      dispatchedOrders: statusStats.dispatched || 0,
      deliveredOrders: statusStats.delivered || 0,
      cancelledOrders: statusStats.cancelled || 0,
    };
    
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return c.json({ error: 'Failed to fetch order statistics' }, 500);
  }
});

export { ordersRouter };
