'use client';

import React, { useState, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { Portal } from './Portal';
import { 
  X, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Package,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  cartSummaryAtom,
  updateCartItemQuantityAtom,
  removeFromCartAtom,
  clearCartAtom,
  cartItemsAtom
} from '../lib/cart-store';
import { useCartToast } from '@saas/shared/hooks/use-toast';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function CartDrawer({ isOpen, onClose, className }: CartDrawerProps) {
  const cartSummary = useAtomValue(cartSummaryAtom);
  const cartItems = useAtomValue(cartItemsAtom);
  const updateQuantity = useSetAtom(updateCartItemQuantityAtom);
  const removeItem = useSetAtom(removeFromCartAtom);
  const clearCart = useSetAtom(clearCartAtom);
  const cartToast = useCartToast();

  const handleRemoveItem = useCallback((itemId: string, productName: string) => {
    removeItem(itemId);
    cartToast.showRemovedFromCart(productName);
  }, [removeItem, cartToast]);

  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number, productName: string) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId, productName);
      return;
    }
    
    updateQuantity({ itemId, quantity: newQuantity });
    cartToast.showUpdatedQuantity(productName, newQuantity);
  }, [updateQuantity, cartToast, handleRemoveItem]);

  const handleClearCart = useCallback(() => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      cartToast.showCartCleared();
    }
  }, [clearCart, cartToast]);

  const handleCheckout = () => {
    onClose();
    window.location.href = '/app/checkout';
  };

  const handleViewCart = () => {
    onClose();
    window.location.href = '/app/cart';
  };

  if (!isOpen) return null;

  return (
    <Portal>
      {/* 
        Z-Index Hierarchy:
        - Standard UI components (modals, dropdowns): z-50
        - Cart backdrop: z-[9998] (inline style: 9998)
        - Cart drawer: z-[9999] (inline style: 9999)
        - Portal root: z-index: 999999 (set in Portal component)
        Using Portal ensures the cart is rendered at the root of the DOM,
        completely outside any parent stacking contexts.
      */}
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out",
        className
      )}
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingCart className="size-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Shopping Cart
                </h2>
                {!cartSummary.isEmpty && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cartSummary.totalQuantity} items
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>

          {/* Content */}
          {cartSummary.isEmpty ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <Package className="size-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Add some products to get started
                </p>
                <Button 
                  onClick={() => {
                    onClose();
                    window.location.href = '/app/products';
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Browse Products
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <img
                            src={typeof item.product.images[0] === 'string' 
                              ? item.product.images[0] 
                              : item.product.images[0]?.url
                            }
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="size-6 text-gray-400 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            ₦{item.unitPrice.toLocaleString()}
                          </span>
                          {item.isWholesalePrice && (
                            <Badge variant="secondary" className="text-xs">
                              Wholesale
                            </Badge>
                          )}
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateQuantity(
                              item.id, 
                              item.quantity - 1, 
                              item.product.name
                            )}
                            disabled={item.quantity <= 1}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateQuantity(
                              item.id, 
                              item.quantity + 1, 
                              item.product.name
                            )}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id, item.product.name)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ₦{(item.unitPrice * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Clear Cart Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCart}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="size-4 mr-2" />
                  Clear Cart
                </Button>
              </div>

              {/* Footer with Summary */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Subtotal ({cartSummary.totalQuantity} items)
                    </span>
                    <span className="font-medium">
                      ₦{cartSummary.subtotal.toLocaleString()}
                    </span>
                  </div>
                  
                  {cartSummary.bulkDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Bulk Discount</span>
                      <span>-₦{cartSummary.bulkDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {cartSummary.selectedDelivery.name}
                    </span>
                    <span className="font-medium">
                      {cartSummary.deliveryFee === 0 
                        ? 'Free' 
                        : `₦${cartSummary.deliveryFee.toLocaleString()}`
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-lg font-bold border-t pt-2 border-gray-200 dark:border-gray-700">
                    <span>Total</span>
                    <span>₦{cartSummary.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Special Notices */}
                {cartSummary.requiresPrescription && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Some items require prescription
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
                  >
                    <ArrowRight className="size-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleViewCart}
                      className="w-full"
                    >
                      View Cart
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        onClose();
                        window.location.href = '/app/products';
                      }}
                      className="w-full"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
