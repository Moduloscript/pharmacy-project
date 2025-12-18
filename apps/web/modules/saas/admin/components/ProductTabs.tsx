"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Card } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { ProductAdjustStockForm } from "./ProductAdjustStockForm";
import { ProductBatchesList } from "./ProductBatchesList";
import { ProductMovementsList } from "./ProductMovementsList";

interface ProductTabsProps {
	product: any;
	id: string;
}

export function ProductTabs({ product, id }: ProductTabsProps) {
	const [activeTab, setActiveTab] = React.useState("details");

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="details">
			<div className="flex flex-col gap-4">
				{/* Mobile Select View */}
				<div className="md:hidden">
					<Select value={activeTab} onValueChange={setActiveTab}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select view" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="details">Details</SelectItem>
							<SelectItem value="adjust">Adjust Stock</SelectItem>
							<SelectItem value="batches">Batches</SelectItem>
							<SelectItem value="movements">Movements</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Desktop Tabs List */}
				<div className="hidden md:block">
					<TabsList>
						<TabsTrigger value="details">Details</TabsTrigger>
						<TabsTrigger value="adjust">Adjust Stock</TabsTrigger>
						<TabsTrigger value="batches">Batches</TabsTrigger>
						<TabsTrigger value="movements">Movements</TabsTrigger>
					</TabsList>
				</div>
			</div>

			<div className="mt-6">
				<TabsContent value="details" className="m-0">
					<Card className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-2">
								<h2 className="font-medium">Stock</h2>
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
							<div className="space-y-2">
								<h2 className="font-medium">Prices</h2>
								<p>
									Retail: ₦
									{Number(
										product.retailPrice || 0,
									).toLocaleString()}
								</p>
								<p className="text-muted-foreground text-sm">
									Wholesale: ₦
									{Number(
										product.wholesalePrice || 0,
									).toLocaleString()}
								</p>
							</div>
							<div className="space-y-2">
								<h2 className="font-medium">Status</h2>
								<div>
									<Badge status="info">
										{product.category}
									</Badge>
								</div>
							</div>
						</div>
					</Card>
				</TabsContent>

				<TabsContent value="adjust" className="m-0">
					<ProductAdjustStockForm productId={id} />
				</TabsContent>

				<TabsContent value="batches" className="m-0">
					<ProductBatchesList productId={id} />
				</TabsContent>

				<TabsContent value="movements" className="m-0">
					<ProductMovementsList productId={id} />
				</TabsContent>
			</div>
		</Tabs>
	);
}
