import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from './connection.js';
import type { NotificationJobData, QueueOptions } from './types.js';

const QUEUE_NAME = 'notifications';

let notificationQueue: Queue<NotificationJobData> | null = null;
let queueEvents: QueueEvents | null = null;

export function createNotificationQueue(options: QueueOptions = {}): Queue<NotificationJobData> {
	if (notificationQueue) {
		return notificationQueue;
	}

	const redis = getRedisConnection();

	notificationQueue = new Queue<NotificationJobData>(QUEUE_NAME, {
		connection: redis,
		defaultJobOptions: {
			attempts: options.maxAttempts || 3,
			backoff: {
				type: 'exponential',
				delay: options.backoffDelay || 2000,
			},
			removeOnComplete: options.removeOnComplete || 100,
			removeOnFail: options.removeOnFail || 500,
		},
	});

	// Set up queue events for monitoring
	queueEvents = new QueueEvents(QUEUE_NAME, {
		connection: redis,
	});

	// Event handlers for monitoring
	queueEvents.on('completed', ({ jobId, returnvalue }) => {
		console.log(`✅ Notification job ${jobId} completed:`, returnvalue);
	});

	queueEvents.on('failed', ({ jobId, failedReason }) => {
		console.error(`❌ Notification job ${jobId} failed:`, failedReason);
	});

	queueEvents.on('stalled', ({ jobId }) => {
		console.warn(`⚠️ Notification job ${jobId} stalled`);
	});

	return notificationQueue;
}

export function getNotificationQueue(): Queue<NotificationJobData> {
	if (!notificationQueue) {
		return createNotificationQueue();
	}
	return notificationQueue;
}

export async function addNotificationJob(
	jobName: string,
	data: NotificationJobData,
	options: {
		priority?: number;
		delay?: number;
		attempts?: number;
	} = {}
): Promise<string> {
	const queue = getNotificationQueue();
	
	const job = await queue.add(jobName, data, {
		priority: options.priority || 0,
		delay: options.delay,
		attempts: options.attempts,
	});

	console.log(`📬 Queued ${data.channel} notification: ${jobName} (Job ID: ${job.id})`);
	return job.id!;
}

// Convenience methods for different notification types
export async function queueOrderConfirmation(data: NotificationJobData): Promise<string> {
	return addNotificationJob('order_confirmation', data, { priority: 10 });
}

export async function queuePaymentSuccess(data: NotificationJobData): Promise<string> {
	return addNotificationJob('payment_success', data, { priority: 10 });
}

export async function queueDeliveryUpdate(data: NotificationJobData): Promise<string> {
	return addNotificationJob('delivery_update', data, { priority: 5 });
}

export async function queueLowStockAlert(data: NotificationJobData): Promise<string> {
	return addNotificationJob('low_stock_alert', data, { priority: 8 });
}

export async function closeNotificationQueue(): Promise<void> {
	if (queueEvents) {
		await queueEvents.close();
		queueEvents = null;
	}
	
	if (notificationQueue) {
		await notificationQueue.close();
		notificationQueue = null;
	}
}

// Queue health and stats
export async function getQueueStats() {
	const queue = getNotificationQueue();
	
	const [waiting, active, completed, failed, delayed] = await Promise.all([
		queue.getWaiting(),
		queue.getActive(),
		queue.getCompleted(),
		queue.getFailed(),
		queue.getDelayed(),
	]);

	return {
		waiting: waiting.length,
		active: active.length,
		completed: completed.length,
		failed: failed.length,
		delayed: delayed.length,
		total: waiting.length + active.length + completed.length + failed.length + delayed.length,
	};
}
