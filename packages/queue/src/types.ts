// Re-export notification types from @repo/mail to avoid circular dependency
export type {
	NotificationChannel,
	NotificationStatus,
	NotificationType,
	NotificationJobData,
	NotificationJobResult,
	NotificationProvider
} from '@repo/mail';


export interface QueueOptions {
	concurrency?: number;
	maxAttempts?: number;
	backoffDelay?: number;
	removeOnComplete?: number;
	removeOnFail?: number;
}
