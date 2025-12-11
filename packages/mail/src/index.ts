// Export existing mail functionality
export * from './provider/index';

// Export new notification functionality (providers and types only)
export type { INotificationProvider, NotificationTemplate, ProviderResponse } from './provider/notifications';
export { BaseNotificationProvider } from './provider/notifications';

// Export immediate sending (for Vercel Hobby plan)
export { sendNotificationImmediate, sendNotificationWithRetry } from './send-immediate';

// Export templates
export { notificationTemplates, templateMessages, getTemplateMessage } from './templates/index';

// Monitoring exports
export { NotificationMonitor, notificationMonitor } from './monitoring/notification-monitor';

// Export notification services
export { NotificationService, notificationService } from './services/notification.service';
export { EnhancedNotificationService, enhancedNotificationService } from './services/enhanced-notification.service';


