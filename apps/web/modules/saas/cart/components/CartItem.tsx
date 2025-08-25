'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Badge } from '@ui/components/badge';
import { Card } from '@ui/components/card';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
import { cn } from '@ui/lib';
import { 
  MinusIcon, 
  PlusIcon, 
  TrashIcon, 
  AlertCircleIcon,
  ShieldCheckIcon 
} from 'lucide-react';
import { 
  type CartItem as CartItemType,
  updateCartItemQuantityAtom,
  removeFromCartAtom
} from '../lib/cart-store';
import { CartUtils } from '../lib/api';

interface CartItemProps {
  item: CartItemType;
  className?: string;
  showCategory?: boolean;
  compact?: boolean;
}

export function CartItem({ 
  item, 
  className,
  showCategory = true,
  compact = false
}: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [, updateQuantity] = useAtom(updateCartItemQuantityAtom);
  const [, removeItem] = useAtom(removeFromCartAtom);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < item.product.min_order_qty || newQuantity > item.product.stock_quantity) {
      return; // Don't update if invalid
    }

    setIsUpdating(true);
    try {
      updateQuantity({ itemId: item.id, quantity: newQuantity });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = () => {
    removeItem(item.id);
  };

  const isOutOfStock = item.product.stock_quantity === 0;
  const isLowStock = item.product.stock_quantity > 0 && item.product.stock_quantity < 10;
  const exceedsStock = item.quantity > item.product.stock_quantity;
  const belowMinimum = item.quantity < item.product.min_order_qty;
  const hasValidationError = exceedsStock || belowMinimum;

  const itemTotal = item.unitPrice * item.quantity;

  // Resolve product image URL from multiple possible shapes
  const imageUrl = (() => {
    // Support backend returning images as array of strings/objects or as a JSON string
    // Also fall back to legacy single URL fields
    const p: any = item.product as any;
    const images = p?.images;

    try {
      // If images is a JSON string, parse it
      const parsed = typeof images === 'string' ? JSON.parse(images) : images;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (typeof first === 'string') return first;
        if (first?.url) return first.url as string;
      }
    } catch {
      // ignore parse errors and fall back below
    }

    return p?.imageUrl || p?.image_url || '/placeholder-product.jpg';
  })();

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-3 py-2', className)}>
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={item.product.name}
            className="size-12 rounded-lg border object-cover"
            onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg'; }}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground truncate">
            {item.product.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.quantity} × {CartUtils.formatPrice(item.unitPrice)}
          </p>
        </div>

        {/* Total */}
        <div className="flex-shrink-0">
          <p className="font-semibold text-card-foreground">
            {CartUtils.formatPrice(itemTotal)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('relative p-4', className)}>
      <div className="flex space-x-4">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={item.product.name}
            className="size-20 rounded-lg border object-cover"
            onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg'; }}
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 space-y-3">
          {/* Product Name and Badges */}
          <div>
            <h3 className="font-semibold text-card-foreground text-lg">
              {item.product.name}
            </h3>
            
            {item.product.generic_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Generic: {item.product.generic_name}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.product.requires_prescription && (
                <Badge status="warning" className="text-xs">
                  <ShieldCheckIcon className="size-3 mr-1" />
                  Prescription required
                </Badge>
              )}
              
              {item.isWholesalePrice && (
                <Badge status="info" className="text-xs">
                  Wholesale price
                </Badge>
              )}

              {showCategory && item.product.category && (
                <Badge variant="outline" className="text-xs">
                  {item.product.category}
                </Badge>
              )}

              {item.product.nafdac_number && (
                <Badge variant="outline" className="text-xs">
                  NAFDAC: {item.product.nafdac_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Price and Stock Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-card-foreground">
                  {CartUtils.formatPrice(item.unitPrice)}
                </span>
                <span className="text-sm text-muted-foreground">per {item.product.unit}</span>
              </div>
              
              {/* Stock Status */}
              <div className="flex items-center space-x-2 mt-1">
                {isOutOfStock ? (
                  <div className="flex items-center text-destructive text-sm">
                    <AlertCircleIcon className="size-4 mr-1" />
                    Out of stock
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center text-highlight text-sm">
                    <AlertCircleIcon className="size-4 mr-1" />
                    Low stock ({item.product.stock_quantity} left)
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {item.product.stock_quantity} available
                  </span>
                )}
              </div>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <p className="text-lg font-semibold text-card-foreground">
                {CartUtils.formatPrice(itemTotal)}
              </p>
              {item.quantity > 1 && (
                <p className="text-sm text-muted-foreground">
                  {item.quantity} items
                </p>
              )}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Quantity Input */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Decrease quantity"
                  onClick={() => handleQuantityChange(item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= item.product.min_order_qty}
                  className="size-12 p-0"
                >
                  <MinusIcon className="size-5" />
                </Button>

                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value);
                    const clamped = isNaN(raw)
                      ? item.product.min_order_qty
                      : Math.min(
                          Math.max(raw, item.product.min_order_qty),
                          item.product.stock_quantity,
                        );
                    handleQuantityChange(clamped);
                  }}
                  className="w-20 h-12 text-center"
                  min={item.product.min_order_qty}
                  max={item.product.stock_quantity}
                  disabled={isUpdating}
                />

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Increase quantity"
                  onClick={() => handleQuantityChange(item.quantity + 1)}
                  disabled={isUpdating || item.quantity >= item.product.stock_quantity}
                  className="size-12 p-0"
                >
                  <PlusIcon className="size-5" />
                </Button>
              </div>

              {/* Min/Max Info */}
              <div className="text-xs text-muted-foreground">
                Min: {item.product.min_order_qty} | Max: {item.product.stock_quantity}
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="link"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive/90"
            >
              <TrashIcon className="size-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Validation Errors */}
          {hasValidationError && (
            <Alert variant="error">
              <AlertTitle>Item constraints</AlertTitle>
              <AlertDescription>
                {exceedsStock && (
                  <p>Only {item.product.stock_quantity} units available</p>
                )}
                {belowMinimum && (
                  <p>Minimum order quantity is {item.product.min_order_qty}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Additional Info */}
          {item.product.requires_prescription && (
            <Alert variant="warning">
              <AlertTitle>Prescription required</AlertTitle>
              <AlertDescription>
                You'll need to upload a valid prescription during checkout.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </Card>
  );
}
