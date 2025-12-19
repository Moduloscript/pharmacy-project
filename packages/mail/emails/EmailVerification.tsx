import { Link, Text, Button, Hr, Section } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";
import { EmailLayout } from "../src/templates/email/components/Layout";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

export function EmailVerification({
	url,
	name,
	locale,
	translations,
}: {
	url: string;
	name: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: translations,
	});

	const brandColor = '#0EA5E9';

	return (
		<EmailLayout
			title="Verify Your Email Address"
			preview={`Hi ${name}, please verify your email address to complete your registration.`}
		>
			<Section>
				<Text style={{ fontSize: 16, color: '#0F172A', margin: '0 0 16px' }}>
					Hi {name},
				</Text>
				<Text style={{ fontSize: 14, color: '#0F172A', margin: '0 0 24px' }}>
					{t("mail.emailVerification.body", { name }).replace(/^.*?,\s*/, '')}
				</Text>

				<Button
					href={url}
					style={{
						backgroundColor: brandColor,
						color: '#FFFFFF',
						padding: '14px 24px',
						fontSize: 16,
						fontWeight: 600,
						textDecoration: 'none',
						borderRadius: 6,
						display: 'inline-block',
					}}
				>
					{t("mail.emailVerification.confirmEmail")} →
				</Button>

				<Hr style={{ borderColor: '#E2E8F0', margin: '32px 0 16px' }} />

				<Text style={{ fontSize: 13, color: '#64748B', margin: '0 0 8px' }}>
					{t("mail.common.openLinkInBrowser")}
				</Text>
				<Link
					href={url}
					style={{
						fontSize: 12,
						color: brandColor,
						wordBreak: 'break-all',
						textDecoration: 'none',
					}}
				>
					{url}
				</Link>
			</Section>
		</EmailLayout>
	);
}

EmailVerification.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	url: "#",
	name: "John Doe",
};

export default EmailVerification;
