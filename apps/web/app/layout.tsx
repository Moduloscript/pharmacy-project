import { config } from "@repo/config";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import "./globals.css";
import "cropperjs/dist/cropper.css";

export const metadata: Metadata = {
	title: {
		absolute: config.appName,
		default: config.appName,
		template: `%s | ${config.appName}`,
	},
	description: config.appDescription,
};

export default function RootLayout({ children }: PropsWithChildren) {
	return children;
}
