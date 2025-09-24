'use client';

import React from 'react';
import Link from 'next/link';
import { SupabaseImage } from '@/components/ui/supabase-image';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { cn } from '@ui/lib';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
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
  const [bulkRules, setBulkRules] = React.useState<Array<{ minQty: number; discountPercent?: number; unitPrice?: number }> | null>(null);
  const [bulkTooltip, setBulkTooltip] = React.useState<string>('');
  const [hasFetchedRules, setHasFetchedRules] = React.useState(false);

  // Normalize fields (support snake_case and camelCase)
  const stockQuantity = product?.stockQuantity ?? product?.stock_quantity ?? 0;
  const stockStatus = getStockStatus(stockQuantity);
  const isRx = product?.isPrescriptionRequired ?? product?.is_prescription_required ?? false;
  const brandName = product?.brandName ?? product?.brand_name ?? '';
  const genericName = product?.genericName ?? product?.generic_name ?? '';
  const nafdac = product?.nafdacNumber ?? product?.nafdac_reg_number ?? '';
  const minOrderQty = product?.minOrderQuantity ?? product?.min_order_qty ?? 1;

  const wholesalePrice = product?.wholesalePrice ?? product?.wholesale_price ?? 0;
  const retailPrice = product?.retailPrice ?? product?.retail_price ?? 0;
  const price = showWholesalePrice ? wholesalePrice : retailPrice;
  const priceLabel = showWholesalePrice ? 'Wholesale' : 'Retail';

  const imageUrl = product?.imageUrl ?? product?.image_url;

  const formatCategory = (cat: string | undefined) => {
    if (!cat) return '';
    return cat
      .toString()
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card className={cn(
      'group overflow-hidden transition-all duration-200',
      'border border-border hover:shadow-sm hover:-translate-y-0.5',
      className
    )}>
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-muted relative">
          <SupabaseImage
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            fallbackIcon={<Package className="size-12 text-foreground/30" />}
          />
        </div>

        {/* Stock Status */}
        <div className="absolute top-2 left-2">
          <Badge status={stockStatus.status === 'in-stock' ? 'success' : stockStatus.status === 'low-stock' ? 'warning' : 'error'} className="text-xs px-2 py-0.5">
            {stockStatus.label}
          </Badge>
        </div>

        {/* Rx Badge */}
        {isRx && (
          <div className="absolute top-2 right-2">
            <Badge status="error" className="text-xs px-2 py-0.5">Rx</Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Title and meta */}
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            <Link 
              href={`/app/products/${product.id}`}
              className="hover:text-primary transition-colors"
            >
              {product.name}
            </Link>
          </h3>
          {genericName && (
            <p className="text-sm text-foreground/70 line-clamp-1">
              <span className="text-foreground/60">Generic:</span> {genericName}
            </p>
          )}
          {brandName && (
            <p className="text-sm text-primary font-medium line-clamp-1">
              {brandName}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <Badge status="info" className="text-xs">
            {formatCategory(product.category)}
          </Badge>
        </div>

        {/* NAFDAC */}
        {nafdac && (
          <div className="flex items-center gap-1">
            <Shield className="size-3 text-success" />
            <p className="text-xs text-foreground/70">
              NAFDAC: <span className="font-medium text-success">{nafdac}</span>
            </p>
          </div>
        )}

        {/* Pricing */}
        <div className="rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-foreground">
                {formatPrice(price)}
              </p>
              <p className="text-xs text-foreground/70 font-medium">
                {priceLabel} Price
              </p>
            {showWholesalePrice && product.hasBulkRules && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-primary hover:underline"
                        onMouseEnter={async () => {
                          if (hasFetchedRules) return;
                          try {
                            const res = await fetch(`/api/products/${product.id}/bulk-pricing`);
                            const data = await res.json();
                            if (Array.isArray(data?.rules)) {
                              setBulkRules(data.rules);
                              const s = data.rules
                                .slice()
                                .sort((a: any, b: any) => a.minQty - b.minQty)
                                .map((r: any) => `${r.minQty}+ → ${r.unitPrice ? `₦${Number(r.unitPrice).toLocaleString()}/u` : `${r.discountPercent}% off`}`)
                                .join(' | ');
                              setBulkTooltip(s);
                            }
                          } catch {}
                          setHasFetchedRules(true);
                        }}
                      >
                        Bulk tiers
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs break-words">
                      {bulkTooltip || 'No tiers found'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {showWholesalePrice && wholesalePrice < retailPrice && (
              <div className="text-right">
                <p className="text-sm line-through text-foreground/60">
                  {formatPrice(retailPrice)}
                </p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Save ₦{(retailPrice - wholesalePrice).toLocaleString('en-NG')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MOQ */}
        {minOrderQty > 1 && (
          <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-3" />
            <p className="font-medium">
              Min. Order: {minOrderQty} {minOrderQty === 1 ? 'unit' : 'units'}
            </p>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
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
              className={cn(
                "flex-1 font-medium",
                stockQuantity > 0 ? "" : "opacity-50 cursor-not-allowed"
              )}
              disabled={stockQuantity === 0}
              onClick={() => onAddToCart(product)}
            >
              {stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Compact version for search results
export function ProductCardCompact({ product, onAddToCart }: ProductCardProps) {
  const qty = product.stockQuantity ?? product.stock_quantity ?? 0;
  const stock = getStockStatus(qty);
  const imageUrl = product.imageUrl ?? product.image_url;

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="size-16 flex-shrink-0 overflow-hidden rounded bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={64}
            height={64}
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div 
          className="flex size-full items-center justify-center bg-muted" 
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <div className="size-6 rounded-full bg-foreground/10" />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">
          <Link 
            href={`/app/products/${product.id}`}
            className="hover:text-primary transition-colors"
          >
            {product.name}
          </Link>
        </h4>
        <p className="text-sm text-foreground/70 truncate">
          {product.category}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-foreground">
            {formatPrice(product.retailPrice ?? product.retail_price)}
          </span>
          <Badge status={stock.status === 'in-stock' ? 'success' : stock.status === 'low-stock' ? 'warning' : 'error'} className='text-xs'>
            {stock.status === 'in-stock' ? 'In Stock' : stock.label}
          </Badge>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        {onAddToCart ? (
          <Button
            size="sm"
            disabled={qty === 0}
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
