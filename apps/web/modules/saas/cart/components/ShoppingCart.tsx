'use client';

import { useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { 
  ShoppingCartIcon, 
  ArrowLeftIcon, 
  PackageIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
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
    <div className={cn('min-h-screen bg-gray-50', className)}>
      <div className="container mx-auto px-4 py-8">
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShoppingCartIcon className="size-8 mr-3" />
                {title}
                {!cartSummary.isEmpty && (
                  <Badge variant="secondary" className="ml-3">
                    {cartSummary.totalQuantity} items
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 mt-1">{description}</p>
            </div>
          </div>

          {!cartSummary.isEmpty && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{cartStats.uniqueProducts}</p>
                    <p className="text-sm text-blue-700">Unique Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{cartStats.totalQuantity}</p>
                    <p className="text-sm text-blue-700">Total Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{cartStats.prescriptionItems}</p>
                    <p className="text-sm text-blue-700">Prescription Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{cartStats.wholesaleItems}</p>
                    <p className="text-sm text-blue-700">Wholesale Items</p>
                  </div>
                </div>
              </Card>

              {/* Validation Errors */}
              {!cartValidation.isValid && (
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex items-start space-x-3">
                    <AlertTriangleIcon className="size-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-2">Cart Issues</h3>
                      <ul className="space-y-1">
                        {cartValidation.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Special Notices */}
              {cartStats.hasPrescriptionItems && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <ShieldCheckIcon className="size-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">Prescription Items</h3>
                      <p className="text-sm text-yellow-700">
                        Your cart contains {cartStats.prescriptionItems} prescription item(s). 
                        You'll need to upload valid prescriptions during checkout.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {cartStats.hasWholesaleItems && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-start space-x-3">
                    <PackageIcon className="size-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-2">Wholesale Benefits</h3>
                      <p className="text-sm text-green-700">
                        You're getting wholesale pricing on {cartStats.wholesaleItems} item(s).
                        {cartSummary.bulkDiscount > 0 && ` You're saving an additional ${CartUtils.formatPrice(cartSummary.bulkDiscount)} with bulk discounts!`}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Cart Items by Category */}
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                      <Badge variant="outline">{items.length} items</Badge>
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

        {/* Additional Information */}
        {!cartSummary.isEmpty && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 text-center">
              <ShieldCheckIcon className="size-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Secure Checkout</h3>
              <p className="text-sm text-gray-600">
                Your payment information is encrypted and secure
              </p>
            </Card>

            <Card className="p-4 text-center">
              <PackageIcon className="size-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-sm text-gray-600">
                Same-day delivery available within Benin City
              </p>
            </Card>

            <Card className="p-4 text-center">
              <AlertTriangleIcon className="size-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Quality Assured</h3>
              <p className="text-sm text-gray-600">
                All products are NAFDAC-approved and quality-tested
              </p>
            </Card>
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
