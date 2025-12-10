import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { db } from '@repo/database';
import { addNotificationJob } from '@repo/queue';
import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationStatus as PrismaNotificationStatus,
} from '@repo/database';

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

// Admin-only notifications test router
import type { AppBindings } from '../types/context';
export const notificationsRouter = new Hono<AppBindings>()
  .use('*', authMiddleware)
  .use('*', async (c, next) => {
    const user = c.get('user') as { role?: string } | undefined;
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  })
  .post(
    '/notifications/test',
    zValidator(
      'json',
      z.object({
        channel: z.enum(['sms', 'whatsapp']),
        recipient: z.string().min(7),
        type: z
          .enum([
            'order_confirmation',
            'payment_success',
            'delivery_update',
            'low_stock_alert',
          ])
          .default('order_confirmation'),
        message: z.string().optional(),
        template: z.string().optional(),
        templateParams: z.record(z.any()).optional(),
      })
    ),
    async (c) => {
      try {
        const { channel, recipient, type, message, template, templateParams } = c.req.valid('json');

        // Create a notification record in DB (PENDING)
        const record = await db.notification.create({
          data: {
            type: mapType(type),
            channel: mapChannel(channel),
            recipient,
            message: message || '',
            body: message || '',
            status: PrismaNotificationStatus.PENDING,
          },
        });

        // Enqueue the job so the worker can deliver it
        const jobId = await addNotificationJob(type, {
          notificationId: record.id,
          type,
          channel,
          recipient,
          message,
          template,
          templateParams,
        });

        return c.json({ success: true, notificationId: record.id, jobId });
      } catch (error) {
        console.error('Error enqueuing test notification:', error);
        return c.json({ success: false, error: 'Failed to enqueue test notification' }, 500);
      }
    }
  );
