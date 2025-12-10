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
import { queueOrderConfirmation, queuePaymentSuccess, queueDeliveryUpdate, queueLowStockAlert } from '@repo/queue';
import { NotificationType as PrismaNotificationType, NotificationChannel as PrismaNotificationChannel, NotificationStatus as PrismaNotificationStatus, } from '@prisma/client';
// Mapping helpers to convert internal strings to Prisma enums
function mapType(t) {
    switch ((t || '').toLowerCase()) {
        case 'order_confirmation':
            return PrismaNotificationType.ORDER_CONFIRMATION;
        case 'payment_success':
            return PrismaNotificationType.PAYMENT_UPDATE;
        case 'delivery_update':
            return PrismaNotificationType.DELIVERY_UPDATE;
        case 'low_stock_alert':
            return PrismaNotificationType.LOW_STOCK_ALERT;
        default:
            return PrismaNotificationType.SYSTEM_ALERT;
    }
}
function mapChannel(c) {
    switch ((c || '').toLowerCase()) {
        case 'email':
            return PrismaNotificationChannel.EMAIL;
        case 'sms':
            return PrismaNotificationChannel.SMS;
        case 'whatsapp':
            return PrismaNotificationChannel.WHATSAPP;
        default:
            return PrismaNotificationChannel.EMAIL;
    }
}
/**
 * Central notification service that orchestrates all notification channels
 * This service handles creating notification records and queueing jobs
 */
export class NotificationService {
    constructor() {
        this.providers = new Map();
        this.templates = new Map();
    }
    /**
     * Register a notification provider (SMS, WhatsApp, Email)
     */
    registerProvider(provider) {
        this.providers.set(provider.channel, provider);
        console.log(`📡 Registered ${provider.name} for ${provider.channel} notifications`);
    }
    /**
     * Register a notification template
     */
    registerTemplate(template) {
        const key = `${template.channel}:${template.name}`;
        this.templates.set(key, template);
        console.log(`📝 Registered template: ${template.name} for ${template.channel}`);
    }
    /**
     * Send order confirmation notifications (SMS primary, WhatsApp future)
     */
    sendOrderConfirmation(order) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get customer details
                const customer = yield db.customer.findUnique({
                    where: { id: order.customerId },
                    include: { user: true }
                });
                if (!customer) {
                    console.error(`Customer ${order.customerId} not found for order ${order.id}`);
                    return;
                }
                // Check feature flags
                const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED !== 'false';
                const whatsappEnabled = process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true';
                // Primary: SMS notification
                if (customer.phone && smsEnabled) {
                    const smsNotification = yield this.createNotificationRecord({
                        type: 'order_confirmation',
                        channel: 'sms',
                        recipient: customer.phone,
                        customerId: customer.id,
                        orderId: order.id,
                        template: 'order_confirmation_sms',
                        templateParams: {
                            order_number: order.orderNumber,
                            total_amount: order.total,
                            tracking_url: `${process.env.NEXT_PUBLIC_SITE_URL}/track/${order.id}`,
                        }
                    });
                    yield queueOrderConfirmation(smsNotification);
                }
                // Email notification (via Resend)
                if (customer.user.email) {
                    const emailNotification = yield this.createNotificationRecord({
                        type: 'order_confirmation',
                        channel: 'email',
                        recipient: customer.user.email,
                        customerId: customer.id,
                        orderId: order.id,
                        template: 'order_confirmation_email',
                        templateParams: {
                            customer_name: customer.user.name,
                            order_number: order.orderNumber,
                            total_amount: order.total,
                            delivery_address: order.deliveryAddress,
                            tracking_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}`
                        }
                    });
                    yield queueOrderConfirmation(emailNotification);
                }
                // Future: WhatsApp notification (when enabled)
                if (customer.phone && whatsappEnabled) {
                    const whatsappNotification = yield this.createNotificationRecord({
                        type: 'order_confirmation',
                        channel: 'whatsapp',
                        recipient: customer.phone,
                        customerId: customer.id,
                        orderId: order.id,
                        template: 'order_confirmation_v1',
                        templateParams: {
                            customer_name: customer.user.name,
                            order_number: order.orderNumber,
                            total_amount: order.total,
                            delivery_address: order.deliveryAddress,
                            tracking_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}`
                        }
                    });
                    yield queueOrderConfirmation(whatsappNotification);
                }
            }
            catch (error) {
                console.error('Error sending order confirmation:', error);
                // Don't throw - we don't want to fail order creation because of notification issues
            }
        });
    }
    /**
     * Send payment success notifications
     */
    sendPaymentSuccess(order, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const customer = yield db.customer.findUnique({
                    where: { id: order.customerId },
                    include: { user: true }
                });
                if (!customer || !customer.phone)
                    return;
                // Check feature flags
                const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED !== 'false';
                const whatsappEnabled = process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true';
                const channel = smsEnabled ? 'sms' : (whatsappEnabled ? 'whatsapp' : 'sms');
                const template = channel === 'sms' ? 'payment_success_sms' : 'payment_success_v1';
                const notification = yield this.createNotificationRecord({
                    type: 'payment_success',
                    channel: channel,
                    recipient: customer.phone,
                    customerId: customer.id,
                    orderId: order.id,
                    template,
                    templateParams: {
                        order_number: order.orderNumber,
                        amount: payment.amount,
                        method: payment.method
                    }
                });
                yield queuePaymentSuccess(notification);
                // Also send email if available
                if (customer.user.email) {
                    const emailNotification = yield this.createNotificationRecord({
                        type: 'payment_success',
                        channel: 'email',
                        recipient: customer.user.email,
                        customerId: customer.id,
                        orderId: order.id,
                        template: 'payment_success_email',
                        templateParams: {
                            order_number: order.orderNumber,
                            amount: payment.amount,
                            method: payment.method
                        }
                    });
                    yield queuePaymentSuccess(emailNotification);
                }
            }
            catch (error) {
                console.error('Error sending payment success notification:', error);
            }
        });
    }
    /**
     * Send delivery status update notifications
     */
    sendDeliveryUpdate(order, estimatedDelivery) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const customer = yield db.customer.findUnique({
                    where: { id: order.customerId },
                    include: { user: true }
                });
                if (!customer || !customer.phone)
                    return;
                // Check feature flags
                const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED !== 'false';
                const whatsappEnabled = process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true';
                const channel = smsEnabled ? 'sms' : (whatsappEnabled ? 'whatsapp' : 'sms');
                const template = channel === 'sms' ? 'delivery_update_sms' : 'delivery_update_v1';
                const notification = yield this.createNotificationRecord({
                    type: 'delivery_update',
                    channel: channel,
                    recipient: customer.phone,
                    customerId: customer.id,
                    orderId: order.id,
                    template,
                    templateParams: {
                        order_number: order.orderNumber,
                        status_label: this.getStatusLabel(order.status),
                        eta_or_notes: estimatedDelivery
                            ? `ETA: ${estimatedDelivery.toLocaleDateString()}`
                            : 'We will update you shortly'
                    }
                });
                yield queueDeliveryUpdate(notification);
                // Also send email if available
                if (customer.user.email) {
                    const emailNotification = yield this.createNotificationRecord({
                        type: 'delivery_update',
                        channel: 'email',
                        recipient: customer.user.email,
                        customerId: customer.id,
                        orderId: order.id,
                        template: 'delivery_update_email',
                        templateParams: {
                            order_number: order.orderNumber,
                            status_label: this.getStatusLabel(order.status),
                            eta_or_notes: estimatedDelivery
                                ? `ETA: ${estimatedDelivery.toLocaleDateString()}`
                                : 'We will update you shortly'
                        }
                    });
                    yield queueDeliveryUpdate(emailNotification);
                }
            }
            catch (error) {
                console.error('Error sending delivery update:', error);
            }
        });
    }
    /**
     * Send low stock alerts to admin users
     */
    sendLowStockAlerts(products) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Get admin phone numbers from environment or database
                const adminPhones = ((_a = process.env.ADMIN_PHONE_NUMBERS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
                if (adminPhones.length === 0) {
                    console.warn('No admin phone numbers configured for low stock alerts');
                    return;
                }
                for (const product of products) {
                    for (const adminPhone of adminPhones) {
                        const notification = yield this.createNotificationRecord({
                            type: 'low_stock_alert',
                            channel: 'sms', // SMS for admin alerts
                            recipient: adminPhone.trim(),
                            template: 'low_stock_alert_admin_v1',
                            templateParams: {
                                product_name: product.name,
                                current_stock: product.stockQuantity,
                                recommended_action: product.stockQuantity === 0
                                    ? `URGENT: Restock immediately - Min order: ${product.minOrderQuantity}`
                                    : `Stock running low - Current: ${product.stockQuantity}, Min: ${product.minOrderQuantity}`
                            }
                        });
                        yield queueLowStockAlert(notification);
                    }
                }
            }
            catch (error) {
                console.error('Error sending low stock alerts:', error);
            }
        });
    }
    /**
     * Create a notification record in the database
     */
    createNotificationRecord(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const body = (_a = data.message) !== null && _a !== void 0 ? _a : (data.template
                ? `Template: ${data.template} ${data.templateParams ? JSON.stringify(data.templateParams) : ''}`.trim()
                : '');
            const notification = yield db.notification.create({
                data: {
                    type: mapType(data.type),
                    channel: mapChannel(data.channel),
                    recipient: data.recipient,
                    message: data.message || '',
                    body,
                    status: PrismaNotificationStatus.PENDING,
                    customerId: data.customerId,
                    orderId: data.orderId,
                }
            });
            return {
                notificationId: notification.id,
                type: data.type,
                channel: data.channel,
                recipient: data.recipient,
                message: data.message,
                template: data.template,
                templateParams: data.templateParams,
                customerId: data.customerId,
                orderId: data.orderId,
                priority: data.priority || 'normal'
            };
        });
    }
    /**
     * Convert order status to human-readable label
     */
    getStatusLabel(status) {
        const statusLabels = {
            'RECEIVED': 'Order received',
            'PROCESSING': 'Being prepared',
            'READY': 'Ready for pickup/delivery',
            'DISPATCHED': 'Out for delivery',
            'DELIVERED': 'Delivered successfully',
            'CANCELLED': 'Order cancelled'
        };
        return statusLabels[status] || status;
    }
    /**
     * Get notification statistics
     */
    getNotificationStats(dateRange) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const whereClause = dateRange ? {
                    createdAt: {
                        gte: dateRange.from,
                        lte: dateRange.to
                    }
                } : {};
                const stats = yield db.notification.groupBy({
                    by: ['channel', 'status'],
                    where: whereClause,
                    _count: {
                        id: true
                    }
                });
                // Transform into more useful format
                const result = {
                    total: 0,
                    byChannel: {},
                    byStatus: {}
                };
                stats.forEach(stat => {
                    const count = stat._count.id;
                    result.total += count;
                    if (!result.byChannel[stat.channel]) {
                        result.byChannel[stat.channel] = {};
                    }
                    result.byChannel[stat.channel][stat.status] = count;
                    if (!result.byStatus[stat.status]) {
                        result.byStatus[stat.status] = 0;
                    }
                    result.byStatus[stat.status] += count;
                });
                return result;
            }
            catch (error) {
                console.error('Error fetching notification stats:', error);
                return null;
            }
        });
    }
    /**
     * Health check for all registered providers
     */
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {};
            for (const [channel, provider] of this.providers.entries()) {
                try {
                    if (provider.testConnection) {
                        results[channel] = yield provider.testConnection();
                    }
                    else {
                        results[channel] = true; // Assume healthy if no test method
                    }
                }
                catch (error) {
                    console.error(`Health check failed for ${channel}:`, error);
                    results[channel] = false;
                }
            }
            return results;
        });
    }
}
