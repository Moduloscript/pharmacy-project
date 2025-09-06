import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '@repo/database';
import { NotificationService, notificationMonitor } from '@repo/mail';
import { Queue } from '@repo/queue';
import type { AppBindings } from '../types/context';

/**
 * Enhanced Notification Management API Routes for BenPharm
 * 
 * Provides comprehensive REST API endpoints for:
 * - Sending single and bulk notifications
 * - Checking notification status and history
 * - Getting delivery metrics and analytics
 * - Managing notification preferences
 * - Admin monitoring and reporting
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
    email: true,
    marketingNotifications: z.boolean().optional(),
    orderNotifications: z.boolean().optional(),
    promotionalNotifications: z.boolean().optional(),
  })
});

// Query schemas for filtering
const historyQuerySchema = z.object({
  channel: z.enum(['sms', 'whatsapp', 'email']).optional(),
  type: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(val => Math.min(Number(val), 100)),
});

const metricsQuerySchema = z.object({
  from: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  to: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

const trendsQuerySchema = z.object({
  days: z.string().regex(/^\d+$/).default('7').transform(val => Math.min(Number(val), 30)),
});

// Helper functions
async function checkOptOutStatus(recipient: string, channel: string): Promise<boolean> {
  try {
    const optOut = await db.notificationOptOut.findFirst({
      where: {
        recipient,
        channel,
        active: true
      }
    });
    return !!optOut;
  } catch (error) {
    console.error('Error checking opt-out status:', error);
    return false; // Default to allowing notifications
  }
}

function getPriority(priority: string): number {
  switch (priority) {
    case 'high': return 1;
    case 'normal': return 5;
    case 'low': return 10;
    default: return 5;
  }
}

function calculateEstimatedDelivery(priority: string): Date {
  const now = new Date();
  const minutes = priority === 'high' ? 1 : priority === 'normal' ? 5 : 15;
  return new Date(now.getTime() + minutes * 60 * 1000);
}

function maskRecipient(recipient: string): string {
  if (recipient.includes('@')) {
    const [local, domain] = recipient.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  } else {
    return recipient.substring(0, 6) + '***' + recipient.slice(-4);
  }
}

// Initialize services (in a real app, these would be injected)
let notificationService: NotificationService;
let queue: Queue;

// Initialize function to be called when setting up the router
export async function initializeNotificationServices() {
  try {
    notificationService = new NotificationService();
    queue = new Queue();
    console.log('📦 Notification services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize notification services:', error);
    throw error;
  }
}

// Admin authentication middleware
const adminAuthMiddleware = async (c: any, next: any) => {
  // In a real implementation, check if user is admin
  // const user = c.get('user');
  // if (!user || user.role !== 'admin') {
  //   return c.json({ error: 'Admin access required' }, 403);
  // }
  await next();
};

// Create the enhanced notifications router
export const notificationsEnhancedRouter = new Hono<AppBindings>()
  // Send a single notification
  .post(
    '/send',
    zValidator('json', sendNotificationSchema),
    async (c) => {
      try {
        const validatedData = c.req.valid('json');
        
        console.log(`📤 API: Sending ${validatedData.channel} notification to ${validatedData.recipient}`);
        
        // Check if recipient has opted out
        const isOptedOut = await checkOptOutStatus(validatedData.recipient, validatedData.channel);
        if (isOptedOut) {
          return c.json({
            success: false,
            error: 'Recipient has opted out of this notification channel',
            code: 'OPTED_OUT'
          }, 400);
        }
        
        // Create notification record
        const notification = await db.notification.create({
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
        
        // Queue the notification
        const queueOptions: any = {
          attempts: 3,
          priority: getPriority(validatedData.priority)
        };
        
        if (validatedData.scheduledAt && validatedData.scheduledAt > new Date()) {
          queueOptions.delay = validatedData.scheduledAt.getTime() - Date.now();
          console.log(`⏰ Scheduled notification ${notification.id} for ${validatedData.scheduledAt}`);
        } else {
          console.log(`🚀 Queued notification ${notification.id} for immediate delivery`);
        }
        
        await queue.add('send-notification', 
          { notificationId: notification.id },
          queueOptions
        );
        
        return c.json({
          success: true,
          data: {
            notificationId: notification.id,
            status: notification.status,
            scheduledAt: notification.scheduledAt,
            estimatedDelivery: calculateEstimatedDelivery(validatedData.priority)
          }
        }, 201);
        
      } catch (error) {
        console.error('❌ Error sending notification:', error);
        return c.json({
          success: false,
          error: 'Failed to send notification',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }
  )

  // Send bulk notifications
  .post(
    '/send/bulk',
    zValidator('json', bulkNotificationSchema),
    async (c) => {
      try {
        const { notifications } = c.req.valid('json');
        
        console.log(`📤 API: Sending ${notifications.length} bulk notifications`);
        
        const results = [];
        const failed = [];
        
        for (const notificationData of notifications) {
          try {
            const isOptedOut = await checkOptOutStatus(notificationData.recipient, notificationData.channel);
            if (isOptedOut) {
              failed.push({
                recipient: notificationData.recipient,
                channel: notificationData.channel,
                error: 'Recipient has opted out'
              });
              continue;
            }
            
            const notification = await db.notification.create({
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
            
            const queueOptions: any = {
              attempts: 3,
              priority: getPriority(notificationData.priority)
            };
            
            if (notificationData.scheduledAt && notificationData.scheduledAt > new Date()) {
              queueOptions.delay = notificationData.scheduledAt.getTime() - Date.now();
            }
            
            await queue.add('send-notification', 
              { notificationId: notification.id },
              queueOptions
            );
            
            results.push({
              notificationId: notification.id,
              recipient: notification.recipient,
              status: notification.status
            });
            
          } catch (error) {
            failed.push({
              recipient: notificationData.recipient,
              channel: notificationData.channel,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        return c.json({
          success: true,
          data: {
            successful: results.length,
            failed: failed.length,
            results,
            failures: failed
          }
        }, 201);
        
      } catch (error) {
        console.error('❌ Error sending bulk notifications:', error);
        return c.json({
          success: false,
          error: 'Failed to send bulk notifications',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }
  )

  // Get notification status
  .get('/:id/status', async (c) => {
    try {
      const id = c.req.param('id');
      
      const notification = await db.notification.findUnique({
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
        return c.json({
          success: false,
          error: 'Notification not found'
        }, 404);
      }
      
      return c.json({
        success: true,
        data: {
          ...notification,
          recipient: maskRecipient(notification.recipient)
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting notification status:', error);
      return c.json({
        success: false,
        error: 'Failed to get notification status'
      }, 500);
    }
  })

  // Get notification history for a recipient
  .get(
    '/:recipient/history',
    zValidator('query', historyQuerySchema),
    async (c) => {
      try {
        const recipient = c.req.param('recipient');
        const { channel, type, status, page, limit } = c.req.valid('query');
        
        const where: any = { recipient };
        if (channel) where.channel = channel;
        if (type) where.type = type;
        if (status) where.status = status;
        
        const [notifications, total] = await Promise.all([
          db.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
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
        
        return c.json({
          success: true,
          data: {
            notifications,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit)
            }
          }
        });
        
      } catch (error) {
        console.error('❌ Error getting notification history:', error);
        return c.json({
          success: false,
          error: 'Failed to get notification history'
        }, 500);
      }
    }
  )

  // Cancel a scheduled notification
  .patch('/:id/cancel', async (c) => {
    try {
      const id = c.req.param('id');
      
      const notification = await db.notification.findUnique({
        where: { id }
      });
      
      if (!notification) {
        return c.json({
          success: false,
          error: 'Notification not found'
        }, 404);
      }
      
      if (notification.status !== 'PENDING') {
        return c.json({
          success: false,
          error: 'Can only cancel pending notifications'
        }, 400);
      }
      
      await db.notification.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          failedAt: new Date(),
          errorMessage: 'Cancelled by user'
        }
      });
      
      console.log(`🚫 Cancelled notification ${id}`);
      
      return c.json({
        success: true,
        message: 'Notification cancelled successfully'
      });
      
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
      return c.json({
        success: false,
        error: 'Failed to cancel notification'
      }, 500);
    }
  })

  // Admin routes - require admin authentication
  .use('/admin/*', adminAuthMiddleware)

  // Get comprehensive metrics (admin only)
  .get(
    '/admin/metrics',
    zValidator('query', metricsQuerySchema),
    async (c) => {
      try {
        const { from, to } = c.req.valid('query');
        
        let dateRange: { from: Date; to: Date } | undefined;
        if (from && to) {
          dateRange = { from, to };
        }
        
        const [metrics, providerHealth, alerts, costAnalysis] = await Promise.all([
          notificationMonitor.getMetrics(dateRange),
          notificationMonitor.getProviderHealth(),
          notificationMonitor.checkForAlerts(),
          notificationMonitor.getCostAnalysis(dateRange)
        ]);
        
        return c.json({
          success: true,
          data: {
            metrics,
            providerHealth,
            alerts,
            costAnalysis
          }
        });
        
      } catch (error) {
        console.error('❌ Error getting metrics:', error);
        return c.json({
          success: false,
          error: 'Failed to get metrics'
        }, 500);
      }
    }
  )

  // Get delivery trends (admin only)
  .get(
    '/admin/trends',
    zValidator('query', trendsQuerySchema),
    async (c) => {
      try {
        const { days } = c.req.valid('query');
        
        const trends = await notificationMonitor.getDeliveryTrends(days);
        
        return c.json({
          success: true,
          data: { trends }
        });
        
      } catch (error) {
        console.error('❌ Error getting delivery trends:', error);
        return c.json({
          success: false,
          error: 'Failed to get delivery trends'
        }, 500);
      }
    }
  )

  // Generate admin report
  .get('/admin/report', async (c) => {
    try {
      const report = await notificationMonitor.generateReport();
      
      return c.json({
        success: true,
        data: { report }
      });
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      return c.json({
        success: false,
        error: 'Failed to generate report'
      }, 500);
    }
  })

  // User preferences routes
  .get('/preferences/:userId', async (c) => {
    try {
      const userId = c.req.param('userId');
      
      const preferences = await db.notificationPreferences.findUnique({
        where: { userId }
      });
      
      return c.json({
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
      
    } catch (error) {
      console.error('❌ Error getting preferences:', error);
      return c.json({
        success: false,
        error: 'Failed to get preferences'
      }, 500);
    }
  })

  // Update user preferences
  .patch(
    '/preferences',
    zValidator('json', updatePreferencesSchema),
    async (c) => {
      try {
        const { userId, preferences } = c.req.valid('json');
        
        const updatedPreferences = await db.notificationPreferences.upsert({
          where: { userId },
          update: preferences,
          create: {
            userId,
            ...preferences
          }
        });
        
        console.log(`⚙️ Updated notification preferences for user ${userId}`);
        
        return c.json({
          success: true,
          data: updatedPreferences
        });
        
      } catch (error) {
        console.error('❌ Error updating preferences:', error);
        return c.json({
          success: false,
          error: 'Failed to update preferences'
        }, 500);
      }
    }
  );
