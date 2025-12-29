import { AppWrapper } from "@saas/shared/components/AppWrapper";
import type { PropsWithChildren } from "react";

export default function UserLayout({ children }: PropsWithChildren) {
	return (
		<div className="theme-ujjo contents">
			<AppWrapper>{children}</AppWrapper>
		</div>
	);
}
