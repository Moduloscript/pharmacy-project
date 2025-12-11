import { db } from '@repo/database';
import type { NotificationChannel as PrismaNotificationChannel, NotificationPriority as PrismaPriority } from '@repo/database';
import { sendNotificationImmediate } from '../send-immediate';
import type { NotificationChannel, NotificationType, NotificationJobData } from '../../types';

// Helper to convert Prisma enum to custom type
function toPrismaChannel(channel: PrismaNotificationChannel): NotificationChannel {
  return channel.toLowerCase() as NotificationChannel;
}

function toPrismaPriority(priority: 'low' | 'normal' | 'high'): PrismaPriority {
  return priority.toUpperCase() as PrismaPriority;
}

/**
 * Enhanced Notification Service
 * Provides high-level notification methods for common use cases
 */
export class EnhancedNotificationService {
  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(data: {
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    deliveryAddress: string;
  }): Promise<void> {
    try {
      // Get customer details
      const customer = await db.customer.findUnique({
        where: { id: data.customerId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!customer) {
        console.error(`Customer not found: ${data.customerId}`);
        return;
      }

      // Check notification preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId: data.customerId },
      });

      // Determine preferred channel (default to email if no preferences)
      const channel: PrismaNotificationChannel = 
        preferences?.emailEnabled !== false ? 'EMAIL' : 
        preferences?.smsEnabled !== false ? 'SMS' : 
        'EMAIL';

      const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

      if (!recipient) {
        console.error(`No ${channel} recipient found for customer ${data.customerId}`);
        return;
      }

      // Create notification record
      const notification = await db.notification.create({
        data: {
          recipient,
          channel,
          type: 'ORDER_CONFIRMATION',
          subject: `Order Confirmation - ${data.orderNumber}`,
          message: `Your order ${data.orderNumber} has been confirmed. Total: ₦${data.total.toLocaleString()}`,
          body: `Your order ${data.orderNumber} has been confirmed. Total: ₦${data.total.toLocaleString()}`,
          metadata: {
            orderId: data.id,
            orderNumber: data.orderNumber,
            total: data.total,
            deliveryAddress: data.deliveryAddress,
          },
          status: 'PENDING',
        },
      });

      // Send immediately (for Vercel Hobby plan compatibility)
      await sendNotificationImmediate({
        notificationId: notification.id,
        type: 'order_confirmation',
        channel: toPrismaChannel(channel),
        recipient,
        template: 'order_confirmation',
        templateParams: {
          orderNumber: data.orderNumber,
          total: data.total,
          deliveryAddress: data.deliveryAddress,
        },
        priority: 'high',
      });

      console.log(`✅ Order confirmation sent for order ${data.orderNumber}`);
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  /**
   * Send delivery update notification
   */
  async sendDeliveryUpdate(data: {
    id: string;
    orderNumber: string;
    customerId: string;
    status: string;
    notes?: string;
  }): Promise<void> {
    try {
      // Get customer details
      const customer = await db.customer.findUnique({
        where: { id: data.customerId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!customer) {
        console.error(`Customer not found: ${data.customerId}`);
        return;
      }

      // Check notification preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId: data.customerId },
      });

      // Determine preferred channel
      const channel: PrismaNotificationChannel = 
        preferences?.emailEnabled !== false ? 'EMAIL' : 
        preferences?.smsEnabled !== false ? 'SMS' : 
        'EMAIL';

      const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

      if (!recipient) {
        console.error(`No ${channel} recipient found for customer ${data.customerId}`);
        return;
      }

      // Create notification record
      const notification = await db.notification.create({
        data: {
          recipient,
          channel,
          type: 'DELIVERY_UPDATE',
          subject: `Delivery Update - ${data.orderNumber}`,
          message: `Your order ${data.orderNumber} status: ${data.status}${data.notes ? `. ${data.notes}` : ''}`,
          body: `Your order ${data.orderNumber} status: ${data.status}${data.notes ? `. ${data.notes}` : ''}`,
          metadata: {
            orderId: data.id,
            orderNumber: data.orderNumber,
            status: data.status,
            notes: data.notes,
          },
          status: 'PENDING',
        },
      });

      // Send immediately
      await sendNotificationImmediate({
        notificationId: notification.id,
        type: 'delivery_update',
        channel: toPrismaChannel(channel),
        recipient,
        template: 'delivery_update',
        templateParams: {
          orderNumber: data.orderNumber,
          status: data.status,
          notes: data.notes,
        },
        priority: 'normal',
      });

      console.log(`✅ Delivery update sent for order ${data.orderNumber}`);
    } catch (error) {
      console.error('Error sending delivery update:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    try {
      // Get customer details
      const customer = await db.customer.findUnique({
        where: { id: data.customerId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!customer) {
        console.error(`Customer not found: ${data.customerId}`);
        return;
      }

      // Check notification preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId: data.customerId },
      });

      // Determine preferred channel
      const channel: PrismaNotificationChannel = 
        preferences?.emailEnabled !== false ? 'EMAIL' : 
        preferences?.smsEnabled !== false ? 'SMS' : 
        'EMAIL';

      const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

      if (!recipient) {
        console.error(`No ${channel} recipient found for customer ${data.customerId}`);
        return;
      }

      // Create notification record
      const notification = await db.notification.create({
        data: {
          recipient,
          channel,
          type: 'PAYMENT_CONFIRMATION',
          subject: `Payment Confirmed - ${data.orderNumber}`,
          message: `Payment of ₦${data.amount.toLocaleString()} confirmed for order ${data.orderNumber}`,
          body: `Payment of ₦${data.amount.toLocaleString()} confirmed for order ${data.orderNumber}`,
          metadata: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
          },
          status: 'PENDING',
        },
      });

      // Send immediately
      await sendNotificationImmediate({
        notificationId: notification.id,
        type: 'payment_confirmation',
        channel: toPrismaChannel(channel),
        recipient,
        template: 'payment_confirmation',
        templateParams: {
          orderNumber: data.orderNumber,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
        },
        priority: 'high',
      });

      console.log(`✅ Payment confirmation sent for order ${data.orderNumber}`);
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();
