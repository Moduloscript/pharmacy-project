'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@ui/lib';
import { StarIcon } from '@heroicons/react/20/solid';
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

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ProductCardTailwind({ 
  product, 
  showWholesalePrice = false, 
  onAddToCart,
  className 
}: ProductCardProps) {
  const stockQuantity = product?.stock_quantity ?? 0;
  const stockStatus = getStockStatus(stockQuantity);
  
  const wholesalePrice = product?.wholesale_price ?? 0;
  const retailPrice = product?.retail_price ?? 0;
  const price = showWholesalePrice ? wholesalePrice : retailPrice;
  
  // Mock rating data (you can replace with actual data from API)
  const rating = 4.5; // Average rating
  const reviewCount = Math.floor(Math.random() * 50) + 10; // Random review count for demo

  return (
    <div className={cn("group relative border-r border-b border-border p-4 sm:p-6", className)}>
      {/* Product Image */}
      <div className="relative">
        {product.image_url ? (
          <img
            alt={product.name}
            src={product.image_url}
            className="aspect-square rounded-lg bg-muted object-cover group-hover:opacity-75"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : (
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
              />
            </svg>
          </div>
        )}
        
        {/* Placeholder for broken images */}
        <div 
          className="aspect-square rounded-lg bg-muted flex items-center justify-center" 
          style={{ display: 'none' }}
        >
          <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
            />
          </svg>
        </div>
        
        {/* Status Badges - positioned on the image */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_prescription_required && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Rx
            </span>
          )}
          {stockQuantity === 0 && (
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
              Out of Stock
            </span>
          )}
          {stockQuantity > 0 && stockQuantity <= 10 && (
            <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/10">
              Low Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Details Section - Centered like template */}
      <div className="pt-10 pb-4 text-center text-foreground">
        <h3 className="text-sm font-medium text-gray-900">
          <Link href={`/app/products/${product.id}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </Link>
        </h3>
        
        {/* Star Rating */}
        <div className="mt-3 flex flex-col items-center">
          <p className="sr-only">{rating} out of 5 stars</p>
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((index) => (
              <StarIcon
                key={index}
                aria-hidden="true"
                className={classNames(
                  rating > index ? 'text-yellow-400' : 'text-gray-200',
                  'size-5 shrink-0',
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-gray-500">{reviewCount} reviews</p>
        </div>
        
        {/* Price */}
        <p className="mt-4 text-base font-medium text-gray-900">
          {formatPrice(price)}
          {showWholesalePrice && retailPrice !== wholesalePrice && (
            <span className="ml-2 text-sm text-gray-500 line-through">
              {formatPrice(retailPrice)}
            </span>
          )}
        </p>
        
        {/* Additional Info */}
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            {product.category}
            {product.brand_name && ` • ${product.brand_name}`}
          </p>
          {product.nafdac_reg_number && (
          <p className="text-xs text-muted-foreground">
              NAFDAC: {product.nafdac_reg_number}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
