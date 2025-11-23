import type { Organization, Session } from "@repo/auth";
import { apiClient } from "@shared/lib/api-client";
import type { NextRequest } from "next/server";

export const getSession = async (req: NextRequest): Promise<Session | null> => {
	// Use localhost for internal middleware requests to avoid ngrok loop
	const apiOrigin = process.env.INTERNAL_API_URL || "http://localhost:3000";
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
};

export const getOrganizationsForSession = async (
	req: NextRequest,
): Promise<Organization[]> => {
	const apiOrigin = process.env.INTERNAL_API_URL || "http://localhost:3000";
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
};

export const getPurchasesForSession = async (
	req: NextRequest,
	organizationId?: string,
) => {
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
};
