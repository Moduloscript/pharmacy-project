import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./modules/i18n/request.ts");

const nextConfig: NextConfig = {
	transpilePackages: ["@repo/api", "@repo/auth"],
	images: {
		remotePatterns: [
			{
				// google profile images
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				// github profile images
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				// supabase storage - all patterns
				protocol: "https",
				hostname: "ehuuqltrlfcmrsiwgrml.supabase.co",
				pathname: "/storage/**",
			},
			{
				// unsplash images
				protocol: "https",
				hostname: "images.unsplash.com",
			}
		],
	},
	async redirects() {
		return [
			{
				source: "/app/settings",
				destination: "/app/settings/general",
				permanent: true,
			},
			{
				source: "/app/:organizationSlug/settings",
				destination: "/app/:organizationSlug/settings/general",
				permanent: true,
			},
			{
				source: "/app/admin",
				destination: "/app/admin/users",
				permanent: true,
			},
		];
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	outputFileTracingIncludes: {
		"/api/**": [
			"../../packages/database/src/generated/**",
			"../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
			"../../node_modules/@prisma/client/**",
		],
	},
};

export default withContentCollections(withNextIntl(nextConfig));
