"use client";

import { config } from "@repo/config";
import { UnifiedNavBar, type NavMenuItem } from "@shared/components/UnifiedNavBar";
import { useTranslations } from "next-intl";

/**
 * Marketing NavBar - Wrapper around UnifiedNavBar with marketing-specific menu items.
 */
export function NavBar() {
	const t = useTranslations();

	const menuItems: NavMenuItem[] = [
		{
			label: t("common.menu.pricing"),
			href: "/#pricing",
		},
		{
			label: t("common.menu.faq"),
			href: "/#faq",
		},
		{
			label: t("common.menu.blog"),
			href: "/blog",
		},
		{
			label: t("common.menu.changelog"),
			href: "/changelog",
		},
		...(config.contactForm.enabled
			? [
					{
						label: t("common.menu.contact"),
						href: "/contact",
					},
				]
			: []),
		{
			label: t("common.menu.docs"),
			href: "/docs",
		},
	];

	return (
		<UnifiedNavBar
			variant="marketing"
			menuItems={menuItems}
			showColorModeToggle={true}
			showLocaleSwitch={config.i18n.enabled}
			logoHref="/"
		/>
	);
}
