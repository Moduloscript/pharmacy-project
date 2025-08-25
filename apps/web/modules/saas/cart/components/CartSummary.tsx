'use client';

import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { SelectableCard } from '@ui/components/selectable-card';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
import { cn } from '@ui/lib';
import { 
  TruckIcon, 
  PackageIcon, 
  ClockIcon,
  TagIcon,
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
<PackageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
<h3 className="text-lg font-semibold text-card-foreground mb-2">Your cart is empty</h3>
<p className="text-muted-foreground mb-4">
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
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center">
            <TruckIcon className="size-5 mr-2" />
            Delivery Options
          </h3>
          
          <RadioGroup
            value={cartSummary.selectedDelivery.id}
            onValueChange={handleDeliveryChange}
            name="delivery-options"
            className="space-y-3"
          >
            {DELIVERY_OPTIONS.map((option) => {
              const isSelected = cartSummary.selectedDelivery.id === option.id;
              const estimatedDate = CartUtils.calculateDeliveryDate(option.id);
              
              return (
                <SelectableCard
                  key={option.id}
                  selected={isSelected}
                  className="p-3 cursor-pointer"
                  onClick={() => handleDeliveryChange(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.id} aria-label={option.name} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-card-foreground">{option.name}</span>
                          {option.price === 0 && (
                            <Badge status="success" className="text-xs">Free</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <ClockIcon className="size-3 mr-1" />
                            {option.estimatedDays === 0 ? 'Same day' : `${option.estimatedDays} days`}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Est: {estimatedDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-semibold text-card-foreground">
                        {option.price === 0 ? 'Free' : CartUtils.formatPrice(option.price)}
                      </span>
                    </div>
                  </div>
                </SelectableCard>
              );
            })}
          </RadioGroup>

          {cartSummary.selectedDelivery.id !== 'pickup' && (
            <Alert variant="primary" className="mt-3">
              <AlertTitle>Delivery information</AlertTitle>
              <AlertDescription>
                Currently delivering within Benin City and surrounding areas. Orders are processed Monday–Saturday, 8AM–6PM.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* Coupon Code */}
      {showCouponCode && !couponApplied && (
        <Card className="p-4">
<h3 className="font-semibold text-card-foreground mb-3 flex items-center">
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

<div className="mt-2 text-xs text-muted-foreground">
            Try: WELCOME10, FIRST20, or HEALTH5
          </div>
        </Card>
      )}

      {/* Applied Coupon */}
      {couponApplied && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
<CheckCircleIcon className="size-5 text-success" />
              <div>
<p className="font-medium text-success">Coupon Applied</p>
<p className="text-sm text-success">Code: {couponCode}</p>
              </div>
            </div>
            <div className="text-right">
<p className="font-semibold text-success">
                -{CartUtils.formatPrice(couponDiscount)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
className="text-success hover:text-success/90"
              >
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Order Summary */}
      <Card className="p-4">
<h3 className="font-semibold text-card-foreground mb-4">Order Summary</h3>
        
        <div className="space-y-3">
          {/* Subtotal */}
<div className="flex justify-between text-muted-foreground">
            <span>Subtotal ({cartSummary.totalQuantity} items)</span>
            <span>{CartUtils.formatPrice(cartSummary.subtotal)}</span>
          </div>

          {/* Bulk Discount */}
          {cartSummary.bulkDiscount > 0 && (
<div className="flex justify-between text-success">
              <span className="flex items-center">
                <TagIcon className="size-4 mr-1" />
                Bulk Discount
              </span>
              <span>-{CartUtils.formatPrice(cartSummary.bulkDiscount)}</span>
            </div>
          )}

          {/* Coupon Discount */}
{couponDiscount > 0 && (
            <div className="flex justify-between text-success">
              <span className="flex items-center">
                <TagIcon className="size-4 mr-1" />
                Coupon ({couponCode})
              </span>
              <span>-{CartUtils.formatPrice(couponDiscount)}</span>
            </div>
          )}

          {/* Delivery Fee */}
<div className="flex justify-between text-muted-foreground">
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
<div className="flex justify-between text-success font-medium border-t pt-3">
              <span>Total Savings</span>
              <span>{CartUtils.formatPrice(totalSavings)}</span>
            </div>
          )}

          {/* Final Total */}
<div className="flex justify-between text-lg font-bold text-card-foreground border-t pt-3">
            <span>Total</span>
            <span>{CartUtils.formatPrice(finalTotal)}</span>
          </div>
        </div>

        {/* Special Requirements Notice */}
        {cartSummary.requiresPrescription && (
          <Alert variant="warning" className="mt-4">
            <AlertTitle>Prescription required</AlertTitle>
            <AlertDescription>
              Some items in your cart require a valid prescription upload during checkout.
            </AlertDescription>
          </Alert>
        )}

        {/* Checkout Button */}
        <Button
          className="w-full mt-6"
          onClick={onCheckout}
          disabled={isCheckoutDisabled}
          size="lg"
          variant="primary"
        >
          {checkoutButtonText}
        </Button>

        {/* Security Notice */}
        <div className="mt-4 text-center">
<div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3" />
            <span>Secure checkout powered by Nigerian payment gateways</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
