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
	const { data: customerProfile } = useCustomerProfileQuery();

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
				<div className="w-full bg-primary border-2 border-foreground p-8 md:p-12 shadow-hard relative overflow-hidden">
					{/* Decorative Elements */}
					<div className="absolute top-4 right-4 animate-spin-slow opacity-20">
						<SparklesIcon className="w-24 h-24 text-primary-foreground" />
					</div>

					<div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
						<div className="flex-1 space-y-6 text-center lg:text-left">
							{/* Greeting Badge - Brutalist Pill */}
							<div className="inline-flex items-center gap-2 bg-card border-2 border-foreground px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-foreground shadow-sm transform -rotate-1 hover:rotate-0 transition-transform">
								<span className="w-3 h-3 rounded-full bg-accent animate-pulse border border-foreground"></span>
								<span>{greeting}, {user?.name?.split(' ')[0] || 'User'}</span>
							</div>
							
							<h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-primary-foreground leading-[0.9] uppercase drop-shadow-sm">
								PRECISION <br />
								<span className="text-card">IN EVERY PILL</span>
							</h1>
							
							<p className="max-w-xl text-xl font-medium text-primary-foreground/80 leading-relaxed mx-auto lg:mx-0">
								The "Oh Sh*t" moment for your pharmacy logistics. <br/>
								<span className="bg-foreground text-background px-1">Verified.</span> <span className="bg-foreground text-background px-1">Secure.</span> <span className="bg-foreground text-background px-1">Fast.</span>
							</p>
							
							{/* Stats Indicators */}
							<div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
								{/* Dispatch Badge */}
								<div className="flex items-center gap-2 px-3 py-1 bg-card border border-foreground rounded-full text-sm font-bold shadow-hard text-foreground">
									<TruckIcon className="h-4 w-4" />
									<span className="uppercase">Same-day Dispatch</span>
								</div>
								{/* NAFDAC Badge */}
								<div className="flex items-center gap-2 px-4 py-1.5 bg-card border-2 border-foreground rounded-full shadow-hard hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-default">
									<img 
										src="/nafdac-logo.png" 
										alt="NAFDAC" 
										width={36}
										height={36}
										className="object-contain"
									/>
									<div className="flex flex-col leading-none">
										<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Verified</span>
										<span className="text-base font-black uppercase text-foreground tracking-tight">NAFDAC Certified</span>
									</div>
								</div>
							</div>
						</div>
						
						{/* Account Status Box - Sticker Style */}
						<div className="w-full lg:w-auto min-w-[320px] bg-card border-2 border-foreground p-6 shadow-hard transform rotate-1 hover:rotate-0 transition-all duration-300">
							<div className="flex items-start justify-between mb-6 border-b-2 border-foreground pb-4">
								<div className="p-1 bg-accent border-2 border-foreground">
									<UserAvatar 
										className="h-12 w-12"
										name={user?.name || "User"}
										avatarUrl={user?.image}
									/>
								</div>
								<div className="text-right">
									<div className="text-[10px] font-black uppercase text-foreground">Status</div>
										{/* Status - Real Data */}
										{(() => {
											const status = customerProfile?.verificationStatus || (user as any)?.customer?.verificationStatus || 'PENDING';
											const isVerified = status === 'VERIFIED';
											return (
												<div className="flex items-center justify-end gap-2 mt-1">
													<div className={cn(
														"h-2 w-2 rounded-full border border-foreground animate-pulse",
														isVerified ? "bg-green-500" : "bg-yellow-400"
													)} />
													<span className="text-sm font-black uppercase tracking-widest text-foreground">
														{status}
													</span>
												</div>
											);
										})()}
								</div>
							</div>
							
							<div className="space-y-4">
								<div>
									<div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Account Type</div>
									<div className="font-bold text-lg text-foreground uppercase">
										{(customerProfile?.customerType || (user as any)?.customer?.customerType) === 'WHOLESALE' ? (
											<span className="bg-background text-foreground border border-foreground px-2 py-0.5">Wholesale Partner</span>
										) : (
											<span className="bg-primary/20 text-foreground border border-foreground px-2 py-0.5">Retail Customer</span>
										)}
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-foreground">
									<div>
										<div className="text-[10px] font-black uppercase text-muted-foreground">Member ID</div>
										<div className="font-mono text-sm font-bold text-foreground border-b border-foreground inline-block">
											{user?.createdAt 
												? `BP-${new Date(user.createdAt).getFullYear()}-${(customerProfile?.id || (user as any)?.customer?.id)?.substring(0, 4).toUpperCase() || '0000'}`
												: `BP-${new Date().getFullYear()}-XXXX`}
										</div>
									</div>
									<div>
										<div className="text-[10px] font-black uppercase text-muted-foreground">Region</div>
										<div className="font-mono text-sm font-bold text-foreground border-b border-foreground inline-block">
											{(customerProfile?.city || (user as any)?.customer?.city) && (customerProfile?.state || (user as any)?.customer?.state)
												? `${customerProfile?.city || (user as any)?.customer?.city}, ${customerProfile?.state || (user as any)?.customer?.state}`
												: (customerProfile?.state || (user as any)?.customer?.state || "Nigeria")}
										</div>
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
						{/* Reusable Card Style */}
						{[
							{ title: "Catalog", subtitle: "Browse inventory", icon: PackageIcon, color: "bg-primary", href: "/app/products" },
							{ title: "Cart", subtitle: cartItemCount > 0 ? "Ready for checkout" : "No items", icon: ShoppingCartIcon, color: "bg-accent", href: "/app/cart", textwhite: true },
							{ title: "Orders", subtitle: "Track shipments", icon: ClipboardListIcon, color: "bg-primary/30", href: "/app/orders" },
							{ title: "Search", subtitle: "Global lookup", icon: SearchIcon, color: "bg-muted", href: "/app/search" }
						].map((item, i) => (
							<Link key={i} href={item.href} className="group relative block h-full">
								<div className={cn(
									"absolute inset-0 border-2 border-foreground translate-x-1 translate-y-1 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 bg-foreground"
								)} />
								<div className={cn(
									"relative h-full bg-card border-2 border-foreground p-6 flex flex-col justify-between transition-transform transform group-hover:-translate-y-1 group-hover:-translate-x-1",
									item.color
								)}>
									<div className="flex justify-between items-start mb-6">
										<div className="p-2 bg-card border-2 border-foreground">
											<item.icon className="h-6 w-6 text-foreground" />
										</div>
										<ArrowRightIcon className={cn("h-6 w-6 group-hover:translate-x-1 transition-transform", item.textwhite ? "text-accent-foreground" : "text-foreground")} />
									</div>
									<div className="space-y-1">
										<h3 className={cn("font-black text-xl uppercase tracking-tight", item.textwhite ? "text-accent-foreground" : "text-foreground")}>{item.title}</h3>
										<p className={cn("text-xs font-bold uppercase tracking-wider opacity-70", item.textwhite ? "text-accent-foreground" : "text-muted-foreground")}>{item.subtitle}</p>
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
							{ label: "Total SKUs", value: "10K+", icon: PackageIcon, bg: "bg-primary" },
							{ label: "Active Pharmacies", value: "5K+", icon: HeartIcon, bg: "bg-accent" },
							{ label: "Cities Covered", value: "36", icon: TruckIcon, bg: "bg-[#FFD700]" },
							{ label: "Avg. Dispatch", value: "2HR", icon: Clock3Icon, bg: "bg-foreground text-background", textwhite: true }
						].map((stat, index) => (
							<div key={index} className={cn("p-6 border-2 border-foreground shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all", stat.bg)}>
								<div className="flex items-center gap-2 mb-2">
									<stat.icon className={cn("h-5 w-5", stat.textwhite ? "text-background" : "text-primary-foreground")} />
									<p className={cn("text-xs font-black uppercase tracking-widest", stat.textwhite ? "text-background/80" : "text-primary-foreground/60")}>{stat.label}</p>
								</div>
								<p className={cn("text-4xl font-black tracking-tighter", stat.textwhite ? "text-background" : "text-primary-foreground")}>{stat.value}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>	);
}
