import { Worker } from 'bullmq';
import { db } from '@repo/database';
import { getRedisConnection } from './connection.js';
import type { NotificationJobData, NotificationJobResult, NotificationProvider, QueueOptions } from './types.js';

const QUEUE_NAME = 'notifications';

let notificationWorker: Worker | null = null;
const providers = new Map<string, NotificationProvider>();

export function registerNotificationProvider(provider: NotificationProvider): void {
	providers.set(provider.channel, provider);
	console.log(`📡 Registered ${provider.name} provider for ${provider.channel} channel`);
}

export function createNotificationWorker(options: QueueOptions = {}): Worker {
	if (notificationWorker) {
		return notificationWorker;
	}

	const redis = getRedisConnection();

	notificationWorker = new Worker(
		QUEUE_NAME,
		async (job) => {
			const data = job.data as NotificationJobData;
			
			console.log(`🔄 Processing notification job ${job.id}: ${data.type} via ${data.channel}`);

			try {
				// Get the provider for this channel
				const provider = providers.get(data.channel);
				if (!provider) {
					throw new Error(`No provider registered for channel: ${data.channel}`);
				}

				// Update notification status to 'processing'
				await updateNotificationStatus(data.notificationId, 'SENT', {
					gatewayResponse: `Processing via ${provider.name}`
				});

				// Send the notification via the provider
				const result = await provider.send(data);

				if (result.success) {
					// Update notification as successful
					await updateNotificationStatus(data.notificationId, 'SENT', {
						gatewayResponse: JSON.stringify(result.providerResponse),
						sentAt: new Date()
					});

					console.log(`✅ Sent ${data.channel} notification via ${provider.name}`);
					return result;
				} else {
					// Handle failure
					const status = result.retryable ? 'PENDING' : 'FAILED';
					await updateNotificationStatus(data.notificationId, status, {
						gatewayResponse: result.error || 'Unknown error'
					});

					if (!result.retryable) {
						console.error(`❌ Non-retryable error for notification ${data.notificationId}: ${result.error}`);
						return result;
					}

					// Retryable error - will be handled by BullMQ retry mechanism
					throw new Error(result.error || 'Provider returned failure');
				}

			} catch (error) {
				console.error(`❌ Error processing notification ${data.notificationId}:`, error);

				// Update notification as failed
				await updateNotificationStatus(data.notificationId, 'FAILED', {
					gatewayResponse: error instanceof Error ? error.message : String(error)
				});

				throw error; // Re-throw for BullMQ retry handling
			}
		},
		{
			connection: redis,
			concurrency: options.concurrency || 10,
		}
	);

	// Worker event handlers
	notificationWorker.on('completed', (job, result) => {
		console.log(`✅ Worker completed job ${job.id}:`, result);
	});

	notificationWorker.on('failed', (job, err) => {
		console.error(`❌ Worker job ${job?.id} failed:`, err);
	});

	notificationWorker.on('error', (err) => {
		console.error('❌ Worker error:', err);
	});

	return notificationWorker;
}

export function getNotificationWorker(): Worker {
	if (!notificationWorker) {
		return createNotificationWorker();
	}
	return notificationWorker;
}

export async function closeNotificationWorker(): Promise<void> {
	if (notificationWorker) {
		await notificationWorker.close();
		notificationWorker = null;
	}
}

// Helper function to update notification status in database
async function updateNotificationStatus(
	notificationId: string,
	status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED',
	updates: {
		gatewayResponse?: string;
		sentAt?: Date;
		deliveredAt?: Date;
	} = {}
): Promise<void> {
	try {
		await db.notification.update({
			where: { id: notificationId },
			data: {
				status,
				...updates,
			},
		});
	} catch (error) {
		console.error(`Failed to update notification ${notificationId}:`, error);
		// Don't throw here - we don't want to fail the job because of DB update issues
	}
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
	console.log('🛑 SIGTERM received, shutting down notification worker gracefully...');
	await closeNotificationWorker();
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('🛑 SIGINT received, shutting down notification worker gracefully...');
	await closeNotificationWorker();
	process.exit(0);
});
