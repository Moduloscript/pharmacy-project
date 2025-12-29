"use client";

import { LocaleLink, useLocalePathname } from "@i18n/routing";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { ColorModeToggle } from "@shared/components/ColorModeToggle";
import { LocaleSwitch } from "@shared/components/LocaleSwitch";
import { Logo } from "@shared/components/Logo";
import { Button } from "@ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@ui/components/sheet";
import { cn } from "@ui/lib";
import { MenuIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useDebounceCallback } from "usehooks-ts";

export interface NavMenuItem {
	label: string;
	href: string;
	icon?: LucideIcon;
	isActive?: boolean;
	onClick?: () => void;
	badge?: ReactNode;
}

export interface UnifiedNavBarProps {
	variant: "marketing" | "app";
	menuItems: NavMenuItem[];
	rightSlot?: ReactNode;
	showColorModeToggle?: boolean;
	showLocaleSwitch?: boolean;
	logoHref?: string;
}

export function UnifiedNavBar({
	variant,
	menuItems,
	rightSlot,
	showColorModeToggle = true,
	showLocaleSwitch = false,
	logoHref = "/",
}: UnifiedNavBarProps) {
	const t = useTranslations();
	const { user } = useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const localePathname = useLocalePathname();
	const [isTop, setIsTop] = useState(true);

	// Scroll handler for marketing variant (dynamic background)
	const debouncedScrollHandler = useDebounceCallback(
		() => {
			setIsTop(window.scrollY <= 10);
		},
		150,
		{ maxWait: 150 },
	);

	useEffect(() => {
		if (variant === "marketing") {
			window.addEventListener("scroll", debouncedScrollHandler);
			debouncedScrollHandler();
			return () => {
				window.removeEventListener("scroll", debouncedScrollHandler);
			};
		}
	}, [debouncedScrollHandler, variant]);

	// Close mobile menu on route change
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [localePathname]);

	const isMenuItemActive = (href: string) => localePathname.startsWith(href);

	// Determine whether to show blurred background
	const showBlur = variant === "app" || !isTop;

	return (
		<nav
			className={cn(
				"fixed top-0 left-0 z-50 w-full transition-all duration-200",
				showBlur
					? "bg-card/80 shadow-sm backdrop-blur-lg border-b border-border/50"
					: "shadow-none bg-transparent",
			)}
			data-test="navigation"
		>
			<div className="container max-w-6xl">
				<div
					className={cn(
						"flex items-center justify-stretch gap-6 transition-[padding] duration-200",
						showBlur ? "py-4" : "py-6",
					)}
				>
					{/* Left: Logo */}
					<div className="flex flex-1 justify-start">
						{variant === "marketing" ? (
							<LocaleLink
								href={logoHref}
								className="block hover:no-underline active:no-underline"
							>
								<Logo />
							</LocaleLink>
						) : (
							<NextLink href={logoHref} className="block">
								<Logo />
							</NextLink>
						)}
					</div>

					{/* Center: Menu Items (Desktop) */}
					<div className="hidden flex-1 items-center justify-center lg:flex">
						{menuItems.map((menuItem) => {
							const isActive = menuItem.isActive ?? isMenuItemActive(menuItem.href);
							const LinkComponent = variant === "marketing" ? LocaleLink : NextLink;

							if (menuItem.onClick) {
								return (
									<button
										key={menuItem.href}
										onClick={(e) => {
											e.preventDefault();
											menuItem.onClick?.();
										}}
										className={cn(
											"flex items-center gap-2 px-3 py-2 font-medium text-foreground/80 text-sm transition-colors hover:text-foreground",
											isActive ? "font-bold text-foreground" : "",
										)}
									>
										{menuItem.icon && <menuItem.icon className="size-4 shrink-0 opacity-60" />}
										<span>{menuItem.label}</span>
										{menuItem.badge}
									</button>
								);
							}

							return (
								<LinkComponent
									key={menuItem.href}
									href={menuItem.href}
									className={cn(
										"flex items-center gap-2 px-3 py-2 font-medium text-foreground/80 text-sm transition-colors hover:text-foreground",
										isActive ? "font-bold text-foreground" : "",
									)}
								>
									{menuItem.icon && <menuItem.icon className="size-4 shrink-0 opacity-60" />}
									<span>{menuItem.label}</span>
									{menuItem.badge}
								</LinkComponent>
							);
						})}
					</div>

					{/* Right: Actions */}
					<div className="flex flex-1 items-center justify-end gap-3">
						{showColorModeToggle && <ColorModeToggle />}
						{showLocaleSwitch && config.i18n.enabled && (
							<Suspense>
								<LocaleSwitch />
							</Suspense>
						)}

						{/* Mobile Menu Trigger */}
						<Sheet
							open={mobileMenuOpen}
							onOpenChange={(open) => setMobileMenuOpen(open)}
						>
							<SheetTrigger asChild>
								<Button
									className="lg:hidden"
									size="icon"
									variant="outline"
									aria-label="Menu"
								>
									<MenuIcon className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent className="w-[280px]" side="right">
								<SheetTitle />
								<div className="flex flex-col items-start justify-center">
									{menuItems.map((menuItem) => {
										const isActive = menuItem.isActive ?? isMenuItemActive(menuItem.href);
										const LinkComponent = variant === "marketing" ? LocaleLink : NextLink;

										if (menuItem.onClick) {
											return (
												<button
													key={menuItem.href}
													onClick={(e) => {
														e.preventDefault();
														menuItem.onClick?.();
														setMobileMenuOpen(false);
													}}
													className={cn(
														"flex items-center gap-2 px-3 py-2 font-medium text-base text-foreground/80 w-full text-left",
														isActive ? "font-bold text-foreground" : "",
													)}
												>
													{menuItem.icon && <menuItem.icon className="size-4 shrink-0 opacity-60" />}
													<span>{menuItem.label}</span>
													{menuItem.badge}
												</button>
											);
										}

										return (
											<LinkComponent
												key={menuItem.href}
												href={menuItem.href}
												className={cn(
													"flex items-center gap-2 px-3 py-2 font-medium text-base text-foreground/80",
													isActive ? "font-bold text-foreground" : "",
												)}
												onClick={() => setMobileMenuOpen(false)}
											>
												{menuItem.icon && <menuItem.icon className="size-4 shrink-0 opacity-60" />}
												<span>{menuItem.label}</span>
												{menuItem.badge}
											</LinkComponent>
										);
									})}

									{/* Marketing: Show Login/Dashboard link in mobile */}
									{variant === "marketing" && config.ui.saas.enabled && (
										<NextLink
											key={user ? "start" : "login"}
											href={user ? "/app" : "/auth/login"}
											className="block px-3 py-2 text-base font-medium"
											prefetch={!user}
											onClick={() => setMobileMenuOpen(false)}
										>
											{user
												? t("common.menu.dashboard")
												: t("common.menu.login")}
										</NextLink>
									)}
								</div>
							</SheetContent>
						</Sheet>

						{/* Right Slot (UserMenu for App, Login Button for Marketing) */}
						{rightSlot}

						{/* Marketing: Show Login/Dashboard Button (Desktop) */}
						{variant === "marketing" && !rightSlot && config.ui.saas.enabled &&
							(user ? (
								<Button
									key="dashboard"
									className="hidden lg:flex"
									asChild
									variant="secondary"
								>
									<NextLink href="/app">
										{t("common.menu.dashboard")}
									</NextLink>
								</Button>
							) : (
								<Button
									key="login"
									className="hidden lg:flex"
									asChild
									variant="secondary"
								>
									<NextLink href="/auth/login">
										{t("common.menu.login")}
									</NextLink>
								</Button>
							))}
					</div>
				</div>
			</div>
		</nav>
	);
}
