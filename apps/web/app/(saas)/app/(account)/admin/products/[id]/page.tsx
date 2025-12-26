import type { Metadata } from "next";
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import ProductHeader from "@saas/admin/components/ProductHeader";
import { ProductTabs } from "@saas/admin/components/ProductTabs";
import { AdminPageContainer } from "@saas/admin/components/AdminPageContainer";

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
			<AdminPageContainer maxWidth="5xl">
				<Card className="p-8 text-center">
					<h1 className="text-xl font-semibold">Product not found</h1>
					<p className="text-muted-foreground mt-2">ID: {id}</p>
					<div className="mt-6 flex items-center gap-2 justify-center">
						<Link href="/app/admin/inventory">
							<Button variant="outline">Back to Inventory</Button>
						</Link>
					</div>
				</Card>
			</AdminPageContainer>
		);
	}

	const product = data;

	return (
		<AdminPageContainer maxWidth="6xl">
			<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
				<div className="md:col-span-4">
					<ProductHeader product={product} id={id} />
				</div>
				<div className="md:col-span-8">
					<ProductTabs product={product} id={id} />
				</div>
			</div>
		</AdminPageContainer>
	);
}
