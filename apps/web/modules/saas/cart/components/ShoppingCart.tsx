'use client';

import { useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
import { cn, pluralize } from '@ui/lib';
import { 
  ShoppingCartIcon, 
  ArrowLeftIcon, 
  TrashIcon
} from 'lucide-react';
import { 
  cartSummaryAtom,
  validateCartAtom,
  clearCartAtom
} from '../lib/cart-store';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useCartToast } from '@saas/shared/hooks/use-toast';
import { CartUtils } from '../lib/api';
import Link from 'next/link';

interface ShoppingCartProps {
  className?: string;
  onCheckout?: () => void;
  showBackButton?: boolean;
  backButtonHref?: string;
  title?: string;
  description?: string;
}

export function ShoppingCart({
  className,
  onCheckout,
  showBackButton = true,
  backButtonHref = '/app/products',
  title = 'Shopping Cart',
  description = 'Review your items before checkout'
}: ShoppingCartProps) {
  const cartSummary = useAtomValue(cartSummaryAtom);
  const cartValidation = useAtomValue(validateCartAtom);
  const [, clearCart] = useAtom(clearCartAtom);
  const cartToast = useCartToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleCheckout = () => {
    if (!cartValidation.isValid) {
      cartToast.showError('Please fix cart issues before proceeding to checkout');
      return;
    }
    
    if (onCheckout) {
      onCheckout();
    } else {
      // Default checkout navigation
      window.location.href = '/app/checkout';
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    clearCart();
    cartToast.showCartCleared();
  };

  const cartStats = CartUtils.getCartStats(cartSummary.items);
  const groupedItems = CartUtils.groupByCategory(cartSummary.items);

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link href={backButtonHref}>
                <Button variant="ghost" size="sm">
                  <ArrowLeftIcon className="size-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-card-foreground flex items-center">
                <ShoppingCartIcon className="size-8 mr-3" />
                {title}
                {!cartSummary.isEmpty && (
                  <Badge status="info" className="ml-3">
                    {cartSummary.totalQuantity} {pluralize(cartSummary.totalQuantity, 'item')}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">{description}</p>
            </div>
          </div>

          {!cartSummary.isEmpty && (
            <Button
              variant="link"
              size="sm"
              onClick={handleClearCart}
              className="text-destructive hover:text-destructive/90"
            >
              <TrashIcon className="size-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {/* Empty State */}
        {cartSummary.isEmpty ? (
          <div className="max-w-md mx-auto">
            <CartSummary showDeliveryOptions={false} showCouponCode={false} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Stats */}
              <Card className="p-4 bg-muted">
                <div className="flex flex-wrap gap-2">
                  <Badge status="info" className="text-xs">
                    {cartStats.uniqueProducts} unique products
                  </Badge>
                  <Badge status="info" className="text-xs">
                    {cartStats.totalQuantity} items
                  </Badge>
                  <Badge status={cartStats.prescriptionItems > 0 ? 'warning' : 'info'} className="text-xs">
                    {cartStats.prescriptionItems} prescription items
                  </Badge>
                  <Badge status={cartStats.wholesaleItems > 0 ? 'success' : 'info'} className="text-xs">
                    {cartStats.wholesaleItems} wholesale items
                  </Badge>
                </div>
              </Card>

              {/* Validation Errors */}
              {!cartValidation.isValid && (
                <Alert id="cart-issues" variant="error">
                  <AlertTitle>Cart issues</AlertTitle>
                  <AlertDescription>
                    <ul className="space-y-1">
                      {cartValidation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Special Notices */}
              {cartStats.hasPrescriptionItems && (
                <Alert variant="warning">
                  <AlertTitle>Prescription items</AlertTitle>
                  <AlertDescription>
                    Your cart contains {cartStats.prescriptionItems} prescription item(s). You'll need to upload valid prescriptions during checkout.
                  </AlertDescription>
                </Alert>
              )}

              {cartStats.hasWholesaleItems && (
                <Alert variant="success">
                  <AlertTitle>Wholesale benefits</AlertTitle>
                  <AlertDescription>
                    You're getting wholesale pricing on {cartStats.wholesaleItems} item(s).
                    {cartSummary.bulkDiscount > 0 && (
                      <> You're saving an additional {CartUtils.formatPrice(cartSummary.bulkDiscount)} with bulk discounts!</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Cart Items by Category */}
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-card-foreground">{category}</h2>
                      <Badge className="text-xs">{items.length} {pluralize(items.length, 'item')}</Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {items.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          showCategory={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <CartSummary
                  onCheckout={handleCheckout}
                  isCheckoutDisabled={!cartValidation.isValid}
                />
              </div>
            </div>
          </div>
        )}

        {/* Additional reassurance moved near CTA in CartSummary; page-level tiles removed for a cleaner hierarchy */}
        {/* Mobile sticky checkout bar */}
        {!cartSummary.isEmpty && (
          <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-base font-semibold text-card-foreground">{CartUtils.formatPrice(cartSummary.total)}</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleCheckout}
                disabled={!cartValidation.isValid}
                aria-describedby={!cartValidation.isValid ? 'cart-issues' : undefined}
              >
                Checkout
              </Button>
              {!cartValidation.isValid && (
                <Button
                  variant="link"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const el = document.getElementById('cart-issues');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  View issues
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearCart}
        title="Clear Shopping Cart"
        description="Are you sure you want to remove all items from your cart? This action cannot be undone."
        confirmText="Clear Cart"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
