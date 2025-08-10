import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '@repo/database'
import { getSession } from '@repo/auth/lib/server'
import { createMiddleware } from 'hono/factory'

const app = new Hono()

// Authentication middleware
const authMiddleware = createMiddleware(async (c, next) => {
  const session = await getSession()
  
  if (!session) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
  }
  
  c.set('session', session)
  c.set('user', session.user)
  
  await next()
})

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// Cart item schema
const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1).max(1000),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'PHARMACY', 'CLINIC']).optional()
})

const updateCartItemSchema = z.object({
  quantity: z.number().min(0).max(1000)
})

// Delivery options for Nigerian market
const deliveryOptionsSchema = z.object({
  type: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
  address: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  phoneNumber: z.string().optional()
})

// Get cart for current user
app.get('/', async (c) => {
  const user = c.get('user')
  
  try {
    // Get customer profile
    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    })
    
    if (!customer) {
      return c.json({ 
        error: { 
          code: 'CUSTOMER_NOT_FOUND', 
          message: 'Customer profile not found' 
        } 
      }, 404)
    }
    
    // Get cart items for customer
    const cartItems = await db.cartItem.findMany({
      where: {
        customerId: customer.id
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Calculate totals with Nigerian pricing
    const subtotal = cartItems.reduce((sum, item) => {
      const price = customer.customerType === 'RETAIL' 
        ? Number(item.product.retailPrice) 
        : Number(item.product.wholesalePrice || item.product.retailPrice)
      return sum + (price * item.quantity)
    }, 0)
    
    // Nigerian delivery fees (stored in customer for now)
    const deliveryFee = 500 // Standard delivery default
    const total = subtotal + deliveryFee
    
    return c.json({
      success: true,
      data: {
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.productId,
          product: {
            id: item.product.id,
            name: item.product.name,
            brandName: item.product.brandName,
            genericName: item.product.genericName,
            images: item.product.images ? JSON.parse(item.product.images) : [],
            wholesalePrice: Number(item.product.wholesalePrice || 0),
            retailPrice: Number(item.product.retailPrice),
            stockQuantity: item.product.stockQuantity,
            minOrderQuantity: item.product.minOrderQuantity,
            isPrescriptionRequired: item.product.isPrescriptionRequired,
            nafdacNumber: item.product.nafdacNumber,
            sku: item.product.sku
          },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * item.quantity
        })),
        summary: {
          subtotal,
          deliveryFee,
          total,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          uniqueItems: cartItems.length
        },
        customerInfo: {
          customerType: customer.customerType,
          deliveryAddress: customer.address,
          city: customer.city,
          state: customer.state,
          lga: customer.lga,
          phone: customer.phone
        }
      }
    })
  } catch (error) {
    console.error('Error fetching cart:', error)
    return c.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch cart' 
      } 
    }, 500)
  }
})

// Add item to cart
app.post('/items', zValidator('json', cartItemSchema), async (c) => {
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
    
    // Verify product exists and has stock
    const product = await db.product.findUnique({
      where: { id: data.productId }
    })
    
    if (!product) {
      return c.json({ 
        success: false,
        error: { 
          code: 'PRODUCT_NOT_FOUND', 
          message: 'Product not found' 
        } 
      }, 404)
    }
    
    if (product.stockQuantity < data.quantity) {
      return c.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_STOCK', 
          message: `Only ${product.stockQuantity} items available` 
        } 
      }, 400)
    }
    
    // Check minimum order quantity for wholesale
    if (customer.customerType !== 'RETAIL' && data.quantity < product.minOrderQuantity) {
      return c.json({ 
        success: false,
        error: { 
          code: 'MIN_ORDER_QTY', 
          message: `Minimum order quantity is ${product.minOrderQuantity}` 
        } 
      }, 400)
    }
    
    // Calculate unit price based on customer type
    const unitPrice = customer.customerType === 'RETAIL' 
      ? product.retailPrice 
      : (product.wholesalePrice || product.retailPrice)
    
    // Check if item already exists in cart
    const existingItem = await db.cartItem.findFirst({
      where: {
        customerId: customer.id,
        productId: data.productId
      }
    })
    
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + data.quantity
      
      if (product.stockQuantity < newQuantity) {
        return c.json({ 
          success: false,
          error: { 
            code: 'INSUFFICIENT_STOCK', 
            message: `Only ${product.stockQuantity} items available` 
          } 
        }, 400)
      }
      
      const updatedItem = await db.cartItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: newQuantity,
          unitPrice: unitPrice
        },
        include: { product: true }
      })
      
      return c.json({ 
        success: true,
        data: {
          cartItem: updatedItem,
          message: 'Cart updated successfully' 
        }
      })
    } else {
      // Add new item
      const cartItem = await db.cartItem.create({
        data: {
          customerId: customer.id,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: unitPrice
        },
        include: { product: true }
      })
      
      return c.json({ 
        success: true,
        data: {
          cartItem,
          message: 'Item added to cart' 
        }
      }, 201)
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    return c.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to add item to cart' 
      } 
    }, 500)
  }
})

// Update cart item quantity
app.put('/items/:itemId', zValidator('json', updateCartItemSchema), async (c) => {
  const user = c.get('user')
  const itemId = c.req.param('itemId')
  const data = c.req.valid('json')
  
  try {
    // Verify cart item belongs to user
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id,
          status: 'ACTIVE'
        }
      },
      include: { product: true }
    })
    
    if (!cartItem) {
      return c.json({ 
        error: { 
          code: 'ITEM_NOT_FOUND', 
          message: 'Cart item not found' 
        } 
      }, 404)
    }
    
    // If quantity is 0, remove item
    if (data.quantity === 0) {
      await db.cartItem.delete({
        where: { id: itemId }
      })
      
      return c.json({ message: 'Item removed from cart' })
    }
    
    // Check stock availability
    if (cartItem.product.stockQuantity < data.quantity) {
      return c.json({ 
        error: { 
          code: 'INSUFFICIENT_STOCK', 
          message: `Only ${cartItem.product.stockQuantity} items available` 
        } 
      }, 400)
    }
    
    // Check minimum order quantity for wholesale
    if (user.customerType !== 'RETAIL' && data.quantity < cartItem.product.minOrderQty) {
      return c.json({ 
        error: { 
          code: 'MIN_ORDER_QTY', 
          message: `Minimum order quantity is ${cartItem.product.minOrderQty}` 
        } 
      }, 400)
    }
    
    // Update quantity
    const updatedItem = await db.cartItem.update({
      where: { id: itemId },
      data: { quantity: data.quantity },
      include: { product: true }
    })
    
    return c.json({ 
      cartItem: updatedItem,
      message: 'Cart updated successfully' 
    })
  } catch (error) {
    console.error('Error updating cart item:', error)
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to update cart item' 
      } 
    }, 500)
  }
})

// Remove item from cart
app.delete('/items/:itemId', async (c) => {
  const user = c.get('user')
  const itemId = c.req.param('itemId')
  
  try {
    // Verify cart item belongs to user
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id,
          status: 'ACTIVE'
        }
      }
    })
    
    if (!cartItem) {
      return c.json({ 
        error: { 
          code: 'ITEM_NOT_FOUND', 
          message: 'Cart item not found' 
        } 
      }, 404)
    }
    
    await db.cartItem.delete({
      where: { id: itemId }
    })
    
    return c.json({ message: 'Item removed from cart' })
  } catch (error) {
    console.error('Error removing cart item:', error)
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to remove cart item' 
      } 
    }, 500)
  }
})

// Clear cart
app.delete('/', async (c) => {
  const user = c.get('user')
  
  try {
    const cart = await db.cart.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    })
    
    if (!cart) {
      return c.json({ message: 'Cart already empty' })
    }
    
    await db.cartItem.deleteMany({
      where: { cartId: cart.id }
    })
    
    return c.json({ message: 'Cart cleared successfully' })
  } catch (error) {
    console.error('Error clearing cart:', error)
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to clear cart' 
      } 
    }, 500)
  }
})

// Update delivery options
app.post('/delivery', zValidator('json', deliveryOptionsSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')
  
  try {
    const cart = await db.cart.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    })
    
    if (!cart) {
      return c.json({ 
        error: { 
          code: 'CART_NOT_FOUND', 
          message: 'Cart not found' 
        } 
      }, 404)
    }
    
    const updatedCart = await db.cart.update({
      where: { id: cart.id },
      data: {
        deliveryType: data.type,
        deliveryAddress: data.address,
        state: data.state,
        lga: data.lga,
        phoneNumber: data.phoneNumber
      }
    })
    
    // Calculate delivery fee
    const deliveryFee = data.type === 'EXPRESS' ? 1000 : 
                       data.type === 'STANDARD' ? 500 : 0
    
    return c.json({ 
      deliveryType: updatedCart.deliveryType,
      deliveryFee,
      message: 'Delivery options updated' 
    })
  } catch (error) {
    console.error('Error updating delivery:', error)
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to update delivery options' 
      } 
    }, 500)
  }
})

// Apply bulk discount for wholesale customers
app.post('/apply-discount', async (c) => {
  const user = c.get('user')
  
  // Only for wholesale customers
  if (user.customerType === 'RETAIL') {
    return c.json({ 
      error: { 
        code: 'NOT_ELIGIBLE', 
        message: 'Bulk discounts only available for wholesale customers' 
      } 
    }, 400)
  }
  
  try {
    const cart = await db.cart.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!cart || cart.items.length === 0) {
      return c.json({ 
        error: { 
          code: 'CART_EMPTY', 
          message: 'Cart is empty' 
        } 
      }, 400)
    }
    
    // Calculate total quantity and apply tiered discounts
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    let discountPercentage = 0
    
    if (totalQuantity >= 500) {
      discountPercentage = 15 // 15% discount for 500+ items
    } else if (totalQuantity >= 200) {
      discountPercentage = 10 // 10% discount for 200+ items
    } else if (totalQuantity >= 100) {
      discountPercentage = 5 // 5% discount for 100+ items
    }
    
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.product.wholesalePrice * item.quantity)
    }, 0)
    
    const discountAmount = (subtotal * discountPercentage) / 100
    
    return c.json({
      totalQuantity,
      discountPercentage,
      discountAmount,
      finalAmount: subtotal - discountAmount,
      message: discountPercentage > 0 
        ? `${discountPercentage}% bulk discount applied!` 
        : 'Order more items to qualify for bulk discount'
    })
  } catch (error) {
    console.error('Error applying discount:', error)
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to apply discount' 
      } 
    }, 500)
  }
})

export default app
