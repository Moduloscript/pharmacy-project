"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
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
				<div className="w-full bg-[#8B83F6] border-2 border-black p-8 md:p-12 shadow-hard relative overflow-hidden">
					{/* Decorative Elements */}
					<div className="absolute top-4 right-4 animate-spin-slow opacity-20">
						<SparklesIcon className="w-24 h-24 text-black" />
					</div>

					<div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
						<div className="flex-1 space-y-6 text-center lg:text-left">
							{/* Greeting Badge - Brutalist Pill */}
							<div className="inline-flex items-center gap-2 bg-white border-2 border-black px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-black shadow-sm transform -rotate-1 hover:rotate-0 transition-transform">
								<span className="w-3 h-3 rounded-full bg-[#FF4500] animate-pulse border border-black"></span>
								<span>{greeting}, {user?.name?.split(' ')[0] || 'User'}</span>
							</div>
							
							<h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-black leading-[0.9] uppercase drop-shadow-sm">
								PRECISION <br />
								<span className="text-white text-stroke-black">IN EVERY PILL</span>
							</h1>
							
							<p className="max-w-xl text-xl font-medium text-black/80 leading-relaxed mx-auto lg:mx-0">
								The "Oh Sh*t" moment for your pharmacy logistics. <br/>
								<span className="bg-black text-white px-1">Verified.</span> <span className="bg-black text-white px-1">Secure.</span> <span className="bg-black text-white px-1">Fast.</span>
							</p>
							
							{/* Stats Indicators */}
							<div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
								{/* Dispatch Badge - High Contrast text-black forced */}
								<div className="flex items-center gap-2 px-3 py-1 bg-white border border-black rounded-full text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
									<TruckIcon className="h-4 w-4 text-black" />
									<span className="uppercase">Same-day Dispatch</span>
								</div>
								{/* NAFDAC Badge - Real Logo + High Contrast */}
								<div className="flex items-center gap-2 px-3 py-1 bg-white border border-black rounded-full text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
									<Image 
										src="/nafdac-logo.png" 
										alt="NAFDAC" 
										width={24}
										height={24}
										className="object-contain"
									/>
									<span className="uppercase">NAFDAC Certified</span>
								</div>
							</div>
						</div>
						
						{/* Account Status Box - Sticker Style */}
						<div className="w-full lg:w-auto min-w-[320px] bg-white border-2 border-black p-6 shadow-hard transform rotate-1 hover:rotate-0 transition-all duration-300">
							<div className="flex items-start justify-between mb-6 border-b-2 border-black pb-4">
								<div className="p-3 bg-[#FF4500] border-2 border-black">
									<UserIcon className="h-6 w-6 text-white" />
								</div>
								<div className="text-right">
									<div className="text-[10px] font-black uppercase text-black">Status</div>
									<div className="flex items-center justify-end gap-2 mt-1">
										<div className="h-2 w-2 rounded-full bg-green-500 border border-black animate-pulse" />
										<span className="text-sm font-black uppercase tracking-widest text-black">Active</span>
									</div>
								</div>
							</div>
							
							<div className="space-y-4">
								<div>
									<div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Account Type</div>
									<div className="font-bold text-lg text-black uppercase">
										{(user as any)?.customer?.customerType === 'WHOLESALE' ? (
											<span className="bg-[#FFFCF7] text-black border border-black px-2 py-0.5">Wholesale Partner</span>
										) : (
											<span className="bg-blue-100 text-black border border-black px-2 py-0.5">Retail Customer</span>
										)}
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black">
									<div>
										<div className="text-[10px] font-black uppercase text-zinc-500">Member ID</div>
										<div className="font-mono text-sm font-bold text-black border-b border-black inline-block">{`BP-${new Date().getFullYear()}-01`}</div>
									</div>
									<div>
										<div className="text-[10px] font-black uppercase text-zinc-500">Region</div>
										<div className="font-mono text-sm font-bold text-black border-b border-black inline-block">Lagos, NG</div>
									</div>
								</div>
							</div>
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
					<div className="flex items-end justify-between mb-8 pb-4 border-b-4 border-black dark:border-white">
						<h2 className="text-3xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
							<ZapIcon className="h-8 w-8 text-[#FF4500]" />
							System Actions
						</h2>
						{cartItemCount > 0 && (
							<span className="bg-black text-white px-3 py-1 text-sm font-bold border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-colors cursor-default">
								CART: {cartItemCount}
							</span>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Reusable Card Style */}
						{[
							{ title: "Catalog", subtitle: "Browse inventory", icon: PackageIcon, color: "bg-[#8B83F6]", href: "/app/products" },
							{ title: "Cart", subtitle: cartItemCount > 0 ? "Ready for checkout" : "No items", icon: ShoppingCartIcon, color: "bg-[#FF4500]", href: "/app/cart", textwhite: true },
							{ title: "Orders", subtitle: "Track shipments", icon: ClipboardListIcon, color: "bg-[#E6E0FF]", href: "/app/orders" },
							{ title: "Search", subtitle: "Global lookup", icon: SearchIcon, color: "bg-[#F5F3FF]", href: "/app/search" }
						].map((item, i) => (
							<Link key={i} href={item.href} className="group relative block h-full">
								<div className={cn(
									"absolute inset-0 border-2 border-black translate-x-1 translate-y-1 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 bg-black"
								)} />
								<div className={cn(
									"relative h-full bg-white border-2 border-black p-6 flex flex-col justify-between transition-transform transform group-hover:-translate-y-1 group-hover:-translate-x-1",
									item.color
								)}>
									<div className="flex justify-between items-start mb-6">
										<div className="p-2 bg-white border-2 border-black">
											<item.icon className="h-6 w-6 text-black" />
										</div>
										<ArrowRightIcon className={cn("h-6 w-6 text-black group-hover:translate-x-1 transition-transform", item.textwhite ? "text-white" : "")} />
									</div>
									<div className="space-y-1">
										<h3 className={cn("font-black text-xl uppercase tracking-tight", item.textwhite ? "text-white" : "text-black")}>{item.title}</h3>
										<p className={cn("text-xs font-bold uppercase tracking-wider opacity-70", item.textwhite ? "text-white" : "text-black")}>{item.subtitle}</p>
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
				<div className="border-t-4 border-black pt-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{[
							{ label: "Total SKUs", value: "10K+", icon: PackageIcon, bg: "bg-[#8B83F6]" },
							{ label: "Active Pharmacies", value: "5K+", icon: HeartIcon, bg: "bg-[#FF4500]" },
							{ label: "Cities Covered", value: "36", icon: TruckIcon, bg: "bg-[#FFD700]" },
							{ label: "Avg. Dispatch", value: "2HR", icon: Clock3Icon, bg: "bg-black text-white", textwhite: true }
						].map((stat, index) => (
							<div key={index} className={cn("p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all", stat.bg)}>
								<div className="flex items-center gap-2 mb-2">
									<stat.icon className={cn("h-5 w-5", stat.textwhite ? "text-white" : "text-black")} />
									<p className={cn("text-xs font-black uppercase tracking-widest", stat.textwhite ? "text-white/80" : "text-black/60")}>{stat.label}</p>
								</div>
								<p className={cn("text-4xl font-black tracking-tighter", stat.textwhite ? "text-white" : "text-black")}>{stat.value}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>	);
}
