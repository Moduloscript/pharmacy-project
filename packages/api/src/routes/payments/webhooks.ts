import { Hono } from 'hono';
import { logger } from '@repo/logs';
import crypto from 'crypto';

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
    
    // TODO: Update order status in database
    await updateOrderStatus(data.tx_ref, paymentStatus, {
      gateway: 'FLUTTERWAVE',
      gatewayReference: data.flw_ref,
      amount: data.amount / 100, // Convert from kobo to naira
      currency: data.currency,
      paymentMethod: data.payment_type,
      paidAt: new Date(data.created_at)
    });

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
    
    // TODO: Update order status in database
    await updateOrderStatus(data.reference, paymentStatus, {
      gateway: 'PAYSTACK',
      gatewayReference: data.id,
      amount: data.amount / 100, // Convert from kobo to naira
      currency: data.currency,
      paymentMethod: data.channel,
      paidAt: new Date(data.paid_at)
    });

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
    
    // TODO: Update order status in database
    await updateOrderStatus(data.reference, paymentStatus, {
      gateway: 'OPAY',
      gatewayReference: data.orderNo,
      amount: data.amount.total / 100, // Convert from kobo to naira
      currency: data.amount.currency,
      paymentMethod: 'opay',
      paidAt: new Date()
    });

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

// Database update function (implement based on your database)
async function updateOrderStatus(reference: string, status: string, paymentData: any) {
  // TODO: Implement database update logic
  // Example using Prisma:
  /*
  await db.order.update({
    where: { paymentReference: reference },
    data: { 
      paymentStatus: status,
      paymentGateway: paymentData.gateway,
      gatewayReference: paymentData.gatewayReference,
      paidAmount: paymentData.amount,
      paidAt: status === 'SUCCESS' ? paymentData.paidAt : null,
      updatedAt: new Date(),
    },
  });
  */

  logger.info('Order status updated', {
    reference,
    status,
    gateway: paymentData.gateway,
    amount: paymentData.amount
  });
}

export { app as webhooksRouter };
