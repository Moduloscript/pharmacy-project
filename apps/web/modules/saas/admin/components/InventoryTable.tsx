"use client";

import { useMemo, useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib";
import {
	SearchIcon,
	FilterIcon,
	RefreshCwIcon,
	EyeIcon,
	EditIcon,
	AlertTriangleIcon,
	XCircleIcon,
	PackageIcon,
	PlusIcon,
	TrendingDownIcon,
} from "lucide-react";
import Link from "next/link";
import { SupabaseImage } from "@/components/ui/supabase-image";

// Types
interface Product {
	id: string;
	name: string;
	genericName?: string;
	brandName?: string;
	category: string;
	description?: string;
	imageUrl?: string;
	wholesalePrice: number;
	retailPrice: number;
	stockQuantity: number;
	minOrderQty: number;
	isPrescriptionRequired: boolean;
	nafdacNumber?: string;
	nafdacRegNumber?: string; // temporary alias support
	// Optional fields that may come from server as we evolve
	lowStockThreshold?: number;
	stockStatus?: "out_of_stock" | "low_stock" | "in_stock";
	createdAt: string;
	updatedAt: string;
}

interface InventoryFilters {
	search: string;
	category: string;
	stockStatus: string;
	showFilters: boolean;
}

// Jotai atoms for state management
const inventoryFiltersAtom = atomWithStorage<InventoryFilters>(
	"admin-inventory-filters",
	{
		search: "",
		category: "all",
		stockStatus: "all",
		showFilters: false,
	},
);

// API functions
const fetchProducts = async (): Promise<Product[]> => {
	const response = await fetch("/api/admin/products");
	if (!response.ok) {
		throw new Error("Failed to fetch products");
	}
	return response.json();
};

const updateProductStock = async ({
	productId,
	stockQuantity,
}: {
	productId: string;
	stockQuantity: number;
}): Promise<Product> => {
	const response = await fetch(`/api/admin/products/${productId}/stock`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ stockQuantity }),
	});

	if (!response.ok) {
		throw new Error("Failed to update stock");
	}
	return response.json();
};

const bulkUpdateStock = async (
	updates: Array<{ id: string; stockQuantity: number }>,
) => {
	const response = await fetch("/api/admin/products/bulk-update", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ updates }),
	});

	if (!response.ok) {
		throw new Error("Failed to update stock");
	}
	return response.json();
};

// Custom hooks
const useProducts = () => {
	return useQuery({
		queryKey: ["admin", "inventory", "products"],
		queryFn: fetchProducts,
		staleTime: 30 * 1000, // 30 seconds
		refetchInterval: 60 * 1000, // 1 minute
	});
};

const useUpdateStock = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateProductStock,
		// Optimistic updates: update cache immediately for a snappy UI,
		// rollback on error and refetch on settle to ensure consistency.
		onMutate: async ({
			productId,
			stockQuantity,
		}: {
			productId: string;
			stockQuantity: number;
		}) => {
			await queryClient.cancelQueries({
				queryKey: ["admin", "inventory", "products"],
			});

			const previous = queryClient.getQueryData<Product[]>([
				"admin",
				"inventory",
				"products",
			]);

			if (previous) {
				const next = previous.map((p) => {
					if (p.id !== productId) {
						return p;
					}
					// compute provisional stockStatus using same logic as server
					const lowStockThreshold =
						(typeof (p as any).lowStockThreshold === "number"
							? (p as any).lowStockThreshold
							: undefined) ?? 10;
					let stockStatus: "out_of_stock" | "low_stock" | "in_stock";
					if (stockQuantity === 0) {
						stockStatus = "out_of_stock";
					} else if (stockQuantity <= lowStockThreshold) {
						stockStatus = "low_stock";
					} else {
						stockStatus = "in_stock";
					}

					return {
						...p,
						stockQuantity,
						stockStatus,
						lowStockThreshold,
					} as Product;
				});

				queryClient.setQueryData(
					["admin", "inventory", "products"],
					next,
				);
			}

			return { previous };
		},
		onError: (err: any, _vars, context: any) => {
			if (context?.previous) {
				queryClient.setQueryData(
					["admin", "inventory", "products"],
					context.previous,
				);
			}
			alert(`Failed to update stock: ${err?.message || err}`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["admin", "inventory", "products"],
			});
		},
	});
};

const useBulkUpdateStock = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: bulkUpdateStock,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["admin", "inventory", "products"],
			});
		},
		onError: (error) => {
			alert(`Failed to bulk update stock: ${error.message}`);
		},
	});
};

interface InventoryTableProps {
	className?: string;
}

export function InventoryTable({ className }: InventoryTableProps) {
	const [filters, setFilters] = useAtom(inventoryFiltersAtom);
	const queryClient = useQueryClient();

	// React Query hooks
	const { data: products = [], isLoading, error, refetch } = useProducts();

	const updateStockMutation = useUpdateStock();
	const bulkUpdateMutation = useBulkUpdateStock();

	// Calculate inventory stats and filter products
	const { filteredProducts, inventoryStats } = useMemo(() => {
		let filtered = products;

		// Apply search filter
		if (filters.search.trim()) {
			const term = filters.search.toLowerCase();
			filtered = filtered.filter(
				(product) =>
					product.name.toLowerCase().includes(term) ||
					product.genericName?.toLowerCase().includes(term) ||
					product.brandName?.toLowerCase().includes(term) ||
					product.category.toLowerCase().includes(term) ||
					(product.nafdacNumber || product.nafdacRegNumber)
						?.toLowerCase()
						.includes(term),
			);
		}

		// Apply category filter
		if (filters.category !== "all") {
			filtered = filtered.filter(
				(product) =>
					product.category.toLowerCase() === filters.category,
			);
		}

		// Apply stock status filter (prefer server-provided stockStatus)
		if (filters.stockStatus !== "all") {
			switch (filters.stockStatus) {
				case "out_of_stock":
					filtered = filtered.filter((product) =>
						product.stockStatus
							? product.stockStatus === "out_of_stock"
							: product.stockQuantity === 0,
					);
					break;
				case "low_stock":
					filtered = filtered.filter((product) => {
						if (product.stockStatus) {
							return product.stockStatus === "low_stock";
						}
						const threshold = product.lowStockThreshold ?? 10;
						return (
							product.stockQuantity > 0 &&
							product.stockQuantity <= threshold
						);
					});
					break;
				case "in_stock":
					filtered = filtered.filter((product) => {
						if (product.stockStatus) {
							return product.stockStatus === "in_stock";
						}
						const threshold = product.lowStockThreshold ?? 10;
						return product.stockQuantity > threshold;
					});
					break;
			}
		}

		// Calculate stats (expiry-related stats removed until server provides data)
		const stats = {
			totalProducts: products.length,
			outOfStock: products.filter((p) => p.stockQuantity === 0).length,
			lowStock: products.filter((p) => {
				const threshold = p.lowStockThreshold ?? 10;
				return p.stockQuantity > 0 && p.stockQuantity <= threshold;
			}).length,
			totalValue: products.reduce(
				(sum, p) => sum + p.stockQuantity * p.wholesalePrice,
				0,
			),
		};

		return { filteredProducts: filtered, inventoryStats: stats };
	}, [products, filters]);

	// Filter update helpers
	const updateFilter = (
		key: keyof InventoryFilters,
		value: string | boolean,
	) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const clearFilters = () => {
		setFilters({
			search: "",
			category: "all",
			stockStatus: "all",
			showFilters: false,
		});
	};

	const handleStockUpdate = (productId: string, newStock: number) => {
		updateStockMutation.mutate({ productId, stockQuantity: newStock });
	};

	const handleRefresh = () => {
		queryClient.invalidateQueries({
			queryKey: ["admin", "inventory", "products"],
		});
		refetch();
	};

	// Local controlled input for product stock with save-on-blur/Enter UX.
	const ProductStockInput = ({ product }: { product: Product }) => {
		const [value, setValue] = useState<string>(
			String(product.stockQuantity),
		);
		const [isSaving, setIsSaving] = useState(false);

		useEffect(() => {
			setValue(String(product.stockQuantity));
		}, [product.stockQuantity]);

		const save = (val?: string) => {
			const str = val ?? value;
			const parsed = Number.parseInt(str, 10);
			const next = Number.isNaN(parsed) ? 0 : parsed;
			if (next === product.stockQuantity) {
				return;
			}
			setIsSaving(true);
			updateStockMutation.mutate(
				{ productId: product.id, stockQuantity: next },
				{
					onError: () => {
						setValue(String(product.stockQuantity));
						setIsSaving(false);
					},
					onSettled: () => {
						setIsSaving(false);
					},
				},
			);
		};

		return (
			<div className="flex items-center space-x-2">
				<Input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onBlur={() => save()}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							(e.target as HTMLInputElement).blur();
							save();
						}
					}}
					className="w-24"
				/>
				{isSaving ? (
					<span className="text-xs text-gray-500">Saving...</span>
				) : null}
			</div>
		);
	};

	// Utility functions
	const getStockStatusColor = (product: Product) => {
		if (product.stockStatus) {
			return product.stockStatus === "out_of_stock"
				? "bg-red-100 text-red-800"
				: product.stockStatus === "low_stock"
					? "bg-yellow-100 text-yellow-800"
					: "bg-green-100 text-green-800";
		}
		const threshold = product.lowStockThreshold ?? 10;
		if (product.stockQuantity === 0) {
			return "bg-red-100 text-red-800";
		}
		if (product.stockQuantity <= threshold) {
			return "bg-yellow-100 text-yellow-800";
		}
		return "bg-green-100 text-green-800";
	};

	const getStockStatus = (product: Product) => {
		if (product.stockStatus) {
			return product.stockStatus === "out_of_stock"
				? "Out of Stock"
				: product.stockStatus === "low_stock"
					? "Low Stock"
					: "In Stock";
		}
		const threshold = product.lowStockThreshold ?? 10;
		if (product.stockQuantity === 0) {
			return "Out of Stock";
		}
		if (product.stockQuantity <= threshold) {
			return "Low Stock";
		}
		return "In Stock";
	};

	const getExpiryStatus = (expiryDate?: string) => {
		if (!expiryDate) {
			return null;
		}

		const expiry = new Date(expiryDate);
		const now = new Date();
		const thirtyDaysFromNow = new Date();
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

		if (expiry < now) {
			return { status: "Expired", color: "bg-red-100 text-red-800" };
		}
		if (expiry <= thirtyDaysFromNow) {
			return {
				status: "Expiring Soon",
				color: "bg-yellow-100 text-yellow-800",
			};
		}
		return { status: "Fresh", color: "bg-green-100 text-green-800" };
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	// Error state
	if (error) {
		return (
			<Card className="p-6 bg-red-50 border-red-200">
				<div className="flex items-center space-x-3">
					<XCircleIcon className="size-5 text-red-600" />
					<div>
						<h3 className="font-semibold text-red-900">
							Failed to load inventory
						</h3>
						<p className="text-sm text-red-700 mt-1">
							{error.message}
						</p>
						<Button
							variant="outline"
							onClick={handleRefresh}
							className="mt-3"
							size="sm"
						>
							Try Again
						</Button>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<div className={cn("space-y-6", className)}>
			{/* Inventory Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<Card className="p-6">
					<div className="flex items-center space-x-3">
						<PackageIcon className="size-8 text-blue-600" />
						<div>
							<p className="text-sm font-medium text-gray-600">
								Total Products
							</p>
							<p className="text-2xl font-bold text-gray-900">
								{inventoryStats.totalProducts}
							</p>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center space-x-3">
						<AlertTriangleIcon className="size-8 text-red-600" />
						<div>
							<p className="text-sm font-medium text-gray-600">
								Out of Stock
							</p>
							<p className="text-2xl font-bold text-red-600">
								{inventoryStats.outOfStock}
							</p>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center space-x-3">
						<TrendingDownIcon className="size-8 text-yellow-600" />
						<div>
							<p className="text-sm font-medium text-gray-600">
								Low Stock
							</p>
							<p className="text-2xl font-bold text-yellow-600">
								{inventoryStats.lowStock}
							</p>
						</div>
					</div>
				</Card>
			</div>

			{/* Search and Filters */}
			<Card className="p-4 sm:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					{/* Search row */}
					<div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
						<div className="relative flex-1">
							<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
							<Input
								placeholder="Search products..."
								value={filters.search}
								onChange={(e) =>
									updateFilter("search", e.target.value)
								}
								className="pl-10 w-full"
							/>
						</div>

						<Button
							variant="outline"
							size="icon"
							className="shrink-0 sm:hidden"
							onClick={() =>
								updateFilter(
									"showFilters",
									!filters.showFilters,
								)
							}
						>
							<FilterIcon className="size-4" />
						</Button>
						<Button
							variant="outline"
							className="hidden sm:inline-flex"
							onClick={() =>
								updateFilter(
									"showFilters",
									!filters.showFilters,
								)
							}
						>
							<FilterIcon className="size-4 mr-2" />
							Filters
						</Button>
					</div>

					{/* Actions row */}
					<div className="flex items-center justify-between gap-2 sm:justify-end">
						<Button
							onClick={handleRefresh}
							size="sm"
							variant="outline"
							disabled={isLoading}
						>
							<RefreshCwIcon
								className={cn(
									"size-4 mr-2",
									isLoading && "animate-spin",
								)}
							/>
							Refresh
						</Button>

						<Link href="/app/admin/products/new">
							<Button size="sm">
								<PlusIcon className="size-4 mr-2" />
								<span className="hidden sm:inline">Add Product</span>
								<span className="sm:hidden">Add</span>
							</Button>
						</Link>
					</div>
				</div>

				{/* Advanced Filters */}
				{filters.showFilters && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
						<div>
							<Label>Category</Label>
							<Select
								value={filters.category}
								onValueChange={(value) =>
									updateFilter("category", value)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Categories
									</SelectItem>
									<SelectItem value="pain_relief">
										Pain Relief
									</SelectItem>
									<SelectItem value="antibiotics">
										Antibiotics
									</SelectItem>
									<SelectItem value="vitamins">
										Vitamins
									</SelectItem>
									<SelectItem value="first_aid">
										First Aid
									</SelectItem>
									<SelectItem value="prescription">
										Prescription
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label>Stock Status</Label>
							<Select
								value={filters.stockStatus}
								onValueChange={(value) =>
									updateFilter("stockStatus", value)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Stock Levels
									</SelectItem>
									<SelectItem value="in_stock">
										In Stock
									</SelectItem>
									<SelectItem value="low_stock">
										Low Stock
									</SelectItem>
									<SelectItem value="out_of_stock">
										Out of Stock
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end">
							<Button variant="outline" onClick={clearFilters}>
								Clear Filters
							</Button>
						</div>
					</div>
				)}
			</Card>

				<Card>
				<div className="p-4 sm:p-6 border-b">
					<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
						<h2 className="text-base sm:text-lg font-semibold">
							Products ({filteredProducts.length} of{" "}
							{products.length})
						</h2>
						<p className="text-xs sm:text-sm text-muted-foreground">
							Total Value:{" "}
							{formatCurrency(inventoryStats.totalValue)}
						</p>
					</div>
				</div>

				{isLoading ? (
					<div className="p-6">
						<div className="space-y-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="animate-pulse">
									<div className="flex items-center space-x-4">
										<div className="h-4 bg-gray-300 rounded w-32" />
										<div className="h-4 bg-gray-300 rounded w-24" />
										<div className="h-4 bg-gray-300 rounded w-16" />
										<div className="h-4 bg-gray-300 rounded w-20" />
									</div>
								</div>
							))}
						</div>
					</div>
				) : filteredProducts.length === 0 ? (
					<div className="p-6 text-center">
						<PackageIcon className="size-12 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-900">
							No products found
						</h3>
						<p className="text-gray-600">
							{filters.search ||
							filters.category !== "all" ||
							filters.stockStatus !== "all"
								? "Try adjusting your search criteria or filters"
								: "No products have been added yet"}
						</p>
					</div>
				) : (
					<>
						{/* Mobile Card View */}
						<div className="lg:hidden p-4 space-y-4">
							{filteredProducts.map((product) => (
								<div key={product.id} className="bg-card rounded-lg border p-4 space-y-3">
									{/* Header with Image and Product Info */}
									<div className="flex gap-3">
										<div className="w-16 h-16 relative rounded-md overflow-hidden bg-gray-100 shrink-0">
											<SupabaseImage
												src={product.imageUrl}
												alt={product.name}
												fill
												className="object-cover rounded-md"
												sizes="64px"
												fallbackIcon={
													<PackageIcon className="w-6 h-6 text-gray-400" />
												}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-sm truncate">{product.name}</p>
											{product.genericName && (
												<p className="text-xs text-muted-foreground truncate">{product.genericName}</p>
											)}
											<div className="flex items-center gap-2 mt-1 flex-wrap">
												<Badge className="bg-gray-100 text-gray-800 text-xs">
													{product.category}
												</Badge>
												<Badge className={cn(getStockStatusColor(product), "text-xs")}>
													{getStockStatus(product)}
												</Badge>
											</div>
										</div>
									</div>

									{/* Stock and Price Info */}
									<div className="grid grid-cols-2 gap-3 py-2 border-y">
										<div>
											<p className="text-xs text-muted-foreground">Stock</p>
											<p className="text-sm font-semibold">{product.stockQuantity} units</p>
										</div>
										<div>
											<p className="text-xs text-muted-foreground">Retail Price</p>
											<p className="text-sm font-medium">{formatCurrency(product.retailPrice)}</p>
										</div>
										<div>
											<p className="text-xs text-muted-foreground">Wholesale</p>
											<p className="text-sm">{formatCurrency(product.wholesalePrice)}</p>
										</div>
										{(product.nafdacNumber || product.nafdacRegNumber) && (
											<div>
												<p className="text-xs text-muted-foreground">NAFDAC</p>
												<p className="text-xs font-mono truncate">{product.nafdacNumber || product.nafdacRegNumber}</p>
											</div>
										)}
									</div>

									{/* Actions */}
									<div className="flex flex-wrap gap-2 pt-1">
										<Link href={`/app/admin/products/${product.id}`} className="flex-1 min-w-[80px]">
											<Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
												<EyeIcon className="size-3 sm:size-4 mr-1 sm:mr-2" />
												View
											</Button>
										</Link>
										<Link href={`/app/admin/products/${product.id}/edit`} className="flex-1 min-w-[80px]">
											<Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
												<EditIcon className="size-3 sm:size-4 mr-1 sm:mr-2" />
												Edit
											</Button>
										</Link>
										<Link href={`/app/admin/products/${product.id}/movements#adjust`} className="flex-1 min-w-[80px]">
											<Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
												Adjust
											</Button>
										</Link>
									</div>
								</div>
							))}
						</div>

						{/* Desktop Table View */}
						<div className="hidden lg:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Image</TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Stock</TableHead>
										<TableHead>Prices</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredProducts.map((product) => {
										return (
											<TableRow key={product.id}>
												<TableCell>
													<div className="w-16 h-16 relative rounded-md overflow-hidden bg-gray-100">
														<SupabaseImage
															src={product.imageUrl}
															alt={product.name}
															fill
															className="object-cover rounded-md"
															sizes="64px"
															fallbackIcon={
																<PackageIcon className="w-8 h-8 text-gray-400" />
															}
														/>
													</div>
												</TableCell>
												<TableCell>
													<div>
														<p className="font-medium">
															{product.name}
														</p>
														{product.genericName && (
															<p className="text-sm text-gray-600">
																{product.genericName}
															</p>
														)}
														{(product.nafdacNumber ||
															product.nafdacRegNumber) && (
															<p className="text-xs text-gray-500">
																NAFDAC:{" "}
																{product.nafdacNumber ||
																	product.nafdacRegNumber}
															</p>
														)}
													</div>
												</TableCell>

												<TableCell>
													<Badge className="bg-gray-100 text-gray-800">
														{product.category}
													</Badge>
												</TableCell>

												<TableCell>
													<div className="space-y-1">
														<p className="font-semibold">
															{product.stockQuantity}
														</p>
														<ProductStockInput
															product={product}
														/>
													</div>
												</TableCell>

												<TableCell>
													<div>
														<p className="text-sm">
															Retail:{" "}
															{formatCurrency(
																product.retailPrice,
															)}
														</p>
														<p className="text-xs text-gray-600">
															Wholesale:{" "}
															{formatCurrency(
																product.wholesalePrice,
															)}
														</p>
													</div>
												</TableCell>

												<TableCell>
													<Badge
														className={getStockStatusColor(
															product,
														)}
													>
														{getStockStatus(product)}
													</Badge>
												</TableCell>

												<TableCell>
													<div className="flex items-center space-x-1">
														<Link
															href={`/app/admin/products/${product.id}`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																<EyeIcon className="size-4" />
															</Button>
														</Link>

														<Link
															href={`/app/admin/products/${product.id}/edit`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																<EditIcon className="size-4" />
															</Button>
														</Link>

														<Link
															href={`/app/admin/products/${product.id}/movements`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																Movements
															</Button>
														</Link>
														<Link
															href={`/app/admin/products/${product.id}/movements#adjust`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																Adjust
															</Button>
														</Link>
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</>
				)}
			</Card>
		</div>
	);
}
