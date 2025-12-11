// Export notification types
export type {
	NotificationChannel,
	NotificationStatus,
	NotificationType,
	NotificationJobData,
	NotificationJobResult,
	NotificationProvider
} from './types';

export * from "./src/index";
export { sendEmail } from "./src/util/send";
