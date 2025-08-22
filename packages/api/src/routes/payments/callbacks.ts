import { Hono } from 'hono';
import { logger } from '@repo/logs';

const app = new Hono();

// General payment callback endpoint
app.get('/callback', async (c) => {
  try {
    const query = c.req.query();
    const reference = query.tx_ref || query.reference || query.trxref;
    const status = query.status;
    const gateway = detectGatewayFromQuery(query);

    logger.info('Payment callback received', {
      gateway,
      reference,
      status,
      queryParams: Object.keys(query)
    });

    if (!reference) {
      logger.warn('Payment callback missing reference');
      return c.redirect(`${getAppUrl()}/checkout/error?message=Invalid payment reference`);
    }

    // Verify the payment with the appropriate gateway
    const verificationResult = await verifyPaymentByGateway(reference, gateway, query);

    if (verificationResult.success && verificationResult.status === 'SUCCESS') {
      logger.info('Payment callback verification successful', {
        reference,
        gateway: verificationResult.gateway,
        amount: verificationResult.amount
      });

      // Redirect to success page with payment details
      const successUrl = new URL(`${getAppUrl()}/checkout/success`);
      successUrl.searchParams.set('reference', reference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', verificationResult.gateway);
      
      return c.redirect(successUrl.toString());

    } else if (verificationResult.success && verificationResult.status === 'PENDING') {
      logger.info('Payment callback pending verification', {
        reference,
        gateway: verificationResult.gateway
      });

      // Redirect to pending page
      const pendingUrl = new URL(`${getAppUrl()}/checkout/pending`);
      pendingUrl.searchParams.set('reference', reference);
      pendingUrl.searchParams.set('gateway', verificationResult.gateway);
      
      return c.redirect(pendingUrl.toString());

    } else {
      logger.warn('Payment callback verification failed', {
        reference,
        gateway,
        error: verificationResult.error
      });

      // Redirect to error page
      const errorUrl = new URL(`${getAppUrl()}/checkout/error`);
      errorUrl.searchParams.set('reference', reference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment verification failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Payment callback processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: c.req.query()
    });

    return c.redirect(`${getAppUrl()}/checkout/error?message=Payment processing error`);
  }
});

// Flutterwave specific callback
app.get('/callback/flutterwave', async (c) => {
  try {
    const query = c.req.query();
    const reference = query.tx_ref;
    const status = query.status;

    logger.info('Flutterwave callback received', { reference, status });

    if (!reference) {
      return c.redirect(`${getAppUrl()}/checkout/error?message=Invalid Flutterwave reference`);
    }

    // Verify with Flutterwave API
    const verificationResult = await verifyFlutterwavePayment(reference);

    if (verificationResult.success) {
      const successUrl = new URL(`${getAppUrl()}/checkout/success`);
      successUrl.searchParams.set('reference', reference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', 'FLUTTERWAVE');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/checkout/error`);
      errorUrl.searchParams.set('reference', reference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Flutterwave callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/checkout/error?message=Flutterwave callback error`);
  }
});

// Paystack specific callback
app.get('/callback/paystack', async (c) => {
  try {
    const query = c.req.query();
    const reference = query.reference;
    const trxref = query.trxref;

    logger.info('Paystack callback received', { reference, trxref });

    const paymentReference = reference || trxref;
    if (!paymentReference) {
      return c.redirect(`${getAppUrl()}/checkout/error?message=Invalid Paystack reference`);
    }

    // Verify with Paystack API
    const verificationResult = await verifyPaystackPayment(paymentReference);

    if (verificationResult.success) {
      const successUrl = new URL(`${getAppUrl()}/checkout/success`);
      successUrl.searchParams.set('reference', paymentReference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', 'PAYSTACK');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/checkout/error`);
      errorUrl.searchParams.set('reference', paymentReference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Paystack callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/checkout/error?message=Paystack callback error`);
  }
});

// OPay specific callback
app.get('/callback/opay', async (c) => {
  try {
    const query = c.req.query();
    const reference = query.reference;
    const orderNo = query.orderNo;
    const status = query.status;

    logger.info('OPay callback received', { reference, orderNo, status });

    const paymentReference = reference || orderNo;
    if (!paymentReference) {
      return c.redirect(`${getAppUrl()}/checkout/error?message=Invalid OPay reference`);
    }

    // For OPay, we might need to implement their verification API
    // For now, we'll trust the callback status with basic validation
    if (status === 'SUCCESS') {
      const successUrl = new URL(`${getAppUrl()}/checkout/success`);
      successUrl.searchParams.set('reference', paymentReference);
      successUrl.searchParams.set('status', 'SUCCESS');
      successUrl.searchParams.set('gateway', 'OPAY');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/checkout/error`);
      errorUrl.searchParams.set('reference', paymentReference);
      errorUrl.searchParams.set('message', 'Payment was not successful');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('OPay callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/checkout/error?message=OPay callback error`);
  }
});

// Payment cancellation callback
app.get('/cancel', async (c) => {
  const query = c.req.query();
  const reference = query.reference || query.tx_ref;

  logger.info('Payment cancelled', { reference });

  const cancelUrl = new URL(`${getAppUrl()}/checkout/cancelled`);
  if (reference) {
    cancelUrl.searchParams.set('reference', reference);
  }
  
  return c.redirect(cancelUrl.toString());
});

// Helper functions
function detectGatewayFromQuery(query: Record<string, string>): string {
  // Detect gateway based on query parameters
  if (query.tx_ref && query.status) {
    return 'FLUTTERWAVE';
  }
  if (query.reference && query.trxref) {
    return 'PAYSTACK';
  }
  if (query.orderNo) {
    return 'OPAY';
  }
  return 'UNKNOWN';
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

async function verifyPaymentByGateway(reference: string, gateway: string, query: any) {
  switch (gateway) {
    case 'FLUTTERWAVE':
      return await verifyFlutterwavePayment(reference);
    case 'PAYSTACK':
      return await verifyPaystackPayment(reference);
    case 'OPAY':
      // For OPay, we might trust the callback for now
      return {
        success: true,
        status: query.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        amount: parseFloat(query.amount) || 0,
        currency: 'NGN',
        gateway: 'OPAY',
        gatewayReference: query.orderNo
      };
    default:
      return { success: false, error: 'Unknown gateway' };
  }
}

// Payment verification functions (reused from webhooks.ts)
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

export { app as callbacksRouter };
