"use client";

import { LocaleLink } from "@i18n/routing";
import { type Config, config } from "@repo/config";
import { usePlanData } from "@saas/payments/hooks/plan-data";
import { useLocaleCurrency } from "@shared/hooks/locale-currency";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Star, Zap, Diamond, Briefcase, Box, Infinity as InfinityIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const plans = config.payments.plans as Config["payments"]["plans"];

const planConfig: Record<string, { icon: React.ElementType; color: string; cardBg: string; artifact: React.ReactNode }> = {
	free: {
		icon: Box,
		color: "bg-neutral-200",
		cardBg: "bg-neutral-100",
		artifact: (
			<div className="absolute -right-12 -top-12 size-48 rounded-full border-4 border-black/5 opacity-20" />
		),
	},
	pro: {
		icon: Zap,
		color: "bg-[var(--color-accent)]",
		cardBg: "bg-lime-100",
		artifact: (
			<div className="absolute -right-8 -top-8 size-40 rotate-12 border-4 border-black/10 bg-[var(--color-accent)]/10 opacity-50" />
		),
	},
	enterprise: {
		icon: Briefcase,
		color: "bg-blue-200",
		cardBg: "bg-sky-100",
		artifact: (
			<div className="absolute -right-4 -top-4 size-32 rotate-45 border-4 border-black/10 bg-blue-200/20 opacity-50" />
		),
	},
	lifetime: {
		icon: InfinityIcon,
		color: "bg-purple-200",
		cardBg: "bg-purple-100",
		artifact: (
			<div className="absolute -right-10 -top-10 size-48 rotate-[30deg] border-4 border-black/10 bg-purple-200/20 opacity-50" />
		),
	},
};

export function PricingSection() {
	const t = useTranslations();
	const localeCurrency = useLocaleCurrency();
	const { planData } = usePlanData();
	const [interval, setInterval] = useState<"month" | "year">("month");

	// Filter and sort plans
	const sortedPlans = Object.entries(plans)
		.sort(([, a], [, b]) => (a.prices?.[0]?.amount || 0) - (b.prices?.[0]?.amount || 0));

	const displayPlans = sortedPlans.filter(([, plan]) => {
		const price = plan.prices?.find(
			(p) => (p.type === "one-time" || ("interval" in p && p.interval === interval)) && p.currency === localeCurrency
		);
		return price || plan.isEnterprise;
	});

	return (
		<section id="pricing" className="py-24 bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<h2 className="text-4xl font-black uppercase tracking-tight md:text-6xl mb-6">
						{t("pricing.title")}
					</h2>
					<p className="text-xl opacity-70 max-w-2xl mx-auto mb-8">
						{t("pricing.description")}
					</p>

					{/* Brutalist Toggle */}
					<div className="inline-flex items-center gap-4 p-2 border-2 border-black bg-white dark:border-white dark:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
						<button
							onClick={() => setInterval("month")}
							className={cn(
								"px-6 py-2 font-bold uppercase transition-all",
								interval === "month"
									? "bg-black text-white dark:bg-white dark:text-black"
									: "hover:bg-neutral-200 dark:hover:bg-neutral-700"
							)}
						>
							{t("pricing.monthly")}
						</button>
						<button
							onClick={() => setInterval("year")}
							className={cn(
								"px-6 py-2 font-bold uppercase transition-all",
								interval === "year"
									? "bg-black text-white dark:bg-white dark:text-black"
									: "hover:bg-neutral-200 dark:hover:bg-neutral-700"
							)}
						>
							{t("pricing.yearly")}
						</button>
					</div>
				</div>

				<div className={cn(
					"grid grid-cols-1 md:grid-cols-2 gap-8 w-full",
					displayPlans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
				)}>
					{displayPlans.map(([planId, plan]) => {
						const price = plan.prices?.find(
							(p) => (p.type === "one-time" || ("interval" in p && p.interval === interval)) && p.currency === localeCurrency
						);

						// Already filtered, but keep safe access
						if (!price && !plan.isEnterprise) return null;

						const isRecommended = plan.recommended;
						const features = planData[planId as keyof typeof planData]?.features || [];
						const config = planConfig[planId] || planConfig.free;
						const Icon = config.icon;

						return (
							<motion.div
								key={planId}
								whileHover={{ y: -8 }}
								className={cn(
									"relative flex flex-col p-8 border-2 border-black dark:border-white dark:bg-neutral-900 transition-all overflow-hidden group",
									config.cardBg,
									"shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]",
									isRecommended && "ring-2 ring-black dark:ring-white"
								)}
							>
								{/* Background Artifact */}
								<div className="pointer-events-none select-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
									{config.artifact}
								</div>

								{isRecommended && (
									<div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-black px-4 py-1 border-2 border-black font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
										Most Popular
									</div>
								)}

								<div className="mb-8 relative z-10">
									<div className="flex items-center gap-3 mb-4">
										<div className={cn(
											"size-12 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
											config.color
										)}>
											<Icon className="size-6 text-black" strokeWidth={2.5} />
										</div>
										<h3 className="text-2xl font-black uppercase">
											{planData[planId as keyof typeof planData]?.title || planId}
										</h3>
									</div>
									<p className="opacity-70 text-sm font-medium min-h-[40px]">
										{planData[planId as keyof typeof planData]?.description}
									</p>
								</div>

								<div className="mb-8 pb-8 border-b-2 border-black/10 dark:border-white/10 relative z-10">
									{plan.isEnterprise ? (
										<div className="text-4xl font-black uppercase">Custom</div>
									) : (
										<div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
											<span className="text-3xl md:text-4xl font-black tracking-tight">
												{Intl.NumberFormat("en-US", {
													style: "currency",
													currency: price?.currency || "USD",
													minimumFractionDigits: 0,
												}).format(price?.amount || 0)}
											</span>
											{price?.type !== "one-time" && (
												<span className="opacity-60 font-bold uppercase text-sm">
													/{interval}
												</span>
											)}
										</div>
									)}
								</div>

								<ul className="space-y-4 mb-8 flex-1 relative z-10">
									{features.map((feature, i) => (
										<li key={i} className="flex items-start gap-3">
											<div className="mt-1 size-5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
												<Check className="size-3 stroke-[4]" />
											</div>
											<span className="font-medium text-sm">
												{feature}
											</span>
										</li>
									))}
								</ul>

								<Button
									asChild
									className={cn(
										"w-full h-14 text-lg font-bold uppercase border-2 border-black rounded-none transition-all relative z-10",
										isRecommended
											? "bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent)] hover:brightness-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
											: "bg-white text-black hover:bg-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:bg-neutral-800 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
									)}
								>
									<LocaleLink href={plan.isEnterprise ? "/contact" : "/auth/signup"}>
										{plan.isEnterprise ? t("pricing.contactSales") : t("pricing.getStarted")}
									</LocaleLink>
								</Button>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
