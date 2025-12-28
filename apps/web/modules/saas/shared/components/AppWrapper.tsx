"use client";

import { config } from "@repo/config";
import { NavBar } from "@saas/shared/components/NavBar";
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

export function AppWrapper({ children }: PropsWithChildren) {
	// Cleanup legacy cart storage on app mount
	useEffect(() => {
		cleanupLegacyCartStorage();
	}, []);
	return (
		<div
			className={cn(
				"bg-[radial-gradient(farthest-corner_at_0%_0%,color-mix(in_oklch,var(--color-primary),transparent_95%)_0%,var(--color-background)_50%)] dark:bg-[radial-gradient(farthest-corner_at_0%_0%,color-mix(in_oklch,var(--color-primary),transparent_90%)_0%,var(--color-background)_50%)]",
				[config.ui.saas.useSidebarLayout ? "" : ""],
			)}
		>
			<NavBar />
			<div
				className={cn("min-h-screen", [
					config.ui.saas.useSidebarLayout
						? "md:ml-[280px]"
						: "",
				])}
			>
				{/* Global verification banners (email + pending approval) */}
				<VerificationBanners />
				<main
					className={cn("w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px]", [
						config.ui.saas.useSidebarLayout ? "" : "",
					])}
				>
					{children}
				</main>
			</div>
		</div>
	);
}
