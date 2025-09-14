import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { db } from '@repo/database';
import type { AppBindings } from '../types/context';

/**
 * Customer Notification Preferences API
 * 
 * Provides endpoints for customers to manage their notification settings,
 * including channel preferences, notification types, and enhanced features
 * like quiet hours and rate limits.
 */

// Validation schemas
const updatePreferencesSchema = z.object({
  // Channel preferences
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  
  // Notification type preferences
  orderUpdates: z.boolean().optional(),
  paymentUpdates: z.boolean().optional(),
  deliveryUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  
  // Prescription-specific preferences
  prescriptionApproval: z.boolean().optional(),
  prescriptionRejection: z.boolean().optional(),
  prescriptionClarification: z.boolean().optional(),
  
  // Enhanced settings
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  dailyNotificationLimit: z.number().min(1).max(100).optional(),
  emergencyOverride: z.boolean().optional(),
  preferredChannel: z.enum(['sms', 'whatsapp', 'email']).optional(),
});

const optOutSchema = z.object({
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'PUSH']),
  type: z.enum([
    'ORDER_UPDATES',
    'PAYMENT_UPDATES',
    'DELIVERY_UPDATES',
    'PROMOTIONS',
    'LOW_STOCK_ALERTS',
    'ALL'
  ]).optional(),
  reason: z.string().optional(),
});

// Helper function to get customer ID from authenticated user
async function getCustomerId(userId: string): Promise<string | null> {
  const customer = await db.customer.findUnique({
    where: { userId },
    select: { id: true }
  });
  return customer?.id || null;
}

// Create the notification preferences router
export const notificationPreferencesRouter = new Hono<AppBindings>()
  .use('*', authMiddleware)
  
  // GET /api/notifications/preferences - Get current customer's preferences
  .get('/preferences', async (c) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const customerId = await getCustomerId(user.id);
      if (!customerId) {
        return c.json({ error: 'Customer profile not found' }, 404);
      }

      // Get existing preferences or return defaults
      let preferences = await db.notificationPreferences.findUnique({
        where: { customerId }
      });

      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = await db.notificationPreferences.create({
          data: {
            customerId,
            smsEnabled: true,
            whatsappEnabled: true,
            emailEnabled: true,
            orderUpdates: true,
            paymentUpdates: true,
            deliveryUpdates: true,
            promotions: false,
            prescriptionApproval: true,
            prescriptionRejection: true,
            prescriptionClarification: true,
            quietHoursEnabled: false,
            dailyNotificationLimit: 10,
            emergencyOverride: true,
          }
        });
      }

      // Get opt-out records
      const optOuts = await db.notificationOptOut.findMany({
        where: { customerId },
        select: {
          channel: true,
          type: true,
          reason: true,
          createdAt: true,
        }
      });

      // Get current rate limit status
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const rateLimits = await db.notificationRateLimit.findMany({
        where: {
          customerId,
          windowStart: { gte: startOfDay }
        },
        select: {
          notificationType: true,
          count: true,
          exceeded: true,
          windowEnd: true,
        }
      });

      return c.json({
        success: true,
        data: {
          preferences,
          optOuts,
          rateLimits,
          stats: {
            totalOptOuts: optOuts.length,
            dailyLimitReached: rateLimits.some(rl => rl.exceeded),
            notificationsSentToday: rateLimits.reduce((sum, rl) => sum + rl.count, 0),
          }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching notification preferences:', error);
      return c.json({ error: 'Failed to fetch preferences' }, 500);
    }
  })

  // PATCH /api/notifications/preferences - Update preferences
  .patch(
    '/preferences',
    zValidator('json', updatePreferencesSchema),
    async (c) => {
      try {
        const user = c.get('user');
        if (!user?.id) {
          return c.json({ error: 'Authentication required' }, 401);
        }

        const customerId = await getCustomerId(user.id);
        if (!customerId) {
          return c.json({ error: 'Customer profile not found' }, 404);
        }

        const updates = c.req.valid('json');

        // Validate quiet hours if provided
        if (updates.quietHoursEnabled && (!updates.quietHoursStart || !updates.quietHoursEnd)) {
          return c.json({ 
            error: 'Quiet hours start and end times are required when enabling quiet hours' 
          }, 400);
        }

        // Update or create preferences
        const preferences = await db.notificationPreferences.upsert({
          where: { customerId },
          update: updates,
          create: {
            customerId,
            ...updates
          }
        });

        console.log(`✅ Updated notification preferences for customer ${customerId}`);

        return c.json({
          success: true,
          data: preferences,
          message: 'Preferences updated successfully'
        });

      } catch (error) {
        console.error('❌ Error updating notification preferences:', error);
        return c.json({ error: 'Failed to update preferences' }, 500);
      }
    }
  )

  // POST /api/notifications/opt-out - Opt out of specific notifications
  .post(
    '/opt-out',
    zValidator('json', optOutSchema),
    async (c) => {
      try {
        const user = c.get('user');
        if (!user?.id) {
          return c.json({ error: 'Authentication required' }, 401);
        }

        const customerId = await getCustomerId(user.id);
        if (!customerId) {
          return c.json({ error: 'Customer profile not found' }, 404);
        }

        const { channel, type, reason } = c.req.valid('json');

        // Check if already opted out
        const existingOptOut = await db.notificationOptOut.findFirst({
          where: {
            customerId,
            channel,
            type: type || null
          }
        });

        if (existingOptOut) {
          return c.json({
            success: false,
            error: 'Already opted out of this notification type'
          }, 400);
        }

        // Create opt-out record
        const optOut = await db.notificationOptOut.create({
          data: {
            customerId,
            channel,
            type,
            reason
          }
        });

        // If opting out of ALL, disable the channel in preferences
        if (type === 'ALL') {
          const updateData: any = {};
          if (channel === 'SMS') updateData.smsEnabled = false;
          if (channel === 'WHATSAPP') updateData.whatsappEnabled = false;
          if (channel === 'EMAIL') updateData.emailEnabled = false;

          await db.notificationPreferences.update({
            where: { customerId },
            data: updateData
          });
        }

        console.log(`🚫 Customer ${customerId} opted out of ${channel} ${type || 'all'} notifications`);

        return c.json({
          success: true,
          data: optOut,
          message: `Successfully opted out of ${type || 'all'} ${channel.toLowerCase()} notifications`
        });

      } catch (error) {
        console.error('❌ Error processing opt-out:', error);
        return c.json({ error: 'Failed to process opt-out request' }, 500);
      }
    }
  )

  // DELETE /api/notifications/opt-out - Remove opt-out (opt back in)
  .delete('/opt-out', async (c) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const customerId = await getCustomerId(user.id);
      if (!customerId) {
        return c.json({ error: 'Customer profile not found' }, 404);
      }

      const { channel, type } = c.req.query();

      if (!channel) {
        return c.json({ error: 'Channel parameter is required' }, 400);
      }

      // Delete opt-out record(s)
      const deleteWhere: any = {
        customerId,
        channel: channel.toUpperCase()
      };

      if (type) {
        deleteWhere.type = type.toUpperCase();
      }

      const deleted = await db.notificationOptOut.deleteMany({
        where: deleteWhere
      });

      if (deleted.count === 0) {
        return c.json({
          success: false,
          error: 'No opt-out record found'
        }, 404);
      }

      // Re-enable the channel in preferences if it was a full opt-out
      if (!type || type === 'ALL') {
        const updateData: any = {};
        if (channel.toUpperCase() === 'SMS') updateData.smsEnabled = true;
        if (channel.toUpperCase() === 'WHATSAPP') updateData.whatsappEnabled = true;
        if (channel.toUpperCase() === 'EMAIL') updateData.emailEnabled = true;

        await db.notificationPreferences.update({
          where: { customerId },
          data: updateData
        });
      }

      console.log(`✅ Customer ${customerId} opted back in to ${channel} notifications`);

      return c.json({
        success: true,
        message: `Successfully opted back in to ${channel.toLowerCase()} notifications`
      });

    } catch (error) {
      console.error('❌ Error removing opt-out:', error);
      return c.json({ error: 'Failed to remove opt-out' }, 500);
    }
  })

  // GET /api/notifications/history - Get notification history
  .get('/history', async (c) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const customerId = await getCustomerId(user.id);
      if (!customerId) {
        return c.json({ error: 'Customer profile not found' }, 404);
      }

      const { page = '1', limit = '20', channel, type, status } = c.req.query();
      
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);

      const where: any = { customerId };
      if (channel) where.channel = channel;
      if (type) where.type = type;
      if (status) where.status = status;

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          select: {
            id: true,
            type: true,
            channel: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            sentAt: true,
            deliveredAt: true,
            failedAt: true,
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
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching notification history:', error);
      return c.json({ error: 'Failed to fetch notification history' }, 500);
    }
  })

  // GET /api/notifications/test-preferences - Test notification preferences (for testing)
  .get('/test-preferences', async (c) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const customerId = await getCustomerId(user.id);
      if (!customerId) {
        return c.json({ error: 'Customer profile not found' }, 404);
      }

      // Send a test notification respecting preferences
      const preferences = await db.notificationPreferences.findUnique({
        where: { customerId }
      });

      if (!preferences) {
        return c.json({ error: 'No preferences found' }, 404);
      }

      // Determine which channel to use for test
      let testChannel = 'email';
      if (preferences.preferredChannel) {
        testChannel = preferences.preferredChannel;
      } else if (preferences.smsEnabled) {
        testChannel = 'sms';
      } else if (preferences.whatsappEnabled) {
        testChannel = 'whatsapp';
      }

      return c.json({
        success: true,
        message: 'Test notification would be sent',
        data: {
          channel: testChannel,
          preferencesApplied: {
            quietHours: preferences.quietHoursEnabled,
            preferredChannel: preferences.preferredChannel,
            channelsEnabled: {
              sms: preferences.smsEnabled,
              whatsapp: preferences.whatsappEnabled,
              email: preferences.emailEnabled
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error testing preferences:', error);
      return c.json({ error: 'Failed to test preferences' }, 500);
    }
  });
