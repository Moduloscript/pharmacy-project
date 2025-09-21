"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { OrganizationsGrid } from "@saas/organizations/components/OrganizationsGrid";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@ui/lib";
import {
	PackageIcon,
	ShoppingCartIcon,
	ClipboardListIcon,
	UserIcon,
	SettingsIcon,
	TrendingUpIcon,
	PillIcon,
	SearchIcon,
	BadgeIcon,
	SparklesIcon,
	BellIcon,
	HeartIcon,
	TruckIcon,
	ShieldCheckIcon,
	Clock3Icon,
	StarIcon,
	ActivityIcon,
	ArrowRightIcon,
	ZapIcon,
	PercentIcon
} from "lucide-react";

export default function UserStart() {
	const t = useTranslations();
	const { user } = useSession();

	// Show organization management for multi-tenant SaaS if enabled
	if (config.organizations.enable) {
		return (
			<div>
				<OrganizationsGrid />

				<Card className="mt-6">
					<div className="flex h-64 items-center justify-center p-8 text-foreground/60">
						Place your content here...
					</div>
				</Card>
			</div>
		);
	}

	// State for animations and interactions
	const [greeting, setGreeting] = useState("");
	const [hoveredCard, setHoveredCard] = useState<string | null>(null);
	const [cartItemCount] = useState(3); // Mock cart count
	const [hasNewOrders] = useState(true); // Mock notification

	// Dynamic greeting based on time
	useEffect(() => {
		const hour = new Date().getHours();
		if (hour < 12) setGreeting("Good morning");
		else if (hour < 17) setGreeting("Good afternoon");
		else setGreeting("Good evening");
	}, []);

	// BenPharm Nigerian Pharmaceutical Dashboard - Enhanced UX with Dark Mode Support
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			{/* Main Container with Proper Padding */}
			<div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 lg:py-10 space-y-10 animate-in fade-in duration-500">
				{/* Enhanced Hero Welcome Section with Dark Mode */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-teal-400 dark:from-blue-800 dark:via-blue-700 dark:to-teal-700 p-10 lg:p-12 text-white shadow-2xl dark:shadow-black/50">
					{/* Animated background pattern */}
					<div className="absolute inset-0 opacity-10">
						<div className="absolute -left-4 -top-4 h-72 w-72 animate-pulse rounded-full bg-white/20 blur-3xl" />
						<div className="absolute -bottom-8 -right-8 h-96 w-96 animate-pulse rounded-full bg-white/20 blur-3xl delay-700" />
					</div>
					
					<div className="relative z-10">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
							<div className="flex-1">
								{/* Animated greeting */}
								<div className="mb-2 flex items-center gap-2">
									<SparklesIcon className="h-5 w-5 animate-pulse text-yellow-300" />
									<span className="text-sm font-medium text-blue-100">
										{greeting}, {user?.name?.split(' ')[0] || 'there'}!
									</span>
								</div>
								
								<h1 className="mb-3 text-4xl font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
									Welcome to BenPharm
								</h1>
								<p className="max-w-lg text-lg text-blue-100">
									Your trusted partner for pharmaceutical excellence in Nigeria. 
									Fast delivery, authentic medicines, best prices.
								</p>
								
								{/* Quick stats */}
								<div className="mt-6 flex flex-wrap gap-6">
									<div className="flex items-center gap-2">
										<TruckIcon className="h-5 w-5 text-green-300" />
										<span className="text-sm">Same-day delivery</span>
									</div>
									<div className="flex items-center gap-2">
										<ShieldCheckIcon className="h-5 w-5 text-green-300" />
										<span className="text-sm">100% Authentic</span>
									</div>
									<div className="flex items-center gap-2">
										<StarIcon className="h-5 w-5 text-yellow-300" />
										<span className="text-sm">Trusted by 5000+ pharmacies</span>
									</div>
								</div>
							</div>
							
						{/* User info card */}
						<div className="rounded-xl bg-white/10 backdrop-blur-sm p-5 border border-white/20">
								<div className="flex items-center gap-4">
									<div className="relative">
										<div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
											<UserIcon className="h-8 w-8" />
										</div>
										{hasNewOrders && (
											<div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
										)}
									</div>
									<div>
										<div className="text-xs text-blue-200 uppercase tracking-wider">Account Type</div>
										<div className="font-semibold text-lg">
											{user?.customerType === 'wholesale' ? (
												<Badge className="bg-yellow-400 text-yellow-900">Wholesale Partner</Badge>
											) : (
												<Badge className="bg-blue-400 text-blue-900">Retail Customer</Badge>
											)}
										</div>
										<div className="mt-1 text-xs text-blue-200">
											Member since {new Date().getFullYear()}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions Section with Enhanced UX */}
				<div className="space-y-8">
					{/* Section Header with Better Alignment */}
					<div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
								<ZapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quick Actions</h2>
						</div>
						{cartItemCount > 0 && (
							<Badge className="bg-orange-500 dark:bg-orange-600 text-white font-semibold px-3 py-1.5 text-sm border-0 shadow-md">
								{cartItemCount} ITEMS IN CART
							</Badge>
						)}
					</div>

					{/* Action Cards Grid with Better Spacing */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* Browse Products - Primary Action */}
						<Link href="/app/products">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 bg-white dark:bg-gray-800 transition-all duration-300 hover:border-green-400 dark:hover:border-green-500 hover:shadow-xl dark:border-gray-700",
									hoveredCard === 'products' && 'scale-105 shadow-xl border-green-400 dark:border-green-500'
								)}
								onMouseEnter={() => setHoveredCard('products')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								{/* Gradient background on hover */}
								<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-7">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-600 dark:to-emerald-700 rounded-xl shadow-lg">
											<PackageIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Browse Products</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Explore 10,000+ authentic medicines
									</p>
									<div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
										<SparklesIcon className="h-3 w-3" />
										New arrivals daily
									</div>
								</div>
							</Card>
						</Link>

						{/* Shopping Cart with Item Count */}
						<Link href="/app/cart">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 bg-white dark:bg-gray-800 transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl dark:border-gray-700",
									hoveredCard === 'cart' && 'scale-105 shadow-xl border-blue-400 dark:border-blue-500'
								)}
								onMouseEnter={() => setHoveredCard('cart')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="relative">
											<div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 rounded-xl shadow-lg">
												<ShoppingCartIcon className="h-7 w-7 text-white" />
											</div>
											{cartItemCount > 0 && (
												<div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 dark:bg-red-600 rounded-full flex items-center justify-center animate-bounce">
													<span className="text-xs text-white font-bold">{cartItemCount}</span>
												</div>
											)}
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Shopping Cart</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Review and checkout items
									</p>
									{cartItemCount > 0 ? (
										<div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
											<ActivityIcon className="h-3 w-3" />
											Ready to checkout
										</div>
									) : (
										<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
											Cart is empty
										</div>
									)}
								</div>
							</Card>
						</Link>

						{/* Order History with Notification */}
						<Link href="/app/orders">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 bg-white dark:bg-gray-800 transition-all duration-300 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xl dark:border-gray-700",
									hoveredCard === 'orders' && 'scale-105 shadow-xl border-purple-400 dark:border-purple-500'
								)}
								onMouseEnter={() => setHoveredCard('orders')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="relative">
											<div className="p-3 bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700 rounded-xl shadow-lg">
												<ClipboardListIcon className="h-7 w-7 text-white" />
											</div>
											{hasNewOrders && (
												<div className="absolute -top-2 -right-2">
													<div className="h-2 w-2 bg-red-500 dark:bg-red-400 rounded-full animate-ping absolute" />
													<div className="h-2 w-2 bg-red-500 dark:bg-red-400 rounded-full" />
												</div>
											)}
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Order History</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Track all your orders
									</p>
									{hasNewOrders && (
										<div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
											<BellIcon className="h-3 w-3" />
											New order update
										</div>
									)}
								</div>
							</Card>
						</Link>

						{/* Quick Search */}
						<Link href="/app/search">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 bg-white dark:bg-gray-800 transition-all duration-300 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xl dark:border-gray-700",
									hoveredCard === 'search' && 'scale-105 shadow-xl border-amber-400 dark:border-amber-500'
								)}
								onMouseEnter={() => setHoveredCard('search')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 dark:from-amber-600 dark:to-yellow-700 rounded-xl shadow-lg">
											<SearchIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Quick Search</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Find medicines instantly
									</p>
									<div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
										<ZapIcon className="h-3 w-3" />
										AI-powered search
									</div>
								</div>
							</Card>
						</Link>

						{/* Account Settings */}
						<Link href="/app/settings">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 bg-white dark:bg-gray-800 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl dark:border-gray-700",
									hoveredCard === 'settings' && 'scale-105 shadow-xl border-gray-400 dark:border-gray-500'
								)}
								onMouseEnter={() => setHoveredCard('settings')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/20 dark:to-slate-700/20 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-gray-400 to-slate-500 dark:from-gray-600 dark:to-slate-700 rounded-xl shadow-lg">
											<UserIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">My Account</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Profile & preferences
									</p>
									<div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
										<ShieldCheckIcon className="h-3 w-3" />
										Secure & private
									</div>
								</div>
							</Card>
						</Link>

						{/* Admin Panel - Special Card */}
						{user?.role === 'admin' && (
							<Link href="/app/admin">
								<Card 
									className={cn(
										"group relative overflow-hidden border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50 transition-all duration-300 hover:border-red-400 hover:shadow-xl",
										hoveredCard === 'admin' && 'scale-105 shadow-xl border-red-400'
									)}
									onMouseEnter={() => setHoveredCard('admin')}
									onMouseLeave={() => setHoveredCard(null)}
								>
									<div className="absolute top-2 right-2">
										<Badge className="bg-red-100 text-red-700">Admin</Badge>
									</div>
									
									<div className="relative p-6">
										<div className="flex items-start justify-between mb-4">
											<div className="p-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl shadow-lg">
												<SettingsIcon className="h-7 w-7 text-white animate-spin-slow" />
											</div>
											<ArrowRightIcon className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors" />
										</div>
										<h3 className="font-bold text-lg text-gray-900 mb-1">Admin Center</h3>
										<p className="text-sm text-gray-600 mb-3">
											Manage entire platform
										</p>
										<div className="flex items-center gap-2 text-xs text-red-600 font-medium">
											<ActivityIcon className="h-3 w-3" />
											Full control access
										</div>
									</div>
								</Card>
							</Link>
						)}
					</div>
				</div>

				{/* Featured Products Section with Enhanced UX */}
				<div className="space-y-8">
					{/* Section Header with Professional Styling */}
					<div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
								<StarIcon className="h-5 w-5 text-amber-600 dark:text-amber-500" />
							</div>
							<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Featured Today</h2>
						</div>
						<Link 
							href="/app/products" 
							className="group flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition-all duration-200 border border-gray-200 dark:border-gray-600"
						>
							View all
							<ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
						</Link>
					</div>
					
					{/* Featured Product Cards Grid with Better Spacing */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[
							{ name: "Paracetamol 500mg", price: "₦250", oldPrice: "₦295", discount: "15%", category: "Pain Relief", stock: "In Stock", color: "from-slate-200 to-blue-200 dark:from-slate-700 dark:to-blue-900" },
							{ name: "Vitamin C 1000mg", price: "₦1,200", oldPrice: "₦1,500", discount: "20%", category: "Vitamins", stock: "Limited", color: "from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-900" },
							{ name: "Amoxicillin 500mg", price: "₦800", oldPrice: "₦890", discount: "10%", category: "Antibiotics", stock: "In Stock", color: "from-emerald-100 to-teal-200 dark:from-emerald-900 dark:to-teal-900" },
							{ name: "Insulin Pen", price: "₦5,500", oldPrice: "₦5,790", discount: "5%", category: "Diabetes Care", stock: "Available", color: "from-purple-100 to-indigo-200 dark:from-purple-900 dark:to-indigo-900" }
						].map((product, index) => (
							<Card 
								key={index} 
								className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 cursor-pointer"
							>
								{/* Discount Badge - Refined */}
								<div className="absolute top-3 right-3 z-10">
									<Badge className="bg-rose-500 dark:bg-rose-600 text-white font-semibold px-2 py-0.5 text-xs shadow-sm">
										<PercentIcon className="h-3 w-3 mr-1 inline" />
										{product.discount}
									</Badge>
								</div>

								{/* Stock Indicator */}
								<div className="absolute top-3 left-3 z-10">
									<Badge className={cn(
										"text-xs font-medium px-2 py-0.5",
										product.stock === "Limited" 
											? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
											: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
									)}>
										{product.stock}
									</Badge>
								</div>
								
								<div className="p-6">
									{/* Product Image Placeholder with Subtle Professional Design */}
									<div className={cn(
										"h-32 w-full rounded-xl mb-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform bg-gradient-to-br",
										product.color
									)}>
										<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-4 shadow-sm">
											<PillIcon className="h-12 w-12 text-gray-600 dark:text-gray-400" />
										</div>
									</div>
									
									{/* Product Details with Better Spacing */}
									<div className="space-y-2">
										{/* Category */}
										<div className="flex items-center gap-2">
											<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
												{product.category}
											</span>
										</div>
										
										{/* Product Name */}
										<h4 className="font-bold text-base text-gray-900 dark:text-gray-100 line-clamp-1">
											{product.name}
										</h4>
										
										{/* Price Section */}
										<div className="flex items-baseline gap-2">
											<p className="text-xl font-bold text-blue-600 dark:text-blue-400">
												{product.price}
											</p>
											<p className="text-sm text-gray-400 dark:text-gray-500 line-through">
												{product.oldPrice}
											</p>
										</div>
									</div>
									
									{/* Add to Cart Button - Professional */}
									<Button className="w-full mt-4 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium text-sm py-2.5 shadow-sm hover:shadow-md transition-all duration-200">
										<ShoppingCartIcon className="h-4 w-4 mr-2 inline" />
										Add to Cart
									</Button>
								</div>
							</Card>
						))}
					</div>
				</div>

				{/* Nigerian Market Features - Enhanced Design */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
					{/* Features Card */}
					<Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
						<div className="absolute top-0 right-0 h-32 w-32 bg-green-200/30 rounded-full blur-3xl" />
						<div className="relative p-6">
							<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
								<ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
								Why Choose BenPharm?
							</h3>
							<div className="space-y-3">
								{[
									{ icon: BadgeIcon, text: "100% NAFDAC Verified Products", color: "text-green-600" },
									{ icon: TruckIcon, text: "Same-Day Delivery in Major Cities", color: "text-blue-600" },
									{ icon: HeartIcon, text: "Trusted by 5,000+ Nigerian Pharmacies", color: "text-red-500" },
									{ icon: PercentIcon, text: "Bulk Discounts for Wholesale Orders", color: "text-purple-600" }
								].map((feature, index) => (
									<div key={index} className="flex items-center gap-3">
										<feature.icon className={cn("h-5 w-5", feature.color)} />
										<span className="text-sm text-gray-700">{feature.text}</span>
									</div>
								))}
							</div>
						</div>
					</Card>

					{/* Promotions Card */}
					<Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
						<div className="absolute top-0 right-0 h-32 w-32 bg-purple-200/30 rounded-full blur-3xl" />
						<div className="relative p-6">
							<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
								<SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
								Current Promotions
							</h3>
							<div className="space-y-3">
								<div className="p-3 bg-white/80 rounded-lg border border-purple-200">
									<div className="flex items-start justify-between">
										<div>
											<p className="font-semibold text-sm text-gray-900">First Order Discount</p>
											<p className="text-xs text-gray-600 mt-1">Get 20% off your first purchase</p>
										</div>
										<Badge className="bg-purple-100 text-purple-700">NEW</Badge>
									</div>
								</div>
								<div className="p-3 bg-white/80 rounded-lg border border-pink-200">
									<div className="flex items-start justify-between">
										<div>
											<p className="font-semibold text-sm text-gray-900">Free Delivery Weekend</p>
											<p className="text-xs text-gray-600 mt-1">Orders above ₦10,000 ship free</p>
										</div>
										<Badge className="bg-red-100 text-red-700">HOT</Badge>
									</div>
								</div>
							</div>
						</div>
					</Card>
				</div>

				{/* Quick Stats Footer */}
				<div className="mt-12 mb-8 grid grid-cols-2 md:grid-cols-4 gap-6">
					{[
						{ label: "Products Available", value: "10,000+", icon: PackageIcon, bg: "from-blue-600/15 to-indigo-600/15", badgeBg: "bg-blue-500/15 dark:bg-blue-400/10", iconColor: "text-blue-400", textColor: "text-blue-600 dark:text-blue-300" },
						{ label: "Happy Customers", value: "5,000+", icon: HeartIcon, bg: "from-rose-600/15 to-pink-600/15", badgeBg: "bg-rose-500/15 dark:bg-rose-400/10", iconColor: "text-rose-400", textColor: "text-rose-600 dark:text-rose-300" },
						{ label: "Cities Covered", value: "36", icon: TruckIcon, bg: "from-emerald-600/15 to-teal-600/15", badgeBg: "bg-emerald-500/15 dark:bg-emerald-400/10", iconColor: "text-emerald-400", textColor: "text-emerald-600 dark:text-emerald-300" },
						{ label: "Avg Delivery Time", value: "2 hrs", icon: Clock3Icon, bg: "from-purple-600/15 to-indigo-600/15", badgeBg: "bg-purple-500/15 dark:bg-purple-400/10", iconColor: "text-purple-400", textColor: "text-purple-600 dark:text-purple-300" }
					].map((stat, index) => (
						<Card
							key={index}
							className={cn(
								"relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/40 backdrop-blur-md shadow-lg transition-all",
								"hover:shadow-xl hover:-translate-y-0.5"
							)}
						>
							{/* subtle gradient tint */}
							<div className={cn("absolute inset-0 bg-gradient-to-br", stat.bg)} />
							{/* inner content */}
							<div className="relative p-5 text-center space-y-2">
								<div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full", stat.badgeBg)}>
									<stat.icon className={cn("h-5 w-5", stat.iconColor)} />
								</div>
								<p className={cn("text-2xl font-extrabold tracking-tight", stat.textColor)}>{stat.value}</p>
								<p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
