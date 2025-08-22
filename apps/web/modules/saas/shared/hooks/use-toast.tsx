'use client';

import { useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, ShoppingCart, AlertTriangle, X } from 'lucide-react';

export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useCartToast = () => {
  // Track recent toasts to prevent duplicates
  const recentToasts = useRef<Set<string>>(new Set());
  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Debounce function to prevent duplicate toasts
  const debouncedToast = useCallback((key: string, toastFn: () => void, debounceTime: number = 1000) => {
    // Clear existing timeout for this toast key
    const existingTimeout = toastTimeouts.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // If this toast was recently shown, skip it
    if (recentToasts.current.has(key)) {
      return;
    }

    // Mark as recent and show toast
    recentToasts.current.add(key);
    toastFn();

    // Set timeout to clear the recent toast marker
    const timeout = setTimeout(() => {
      recentToasts.current.delete(key);
      toastTimeouts.current.delete(key);
    }, debounceTime);

    toastTimeouts.current.set(key, timeout);
  }, []);
  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    const key = `success-${message}`;
    debouncedToast(key, () => {
      toast.success(message, {
        icon: <CheckCircle className="size-4" />,
        duration: options?.duration || 3000,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      });
    });
  }, [debouncedToast]);

  const showAddedToCart = useCallback((productName: string, quantity: number = 1) => {
    const key = `added-${productName}-${quantity}`;
    debouncedToast(key, () => {
      toast.success(
        `${productName} ${quantity > 1 ? `(×${quantity})` : ''} added to cart!`,
        {
          icon: <ShoppingCart className="size-4" />,
          duration: 3000,
          action: {
            label: 'View Cart',
            onClick: () => {
              window.location.href = '/app/cart';
            },
          },
        }
      );
    });
  }, [debouncedToast]);

  const showRemovedFromCart = useCallback((productName: string) => {
    const key = `removed-${productName}`;
    debouncedToast(key, () => {
      toast.success(`${productName} removed from cart`, {
        icon: <X className="size-4" />,
        duration: 2000,
      });
    });
  }, [debouncedToast]);

  const showUpdatedQuantity = useCallback((productName: string, newQuantity: number) => {
    const key = `quantity-${productName}-${newQuantity}`;
    debouncedToast(key, () => {
      toast.success(
        `${productName} quantity updated to ${newQuantity}`,
        {
          icon: <CheckCircle className="size-4" />,
          duration: 2000,
        }
      );
    });
  }, [debouncedToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    const key = `error-${message}`;
    debouncedToast(key, () => {
      toast.error(message, {
        icon: <AlertTriangle className="size-4" />,
        duration: options?.duration || 4000,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      });
    });
  }, [debouncedToast]);

  const showCartCleared = useCallback(() => {
    const key = 'cart-cleared';
    debouncedToast(key, () => {
      toast.success('Cart cleared', {
        icon: <CheckCircle className="size-4" />,
        duration: 2000,
      });
    });
  }, [debouncedToast]);

  return {
    showSuccess,
    showAddedToCart,
    showRemovedFromCart,
    showUpdatedQuantity,
    showError,
    showCartCleared,
  };
};
