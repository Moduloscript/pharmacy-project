'use client';

import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Select } from '@ui/components/select';
import { Input } from '@ui/components/input';
import { cn } from '@ui/lib';
import { 
  TruckIcon, 
  PackageIcon, 
  ClockIcon,
  TagIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from 'lucide-react';
import { 
  cartSummaryAtom,
  updateDeliveryMethodAtom,
  DELIVERY_OPTIONS,
  type DeliveryOption
} from '../lib/cart-store';
import { useCartToast } from '@saas/shared/hooks/use-toast';
import { CartUtils } from '../lib/api';
import { useState } from 'react';

interface CartSummaryProps {
  className?: string;
  showDeliveryOptions?: boolean;
  showCouponCode?: boolean;
  onCheckout?: () => void;
  checkoutButtonText?: string;
  isCheckoutDisabled?: boolean;
}

export function CartSummary({
  className,
  showDeliveryOptions = true,
  showCouponCode = true,
  onCheckout,
  checkoutButtonText = 'Proceed to Checkout',
  isCheckoutDisabled = false
}: CartSummaryProps) {
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const cartSummary = useAtomValue(cartSummaryAtom);
  const [, updateDelivery] = useAtom(updateDeliveryMethodAtom);
  const cartToast = useCartToast();

  const handleDeliveryChange = (deliveryId: string) => {
    updateDelivery(deliveryId as DeliveryOption['id']);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      // TODO: Implement coupon validation API call
      // For now, simulate some common coupons
      const discountAmount = simulateCouponDiscount(couponCode, cartSummary.subtotal);
      
      if (discountAmount > 0) {
        setCouponDiscount(discountAmount);
        setCouponApplied(true);
        cartToast.showSuccess(`Coupon code "${couponCode}" applied successfully!`);
      } else {
        cartToast.showError('Invalid or expired coupon code');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      cartToast.showError('Failed to apply coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponApplied(false);
  };

  // Simulate coupon discount logic
  const simulateCouponDiscount = (code: string, subtotal: number): number => {
    const upperCode = code.toUpperCase();
    switch (upperCode) {
      case 'WELCOME10':
        return Math.min(subtotal * 0.1, 5000); // 10% up to ₦5,000
      case 'FIRST20':
        return Math.min(subtotal * 0.2, 10000); // 20% up to ₦10,000
      case 'HEALTH5':
        return Math.min(subtotal * 0.05, 2500); // 5% up to ₦2,500
      default:
        return 0;
    }
  };

  const finalTotal = cartSummary.total - couponDiscount;
  const totalSavings = cartSummary.bulkDiscount + couponDiscount;

  if (cartSummary.isEmpty) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <PackageIcon className="size-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-600 mb-4">
          Add some pharmaceutical products to get started
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/app/products'}>
          Browse Products
        </Button>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Delivery Options */}
      {showDeliveryOptions && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <TruckIcon className="size-5 mr-2" />
            Delivery Options
          </h3>
          
          <div className="space-y-3">
            {DELIVERY_OPTIONS.map((option) => {
              const isSelected = cartSummary.selectedDelivery.id === option.id;
              const estimatedDate = CartUtils.calculateDeliveryDate(option.id);
              
              return (
                <div
                  key={option.id}
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer transition-colors',
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => handleDeliveryChange(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleDeliveryChange(option.id)}
                        className="text-primary"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{option.name}</span>
                          {option.price === 0 && (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-xs text-gray-500">
                            <ClockIcon className="size-3 mr-1" />
                            {option.estimatedDays === 0 ? 'Same day' : `${option.estimatedDays} days`}
                          </div>
                          <span className="text-xs text-gray-500">
                            Est: {estimatedDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {option.price === 0 ? 'Free' : CartUtils.formatPrice(option.price)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {cartSummary.selectedDelivery.id !== 'pickup' && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <TruckIcon className="size-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">Delivery Information</p>
                  <p className="text-blue-700">
                    Currently delivering within Benin City and surrounding areas. 
                    Orders are processed Monday-Saturday, 8AM-6PM.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Coupon Code */}
      {showCouponCode && !couponApplied && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <TagIcon className="size-5 mr-2" />
            Promo Code
          </h3>
          
          <div className="flex space-x-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleApplyCoupon}
              disabled={isApplyingCoupon || !couponCode.trim()}
              loading={isApplyingCoupon}
            >
              Apply
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Try: WELCOME10, FIRST20, or HEALTH5
          </div>
        </Card>
      )}

      {/* Applied Coupon */}
      {couponApplied && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="size-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Coupon Applied</p>
                <p className="text-sm text-green-700">Code: {couponCode}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-800">
                -{CartUtils.formatPrice(couponDiscount)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-green-700 hover:text-green-800"
              >
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Order Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-gray-700">
            <span>Subtotal ({cartSummary.totalQuantity} items)</span>
            <span>{CartUtils.formatPrice(cartSummary.subtotal)}</span>
          </div>

          {/* Bulk Discount */}
          {cartSummary.bulkDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center">
                <TagIcon className="size-4 mr-1" />
                Bulk Discount
              </span>
              <span>-{CartUtils.formatPrice(cartSummary.bulkDiscount)}</span>
            </div>
          )}

          {/* Coupon Discount */}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center">
                <TagIcon className="size-4 mr-1" />
                Coupon ({couponCode})
              </span>
              <span>-{CartUtils.formatPrice(couponDiscount)}</span>
            </div>
          )}

          {/* Delivery Fee */}
          <div className="flex justify-between text-gray-700">
            <span className="flex items-center">
              <TruckIcon className="size-4 mr-1" />
              {cartSummary.selectedDelivery.name}
            </span>
            <span>
              {cartSummary.deliveryFee === 0 ? 'Free' : CartUtils.formatPrice(cartSummary.deliveryFee)}
            </span>
          </div>

          {/* Total Savings */}
          {totalSavings > 0 && (
            <div className="flex justify-between text-green-600 font-medium border-t pt-3">
              <span>Total Savings</span>
              <span>{CartUtils.formatPrice(totalSavings)}</span>
            </div>
          )}

          {/* Final Total */}
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
            <span>Total</span>
            <span>{CartUtils.formatPrice(finalTotal)}</span>
          </div>
        </div>

        {/* Special Requirements Notice */}
        {cartSummary.requiresPrescription && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ShieldCheckIcon className="size-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-800 font-medium">Prescription Required</p>
                <p className="text-yellow-700">
                  Some items require prescription upload during checkout
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Button */}
        <Button
          className="w-full mt-6"
          onClick={onCheckout}
          disabled={isCheckoutDisabled}
          size="lg"
        >
          {checkoutButtonText}
        </Button>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
            <ShieldCheckIcon className="size-3" />
            <span>Secure checkout powered by Nigerian payment gateways</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
