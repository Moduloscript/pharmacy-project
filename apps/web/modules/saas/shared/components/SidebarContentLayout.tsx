import type { ReactNode } from "react";

export function SidebarContentLayout({
	children,
	sidebar,
}: { children: React.ReactNode; sidebar: ReactNode }) {
	return (
		<div className="relative">
			<div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-8">
				<div className="top-4 hidden w-full lg:sticky lg:block lg:max-w-[180px]">
					{sidebar}
				</div>

				<div className="w-full flex-1">{children}</div>
			</div>
		</div>
	);
}
