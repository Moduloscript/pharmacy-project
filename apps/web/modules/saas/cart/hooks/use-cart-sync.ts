'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  cartItemsAtom, 
  sessionAwareCartAtom 
} from '../lib/cart-store';
import { 
  cartSessionStateAtom, 
  initializeSessionAtom,
  isSessionActiveAtom,
  currentSessionAtom 
} from '../lib/session-manager';

/**
 * Hook that provides automatic cart synchronization.
 * 
 * Features:
 * 1. Visibility Change: Reloads cart when tab becomes visible
 * 2. Window Focus: Reloads cart when window gains focus
 * 3. Session Validation: Ensures session is still valid
 * 
 * This hook should be used in a global wrapper component (e.g., AppWrapper)
 * to enable automatic cart sync across the entire application.
 */
export function useCartSync() {
  const [cartItems, setCartItems] = useAtom(cartItemsAtom);
  const [sessionState, setSessionState] = useAtom(cartSessionStateAtom);
  const initializeSession = useSetAtom(initializeSessionAtom);
  const lastSyncRef = useRef<number>(Date.now());
  
  // Debounce sync to prevent excessive calls
  const SYNC_DEBOUNCE_MS = 500;

  /**
   * Force reload cart data from sessionStorage
   */
  const syncCartFromStorage = useCallback(() => {
    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_DEBOUNCE_MS) {
      return; // Debounce
    }
    lastSyncRef.current = now;

    try {
      if (typeof window === 'undefined') return;

      // 1. First, sync session state
      const storedSession = sessionStorage.getItem('benpharm-cart-session');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        
        // Check if storage session differs from memory
        const currentSessionId = sessionState?.session?.id;
        const storedSessionId = parsed?.session?.id;
        
        if (storedSessionId && storedSessionId !== currentSessionId) {
          // Session changed (possibly from another action or purchase completion)
          setSessionState(parsed);
        }
      }

      // 2. Sync cart items
      // Get current session/tab IDs for the correct key
      const currentState = storedSession ? JSON.parse(storedSession) : sessionState;
      const sessionId = currentState?.session?.id || 'no-session';
      const tabId = currentState?.metadata?.tabId || sessionStorage.getItem('cart_tab_id') || 'no-tab';
      const cartKey = `benpharm-cart-items-${sessionId}-${tabId}`;
      
      const storedCart = sessionStorage.getItem(cartKey);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        
        // Only update if different (shallow check on length and first item ID)
        const isDifferent = 
          parsedCart.length !== cartItems.length ||
          (parsedCart.length > 0 && cartItems.length > 0 && parsedCart[0]?.id !== cartItems[0]?.id);
        
        if (isDifferent) {
          setCartItems(parsedCart);
        }
      } else if (cartItems.length > 0) {
        // Storage is empty but memory has items - could be after session reset
        // Check if session is still valid
        const isValid = currentState?.session?.status === 'active';
        if (!isValid) {
          // Session was completed/expired, clear memory cart
          setCartItems([]);
        }
      }

      // 3. Ensure session is initialized
      initializeSession();
      
    } catch (error) {
      console.warn('Cart sync failed:', error);
    }
  }, [cartItems, sessionState, setCartItems, setSessionState, initializeSession]);

  /**
   * Handle visibility change (tab switch)
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      syncCartFromStorage();
    }
  }, [syncCartFromStorage]);

  /**
   * Handle window focus
   */
  const handleFocus = useCallback(() => {
    syncCartFromStorage();
  }, [syncCartFromStorage]);

  /**
   * Handle storage events (cross-tab sync)
   * Note: storage events only fire for changes made in OTHER tabs
   */
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key?.includes('benpharm-cart')) {
      syncCartFromStorage();
    }
  }, [syncCartFromStorage]);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial sync on mount
    syncCartFromStorage();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleVisibilityChange, handleFocus, handleStorageChange, syncCartFromStorage]);

  // Return sync function for manual trigger if needed
  return {
    syncCart: syncCartFromStorage
  };
}

export default useCartSync;
