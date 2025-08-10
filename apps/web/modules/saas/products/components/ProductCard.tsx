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
  const stockStatus = getStockStatus(product.stock_quantity);
  const prescriptionBadge = getPrescriptionBadge(product.is_prescription_required);
  
  const price = showWholesalePrice ? product.wholesale_price : product.retail_price;
  const priceLabel = showWholesalePrice ? 'Wholesale' : 'Retail';

  return (
    <Card className={cn('group overflow-hidden transition-all hover:shadow-lg', className)}>
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-gray-100">
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
            className="flex size-full items-center justify-center bg-gray-200" 
            style={{ display: product.image_url ? 'none' : 'flex' }}
          >
            <div className="text-center text-gray-500">
              <div className="mb-2 size-12 mx-auto rounded-full bg-gray-300" />
              <p className="text-sm">No Image</p>
            </div>
          </div>
        </div>

        {/* Stock Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className={cn('text-xs', stockStatus.className)}
          >
            {stockStatus.label}
          </Badge>
        </div>

        {/* Prescription Badge */}
        {product.is_prescription_required && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="outline" 
              className={cn('text-xs', prescriptionBadge.className)}
            >
              Rx
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Product Name and Generic */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">
            <Link 
              href={`/app/products/${product.id}`}
              className="hover:text-primary transition-colors"
            >
              {product.name}
            </Link>
          </h3>
          {product.generic_name && (
            <p className="text-sm text-gray-600 line-clamp-1">
              Generic: {product.generic_name}
            </p>
          )}
          {product.brand_name && (
            <p className="text-sm text-gray-600 line-clamp-1">
              Brand: {product.brand_name}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
        </div>

        {/* NAFDAC Registration */}
        {product.nafdac_reg_number && (
          <div className="mb-2">
            <p className="text-xs text-gray-600">
              NAFDAC: {product.nafdac_reg_number}
            </p>
          </div>
        )}

        {/* Pricing */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(price)}
              </p>
              <p className="text-xs text-gray-600">{priceLabel} Price</p>
            </div>
            {showWholesalePrice && (
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Retail: {formatPrice(product.retail_price)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Minimum Order Quantity */}
        {product.min_order_qty > 1 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600">
              Min. Order: {product.min_order_qty} units
            </p>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
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
              className="flex-1"
              disabled={product.stock_quantity === 0}
              onClick={() => onAddToCart(product)}
            >
              {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
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
