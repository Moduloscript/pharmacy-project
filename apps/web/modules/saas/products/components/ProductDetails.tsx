'use client';

import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { cn } from '@ui/lib';
import { Product } from '../lib/api';
import { useProduct, useProductReviews } from '../lib/queries';
import { 
  pricingPreferencesAtom,
  bulkOrderAtom,
  updateBulkOrderAtom
} from '../lib/store';
import {
  Shield,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Info,
  Truck,
  Award,
  Activity
} from 'lucide-react';

interface ProductDetailsProps {
  productId: string;
  onAddToCart?: (product: Product, quantity?: number) => void;
  className?: string;
}

export function ProductDetails({ 
  productId, 
  onAddToCart,
  className 
}: ProductDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // Use TanStack Query for data fetching
  const { data, isLoading, error } = useProduct(productId);
  const product = data?.product;
  const { data: reviews } = useProductReviews(productId);
  
  // Use Jotai for state management
  const pricingPrefs = useAtomValue(pricingPreferencesAtom);
  const [bulkOrder, setBulkOrder] = useAtom(bulkOrderAtom);
  const [, updateBulkOrder] = useAtom(updateBulkOrderAtom);

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery Skeleton */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
          
          {/* Product Info Skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <div className="text-red-600 mb-4">
          <svg className="size-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Not Found</h3>
        <p className="text-gray-600 mb-4">
          {error ? (error instanceof Error ? error.message : String(error)) : 'The requested product could not be found.'}
        </p>
        <Button onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Card>
    );
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
  };

  const handleAddToBulkOrder = () => {
    updateBulkOrder({
      productId: product.id,
      quantity,
      unitPrice: pricingPrefs.showWholesalePrice ? (product.wholesalePrice || product.wholesale_price) : (product.retailPrice || product.retail_price)
    });
  };

  const currentPrice = pricingPrefs.showWholesalePrice ? (product.wholesalePrice || product.wholesale_price) : (product.retailPrice || product.retail_price);
  const wholesalePrice = product.wholesalePrice || product.wholesale_price || 0;
  const retailPrice = product.retailPrice || product.retail_price;
  const savings = retailPrice - wholesalePrice;
  const discountPercent = Math.round((savings / retailPrice) * 100);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image with Enhanced Styling */}
          <div className="aspect-square rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
            {product.images?.[selectedImageIndex] ? (
              <img
                src={product.images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="size-32 text-blue-400 dark:text-blue-500 opacity-30" />
              </div>
            )}
          </div>
          
          {/* Enhanced Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'aspect-square rounded-lg border-2 overflow-hidden transition-all duration-200',
                    selectedImageIndex === index 
                      ? 'border-blue-500 dark:border-blue-400 shadow-md scale-105' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                  )}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Product Information */}
        <div className="space-y-6">
          {/* Header with Better Typography */}
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
                {product.generic_name && (
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    <span className="text-gray-500 dark:text-gray-500">Generic:</span> {product.generic_name}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {product.requires_prescription && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                    <Shield className="size-3 mr-1" />
                    Prescription Required
                  </Badge>
                )}
                {product.nafdac_number && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700">
                    <CheckCircle className="size-3 mr-1" />
                    NAFDAC: {product.nafdac_number}
                  </Badge>
                )}
              </div>
            </div>
            
            {product.manufacturer && (
              <div className="flex items-center gap-2 text-sm">
                <Award className="size-4 text-blue-500 dark:text-blue-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  Manufactured by <span className="font-semibold text-blue-600 dark:text-blue-400">{product.manufacturer}</span>
                </p>
              </div>
            )}
          </div>

          {/* Enhanced Pricing Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800/50 dark:to-gray-700/30 rounded-xl p-5 shadow-sm border border-blue-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Price</p>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
                  ₦{currentPrice.toLocaleString()}
                </span>
              </div>
              
              {pricingPrefs.showWholesalePrice && retailPrice > wholesalePrice && (
                <div className="text-right">
                  <span className="text-sm line-through text-gray-500 dark:text-gray-500 block">
                    ₦{retailPrice.toLocaleString()}
                  </span>
                  <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 mt-1">
                    <TrendingUp className="size-3 mr-1" />
                    Save {discountPercent}%
                  </Badge>
                </div>
              )}
            </div>
            
            {product.unit && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-100 dark:border-gray-700">
                <Package className="size-4 text-gray-500 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sold per <span className="font-medium">{product.unit}</span>
                  {product.pack_size && ` • Pack contains ${product.pack_size} units`}
                </p>
              </div>
            )}
          </div>

          {/* Enhanced Stock Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {product.stock_quantity > 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-500 dark:text-green-400" />
                <div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    In Stock
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                    ({product.stock_quantity} units available)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Out of Stock</span>
              </div>
            )}
            
            {/* Estimated Delivery */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Truck className="size-4" />
              <span>Express delivery available</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Key Information with Icons */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {product.dosage_form && (
              <div className="flex items-start gap-2">
                <Activity className="size-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Dosage Form</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{product.dosage_form}</p>
                </div>
              </div>
            )}
            {product.strength && (
              <div className="flex items-start gap-2">
                <Info className="size-4 text-green-500 dark:text-green-400 mt-0.5" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Strength</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{product.strength}</p>
                </div>
              </div>
            )}
            {product.therapeutic_class && (
              <div className="flex items-start gap-2">
                <Heart className="size-4 text-red-500 dark:text-red-400 mt-0.5" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Therapeutic Class</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{product.therapeutic_class}</p>
                </div>
              </div>
            )}
            {product.storage_conditions && (
              <div className="flex items-start gap-2">
                <Clock className="size-4 text-amber-500 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Storage</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{product.storage_conditions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Quantity Selector and Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <label htmlFor="quantity" className="font-medium text-gray-700 dark:text-gray-300">
                  Quantity:
                </label>
                <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={product.stock_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center border-0 focus:ring-0 bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-500">Total Price</p>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  ₦{(currentPrice * quantity).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-400 dark:hover:to-emerald-400 text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                <ShoppingCart className="size-4 mr-2" />
                Add to Cart
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddToBulkOrder}
                disabled={product.stock_quantity <= 0}
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30 font-medium"
              >
                <Package className="size-4 mr-2" />
                Bulk Order
              </Button>
            </div>

            {product.requires_prescription && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                <AlertTriangle className="size-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-purple-800 dark:text-purple-300 mb-1">
                    Prescription Required
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    A valid prescription from a licensed healthcare provider is required for this medication. You'll be prompted to upload it during checkout.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information Tabs */}
      <div className="space-y-6">
        {/* Usage Instructions */}
        {product.usage_instructions && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Instructions</h3>
            <div className="prose text-gray-700 max-w-none">
              <p>{product.usage_instructions}</p>
            </div>
          </Card>
        )}

        {/* Side Effects */}
        {product.side_effects && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Side Effects</h3>
            <div className="prose text-gray-700 max-w-none">
              <p>{product.side_effects}</p>
            </div>
          </Card>
        )}

        {/* Contraindications */}
        {product.contraindications && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contraindications</h3>
            <div className="prose text-gray-700 max-w-none">
              <p>{product.contraindications}</p>
            </div>
          </Card>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={cn(
                            'size-4',
                            i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                          )}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      by {review.reviewer_name}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
