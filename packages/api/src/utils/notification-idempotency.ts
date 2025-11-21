import { createHash } from 'crypto';
import { db } from '@repo/database';
import { NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';

/**
 * Notification Idempotency Utilities
 * 
 * Prevents duplicate notification sending by implementing idempotency keys
 * Critical for SMS notifications to avoid duplicate charges and user annoyance
 */

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  existingNotificationId?: string;
  idempotencyKey: string;
}

/**
 * Generate an idempotency key based on notification content
 * Uses a deterministic hash of the notification parameters
 */
export function generateIdempotencyKey(params: {
  recipient: string;
  type: string;
  channel: string;
  orderId?: string;
  customerId?: string;
  templateData?: Record<string, any>;
}): string {
  // Create a deterministic string from the parameters
  const keyData = {
    recipient: params.recipient,
    type: params.type,
    channel: params.channel,
    orderId: params.orderId,
    customerId: params.customerId,
    // For template data, sort keys to ensure consistency
    templateData: params.templateData ? 
      Object.keys(params.templateData)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = params.templateData![key];
          return sorted;
        }, {} as Record<string, any>) : undefined
  };
  
  const keyString = JSON.stringify(keyData);
  
  // Generate SHA-256 hash
  const hash = createHash('sha256').update(keyString).digest('hex');
  
  // Return first 32 characters for shorter keys
  return `idem_${hash.substring(0, 32)}`;
}

/**
 * Generate an idempotency key from a client-provided key
 * Adds prefix and validation
 */
export function normalizeClientIdempotencyKey(clientKey: string): string {
  // Remove any existing prefixes and validate
  const cleanKey = clientKey.replace(/^(idem_|idempotency_)/i, '');
  
  // Validate key format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9\-_]{8,64}$/.test(cleanKey)) {
    throw new Error('Invalid idempotency key format. Must be 8-64 alphanumeric characters, hyphens, or underscores.');
  }
  
  return `idem_${cleanKey}`;
}

/**
 * Check if a notification with the given idempotency key already exists
 * Returns the existing notification if found
 */
export async function checkIdempotency(idempotencyKey: string): Promise<IdempotencyCheckResult> {
  try {
    const existingNotification = await db.notification.findFirst({
      where: {
        idempotencyKey: idempotencyKey
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true
      }
    });
    
    if (existingNotification) {
      return {
        isDuplicate: true,
        existingNotificationId: existingNotification.id,
        idempotencyKey
      };
    }
    
    return {
      isDuplicate: false,
      idempotencyKey
    };
  } catch (error) {
    console.error('Error checking notification idempotency:', error);
    // In case of database error, allow the notification to proceed
    // but log the issue for monitoring
    return {
      isDuplicate: false,
      idempotencyKey
    };
  }
}

/**
 * Create a duplicate-safe notification record with idempotency check
 * Uses upsert-like behavior to handle race conditions
 */
export async function createIdempotentNotification(notificationData: {
  recipient: string;
  channel: NotificationChannel;
  type: NotificationType;
  message: string;
  body?: string;
  subject?: string;
  customerId?: string;
  orderId?: string;
  status?: NotificationStatus;
  idempotencyKey: string;
}) {
  try {
    // Try to create the notification
    const notification = await db.notification.create({
      data: {
        ...notificationData,
        body: notificationData.body || notificationData.message,
        status: notificationData.status || 'PENDING',
        retryCount: 0,
        maxRetries: 3,
      }
    });
    
    return {
      notification,
      wasCreated: true,
      isDuplicate: false
    };
  } catch (error: any) {
    // Check if this is a unique constraint violation on idempotencyKey
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
      // Fetch the existing notification
      const existingNotification = await db.notification.findFirst({
        where: {
          idempotencyKey: notificationData.idempotencyKey
        }
      });
      
      if (existingNotification) {
        return {
          notification: existingNotification,
          wasCreated: false,
          isDuplicate: true
        };
      }
    }
    
    // Re-throw if it's a different error
    throw error;
  }
}

/**
 * Clean up old idempotency keys to prevent unbounded growth
 * Call this periodically (e.g., daily cron job)
 */
export async function cleanupOldIdempotencyKeys(olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  try {
    const result = await db.notification.updateMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        idempotencyKey: {
          not: null
        }
      },
      data: {
        idempotencyKey: null
      }
    });
    
    console.log(`Cleaned up ${result.count} old idempotency keys older than ${olderThanDays} days`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up old idempotency keys:', error);
    return 0;
  }
}

/**
 * Validate idempotency key from request headers
 */
export function extractIdempotencyKeyFromHeaders(headers: Record<string, string | undefined>): string | null {
  const key = headers['idempotency-key'] || headers['x-idempotency-key'];
  
  if (!key) {
    return null;
  }
  
  try {
    return normalizeClientIdempotencyKey(key);
  } catch (error) {
    console.warn('Invalid idempotency key in headers:', key, error);
    return null;
  }
}
