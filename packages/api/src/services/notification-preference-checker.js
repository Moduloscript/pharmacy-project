var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { db } from '@repo/database';
import { NotificationOptOutType } from '@prisma/client';
export class NotificationPreferenceChecker {
    /**
     * Check if a notification can be sent to a customer
     */
    static checkNotificationAllowed(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { customerId, channel, type, priority = 'normal', isEmergency = false } = options;
            // Get customer preferences
            const preferences = yield db.notificationPreferences.findUnique({
                where: { customerId }
            });
            // If no preferences exist, allow by default (will create defaults later)
            if (!preferences) {
                return { allowed: true };
            }
            // Check if channel is enabled
            const channelEnabled = this.isChannelEnabled(preferences, channel);
            if (!channelEnabled) {
                return {
                    allowed: false,
                    reason: `${channel} notifications are disabled`,
                    preferredChannel: preferences.preferredChannel || undefined
                };
            }
            // Check if notification type is enabled
            const typeEnabled = this.isNotificationTypeEnabled(preferences, type);
            if (!typeEnabled) {
                return {
                    allowed: false,
                    reason: `${type} notifications are disabled`
                };
            }
            // Check opt-out records
            const optedOut = yield this.checkOptOut(customerId, channel, type);
            if (optedOut) {
                return {
                    allowed: false,
                    reason: 'Customer has opted out of this notification',
                    optedOut: true
                };
            }
            // Check quiet hours (unless it's an emergency)
            if (!isEmergency && preferences.quietHoursEnabled) {
                const inQuietHours = this.isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd);
                if (inQuietHours && !preferences.emergencyOverride) {
                    return {
                        allowed: false,
                        reason: 'Notification blocked during quiet hours',
                        quietHoursActive: true
                    };
                }
            }
            // Check rate limits
            const rateLimitExceeded = yield this.checkRateLimit(customerId, type, preferences.dailyNotificationLimit);
            if (rateLimitExceeded && priority !== 'high' && !isEmergency) {
                return {
                    allowed: false,
                    reason: 'Daily notification limit exceeded',
                    rateLimitExceeded: true
                };
            }
            // All checks passed
            return {
                allowed: true,
                preferredChannel: preferences.preferredChannel || undefined
            };
        });
    }
    /**
     * Check if a specific channel is enabled
     */
    static isChannelEnabled(preferences, channel) {
        switch (channel.toLowerCase()) {
            case 'sms':
                return preferences.smsEnabled;
            case 'whatsapp':
                return preferences.whatsappEnabled;
            case 'email':
                return preferences.emailEnabled;
            default:
                return true; // Allow unknown channels by default
        }
    }
    /**
     * Check if a specific notification type is enabled
     */
    static isNotificationTypeEnabled(preferences, type) {
        // Map notification types to preference fields
        const typeMap = {
            'order_confirmation': 'orderUpdates',
            'order_status': 'orderUpdates',
            'payment_success': 'paymentUpdates',
            'payment_failed': 'paymentUpdates',
            'delivery_update': 'deliveryUpdates',
            'promotion': 'promotions',
            'prescription_approved': 'prescriptionApproval',
            'prescription_rejected': 'prescriptionRejection',
            'prescription_clarification': 'prescriptionClarification',
        };
        const preferenceField = typeMap[type.toLowerCase()];
        if (!preferenceField) {
            // Unknown type - allow by default
            return true;
        }
        return preferences[preferenceField] !== false;
    }
    /**
     * Check if customer has opted out
     */
    static checkOptOut(customerId, channel, type) {
        return __awaiter(this, void 0, void 0, function* () {
            // Map notification types to opt-out types
            const typeMap = {
                'order_confirmation': NotificationOptOutType.ORDER_UPDATES,
                'order_status': NotificationOptOutType.ORDER_UPDATES,
                'order_update': NotificationOptOutType.ORDER_UPDATES,
                'payment_success': NotificationOptOutType.PAYMENT_UPDATES,
                'payment_failed': NotificationOptOutType.PAYMENT_UPDATES,
                'delivery_update': NotificationOptOutType.DELIVERY_UPDATES,
                'promotion': NotificationOptOutType.PROMOTIONS,
                'low_stock_alert': NotificationOptOutType.LOW_STOCK_ALERTS,
            };
            const mappedType = typeMap[type.toLowerCase()] || NotificationOptOutType.ALL;
            const optOut = yield db.notificationOptOut.findFirst({
                where: {
                    customerId,
                    OR: [
                        { channel: channel.toUpperCase(), type: NotificationOptOutType.ALL },
                        { channel: channel.toUpperCase(), type: mappedType }
                    ]
                }
            });
            return !!optOut;
        });
    }
    /**
     * Check if current time is within quiet hours
     */
    static isInQuietHours(startTime, endTime) {
        if (!startTime || !endTime)
            return false;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        // Handle case where quiet hours span midnight
        if (startTimeMinutes > endTimeMinutes) {
            return currentTime >= startTimeMinutes || currentTime < endTimeMinutes;
        }
        else {
            return currentTime >= startTimeMinutes && currentTime < endTimeMinutes;
        }
    }
    /**
     * Check and update rate limits
     */
    static checkRateLimit(customerId, notificationType, dailyLimit) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            // Find or create rate limit record for today
            let rateLimit = yield db.notificationRateLimit.findFirst({
                where: {
                    customerId,
                    notificationType,
                    windowStart: { gte: startOfDay },
                    windowEnd: { lte: endOfDay }
                }
            });
            if (!rateLimit) {
                // Create new rate limit record
                rateLimit = yield db.notificationRateLimit.create({
                    data: {
                        customerId,
                        notificationType,
                        windowStart: startOfDay,
                        windowEnd: endOfDay,
                        count: 1,
                        exceeded: false,
                        lastNotificationAt: now
                    }
                });
                return false; // First notification of the day
            }
            // Check if limit exceeded
            if (rateLimit.count >= dailyLimit) {
                // Update exceeded flag if not already set
                if (!rateLimit.exceeded) {
                    yield db.notificationRateLimit.update({
                        where: { id: rateLimit.id },
                        data: { exceeded: true }
                    });
                }
                return true; // Limit exceeded
            }
            // Increment count
            yield db.notificationRateLimit.update({
                where: { id: rateLimit.id },
                data: {
                    count: { increment: 1 },
                    lastNotificationAt: now
                }
            });
            return false; // Within limit
        });
    }
    /**
     * Get the best channel to use based on preferences
     */
    static getBestChannel(customerId, defaultChannel) {
        return __awaiter(this, void 0, void 0, function* () {
            const preferences = yield db.notificationPreferences.findUnique({
                where: { customerId },
                select: {
                    preferredChannel: true,
                    smsEnabled: true,
                    whatsappEnabled: true,
                    emailEnabled: true
                }
            });
            if (!preferences) {
                return defaultChannel;
            }
            // Use preferred channel if set and enabled
            if (preferences.preferredChannel) {
                const preferredEnabled = this.isChannelEnabled(preferences, preferences.preferredChannel);
                if (preferredEnabled) {
                    return preferences.preferredChannel;
                }
            }
            // Fall back to any enabled channel
            if (preferences.smsEnabled)
                return 'sms';
            if (preferences.whatsappEnabled)
                return 'whatsapp';
            if (preferences.emailEnabled)
                return 'email';
            // No channels enabled - return default
            return defaultChannel;
        });
    }
    /**
     * Record notification sent (for rate limiting)
     */
    static recordNotificationSent(customerId, notificationType) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            yield db.notificationRateLimit.upsert({
                where: {
                    customerId_notificationType_windowStart: {
                        customerId,
                        notificationType,
                        windowStart: startOfDay
                    }
                },
                update: {
                    count: { increment: 1 },
                    lastNotificationAt: now,
                    updatedAt: now
                },
                create: {
                    customerId,
                    notificationType,
                    windowStart: startOfDay,
                    windowEnd: endOfDay,
                    count: 1,
                    lastNotificationAt: now
                }
            });
        });
    }
    /**
     * Clean up old rate limit records (run periodically)
     */
    static cleanupOldRateLimits() {
        return __awaiter(this, void 0, void 0, function* () {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const result = yield db.notificationRateLimit.deleteMany({
                where: {
                    windowEnd: { lt: threeDaysAgo }
                }
            });
            return result.count;
        });
    }
}
