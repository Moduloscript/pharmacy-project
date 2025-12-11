// Export existing mail functionality
export * from './provider/index';

// Export new notification functionality
export { NotificationService } from './notification-service';
export { EnhancedNotificationService, enhancedNotificationService } from './notification-service-enhanced';
export type { INotificationProvider, NotificationTemplate, ProviderResponse } from './provider/notifications';
export { BaseNotificationProvider } from './provider/notifications';

// Export immediate sending (for Vercel Hobby plan)
export { sendNotificationImmediate, sendNotificationWithRetry } from './send-immediate';

// Export templates
export { notificationTemplates, templateMessages, getTemplateMessage } from './templates/index';

// Monitoring exports
export { NotificationMonitor, notificationMonitor } from './monitoring/notification-monitor';

// Create and export a global notification service instance
import { NotificationService } from './notification-service';
export const notificationService = new NotificationService();
