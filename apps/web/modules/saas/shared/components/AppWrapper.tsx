"use client";

import { config } from "@repo/config";
import { AppNavBar } from "@saas/shared/components/AppNavBar";
import { VerificationBanners } from "@saas/shared/components/VerificationBanners";
import { cn } from "@ui/lib";
import { useEffect, type PropsWithChildren } from "react";

/**
 * Clean up legacy localStorage cart keys that may cause persistence issues.
 * This runs once on mount to ensure users start with a clean session-based cart.
 */
function cleanupLegacyCartStorage() {
	if (typeof window === "undefined") return;

	try {
		// Remove the legacy base key that was causing cart persistence
		localStorage.removeItem("benpharm-cart-items");

		// Also remove any legacy session key that might have been mirrored
		localStorage.removeItem("benpharm-cart-session");

		// Clean up any dynamically-keyed legacy mirrors
		const keysToRemove = Object.keys(localStorage).filter(
			(key) =>
				key.startsWith("benpharm-cart-items-") ||
				key.startsWith("benpharm-cart-master-")
		);
		keysToRemove.forEach((key) => localStorage.removeItem(key));
	} catch (error) {
		console.warn("Failed to cleanup legacy cart storage:", error);
	}
}

import { useCartSync } from "@saas/cart/hooks/use-cart-sync";

export function AppWrapper({ children }: PropsWithChildren) {
	// Enable automatic cart synchronization
	useCartSync();

	// Cleanup legacy cart storage on app mount
	useEffect(() => {
		cleanupLegacyCartStorage();
	}, []);
	return (
		<div
			className={cn(
				"bg-background text-foreground transition-colors duration-300",
				[config.ui.saas.useSidebarLayout ? "" : ""],
			)}
		>
			<div className="absolute inset-0 z-0 opacity-20 pointer-events-none fixed"
				style={{
					backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px),
					linear-gradient(to bottom, #808080 1px, transparent 1px)`,
					backgroundSize: "40px 40px",
				}}
			/>
			<div className="relative z-10">
			<AppNavBar />
			<div
				className={cn("min-h-screen pt-20", [
					config.ui.saas.useSidebarLayout
						? "md:ml-[280px]"
						: "",
				])}
			>
				{/* Global verification banners (email + pending approval) */}
				<VerificationBanners />
				<main
					className={cn("w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-full", [
						config.ui.saas.useSidebarLayout ? "" : "",
					])}
				>
					{children}
				</main>
			</div>
			</div>
		</div>
	);
}
