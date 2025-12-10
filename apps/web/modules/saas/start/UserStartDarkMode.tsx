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

	// BenPharm Nigerian Pharmaceutical Dashboard - Enhanced UX with Complete Dark Mode Support
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			<div className="space-y-8 animate-in fade-in duration-500">
				{/* Enhanced Hero Welcome Section with Dark Mode */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-teal-400 dark:from-blue-800 dark:via-blue-700 dark:to-teal-700 p-8 text-white shadow-2xl dark:shadow-black/50">
					{/* Animated background pattern */}
					<div className="absolute inset-0 opacity-10 dark:opacity-5">
						<div className="absolute -left-4 -top-4 h-72 w-72 animate-pulse rounded-full bg-white/20 blur-3xl" />
						<div className="absolute -bottom-8 -right-8 h-96 w-96 animate-pulse rounded-full bg-white/20 blur-3xl delay-700" />
					</div>
					
					<div className="relative z-10">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
							<div className="flex-1">
								{/* Animated greeting */}
								<div className="mb-2 flex items-center gap-2">
									<SparklesIcon className="h-5 w-5 animate-pulse text-yellow-300 dark:text-yellow-400" />
									<span className="text-sm font-medium text-blue-100 dark:text-blue-200">
										{greeting}, {user?.name?.split(' ')[0] || 'there'}!
									</span>
								</div>
								
								<h1 className="mb-3 text-4xl font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
									Welcome to BenPharm
								</h1>
								<p className="max-w-lg text-lg text-blue-100 dark:text-blue-200">
									Your trusted partner for pharmaceutical excellence in Nigeria. 
									Fast delivery, authentic medicines, best prices.
								</p>
								
								{/* Quick stats */}
								<div className="mt-6 flex flex-wrap gap-6">
									<div className="flex items-center gap-2">
										<TruckIcon className="h-5 w-5 text-green-300 dark:text-green-400" />
										<span className="text-sm">Same-day delivery</span>
									</div>
									<div className="flex items-center gap-2">
										<ShieldCheckIcon className="h-5 w-5 text-green-300 dark:text-green-400" />
										<span className="text-sm">100% Authentic</span>
									</div>
									<div className="flex items-center gap-2">
										<StarIcon className="h-5 w-5 text-yellow-300 dark:text-yellow-400" />
										<span className="text-sm">Trusted by 5000+ pharmacies</span>
									</div>
								</div>
							</div>
							
							{/* User info card */}
							<div className="rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm p-4 border border-white/20 dark:border-white/10">
								<div className="flex items-center gap-4">
									<div className="relative">
										<div className="h-14 w-14 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center">
											<UserIcon className="h-8 w-8" />
										</div>
										{hasNewOrders && (
											<div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
										)}
									</div>
									<div>
										<div className="text-xs text-blue-200 dark:text-blue-300 uppercase tracking-wider">Account Type</div>
										<div className="font-semibold text-lg">
											{(user as any)?.customer?.customerType === 'WHOLESALE' ? (
												<Badge className="bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-950">Wholesale Partner</Badge>
											) : (
												<Badge className="bg-blue-400 text-blue-900 dark:bg-blue-500 dark:text-blue-950">Retail Customer</Badge>
											)}
										</div>
										<div className="mt-1 text-xs text-blue-200 dark:text-blue-300">
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
							<ZapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
						</div>
						{cartItemCount > 0 && (
							<Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
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
									"group relative overflow-hidden border-2 transition-all duration-300",
									"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
									"hover:border-green-400 dark:hover:border-green-500 hover:shadow-xl dark:hover:shadow-green-900/20",
									hoveredCard === 'products' && 'scale-105 shadow-xl border-green-400 dark:border-green-500'
								)}
								onMouseEnter={() => setHoveredCard('products')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								{/* Gradient background on hover */}
								<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
								
								<div className="relative p-6">
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
									"group relative overflow-hidden border-2 transition-all duration-300",
									"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
									"hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl dark:hover:shadow-blue-900/20",
									hoveredCard === 'cart' && 'scale-105 shadow-xl border-blue-400 dark:border-blue-500'
								)}
								onMouseEnter={() => setHoveredCard('cart')}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
								
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

						{/* Continue with other cards following the same pattern... */}
						
					</div>
				</div>

				{/* Featured Products Carousel */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<StarIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
							<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Featured Today</h2>
						</div>
						<Link href="/app/products" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1">
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
							<Card key={index} className="group relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 cursor-pointer">
								{/* Discount Badge */}
								<div className="absolute top-2 right-2 z-10">
									<Badge className="bg-red-500 dark:bg-red-600 text-white">
										<PercentIcon className="h-3 w-3 mr-1" />
										{product.discount} OFF
									</Badge>
								</div>
								
								<div className="p-4">
									{/* Product Image Placeholder */}
									<div className="h-24 w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
										<PillIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
									</div>
									
									<div className="space-y-1">
										<p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
										<h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{product.name}</h4>
										<p className="text-lg font-bold text-blue-600 dark:text-blue-400">{product.price}</p>
									</div>
									
									<Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm py-1">
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
					<Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
						<div className="absolute top-0 right-0 h-32 w-32 bg-green-200/30 dark:bg-green-700/20 rounded-full blur-3xl" />
						<div className="relative p-6">
							<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
								<ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
								Why Choose BenPharm?
							</h3>
							<div className="space-y-3">
								{[
									{ icon: BadgeIcon, text: "100% NAFDAC Verified Products", color: "text-green-600 dark:text-green-400" },
									{ icon: TruckIcon, text: "Same-Day Delivery in Major Cities", color: "text-blue-600 dark:text-blue-400" },
									{ icon: HeartIcon, text: "Trusted by 5,000+ Nigerian Pharmacies", color: "text-red-500 dark:text-red-400" },
									{ icon: PercentIcon, text: "Bulk Discounts for Wholesale Orders", color: "text-purple-600 dark:text-purple-400" }
								].map((feature, index) => (
									<div key={index} className="flex items-center gap-3">
										<feature.icon className={cn("h-5 w-5", feature.color)} />
										<span className="text-sm text-gray-700 dark:text-gray-300">{feature.text}</span>
									</div>
								))}
							</div>
						</div>
					</Card>

					{/* Promotions Card */}
					<Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
						<div className="absolute top-0 right-0 h-32 w-32 bg-purple-200/30 dark:bg-purple-700/20 rounded-full blur-3xl" />
						<div className="relative p-6">
							<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
								<SparklesIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
								Current Promotions
							</h3>
							<div className="space-y-3">
								<div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-purple-200 dark:border-purple-700">
									<div className="flex items-start justify-between">
										<div>
											<p className="font-semibold text-sm text-gray-900 dark:text-gray-100">First Order Discount</p>
											<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Get 20% off your first purchase</p>
										</div>
										<Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">NEW</Badge>
									</div>
								</div>
								<div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-pink-200 dark:border-pink-700">
									<div className="flex items-start justify-between">
										<div>
											<p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Free Delivery Weekend</p>
											<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Orders above ₦10,000 ship free</p>
										</div>
										<Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">HOT</Badge>
									</div>
								</div>
							</div>
						</div>
					</Card>
				</div>

				{/* Quick Stats Footer */}
				<div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						{ label: "Products Available", value: "10,000+", icon: PackageIcon, color: "from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700" },
						{ label: "Happy Customers", value: "5,000+", icon: HeartIcon, color: "from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700" },
						{ label: "Cities Covered", value: "36", icon: TruckIcon, color: "from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700" },
						{ label: "Avg Delivery Time", value: "2 hrs", icon: Clock3Icon, color: "from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700" }
					].map((stat, index) => (
						<Card key={index} className="relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-black/20 transition-shadow">
							<div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 dark:opacity-10", stat.color)} />
							<div className="p-4 text-center">
								<stat.icon className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
								<p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
