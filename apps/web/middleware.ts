import { routing } from "@i18n/routing";
import { config as appConfig } from "@repo/config";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import {
	getOrganizationsForSession,
	getPurchasesForSession,
	getSession,
} from "@shared/lib/middleware-helpers";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { withQuery } from "ufo";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
	const { pathname, origin } = req.nextUrl;

	// Bypass i18n and auth logic for specific routes
	if (
		pathname.startsWith('/pdf.worker') ||
		pathname.startsWith('/image-proxy') ||
		pathname.startsWith('/test-head') ||
		pathname.startsWith('/api')
	) {
		return NextResponse.next();
	}

	if (pathname.startsWith("/app")) {
		const response = NextResponse.next();

		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		const session = await getSession(req);
		let locale = req.cookies.get(appConfig.i18n.localeCookieName)?.value;

		if (!session) {
			return NextResponse.redirect(
				new URL(
					withQuery("/auth/login", {
						redirectTo: pathname,
					}),
					origin,
				),
			);
		}

		// Enforce email verification for all users before accessing /app (configurable)
		if (appConfig.users.requireEmailVerification && !session.user?.emailVerified) {
			return NextResponse.redirect(new URL("/auth/verify-email", origin));
		}

		// Role-based access control
		const isAdminUser = session.user?.role === "admin";

		// Admins: only allow /app/admin routes; everything else redirects to /app/admin
		if (isAdminUser) {
			if (!(pathname === "/app/admin" || pathname.startsWith("/app/admin/"))) {
				return NextResponse.redirect(new URL("/app/admin", origin));
			}
			// Allow admin area; skip onboarding/billing checks below
			return response;
		}

		// Non-admins: block access to /app/admin routes
		if (pathname === "/app/admin" || pathname.startsWith("/app/admin/")) {
			return NextResponse.redirect(new URL("/app", origin));
		}

		// Onboarding enforcement for regular users only
		if (appConfig.users.enableOnboarding) {
			const isOnOnboardingPage = pathname === "/app/onboarding";
			// If onboarding not completed, force onboarding
			if (!session.user.onboardingComplete && !isOnOnboardingPage) {
				return NextResponse.redirect(
					new URL(
						withQuery("/app/onboarding", {
							redirectTo: pathname,
						}),
						origin,
					),
				);
			}
			// If onboardingComplete is true, also ensure a customer profile exists
			if (!isOnOnboardingPage) {
				try {
					const profileRes = await fetch(new URL("/api/customers/profile", origin), {
						headers: { cookie: req.headers.get("cookie") ?? "" },
					});
					if (profileRes.ok) {
						const data = (await profileRes.json()) as { needsProfile?: boolean };
						if (data?.needsProfile) {
							return NextResponse.redirect(
								new URL(
									withQuery("/app/onboarding", {
										redirectTo: pathname,
									}),
									origin,
								),
							);
						}
					}
				} catch {}
			}
		}

		// Business verification enforcement (non-admins) - configurable via flags
		if (
			appConfig.users.requireBusinessApproval &&
			pathname !== "/app/pending-verification" &&
			!(pathname === "/app/admin" || pathname.startsWith("/app/admin/"))
		) {
			try {
				const profileRes = await fetch(new URL("/api/customers/profile", origin), {
					headers: { cookie: req.headers.get("cookie") ?? "" },
				});
				if (profileRes.ok) {
					const data = (await profileRes.json()) as {
						needsProfile?: boolean;
						customerType?: string | null;
						verificationStatus?: string | null;
					};
					// If a profile exists and customer is a business type, require VERIFIED status
					if (
						!data?.needsProfile &&
						data?.customerType &&
						data.customerType !== "RETAIL" &&
						data.verificationStatus !== "VERIFIED"
					) {
						return NextResponse.redirect(new URL("/app/pending-verification", origin));
					}
				}
			} catch {}
		}

		if (
			!locale ||
			(session.user.locale && locale !== session.user.locale)
		) {
			locale = session.user.locale ?? appConfig.i18n.defaultLocale;
			response.cookies.set(appConfig.i18n.localeCookieName, locale);
		}

		if (
			appConfig.organizations.enable &&
			appConfig.organizations.requireOrganization &&
			pathname === "/app"
		) {
			const organizations = await getOrganizationsForSession(req);
			const organization =
				organizations.find(
					(org) => org.id === session?.session.activeOrganizationId,
				) || organizations[0];

			return NextResponse.redirect(
				new URL(
					organization
						? `/app/${organization.slug}`
						: "/app/new-organization",
					origin,
				),
			);
		}

		const hasFreePlan = Object.values(appConfig.payments.plans).some(
			(plan) => "isFree" in plan,
		);
		if (
			((appConfig.organizations.enable &&
				appConfig.organizations.enableBilling) ||
				appConfig.users.enableBilling) &&
			!hasFreePlan
		) {
			const organizationId = appConfig.organizations.enable
				? session?.session.activeOrganizationId ||
					(await getOrganizationsForSession(req))?.at(0)?.id
				: undefined;

			const purchases = await getPurchasesForSession(req, organizationId);
			const { activePlan } = createPurchasesHelper(purchases);

			const validPathsWithoutPlan = [
				"/app/choose-plan",
				"/app/onboarding",
				"/app/new-organization",
			];
			if (!activePlan && !validPathsWithoutPlan.includes(pathname)) {
				return NextResponse.redirect(
					new URL("/app/choose-plan", origin),
				);
			}
		}

		return response;
	}

	if (pathname.startsWith("/auth")) {
		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		const session = await getSession(req);
		const isVerifyEmailPath = pathname === "/auth/verify-email";
		const isResetPasswordPath = pathname === "/auth/reset-password";

		if (session) {
			// If the user is logged in but hasn't verified email, only allow the verify-email page (configurable)
			if (appConfig.users.requireEmailVerification && !session.user?.emailVerified) {
				if (!isVerifyEmailPath) {
					return NextResponse.redirect(new URL("/auth/verify-email", origin));
				}
				return NextResponse.next();
			}
			// If verified (or verification not required), keep current behavior except for reset-password
			if (!isResetPasswordPath) {
				return NextResponse.redirect(new URL("/app", origin));
			}
		}

		return NextResponse.next();
	}

	if (!appConfig.ui.marketing.enabled) {
		return NextResponse.redirect(new URL("/app", origin));
	}

	return intlMiddleware(req);
}

export const config = {
	matcher: [
		"/((?!api|image-proxy|images|fonts|pdf\\.worker\\.min\\.mjs|pdf\\.worker\\.min\\.js|pdf\\.worker|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
