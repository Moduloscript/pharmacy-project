'use client';

import React from 'react';
import { useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { ShoppingCart } from 'lucide-react';
import { cartSummaryAtom } from '../lib/cart-store';
import { useCartDrawer } from '../hooks/use-cart-drawer';
import { CartDrawer } from './CartDrawer';

interface MiniCartProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function MiniCart({ 
  className, 
  showLabel = false, 
  variant = 'outline',
  size = 'default'
}: MiniCartProps) {
  const cartSummary = useAtomValue(cartSummaryAtom);
  const { isOpen, openDrawer, closeDrawer } = useCartDrawer();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={openDrawer}
        className={className}
        aria-label={`Shopping cart with ${cartSummary.totalQuantity} items`}
      >
        <div className="relative">
          <ShoppingCart className="size-4" />
          {!cartSummary.isEmpty && (
            <Badge 
              className="absolute -top-2 -right-2 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white border-0"
              variant="destructive"
            >
              {cartSummary.totalQuantity > 99 ? '99+' : cartSummary.totalQuantity}
            </Badge>
          )}
        </div>
        {showLabel && (
          <span className="ml-2">
            Cart{!cartSummary.isEmpty && ` (${cartSummary.totalQuantity})`}
          </span>
        )}
      </Button>
      
      <CartDrawer isOpen={isOpen} onClose={closeDrawer} />
    </>
  );
}
