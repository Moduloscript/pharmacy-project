'use client';

import { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { cartSummaryAtom } from '../lib/cart-store';

export function useCartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const cartSummary = useAtomValue(cartSummaryAtom);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    cartSummary,
    hasItems: !cartSummary.isEmpty,
    itemCount: cartSummary.totalQuantity,
    total: cartSummary.total
  };
}
