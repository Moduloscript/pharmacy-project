"use client";

import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { UserMenu } from "@saas/shared/components/UserMenu";
import { UnifiedNavBar, type NavMenuItem } from "@shared/components/UnifiedNavBar";
import {
	BotMessageSquareIcon,
	ClipboardListIcon,
	HomeIcon,
	PackageIcon,
	SearchIcon,
	ShoppingCartIcon,
	UserCog2Icon,
	UserCogIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAtomValue } from "jotai";
import { cartSummaryAtom } from "@saas/cart/lib/cart-store";
import { useCartDrawer } from "@saas/cart/hooks/use-cart-drawer";
import { CartDrawer } from "@saas/cart/components/CartDrawer";

/**
 * App NavBar - Wrapper around UnifiedNavBar with app-specific menu items.
 */
export function AppNavBar() {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization } = useActiveOrganization();
	const cartSummary = useAtomValue(cartSummaryAtom);
	const { isOpen: isCartOpen, openDrawer: openCartDrawer, closeDrawer: closeCartDrawer } = useCartDrawer();

	const basePath = activeOrganization
		? `/app/${activeOrganization.slug}`
		: "/app";

	// Cart badge
	const cartBadge = !cartSummary.isEmpty ? (
		<span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
			{cartSummary.totalQuantity > 99 ? '99+' : cartSummary.totalQuantity}
		</span>
	) : null;

	// Pharmaceutical menu items (when organizations are disabled)
	const pharmaceuticalMenuItems: NavMenuItem[] = !config.organizations.enable ? [
		{
			label: "Products",
			href: "/app/products",
			icon: PackageIcon,
			isActive: pathname.startsWith("/app/products"),
		},
		{
			label: "Cart",
			href: "/app/cart",
			icon: ShoppingCartIcon,
			isActive: pathname === "/app/cart",
			// Only show drawer when NOT on cart page
			...(pathname !== "/app/cart" ? { onClick: openCartDrawer } : {}),
			badge: cartBadge,
		},
		{
			label: "Orders",
			href: "/app/orders",
			icon: ClipboardListIcon,
			isActive: pathname.startsWith("/app/orders"),
		},
		{
			label: "Search",
			href: "/app/search",
			icon: SearchIcon,
			isActive: pathname === "/app/search",
		},
	] : [];

	const isAdmin = user?.role === "admin";

	const menuItems: NavMenuItem[] = isAdmin
		? [
				{
					label: t("app.menu.admin"),
					href: "/app/admin",
					icon: UserCogIcon,
					isActive: pathname.startsWith("/app/admin"),
				},
			]
		: [
				{
					label: t("app.menu.start"),
					href: basePath,
					icon: HomeIcon,
					isActive: pathname === basePath,
				},
				...pharmaceuticalMenuItems,
				{
					label: t("app.menu.aiChatbot"),
					href: activeOrganization
						? `/app/${activeOrganization.slug}/chatbot`
						: "/app/chatbot",
					icon: BotMessageSquareIcon,
					isActive: pathname.includes("/chatbot"),
				},
				...(activeOrganization
					? [
							{
								label: t("app.menu.organizationSettings"),
								href: `${basePath}/settings`,
								icon: undefined, // Settings icon removed for cleaner look
								isActive: pathname.startsWith(`${basePath}/settings/`),
							},
						]
					: [
							{
								label: t("app.menu.accountSettings"),
								href: "/app/settings",
								icon: UserCog2Icon,
								isActive: pathname.startsWith("/app/settings/"),
							},
						]),
			];

	return (
		<>
			<UnifiedNavBar
				variant="app"
				menuItems={menuItems}
				showColorModeToggle={false}
				showLocaleSwitch={false}
				logoHref="/app"
				rightSlot={<UserMenu />}
			/>
			{/* Cart Drawer */}
			<CartDrawer 
				isOpen={isCartOpen} 
				onClose={closeCartDrawer} 
			/>
		</>
	);
}
