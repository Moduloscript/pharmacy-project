'use client';

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Product } from '../../products/lib/api';

// Cart item interface
export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number; // Price at time of adding to cart
  isWholesalePrice: boolean;
  addedAt: Date;
}

// Delivery options
export interface DeliveryOption {
  id: 'standard' | 'express' | 'pickup';
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
  available: boolean;
}

// Nigerian delivery options
export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'pickup',
    name: 'Store Pickup',
    description: 'Pick up from our Benin City location',
    price: 0,
    estimatedDays: 0,
    available: true
  },
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: 'Regular delivery within Benin City',
    price: 500,
    estimatedDays: 2,
    available: true
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: 'Same-day delivery within Benin City',
    price: 1000,
    estimatedDays: 0,
    available: true
  }
];

// Cart state atoms
export const cartItemsAtom = atomWithStorage<CartItem[]>('benpharm-cart-items', []);
export const selectedDeliveryAtom = atomWithStorage<DeliveryOption['id']>('benpharm-delivery', 'pickup');

// Cart summary calculations
export const cartSummaryAtom = atom((get) => {
  const items = get(cartItemsAtom);
  const selectedDeliveryId = get(selectedDeliveryAtom);
  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === selectedDeliveryId) || DELIVERY_OPTIONS[0];

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = selectedDelivery.price;
  
  // Calculate bulk discount for wholesale customers
  const wholesaleItems = items.filter(item => item.isWholesalePrice);
  let bulkDiscount = 0;
  
  if (wholesaleItems.length > 0) {
    const wholesaleSubtotal = wholesaleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Apply bulk discounts based on order value
    if (wholesaleSubtotal >= 100000) { // ₦100,000+
      bulkDiscount = wholesaleSubtotal * 0.05; // 5% discount
    } else if (wholesaleSubtotal >= 50000) { // ₦50,000+
      bulkDiscount = wholesaleSubtotal * 0.025; // 2.5% discount
    }
  }

  const total = subtotal - bulkDiscount + deliveryFee;

  return {
    items,
    subtotal,
    bulkDiscount,
    deliveryFee,
    total,
    totalQuantity,
    selectedDelivery,
    isEmpty: items.length === 0,
    requiresPrescription: items.some(item => item.product.requires_prescription)
  };
});

// Cart action atoms
export const addToCartAtom = atom(
  null,
  (get, set, { product, quantity = 1, isWholesalePrice = false }: { 
    product: Product; 
    quantity?: number; 
    isWholesalePrice?: boolean;
  }) => {
    const currentItems = get(cartItemsAtom);
    
    // Helper function to parse prices and handle both camelCase and snake_case
    const parsePrice = (price: any): number => {
      if (typeof price === 'string') {
        return parseFloat(price) || 0;
      }
      return typeof price === 'number' ? price : 0;
    };
    
    // Get prices with fallback between camelCase and snake_case
    const retailPrice = parsePrice(product.retailPrice || product.retail_price);
    const wholesalePrice = parsePrice(product.wholesalePrice || product.wholesale_price);
    const unitPrice = isWholesalePrice ? wholesalePrice : retailPrice;
    
    // Get stock quantity with fallback
    const stockQuantity = product.stockQuantity || product.stock_quantity || 0;
    const minOrderQty = product.minOrderQuantity || product.min_order_qty || 1;
    
    // Check if item already exists in cart
    const existingItemIndex = currentItems.findIndex(
      item => item.product.id === product.id && item.isWholesalePrice === isWholesalePrice
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...currentItems];
      const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
      
      // Validate against stock and minimum order quantity
      const maxQuantity = Math.min(stockQuantity, 999);
      const validatedQuantity = Math.min(Math.max(newQuantity, minOrderQty), maxQuantity);
      
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: validatedQuantity
      };
      
      set(cartItemsAtom, updatedItems);
    } else {
      // Add new item to cart
      const validatedQuantity = Math.min(
        Math.max(quantity, minOrderQty),
        stockQuantity
      );
      
      const newItem: CartItem = {
        id: `${product.id}-${isWholesalePrice ? 'wholesale' : 'retail'}`,
        product,
        quantity: validatedQuantity,
        unitPrice,
        isWholesalePrice,
        addedAt: new Date()
      };
      
      set(cartItemsAtom, [...currentItems, newItem]);
    }
  }
);

export const updateCartItemQuantityAtom = atom(
  null,
  (get, set, { itemId, quantity }: { itemId: string; quantity: number }) => {
    const currentItems = get(cartItemsAtom);
    const updatedItems = currentItems.map(item => {
      if (item.id === itemId) {
        // Get field values with fallback between camelCase and snake_case
        const stockQuantity = item.product.stockQuantity || item.product.stock_quantity || 0;
        const minOrderQty = item.product.minOrderQuantity || item.product.min_order_qty || 1;
        
        // Validate quantity against product constraints
        const validatedQuantity = Math.min(
          Math.max(quantity, minOrderQty),
          stockQuantity
        );
        
        return { ...item, quantity: validatedQuantity };
      }
      return item;
    });
    
    set(cartItemsAtom, updatedItems);
  }
);

export const removeFromCartAtom = atom(
  null,
  (get, set, itemId: string) => {
    const currentItems = get(cartItemsAtom);
    const updatedItems = currentItems.filter(item => item.id !== itemId);
    set(cartItemsAtom, updatedItems);
  }
);

export const clearCartAtom = atom(
  null,
  (_get, set) => {
    set(cartItemsAtom, []);
  }
);

export const updateDeliveryMethodAtom = atom(
  null,
  (_get, set, deliveryId: DeliveryOption['id']) => {
    set(selectedDeliveryAtom, deliveryId);
  }
);

// Bulk operations for wholesale customers
export const addBulkOrderAtom = atom(
  null,
  (get, set, items: { product: Product; quantity: number }[]) => {
    const currentItems = get(cartItemsAtom);
    
    items.forEach(({ product, quantity }) => {
      // Add as wholesale item
      set(addToCartAtom, { 
        product, 
        quantity, 
        isWholesalePrice: true 
      });
    });
  }
);

// Validation helpers
export const validateCartAtom = atom((get) => {
  const items = get(cartItemsAtom);
  const errors: string[] = [];
  
  items.forEach(item => {
    // Get field values with fallback between camelCase and snake_case
    const stockQuantity = item.product.stockQuantity || item.product.stock_quantity || 0;
    const minOrderQty = item.product.minOrderQuantity || item.product.min_order_qty || 1;
    const isActive = item.product.isActive ?? item.product.is_active ?? true;
    
    // Check stock availability
    if (item.quantity > stockQuantity) {
      errors.push(`${item.product.name}: Only ${stockQuantity} units available`);
    }
    
    // Check minimum order quantity
    if (item.quantity < minOrderQty) {
      errors.push(`${item.product.name}: Minimum order quantity is ${minOrderQty}`);
    }
    
    // Check if product is still active
    if (!isActive) {
      errors.push(`${item.product.name}: Product is no longer available`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
});

// Cart persistence and sync atoms
export const syncCartAtom = atom(
  null,
  async (get, set) => {
    // This would sync with backend cart API
    // For now, we'll just validate against current product data
    const items = get(cartItemsAtom);
    
    // TODO: Fetch latest product data and validate cart items
    // TODO: Remove items that are no longer available
    // TODO: Update prices if they've changed
    
    console.log('Cart sync completed', { itemCount: items.length });
  }
);
