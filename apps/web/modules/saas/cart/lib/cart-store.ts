'use client';

import { atom } from 'jotai';
import { atomWithStorage, type SyncStorage } from 'jotai/utils';
import type { Product } from '../../products/lib/api';
import { 
  cartSessionStateAtom, 
  currentSessionAtom,
  SessionManager,
  initializeSessionAtom,
  updateSessionActivityAtom,
  startCheckoutSessionAtom,
  completeSessionAtom,
  isSessionActiveAtom,
  type CartSession 
} from './session-manager';
import { 
  cartExpirationManager, 
  useCartExpiration,
  type ExpirationEvent 
} from './cart-expiration-manager';

// ---------- Per-session/per-tab cart storage (sessionStorage) ----------

function getRawSessionState(): { session?: { id: string; createdAt: string; status: string }; metadata?: { tabId?: string } } | null {
  try {
    if (typeof window === 'undefined') return null;
    // Prefer sessionStorage (tab-scoped), fallback to legacy localStorage
    const rawSession = sessionStorage.getItem('benpharm-cart-session');
    if (rawSession) return JSON.parse(rawSession);
    const rawLocal = localStorage.getItem('benpharm-cart-session');
    return rawLocal ? JSON.parse(rawLocal) : null;
  } catch {
    return null;
  }
}

function getSessionAndTabIds(): { sessionId: string; tabId: string } {
  const state = getRawSessionState();
  const sessionId = state?.session?.id || 'no-session';
  let tabId = state?.metadata?.tabId;
  if (!tabId) {
    try {
      // fallback tab id
      tabId = sessionStorage.getItem('cart_tab_id') || `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('cart_tab_id', tabId);
    } catch {
      tabId = 'no-tab';
    }
  }
  return { sessionId, tabId };
}

function perSessionCartKey(): string {
  const { sessionId, tabId } = getSessionAndTabIds();
  return `benpharm-cart-items-${sessionId}-${tabId}`;
}

function shouldAllowLegacyMigrationForThisSession(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const state = getRawSessionState();
    const sessionId = state?.session?.id;
    if (!sessionId) return false;

    const legacyLockKey = 'benpharm-cart-legacy-session-id';
    const lockedSessionId = localStorage.getItem(legacyLockKey);
    if (!lockedSessionId) {
      // First time: lock migration to current session id so future sessions won't import legacy
      localStorage.setItem(legacyLockKey, sessionId);
      return true;
    }
    // Allow migration only for the locked session id
    return lockedSessionId === sessionId;
  } catch {
    return false;
  }
}

const sessionCartStorage: SyncStorage<unknown> = {
  getItem: (key, initialValue) => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const dynKey = perSessionCartKey();

      // Prefer sessionStorage (per-tab)
      const fromSession = sessionStorage.getItem(dynKey);
      if (fromSession != null) {
        return JSON.parse(fromSession);
      }

      // If a legacy mirror exists in localStorage, remove it (we no longer mirror there)
      const fromLocalDyn = localStorage.getItem(dynKey);
      if (fromLocalDyn != null) {
        try { localStorage.removeItem(dynKey); } catch {}
      }

      // One-time legacy migration gate: only for the session that first locks legacy
      const legacy = localStorage.getItem('benpharm-cart-items');
      if (legacy && shouldAllowLegacyMigrationForThisSession()) {
        try {
          const parsed = JSON.parse(legacy);
          sessionStorage.setItem(dynKey, JSON.stringify(parsed));
          return parsed;
        } catch {
          // ignore malformed legacy
        }
      }

      return initialValue;
    } catch {
      return initialValue;
    }
  },
  setItem: (key, newValue) => {
    try {
      if (typeof window === 'undefined') return;
      const dynKey = perSessionCartKey();
      const str = JSON.stringify(newValue);
      sessionStorage.setItem(dynKey, str);
    } catch {
      // noop
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window === 'undefined') return;
      const dynKey = perSessionCartKey();
      sessionStorage.removeItem(dynKey);
      localStorage.removeItem(dynKey);
    } catch {
      // noop
    }
  },
};

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

// Enhanced cart state atoms with session awareness
// cartItemsAtom now uses per-session/per-tab dynamic keys via sessionCartStorage
export const cartItemsAtom = atomWithStorage<CartItem[]>('benpharm-cart-items', [], sessionCartStorage)
export const selectedDeliveryAtom = atomWithStorage<DeliveryOption['id']>('benpharm-delivery', 'pickup')

// Session-aware cart management
export const sessionAwareCartAtom = atom(
  (get) => {
    const items = get(cartItemsAtom);
    const session = get(currentSessionAtom);
    const isActive = get(isSessionActiveAtom);
    
    // If session is not active, return empty cart
    if (!isActive) {
      return [];
    }
    
    return items;
  },
  (get, set, items: CartItem[]) => {
    // Ensure session is initialized before updating cart
    const session = get(currentSessionAtom);
    if (!session) {
      set(initializeSessionAtom);
    }
    
    // Update cart items
    set(cartItemsAtom, items);
    
    // Update session activity
    set(updateSessionActivityAtom);
  }
);

// Checkout form atoms - these were missing and causing import errors
export const selectedStateAtom = atom<string>('Edo')
export const selectedLGAAtom = atom<string>('')
export const deliveryAddressAtom = atom<string>('')
export const phoneNumberAtom = atom<string>('')
export const selectedDeliveryTypeAtom = atom<DeliveryOption['id']>('pickup')

// Enhanced cart summary with session awareness
export const cartSummaryAtom = atom((get) => {
  const items = get(sessionAwareCartAtom); // Use session-aware cart
  const selectedDeliveryId = get(selectedDeliveryAtom);
  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === selectedDeliveryId) || DELIVERY_OPTIONS[0];
  const session = get(currentSessionAtom);
  const isActive = get(isSessionActiveAtom);

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
     isEmpty: items.length === 0 || !isActive,
     requiresPrescription: items.some(item => item.product.is_prescription_required || item.product.isPrescriptionRequired),
     session,
     isActive
   };
 });

// ============================
// Bulk pricing helpers (client)
// ============================

type BulkRule = { minQty: number; discountPercent?: number; unitPrice?: number };

// Simple in-memory cache for rules (per-tab)
const bulkRulesCache: Map<string, BulkRule[]> = new Map();

async function fetchBulkRules(productId: string): Promise<BulkRule[]> {
  if (bulkRulesCache.has(productId)) return bulkRulesCache.get(productId)!;
  try {
    const res = await fetch(`/api/products/${productId}/bulk-pricing`);
    if (!res.ok) return [];
    const data = await res.json();
    const rules = Array.isArray(data?.rules) ? (data.rules as BulkRule[]) : [];
    bulkRulesCache.set(productId, rules);
    return rules;
  } catch {
    return [];
  }
}

async function prefetchBulkRules(productIds: string[]) {
  const toFetch = Array.from(new Set(productIds.filter(id => !bulkRulesCache.has(id))));
  if (toFetch.length === 0) return;
  try {
    const res = await fetch('/api/products/bulk-pricing/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: toFetch }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const map: Record<string, BulkRule[]> = data?.rulesByProduct || {};
    for (const id of Object.keys(map)) bulkRulesCache.set(id, map[id]);
  } catch {}
}

function computeEffectiveUnitPrice(basePrice: number, quantity: number, rules: BulkRule[]): number {
  if (!Array.isArray(rules) || rules.length === 0) return basePrice;
  const eligible = rules.filter((r) => typeof r.minQty === 'number' && r.minQty > 0 && r.minQty <= quantity);
  if (eligible.length === 0) return basePrice;
  // Pick the rule with the highest minQty
  const rule = eligible.sort((a, b) => b.minQty - a.minQty)[0];
  if (rule.unitPrice != null && Number.isFinite(rule.unitPrice)) {
    return Math.max(0, Number(rule.unitPrice));
  }
  if (rule.discountPercent != null && Number.isFinite(rule.discountPercent)) {
    const factor = 1 - Number(rule.discountPercent) / 100;
    return Math.max(0, Number(basePrice) * factor);
  }
  return basePrice;
}

// Cart action atoms
export const addToCartAtom = atom(
  null,
  (get, set, { product, quantity = 1, isWholesalePrice = false }: { 
    product: Product; 
    quantity?: number; 
    isWholesalePrice?: boolean;
  }) => {
    // Ensure session is active before adding to cart
    const isActive = get(isSessionActiveAtom);
    if (!isActive) {
      set(initializeSessionAtom);
    }
    
    const currentItems = get(sessionAwareCartAtom);
    
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
      
      set(sessionAwareCartAtom, updatedItems);

      // Recompute unit price using bulk rules (wholesale only)
      if (isWholesalePrice) {
        (async () => {
          await prefetchBulkRules([product.id]);
          const rules = await fetchBulkRules(product.id);
          const effective = computeEffectiveUnitPrice(unitPrice, validatedQuantity, rules);
          const itemsNow = get(sessionAwareCartAtom);
          const idxNow = itemsNow.findIndex(i => i.product.id === product.id && i.isWholesalePrice === true);
          if (idxNow >= 0 && Math.abs(itemsNow[idxNow].unitPrice - effective) > 1e-6) {
            const next = [...itemsNow];
            next[idxNow] = { ...next[idxNow], unitPrice: effective };
            set(sessionAwareCartAtom, next);
          }
        })();
      }
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
      
      set(sessionAwareCartAtom, [...currentItems, newItem]);

      // Recompute unit price using bulk rules (wholesale only)
      if (isWholesalePrice) {
        (async () => {
          await prefetchBulkRules([product.id]);
          const rules = await fetchBulkRules(product.id);
          const effective = computeEffectiveUnitPrice(unitPrice, validatedQuantity, rules);
          const itemsNow = get(sessionAwareCartAtom);
          const idxNow = itemsNow.findIndex(i => i.id === newItem.id);
          if (idxNow >= 0 && Math.abs(itemsNow[idxNow].unitPrice - effective) > 1e-6) {
            const next = [...itemsNow];
            next[idxNow] = { ...next[idxNow], unitPrice: effective };
            set(sessionAwareCartAtom, next);
          }
        })();
      }
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

    // Recompute unit price for the updated item if wholesale
    const after = updatedItems.find(i => i.id === itemId);
    if (after && after.isWholesalePrice) {
      (async () => {
        const base = (() => {
          const p: any = after.product as any;
          if (typeof p.wholesalePrice === 'number') return p.wholesalePrice;
          if (typeof p.wholesale_price === 'number') return p.wholesale_price;
          if (typeof p.wholesalePrice === 'string') return parseFloat(p.wholesalePrice) || 0;
          if (typeof p.wholesale_price === 'string') return parseFloat(p.wholesale_price) || 0;
          return 0;
        })();
        const rules = await fetchBulkRules(after.product.id);
        const effective = computeEffectiveUnitPrice(base, after.quantity, rules);
        const current = get(cartItemsAtom);
        const idx = current.findIndex(ci => ci.id === itemId);
        if (idx >= 0 && Math.abs(current[idx].unitPrice - effective) > 1e-6) {
          const next = [...current];
          next[idx] = { ...next[idx], unitPrice: effective };
          set(cartItemsAtom, next);
        }
      })();
    }
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

// Enhanced clear cart with session management
export const clearCartAtom = atom(
  null,
  (
    get,
    set,
    reason: 'manual' | 'payment_success' | 'order_completed' | 'session_expired' = 'manual'
  ) => {
    set(cartItemsAtom, []);
    
    // Handle session based on clear reason
    if (reason === 'payment_success' || reason === 'order_completed') {
      // Mark session as completed for successful flow
      set(completeSessionAtom);
      // Create new session for future shopping
      set(initializeSessionAtom);
    } else if (reason === 'session_expired') {
      // Initialize new session for expired session
      set(initializeSessionAtom);
    } else {
      // Manual clear - just update activity
      set(updateSessionActivityAtom);
    }
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

    // Prefetch bulk rules in background to improve subsequent pricing adjustments
    const ids = Array.from(new Set(items.map(({ product }) => product.id)));
    (async () => { await prefetchBulkRules(ids); })();
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
    
    // Check stock availability
    if (item.quantity > stockQuantity) {
      errors.push(`${item.product.name}: Only ${stockQuantity} units available`);
    }
    
    // Check minimum order quantity
    if (item.quantity < minOrderQty) {
      errors.push(`${item.product.name}: Minimum order quantity is ${minOrderQty}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
});

// Cart expiration event handling atom
export const handleCartExpirationAtom = atom(
  null,
  (get, set, expirationEvent: ExpirationEvent) => {
    console.log('Cart expired:', expirationEvent.reason);
    
    // Clear cart due to expiration
    set(clearCartAtom, 'session_expired');
    
    // Dispatch custom event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-expiration-warning', {
        detail: {
          reason: expirationEvent.reason,
          itemCount: expirationEvent.itemCount,
          lastActivity: expirationEvent.lastActivity
        }
      }));
    }
  }
);

// Cart activity tracking atoms
export const extendCartLifetimeAtom = atom(
  null,
  (get, set, activityType: 'browsing' | 'checkout' | 'payment' | 'idle' = 'browsing') => {
    // Update session activity
    set(updateSessionActivityAtom);
    
    // Extend cart expiration
    cartExpirationManager.extendCartLifetime(activityType);
    
    // Dispatch cart activity event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart_activity', {
        detail: { activityType }
      }));
    }
  }
);

// Initialize cart expiration when needed
export const initializeCartExpirationAtom = atom(
  null,
  (get, set) => {
    // Initialize cart expiration manager
    cartExpirationManager.initialize();
    
    // Set up event listener for cart expiration
    if (typeof window !== 'undefined') {
      const handleExpiration = (event: CustomEvent<ExpirationEvent>) => {
        set(handleCartExpirationAtom, event.detail);
      };
      
      window.addEventListener('cart-expired', handleExpiration as EventListener);
      
      // Cleanup function (would be called in component unmount)
      return () => {
        window.removeEventListener('cart-expired', handleExpiration as EventListener);
        cartExpirationManager.cleanup();
      };
    }
  }
);

// Enhanced add to cart with activity tracking
export const addToCartWithActivityAtom = atom(
  null,
  (get, set, params: { product: Product; quantity?: number; isWholesalePrice?: boolean }) => {
    // Add to cart normally
    set(addToCartAtom, params);
    
    // Extend cart lifetime
    set(extendCartLifetimeAtom, 'browsing');
  }
);

// Enhanced update cart with activity tracking
export const updateCartWithActivityAtom = atom(
  null,
  (get, set, params: { itemId: string; quantity: number }) => {
    // Update cart normally
    set(updateCartItemQuantityAtom, params);
    
    // Extend cart lifetime
    set(extendCartLifetimeAtom, 'browsing');
  }
);

// Enhanced remove from cart with activity tracking
export const removeFromCartWithActivityAtom = atom(
  null,
  (get, set, itemId: string) => {
    // Remove from cart normally
    set(removeFromCartAtom, itemId);
    
    // Extend cart lifetime
    set(extendCartLifetimeAtom, 'browsing');
  }
);

// Checkout session management atoms
export const startCheckoutWithExpirationAtom = atom(
  null,
  (get, set) => {
    // Start checkout session
    set(startCheckoutSessionAtom);
    
    // Switch to checkout mode with shorter timeout
    cartExpirationManager.startCheckoutMode();
    
    // Extend lifetime to reset timeout
    set(extendCartLifetimeAtom, 'checkout');
  }
);

export const endCheckoutWithExpirationAtom = atom(
  null,
  (get, set) => {
    // End checkout mode
    cartExpirationManager.endCheckoutMode();
    
    // Return to normal browsing mode
    set(extendCartLifetimeAtom, 'browsing');
  }
);

export const startPaymentWithExpirationAtom = atom(
  null,
  (get, set) => {
    // Start payment mode (maintains session during payment)
    cartExpirationManager.startPaymentMode();
    
    // Extend lifetime for payment process
    set(extendCartLifetimeAtom, 'payment');
  }
);

// Cart persistence and sync atoms
export const syncCartAtom = atom(
  null,
  async (get, set) => {
    // This would sync with backend cart API
    // For now, we'll just validate against current product data
    const items = get(cartItemsAtom);
    
    // Check for concurrent sessions
    const hasConcurrentSessions = cartExpirationManager.handleConcurrentSessions();
    
    if (hasConcurrentSessions) {
      console.log('Concurrent sessions detected, extending cart lifetime');
      set(extendCartLifetimeAtom, 'browsing');
    }
    
    // TODO: Fetch latest product data and validate cart items
    // TODO: Remove items that are no longer available
    // TODO: Update prices if they've changed
    
    console.log('Cart sync completed', { itemCount: items.length });
  }
);

// Export the useCartExpiration hook for components
export { useCartExpiration };
