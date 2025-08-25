'use client';

import React, { useState, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { Portal } from './Portal';
import { ConfirmationDialog } from './ConfirmationDialog';
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    setShowClearConfirm(true);
  }, []);

  const confirmClearCart = useCallback(() => {
    clearCart();
    cartToast.showCartCleared();
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
"fixed right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl transform transition-transform duration-300 ease-in-out",
        className
      )}
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
<div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
<ShoppingCart className="size-6 text-primary" />
              <div>
<h2 className="text-lg font-semibold text-card-foreground">
                  Shopping Cart
                </h2>
                {!cartSummary.isEmpty && (
<p className="text-sm text-muted-foreground">
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
<Package className="size-16 text-muted-foreground mx-auto mb-4" />
<h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Your cart is empty
                </h3>
<p className="text-muted-foreground mb-4">
                  Add some products to get started
                </p>
<Button 
                  variant="primary"
                  onClick={() => {
                    onClose();
                    window.location.href = '/app/products';
                  }}
className=""
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
<div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
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
<Package className="size-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
<h4 className="font-medium text-card-foreground truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
<span className="text-sm font-semibold text-primary">
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
className="h-7 w-7 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                        <div className="text-right">
<p className="text-sm font-semibold text-card-foreground">
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
className="w-full text-destructive hover:text-destructive/90 hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 className="size-4 mr-2" />
                  Clear Cart
                </Button>
              </div>

              {/* Footer with Summary */}
<div className="border-t border-border p-4 space-y-4">
                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
<span className="text-muted-foreground">
                      Subtotal ({cartSummary.totalQuantity} items)
                    </span>
                    <span className="font-medium">
                      ₦{cartSummary.subtotal.toLocaleString()}
                    </span>
                  </div>
                  
                  {cartSummary.bulkDiscount > 0 && (
<div className="flex items-center justify-between text-sm text-success">
                      <span>Bulk Discount</span>
                      <span>-₦{cartSummary.bulkDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
<span className="text-muted-foreground">
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
<div className="flex items-start gap-2 p-2 border rounded-lg">
<AlertTriangle className="size-4 text-highlight mt-0.5" />
<p className="text-xs text-highlight">
                      Some items require prescription
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
<Button 
                    onClick={handleCheckout}
                    className="w-full"
                    variant="primary"
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
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearCart}
        title="Clear Shopping Cart"
        description="Are you sure you want to clear your cart? This action cannot be undone."
        confirmText="Clear Cart"
        cancelText="Cancel"
        variant="destructive"
      />
    </Portal>
  );
}
