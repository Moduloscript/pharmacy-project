import { config } from "@repo/config";
import { NavBar } from "@saas/shared/components/NavBar";
import { VerificationBanners } from "@saas/shared/components/VerificationBanners";
import { cn } from "@ui/lib";
import type { PropsWithChildren } from "react";

export function AppWrapper({ children }: PropsWithChildren) {
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
