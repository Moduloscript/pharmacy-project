import type { NotificationChannel, NotificationJobData } from '../types';
import { TermiiProvider, ResendEmailProvider } from './provider';
import { db } from '@repo/database';

// Initialize providers
const emailProvider = new ResendEmailProvider();
const smsProvider = new TermiiProvider({
	apiKey: process.env.SMS_API_KEY || '',
	senderId: process.env.SMS_SENDER_ID || '',
});

/**
 * Send notification immediately without queueing
 * This is used for Vercel Hobby plan compatibility (no cron jobs)
 */
export async function sendNotificationImmediate(
	data: NotificationJobData
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get the appropriate provider
		const provider = data.channel === 'email' ? emailProvider : smsProvider;

		// Update notification status to PENDING
		await db.notification.update({
			where: { id: data.notificationId },
			data: { status: 'PENDING' },
		});

		// Send the notification
		const result = await provider.send(data);

		if (result.success) {
			// Update notification as sent
			await db.notification.update({
				where: { id: data.notificationId },
				data: {
					status: 'SENT',
					sentAt: new Date(),
					externalMessageId: result.providerMessageId,
					gatewayResponse: JSON.stringify(result.providerResponse),
				},
			});

			console.log(
				`✅ Sent ${data.channel} notification immediately (ID: ${data.notificationId})`
			);
			return { success: true };
		} else {
			// Update notification as failed
			await db.notification.update({
				where: { id: data.notificationId },
				data: {
					status: 'FAILED',
					failedAt: new Date(),
					errorMessage: result.error,
					gatewayResponse: result.error,
				},
			});

			console.error(
				`❌ Failed to send ${data.channel} notification: ${result.error}`
			);
			return { success: false, error: result.error };
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';

		// Update notification as failed
		try {
			await db.notification.update({
				where: { id: data.notificationId },
				data: {
					status: 'FAILED',
					failedAt: new Date(),
					errorMessage,
					gatewayResponse: errorMessage,
				},
			});
		} catch (dbError) {
			console.error('Failed to update notification status:', dbError);
		}

		console.error(
			`❌ Error sending notification ${data.notificationId}:`,
			error
		);
		return { success: false, error: errorMessage };
	}
}

/**
 * Send notification with simple retry logic
 */
export async function sendNotificationWithRetry(
	data: NotificationJobData,
	maxRetries = 2
): Promise<{ success: boolean; error?: string }> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const result = await sendNotificationImmediate(data);

		if (result.success) {
			return result;
		}

		// If not the last attempt, wait before retrying
		if (attempt < maxRetries) {
			const delay = 1000 * (attempt + 1); // Exponential backoff: 1s, 2s
			console.log(
				`⏳ Retrying notification ${data.notificationId} in ${delay}ms...`
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		success: false,
		error: `Failed after ${maxRetries + 1} attempts`,
	};
}
