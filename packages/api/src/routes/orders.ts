import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '@repo/database'
import { getSession } from '@repo/auth/lib/server'
import { createMiddleware } from 'hono/factory'
import { nanoid } from 'nanoid'

const app = new Hono()

// Authentication middleware
const authMiddleware = createMiddleware(async (c, next) => {
  const session = await getSession()
  
  if (!session) {
    return c.json({ 
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
    }, 401)
  }
  
  c.set('session', session)
  c.set('user', session.user)
  
  await next()
})

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// Order creation schema
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0)
  })).min(1),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().min(1),
  deliveryState: z.string().min(1),
  deliveryLGA: z.string().optional(),
  deliveryPhone: z.string().min(10),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['FLUTTERWAVE', 'OPAY', 'PAYSTACK', 'CREDIT']).optional(),
  purchaseOrderNumber: z.string().optional() // For wholesale customers
})

const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional()
})

// Order status transitions (admin can override but these are the recommended flows)
const statusTransitions: Record<string, string[]> = {
  'RECEIVED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['READY', 'CANCELLED'],
  'READY': ['DISPATCHED', 'CANCELLED'],
  'DISPATCHED': ['DELIVERED'],
  'DELIVERED': [], // Final state
  'CANCELLED': [] // Final state
}

// Get orders for current customer
app.get('/', async (c) => {
  const user = c.get('user')
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 10
  const status = c.req.query('status') // Filter by status
  
  try {
    // Get customer profile
    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    })
    
    if (!customer) {
      return c.json({
        success: false,
        error: { 
          code: 'CUSTOMER_NOT_FOUND', 
          message: 'Customer profile not found' 
        }
      }, 404)
    }
    
    // Build where clause
    const whereClause: any = {
      customerId: customer.id
    }
    
    if (status) {
      whereClause.status = status.toUpperCase()
    }
    
    // Get orders with pagination
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brandName: true,
                  genericName: true,
                  images: true,
                  nafdacNumber: true
                }
              }
            }
          },
          orderTracking: {
            orderBy: {
              timestamp: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.order.count({ where: whereClause })
    ])
    
    return c.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          deliveryFee: Number(order.deliveryFee),
          discount: Number(order.discount),
          deliveryMethod: order.deliveryMethod,
          deliveryAddress: order.deliveryAddress,
          deliveryCity: order.deliveryCity,
          deliveryState: order.deliveryState,
          deliveryLGA: order.deliveryLGA,
          deliveryPhone: order.deliveryPhone,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          estimatedDelivery: order.estimatedDelivery,
          actualDelivery: order.actualDelivery,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.orderItems.map(item => ({
            id: item.id,
            productId: item.productId,
            product: {
              id: item.product.id,
              name: item.product.name,
              brandName: item.product.brandName,
              genericName: item.product.genericName,
              images: item.product.images ? JSON.parse(item.product.images) : [],
              nafdacNumber: item.product.nafdacNumber
            },
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
            productName: item.productName,
            productSKU: item.productSKU
          })),
          tracking: order.orderTracking.map(track => ({
            id: track.id,
            status: track.status,
            notes: track.notes,
            timestamp: track.timestamp,
            updatedBy: track.updatedBy
          }))
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return c.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch orders' 
      }
    }, 500)
  }
})

// Get specific order by ID
app.get('/:orderId', async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('orderId')
  
  try {
    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    })
    
    if (!customer) {
      return c.json({
        success: false,
        error: { 
          code: 'CUSTOMER_NOT_FOUND', 
          message: 'Customer profile not found' 
        }
      }, 404)
    }
    
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id
      },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        orderItems: {
          include: {
            product: true
          }
        },
        orderTracking: {
          orderBy: {
            timestamp: 'desc'
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!order) {
      return c.json({
        success: false,
        error: { 
          code: 'ORDER_NOT_FOUND', 
          message: 'Order not found' 
        }
      }, 404)
    }
    
    return c.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          deliveryFee: Number(order.deliveryFee),
          discount: Number(order.discount),
          tax: Number(order.tax),
          deliveryMethod: order.deliveryMethod,
          deliveryAddress: order.deliveryAddress,
          deliveryCity: order.deliveryCity,
          deliveryState: order.deliveryState,
          deliveryLGA: order.deliveryLGA,
          deliveryPhone: order.deliveryPhone,
          deliveryNotes: order.deliveryNotes,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          paymentReference: order.paymentReference,
          purchaseOrderNumber: order.purchaseOrderNumber,
          creditTerms: order.creditTerms,
          estimatedDelivery: order.estimatedDelivery,
          actualDelivery: order.actualDelivery,
          internalNotes: order.internalNotes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customer: {
            id: order.customer.id,
            businessName: order.customer.businessName,
            contactName: order.customer.user.name,
            email: order.customer.user.email,
            phone: order.customer.phone
          },
          items: order.orderItems.map(item => ({
            id: item.id,
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
            productName: item.productName,
            productSKU: item.productSKU,
            productDescription: item.productDescription
          })),
          tracking: order.orderTracking.map(track => ({
            id: track.id,
            status: track.status,
            notes: track.notes,
            timestamp: track.timestamp,
            updatedBy: track.updatedBy
          })),
          payments: order.payments.map(payment => ({
            id: payment.id,
            amount: Number(payment.amount),
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            gatewayReference: payment.gatewayReference,
            transactionId: payment.transactionId,
            createdAt: payment.createdAt,
            completedAt: payment.completedAt
          }))
        }
      }
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return c.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch order' 
      }
    }, 500)
  }
})

// Create new order from cart
app.post('/', zValidator('json', createOrderSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')
  
  try {
    // Get customer profile
    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    })
    
    if (!customer) {
      return c.json({
        success: false,
        error: { 
          code: 'CUSTOMER_NOT_FOUND', 
          message: 'Customer profile not found' 
        }
      }, 404)
    }
    
    // Validate all products exist and have sufficient stock
    const productIds = data.items.map(item => item.productId)
    const products = await db.product.findMany({
      where: {
        id: { in: productIds }
      }
    })
    
    if (products.length !== productIds.length) {
      return c.json({
        success: false,
        error: { 
          code: 'PRODUCT_NOT_FOUND', 
          message: 'One or more products not found' 
        }
      }, 400)
    }
    
    // Check stock availability
    const stockErrors: string[] = []
    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)
      if (product && product.stockQuantity < item.quantity) {
        stockErrors.push(`${product.name}: Only ${product.stockQuantity} available`)
      }
    }
    
    if (stockErrors.length > 0) {
      return c.json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_STOCK', 
          message: 'Insufficient stock for some items',
          details: stockErrors
        }
      }, 400)
    }
    
    // Calculate order totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const deliveryFee = data.deliveryMethod === 'EXPRESS' ? 1000 : 
                        data.deliveryMethod === 'STANDARD' ? 500 : 0
    const discount = 0 // TODO: Apply discounts based on customer type/loyalty
    const tax = 0 // TODO: Calculate tax if applicable
    const total = subtotal + deliveryFee - discount + tax
    
    // Generate order number
    const orderNumber = `BP${Date.now().toString().slice(-8)}${nanoid(4).toUpperCase()}`
    
    // Calculate estimated delivery date
    const estimatedDelivery = new Date()
    if (data.deliveryMethod === 'EXPRESS') {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 1)
    } else if (data.deliveryMethod === 'STANDARD') {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)
    }
    
    // Create order with transaction
    const order = await db.$transaction(async (prisma) => {
      // Create the order
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: 'RECEIVED',
          deliveryMethod: data.deliveryMethod,
          deliveryAddress: data.deliveryAddress,
          deliveryCity: data.deliveryCity,
          deliveryState: data.deliveryState,
          deliveryLGA: data.deliveryLGA,
          deliveryPhone: data.deliveryPhone,
          deliveryNotes: data.deliveryNotes,
          subtotal,
          deliveryFee,
          discount,
          tax,
          total,
          paymentStatus: 'PENDING',
          paymentMethod: data.paymentMethod,
          purchaseOrderNumber: data.purchaseOrderNumber,
          creditTerms: data.paymentMethod === 'CREDIT' && customer.customerType !== 'RETAIL',
          estimatedDelivery: data.deliveryMethod !== 'PICKUP' ? estimatedDelivery : null
        }
      })
      
      // Create order items
      const orderItems = await Promise.all(
        data.items.map(async (item) => {
          const product = products.find(p => p.id === item.productId)!
          
          return prisma.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              productName: product.name,
              productSKU: product.sku,
              productDescription: product.description
            }
          })
        })
      )
      
      // Create initial order tracking entry
      await prisma.orderTracking.create({
        data: {
          orderId: newOrder.id,
          status: 'RECEIVED',
          notes: 'Order received and is being processed',
          updatedBy: user.id
        }
      })
      
      // Update product stock quantities
      await Promise.all(
        data.items.map(item => 
          prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          })
        )
      )
      
      // Clear cart items for this customer
      await prisma.cartItem.deleteMany({
        where: {
          customerId: customer.id,
          productId: { in: productIds }
        }
      })
      
      return {
        ...newOrder,
        orderItems
      }
    })
    
    return c.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          paymentStatus: order.paymentStatus,
          estimatedDelivery: order.estimatedDelivery
        },
        message: 'Order created successfully'
      }
    }, 201)
  } catch (error) {
    console.error('Error creating order:', error)
    return c.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to create order' 
      }
    }, 500)
  }
})

// Update order status (admin only - will be restricted by role in middleware later)
app.put('/:orderId/status', zValidator('json', updateOrderStatusSchema), async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('orderId')
  const data = c.req.valid('json')
  
  try {
    // Get current order
    const currentOrder = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })
    
    if (!currentOrder) {
      return c.json({
        success: false,
        error: { 
          code: 'ORDER_NOT_FOUND', 
          message: 'Order not found' 
        }
      }, 404)
    }
    
    // Check if status transition is valid
    const allowedTransitions = statusTransitions[currentOrder.status] || []
    if (!allowedTransitions.includes(data.status)) {
      return c.json({
        success: false,
        error: { 
          code: 'INVALID_STATUS_TRANSITION', 
          message: `Cannot change status from ${currentOrder.status} to ${data.status}` 
        }
      }, 400)
    }
    
    // Update order status and create tracking entry
    await db.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: data.status,
          actualDelivery: data.status === 'DELIVERED' ? new Date() : undefined
        }
      })
      
      await prisma.orderTracking.create({
        data: {
          orderId,
          status: data.status,
          notes: data.notes || `Order status updated to ${data.status}`,
          updatedBy: user.id
        }
      })
    })
    
    return c.json({
      success: true,
      data: {
        message: `Order status updated to ${data.status}`
      }
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return c.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to update order status' 
      }
    }, 500)
  }
})

// Cancel order (customer can cancel if not yet dispatched)
app.post('/:orderId/cancel', async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('orderId')
  
  try {
    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    })
    
    if (!customer) {
      return c.json({
        success: false,
        error: { 
          code: 'CUSTOMER_NOT_FOUND', 
          message: 'Customer profile not found' 
        }
      }, 404)
    }
    
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id
      },
      include: {
        orderItems: true
      }
    })
    
    if (!order) {
      return c.json({
        success: false,
        error: { 
          code: 'ORDER_NOT_FOUND', 
          message: 'Order not found' 
        }
      }, 404)
    }
    
    // Check if order can be cancelled
    if (!['RECEIVED', 'PROCESSING'].includes(order.status)) {
      return c.json({
        success: false,
        error: { 
          code: 'CANNOT_CANCEL', 
          message: 'Order cannot be cancelled at this stage' 
        }
      }, 400)
    }
    
    // Cancel order and restore stock
    await db.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })
      
      await prisma.orderTracking.create({
        data: {
          orderId,
          status: 'CANCELLED',
          notes: 'Order cancelled by customer',
          updatedBy: user.id
        }
      })
      
      // Restore product stock
      await Promise.all(
        order.orderItems.map(item => 
          prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity
              }
            }
          })
        )
      )
    })
    
    return c.json({
      success: true,
      data: {
        message: 'Order cancelled successfully'
      }
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return c.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to cancel order' 
      }
    }, 500)
  }
})

export { app as ordersRouter }
