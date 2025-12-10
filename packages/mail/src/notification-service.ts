import { db } from '@repo/database';
import { 
	queueOrderConfirmation, 
	queuePaymentSuccess, 
	queueDeliveryUpdate, 
	queueLowStockAlert,
	type NotificationJobData,
	type NotificationType 
} from '@repo/queue';
import type { INotificationProvider, NotificationTemplate } from './provider/notifications';

import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationStatus as PrismaNotificationStatus,
} from '@repo/database';

// Mapping helpers to convert internal strings to Prisma enums
function mapType(t: string): PrismaNotificationType {
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

function mapChannel(c: string): PrismaNotificationChannel {
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
	private providers: Map<string, INotificationProvider> = new Map();
	private templates: Map<string, NotificationTemplate> = new Map();

	/**
	 * Register a notification provider (SMS, WhatsApp, Email)
	 */
	registerProvider(provider: INotificationProvider): void {
		this.providers.set(provider.channel, provider);
		console.log(`📡 Registered ${provider.name} for ${provider.channel} notifications`);
	}

	/**
	 * Register a notification template
	 */
	registerTemplate(template: NotificationTemplate): void {
		const key = `${template.channel}:${template.name}`;
		this.templates.set(key, template);
		console.log(`📝 Registered template: ${template.name} for ${template.channel}`);
	}

	/**
	 * Send order confirmation notifications (SMS primary, WhatsApp future)
	 */
	async sendOrderConfirmation(order: {
		id: string;
		orderNumber: string;
		customerId: string;
		total: number;
		deliveryAddress: string;
	}): Promise<void> {
		try {
			// Get customer details
			const customer = await db.customer.findUnique({
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
				const smsNotification = await this.createNotificationRecord({
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

				await queueOrderConfirmation(smsNotification);
			}

			// Email notification (via Resend)
			if (customer.user.email) {
				const emailNotification = await this.createNotificationRecord({
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

				await queueOrderConfirmation(emailNotification);
			}

			// Future: WhatsApp notification (when enabled)
			if (customer.phone && whatsappEnabled) {
				const whatsappNotification = await this.createNotificationRecord({
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

				await queueOrderConfirmation(whatsappNotification);
			}

		} catch (error) {
			console.error('Error sending order confirmation:', error);
			// Don't throw - we don't want to fail order creation because of notification issues
		}
	}

	/**
	 * Send payment success notifications
	 */
	async sendPaymentSuccess(order: {
		id: string;
		orderNumber: string;
		customerId: string;
		total: number;
	}, payment: {
		method: string;
		amount: number;
	}): Promise<void> {
		try {
			const customer = await db.customer.findUnique({
				where: { id: order.customerId },
				include: { user: true }
			});

			if (!customer || !customer.phone) return;

			// Check feature flags
			const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED !== 'false';
			const whatsappEnabled = process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true';

			const channel = smsEnabled ? 'sms' : (whatsappEnabled ? 'whatsapp' : 'sms');
			const template = channel === 'sms' ? 'payment_success_sms' : 'payment_success_v1';

			const notification = await this.createNotificationRecord({
				type: 'payment_success',
				channel: channel as 'sms' | 'whatsapp',
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

			await queuePaymentSuccess(notification);

			// Also send email if available
			if (customer.user.email) {
				const emailNotification = await this.createNotificationRecord({
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

				await queuePaymentSuccess(emailNotification);
			}

		} catch (error) {
			console.error('Error sending payment success notification:', error);
		}
	}

	/**
	 * Send delivery status update notifications
	 */
	async sendDeliveryUpdate(order: {
		id: string;
		orderNumber: string;
		customerId: string;
		status: string;
	}, estimatedDelivery?: Date): Promise<void> {
		try {
			const customer = await db.customer.findUnique({
				where: { id: order.customerId },
				include: { user: true }
			});

			if (!customer || !customer.phone) return;

			// Check feature flags
			const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED !== 'false';
			const whatsappEnabled = process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true';

			const channel = smsEnabled ? 'sms' : (whatsappEnabled ? 'whatsapp' : 'sms');
			const template = channel === 'sms' ? 'delivery_update_sms' : 'delivery_update_v1';

			const notification = await this.createNotificationRecord({
				type: 'delivery_update',
				channel: channel as 'sms' | 'whatsapp',
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

			await queueDeliveryUpdate(notification);

			// Also send email if available
			if (customer.user.email) {
				const emailNotification = await this.createNotificationRecord({
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

				await queueDeliveryUpdate(emailNotification);
			}

		} catch (error) {
			console.error('Error sending delivery update:', error);
		}
	}

	/**
	 * Send low stock alerts to admin users
	 */
	async sendLowStockAlerts(products: Array<{
		id: string;
		name: string;
		stockQuantity: number;
		minOrderQuantity: number;
	}>): Promise<void> {
		try {
			// Get admin phone numbers from environment or database
			const adminPhones = process.env.ADMIN_PHONE_NUMBERS?.split(',') || [];
			
			if (adminPhones.length === 0) {
				console.warn('No admin phone numbers configured for low stock alerts');
				return;
			}

			for (const product of products) {
				for (const adminPhone of adminPhones) {
					const notification = await this.createNotificationRecord({
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

					await queueLowStockAlert(notification);
				}
			}

		} catch (error) {
			console.error('Error sending low stock alerts:', error);
		}
	}

	/**
	 * Create a notification record in the database
	 */
	private async createNotificationRecord(data: {
		type: NotificationType;
		channel: 'whatsapp' | 'sms' | 'email';
		recipient: string;
		message?: string;
		template?: string;
		templateParams?: Record<string, any>;
		customerId?: string;
		orderId?: string;
		priority?: 'low' | 'normal' | 'high';
	}): Promise<NotificationJobData> {
		const body =
			data.message ??
			(data.template
				? `Template: ${data.template} ${data.templateParams ? JSON.stringify(data.templateParams) : ''}`.trim()
				: '');

		const notification = await db.notification.create({
			data: {
				type: mapType(data.type as unknown as string),
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
	}

	/**
	 * Convert order status to human-readable label
	 */
	private getStatusLabel(status: string): string {
		const statusLabels: Record<string, string> = {
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
	async getNotificationStats(dateRange?: { from: Date; to: Date }) {
		try {
			const whereClause = dateRange ? {
				createdAt: {
					gte: dateRange.from,
					lte: dateRange.to
				}
			} : {};

			const stats = await db.notification.groupBy({
				by: ['channel', 'status'],
				where: whereClause,
				_count: {
					id: true
				}
			});

			// Transform into more useful format
			const result = {
				total: 0,
				byChannel: {} as Record<string, Record<string, number>>,
				byStatus: {} as Record<string, number>
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

		} catch (error) {
			console.error('Error fetching notification stats:', error);
			return null;
		}
	}

	/**
	 * Health check for all registered providers
	 */
	async healthCheck(): Promise<Record<string, boolean>> {
		const results: Record<string, boolean> = {};

		for (const [channel, provider] of Array.from(this.providers.entries())) {
			try {
				if (provider.testConnection) {
					results[channel] = await provider.testConnection();
				} else {
					results[channel] = true; // Assume healthy if no test method
				}
			} catch (error) {
				console.error(`Health check failed for ${channel}:`, error);
				results[channel] = false;
			}
		}

		return results;
	}
}
