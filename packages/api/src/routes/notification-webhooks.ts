import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '@repo/database';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { AppBindings } from '../types/context';

/**
 * Notification Webhooks API Routes
 * 
 * Handles delivery status updates from notification providers
 * - Termii SMS delivery receipts
 * - WhatsApp message status updates (future)
 * - Email delivery notifications (future)
 */

// Termii delivery status schema based on official documentation
// Some fields (id, sender, message, sent_at, cost, channel) are not always present across all Termii accounts
// or delivery channels, so we mark them optional to avoid rejecting valid DLRs.
const termiiDeliveryStatusSchema = z.object({
  type: z.string().optional(),
  id: z.string().optional(),
  message_id: z.string(),
  receiver: z.string(),
  sender: z.string().optional(),
  message: z.string().optional(),
  sent_at: z.string().optional(),
  cost: z.string().optional(),
  status: z.string(), // Can be: DELIVERED, DND Active on Phone Number, Message Failed, Message Sent, Received, Rejected, Expired
  channel: z.string().optional(), // dnd, whatsapp, or generic
});

// Generic webhook verification schema
const webhookVerificationSchema = z.object({
  signature: z.string(),
  timestamp: z.string().optional(),
  body: z.string()
});

/**
 * Verify webhook signature for security
 * Prevents unauthorized webhook calls
 */
function verifyTermiiWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Termii uses HMAC SHA512 signature of the event payload signed with secret key
    // Try hex format (most common)
    const computedHex = createHmac('sha512', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Check if signature matches hex format (case-insensitive)
    if (signature.toLowerCase() === computedHex.toLowerCase()) {
      return true;
    }
    
    // Try base64 format
    const computedBase64 = createHmac('sha512', secret)
      .update(payload, 'utf8')
      .digest('base64');
    
    if (signature === computedBase64) {
      return true;
    }
    
    // Try timing-safe comparison for hex (in case of buffer issues)
    try {
      const expectedBuffer = Buffer.from(signature, 'hex');
      const computedBuffer = Buffer.from(computedHex, 'hex');
      if (expectedBuffer.length === computedBuffer.length && 
          timingSafeEqual(expectedBuffer, computedBuffer)) {
        return true;
      }
    } catch {}
    
    return false;
  } catch (error) {
    console.error('Error verifying Termii webhook signature:', error);
    return false;
  }
}

/**
 * Find notification by Termii message ID or receiver phone number
 */
async function findNotificationByTermiiData(messageId: string, receiver: string) {
  // First try to find by external message ID (direct match)
  const byExternalId = await db.notification.findFirst({
    where: {
      externalMessageId: messageId,
      channel: 'SMS'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  if (byExternalId) {
    return byExternalId;
  }
  
  // Fallback: try to find by message ID in gateway response (for backwards compatibility)
  const byMessageId = await db.notification.findFirst({
    where: {
      channel: 'SMS',
      gatewayResponse: {
        contains: messageId
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  if (byMessageId) {
    return byMessageId;
  }
  
  // Fallback: find most recent SMS to this receiver
  // Handle different phone number formats (+234, 0, etc.)
  const normalizedReceiver = receiver.replace(/^\+234/, '0').replace(/^\+/, '');
  const byPhoneNumber = await db.notification.findFirst({
    where: {
      channel: 'SMS',
      OR: [
        { recipient: { contains: receiver } },
        { recipient: { contains: normalizedReceiver } },
        { recipient: { contains: receiver.replace(/^0/, '+234') } }
      ],
      status: {
        in: ['PENDING', 'SENT']
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return byPhoneNumber;
}

/**
 * Map Termii status to our internal status based on official documentation
 */
function mapTermiiStatusToInternal(termiiStatus: string): string {
  switch (termiiStatus) {
    case 'DELIVERED':
    case 'Delivered': // Alternative format
      return 'DELIVERED';
    case 'Message Failed':
    case 'Rejected':
    case 'Expired':
      return 'FAILED';
    case 'Message Sent':
      return 'SENT';
    case 'DND Active on Phone Number':
      return 'DND_BLOCKED';
    case 'Received': // For inbound messages
      return 'RECEIVED';
    default:
      console.warn(`Unknown Termii status: ${termiiStatus}`);
      return 'UNKNOWN';
  }
}

/**
 * Update notification status based on delivery receipt
 */
async function updateNotificationStatus(
  notificationId: string,
  status: string,
  deliveryData: any
) {
  const updateData: any = {
    status,
    gatewayResponse: JSON.stringify(deliveryData)
  };
  
  if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  } else if (status === 'SENT' && !await db.notification.findFirst({
    where: { id: notificationId, sentAt: { not: null } }
  })) {
    updateData.sentAt = new Date();
  }
  
  const updatedNotification = await db.notification.update({
    where: { id: notificationId },
    data: updateData
  });
  
  console.log(`📊 Updated notification ${notificationId} status to ${status}`);
  return updatedNotification;
}

// Create the webhooks router
export const notificationWebhooksRouter = new Hono<AppBindings>()

  // Termii delivery status webhook
  .post(
    '/termii/delivery',
    async (c) => {
      try {
        // Get raw body for signature verification
        const rawBody = await c.req.text();
        let deliveryData: any;
        
        try {
          deliveryData = JSON.parse(rawBody);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON from webhook body');
          return c.json({ success: false, error: 'Invalid JSON' }, 400);
        }
        
        // Validate against schema
        const validationResult = termiiDeliveryStatusSchema.safeParse(deliveryData);
        if (!validationResult.success) {
          console.error('❌ Invalid webhook payload:', validationResult.error);
          return c.json({ 
            success: false, 
            error: 'Invalid webhook payload',
            details: validationResult.error.flatten()
          }, 400);
        }
        
        deliveryData = validationResult.data;
        
        console.log('📨 Received Termii delivery status:', {
          type: deliveryData.type,
          messageId: deliveryData.message_id,
          receiver: deliveryData.receiver,
          status: deliveryData.status,
          channel: deliveryData.channel,
          cost: deliveryData.cost,
          sentAt: deliveryData.sent_at
        });
        
        // Verify webhook signature if configured
        const webhookSecret = process.env.TERMII_WEBHOOK_SECRET;
        if (webhookSecret) {
          const signature = c.req.header('X-Termii-Signature');
          
          if (!signature) {
            console.warn('⚠️ Missing X-Termii-Signature header for delivery status');
            return c.json({ success: false, error: 'Missing signature' }, 401);
          }
          
          // Use the raw body for signature verification
          const isValid = verifyTermiiWebhookSignature(rawBody, signature, webhookSecret);
          
          if (!isValid) {
            console.warn('⚠️ Invalid webhook signature for Termii delivery status');
            console.warn('Signature header:', signature.substring(0, 32) + '...');
            return c.json({ success: false, error: 'Invalid signature' }, 401);
          }
          
          console.log('✓ Termii webhook signature verified successfully');
        } else {
          console.warn('⚠️ TERMII_WEBHOOK_SECRET not configured - webhook signature verification skipped');
        }
        
        // Find the notification
        const notification = await findNotificationByTermiiData(
          deliveryData.message_id,
          deliveryData.receiver
        );
        
        if (!notification) {
          console.warn(`⚠️ Notification not found for Termii message ID: ${deliveryData.message_id}, receiver: ${deliveryData.receiver}`);
          // Still return success to prevent webhook retries
          return c.json({ 
            success: true, 
            message: 'Notification not found but webhook received' 
          });
        }
        
        // Map status and update notification
        const internalStatus = mapTermiiStatusToInternal(deliveryData.status);
        
        // Also update the externalMessageId if it wasn't set before
        const updateData: any = {
          status: internalStatus,
          gatewayResponse: JSON.stringify(deliveryData)
        };
        
        if (!notification.externalMessageId && deliveryData.message_id) {
          updateData.externalMessageId = deliveryData.message_id;
        }
        
        if (internalStatus === 'DELIVERED') {
          updateData.deliveredAt = new Date();
        }
        
        await db.notification.update({
          where: { id: notification.id },
          data: updateData
        });
        
        console.log(`📊 Updated notification ${notification.id} status to ${internalStatus}`);
        
        return c.json({
          success: true,
          message: 'Delivery status updated successfully',
          notificationId: notification.id,
          status: internalStatus
        });
        
      } catch (error) {
        console.error('❌ Error processing Termii delivery status:', error);
        return c.json({
          success: false,
          error: 'Failed to process delivery status',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }
  )

  // Generic delivery status endpoint (for testing)
  .post(
    '/delivery-status',
    async (c) => {
      try {
        const body = await c.req.json();
        console.log('📨 Received generic delivery status webhook:', body);
        
        return c.json({
          success: true,
          message: 'Webhook received',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Error processing generic delivery status:', error);
        return c.json({
          success: false,
          error: 'Failed to process webhook'
        }, 500);
      }
    }
  )

  // Test webhook endpoint for development
  .post('/test', async (c) => {
    try {
      const body = await c.req.json();
      const headers = c.req.header();
      
      console.log('🧪 Test webhook received:', {
        body,
        headers: Object.fromEntries(
          Object.entries(headers).filter(([key]) => 
            key.startsWith('x-') || key.includes('signature')
          )
        )
      });
      
      return c.json({
        success: true,
        message: 'Test webhook received successfully',
        receivedAt: new Date().toISOString(),
        bodySize: JSON.stringify(body).length
      });
      
    } catch (error) {
      console.error('❌ Error in test webhook:', error);
      return c.json({
        success: false,
        error: 'Test webhook failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  })
  
  // Debug webhook signature helper endpoint
  .post('/debug-signature', async (c) => {
    try {
      const rawBody = await c.req.text();
      const signature = c.req.header('X-Termii-Signature');
      const secret = process.env.TERMII_WEBHOOK_SECRET || 'test-secret';
      
      // Try different signature computation methods
      const computations: Record<string, { hex: string; base64: string }> = {};
      
      // Method 1: Direct raw body
      computations.direct = {
        hex: createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex'),
        base64: createHmac('sha512', secret).update(rawBody, 'utf8').digest('base64')
      };
      
      // Method 2: Parsed and re-stringified (compact)
      try {
        const parsed = JSON.parse(rawBody);
        const compact = JSON.stringify(parsed);
        computations.compact = {
          hex: createHmac('sha512', secret).update(compact, 'utf8').digest('hex'),
          base64: createHmac('sha512', secret).update(compact, 'utf8').digest('base64')
        };
      } catch {}
      
      // Method 3: Parsed and re-stringified (pretty)
      try {
        const parsed = JSON.parse(rawBody);
        const pretty = JSON.stringify(parsed, null, 2);
        computations.pretty = {
          hex: createHmac('sha512', secret).update(pretty, 'utf8').digest('hex'),
          base64: createHmac('sha512', secret).update(pretty, 'utf8').digest('base64')
        };
      } catch {}
      
      // Method 4: Try with sorted keys (canonical JSON)
      try {
        const parsed = JSON.parse(rawBody);
        const sortedKeys = JSON.stringify(parsed, Object.keys(parsed).sort());
        computations.sorted = {
          hex: createHmac('sha512', secret).update(sortedKeys, 'utf8').digest('hex'),
          base64: createHmac('sha512', secret).update(sortedKeys, 'utf8').digest('base64')
        };
      } catch {}
      
      const matches: string[] = [];
      const signatureDetails: any[] = [];
      
      Object.entries(computations).forEach(([method, sigs]) => {
        const hexMatch = sigs.hex.toLowerCase() === signature?.toLowerCase();
        const base64Match = sigs.base64 === signature;
        
        signatureDetails.push({
          method,
          hexSignature: sigs.hex.substring(0, 32) + '...',
          base64Signature: sigs.base64.substring(0, 20) + '...',
          hexMatches: hexMatch,
          base64Matches: base64Match
        });
        
        if (hexMatch) matches.push(`${method} (hex)`);
        if (base64Match) matches.push(`${method} (base64)`);
      });
      
      const results = {
        receivedSignature: signature ? signature.substring(0, 32) + '...' : 'none',
        signatureLength: signature?.length || 0,
        bodyLength: rawBody.length,
        bodyFirst100: rawBody.substring(0, 100),
        computedSignatures: signatureDetails,
        matches
      };
      
      console.log('🔍 Signature debug results:', results);
      
      return c.json({
        success: true,
        debug: results,
        recommendation: matches.length > 0 
          ? `Signature matches using: ${matches.join(', ')}`
          : 'No matching signature found. Check webhook secret or contact Termii support.'
      });
      
    } catch (error) {
      console.error('❌ Error in debug signature:', error);
      return c.json({
        success: false,
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  })

  // Health check for webhook endpoints
  .get('/health', (c) => {
    return c.json({
      status: 'healthy',
      service: 'notification-webhooks',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /termii/delivery - Termii SMS delivery status',
        'POST /delivery-status - Generic delivery status',
        'POST /test - Test webhook endpoint'
      ]
    });
  });
