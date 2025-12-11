import { db } from '@repo/database';
import type { NotificationChannel as PrismaNotificationChannel, NotificationPriority as PrismaPriority, NotificationType as PrismaNotificationType } from '@prisma/client';
import { sendNotificationImmediate } from '../send-immediate';
import type { NotificationChannel, NotificationType, NotificationJobData } from '../../types';

// Helper to convert Prisma enum to custom type
function toPrismaChannel(channel: PrismaNotificationChannel): NotificationChannel {
  return channel.toLowerCase() as NotificationChannel;
}

function toPrismaPriority(priority: PrismaPriority): 'low' | 'normal' | 'high' {
  return priority.toLowerCase() as 'low' | 'normal' | 'high';
}

function fromPrismaPriority(priority: 'low' | 'normal' | 'high'): PrismaPriority {
  return priority.toUpperCase() as PrismaPriority;
}

/**
 * Base Notification Service
 * Provides core notification functionality
 */
export class NotificationService {
  /**
   * Send a generic notification
   */
  async send(data: {
    recipient: string;
    channel: PrismaNotificationChannel;
    type: PrismaNotificationType;
    subject?: string;
    message: string;
    metadata?: Record<string, any>;
    priority?: PrismaPriority;
  }): Promise<void> {
    try {
      // Create notification record
      const notification = await db.notification.create({
        data: {
          recipient: data.recipient,
          channel: data.channel,
          type: data.type,
          subject: data.subject,
          message: data.message,
          body: data.message,
          metadata: data.metadata || {},
          priority: data.priority || 'NORMAL',
        },
      });

      // Send immediately (for Vercel Hobby plan compatibility)
      await sendNotificationImmediate({
        notificationId: notification.id,
        type: data.type.toLowerCase().replace(/_/g, '_') as NotificationType,
        channel: toPrismaChannel(data.channel),
        recipient: data.recipient,
        template: data.type.toLowerCase().replace(/_/g, '_'),
        templateParams: data.metadata,
        priority: data.priority ? toPrismaPriority(data.priority) : 'normal',
      });

      console.log(`✅ Notification sent: ${data.type} to ${data.recipient}`);
    } catch (error) {
      console.error('Error sending notification:', error);
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

      await this.send({
        recipient,
        channel,
        type: 'DELIVERY_UPDATE',
        subject: `Delivery Update - ${data.orderNumber}`,
        message: `Your order ${data.orderNumber} status: ${data.status}${data.notes ? `. ${data.notes}` : ''}`,
        metadata: {
          orderId: data.id,
          orderNumber: data.orderNumber,
          status: data.status,
          notes: data.notes,
        },
        priority: 'NORMAL',
      });
    } catch (error) {
      console.error('Error sending delivery update:', error);
      throw error;
    }
  }

  /**
   * Get notification status
   */
  async getStatus(notificationId: string) {
    return await db.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        errorMessage: true,
      },
    });
  }

  /**
   * Get notification history for a recipient
   */
  async getHistory(recipient: string, options?: {
    channel?: NotificationChannel;
    type?: NotificationType;
    limit?: number;
  }) {
    const where: any = { recipient };
    
    if (options?.channel) {
      where.channel = options.channel;
    }
    
    if (options?.type) {
      where.type = options.type;
    }

    return await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      select: {
        id: true,
        channel: true,
        type: true,
        subject: true,
        status: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
      },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
