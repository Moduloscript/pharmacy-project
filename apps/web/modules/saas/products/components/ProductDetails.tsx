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
  const { data: product, isLoading, error } = useProduct(productId);
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
          {error || 'The requested product could not be found.'}
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
      unitPrice: pricingPrefs.showWholesale ? product.wholesale_price : product.retail_price
    });
  };

  const currentPrice = pricingPrefs.showWholesale ? product.wholesale_price : product.retail_price;
  const savings = product.retail_price - product.wholesale_price;
  const discountPercent = Math.round((savings / product.retail_price) * 100);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square rounded-lg bg-white border overflow-hidden">
            <img
              src={product.images?.[selectedImageIndex] || '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'aspect-square rounded-lg border-2 overflow-hidden transition-colors',
                    selectedImageIndex === index 
                      ? 'border-primary' 
                      : 'border-gray-200 hover:border-gray-300'
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

        {/* Product Information */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-gray-600">{product.generic_name}</p>
              </div>
              <div className="flex items-center space-x-2">
                {product.requires_prescription && (
                  <Badge variant="secondary">Prescription Required</Badge>
                )}
                {product.nafdac_number && (
                  <Badge variant="outline">NAFDAC: {product.nafdac_number}</Badge>
                )}
              </div>
            </div>
            
            {product.manufacturer && (
              <p className="text-sm text-gray-500">
                by <span className="font-medium">{product.manufacturer}</span>
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-bold text-gray-900">
                ₦{currentPrice.toLocaleString()}
              </span>
              
              {pricingPrefs.showWholesale && product.retail_price > product.wholesale_price && (
                <div className="text-sm">
                  <span className="line-through text-gray-500">₦{product.retail_price.toLocaleString()}</span>
                  <span className="ml-2 text-green-600 font-medium">
                    Save {discountPercent}%
                  </span>
                </div>
              )}
            </div>
            
            {product.unit && (
              <p className="text-sm text-gray-600">
                per {product.unit}
                {product.pack_size && ` • Pack of ${product.pack_size}`}
              </p>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            {product.stock_quantity > 0 ? (
              <>
                <div className="size-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-700 font-medium">
                  In Stock ({product.stock_quantity} available)
                </span>
              </>
            ) : (
              <>
                <div className="size-2 bg-red-500 rounded-full" />
                <span className="text-sm text-red-700 font-medium">Out of Stock</span>
              </>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Key Information */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b">
            {product.dosage_form && (
              <div>
                <span className="text-sm text-gray-500">Dosage Form</span>
                <p className="font-medium">{product.dosage_form}</p>
              </div>
            )}
            {product.strength && (
              <div>
                <span className="text-sm text-gray-500">Strength</span>
                <p className="font-medium">{product.strength}</p>
              </div>
            )}
            {product.therapeutic_class && (
              <div>
                <span className="text-sm text-gray-500">Therapeutic Class</span>
                <p className="font-medium">{product.therapeutic_class}</p>
              </div>
            )}
            {product.storage_conditions && (
              <div>
                <span className="text-sm text-gray-500">Storage</span>
                <p className="font-medium">{product.storage_conditions}</p>
              </div>
            )}
          </div>

          {/* Quantity and Actions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="quantity" className="font-medium text-gray-700">
                Quantity:
              </label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock_quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={quantity >= product.stock_quantity}
                >
                  +
                </Button>
              </div>
              
              <span className="text-sm text-gray-600">
                Total: ₦{(currentPrice * quantity).toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className="flex-1"
              >
                Add to Cart
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddToBulkOrder}
                disabled={product.stock_quantity <= 0}
                className="flex-1"
              >
                Add to Bulk Order
              </Button>
            </div>

            {product.requires_prescription && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <svg className="size-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Prescription Required</p>
                  <p className="text-yellow-700">
                    You will need to upload a valid prescription before checkout.
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
