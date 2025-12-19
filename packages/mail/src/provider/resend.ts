import { config } from "@repo/config";
import { logger } from "@repo/logs";
import type { SendEmailHandler } from "../../types";

const { from } = config.mails;

export const send: SendEmailHandler = async ({ to, subject, html }) => {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		logger.error("RESEND_API_KEY is not set");
		throw new Error("RESEND_API_KEY is not set");
	}

	logger.info(`Sending email to ${to} with subject: ${subject}`);
	logger.info(`From address: ${from}`);

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			from,
			to,
			subject,
			html,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json();
		const errorMessage = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
		logger.error(`Resend API error (${response.status}): ${errorMessage}`);
		throw new Error(`Could not send email: ${errorMessage}`);
	}

	const result = await response.json();
	logger.info(`Email sent successfully. ID: ${result?.id}`);
};
