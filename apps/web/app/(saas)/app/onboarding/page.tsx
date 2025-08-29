import { config } from "@repo/config";
import { getSession } from "@saas/auth/lib/server";
import { OnboardingForm } from "@saas/onboarding/components/OnboardingForm";
import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { userNeedsCustomerProfile } from "@repo/auth/lib/user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("onboarding.title"),
	};
}

export default async function OnboardingPage() {
	const session = await getSession();

	if (!session) {
		return redirect("/auth/login");
	}

	// If onboarding is disabled, or user completed onboarding AND already has a customer profile, go to app
	const needsProfile = await userNeedsCustomerProfile(session.user.id);
	if (!config.users.enableOnboarding || (session.user.onboardingComplete && !needsProfile)) {
		return redirect("/app");
	}

	return (
		<AuthWrapper>
			<OnboardingForm />
		</AuthWrapper>
	);
}
