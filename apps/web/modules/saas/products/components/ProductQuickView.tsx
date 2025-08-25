"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@ui/components/sheet";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { Product, formatPrice } from "../lib/api";

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const imageUrl = product?.imageUrl ?? product?.image_url;
  const brandName = product?.brandName ?? product?.brand_name;
  const nafdac = product?.nafdacNumber ?? product?.nafdac_reg_number;
  const isRx = product?.isPrescriptionRequired ?? product?.is_prescription_required;

  const formatCategory = (cat?: string) => (cat ? cat.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') : '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product?.name ?? "Product"}</SheetTitle>
          {brandName ? (
            <SheetDescription>
              {brandName}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted/50">
            {imageUrl ? (
              <Image src={imageUrl} alt={product?.name ?? ""} width={640} height={480} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <div className="size-12 rounded-full bg-foreground/10" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge status="info" className="text-xs">{formatCategory(product?.category)}</Badge>
              {isRx ? (
                <Badge status="error" className="text-xs">Rx</Badge>
              ) : null}
              {nafdac ? (
                <Badge className="text-xs">NAFDAC: {nafdac}</Badge>
              ) : null}
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {formatPrice(product?.retailPrice ?? product?.retail_price)}
              </div>
              {product?.wholesalePrice || product?.wholesale_price ? (
                <div className="text-foreground/60 text-sm">Wholesale: {formatPrice(product?.wholesalePrice ?? product?.wholesale_price)}</div>
              ) : null}
            </div>
          </div>

          {product?.description ? (
            <p className="text-sm leading-relaxed text-foreground/80">{product.description}</p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href={`/app/products/${product?.id}`}>Edit</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/app/products/${product?.id}`}>View details</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
