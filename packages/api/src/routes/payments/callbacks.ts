import { Hono } from 'hono';
import { logger } from '@repo/logs';
import { db } from '@repo/database';
import crypto from 'crypto';

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
      return c.redirect(`${getAppUrl()}/app/checkout/error?message=Invalid payment reference`);
    }

    // Verify the payment with the appropriate gateway
    const verificationResult = await verifyPaymentByGateway(reference, gateway, query);

    if (verificationResult.success && verificationResult.status === 'SUCCESS') {
      logger.info('Payment callback verification successful', {
        reference,
        gateway: verificationResult.gateway,
        amount: verificationResult.amount
      });

      // Persist payment data to database
      const persistResult = await persistPaymentData(verificationResult, reference, gateway, query);
      
      if (!persistResult.success) {
        logger.error('Payment persistence failed but payment verified', {
          reference,
          gateway,
          error: persistResult.error
        });
        // Continue to success page even if persistence fails
      }

      // Redirect to success page with payment details
      const successUrl = new URL(`${getAppUrl()}/app/checkout/success`);
      successUrl.searchParams.set('reference', reference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', verificationResult.gateway);
      if (persistResult.success && persistResult.orderNumber) {
        successUrl.searchParams.set('orderNumber', persistResult.orderNumber);
      }
      
      return c.redirect(successUrl.toString());

    } else if (verificationResult.success && verificationResult.status === 'PENDING') {
      logger.info('Payment callback pending verification', {
        reference,
        gateway: verificationResult.gateway
      });

      // Redirect to pending page
      const pendingUrl = new URL(`${getAppUrl()}/app/checkout/pending`);
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
      const errorUrl = new URL(`${getAppUrl()}/app/checkout/error`);
      errorUrl.searchParams.set('reference', reference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment verification failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Payment callback processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: c.req.query()
    });

    return c.redirect(`${getAppUrl()}/app/checkout/error?message=Payment processing error`);
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
      return c.redirect(`${getAppUrl()}/app/checkout/error?message=Invalid Flutterwave reference`);
    }

    // Verify with Flutterwave API
    const verificationResult = await verifyFlutterwavePayment(reference);

    if (verificationResult.success) {
      // Persist payment data if verification successful
      if (verificationResult.status === 'SUCCESS') {
        const persistResult = await persistPaymentData(verificationResult, reference, 'FLUTTERWAVE', query);
        
        if (!persistResult.success) {
          logger.error('Payment persistence failed for Flutterwave but payment verified', {
            reference,
            error: persistResult.error
          });
        }
      }

      const successUrl = new URL(`${getAppUrl()}/app/checkout/success`);
      successUrl.searchParams.set('reference', reference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', 'FLUTTERWAVE');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/app/checkout/error`);
      errorUrl.searchParams.set('reference', reference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Flutterwave callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/app/checkout/error?message=Flutterwave callback error`);
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
      return c.redirect(`${getAppUrl()}/app/checkout/error?message=Invalid Paystack reference`);
    }

    // Verify with Paystack API
    const verificationResult = await verifyPaystackPayment(paymentReference);

    if (verificationResult.success) {
      // Persist payment data if verification successful
      if (verificationResult.status === 'SUCCESS') {
        const persistResult = await persistPaymentData(verificationResult, paymentReference, 'PAYSTACK', query);
        
        if (!persistResult.success) {
          logger.error('Payment persistence failed for Paystack but payment verified', {
            reference: paymentReference,
            error: persistResult.error
          });
        }
      }

      const successUrl = new URL(`${getAppUrl()}/app/checkout/success`);
      successUrl.searchParams.set('reference', paymentReference);
      successUrl.searchParams.set('status', verificationResult.status);
      successUrl.searchParams.set('amount', verificationResult.amount.toString());
      successUrl.searchParams.set('gateway', 'PAYSTACK');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/app/checkout/error`);
      errorUrl.searchParams.set('reference', paymentReference);
      errorUrl.searchParams.set('message', verificationResult.error || 'Payment failed');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('Paystack callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/app/checkout/error?message=Paystack callback error`);
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
      return c.redirect(`${getAppUrl()}/app/checkout/error?message=Invalid OPay reference`);
    }

    // For OPay, we might need to implement their verification API
    // For now, we'll trust the callback status with basic validation
    if (status === 'SUCCESS') {
      const successUrl = new URL(`${getAppUrl()}/app/checkout/success`);
      successUrl.searchParams.set('reference', paymentReference);
      successUrl.searchParams.set('status', 'SUCCESS');
      successUrl.searchParams.set('gateway', 'OPAY');
      
      return c.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL(`${getAppUrl()}/app/checkout/error`);
      errorUrl.searchParams.set('reference', paymentReference);
      errorUrl.searchParams.set('message', 'Payment was not successful');
      
      return c.redirect(errorUrl.toString());
    }

  } catch (error) {
    logger.error('OPay callback error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return c.redirect(`${getAppUrl()}/app/checkout/error?message=OPay callback error`);
  }
});

// Payment cancellation callback
app.get('/cancel', async (c) => {
  const query = c.req.query();
  const reference = query.reference || query.tx_ref;

  logger.info('Payment cancelled', { reference });

  const cancelUrl = new URL(`${getAppUrl()}/app/checkout/cancelled`);
  if (reference) {
    cancelUrl.searchParams.set('reference', reference);
  }
  
  return c.redirect(cancelUrl.toString());
});

// Database persistence functions
async function persistPaymentData(verificationResult: any, reference: string, gateway: string, query: any) {
  try {
    logger.info('Starting payment persistence', { reference, gateway });

    // Fast-path: if an order already exists for this reference, skip callback persistence.
    // The webhook path will have already updated the order and created the payment.
    const existingOrderForRef = await db.order.findFirst({
      where: {
        OR: [
          { orderNumber: reference },
          { paymentReference: reference },
        ],
      },
    });

    if (existingOrderForRef) {
      logger.info('Order already exists for reference; skipping callback persistence (webhook handles payment)', {
        reference,
        orderId: existingOrderForRef.id,
      });
      return { success: true, orderId: existingOrderForRef.id, orderNumber: existingOrderForRef.orderNumber };
    }

    // Get the original order data from Flutterwave metadata
    const originalOrderData = await getOriginalOrderData(reference, gateway, verificationResult);
    
    if (!originalOrderData) {
      logger.warn('No original order data found for payment', { reference, gateway });
      return { success: false, error: 'Original order data not found' };
    }

    // Check if payment already exists to avoid duplicates
    const existingPayment = await db.payment.findFirst({
      where: {
        OR: [
          { gatewayReference: verificationResult.gatewayReference },
          { transactionId: reference }
        ]
      }
    });

    if (existingPayment) {
      logger.info('Payment already exists, skipping persistence', { 
        reference, 
        existingPaymentId: existingPayment.id 
      });
      return { success: true, paymentId: existingPayment.id, orderId: existingPayment.orderId };
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(originalOrderData.customer);
    
    if (!customer) {
      logger.error('Failed to find or create customer', { 
        customerEmail: originalOrderData.customer.email 
      });
      return { success: false, error: 'Customer creation failed' };
    }

    // Create order and payment in a transaction
    const result = await db.$transaction(async (prisma) => {
      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: reference,
          customerId: customer.id,
          status: 'RECEIVED',
          deliveryMethod: originalOrderData.deliveryMethod || 'STANDARD',
          deliveryAddress: originalOrderData.deliveryAddress || customer.address || 'Not specified',
          deliveryCity: originalOrderData.deliveryCity || customer.city || 'Not specified',
          deliveryState: originalOrderData.deliveryState || customer.state || 'Not specified',
          deliveryLGA: originalOrderData.deliveryLGA || customer.lga,
          deliveryPhone: originalOrderData.deliveryPhone || customer.phone,
          deliveryNotes: originalOrderData.deliveryNotes,
          subtotal: originalOrderData.subtotal || verificationResult.amount,
          deliveryFee: originalOrderData.deliveryFee || 0,
          discount: 0,
          tax: 0,
          total: verificationResult.amount,
          paymentStatus: 'COMPLETED',
          paymentMethod: gateway as any,
          paymentReference: reference,
          purchaseOrderNumber: originalOrderData.purchaseOrderNumber,
        }
      });

      // Create order items if available
      if (originalOrderData.items && originalOrderData.items.length > 0) {
        await Promise.all(
          originalOrderData.items.map(async (item: any) => {
            return prisma.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId || 'unknown',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                subtotal: (item.unitPrice || 0) * (item.quantity || 1),
                productName: item.name || 'Unknown Product',
                productSKU: item.sku || 'N/A',
                productDescription: item.description || null,
              }
            });
          })
        );
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          amount: verificationResult.amount,
          currency: verificationResult.currency || 'NGN',
          method: gateway as any,
          status: 'COMPLETED',
          gatewayReference: verificationResult.gatewayReference,
          transactionId: reference,
          gatewayResponse: JSON.stringify(verificationResult),
          gatewayFee: verificationResult.gatewayFee || 0,
          appFee: verificationResult.appFee || 0,
        }
      });

      // Create order tracking record
      await prisma.orderTracking.create({
        data: {
          orderId: order.id,
          status: 'RECEIVED',
          notes: `Order created from ${gateway} payment - ${reference}`,
        }
      });

      return { order, payment };
    });

    logger.info('Payment persistence completed successfully', {
      reference,
      orderId: result.order.id,
      paymentId: result.payment.id,
      customerEmail: customer.businessEmail || customer.userId
    });

    return { 
      success: true, 
      orderId: result.order.id, 
      paymentId: result.payment.id,
      orderNumber: result.order.orderNumber
    };

  } catch (error) {
    logger.error('Payment persistence failed', {
      reference,
      gateway,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

async function getOriginalOrderData(reference: string, gateway: string, verificationResult: any) {
  try {
    // For Flutterwave, we can get metadata from the verification result
    if (gateway === 'FLUTTERWAVE' && verificationResult.gatewayResponse?.meta) {
      const meta = verificationResult.gatewayResponse.meta;
      return {
        customer: {
          email: verificationResult.gatewayResponse.customer?.email || 'unknown@example.com',
          phone: verificationResult.gatewayResponse.customer?.phone_number || 'N/A',
          name: verificationResult.gatewayResponse.customer?.name || 'Unknown Customer',
          state: meta.customerState || 'Unknown',
          lga: meta.customerLGA || null,
        },
        deliveryMethod: 'STANDARD',
        deliveryAddress: meta.deliveryAddress,
        deliveryCity: 'Not specified',
        deliveryState: meta.customerState,
        deliveryLGA: meta.customerLGA,
        deliveryPhone: verificationResult.gatewayResponse.customer?.phone_number,
        deliveryNotes: null,
        subtotal: verificationResult.amount,
        deliveryFee: parseFloat(meta.deliveryFee) || 0,
        purchaseOrderNumber: meta.purchaseOrderNumber,
        items: meta.items ? JSON.parse(meta.items) : [{
          name: 'Order Items',
          quantity: 1,
          unitPrice: verificationResult.amount,
          productId: meta.orderId || 'unknown'
        }]
      };
    }

    // Fallback data for other gateways
    return {
      customer: {
        email: 'unknown@example.com',
        phone: 'N/A',
        name: 'Unknown Customer',
        state: 'Unknown',
        lga: null,
      },
      deliveryMethod: 'STANDARD',
      deliveryAddress: 'Not specified',
      deliveryCity: 'Not specified',
      deliveryState: 'Unknown',
      deliveryLGA: null,
      deliveryPhone: 'N/A',
      deliveryNotes: null,
      subtotal: verificationResult.amount,
      deliveryFee: 0,
      purchaseOrderNumber: null,
      items: [{
        name: 'Payment Item',
        quantity: 1,
        unitPrice: verificationResult.amount,
        productId: 'unknown'
      }]
    };
  } catch (error) {
    logger.error('Error extracting original order data', { reference, gateway, error });
    return null;
  }
}

async function findOrCreateCustomer(customerData: any) {
  try {
    // Guard against masked/placeholder emails coming from gateways (e.g., Flutterwave sandbox)
    if (!customerData?.email || typeof customerData.email !== 'string' || customerData.email.startsWith('ravesb_')) {
      logger.warn('Refusing to create user from masked/invalid gateway email in callback', { email: customerData?.email });
      return null;
    }

    // First try to find existing customer by email
    const user = await db.user.findFirst({
      where: {
        email: customerData.email
      }
    });

    if (user) {
      // Check if customer record exists
      let customer = await db.customer.findFirst({
        where: {
          userId: user.id
        }
      });

      if (!customer) {
        // Create customer record for existing user
        customer = await db.customer.create({
          data: {
            userId: user.id,
            customerType: 'RETAIL',
            phone: customerData.phone || 'N/A',
            address: 'Not specified',
            city: 'Not specified',
            state: customerData.state || 'Unknown',
            lga: customerData.lga,
            country: 'Nigeria',
          }
        });
      }

      return customer;
    } else {
      // Create new user and customer
      const newUser = await db.user.create({
        data: {
          id: crypto.randomUUID(),
          name: customerData.name,
          email: customerData.email,
          emailVerified: false,
          onboardingComplete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      const newCustomer = await db.customer.create({
        data: {
          userId: newUser.id,
          customerType: 'RETAIL',
          phone: customerData.phone || 'N/A',
          address: 'Not specified',
          city: 'Not specified', 
          state: customerData.state || 'Unknown',
          lga: customerData.lga,
          country: 'Nigeria',
        }
      });

      return newCustomer;
    }
  } catch (error) {
    logger.error('Error finding or creating customer', { 
      customerEmail: customerData.email, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

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
        gatewayReference: result.data.flw_ref,
        gatewayResponse: result.data // Include full response for metadata extraction
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
