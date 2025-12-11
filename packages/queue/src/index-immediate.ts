import type { NotificationJobData, NotificationType } from './types';
import { sendNotificationWithRetry } from '@repo/mail';

/**
 * Add notification job - Immediate send version (Vercel Hobby plan compatible)
 * 
 * This replaces the queue-based addNotificationJob for Vercel Hobby plan.
 * Sends notifications immediately instead of queueing them.
 * 
 * @param type - Notification type
 * @param data - Notification job data
 * @param options - Queue options (ignored in immediate mode)
 * @returns Job ID (notification ID)
 */
export async function addNotificationJob(
	type: NotificationType | string,
	data: NotificationJobData,
	options?: any
): Promise<string> {
	console.log(`📤 Sending ${data.channel} notification immediately (type: ${type})`);
	
	// Send notification immediately in the background (don't await)
	// This prevents blocking the API response
	sendNotificationWithRetry(data).catch((error: any) => {
		console.error(`❌ Failed to send notification ${data.notificationId}:`, error);
	});
	
	// Return the notification ID immediately
	return data.notificationId;
}

// Re-export everything else from the original queue package
export * from './notifications';
export * from './connection';
export * from './worker';
export type * from './types';
