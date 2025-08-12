'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { cn } from '@ui/lib';
import { 
  Product, 
  formatPrice, 
  getStockStatus, 
  getPrescriptionBadge 
} from '../lib/api';
import { 
  Package, 
  Shield, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Star,
  Heart
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  showWholesalePrice?: boolean;
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export function ProductCard({ 
  product, 
  showWholesalePrice = false, 
  onAddToCart,
  className 
}: ProductCardProps) {
  // Validate product object and provide defaults
  const stockQuantity = product?.stock_quantity ?? 0;
  const stockStatus = getStockStatus(stockQuantity);
  const prescriptionBadge = getPrescriptionBadge(product?.is_prescription_required ?? false);
  
  // Ensure prices are valid numbers, default to 0 if undefined/null
  const wholesalePrice = product?.wholesale_price ?? 0;
  const retailPrice = product?.retail_price ?? 0;
  const price = showWholesalePrice ? wholesalePrice : retailPrice;
  const priceLabel = showWholesalePrice ? 'Wholesale' : 'Retail';

  return (
    <Card className={cn(
      'group overflow-hidden rounded-xl transition-all duration-300',
      'bg-white dark:bg-gray-800/95',
      'border border-gray-200 dark:border-gray-700/50',
      'hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-black/30',
      'hover:border-blue-300 dark:hover:border-blue-600/50',
      'hover:-translate-y-1',
      className
    )}>
      <div className="relative">
        {/* Product Image with Gradient Overlay */}
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-t-xl">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={300}
              height={300}
              className="size-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                console.error('Failed to load product image:', {
                  src: product.image_url,
                  productId: product.id,
                  productName: product.name,
                  error: e
                });
                // Hide broken image and show placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className="flex size-full items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700" 
            style={{ display: product.image_url ? 'none' : 'flex' }}
          >
            <div className="text-center">
              <Package className="size-16 mx-auto text-blue-400 dark:text-blue-500 opacity-50" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No Image</p>
            </div>
          </div>
        </div>

        {/* Stock Status Badge with Enhanced Styling */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className={cn(
              'text-xs font-medium shadow-sm backdrop-blur-sm',
              stockQuantity > 10 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300 border-green-200 dark:border-green-700'
                : stockQuantity > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-300 border-red-200 dark:border-red-700'
            )}
          >
            {stockQuantity > 10 ? (
              <><CheckCircle className="size-3 inline mr-1" />{stockStatus.label}</>
            ) : stockQuantity > 0 ? (
              <><Clock className="size-3 inline mr-1" />Low Stock</>
            ) : (
              <><AlertCircle className="size-3 inline mr-1" />Out of Stock</>
            )}
          </Badge>
        </div>

        {/* Prescription Badge with Medical Icon */}
        {product.is_prescription_required && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="outline" 
              className="text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-sm backdrop-blur-sm"
            >
              <Shield className="size-3 inline mr-1" />
              Rx
            </Badge>
          </div>
        )}
        
        {/* Discount Badge if applicable */}
        {wholesalePrice < retailPrice && showWholesalePrice && (
          <div className="absolute bottom-2 right-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-md">
              <TrendingUp className="size-3 inline mr-1" />
              {Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100)}% OFF
            </Badge>
          </div>
        )}
      </div>

      <div className="p-5 lg:p-6 space-y-3">
        {/* Product Name and Generic with Better Typography */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
            <Link 
              href={`/app/products/${product.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {product.name}
            </Link>
          </h3>
          {product.generic_name && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              <span className="text-gray-500 dark:text-gray-500">Generic:</span> {product.generic_name}
            </p>
          )}
          {product.brand_name && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium line-clamp-1">
              {product.brand_name}
            </p>
          )}
        </div>

        {/* Category with Enhanced Styling */}
        <div>
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700"
          >
            {product.category}
          </Badge>
        </div>

        {/* NAFDAC Registration with Trust Badge */}
        {product.nafdac_reg_number && (
          <div className="flex items-center gap-1">
            <Shield className="size-3 text-green-600 dark:text-green-400" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              NAFDAC: <span className="font-medium text-green-700 dark:text-green-400">{product.nafdac_reg_number}</span>
            </p>
          </div>
        )}

        {/* Enhanced Pricing Display */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
                {formatPrice(price)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {priceLabel} Price
              </p>
            </div>
            {showWholesalePrice && wholesalePrice < retailPrice && (
              <div className="text-right">
                <p className="text-sm line-through text-gray-500 dark:text-gray-500">
                  {formatPrice(retailPrice)}
                </p>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Save ₦{(retailPrice - wholesalePrice).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Minimum Order Quantity with Icon */}
        {product.min_order_qty > 1 && (
          <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-3" />
            <p className="font-medium">
              Min. Order: {product.min_order_qty} units
            </p>
          </div>
        )}

        {/* Description with Better Readability */}
        {product.description && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:border-blue-600 transition-all"
            asChild
          >
            <Link href={`/app/products/${product.id}`}>
              View Details
            </Link>
          </Button>
          
          {onAddToCart && (
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "flex-1 font-medium shadow-sm transition-all",
                stockQuantity > 0
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-400 dark:hover:to-emerald-400 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              )}
              disabled={stockQuantity === 0}
              onClick={() => onAddToCart(product)}
            >
              {stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          )}
        </div>
        
        {/* Trust Indicators */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="size-3 text-yellow-500" fill="currentColor" />
              4.5
            </span>
            <span className="flex items-center gap-1">
              <Heart className="size-3 text-red-500" />
              234
            </span>
          </div>
          {product.is_featured && (
            <Badge className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300 border-0">
              Featured
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// Compact version for search results
export function ProductCardCompact({ product, onAddToCart }: ProductCardProps) {
  const stockStatus = getStockStatus(product.stock_quantity);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="size-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={64}
            height={64}
            className="size-full object-cover"
            onError={(e) => {
              console.error('Failed to load compact product image:', {
                src: product.image_url,
                productId: product.id,
                productName: product.name
              });
              // Hide broken image and show placeholder
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div 
          className="flex size-full items-center justify-center bg-gray-200" 
          style={{ display: product.image_url ? 'none' : 'flex' }}
        >
          <div className="size-6 rounded-full bg-gray-300" />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">
          <Link 
            href={`/app/products/${product.id}`}
            className="hover:text-primary transition-colors"
          >
            {product.name}
          </Link>
        </h4>
        <p className="text-sm text-gray-600 truncate">
          {product.category}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-gray-900">
            {formatPrice(product.retail_price)}
          </span>
          <Badge 
            variant="secondary" 
            className={cn('text-xs', stockStatus.className)}
          >
            {stockStatus.status === 'in-stock' ? 'In Stock' : stockStatus.label}
          </Badge>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        {onAddToCart ? (
          <Button
            size="sm"
            disabled={product.stock_quantity === 0}
            onClick={() => onAddToCart(product)}
          >
            Add to Cart
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/products/${product.id}`}>
              View
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
