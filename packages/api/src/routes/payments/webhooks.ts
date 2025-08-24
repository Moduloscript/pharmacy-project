import { Hono } from 'hono';
import { logger } from '@repo/logs';
import crypto from 'crypto';
import { updateOrderStatusWithValidation } from '@repo/payments/lib/validation-guards';

const app = new Hono();

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
    const signature = c.req.header('x-opay-signature');
    const payload = await c.req.json();
    
    // Verify webhook signature
    const isValidSignature = verifyOpaySignature(payload, signature);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid OPay webhook signature');
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    logger.info('OPay webhook received', {
      event: payload.event,
      reference: payload.reference,
      status: payload.status
    });

    // Process webhook based on event type
    if (payload.status === 'SUCCESS') {
      const result = await processOpayPayment(payload);
      
      if (result.success) {
        logger.info('OPay payment processed successfully', {
          reference: payload.reference,
          status: result.status
        });
        
        return c.json({ success: true, message: 'Webhook processed' });
      } else {
        logger.error('Failed to process OPay payment', {
          reference: payload.reference,
          error: result.error
        });
        
        return c.json({ success: false, error: result.error }, 500);
      }
    }

    return c.json({ success: true, message: 'Event not processed' });

  } catch (error) {
    logger.error('OPay webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
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

    // Try to verify with each gateway
    let verificationResult = null;
    
    // Try Flutterwave first (if reference starts with BP_)
    if (reference.startsWith('BP_')) {
      verificationResult = await verifyFlutterwavePayment(reference);
      
      if (!verificationResult.success) {
        // Try Paystack
        verificationResult = await verifyPaystackPayment(reference);
        
        if (!verificationResult.success) {
          // Try OPay
          verificationResult = await verifyOpayPayment(reference);
        }
      }
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
  if (!signature || !process.env.PAYSTACK_WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production'; // Skip verification in development
  }

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
}

function verifyOpaySignature(payload: any, signature?: string): boolean {
  if (!signature || !process.env.OPAY_WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production'; // Skip verification in development
  }

  const hash = crypto
    .createHmac('sha256', process.env.OPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
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
    
    const paymentData = {
      gateway: 'OPAY',
      gatewayReference: data.orderNo,
      amount: data.amount.total / 100, // Convert from kobo to naira
      currency: data.amount.currency,
      paymentMethod: 'opay',
      paidAt: new Date(),
      items: itemsFromParam,
    } as any;
    
    // Validate payment amounts before updating
    const validation = await updateOrderStatusWithValidation(data.reference, paymentStatus, paymentData);
    
    if (!validation.success) {
      logger.error('OPay payment validation failed', {
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
  // OPay verification would require their specific API endpoint
  // This is a placeholder implementation
  try {
    // TODO: Implement actual OPay verification API call
    return { success: false, error: 'OPay verification not implemented' };
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
  switch (status) {
    case 'SUCCESS': return 'SUCCESS';
    case 'FAIL': return 'FAILED';
    case 'PENDING': return 'PENDING';
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
    default: return 'PENDING';
  }
}

export { app as webhooksRouter };
