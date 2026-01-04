"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useCustomerProfileQuery } from "@saas/auth/lib/api";
import { OrganizationsGrid } from "@saas/organizations/components/OrganizationsGrid";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { QuickReorderPanel } from "@saas/dashboard/components/QuickReorderPanel";
import { ActiveOrderTracker } from "@saas/dashboard/components/ActiveOrderTracker";
import { CreditBalanceWidget } from "@saas/dashboard/components/CreditBalanceWidget";
import { PromotionsBanner } from "@saas/dashboard/components/PromotionsBanner";
import { CategoryQuickLinks } from "@saas/dashboard/components/CategoryQuickLinks";
import { LowStockAlerts } from "@saas/dashboard/components/LowStockAlerts";
import { FreshStock } from "@saas/dashboard/components/FreshStock";
import { Badge } from "@ui/components/badge";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@shared/components/UserAvatar";
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
	const { data: customerProfile, isLoading } = useCustomerProfileQuery();

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

	// BenPharm Nigerian Pharmaceutical Dashboard - Enhanced UX with Dark Mode Support -> NOW PROFESSIONAL BRUTALIST (Swiss/Architectural)
	return (
		<div className="theme-ujjo relative min-h-screen w-full overflow-hidden bg-background text-foreground font-sans">
			{/* Grid Background - High Contrast Architectural */}
			<div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
				style={{
					backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px),
					linear-gradient(to bottom, #000 1px, transparent 1px)`,
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Main Container */}
			<div className="relative z-10 max-w-7xl mx-auto px-6 py-8 lg:px-8 lg:py-12 space-y-16 animate-in fade-in duration-500">
				
				{/* 1. HERO SECTION: Ujjo-Style Poster */}
				{/* 1. HERO SECTION: Ujjo-Style Poster - Exact Match to Design */}
				<div className="w-full bg-[#8B83F6] border-2 border-black p-8 md:p-12 shadow-hard relative overflow-hidden">
					{/* Decorative Elements */}
					<div className="absolute top-4 right-4 animate-spin-slow opacity-20">
						<SparklesIcon className="w-24 h-24 text-black" />
					</div>

					<div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
						<div className="flex-1 space-y-8 text-center lg:text-left">
							{/* Greeting Badge - White Pill with Orange Dot */}
							<div className="inline-flex items-center gap-2 bg-white border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transform -rotate-1 hover:rotate-0 transition-transform">
								<span className="w-3 h-3 rounded-full bg-[#FF4500] border border-black"></span>
								<span>GOOD AFTERNOON, {user?.name?.split(' ')[0] || 'TUNDE'}</span>
							</div>
							
							<h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black tracking-tighter leading-[0.9] uppercase drop-shadow-sm">
								<span className="block text-black">PRECISION</span>
								<span className="block text-white">IN EVERY PILL</span>
							</h1>
							
							<div className="max-w-xl mx-auto lg:mx-0">
								<p className="text-lg font-medium text-black/90 leading-relaxed mb-3">
									The "Oh Sh*t" moment for your pharmacy logistics.
								</p>
								<div className="flex flex-wrap justify-center lg:justify-start gap-2">
									<span className="bg-black text-white px-2 py-0.5 font-bold">Verified.</span>
									<span className="bg-black text-white px-2 py-0.5 font-bold">Secure.</span>
									<span className="bg-black text-white px-2 py-0.5 font-bold">Fast.</span>
								</div>
							</div>
							
							{/* Stats Indicators - White Pills */}
							<div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
								{/* Dispatch Badge */}
								<div className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-black rounded-full text-sm font-black uppercase text-black shadow-sm hover:translate-y-0.5 transition-transform">
									<TruckIcon className="h-5 w-5" />
									<span>Same-day Dispatch</span>
								</div>
								{/* NAFDAC Badge */}
								<div className="flex items-center gap-3 px-5 py-2.5 bg-white border-2 border-black rounded-full text-base font-black uppercase text-black shadow-sm hover:translate-y-0.5 transition-transform">
									<div className="relative w-8 h-8">
										<Image 
											src="/nafdac-logo.png" 
											alt="NAFDAC" 
											fill
											className="object-contain"
										/>
									</div>
									<span>NAFDAC Certified</span>
								</div>
							</div>
						</div>
						
						{/* Account Status Card - Sticker Style */}
						<div className="w-full max-w-sm lg:w-auto min-w-[280px] lg:min-w-[320px] bg-white border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transform rotate-2 hover:rotate-0 transition-all duration-300">
							{isLoading ? (
								// Skeleton Loader matching the card layout
								<div className="animate-pulse space-y-6">
									<div className="flex items-start justify-between mb-8 border-b-2 border-black/10 pb-6">
										<div className="w-16 h-16 bg-gray-200 border-2 border-gray-300" />
										<div className="space-y-2">
											<div className="h-3 w-12 bg-gray-200 ml-auto" />
											<div className="h-6 w-24 bg-gray-200 ml-auto" />
										</div>
									</div>
									<div className="space-y-4">
										<div>
											<div className="h-3 w-20 bg-gray-200 mb-2" />
											<div className="h-8 w-32 bg-gray-200" />
										</div>
										<div className="grid grid-cols-2 gap-8">
											<div className="space-y-2">
												<div className="h-3 w-20 bg-gray-200" />
												<div className="h-4 w-24 bg-gray-200" />
											</div>
											<div className="space-y-2">
												<div className="h-3 w-16 bg-gray-200" />
												<div className="h-4 w-24 bg-gray-200" />
											</div>
										</div>
									</div>
								</div>
							) : (
								<>
									<div className="flex items-start justify-between mb-8 border-b-2 border-black pb-6">
										{/* Orange Square Avatar */}
										<div className="w-16 h-16 bg-[#FF4500] border-2 border-black flex items-center justify-center text-white">
											<UserIcon className="h-8 w-8" />
										</div>
										
										<div className="text-right">
											<div className="text-[10px] font-black uppercase text-gray-500 mb-1">Status</div>
											{/* Status - Real Data */}
											{(() => {
												const status = customerProfile?.verificationStatus || (user as any)?.customer?.verificationStatus || 'PENDING';
												const isVerified = status === 'VERIFIED';
												return (
													<div className="flex items-center justify-end gap-2">
														<div className={cn(
															"h-2 w-2 rounded-full border border-black",
															isVerified ? "bg-green-600" : "bg-yellow-400"
														)} />
														<span className="text-xl font-black uppercase tracking-tight text-black">
															{isVerified ? 'ACTIVE' : status}
														</span>
													</div>
												);
											})()}
										</div>
									</div>
									
									<div className="space-y-6">
										<div>
											<div className="text-[10px] font-black uppercase text-gray-500 mb-1">Account Type</div>
											<div className="inline-block bg-[#E0F2FE] border-2 border-black px-3 py-1 font-black text-lg text-black uppercase">
												{(customerProfile?.customerType || (user as any)?.customer?.customerType) === 'WHOLESALE' ? 'Wholesale Partner' : 'Retail Customer'}
											</div>
										</div>
										
										<div className="grid grid-cols-2 gap-8 pt-2">
											<div>
												<div className="text-[10px] font-black uppercase text-gray-500 mb-1">Member Since</div>
												<div className="font-bold text-black border-b-2 border-black inline-block pb-0.5 uppercase">
													{user?.createdAt 
														? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
														: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
												</div>
											</div>
											<div>
												<div className="text-[10px] font-black uppercase text-gray-500 mb-1">Region</div>
												<div className="font-bold text-black border-b-2 border-black inline-block pb-0.5">
													{(customerProfile?.city || (user as any)?.customer?.city) && (customerProfile?.state || (user as any)?.customer?.state)
														? `${customerProfile?.city || (user as any)?.customer?.city}, ${customerProfile?.state || (user as any)?.customer?.state}`
														: (customerProfile?.state || (user as any)?.customer?.state || "Nigeria")}
												</div>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* 1.5 PROMOTIONS BANNER (Tier 2) */}
				<PromotionsBanner />

				{/* 2. STATUS & TRACKING (Tier 1) */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="h-full">
						<CreditBalanceWidget />
					</div>
					<div className="h-full">
						<LowStockAlerts />
					</div>
					<div className="h-full">
						<ActiveOrderTracker />
					</div>
				</div>

				{/* 3. QUICK ACTIONS: Retro Control Panel */}
				<div>
					<div className="flex items-end justify-between mb-8 pb-4 border-b-4 border-foreground">
						<h2 className="text-3xl font-display font-black uppercase tracking-tighter text-foreground flex items-center gap-3">
							<ZapIcon className="h-8 w-8 text-accent" />
							System Actions
						</h2>
						{cartItemCount > 0 && (
							<span className="bg-foreground text-background px-3 py-1 text-sm font-bold border-2 border-transparent hover:bg-background hover:text-foreground hover:border-foreground transition-colors cursor-default">
								CART: {cartItemCount}
							</span>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Reusable Card Style - Matched to User Image */}
						{[
							{ 
								title: "Catalog", 
								subtitle: "Browse inventory", 
								icon: PackageIcon, 
								bgClass: "bg-[#8B83F6]", // Purple
								textClass: "text-black",
								iconBgClass: "bg-white",
								href: "/app/products" 
							},
							{ 
								title: "Cart", 
								subtitle: "Ready for checkout", 
								icon: ShoppingCartIcon, 
								bgClass: "bg-[#FF4500]", // Orange
								textClass: "text-white",
								iconBgClass: "bg-white text-black",
								href: "/app/cart" 
							},
							{ 
								title: "Orders", 
								subtitle: "Track shipments", 
								icon: ClipboardListIcon, 
								bgClass: "bg-[#E6E6FA]", // Light Purple
								textClass: "text-black",
								iconBgClass: "bg-white",
								href: "/app/orders" 
							},
							{ 
								title: "Search", 
								subtitle: "Global lookup", 
								icon: SearchIcon, 
								bgClass: "bg-[#F5F5F5]", // White/Grey
								textClass: "text-black",
								iconBgClass: "bg-white",
								href: "/app/search" 
							}
						].map((item, i) => (
							<Link key={i} href={item.href} className="group relative block h-48">
								{/* Shadow Block */}
								<div className="absolute inset-0 bg-black translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />
								
								{/* Main Card */}
								<div className={cn(
									"relative h-full border-2 border-black p-6 flex flex-col justify-between transition-transform transform group-hover:-translate-y-1 group-hover:-translate-x-1",
									item.bgClass
								)}>
									<div className="flex justify-between items-start">
										<div className={cn("p-2 border-2 border-black w-12 h-12 flex items-center justify-center text-black", item.iconBgClass)}>
											<item.icon className="h-6 w-6" />
										</div>
										<ArrowRightIcon className={cn("h-6 w-6 transition-transform group-hover:translate-x-1", item.textClass)} />
									</div>
									<div className="space-y-1">
										<h3 className={cn("font-black text-2xl uppercase tracking-tighter", item.textClass)}>{item.title}</h3>
										<p className={cn("text-xs font-bold uppercase tracking-wider opacity-80", item.textClass)}>{item.subtitle}</p>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* 3. PRIORITY FEATURES: Quick Reorder (Tier 1) */}
				<QuickReorderPanel />

				{/* 3.5 CATEGORY QUICK LINKS (Tier 2) */}
				<CategoryQuickLinks />

				{/* 4. INVENTORY: Fresh Stock (Tier 2) */}
				<FreshStock />

				{/* 4. METRICS: Marquee Style */}
				<div className="border-t-4 border-foreground pt-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{[
							{ label: "Total SKUs", value: "10K+", icon: PackageIcon, bgClass: "bg-[#8B83F6]", textClass: "text-black" },
							{ label: "Active Pharmacies", value: "5K+", icon: HeartIcon, bgClass: "bg-[#FF4500]", textClass: "text-black" },
							{ label: "Cities Covered", value: "36", icon: TruckIcon, bgClass: "bg-[#FFD700]", textClass: "text-black" },
							{ label: "Avg. Dispatch", value: "2HR", icon: Clock3Icon, bgClass: "bg-black", textClass: "text-white" }
						].map((stat, index) => (
							<div key={index} className={cn("p-6 border-2 border-foreground shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all", stat.bgClass)}>
								<div className="flex items-center gap-2 mb-2">
									<stat.icon className={cn("h-5 w-5", stat.textClass)} />
									<p className={cn("text-xs font-black uppercase tracking-widest opacity-80", stat.textClass)}>{stat.label}</p>
								</div>
								<p className={cn("text-4xl font-black tracking-tighter", stat.textClass)}>{stat.value}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>	);
}
