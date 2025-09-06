// Connection management
export { createRedisConnection, getRedisConnection, closeRedisConnection } from './connection.js';

// Queue management
export {
	createNotificationQueue,
	getNotificationQueue,
	addNotificationJob,
	queueOrderConfirmation,
	queuePaymentSuccess,
	queueDeliveryUpdate,
	queueLowStockAlert,
	closeNotificationQueue,
	getQueueStats,
} from './notifications.js';

// Worker management
export {
	registerNotificationProvider,
	createNotificationWorker,
	getNotificationWorker,
	closeNotificationWorker,
} from './worker.js';

// Types
export type {
	NotificationChannel,
	NotificationStatus,
	NotificationType,
	NotificationJobData,
	NotificationJobResult,
	NotificationProvider,
	QueueOptions,
} from './types.js';
