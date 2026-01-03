import type { CartItem } from './cart-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Types for API communication
export interface CartItemCreateRequest {
  productId: string;
  quantity: number;
  isWholesalePrice: boolean;
}

export interface CartItemUpdateRequest {
  quantity: number;
}

export interface CartResponse {
  items: CartItem[];
  summary: {
    subtotal: number;
    bulkDiscount: number;
    deliveryFee: number;
    total: number;
    totalQuantity: number;
  };
}

// API Client class
class CartAPI {
  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get current user's cart
  async getCart(): Promise<CartResponse> {
    return this.fetchAPI('/cart');
  }

  // Add item to cart
  async addToCart(item: CartItemCreateRequest): Promise<CartResponse> {
    return this.fetchAPI('/cart/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  // Update cart item quantity
  async updateCartItem(itemId: string, update: CartItemUpdateRequest): Promise<CartResponse> {
    return this.fetchAPI(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<CartResponse> {
    return this.fetchAPI(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Clear entire cart
  async clearCart(): Promise<{ message: string }> {
    return this.fetchAPI('/cart', {
      method: 'DELETE',
    });
  }

  // Sync local cart with server (for logged-in users)
  async syncCart(localItems: CartItem[]): Promise<CartResponse> {
    return this.fetchAPI('/cart/sync', {
      method: 'POST',
      body: JSON.stringify({ items: localItems }),
    });
  }

  // Validate cart before checkout
  async validateCart(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.fetchAPI('/cart/validate');
  }

  // Apply coupon/discount code
  async applyCoupon(couponCode: string): Promise<{
    success: boolean;
    discount: number;
    message: string;
  }> {
    return this.fetchAPI('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ couponCode }),
    });
  }

  // Calculate shipping options based on cart and location
  async calculateShipping(location: {
    state: string;
    lga: string;
    address: string;
  }): Promise<{
    options: Array<{
      id: string;
      name: string;
      price: number;
      estimatedDays: number;
      available: boolean;
    }>;
  }> {
    return this.fetchAPI('/cart/shipping', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }
}

// Export singleton instance
export const cartAPI = new CartAPI();

// Utility functions for cart operations
export const CartUtils = {
  // Calculate bulk discount for wholesale orders
  calculateBulkDiscount: (subtotal: number, isWholesale: boolean): number => {
    if (!isWholesale) return 0;
    
    if (subtotal >= 100000) {
      return subtotal * 0.05; // 5% discount for orders ≥ ₦100,000
    } else if (subtotal >= 50000) {
      return subtotal * 0.025; // 2.5% discount for orders ≥ ₦50,000
    }
    
    return 0;
  },

  // Format price in Nigerian Naira
  formatPrice: (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  // Check if product requires prescription
  requiresPrescription: (items: CartItem[]): boolean => {
    return items.some(item => item.product.requires_prescription);
  },

  // Get cart summary statistics
  getCartStats: (items: CartItem[]) => {
    const uniqueProducts = new Set(items.map(item => item.product.id)).size;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const prescriptionItems = items.filter(item => item.product.requires_prescription).length;
    const wholesaleItems = items.filter(item => item.isWholesalePrice).length;
    
    return {
      uniqueProducts,
      totalQuantity,
      prescriptionItems,
      wholesaleItems,
      hasWholesaleItems: wholesaleItems > 0,
      hasPrescriptionItems: prescriptionItems > 0,
    };
  },

  // Validate item quantities against stock
  validateStock: (items: CartItem[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    items.forEach(item => {
      const stockQty = item.product.stockQuantity ?? item.product.stock_quantity ?? 0;
      const minQty = item.product.minOrderQuantity ?? item.product.min_order_qty ?? 1;
      
      if (item.quantity > stockQty) {
        errors.push(`${item.product.name}: Only ${stockQty} units available (requested ${item.quantity})`);
      }
      
      if (item.quantity < minQty) {
        errors.push(`${item.product.name}: Minimum order quantity is ${minQty} (current ${item.quantity})`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Group cart items by category for better organization
  groupByCategory: (items: CartItem[]) => {
    return items.reduce((groups, item) => {
      const category = item.product.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, CartItem[]>);
  },

  // Calculate estimated delivery date
  calculateDeliveryDate: (deliveryOption: string): Date => {
    const now = new Date();
    const days = deliveryOption === 'express' ? 0 : 
                 deliveryOption === 'standard' ? 2 : 0;
    
    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + days);
    
    // Skip weekends for standard delivery
    if (deliveryOption === 'standard') {
      while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
      }
    }
    
    return deliveryDate;
  },

  // Generate order summary for checkout
  generateOrderSummary: (items: CartItem[], deliveryFee: number, discount: number = 0) => {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const total = subtotal - discount + deliveryFee;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      subtotal,
      discount,
      deliveryFee,
      total,
      totalQuantity,
      itemCount: items.length,
    };
  },
};
