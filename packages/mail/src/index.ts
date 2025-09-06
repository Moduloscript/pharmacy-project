// Export existing mail functionality
export * from './provider/index';

// Export new notification functionality
export { NotificationService } from './notification-service';
export type { INotificationProvider, NotificationTemplate, ProviderResponse } from './provider/notifications';
export { BaseNotificationProvider } from './provider/notifications';

// Export templates
export { notificationTemplates, templateMessages, getTemplateMessage } from './templates/index';

// Monitoring exports
export { NotificationMonitor, notificationMonitor } from './monitoring/notification-monitor';

// Create and export a global notification service instance
import { NotificationService } from './notification-service';
export const notificationService = new NotificationService();
