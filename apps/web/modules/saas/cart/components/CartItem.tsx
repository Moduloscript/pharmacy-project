'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Badge } from '@ui/components/badge';
import { Card } from '@ui/components/card';
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

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-3 py-2', className)}>
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={item.product.images?.[0] || '/placeholder-product.jpg'}
            alt={item.product.name}
            className="size-12 rounded-lg border object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {item.product.name}
          </p>
          <p className="text-sm text-gray-600">
            {item.quantity} × {CartUtils.formatPrice(item.unitPrice)}
          </p>
        </div>

        {/* Total */}
        <div className="flex-shrink-0">
          <p className="font-semibold text-gray-900">
            {CartUtils.formatPrice(itemTotal)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex space-x-4">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={item.product.images?.[0] || '/placeholder-product.jpg'}
            alt={item.product.name}
            className="size-20 rounded-lg border object-cover"
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 space-y-3">
          {/* Product Name and Badges */}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {item.product.name}
            </h3>
            
            {item.product.generic_name && (
              <p className="text-sm text-gray-600 mt-1">
                Generic: {item.product.generic_name}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.product.requires_prescription && (
                <Badge variant="secondary" className="text-xs">
                  <ShieldCheckIcon className="size-3 mr-1" />
                  Prescription Required
                </Badge>
              )}
              
              {item.isWholesalePrice && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                  Wholesale Price
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
                <span className="font-medium text-gray-900">
                  {CartUtils.formatPrice(item.unitPrice)}
                </span>
                <span className="text-sm text-gray-600">per {item.product.unit}</span>
              </div>
              
              {/* Stock Status */}
              <div className="flex items-center space-x-2 mt-1">
                {isOutOfStock ? (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircleIcon className="size-4 mr-1" />
                    Out of Stock
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center text-amber-600 text-sm">
                    <AlertCircleIcon className="size-4 mr-1" />
                    Low Stock ({item.product.stock_quantity} left)
                  </div>
                ) : (
                  <span className="text-sm text-gray-600">
                    {item.product.stock_quantity} available
                  </span>
                )}
              </div>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {CartUtils.formatPrice(itemTotal)}
              </p>
              {item.quantity > 1 && (
                <p className="text-sm text-gray-600">
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
                  onClick={() => handleQuantityChange(item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= item.product.min_order_qty}
                  className="size-8 p-0"
                >
                  <MinusIcon className="size-4" />
                </Button>

                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value) || item.product.min_order_qty;
                    handleQuantityChange(newQuantity);
                  }}
                  className="w-16 text-center"
                  min={item.product.min_order_qty}
                  max={item.product.stock_quantity}
                  disabled={isUpdating}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.quantity + 1)}
                  disabled={isUpdating || item.quantity >= item.product.stock_quantity}
                  className="size-8 p-0"
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>

              {/* Min/Max Info */}
              <div className="text-xs text-gray-500">
                Min: {item.product.min_order_qty} | Max: {item.product.stock_quantity}
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="size-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Validation Errors */}
          {hasValidationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircleIcon className="size-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  {exceedsStock && (
                    <p className="text-red-700 font-medium">
                      Only {item.product.stock_quantity} units available
                    </p>
                  )}
                  {belowMinimum && (
                    <p className="text-red-700 font-medium">
                      Minimum order quantity is {item.product.min_order_qty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {item.product.requires_prescription && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <ShieldCheckIcon className="size-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium">Prescription Required</p>
                  <p className="text-yellow-700">
                    You'll need to upload a valid prescription during checkout.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </Card>
  );
}
