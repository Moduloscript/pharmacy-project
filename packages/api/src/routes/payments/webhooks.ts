import { Hono } from 'hono';
import { logger } from '@repo/logs';
import crypto from 'crypto';
import { updateOrderStatusWithValidation } from '@repo/payments/lib/validation-guards';
import { verifyOpaySignatureWithHmac, OpayCallbackBody } from '../../utils/opay-signature';

const app = new Hono();

// Startup config check for OPay
(function logOpayConfigStatus() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
  const missing: string[] = [];
  if (!process.env.OPAY_MERCHANT_ID) missing.push('OPAY_MERCHANT_ID');
  if (!process.env.OPAY_PUBLIC_KEY) missing.push('OPAY_PUBLIC_KEY');
  if (!process.env.OPAY_SECRET_KEY) missing.push('OPAY_SECRET_KEY');

  if (missing.length > 0) {
    logger.warn('OPay configuration is incomplete', { env, missing });
  } else {
    logger.info('OPay configuration detected', {
      env,
      merchantId: process.env.OPAY_MERCHANT_ID,
      returnUrlDomain: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'unset',
      webhookVerification: 'HMAC-SHA3-512 using OPAY_SECRET_KEY over formatted callback payload fields'
    });
  }
})();

// Webhook handler for Flutterwave
app.post('/webhook/flutterwave', async (c) => {
  try {
    const signature = c.req.header('verif-hash');
    const payload = await c.req.json();
    
    // Verify webhook signature
    const isValidSignature = verifyFlutterwaveSignature(payload, signature);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid Flutterwave webhook signature');
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    logger.info('Flutterwave webhook received', {
      event: payload.event,
      txRef: payload.data?.tx_ref,
      status: payload.data?.status
    });

    // Process webhook based on event type
    if (payload.event === 'charge.completed') {
      const result = await processFlutterwavePayment(payload.data);
      
      if (result.success) {
        logger.info('Flutterwave payment processed successfully', {
          txRef: payload.data.tx_ref,
          status: result.status
        });
        
        return c.json({ success: true, message: 'Webhook processed' });
      } else {
        logger.error('Failed to process Flutterwave payment', {
          txRef: payload.data.tx_ref,
          error: result.error
        });
        
        return c.json({ success: false, error: result.error }, 500);
      }
    }

    return c.json({ success: true, message: 'Event not processed' });

  } catch (error) {
    logger.error('Flutterwave webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});

// Webhook handler for Paystack
app.post('/webhook/paystack', async (c) => {
  try {
    const signature = c.req.header('x-paystack-signature');
    const body = await c.req.text();
    const payload = JSON.parse(body);
    
    // Verify webhook signature
    const isValidSignature = verifyPaystackSignature(body, signature);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid Paystack webhook signature');
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    logger.info('Paystack webhook received', {
      event: payload.event,
      reference: payload.data?.reference,
      status: payload.data?.status
    });

    // Process webhook based on event type
    if (payload.event === 'charge.success') {
      const result = await processPaystackPayment(payload.data);
      
      if (result.success) {
        logger.info('Paystack payment processed successfully', {
          reference: payload.data.reference,
          status: result.status
        });
        
        return c.json({ success: true, message: 'Webhook processed' });
      } else {
        logger.error('Failed to process Paystack payment', {
          reference: payload.data.reference,
          error: result.error
        });
        
        return c.json({ success: false, error: result.error }, 500);
      }
    }

    return c.json({ success: true, message: 'Event not processed' });

  } catch (error) {
    logger.error('Paystack webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});

// Webhook handler for OPay
app.post('/webhook/opay', async (c) => {
  try {
    // Log the source IP for security monitoring (OPay recommends IP whitelisting)
    const sourceIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    const body = await c.req.json() as OpayCallbackBody;

    // OPay callbacks include a body with shape { payload: {...}, sha512: "...", type: "transaction-status" }
    // Verify webhook signature using HMAC-SHA3-512 as per OPay documentation
    const isValidSignature = verifyOpaySignatureWithHmac(body, process.env.OPAY_SECRET_KEY || '');
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid OPay webhook signature (HMAC-SHA3-512 verification failed)', {
        sourceIp,
        reference: body?.payload?.reference
      });
      // Return 200 to prevent retry attacks, but don't process the payment
      return c.json({ success: false, error: 'Invalid signature' }, 200);
    }

    const callbackPayload = body?.payload || body; // support both documented and legacy shapes

    logger.info('OPay webhook received', {
      type: body?.type,
      reference: callbackPayload?.reference,
      status: callbackPayload?.status,
      sourceIp,
      transactionId: callbackPayload?.transactionId
    });

    // Additional verification: Cross-check with Payment Status API as recommended by OPay
    // This prevents replay attacks and ensures the callback is genuine
    if (process.env.NODE_ENV === 'production' && callbackPayload?.reference) {
      const verificationResult = await verifyOpayPayment(callbackPayload.reference);
      if (!verificationResult.success || verificationResult.status !== mapOpayStatus(callbackPayload.status)) {
        logger.warn('OPay callback cross-verification failed', {
          reference: callbackPayload.reference,
          callbackStatus: callbackPayload.status,
          verifiedStatus: verificationResult.status,
          sourceIp
        });
        // Return 200 OK but don't process to prevent retries
        return c.json({ success: false, error: 'Cross-verification failed' }, 200);
      }
    }

    // Normalize callback to internal structure expected by processor
    const normalized = normalizeOpayCallback(callbackPayload);

    // Process different payment statuses, not just SUCCESS
    if (normalized.status === 'SUCCESS' || normalized.status === 'FAIL' || normalized.status === 'CLOSE') {
      const result = await processOpayPayment(normalized);
      
      if (result.success) {
        logger.info('OPay payment processed successfully', {
          reference: normalized.reference,
          status: result.status,
          transactionId: callbackPayload?.transactionId
        });
        
        // Always return 200 OK for successful processing
        return c.json({ success: true, message: 'Webhook processed' }, 200);
      } else {
        logger.error('Failed to process OPay payment', {
          reference: normalized.reference,
          error: result.error
        });
        
        // Return 200 to acknowledge receipt even if processing failed
        // This prevents OPay from retrying for 72 hours
        return c.json({ success: false, error: result.error }, 200);
      }
    }

    // For other statuses (PENDING, etc.), acknowledge but don't process
    logger.info('OPay webhook acknowledged but not processed', {
      reference: normalized.reference,
      status: normalized.status
    });
    return c.json({ success: true, message: 'Event acknowledged' }, 200);

  } catch (error) {
    logger.error('OPay webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Still return 200 to prevent retries, but log the error
    return c.json({ success: false, error: 'Webhook processing failed' }, 200);
  }
});

// Payment verification endpoint
app.get('/verify/:reference', async (c) => {
  const reference = c.req.param('reference');
  
  if (!reference) {
    return c.json({ success: false, error: 'Payment reference is required' }, 400);
  }

  try {
    logger.info('Verifying payment', { reference });

    // Try to verify with each gateway in sequence
    let verificationResult = await verifyFlutterwavePayment(reference);
    if (!verificationResult.success) {
      verificationResult = await verifyPaystackPayment(reference);
    }
    if (!verificationResult.success) {
      verificationResult = await verifyOpayPayment(reference);
    }

    if (verificationResult?.success) {
      logger.info('Payment verification successful', {
        reference,
        status: verificationResult.status,
        gateway: verificationResult.gateway
      });

      return c.json({
        success: true,
        data: {
          reference,
          status: verificationResult.status,
          amount: verificationResult.amount,
          currency: verificationResult.currency,
          gateway: verificationResult.gateway,
          gatewayReference: verificationResult.gatewayReference,
          verifiedAt: new Date().toISOString()
        }
      });
    } else {
      logger.warn('Payment verification failed', {
        reference,
        error: verificationResult?.error || 'Payment not found'
      });

      return c.json({
        success: false,
        error: 'Payment verification failed'
      }, 404);
    }

  } catch (error) {
    logger.error('Payment verification error', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return c.json({
      success: false,
      error: 'Verification service unavailable'
    }, 500);
  }
});

// Helper functions for signature verification
function verifyFlutterwaveSignature(payload: any, signature?: string): boolean {
  if (!signature || !process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production'; // Skip verification in development
  }

  const hash = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}

function verifyPaystackSignature(body: string, signature?: string): boolean {
  // Paystack uses the same Secret Key for API calls and webhook signature verification
  // (there is no separate webhook secret like some other providers)
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!signature || !secretKey) {
    return process.env.NODE_ENV !== 'production'; // Skip verification in development
  }

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(body)
    .digest('hex');

  return hash === signature;
}

// Legacy verification function kept for backwards compatibility
// New webhooks should use HMAC-SHA3-512 verification from opay-signature.ts
function verifyOpaySignatureLegacy(callbackPayload: any, providedSha512?: string): boolean {
  // For production, require sha512 and secret key
  if (!process.env.OPAY_SECRET_KEY) {
    return process.env.NODE_ENV !== 'production';
  }

  // If callback provides sha512 in body, verify against it; otherwise allow in non-prod
  if (!providedSha512) {
    return process.env.NODE_ENV !== 'production';
  }

  const computed = crypto
    .createHmac('sha512', process.env.OPAY_SECRET_KEY)
    .update(JSON.stringify(callbackPayload || {}))
    .digest('hex');

  return computed === providedSha512;
}

// Payment processing functions
async function processFlutterwavePayment(data: any) {
  try {
    const paymentStatus = mapFlutterwaveStatus(data.status);

    // Try extract items from Flutterwave meta (we send JSON string of items)
    let itemsFromMeta: any[] | undefined;
    try {
      const meta = data.meta || data?.customer?.meta;
      if (meta?.items) {
        itemsFromMeta = Array.isArray(meta.items) ? meta.items : JSON.parse(meta.items);
      }
    } catch {}
    
    const paymentData = {
      gateway: 'FLUTTERWAVE',
      gatewayReference: data.flw_ref,
      amount: data.amount, // Flutterwave returns amount in the specified currency (naira), no division
      currency: data.currency,
      paymentMethod: data.payment_type,
      paidAt: new Date(data.created_at),
      customerEmail: data.customer?.email,
      items: itemsFromMeta,
    } as any;
    
    // Validate payment amounts before updating
    const validation = await updateOrderStatusWithValidation(data.tx_ref, paymentStatus, paymentData);
    
    if (!validation.success) {
      logger.error('Flutterwave payment validation failed', {
        txRef: data.tx_ref,
        error: validation.error
      });
      return {
        success: false,
        error: validation.error || 'Payment validation failed'
      };
    }
    
    // Update order status in database (after validation)
    await updateOrderStatus(data.tx_ref, paymentStatus, paymentData);

    return {
      success: true,
      status: paymentStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    };
  }
}

async function processPaystackPayment(data: any) {
  try {
    const paymentStatus = mapPaystackStatus(data.status);

    // Extract items from Paystack metadata (stringified JSON)
    let itemsFromMeta: any[] | undefined;
    try {
      const meta = data.metadata;
      if (meta?.items) {
        itemsFromMeta = Array.isArray(meta.items) ? meta.items : JSON.parse(meta.items);
      }
    } catch {}
    
    const paymentData = {
      gateway: 'PAYSTACK',
      gatewayReference: data.id,
      amount: data.amount / 100, // Convert from kobo to naira
      currency: data.currency,
      paymentMethod: data.channel,
      paidAt: new Date(data.paid_at),
      items: itemsFromMeta,
    } as any;
    
    // Validate payment amounts before updating
    const validation = await updateOrderStatusWithValidation(data.reference, paymentStatus, paymentData);
    
    if (!validation.success) {
      logger.error('Paystack payment validation failed', {
        reference: data.reference,
        error: validation.error
      });
      return {
        success: false,
        error: validation.error || 'Payment validation failed'
      };
    }
    
    // Update order status in database (after validation)
    await updateOrderStatus(data.reference, paymentStatus, paymentData);

    return {
      success: true,
      status: paymentStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    };
  }
}

async function processOpayPayment(data: any) {
  try {
    const paymentStatus = mapOpayStatus(data.status);

    // Extract items from callbackParam if present
    let itemsFromParam: any[] | undefined;
    try {
      if (data.callbackParam) {
        const parsed = typeof data.callbackParam === 'string' ? JSON.parse(data.callbackParam) : data.callbackParam;
        if (parsed?.items) itemsFromParam = parsed.items;
      }
    } catch {}
    
    const amountTotalKobo = (data.amount?.total ?? (typeof data.amount === 'string' ? parseInt(data.amount, 10) : 0)) as number;
    const currency = data.amount?.currency || data.currency || 'NGN';

    const paymentData = {
      gateway: 'OPAY',
      gatewayReference: data.orderNo || data.transactionId,
      amount: typeof amountTotalKobo === 'number' ? amountTotalKobo / 100 : 0, // Convert from kobo to naira when possible
      currency,
      paymentMethod: data.instrumentType || 'opay',
      paidAt: new Date(data.timestamp || Date.now()),
      items: itemsFromParam,
    } as any;
    
    // Validate payment amounts before updating
    const ref = data.reference || data.orderNo || data.token;
    const validation = await updateOrderStatusWithValidation(ref, paymentStatus, paymentData);
    
    if (!validation.success) {
      logger.error('OPay payment validation failed', {
        reference: ref,
        error: validation.error
      });
      return {
        success: false,
        error: validation.error || 'Payment validation failed'
      };
    }
    
    // Update order status in database (after validation)
    await updateOrderStatus(ref, paymentStatus, paymentData);

    return {
      success: true,
      status: paymentStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    };
  }
}

// Payment verification functions
async function verifyFlutterwavePayment(reference: string) {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (response.ok && result.status === 'success') {
      return {
        success: true,
        status: mapFlutterwaveStatus(result.data.status),
        amount: result.data.amount,
        currency: result.data.currency,
        gateway: 'FLUTTERWAVE',
        gatewayReference: result.data.flw_ref
      };
    }

    return { success: false, error: result.message || 'Verification failed' };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

async function verifyPaystackPayment(reference: string) {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (response.ok && result.status === true) {
      return {
        success: true,
        status: mapPaystackStatus(result.data.status),
        amount: result.data.amount / 100, // Convert from kobo
        currency: result.data.currency,
        gateway: 'PAYSTACK',
        gatewayReference: result.data.id
      };
    }

    return { success: false, error: result.message || 'Verification failed' };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

async function verifyOpayPayment(reference: string) {
  try {
    const apiBase = process.env.NODE_ENV === 'production'
      ? 'https://liveapi.opaycheckout.com'
      : 'https://testapi.opaycheckout.com';
    const apiUrl = `${apiBase}/api/v1/international/cashier/status`;

    const payload = {
      reference,
      country: 'NG',
    } as any;

    // OPay status API requires a signature over the JSON body using the SECRET key
    const secretKey = (process.env.OPAY_SECRET_KEY || '').trim();
    const merchantId = (process.env.OPAY_MERCHANT_ID || '').trim();
    const payloadString = JSON.stringify(payload);
    const signatureMode = (process.env.OPAY_STATUS_SIGNATURE_MODE || 'hmac').toLowerCase();
    const signature = signatureMode === 'concat'
      ? crypto.createHash('sha512').update(payloadString + secretKey).digest('hex')
      : crypto.createHmac('sha512', secretKey).update(payloadString).digest('hex');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
'MerchantId': merchantId,
        'Authorization': `Bearer ${signature}`,
        'Signature': signature,
      },
      body: payloadString,
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.code === '00000') {
      const data = result.data || {};
      const amountKobo = data?.amount?.total ?? 0;
      const currency = data?.amount?.currency || 'NGN';
      const status = data?.status || 'PENDING';

      return {
        success: true,
        status: mapOpayStatus(status),
        amount: typeof amountKobo === 'number' ? amountKobo / 100 : 0,
        currency,
        gateway: 'OPAY',
        gatewayReference: data?.orderNo || reference,
      };
    }

    // Handle specific OPay error codes per docs
    if (result && result.code === '02000') {
      return { success: false, error: 'Authentication failed' };
    } else if (result && result.code === '02001') {
      return { success: false, error: 'Request params not valid' };
    } else if (result && result.code === '02002') {
      return { success: false, error: 'Merchant not configured with this function' };
    } else if (result && result.code === '02006') {
      return { success: false, error: 'Transaction not found' };
    }

    return { success: false, error: (result && result.message) || 'Verification failed' };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Status mapping functions
function mapFlutterwaveStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' {
  switch (status) {
    case 'successful': return 'SUCCESS';
    case 'failed': return 'FAILED';
    case 'pending': return 'PENDING';
    default: return 'ABANDONED';
  }
}

function mapPaystackStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' {
  switch (status) {
    case 'success': return 'SUCCESS';
    case 'failed': return 'FAILED';
    case 'pending': return 'PENDING';
    default: return 'ABANDONED';
  }
}

function mapOpayStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' {
  switch ((status || '').toUpperCase()) {
    case 'SUCCESS': return 'SUCCESS';
    case 'SUCCESSFUL': return 'SUCCESS';
    case 'FAIL': return 'FAILED';
    case 'FAILED': return 'FAILED';
    case 'PENDING': return 'PENDING';
    case 'INITIAL': return 'PENDING';
    default: return 'ABANDONED';
  }
}

// Database update function with proper implementation
async function updateOrderStatus(reference: string, status: string, paymentData: any) {
  try {
    // Import db connection
    const { db } = await import('@repo/database');

    // Helper to normalize amounts that might be in kobo
    const normalizeToNaira = (value: number) => {
      if (typeof value !== 'number') return 0;
      return value > 100000 ? Math.round(value) / 100 : value;
    };
    
    // Check if order exists and isn't already paid (idempotency)
    const existingOrder = await db.order.findFirst({
      where: {
        OR: [
          { paymentReference: reference },
          { orderNumber: reference }
        ]
      }
    });

    if (!existingOrder) {
      logger.warn('Order not found for payment reference', { reference });

      // Fallback (Option B): persist payment even when Order is missing, if we can resolve a customer
      const dbStatus = mapStatusToDbEnum(status);
      const user = paymentData.customerEmail
        ? await db.user.findUnique({ where: { email: paymentData.customerEmail } })
        : null;
      const customer = user
        ? await db.customer.findUnique({ where: { userId: user.id } })
        : null;

      if (!customer) {
        logger.warn('Could not resolve customer for orphan payment; skipping persist', {
          reference,
          customerEmail: paymentData.customerEmail,
        });
        return { success: false, error: 'Order not found and customer unresolved' };
      }

      // Create or update payment record (transactionId is not unique, so do manual upsert)
      const orphanExisting = await db.payment.findFirst({
        where: { transactionId: reference }
      });

      if (orphanExisting) {
        await db.payment.update({
          where: { id: orphanExisting.id },
          data: {
            status: dbStatus,
            gatewayReference: paymentData.gatewayReference,
            gatewayResponse: JSON.stringify(paymentData),
            updatedAt: new Date(),
            completedAt: dbStatus === 'COMPLETED' ? new Date() : orphanExisting.completedAt,
          },
        });
      } else {
        await db.payment.create({
          data: {
            customerId: customer.id,
            orderId: null,
            amount: paymentData.amount,
            currency: paymentData.currency || 'NGN',
            method: paymentData.gateway as any,
            status: dbStatus,
            gatewayReference: paymentData.gatewayReference,
            transactionId: reference,
            gatewayResponse: JSON.stringify(paymentData),
            gatewayFee: paymentData.gatewayFee || 0,
            appFee: paymentData.appFee || 0,
            completedAt: dbStatus === 'COMPLETED' ? new Date() : null,
          },
        });
      }

      logger.info('Persisted payment without order (fallback path)', {
        reference,
        customerId: customer.id,
        gateway: paymentData.gateway,
        status: dbStatus,
      });

      return { success: true };
    }

    if (existingOrder.paymentStatus === 'COMPLETED' && status === 'SUCCESS') {
      logger.info('Order already marked as paid, skipping update', { 
        reference, 
        orderId: existingOrder.id 
      });
      return { success: true, alreadyProcessed: true };
    }

    // Map payment statuses to database enum
    const dbStatus = mapStatusToDbEnum(status);
    
    // Update order with payment information
    const updatedOrder = await db.order.update({
      where: { id: existingOrder.id },
      data: { 
        paymentStatus: dbStatus,
        paymentMethod: paymentData.gateway as any,
        paymentReference: reference,
        updatedAt: new Date(),
      },
    });

    // Backfill order items if missing and we have metadata with productIds
    try {
      const currentItems = await db.orderItem.count({ where: { orderId: existingOrder.id } });
      const metaItems: any[] | undefined = paymentData?.items;
      if (currentItems === 0 && Array.isArray(metaItems) && metaItems.length > 0) {
        const rows = metaItems
          .filter((it: any) => !!it.productId)
          .map((it: any) => ({
            orderId: existingOrder.id,
            productId: String(it.productId),
            quantity: Number(it.quantity || 1),
            unitPrice: normalizeToNaira(Number(it.unitPrice || 0)),
            subtotal: normalizeToNaira(Number(it.unitPrice || 0)) * Number(it.quantity || 1),
            productName: String(it.name || 'Unknown Product'),
            productSKU: String(it.sku || 'N/A'),
          }));
        if (rows.length > 0) {
          await db.orderItem.createMany({ data: rows });
        }
      }
    } catch (e) {
      logger.warn('Order items backfill skipped or failed', { reference, error: (e as Error)?.message });
    }

    // Create or update payment record (transactionId is not unique, so do manual upsert)
    const existingPayment = await db.payment.findFirst({
      where: { transactionId: reference }
    });

    if (existingPayment) {
      await db.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: dbStatus,
          gatewayReference: paymentData.gatewayReference,
          gatewayResponse: JSON.stringify(paymentData),
          updatedAt: new Date(),
          completedAt: dbStatus === 'COMPLETED' ? new Date() : existingPayment.completedAt,
        }
      });
    } else {
      await db.payment.create({
        data: {
          customerId: existingOrder.customerId,
          orderId: existingOrder.id,
          amount: paymentData.amount,
          currency: paymentData.currency || 'NGN',
          method: paymentData.gateway as any,
          status: dbStatus,
          gatewayReference: paymentData.gatewayReference,
          transactionId: reference,
          gatewayResponse: JSON.stringify(paymentData),
          gatewayFee: paymentData.gatewayFee || 0,
          appFee: paymentData.appFee || 0,
          completedAt: dbStatus === 'COMPLETED' ? new Date() : null,
        }
      });
    }

    // Create order tracking entry for successful payments
    if (status === 'SUCCESS') {
      await db.orderTracking.create({
        data: {
          orderId: existingOrder.id,
          status: 'PROCESSING',
          notes: `Payment completed via ${paymentData.gateway} - ${reference}`,
        }
      });

      // Deduct stock and create inventory OUT movements per order item (idempotent)
      try {
        const { inventoryService } = await import('../../services/inventory');
        await inventoryService.createOutMovementsForOrder(existingOrder.id);
      } catch (e) {
        logger.error('Failed to create inventory movements for order after payment', {
          reference,
          orderId: existingOrder.id,
          error: (e as Error)?.message,
        });
        // Do not fail webhook processing if inventory movement fails; ops can reconcile
      }
    }

    // On refund or cancellation, roll back inventory movements (idempotent)
    if (dbStatus === 'REFUNDED' || dbStatus === 'CANCELLED') {
      try {
        const { inventoryService } = await import('../../services/inventory');
        await inventoryService.rollbackOutMovementsForOrder(
          existingOrder.id,
          dbStatus === 'REFUNDED' ? 'REFUND' : 'CANCELLED'
        );
      } catch (e) {
        logger.error('Failed to roll back inventory movements after refund/cancellation', {
          reference,
          orderId: existingOrder.id,
          newStatus: dbStatus,
          error: (e as Error)?.message,
        });
        // Do not fail webhook processing on rollback errors
      }
    }

    logger.info('Order status updated successfully', {
      reference,
      orderId: existingOrder.id,
      status: dbStatus,
      gateway: paymentData.gateway,
      amount: paymentData.amount
    });

    return { success: true, orderId: existingOrder.id, status: dbStatus };
    
  } catch (error) {
    logger.error('Failed to update order status', {
      reference,
      status,
      gateway: paymentData.gateway,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

// Helper function to map payment status to database enum
function mapStatusToDbEnum(status: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (status) {
    case 'SUCCESS': return 'COMPLETED';
    case 'FAILED': return 'FAILED';
    case 'PENDING': return 'PENDING';
    case 'ABANDONED': return 'CANCELLED';
    case 'REFUNDED': return 'REFUNDED';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'PENDING';
  }
}

// Health check endpoint for payment gateways
app.get('/health', async (c) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    gateways: {
      flutterwave: { configured: false, tested: false, working: false, error: null as string | null },
      opay: { configured: false, tested: false, working: false, error: null as string | null },
      paystack: { configured: false, tested: false, working: false, error: null as string | null },
    }
  };

  // Check Flutterwave
  if (process.env.FLUTTERWAVE_SECRET_KEY) {
    results.gateways.flutterwave.configured = true;
    try {
      const testRef = `HEALTH_CHECK_${Date.now()}`;
      const flwResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${testRef}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      results.gateways.flutterwave.tested = true;
      const flwResult = await flwResponse.json().catch(() => ({}));
      
      // 404 or "No transaction was found" means auth worked but transaction doesn't exist
      if (flwResponse.status === 404 || 
          flwResponse.status === 200 || 
          (flwResult.message && flwResult.message.includes('No transaction was found'))) {
        results.gateways.flutterwave.working = true;
      } else {
        results.gateways.flutterwave.error = flwResult.message || `HTTP ${flwResponse.status}`;
      }
    } catch (e) {
      results.gateways.flutterwave.error = e instanceof Error ? e.message : 'Network error';
    }
  }

  // Check OPay
  if (process.env.OPAY_PUBLIC_KEY && process.env.OPAY_SECRET_KEY && process.env.OPAY_MERCHANT_ID) {
    results.gateways.opay.configured = true;
    try {
      // Skip side-effectful create call in production
      if (process.env.NODE_ENV !== 'production') {
        const apiBase = 'https://testapi.opaycheckout.com';
        const apiUrl = `${apiBase}/api/v1/international/cashier/create`;
        
        const testPayload = {
          country: 'NG',
          reference: `HEALTH_${Date.now()}`,
          amount: { total: 100, currency: 'NGN' },
          returnUrl: 'http://localhost:3000/health',
          notifyUrl: 'http://localhost:3000/health',
          cancelUrl: 'http://localhost:3000/health',
          userInfo: { userEmail: 'health@check.com', userMobile: '08000000000', userName: 'Health Check' },
          product: { name: 'Health Check', description: 'API Health Check' },
          payMethod: 'BankCard'
        };

        const opayResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'MerchantId': process.env.OPAY_MERCHANT_ID,
            'Authorization': `Bearer ${process.env.OPAY_PUBLIC_KEY}`,
          },
          body: JSON.stringify(testPayload),
        });
        
        results.gateways.opay.tested = true;
        const opayResult = await opayResponse.json().catch(() => ({}));
        
        if (opayResult.code === '00000') {
          results.gateways.opay.working = true;
        } else {
          results.gateways.opay.error = opayResult.message || opayResult.code || 'Authentication failed';
        }
      } else {
        results.gateways.opay.tested = false;
        results.gateways.opay.error = 'Skipped active test in production';
      }
    } catch (e) {
      results.gateways.opay.error = e instanceof Error ? e.message : 'Network error';
    }
  }

  // Check Paystack
  if (process.env.PAYSTACK_SECRET_KEY) {
    results.gateways.paystack.configured = true;
    try {
      const testRef = `HEALTH_CHECK_${Date.now()}`;
      const psResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${testRef}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      results.gateways.paystack.tested = true;
      // 404 or 400 means auth worked but transaction doesn't exist
      if (psResponse.status === 404 || psResponse.status === 400) {
        results.gateways.paystack.working = true;
      } else if (psResponse.status === 200) {
        results.gateways.paystack.working = true;
      } else {
        const error = await psResponse.json().catch(() => ({}));
        results.gateways.paystack.error = error.message || `HTTP ${psResponse.status}`;
      }
    } catch (e) {
      results.gateways.paystack.error = e instanceof Error ? e.message : 'Network error';
    }
  }

  // Log results
  logger.info('Payment gateway health check completed', results);

  return c.json(results);
});

// Normalize OPay callback payload into a consistent structure
function normalizeOpayCallback(callbackPayload: any) {
  const amountStr = callbackPayload?.amount;
  const amountObj = callbackPayload?.amount && typeof callbackPayload.amount === 'object' ? callbackPayload.amount : undefined;
  const total = amountObj?.total ?? (typeof amountStr === 'string' ? parseInt(amountStr, 10) : undefined);
  const currency = amountObj?.currency || callbackPayload?.currency || 'NGN';

  return {
    reference: callbackPayload?.reference,
    orderNo: callbackPayload?.orderNo || callbackPayload?.transactionId,
    status: callbackPayload?.status,
    amount: { total: typeof total === 'number' ? total : 0, currency },
    currency,
    instrumentType: callbackPayload?.instrumentType,
    timestamp: callbackPayload?.timestamp,
    callbackParam: callbackPayload?.callbackParam,
  };
}

export { app as webhooksRouter };
