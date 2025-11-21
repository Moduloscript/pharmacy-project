import type { Metadata } from "next";
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import ProductHeader from "@saas/admin/components/ProductHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { ProductAdjustStockForm } from "@saas/admin/components/ProductAdjustStockForm";
import { ProductBatchesList } from "@saas/admin/components/ProductBatchesList";
import { ProductMovementsList } from "@/modules/saas/admin/components/ProductMovementsList";

export const metadata: Metadata = {
	title: "Product Details",
	description: "Admin product details view",
};

async function fetchProduct(id: string) {
	const h = await headers();
	const proto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");
	const host = h.get("host") ?? "localhost:3000";
	const base = process.env.NEXT_PUBLIC_API_URL || `${proto}://${host}`;

	const cookie = h.get("cookie") || "";
	const res = await fetch(`${base}/api/admin/products/${id}`, {
		cache: "no-store",
		headers: { cookie },
	});
	if (!res.ok) {
		return null;
	}
	return res.json();
}

export default async function AdminProductShowPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await getSession();
	if (!session) {
		redirect("/auth/login");
	}
	if (session.user?.role !== "admin") {
		redirect("/app");
	}

	const { id } = await params;
	const data = await fetchProduct(id);

	if (!data) {
		return (
			<div className="container mx-auto px-6 py-12">
				<Card className="p-8 text-center">
					<h1 className="text-xl font-semibold">Product not found</h1>
					<p className="text-muted-foreground mt-2">ID: {id}</p>
					<div className="mt-6 flex items-center gap-2 justify-center">
						<Link href="/app/admin/inventory">
							<Button variant="outline">Back to Inventory</Button>
						</Link>
					</div>
				</Card>
			</div>
		);
	}

	const product = data;

	return (
		<div className="container mx-auto px-6 py-8">
			<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
				<div className="md:col-span-4">
					<ProductHeader product={product} id={id} />
				</div>
				<div className="md:col-span-8">
					<Tabs defaultValue="details">
						<TabsList>
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="adjust">
								Adjust Stock
							</TabsTrigger>
							<TabsTrigger value="batches">Batches</TabsTrigger>
							<TabsTrigger value="movements">
								Movements
							</TabsTrigger>
						</TabsList>

						<TabsContent value="details">
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

						<TabsContent value="adjust">
							<ProductAdjustStockForm productId={id} />
						</TabsContent>
						<TabsContent value="batches">
							<ProductBatchesList productId={id} />
						</TabsContent>
						<TabsContent value="movements">
							<ProductMovementsList productId={id} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
