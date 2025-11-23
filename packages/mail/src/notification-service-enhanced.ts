import { db } from '@repo/database';
import { 
	queueOrderConfirmation, 
	queuePaymentSuccess, 
	queueDeliveryUpdate, 
	queueLowStockAlert,
	addNotificationJob,
	type NotificationJobData,
	type NotificationType 
} from '@repo/queue';
import type { INotificationProvider, NotificationTemplate } from './provider/notifications';
import { NotificationPreferenceChecker } from '../../api/src/services/notification-preference-checker';
import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  NotificationStatus as PrismaNotificationStatus,
} from '@prisma/client';

/**
 * Enhanced notification service with preference checking
 * This service checks customer preferences before sending any notification
 */
// Mapping helpers to convert internal strings to Prisma enums
function mapType(t: string): PrismaNotificationType {
  switch ((t || '').toLowerCase()) {
    case 'order_confirmation':
      return PrismaNotificationType.ORDER_CONFIRMATION
    case 'payment_success':
      return PrismaNotificationType.PAYMENT_UPDATE
    case 'delivery_update':
      return PrismaNotificationType.DELIVERY_UPDATE
    case 'low_stock_alert':
      return PrismaNotificationType.LOW_STOCK_ALERT
    case 'prescription_required':
      return PrismaNotificationType.PRESCRIPTION_REQUIRED
    case 'prescription_reminder':
      return PrismaNotificationType.PRESCRIPTION_REMINDER
    default:
      return PrismaNotificationType.SYSTEM_ALERT
  }
}

function mapChannel(c: string): PrismaNotificationChannel {
  switch ((c || '').toLowerCase()) {
    case 'email':
      return PrismaNotificationChannel.EMAIL
    case 'sms':
      return PrismaNotificationChannel.SMS
    case 'whatsapp':
      return PrismaNotificationChannel.WHATSAPP
    default:
      return PrismaNotificationChannel.EMAIL
  }
}

function mapPriority(p: string): PrismaNotificationPriority {
  switch ((p || '').toLowerCase()) {
    case 'high':
      return PrismaNotificationPriority.HIGH
    case 'urgent':
      return PrismaNotificationPriority.URGENT
    case 'normal':
    default:
      return PrismaNotificationPriority.NORMAL
  }
}

export class EnhancedNotificationService {
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
	 * Send order confirmation notifications with preference checking
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

			const notificationType = 'order_confirmation';
			const channels = ['email', 'sms', 'whatsapp'];
			const notificationsSent = [];

			for (const channel of channels) {
				// Skip if no contact info for this channel
				if (channel === 'email' && !customer.user.email) continue;
				if ((channel === 'sms' || channel === 'whatsapp') && !customer.phone) continue;

				// Check customer preferences
				const preferenceCheck = await NotificationPreferenceChecker.checkNotificationAllowed({
					customerId: order.customerId,
					channel,
					type: notificationType,
					priority: 'normal'
				});

				console.log(`🔍 Checking ${channel} for customer ${order.customerId}: Allowed=${preferenceCheck.allowed}, Phone=${customer.phone}`);

				if (!preferenceCheck.allowed) {
					console.log(`❌ ${channel} notification blocked for order ${order.orderNumber}: ${preferenceCheck.reason}`);
					continue;
				}

				// Use the current channel being iterated
				const actualChannel = channel;

				// Create notification record
				const message = this.getOrderConfirmationMessage(actualChannel, order, customer);
				const notification = await db.notification.create({
					data: {
						customerId: order.customerId,
						orderId: order.id,
						type: mapType(notificationType),
						channel: mapChannel(actualChannel),
						recipient: actualChannel === 'email' ? customer.user.email! : customer.phone,
						subject: `Order Confirmation - #${order.orderNumber}`,
						message: message,
						body: message, // Required field
						status: PrismaNotificationStatus.PENDING,
						priority: mapPriority('normal'),
						metadata: {
							orderNumber: order.orderNumber,
							totalAmount: order.total,
							deliveryAddress: order.deliveryAddress,
							trackingUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/track/${order.id}`
						}
					}
				});

				// Queue the notification
				const jobData: NotificationJobData = {
					notificationId: notification.id,
					type: notificationType as any,
					channel: actualChannel as any,
					recipient: notification.recipient,
					template: `order_confirmation_${actualChannel}`,
					templateParams: {
						customer_name: customer.user.name,
						order_number: order.orderNumber,
						total_amount: order.total,
						delivery_address: order.deliveryAddress,
						tracking_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}`
					}
				};

				await addNotificationJob(notificationType, jobData, {
					attempts: 3,
					priority: 5
				});

				// Record notification sent
				await NotificationPreferenceChecker.recordNotificationSent(
					order.customerId,
					notificationType
				);

				notificationsSent.push(notification);
				console.log(`✅ Queued ${actualChannel} order confirmation for Order #${order.orderNumber}`);

				// If we sent email successfully, we still want to send SMS if available
				// if (actualChannel === 'email') break;
			}

			if (notificationsSent.length === 0) {
				console.warn(`⚠️ No order confirmation sent for Order #${order.orderNumber} - all channels blocked`);
			}

		} catch (error) {
			console.error('Error sending order confirmation:', error);
			// Don't throw - we don't want to fail order creation because of notification issues
		}
	}

	/**
	 * Send payment success notifications with preference checking
	 */
	async sendPaymentSuccess(order: {
		id: string;
		orderNumber: string;
		customerId: string;
		total: number;
	}, payment: {
		method: string;
		amount: number;
		transactionId?: string;
	}): Promise<void> {
		try {
			const customer = await db.customer.findUnique({
				where: { id: order.customerId },
				include: { user: true }
			});

			if (!customer) return;

			const notificationType = 'payment_success';
			const priority = 'high'; // Payment confirmations are important
			const channels = ['email', 'sms', 'whatsapp'];

			for (const channel of channels) {
				// Skip if no contact info
				if (channel === 'email' && !customer.user.email) continue;
				if ((channel === 'sms' || channel === 'whatsapp') && !customer.phone) continue;

				// Check preferences
				const preferenceCheck = await NotificationPreferenceChecker.checkNotificationAllowed({
					customerId: order.customerId,
					channel,
					type: notificationType,
					priority,
					isEmergency: false
				});

				if (!preferenceCheck.allowed) {
					console.log(`❌ ${channel} payment notification blocked: ${preferenceCheck.reason}`);
					continue;
				}

				const actualChannel = preferenceCheck.preferredChannel || channel;

				// Create notification
				const message = this.getPaymentSuccessMessage(actualChannel, order, payment, customer);
				const notification = await db.notification.create({
					data: {
						customerId: order.customerId,
						orderId: order.id,
						type: mapType(notificationType),
						channel: mapChannel(actualChannel),
						recipient: actualChannel === 'email' ? customer.user.email! : customer.phone,
						subject: `Payment Confirmed - Order #${order.orderNumber}`,
						message: message,
						body: message, // Required field
						status: PrismaNotificationStatus.PENDING,
						priority: mapPriority(priority),
						metadata: {
							orderNumber: order.orderNumber,
							amount: payment.amount,
							method: payment.method,
							transactionId: payment.transactionId
						}
					}
				});

				// Queue notification
				const jobData: NotificationJobData = {
					notificationId: notification.id,
					type: notificationType as any,
					channel: actualChannel as any,
					recipient: notification.recipient,
					template: `payment_success_${actualChannel}`,
					templateParams: {
						customer_name: customer.user.name,
						order_number: order.orderNumber,
						amount: payment.amount,
						method: payment.method
					},
					priority: priority as any
				};

				await addNotificationJob(notificationType, jobData, {
					attempts: 3,
					priority: 1 // High priority in queue
				});

				// Record sent
				await NotificationPreferenceChecker.recordNotificationSent(
					order.customerId,
					notificationType
				);

				console.log(`✅ Queued ${actualChannel} payment confirmation for Order #${order.orderNumber}`);
				
				// For high priority, we might send to multiple channels
				if (actualChannel === 'email' && priority !== 'high') break;
			}

		} catch (error) {
			console.error('Error sending payment success notification:', error);
		}
	}

	/**
	 * Send delivery status update notifications with preference checking
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

			if (!customer) return;

			const notificationType = 'delivery_update';
			const priority = order.status === 'DELIVERED' ? 'high' : 'normal';
			const channels = ['sms', 'whatsapp', 'email']; // SMS preferred for delivery updates

			let emailQueued = false;
			for (const channel of channels) {
				// Skip if no contact info
				if (channel === 'email' && !customer.user.email) continue;
				if ((channel === 'sms' || channel === 'whatsapp') && !customer.phone) continue;

				// Check preferences
				const preferenceCheck = await NotificationPreferenceChecker.checkNotificationAllowed({
					customerId: order.customerId,
					channel,
					type: notificationType,
					priority
				});

				if (!preferenceCheck.allowed) {
					console.log(`❌ ${channel} delivery update blocked: ${preferenceCheck.reason}`);
					continue;
				}

				const actualChannel = preferenceCheck.preferredChannel || channel;

				// Create notification
				const message = this.getDeliveryUpdateMessage(actualChannel, order, estimatedDelivery, customer);
				const notification = await db.notification.create({
					data: {
						customerId: order.customerId,
						orderId: order.id,
						type: mapType(notificationType),
						channel: mapChannel(actualChannel),
						recipient: actualChannel === 'email' ? customer.user.email! : customer.phone,
						subject: `Delivery Update - Order #${order.orderNumber}`,
						message: message,
						body: message, // Required field
						status: PrismaNotificationStatus.PENDING,
						priority: mapPriority(priority),
						metadata: {
							orderNumber: order.orderNumber,
							orderStatus: order.status,
							estimatedDelivery: estimatedDelivery?.toISOString()
						}
					}
				});

				// Queue notification
				const jobData: NotificationJobData = {
					notificationId: notification.id,
					type: notificationType as any,
					channel: actualChannel as any,
					recipient: notification.recipient,
					template: `delivery_${order.status.toLowerCase()}_${actualChannel}`,
					templateParams: {
						customer_name: customer.user.name,
						order_number: order.orderNumber,
						status_label: this.getStatusLabel(order.status),
						eta_or_notes: estimatedDelivery 
							? `ETA: ${estimatedDelivery.toLocaleDateString()}`
							: 'We will update you shortly'
					},
					priority: priority as any
				};

				await addNotificationJob(notificationType, jobData, {
					attempts: 3,
					priority: priority === 'high' ? 1 : 5
				});

				if (actualChannel === 'email') {
					emailQueued = true;
				}

				// Record sent
				await NotificationPreferenceChecker.recordNotificationSent(
					order.customerId,
					notificationType
				);

				console.log(`✅ Queued ${actualChannel} delivery update for Order #${order.orderNumber}`);
				
				// Send to preferred channel only unless high priority
				if (priority !== 'high') break;
			}

			// Additionally, ensure an email is queued for key statuses if not already queued
			if (!emailQueued && customer.user.email && (order.status === 'DISPATCHED' || order.status === 'DELIVERED')) {
				const emailAllowed = await NotificationPreferenceChecker.checkNotificationAllowed({
					customerId: order.customerId,
					channel: 'email',
					type: notificationType,
					priority
				});
				if (emailAllowed.allowed) {
					// Create a corresponding DB notification record for email
					const emailNotification = await db.notification.create({
						data: {
							customerId: order.customerId,
							orderId: order.id,
							type: mapType(notificationType),
							channel: PrismaNotificationChannel.EMAIL,
							recipient: customer.user.email!,
							subject: `Delivery Update - Order #${order.orderNumber}`,
							message: this.getDeliveryUpdateMessage('email', order, estimatedDelivery, customer),
							body: this.getDeliveryUpdateMessage('email', order, estimatedDelivery, customer),
							status: PrismaNotificationStatus.PENDING,
							priority: mapPriority(priority),
							metadata: {
								orderNumber: order.orderNumber,
								orderStatus: order.status,
								estimatedDelivery: estimatedDelivery?.toISOString()
							}
						}
					});

					const emailJob: NotificationJobData = {
						notificationId: emailNotification.id,
						type: notificationType as any,
						channel: 'email' as any,
						recipient: customer.user.email!,
						template: 'delivery_update_email',
						templateParams: {
							customer_name: customer.user.name,
							order_number: order.orderNumber,
							status_label: this.getStatusLabel(order.status),
							eta_or_notes: estimatedDelivery 
								? `ETA: ${estimatedDelivery.toLocaleDateString()}`
								: 'We will update you shortly'
						}
					};
					await addNotificationJob(notificationType, emailJob, { attempts: 3, priority: 5 });
					console.log(`📧 Also queued email delivery update for Order #${order.orderNumber}`);
				}
			}

		} catch (error) {
			console.error('Error sending delivery update:', error);
		}
	}

	/**
	 * Send low stock alert to admins (no preference checking needed)
	 */
	async sendLowStockAlert(product: {
		id: string;
		name: string;
		sku: string;
		currentStock: number;
		minStockLevel: number;
	}): Promise<void> {
		try {
			// Get admin users
			const adminUsers = await db.user.findMany({
				where: { role: 'admin' },
				select: { id: true, email: true, name: true }
			});

			for (const admin of adminUsers) {
				// For admin alerts, we don't check preferences - they need to see these
				const message = `Product ${product.name} (SKU: ${product.sku}) is running low. Current stock: ${product.currentStock}, Minimum level: ${product.minStockLevel}`;
				const notification = await db.notification.create({
					data: {
						type: mapType('low_stock_alert'),
						channel: PrismaNotificationChannel.EMAIL,
						recipient: admin.email,
						subject: `Low Stock Alert: ${product.name}`,
						message: message,
						body: message,
						status: PrismaNotificationStatus.PENDING,
						priority: PrismaNotificationPriority.HIGH,
						metadata: {
							productId: product.id,
							productName: product.name,
							sku: product.sku,
							currentStock: product.currentStock,
							minStockLevel: product.minStockLevel
						}
					}
				});

				await queueLowStockAlert({
					notificationId: notification.id,
					type: 'low_stock_alert',
					channel: 'email',
					recipient: admin.email,
					template: 'low_stock_alert',
					templateParams: product
				});
			}

			console.log(`🔔 Notified ${adminUsers.length} admin(s) about low stock for ${product.name}`);

		} catch (error) {
			console.error('Error sending low stock alert:', error);
		}
	}

	// Helper methods for message generation
	private getOrderConfirmationMessage(channel: string, order: any, customer: any): string {
		if (channel === 'sms' || channel === 'whatsapp') {
			return `Hi ${customer.user.name}! Your order #${order.orderNumber} is confirmed and being prepared with care. Total: N${order.total.toLocaleString()}. Track: ${process.env.NEXT_PUBLIC_SITE_URL}/track/${order.id} - BenPharm`;
		}
		return `Dear ${customer.user.name},\n\nYour order #${order.orderNumber} has been successfully placed.\n\nOrder Total: ₦${order.total.toLocaleString()}\nDelivery Address: ${order.deliveryAddress}\n\nYou can track your order at: ${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}\n\nThank you for shopping with BenPharmacy!`;
	}

	private getPaymentSuccessMessage(channel: string, order: any, payment: any, customer: any): string {
		if (channel === 'sms' || channel === 'whatsapp') {
			return `Payment of N${payment.amount.toLocaleString()} confirmed for order #${order.orderNumber}. Your order is being processed.`;
		}
		return `Dear ${customer.user.name},\n\nWe have received your payment of ₦${payment.amount.toLocaleString()} for order #${order.orderNumber}.\n\nPayment Method: ${payment.method}\nTransaction ID: ${payment.transactionId || 'N/A'}\n\nYour order is now being processed and will be shipped soon.\n\nThank you!`;
	}

	private getDeliveryUpdateMessage(channel: string, order: any, eta: Date | undefined, customer: any): string {
		const status = this.getStatusLabel(order.status);
		if (channel === 'sms' || channel === 'whatsapp') {
			return `Order #${order.orderNumber} ${status}. ${eta ? `ETA: ${eta.toLocaleDateString()}` : 'Track your order online.'}`;
		}
		return `Dear ${customer.user.name},\n\nYour order #${order.orderNumber} status has been updated to: ${status}\n\n${eta ? `Estimated Delivery: ${eta.toLocaleDateString()}` : 'We will update you with delivery details soon.'}\n\nTrack your order: ${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order.id}`;
	}

	private getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			'PROCESSING': 'is being processed',
			'READY': 'is ready for dispatch',
			'DISPATCHED': 'has been dispatched',
			'DELIVERED': 'has been delivered',
			'CANCELLED': 'has been cancelled'
		};
		return labels[status] || status.toLowerCase();
	}

	/**
	 * Create a notification record in the database
	 */
	private async createNotificationRecord(data: {
		type: string;
		channel: 'sms' | 'whatsapp' | 'email';
		recipient: string;
		customerId?: string;
		orderId?: string;
		template: string;
		templateParams: Record<string, any>;
	}): Promise<NotificationJobData> {
		const message = `Notification: ${data.template}`;
		const notification = await db.notification.create({
			data: {
				type: mapType(data.type),
				channel: mapChannel(data.channel),
				recipient: data.recipient,
				customerId: data.customerId,
				orderId: data.orderId,
				message: message,
				body: message,
				status: PrismaNotificationStatus.PENDING,
				metadata: data.templateParams
			}
		});

		return {
			notificationId: notification.id,
			type: data.type as NotificationType,
			channel: data.channel,
			recipient: data.recipient,
			template: data.template,
			templateParams: data.templateParams
		};
	}
}

// Export a singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();
