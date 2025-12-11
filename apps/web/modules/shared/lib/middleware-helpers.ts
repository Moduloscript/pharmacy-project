import type { Organization, Session } from "@repo/auth";
import { apiClient } from "@shared/lib/api-client";
import type { NextRequest } from "next/server";

export const getSession = async (req: NextRequest): Promise<Session | null> => {
	// Use localhost for internal middleware requests to avoid ngrok loop
	const apiOrigin = process.env.INTERNAL_API_URL || req.nextUrl.origin;
	try {
		const response = await fetch(
			new URL(
				"/api/auth/get-session?disableCookieCache=true",
				apiOrigin,
			),
			{
				headers: {
					cookie: req.headers.get("cookie") || "",
				},
			},
		);

		if (!response.ok) {
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error("Middleware getSession error:", error);
		return null;
	}
};

export const getOrganizationsForSession = async (
	req: NextRequest,
): Promise<Organization[]> => {
	const apiOrigin = process.env.INTERNAL_API_URL || req.nextUrl.origin;
	try {
		const response = await fetch(
			new URL("/api/auth/organization/list", apiOrigin),
			{
				headers: {
					cookie: req.headers.get("cookie") || "",
				},
			},
		);

		if (!response.ok) {
			return [];
		}

		return (await response.json()) ?? [];
	} catch (error) {
		console.error("Middleware getOrganizationsForSession error:", error);
		return [];
	}
};

export const getPurchasesForSession = async (
	req: NextRequest,
	organizationId?: string,
) => {
	try {
		const response = await apiClient.payments.purchases.$get(
			{
				query: {
					organizationId,
				},
			},
			{
				headers: {
					cookie: req.headers.get("cookie") || "",
				},
			},
		);

		if (!response.ok) {
			return [];
		}

		const purchases = await response.json();

		return purchases;
	} catch (error) {
		console.error("Middleware getPurchasesForSession error:", error);
		return [];
	}
};
