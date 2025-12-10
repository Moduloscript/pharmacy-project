var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { z } from 'zod';
import { db } from '@repo/database';
import { notificationMonitor } from '../monitoring/notification-monitor';
/**
 * Notification Management API Endpoints for BenPharm
 *
 * Provides REST API endpoints for:
 * - Sending notifications
 * - Checking notification status
 * - Getting delivery metrics
 * - Managing notification preferences
 */
// Validation schemas
const sendNotificationSchema = z.object({
    recipient: z.string().min(1, 'Recipient is required'),
    channel: z.enum(['sms', 'whatsapp', 'email']),
    type: z.string().min(1, 'Type is required'),
    data: z.record(z.any()).optional(),
    template: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    scheduledAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});
const bulkNotificationSchema = z.object({
    notifications: z.array(sendNotificationSchema).min(1).max(100), // Limit bulk operations
});
const updatePreferencesSchema = z.object({
    userId: z.string(),
    preferences: z.object({
        sms: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        email: z.boolean().optional(),
        marketingNotifications: z.boolean().optional(),
        orderNotifications: z.boolean().optional(),
        promotionalNotifications: z.boolean().optional(),
    })
});
export class NotificationAPI {
    constructor(notificationService, queue) {
        this.notificationService = notificationService;
        this.queue = queue;
    }
    /**
     * Send a single notification
     */
    sendNotification(c) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const body = yield c.req.json();
                const validatedData = sendNotificationSchema.parse(body);
                console.log(`📤 API: Sending ${validatedData.channel} notification to ${validatedData.recipient}`);
                // Check if recipient has opt-ed out for this channel
                const isOptedOut = yield this.checkOptOutStatus(validatedData.recipient, validatedData.channel);
                if (isOptedOut) {
                    return c.json({
                        success: false,
                        error: 'Recipient has opted out of this notification channel',
                        code: 'OPTED_OUT'
                    }, 400);
                }
                // Create notification record
                const notification = yield db.notification.create({
                    data: {
                        recipient: validatedData.recipient,
                        channel: validatedData.channel,
                        type: validatedData.type,
                        template: validatedData.template,
                        data: validatedData.data || {},
                        status: 'PENDING',
                        priority: validatedData.priority,
                        scheduledAt: validatedData.scheduledAt,
                        attempts: 0,
                        maxAttempts: 3,
                    }
                });
                // Queue the notification for processing
                if (validatedData.scheduledAt && validatedData.scheduledAt > new Date()) {
                    // Schedule for future delivery
                    const delay = validatedData.scheduledAt.getTime() - Date.now();
                    yield this.queue.add('send-notification', { notificationId: notification.id }, { delay, attempts: 3 });
                    console.log(`⏰ Scheduled notification ${notification.id} for ${validatedData.scheduledAt}`);
                }
                else {
                    // Send immediately
                    yield this.queue.add('send-notification', { notificationId: notification.id }, {
                        attempts: 3,
                        priority: this.getPriority(validatedData.priority)
                    });
                    console.log(`🚀 Queued notification ${notification.id} for immediate delivery`);
                }
                return c.json({
                    success: true,
                    data: {
                        notificationId: notification.id,
                        status: notification.status,
                        scheduledAt: notification.scheduledAt,
                        estimatedDelivery: this.calculateEstimatedDelivery(validatedData.priority)
                    }
                }, 201);
            }
            catch (error) {
                console.error('❌ Error sending notification:', error);
                if (error instanceof z.ZodError) {
                    return c.json({
                        success: false,
                        error: 'Invalid request data',
                        details: error.errors
                    }, 400);
                }
                return c.json({
                    success: false,
                    error: 'Failed to send notification',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }, 500);
            }
        });
    }
    /**
     * Send multiple notifications at once
     */
    sendBulkNotifications(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedData = bulkNotificationSchema.parse(req.body);
                console.log(`📤 API: Sending ${validatedData.notifications.length} bulk notifications`);
                const results = [];
                const failed = [];
                for (const notificationData of validatedData.notifications) {
                    try {
                        // Check opt-out status
                        const isOptedOut = yield this.checkOptOutStatus(notificationData.recipient, notificationData.channel);
                        if (isOptedOut) {
                            failed.push({
                                recipient: notificationData.recipient,
                                channel: notificationData.channel,
                                error: 'Recipient has opted out'
                            });
                            continue;
                        }
                        // Create notification
                        const notification = yield db.notification.create({
                            data: {
                                recipient: notificationData.recipient,
                                channel: notificationData.channel,
                                type: notificationData.type,
                                template: notificationData.template,
                                data: notificationData.data || {},
                                status: 'PENDING',
                                priority: notificationData.priority,
                                scheduledAt: notificationData.scheduledAt,
                                attempts: 0,
                                maxAttempts: 3,
                            }
                        });
                        // Queue notification
                        if (notificationData.scheduledAt && notificationData.scheduledAt > new Date()) {
                            const delay = notificationData.scheduledAt.getTime() - Date.now();
                            yield this.queue.add('send-notification', { notificationId: notification.id }, { delay, attempts: 3 });
                        }
                        else {
                            yield this.queue.add('send-notification', { notificationId: notification.id }, {
                                attempts: 3,
                                priority: this.getPriority(notificationData.priority)
                            });
                        }
                        results.push({
                            notificationId: notification.id,
                            recipient: notification.recipient,
                            status: notification.status
                        });
                    }
                    catch (error) {
                        failed.push({
                            recipient: notificationData.recipient,
                            channel: notificationData.channel,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }
                return res.status(201).json({
                    success: true,
                    data: {
                        successful: results.length,
                        failed: failed.length,
                        results,
                        failures: failed
                    }
                });
            }
            catch (error) {
                console.error('❌ Error sending bulk notifications:', error);
                if (error instanceof z.ZodError) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid request data',
                        details: error.errors
                    });
                }
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send bulk notifications',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Get notification status
     */
    getNotificationStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Notification ID is required'
                    });
                }
                const notification = yield db.notification.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        recipient: true,
                        channel: true,
                        type: true,
                        status: true,
                        attempts: true,
                        maxAttempts: true,
                        createdAt: true,
                        sentAt: true,
                        failedAt: true,
                        errorMessage: true,
                        scheduledAt: true,
                    }
                });
                if (!notification) {
                    return res.status(404).json({
                        success: false,
                        error: 'Notification not found'
                    });
                }
                return res.json({
                    success: true,
                    data: Object.assign(Object.assign({}, notification), { recipient: this.maskRecipient(notification.recipient) // Mask for privacy
                     })
                });
            }
            catch (error) {
                console.error('❌ Error getting notification status:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get notification status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Get notification history for a recipient
     */
    getNotificationHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { recipient } = req.params;
                const { channel, type, status, page = '1', limit = '20' } = req.query;
                const pageNum = parseInt(page);
                const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
                const where = { recipient };
                if (channel)
                    where.channel = channel;
                if (type)
                    where.type = type;
                if (status)
                    where.status = status;
                const [notifications, total] = yield Promise.all([
                    db.notification.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        skip: (pageNum - 1) * limitNum,
                        take: limitNum,
                        select: {
                            id: true,
                            channel: true,
                            type: true,
                            status: true,
                            createdAt: true,
                            sentAt: true,
                            errorMessage: true,
                        }
                    }),
                    db.notification.count({ where })
                ]);
                return res.json({
                    success: true,
                    data: {
                        notifications,
                        pagination: {
                            page: pageNum,
                            limit: limitNum,
                            total,
                            pages: Math.ceil(total / limitNum)
                        }
                    }
                });
            }
            catch (error) {
                console.error('❌ Error getting notification history:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get notification history',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Get notification metrics (admin only)
     */
    getMetrics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real app, you'd check admin permissions here
                const { from, to } = req.query;
                let dateRange;
                if (from && to) {
                    dateRange = {
                        from: new Date(from),
                        to: new Date(to)
                    };
                }
                const [metrics, providerHealth, alerts, costAnalysis] = yield Promise.all([
                    notificationMonitor.getMetrics(dateRange),
                    notificationMonitor.getProviderHealth(),
                    notificationMonitor.checkForAlerts(),
                    notificationMonitor.getCostAnalysis(dateRange)
                ]);
                return res.json({
                    success: true,
                    data: {
                        metrics,
                        providerHealth,
                        alerts,
                        costAnalysis
                    }
                });
            }
            catch (error) {
                console.error('❌ Error getting metrics:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get metrics',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Get delivery trends (admin only)
     */
    getDeliveryTrends(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { days = '7' } = req.query;
                const numDays = Math.min(parseInt(days), 30); // Max 30 days
                const trends = yield notificationMonitor.getDeliveryTrends(numDays);
                return res.json({
                    success: true,
                    data: { trends }
                });
            }
            catch (error) {
                console.error('❌ Error getting delivery trends:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get delivery trends',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Update user notification preferences
     */
    updateNotificationPreferences(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedData = updatePreferencesSchema.parse(req.body);
                // In a real app, you'd verify the user is updating their own preferences
                // or has admin permissions
                const preferences = yield db.notificationPreferences.upsert({
                    where: { userId: validatedData.userId },
                    update: validatedData.preferences,
                    create: Object.assign({ userId: validatedData.userId }, validatedData.preferences)
                });
                console.log(`⚙️ Updated notification preferences for user ${validatedData.userId}`);
                return res.json({
                    success: true,
                    data: preferences
                });
            }
            catch (error) {
                console.error('❌ Error updating preferences:', error);
                if (error instanceof z.ZodError) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid request data',
                        details: error.errors
                    });
                }
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update preferences',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Get user notification preferences
     */
    getNotificationPreferences(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const preferences = yield db.notificationPreferences.findUnique({
                    where: { userId }
                });
                return res.json({
                    success: true,
                    data: preferences || {
                        userId,
                        sms: true,
                        whatsapp: true,
                        email: true,
                        marketingNotifications: true,
                        orderNotifications: true,
                        promotionalNotifications: false
                    }
                });
            }
            catch (error) {
                console.error('❌ Error getting preferences:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get preferences',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Cancel a scheduled notification
     */
    cancelNotification(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const notification = yield db.notification.findUnique({
                    where: { id }
                });
                if (!notification) {
                    return res.status(404).json({
                        success: false,
                        error: 'Notification not found'
                    });
                }
                if (notification.status !== 'PENDING') {
                    return res.status(400).json({
                        success: false,
                        error: 'Can only cancel pending notifications'
                    });
                }
                // Update notification status
                yield db.notification.update({
                    where: { id },
                    data: {
                        status: 'CANCELLED',
                        failedAt: new Date(),
                        errorMessage: 'Cancelled by user'
                    }
                });
                // Try to remove from queue (if possible with your queue implementation)
                // await this.queue.removeJob(id);
                console.log(`🚫 Cancelled notification ${id}`);
                return res.json({
                    success: true,
                    message: 'Notification cancelled successfully'
                });
            }
            catch (error) {
                console.error('❌ Error cancelling notification:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to cancel notification',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Generate admin report
     */
    generateReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const report = yield notificationMonitor.generateReport();
                return res.json({
                    success: true,
                    data: { report }
                });
            }
            catch (error) {
                console.error('❌ Error generating report:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to generate report',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    // Helper methods
    checkOptOutStatus(recipient, channel) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // For SMS/WhatsApp, check by phone number
                // For email, check by email address
                // This is a simplified implementation
                const optOut = yield db.notificationOptOut.findFirst({
                    where: {
                        recipient,
                        channel,
                        active: true
                    }
                });
                return !!optOut;
            }
            catch (error) {
                console.error('Error checking opt-out status:', error);
                return false; // Default to allowing notifications
            }
        });
    }
    getPriority(priority) {
        switch (priority) {
            case 'high': return 1;
            case 'normal': return 5;
            case 'low': return 10;
            default: return 5;
        }
    }
    calculateEstimatedDelivery(priority) {
        const now = new Date();
        const minutes = priority === 'high' ? 1 : priority === 'normal' ? 5 : 15;
        return new Date(now.getTime() + minutes * 60 * 1000);
    }
    maskRecipient(recipient) {
        if (recipient.includes('@')) {
            const [local, domain] = recipient.split('@');
            return `${local.substring(0, 2)}***@${domain}`;
        }
        else {
            return recipient.substring(0, 6) + '***' + recipient.slice(-4);
        }
    }
}
/**
 * Express router setup for notification endpoints
 */
export const createNotificationRoutes = (notificationService, queue) => {
    const api = new NotificationAPI(notificationService, queue);
    return {
        // Notification management
        sendNotification: api.sendNotification.bind(api),
        sendBulkNotifications: api.sendBulkNotifications.bind(api),
        getNotificationStatus: api.getNotificationStatus.bind(api),
        getNotificationHistory: api.getNotificationHistory.bind(api),
        cancelNotification: api.cancelNotification.bind(api),
        // Analytics and monitoring (admin endpoints)
        getMetrics: api.getMetrics.bind(api),
        getDeliveryTrends: api.getDeliveryTrends.bind(api),
        generateReport: api.generateReport.bind(api),
        // User preferences
        updateNotificationPreferences: api.updateNotificationPreferences.bind(api),
        getNotificationPreferences: api.getNotificationPreferences.bind(api),
    };
};
