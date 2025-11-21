"use client";

import Link from "next/link";
import React from "react";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";

export default function ProductHeader({
	product,
	id,
}: {
	product: any;
	id: string;
}) {
	return (
		<Card className="p-4">
			<div className="flex flex-col gap-4">
				<div>
					<h1 className="text-2xl font-semibold">{product.name}</h1>
					<p className="text-sm text-muted-foreground">
						SKU: {product.sku || "—"}
					</p>
					{product.nafdacNumber && (
						<p className="text-xs text-muted-foreground mt-1">
							NAFDAC: {product.nafdacNumber}
						</p>
					)}
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<h3 className="text-sm font-medium">Stock</h3>
						<p className="text-2xl font-bold">
							{product.stockQuantity}
						</p>
						<div className="text-sm text-muted-foreground">
							Min level:{" "}
							{product.minStockLevel ??
								product.lowStockThreshold ??
								10}
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium">Prices</h3>
						<p>
							Retail: ₦
							{Number(product.retailPrice || 0).toLocaleString()}
						</p>
						<p className="text-sm text-muted-foreground">
							Wholesale: ₦
							{Number(
								product.wholesalePrice || 0,
							).toLocaleString()}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Link href={`/app/admin/products/${id}/edit`}>
						<Button variant="outline">Edit</Button>
					</Link>
					<Link href="/app/admin/inventory">
						<Button variant="secondary">Back to Inventory</Button>
					</Link>
				</div>
			</div>
		</Card>
	);
}
