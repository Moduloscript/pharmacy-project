import { webhookHandler as stripeWebhookHandler } from '../../provider/stripe';
import { getPaymentOrchestrator } from './payment-orchestrator';
import { db } from '@repo/database';
import { logger } from '@repo/logs';
import type { WebhookHandler } from '../../types';

/**
 * Enhanced webhook handler that can process both traditional and Nigerian payment webhooks
 */
export const createEnhancedWebhookHandler: () => WebhookHandler = () => async (req: Request) => {
  try {
    // Determine webhook source based on headers or payload
    const webhookSource = await determineWebhookSource(req);
    
    if (webhookSource === 'nigerian') {
      return await handleNigerianWebhook(req);
    }
    
    // Default to traditional webhook handling (Stripe)
    return await stripeWebhookHandler(req);
  } catch (error) {
    logger.error('Enhanced webhook handler error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
};

/**
 * Determine the source of the webhook
 */
async function determineWebhookSource(req: Request): Promise<'nigerian' | 'traditional'> {
  const userAgent = req.headers.get('user-agent') || '';
  const contentType = req.headers.get('content-type') || '';
  
  // Check for Flutterwave webhook signature
  if (req.headers.get('verif-hash')) {
    return 'nigerian';
  }
  
  // Check for other Nigerian payment gateway indicators
  if (userAgent.includes('Flutterwave') || userAgent.includes('Paystack') || userAgent.includes('OPay')) {
    return 'nigerian';
  }
  
  // Check environment variable
  if (process.env.NIGERIAN_PAYMENTS_ENABLED === 'true') {
    // Try to parse body to detect Nigerian webhook format
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.text();
      const payload = JSON.parse(body);
      
      // Check for Nigerian webhook payload patterns
      if (payload.event && (payload.event.includes('charge') || payload.event.includes('transfer'))) {
        return 'nigerian';
      }
    } catch (error) {
      // If parsing fails, continue with traditional handling
    }
  }
  
  return 'traditional';
}

/**
 * Handle Nigerian payment webhooks
 */
async function handleNigerianWebhook(req: Request): Promise<Response> {
  try {
    const orchestrator = getPaymentOrchestrator();
    const body = await req.text();
    const signature = req.headers.get('verif-hash') || req.headers.get('x-paystack-signature') || '';
    
    // Parse the webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      return new Response('Invalid JSON payload', { status: 400 });
    }
    
    // Handle different Nigerian payment gateway webhooks
    const webhookResponse = await handleNigerianGatewayWebhook(payload, signature, body);
    
    if (!webhookResponse.success) {
      logger.error('Nigerian webhook processing failed:', webhookResponse.error);
      return new Response('Webhook processing failed', { status: 400 });
    }
    
    // Update database with payment information
    if (webhookResponse.processed && webhookResponse.orderId) {
      await updatePaymentRecord(webhookResponse.orderId, webhookResponse.paymentStatus || 'PENDING', payload);
    }
    
    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    logger.error('Nigerian webhook handler error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Handle specific Nigerian gateway webhooks
 */
async function handleNigerianGatewayWebhook(payload: any, signature: string, rawBody: string): Promise<{
  success: boolean;
  processed: boolean;
  orderId?: string;
  paymentStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}> {
  const orchestrator = getPaymentOrchestrator();
  
  // Try to handle with each provider
  const providers = orchestrator.getProviders();
  
  for (const provider of providers) {
    try {
      const result = await provider.handleWebhook(payload, signature);
      
      if (result.success && result.processed) {
        return result;
      }
    } catch (error) {
      logger.warn(`Provider ${provider.getGatewayName()} failed to process webhook:`, error);
      continue;
    }
  }
  
  return {
    success: false,
    processed: false,
    error: 'No provider could process this webhook'
  };
}

/**
 * Update payment record in database
 */
async function updatePaymentRecord(orderId: string, status: string, payload: any): Promise<void> {
  try {
    // Extract relevant information from payload
    const gatewayReference = payload.data?.id || payload.id || payload.reference;
    const amount = payload.data?.amount || payload.amount;
    const currency = payload.data?.currency || payload.currency || 'NGN';
    
    // Check if this is a new payment or update to existing
    const existingPurchase = await db.purchase.findFirst({
      where: {
        OR: [
          { id: orderId },
          { productId: orderId }, // In case orderId maps to productId
        ]
      }
    });
    
    if (existingPurchase) {
      // Update existing purchase
      await db.purchase.update({
        where: { id: existingPurchase.id },
        data: {
          status: mapNigerianStatusToDbStatus(status),
          // Add any additional fields as needed
        }
      });
    } else {
      // Create new purchase record for Nigerian payment
      // Note: This requires mapping Nigerian order data to your database schema
      await db.purchase.create({
        data: {
          id: orderId,
          productId: orderId, // Simplified mapping
          type: 'ONE_TIME', // Default type, could be enhanced
          status: mapNigerianStatusToDbStatus(status),
          customerId: `nigerian_${gatewayReference}`,
          // Add other required fields based on your schema
        }
      });
    }
    
    logger.info(`Updated payment record for order ${orderId} with status ${status}`);
  } catch (error) {
    logger.error('Failed to update payment record:', error);
    throw error;
  }
}

/**
 * Map Nigerian payment status to database status
 */
function mapNigerianStatusToDbStatus(nigerianStatus: string): string {
  switch (nigerianStatus.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'paid':
      return 'active';
    case 'failed':
    case 'cancelled':
      return 'cancelled';
    case 'pending':
    case 'processing':
      return 'pending';
    default:
      return 'pending';
  }
}
