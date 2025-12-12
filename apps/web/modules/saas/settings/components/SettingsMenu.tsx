"use client";

import { cn } from "@ui/lib";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SettingsMenu({
	menuItems,
}: {
	menuItems: {
		title: string;
		avatar: ReactNode;
		items: {
			title: string;
			href: string;
			icon?: ReactNode;
		}[];
	}[];
}) {
	const pathname = usePathname();

	const isActiveMenuItem = (href: string) => pathname.includes(href);

	return (
		<div className="space-y-8">
			{menuItems.map((item, i) => (
				<div key={i}>
					<div className="flex items-center justify-start gap-2">
						{item.avatar}
						<h2 className="font-semibold text-foreground/60 text-xs">
							{item.title}
						</h2>
					</div>

					<ul className="mt-2 flex w-full list-none flex-row gap-2 overflow-x-auto pb-2 no-scrollbar lg:mt-4 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
						{item.items.map((subitem, k) => (
							<li key={k} className="shrink-0">
								<Link
									href={subitem.href}
									className={cn(
										"flex items-center gap-2 border-b-2 px-1 py-1.5 text-sm lg:border-b-0 lg:border-l-2 lg:px-0 lg:pl-2",
										isActiveMenuItem(subitem.href)
											? "border-primary font-bold"
											: "border-transparent text-muted-foreground",
									)}
									data-active={isActiveMenuItem(subitem.href)}
								>
									<span className="shrink-0">
										{subitem.icon}
									</span>
									<span className="whitespace-nowrap">{subitem.title}</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
