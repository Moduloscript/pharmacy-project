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

	// BenPharm Nigerian Pharmaceutical Dashboard - Enhanced UX
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
			<div className="space-y-8 animate-in fade-in duration-500">
				{/* Enhanced Hero Welcome Section */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-teal-400 p-8 text-white shadow-2xl">
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
								
								<h1 className="mb-3 text-4xl font-bold tracking-tight">
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
							<div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
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
				<div className="space-y-6">
					{/* Section Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<ZapIcon className="h-5 w-5 text-blue-600" />
							<h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
						</div>
						{cartItemCount > 0 && (
							<Badge className="bg-orange-100 text-orange-700">
								{cartItemCount} items in cart
							</Badge>
						)}
					</div>

					{/* Action Cards Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Browse Products - Primary Action */}
						<Link href="/app/products">
							<Card 
								className={cn(
									"group relative overflow-hidden border-2 transition-all duration-300 hover:border-green-400 hover:shadow-xl",
									hoveredCard === 'products' && 'scale-105 shadow-xl border-green-400'
								)}
								onMouseEnter={() => setHoveredCard('products')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								{/* Gradient background on hover */}
								<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg">
											<PackageIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 mb-1">Browse Products</h3>
									<p className="text-sm text-gray-600 mb-3">
										Explore 10,000+ authentic medicines
									</p>
									<div className="flex items-center gap-2 text-xs text-green-600 font-medium">
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
									"group relative overflow-hidden border-2 transition-all duration-300 hover:border-blue-400 hover:shadow-xl",
									hoveredCard === 'cart' && 'scale-105 shadow-xl border-blue-400'
								)}
								onMouseEnter={() => setHoveredCard('cart')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="relative">
											<div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg">
												<ShoppingCartIcon className="h-7 w-7 text-white" />
											</div>
											{cartItemCount > 0 && (
												<div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
													<span className="text-xs text-white font-bold">{cartItemCount}</span>
												</div>
											)}
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 mb-1">Shopping Cart</h3>
									<p className="text-sm text-gray-600 mb-3">
										Review and checkout items
									</p>
									{cartItemCount > 0 ? (
										<div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
											<ActivityIcon className="h-3 w-3" />
											Ready to checkout
										</div>
									) : (
										<div className="flex items-center gap-2 text-xs text-gray-500">
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
									"group relative overflow-hidden border-2 transition-all duration-300 hover:border-purple-400 hover:shadow-xl",
									hoveredCard === 'orders' && 'scale-105 shadow-xl border-purple-400'
								)}
								onMouseEnter={() => setHoveredCard('orders')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="relative">
											<div className="p-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl shadow-lg">
												<ClipboardListIcon className="h-7 w-7 text-white" />
											</div>
											{hasNewOrders && (
												<div className="absolute -top-2 -right-2">
													<div className="h-2 w-2 bg-red-500 rounded-full animate-ping absolute" />
													<div className="h-2 w-2 bg-red-500 rounded-full" />
												</div>
											)}
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 mb-1">Order History</h3>
									<p className="text-sm text-gray-600 mb-3">
										Track all your orders
									</p>
									{hasNewOrders && (
										<div className="flex items-center gap-2 text-xs text-purple-600 font-medium">
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
									"group relative overflow-hidden border-2 transition-all duration-300 hover:border-amber-400 hover:shadow-xl",
									hoveredCard === 'search' && 'scale-105 shadow-xl border-amber-400'
								)}
								onMouseEnter={() => setHoveredCard('search')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl shadow-lg">
											<SearchIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 mb-1">Quick Search</h3>
									<p className="text-sm text-gray-600 mb-3">
										Find medicines instantly
									</p>
									<div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
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
									"group relative overflow-hidden border-2 transition-all duration-300 hover:border-gray-400 hover:shadow-xl",
									hoveredCard === 'settings' && 'scale-105 shadow-xl border-gray-400'
								)}
								onMouseEnter={() => setHoveredCard('settings')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl shadow-lg">
											<UserIcon className="h-7 w-7 text-white" />
										</div>
										<ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
									</div>
									<h3 className="font-bold text-lg text-gray-900 mb-1">My Account</h3>
									<p className="text-sm text-gray-600 mb-3">
										Profile & preferences
									</p>
									<div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
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

				{/* Featured Products Carousel */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<StarIcon className="h-5 w-5 text-yellow-500" />
							<h2 className="text-xl font-semibold text-gray-900">Featured Today</h2>
						</div>
						<Link href="/app/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
							View all
							<ArrowRightIcon className="h-4 w-4" />
						</Link>
					</div>
					
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{/* Featured Product Cards */}
						{[
							{ name: "Paracetamol 500mg", price: "₦250", discount: "15%", category: "Pain Relief" },
							{ name: "Vitamin C 1000mg", price: "₦1,200", discount: "20%", category: "Vitamins" },
							{ name: "Amoxicillin 500mg", price: "₦800", discount: "10%", category: "Antibiotics" },
							{ name: "Insulin Pen", price: "₦5,500", discount: "5%", category: "Diabetes Care" }
						].map((product, index) => (
							<Card key={index} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
								{/* Discount Badge */}
								<div className="absolute top-2 right-2 z-10">
									<Badge className="bg-red-500 text-white">
										<PercentIcon className="h-3 w-3 mr-1" />
										{product.discount} OFF
									</Badge>
								</div>
								
								<div className="p-4">
									{/* Product Image Placeholder */}
									<div className="h-24 w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
										<PillIcon className="h-12 w-12 text-gray-400" />
									</div>
									
									<div className="space-y-1">
										<p className="text-xs text-gray-500">{product.category}</p>
										<h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{product.name}</h4>
										<p className="text-lg font-bold text-blue-600">{product.price}</p>
									</div>
									
									<Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1">
										Add to Cart
									</Button>
								</div>
							</Card>
						))}
					</div>
				</div>

				{/* Nigerian Market Features - Enhanced Design */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
				<div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						{ label: "Products Available", value: "10,000+", icon: PackageIcon, color: "from-blue-500 to-indigo-600" },
						{ label: "Happy Customers", value: "5,000+", icon: HeartIcon, color: "from-red-500 to-pink-600" },
						{ label: "Cities Covered", value: "36", icon: TruckIcon, color: "from-green-500 to-emerald-600" },
						{ label: "Avg Delivery Time", value: "2 hrs", icon: Clock3Icon, color: "from-purple-500 to-indigo-600" }
					].map((stat, index) => (
						<Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
							<div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", stat.color)} />
							<div className="p-4 text-center">
								<stat.icon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
								<p className="text-2xl font-bold text-gray-900">{stat.value}</p>
								<p className="text-xs text-gray-600">{stat.label}</p>
							</div>
					</Card>
				))}
				</div>
			</div>
		</div>
	);
}
