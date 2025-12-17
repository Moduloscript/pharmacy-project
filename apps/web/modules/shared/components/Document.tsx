import "@/lib/polyfill-storage";
import { AnalyticsScript } from "@analytics";
import { config } from "@repo/config";
import { ApiClientProvider } from "@shared/components/ApiClientProvider";
import { Toaster } from "@ui/components/toast";
import { cn } from "@ui/lib";
import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "next-themes";
import { Manrope, Unbounded } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

const headingFont = Unbounded({
	subsets: ["latin"],
	variable: "--font-heading",
});

const bodyFont = Manrope({
	subsets: ["latin"],
	variable: "--font-body",
});

export function Document({
	children,
	locale,
}: PropsWithChildren<{ locale: string }>) {
	return (
		<html lang={locale} suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={cn(
					"min-h-screen bg-background font-body text-foreground antialiased",
					headingFont.variable,
					bodyFont.variable,
				)}
			>
				<NuqsAdapter>
					<NextTopLoader color="var(--color-primary)" />
					<ThemeProvider
						attribute="class"
						disableTransitionOnChange
						enableSystem
						defaultTheme={config.ui.defaultTheme}
						themes={config.ui.enabledThemes}
					>
						<ApiClientProvider>
							<JotaiProvider>{children}</JotaiProvider>
						</ApiClientProvider>
					</ThemeProvider>
					<Toaster position="top-right" />
					<AnalyticsScript />
				</NuqsAdapter>
			</body>
		</html>
	);
}
