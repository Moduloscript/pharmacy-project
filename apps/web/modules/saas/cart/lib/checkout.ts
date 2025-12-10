'use client';

import { OrdersAPI } from '../../orders/lib/api';
import type { CreateOrderRequest, Order } from '../../orders/lib/types';
import type { CartItem } from './cart-store';

export interface CheckoutData {
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode?: string;
    instructions?: string;
  };
  deliveryMethod: 'standard' | 'express' | 'pickup';
  paymentMethod: 'card' | 'transfer' | 'cash';
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    bankName?: string;
  };
  couponCode?: string;
  customerNotes?: string;
  prescriptionFiles?: File[];
}

export interface CheckoutResult {
  success: boolean;
  order?: Order;
  error?: string;
  redirectUrl?: string;
}

export class CheckoutService {
  /**
   * Convert cart items to order items format
   */
  static cartItemsToOrderItems(cartItems: CartItem[]) {
    return cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      name: item.product.name,
      image: item.product.images?.[0] || item.product.imageUrl || '',
      totalPrice: item.unitPrice * item.quantity,
      category: item.product.category || 'General',
      requiresPrescription: item.product.requires_prescription || item.product.isPrescriptionRequired || item.product.is_prescription_required || false,
      wholesalePrice: item.product.wholesalePrice || item.product.wholesale_price,
      retailPrice: item.product.retailPrice || item.product.retail_price || item.unitPrice,
      sku: item.product.sku || item.product.id
    }));
  }

  /**
   * Validate checkout data
   */
  static validateCheckoutData(
    cartItems: CartItem[], 
    checkoutData: CheckoutData
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate cart
    if (cartItems.length === 0) {
      errors.push('Cart is empty');
    }

    // Validate shipping address
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    for (const field of requiredFields) {
      if (!checkoutData.shippingAddress[field as keyof typeof checkoutData.shippingAddress]?.trim()) {
        errors.push(`${field} is required`);
      }
    }

    // Validate email format
    if (checkoutData.shippingAddress.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(checkoutData.shippingAddress.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate phone format (Nigerian format)
    if (checkoutData.shippingAddress.phone) {
      const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
      if (!phoneRegex.test(checkoutData.shippingAddress.phone.replace(/\s+/g, ''))) {
        errors.push('Invalid Nigerian phone number format');
      }
    }

    // Validate payment method details
    if (checkoutData.paymentMethod === 'card') {
      if (!checkoutData.paymentDetails?.cardNumber?.trim()) {
        errors.push('Card number is required');
      }
      if (!checkoutData.paymentDetails?.expiryDate?.trim()) {
        errors.push('Card expiry date is required');
      }
      if (!checkoutData.paymentDetails?.cvv?.trim()) {
        errors.push('Card CVV is required');
      }
    }

    // Validate prescriptions
    const prescriptionItems = cartItems.filter(item => 
      item.product.requires_prescription || item.product.isPrescriptionRequired || item.product.is_prescription_required
    );
    
    if (prescriptionItems.length > 0) {
      if (!checkoutData.prescriptionFiles || checkoutData.prescriptionFiles.length === 0) {
        errors.push('Prescription files are required for prescription medications');
      }
    }

    // Validate stock availability
    cartItems.forEach(item => {
      const stockQuantity = item.product.stockQuantity || item.product.stock_quantity || 0;
      if (item.quantity > stockQuantity) {
        errors.push(`Insufficient stock for ${item.product.name}. Available: ${stockQuantity}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process checkout and create order
   */
  static async processCheckout(
    cartItems: CartItem[],
    checkoutData: CheckoutData,
    cartSummary: {
      subtotal: number;
      bulkDiscount: number;
      deliveryFee: number;
      total: number;
      selectedDelivery: any;
    }
  ): Promise<CheckoutResult> {
    try {
      // Validate checkout data
      const validation = this.validateCheckoutData(cartItems, checkoutData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('. ')
        };
      }

      // Convert cart items to order format
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // Prepare order request
      const orderRequest: CreateOrderRequest = {
        items: orderItems,
        shippingAddress: checkoutData.shippingAddress,
        deliveryMethod: checkoutData.deliveryMethod,
        paymentMethod: checkoutData.paymentMethod,
        couponCode: checkoutData.couponCode,
        customerNotes: checkoutData.customerNotes,
        prescriptionFiles: checkoutData.prescriptionFiles
      };

      // Create order via API
      const order = await OrdersAPI.createOrder(orderRequest);

      // Determine redirect URL based on payment method
      let redirectUrl: string | undefined;
      
      if (checkoutData.paymentMethod === 'card') {
        // For card payments, redirect to payment gateway
        redirectUrl = `/app/payment/${order.id}`;
      } else if (checkoutData.paymentMethod === 'transfer') {
        // For bank transfer, redirect to transfer instructions
        redirectUrl = `/app/orders/${order.id}/payment-instructions`;
      } else {
        // For cash on delivery, redirect to order confirmation
        redirectUrl = `/app/orders/${order.id}`;
      }

      return {
        success: true,
        order,
        redirectUrl
      };

    } catch (error) {
      console.error('Checkout failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed. Please try again.'
      };
    }
  }

  /**
   * Calculate order totals for preview
   */
  static calculateOrderTotals(
    cartItems: CartItem[],
    deliveryFee: number,
    couponDiscount = 0
  ) {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Calculate bulk discount for wholesale items
    const wholesaleItems = cartItems.filter(item => item.isWholesalePrice);
    let bulkDiscount = 0;
    
    if (wholesaleItems.length > 0) {
      const wholesaleSubtotal = wholesaleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      if (wholesaleSubtotal >= 100000) { // ₦100,000+
        bulkDiscount = wholesaleSubtotal * 0.05; // 5% discount
      } else if (wholesaleSubtotal >= 50000) { // ₦50,000+
        bulkDiscount = wholesaleSubtotal * 0.025; // 2.5% discount
      }
    }

    const tax = 0; // No tax for now, but could be calculated here
    const grandTotal = subtotal - bulkDiscount - couponDiscount + deliveryFee + tax;

    return {
      subtotal,
      bulkDiscount,
      couponDiscount,
      deliveryFee,
      tax,
      grandTotal,
      itemsCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  /**
   * Retry failed payment
   */
  static async retryPayment(orderId: string, paymentDetails: any): Promise<CheckoutResult> {
    try {
      // This would integrate with payment gateway
      // For now, we'll simulate the retry
      
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentDetails),
      });

      if (!response.ok) {
        throw new Error('Payment retry failed');
      }

      const result = await response.json();

      return {
        success: true,
        redirectUrl: result.redirectUrl || `/app/orders/${orderId}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment retry failed'
      };
    }
  }

  /**
   * Get checkout session for analytics/tracking
   */
  static createCheckoutSession(cartItems: CartItem[], checkoutData: Partial<CheckoutData>) {
    return {
      sessionId: `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      itemsCount: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      cartValue: cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
      deliveryMethod: checkoutData.deliveryMethod,
      paymentMethod: checkoutData.paymentMethod,
      hasPresciptions: cartItems.some(item => 
        item.product.requires_prescription || item.product.isPrescriptionRequired || item.product.is_prescription_required
      )
    };
  }

  /**
   * Format Nigerian phone number
   */
  static formatNigerianPhone(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different Nigerian phone formats
    if (cleaned.startsWith('234')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      return '+234' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      return '+234' + cleaned;
    }
    
    return phone; // Return original if can't format
  }

  /**
   * Estimate delivery date based on method and location
   */
  static estimateDeliveryDate(
    deliveryMethod: 'standard' | 'express' | 'pickup',
    city: string = 'Benin City'
  ): Date {
    const now = new Date();
    
    switch (deliveryMethod) {
      case 'pickup':
        // Ready for pickup in 2 hours during business hours
        const pickupDate = new Date(now);
        pickupDate.setHours(now.getHours() + 2);
        return pickupDate;
        
      case 'express':
        // Same day delivery within Benin City, next day outside
        if (city.toLowerCase().includes('benin')) {
          const expressDate = new Date(now);
          expressDate.setHours(23, 59, 0, 0); // End of day
          return expressDate;
        } else {
          const nextDay = new Date(now);
          nextDay.setDate(now.getDate() + 1);
          return nextDay;
        }
        
      case 'standard':
      default:
        // 2-3 business days
        const businessDays = city.toLowerCase().includes('benin') ? 2 : 3;
        const standardDate = new Date(now);
        standardDate.setDate(now.getDate() + businessDays);
        return standardDate;
    }
  }
}
