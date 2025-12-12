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

      // Fetch order items to display in email
      const order = await db.order.findUnique({
        where: { id: data.id },
        include: {
          orderItems: true,
        },
      });

      const orderItems = order?.orderItems.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.unitPrice)
      })) || [];

      // Check notification preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId: data.customerId },
      });

      // Determine enabled channels
      const channels: PrismaNotificationChannel[] = [];
      
      // Add email if enabled (or default)
      if (preferences?.emailEnabled !== false && customer.user.email) {
        channels.push('EMAIL');
      }
      
      // Add SMS if enabled (or default) and phone exists
      if (preferences?.smsEnabled !== false && customer.phone) {
        channels.push('SMS');
      }

      // Default to email if no channels selected but email exists
      if (channels.length === 0 && customer.user.email) {
        channels.push('EMAIL');
      }

      if (channels.length === 0) {
        console.error(`No enabled channels found for customer ${data.customerId}`);
        return;
      }

      // Send to all enabled channels
      await Promise.all(channels.map(async (channel) => {
        const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

        if (!recipient) return;

        // Create notification record
        const notification = await db.notification.create({
          data: {
            recipient,
            channel,
            type: 'ORDER_CONFIRMATION',
            subject: `Order Confirmation - ${data.orderNumber}`,
            message: `BenPharmacy: Dear ${customer.user.name || 'Customer'}, Order #${data.orderNumber} confirmed. Total: ₦${data.total.toLocaleString()}. We are processing it now. Questions? Support: +234-XXX-XXXX`,
            body: `BenPharmacy: Dear ${customer.user.name || 'Customer'}, Order #${data.orderNumber} confirmed. Total: ₦${data.total.toLocaleString()}. We are processing it now. Questions? Support: +234-XXX-XXXX`,
            metadata: {
              orderId: data.id,
              orderNumber: data.orderNumber,
              total: data.total,
              deliveryAddress: data.deliveryAddress,
            },
            status: 'PENDING',
          },
        });

        // Send immediately
        await sendNotificationImmediate({
          notificationId: notification.id,
          type: 'order_confirmation',
          channel: toPrismaChannel(channel),
          recipient,
          template: channel === 'EMAIL' ? 'order_confirmation' : undefined,
          message: channel === 'SMS' ? notification.message : undefined, // Ensure SMS uses the professional message
          templateParams: {
            orderNumber: data.orderNumber,
            total: data.total,
            deliveryAddress: data.deliveryAddress,
            order_items: orderItems,
            customer_name: customer.user.name || 'Customer',
          },
          priority: 'high',
        });
        
        console.log(`✅ Order confirmation sent via ${channel} for order ${data.orderNumber}`);
      }));

    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  /**
   * Convert order status to human-readable label
   */
  /**
   * Convert order status to human-readable label
   */
  private getStatusLabel(status: string): string {
    const s = status?.toUpperCase() || '';
    const statusLabels: Record<string, string> = {
      'RECEIVED': 'Order Received',
      'PENDING': 'Order Pending',
      'PROCESSING': 'Processing',
      'READY': 'Ready for Pickup/Delivery',
      'DISPATCHED': 'Out for Delivery',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'COMPLETED': 'Completed',
    };
    return statusLabels[s] || status;
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
      // Prevent duplicate notifications for initial order states
      // These are covered by the standard Order Confirmation email
      if (['RECEIVED', 'PENDING'].includes(data.status.toUpperCase())) {
        console.log(`ℹ️ Skipping delivery update for initial status: ${data.status}`);
        return;
      }

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

      // Fetch order items to display in delivery update
      const order = await db.order.findUnique({
        where: { id: data.id },
        include: {
          orderItems: true,
        },
      });

      const orderItems = order?.orderItems.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.unitPrice)
      })) || [];

      // Check notification preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId: data.customerId },
      });

      // Determine enabled channels
      const channels: PrismaNotificationChannel[] = [];
      
      // Add email if enabled (or default)
      if (preferences?.emailEnabled !== false && customer.user.email) {
        channels.push('EMAIL');
      }
      
      // Add SMS if enabled (or default) and phone exists
      if (preferences?.smsEnabled !== false && customer.phone) {
        channels.push('SMS');
      }

      // Default to email if no channels selected but email exists
      if (channels.length === 0 && customer.user.email) {
        channels.push('EMAIL');
      }

      if (channels.length === 0) {
        console.error(`No enabled channels found for customer ${data.customerId}`);
        return;
      }

      const statusLabel = this.getStatusLabel(data.status);
      const customerName = customer.user.name || 'Customer';

      // Professional SMS Message
      const smsMessage = `BenPharmacy: Dear ${customerName}, update for Order #${data.orderNumber}. Status: ${statusLabel}.${data.notes ? ` Note: ${data.notes}` : ''} Track here: https://pharmacy-project-web.vercel.app/app/orders/${data.id}`;

      // Send to all enabled channels
      await Promise.all(channels.map(async (channel) => {
        const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

        if (!recipient) return;

        // Create notification record
        const notification = await db.notification.create({
          data: {
            recipient,
            channel,
            type: 'DELIVERY_UPDATE',
            subject: `Update on Order #${data.orderNumber}`,
            message: smsMessage,
            body: smsMessage,
            metadata: {
              orderId: data.id,
              orderNumber: data.orderNumber,
              status: data.status,
              status_label: statusLabel, // Critical for email template
              notes: data.notes,
              customerName,
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
          template: channel === 'EMAIL' ? 'delivery_update' : undefined,
          message: channel === 'SMS' ? notification.message : undefined, // Ensure SMS uses the professional message
          templateParams: {
            customer_name: customerName,
            order_number: data.orderNumber,
            status_label: statusLabel,
            notes: data.notes,
            eta_or_notes: data.notes,
            tracking_url: `https://pharmacy-project-web.vercel.app/app/orders/${data.id}`,
            order_items: orderItems,
          },
          priority: 'normal',
        });

        console.log(`✅ Delivery update sent via ${channel} for order ${data.orderNumber}`);
      }));

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

      // Determine enabled channels
      const channels: PrismaNotificationChannel[] = [];
      
      // Add email if enabled (or default)
      if (preferences?.emailEnabled !== false && customer.user.email) {
        channels.push('EMAIL');
      }
      
      // Add SMS if enabled (or default) and phone exists
      if (preferences?.smsEnabled !== false && customer.phone) {
        channels.push('SMS');
      }

      // Default to email if no channels selected but email exists
      if (channels.length === 0 && customer.user.email) {
        channels.push('EMAIL');
      }

      if (channels.length === 0) {
        console.error(`No enabled channels found for customer ${data.customerId}`);
        return;
      }

      // Send to all enabled channels
      await Promise.all(channels.map(async (channel) => {
        const recipient = channel === 'EMAIL' ? customer.user.email : customer.phone;

        if (!recipient) return;

        // Create notification record
        const notification = await db.notification.create({
          data: {
            recipient,
            channel,
            type: 'PAYMENT_CONFIRMATION',
            subject: `Payment Receipt - ${data.orderNumber}`,
            message: `BenPharmacy: Payment received for Order #${data.orderNumber}. Amount: ₦${data.amount.toLocaleString()}. We will notify you when it ships. Thank you!`,
            body: `BenPharmacy: Payment received for Order #${data.orderNumber}. Amount: ₦${data.amount.toLocaleString()}. We will notify you when it ships. Thank you!`,
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
          type: 'payment_success',
          channel: toPrismaChannel(channel),
          recipient,
          template: channel === 'EMAIL' ? 'payment_success' : undefined,
          message: channel === 'SMS' ? notification.message : undefined, // Ensure SMS uses the professional message
          templateParams: {
            orderNumber: data.orderNumber,
            amount: data.amount,
            method: data.paymentMethod,
          },
          priority: 'high',
        });
        
        console.log(`✅ Payment confirmation sent via ${channel} for order ${data.orderNumber}`);
      }));

    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();
