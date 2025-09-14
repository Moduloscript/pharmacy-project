"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { SupabaseImage } from '@/components/ui/supabase-image';
import { cn } from "@ui/lib";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Product, formatPrice, getStockStatus } from "../lib/api";

interface ProductsTableProps {
  products: Product[];
  onRowClick?: (product: Product) => void;
  density?: "comfortable" | "compact";
  className?: string;
  onDeleteSelected?: (ids: string[]) => void;
  onArchiveSelected?: (ids: string[]) => void;
  onExportSelected?: (ids: string[]) => void;
}

export function ProductsTable({
  products,
  onRowClick,
  density = "comfortable",
  className,
  onDeleteSelected,
  onArchiveSelected,
  onExportSelected,
}: ProductsTableProps) {
  const rowPadding = density === "compact" ? "py-2" : "py-3";
  const cellPaddingX = density === "compact" ? "px-3" : "px-4";

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = useMemo(
    () => products.length > 0 && products.every((p) => selected[p.id]),
    [products, selected]
  );
  const selectedIds = useMemo(
    () => products.filter((p) => selected[p.id]).map((p) => p.id),
    [products, selected]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      products.forEach((p) => (next[p.id] = true));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exportCSV = () => {
    const rows = products
      .filter((p) => selected[p.id])
      .map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brandName ?? p.brand_name ?? "",
        category: p.category,
        price: p.retailPrice ?? p.retail_price ?? 0,
        stock: p.stockQuantity ?? p.stock_quantity ?? 0,
      }));
    const header = Object.keys(rows[0] || { id: "", name: "", brand: "", category: "", price: 0, stock: 0 });
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => String((r as any)[h]).replaceAll(",", ";")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${selectedIds.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-border p-3">
          <div className="text-sm">
            <strong>{selectedIds.length}</strong> selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => (onArchiveSelected ? onArchiveSelected(selectedIds) : undefined)}
              disabled={!onArchiveSelected}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => (onDeleteSelected ? onDeleteSelected(selectedIds) : undefined)}
              disabled={!onDeleteSelected}
            >
              Delete
            </Button>
            <Button size="sm" onClick={() => (onExportSelected ? onExportSelected(selectedIds) : exportCSV())}>
              Export CSV
            </Button>
          </div>
        </div>
      )}

      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className={cn(cellPaddingX, "w-8")}
              aria-label="Select all"
            >
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead className={cn(cellPaddingX)}>Product</TableHead>
            <TableHead className={cn(cellPaddingX)}>Category</TableHead>
            <TableHead className={cn(cellPaddingX, "text-right")}>Price</TableHead>
            <TableHead className={cn(cellPaddingX)}>Stock</TableHead>
            <TableHead className={cn(cellPaddingX)}>Flags</TableHead>
            <TableHead className={cn(cellPaddingX, "w-24 text-right")}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const imageUrl = product.imageUrl ?? product.image_url;
            const retailPrice = product.retailPrice ?? product.retail_price;
            const stockQty = product.stockQuantity ?? product.stock_quantity ?? 0;
            const stock = getStockStatus(stockQty);
            const isRx = product.isPrescriptionRequired ?? product.is_prescription_required;

            return (
              <TableRow
                key={product.id}
                className={cn("cursor-pointer", rowPadding, "hover:bg-muted/50")}
                onClick={() => onRowClick?.(product)}
              >
                {/* Select */}
                <TableCell className={cn(cellPaddingX)} onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={!!selected[product.id]} onCheckedChange={() => toggleOne(product.id)} aria-label={`Select ${product.name}`} />
                </TableCell>

                {/* Product cell */}
                <TableCell className={cn(cellPaddingX)}>
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded bg-muted/50 relative">
                      <SupabaseImage
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        fallbackIcon={<div className="size-6 rounded-full bg-foreground/10" />}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-foreground">{product.name}</div>
                      <div className="text-foreground/60 text-xs truncate">
                        {product.brandName ?? product.brand_name ?? ""}
                        {product.brandName || product.brand_name ? " · " : ""}
                        {product.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell className={cn(cellPaddingX)}>
                  <Badge className="text-xs" status="info">{product.category}</Badge>
                </TableCell>

                {/* Price */}
                <TableCell className={cn(cellPaddingX, "text-right font-semibold")}>{formatPrice(retailPrice)}</TableCell>

                {/* Stock */}
                <TableCell className={cn(cellPaddingX)}>
                  <div className="flex items-center gap-2">
                    <Badge
                      status={stock.status === 'in-stock' ? 'success' : stock.status === 'low-stock' ? 'warning' : 'error'}
                      className="text-xs"
                    >
                      {stock.label}
                    </Badge>
                    <span className="text-foreground/60 text-xs">{stockQty} pcs</span>
                  </div>
                </TableCell>

                {/* Flags */}
                <TableCell className={cn(cellPaddingX)}>
                  <div className="flex items-center gap-1">
                    {isRx ? (
                      <Badge className="text-xs">Rx</Badge>
                    ) : null}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className={cn(cellPaddingX, "text-right")}
                  onClick={(e) => e.stopPropagation()} // prevent row click
                >
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/products/${product.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
