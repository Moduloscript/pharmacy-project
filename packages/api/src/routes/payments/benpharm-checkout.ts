import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { logger } from '@repo/logs';
import { authMiddleware } from '../../middleware/auth';

const app = new Hono();

// BenPharm checkout schema for Nigerian payments
const benpharmiCheckoutSchema = z.object({
  type: z.literal('one-time'),
  productId: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  redirectUrl: z.string().url().optional(),
  customer: z.object({
    email: z.string().email(),
    phone: z.string(),
    name: z.string(),
    state: z.string(),
    lga: z.string().optional()
  }),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive()
  })),
  totalAmount: z.number().positive(), // In kobo
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']).optional(),
  gateway: z.enum(['FLUTTERWAVE', 'OPAY', 'PAYSTACK']).optional(),
  purchaseOrderNumber: z.string().optional()
});

type BenpharmiCheckoutRequest = z.infer<typeof benpharmiCheckoutSchema>;

// Apply auth middleware
app.use('*', authMiddleware);

// BenPharm checkout endpoint
app.post('/benpharm-checkout', zValidator('json', benpharmiCheckoutSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  try {
    logger.info('BenPharm checkout request received', {
      userId: user.id,
      email: data.email,
      gateway: data.gateway,
      totalAmount: data.totalAmount,
      itemCount: data.items.length
    });

    // Determine payment gateway (prioritize Flutterwave for Nigerian users)
    const gateway = data.gateway || 'FLUTTERWAVE';

    // Create payment based on selected gateway
    const paymentResult = await createBenpharmiPayment(data, gateway);

    if (paymentResult.success) {
      logger.info('BenPharm payment created successfully', {
        gateway,
        paymentReference: paymentResult.reference,
        paymentUrl: paymentResult.paymentUrl ? 'generated' : 'none'
      });

      return c.json({
        success: true,
        checkoutLink: paymentResult.paymentUrl,
        reference: paymentResult.reference,
        gateway: gateway,
        message: 'Payment created successfully'
      });
    } else {
      // Try fallback gateways
      const fallbackResult = await handlePaymentFallback(data, gateway);
      
      if (fallbackResult.success) {
        return c.json({
          success: true,
          checkoutLink: fallbackResult.paymentUrl,
          reference: fallbackResult.reference,
          gateway: fallbackResult.gateway,
          message: 'Payment created with fallback gateway'
        });
      }

      throw new Error(fallbackResult.error || 'All payment gateways failed');
    }

  } catch (error) {
    logger.error('BenPharm checkout failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
      gateway: data.gateway
    });

    return c.json({
      success: false,
      error: {
        message: 'Payment creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

// Create payment with specified gateway
async function createBenpharmiPayment(data: BenpharmiCheckoutRequest, gateway: string) {
  const reference = `BP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    switch (gateway) {
      case 'FLUTTERWAVE':
        return await createFlutterwavePayment(data, reference);
      case 'OPAY':
        return await createOpayPayment(data, reference);
      case 'PAYSTACK':
        return await createPaystackPayment(data, reference);
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }
  } catch (error) {
    logger.error(`${gateway} payment creation failed`, {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment creation failed'
    };
  }
}

// Flutterwave implementation
async function createFlutterwavePayment(data: BenpharmiCheckoutRequest, reference: string) {
  const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const flwPublicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
  
  if (!flwSecretKey) {
    logger.error('Flutterwave secret key not configured');
    return {
      success: false,
      error: 'Flutterwave configuration missing'
    };
  }

  const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.flutterwave.com/v3'
    : 'https://api.flutterwave.com/v3'; // Uses same URL for sandbox and production

  try {
    const payload = {
      tx_ref: reference,
      amount: data.totalAmount / 100, // Convert from kobo to naira
      currency: 'NGN',
      redirect_url: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback` 
        : data.redirectUrl || 'https://benpharm.ng/payments/callback',
      payment_options: 'card,banktransfer,ussd,mobilemoney,opay',
      customer: {
        email: data.customer.email,
        phonenumber: data.customer.phone,
        name: data.customer.name,
      },
      customizations: {
        title: 'BenPharm Online Pharmacy',
        description: `Payment for ${data.items.map(item => item.name).join(', ')}`,
        logo: process.env.NEXT_PUBLIC_LOGO_URL || undefined,
      },
      meta: {
        orderId: data.productId,
        customerState: data.customer.state,
        customerLGA: data.customer.lga || '',
        deliveryAddress: data.deliveryAddress || '',
        deliveryFee: data.deliveryFee || 0,
        items: JSON.stringify(data.items),
        purchaseOrderNumber: data.purchaseOrderNumber || '',
      },
    };

    logger.info('Making Flutterwave API call', {
      reference,
      amount: payload.amount,
      customer: payload.customer.email
    });

    const response = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flwSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.status === 'success') {
      logger.info('Flutterwave payment created successfully', {
        reference,
        paymentId: result.data?.id,
        link: result.data?.link ? 'generated' : 'none'
      });

      return {
        success: true,
        paymentUrl: result.data.link,
        reference,
        gateway: 'FLUTTERWAVE',
        meta: {
          paymentId: result.data.id,
          flwRef: result.data.flw_ref || result.data.id
        }
      };
    } else {
      logger.error('Flutterwave API error', {
        reference,
        status: result.status,
        message: result.message,
        response: result
      });

      return {
        success: false,
        error: result.message || 'Flutterwave payment creation failed'
      };
    }
  } catch (error) {
    logger.error('Flutterwave API call failed', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Network error connecting to Flutterwave'
    };
  }
}

// OPay implementation
async function createOpayPayment(data: BenpharmiCheckoutRequest, reference: string) {
  const opaySecretKey = process.env.OPAY_SECRET_KEY;
  const opayPublicKey = process.env.OPAY_PUBLIC_KEY;
  const opayMerchantId = process.env.OPAY_MERCHANT_ID;
  
  if (!opaySecretKey || !opayPublicKey || !opayMerchantId) {
    logger.error('OPay configuration missing');
    return {
      success: false,
      error: 'OPay configuration missing'
    };
  }

  // OPay uses different URLs for sandbox vs production
  const apiUrl = process.env.NODE_ENV === 'production'
    ? 'https://payapi.opaycheckout.com/api/v1/international/payment/create'
    : 'https://sandboxapi.opaycheckout.com/api/v1/international/payment/create';

  try {
    const payload = {
      reference,
      amount: {
        total: data.totalAmount, // OPay expects amount in kobo
        currency: 'NGN'
      },
      returnUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback` 
        : data.redirectUrl || 'https://benpharm.ng/payments/callback',
      cancelUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel` 
        : 'https://benpharm.ng/payments/cancel',
      notifyUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/opay` 
        : 'https://benpharm.ng/api/payments/webhook/opay',
      payMethods: ['BankCard', 'BankTransfer', 'BankUSSD', 'OPay'],
      merchantId: opayMerchantId,
      userInfo: {
        userId: data.customer.email,
        userPhone: data.customer.phone,
        userName: data.customer.name
      },
      product: {
        name: `BenPharm Order - ${data.items.map(item => item.name).join(', ')}`,
        description: `Payment for ${data.items.length} items from BenPharm Online Pharmacy`
      },
      userClientIP: '127.0.0.1', // Should be actual client IP in production
      expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      callbackParam: JSON.stringify({
        orderId: data.productId,
        customerState: data.customer.state,
        customerLGA: data.customer.lga || '',
        deliveryAddress: data.deliveryAddress || '',
        deliveryFee: data.deliveryFee || 0,
        items: data.items,
        purchaseOrderNumber: data.purchaseOrderNumber || '',
      })
    };

    logger.info('Making OPay API call', {
      reference,
      amount: payload.amount.total / 100, // Log in naira for readability
      customer: payload.userInfo.userId
    });

    // OPay requires specific header format
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MerchantId': opayMerchantId,
        'Authorization': `Bearer ${opaySecretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.code === '00000') {
      logger.info('OPay payment created successfully', {
        reference,
        orderNo: result.data?.orderNo,
        cashierUrl: result.data?.cashierUrl ? 'generated' : 'none'
      });

      return {
        success: true,
        paymentUrl: result.data.cashierUrl,
        reference,
        gateway: 'OPAY',
        meta: {
          orderNo: result.data.orderNo,
          opayRef: result.data.orderNo
        }
      };
    } else {
      logger.error('OPay API error', {
        reference,
        code: result.code,
        message: result.message,
        response: result
      });

      return {
        success: false,
        error: result.message || 'OPay payment creation failed'
      };
    }
  } catch (error) {
    logger.error('OPay API call failed', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Network error connecting to OPay'
    };
  }
}

// Paystack implementation
async function createPaystackPayment(data: BenpharmiCheckoutRequest, reference: string) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    logger.error('Paystack secret key not configured');
    return {
      success: false,
      error: 'Paystack configuration missing'
    };
  }

  const apiUrl = 'https://api.paystack.co/transaction/initialize';

  try {
    const payload = {
      reference,
      amount: data.totalAmount, // Paystack expects amount in kobo
      currency: 'NGN',
      email: data.customer.email,
      callback_url: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback` 
        : data.redirectUrl || 'https://benpharm.ng/payments/callback',
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'opay'],
      metadata: {
        orderId: data.productId,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        customer_state: data.customer.state,
        customer_lga: data.customer.lga || '',
        delivery_address: data.deliveryAddress || '',
        delivery_fee: data.deliveryFee || 0,
        items: JSON.stringify(data.items),
        purchase_order_number: data.purchaseOrderNumber || '',
        custom_fields: [
          {
            display_name: 'Customer Phone',
            variable_name: 'customer_phone',
            value: data.customer.phone,
          },
          {
            display_name: 'Delivery Address',
            variable_name: 'delivery_address', 
            value: data.deliveryAddress || 'Not provided',
          }
        ]
      },
      custom_fields: [
        {
          display_name: 'Customer Phone',
          variable_name: 'customer_phone',
          value: data.customer.phone,
        },
        {
          display_name: 'Customer State',
          variable_name: 'customer_state',
          value: data.customer.state,
        }
      ]
    };

    logger.info('Making Paystack API call', {
      reference,
      amount: payload.amount / 100, // Log in naira for readability
      customer: payload.email
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.status === true) {
      logger.info('Paystack payment created successfully', {
        reference,
        access_code: result.data?.access_code ? 'generated' : 'none',
        authorization_url: result.data?.authorization_url ? 'generated' : 'none'
      });

      return {
        success: true,
        paymentUrl: result.data.authorization_url,
        reference,
        gateway: 'PAYSTACK',
        meta: {
          access_code: result.data.access_code,
          paystackRef: result.data.reference
        }
      };
    } else {
      logger.error('Paystack API error', {
        reference,
        status: result.status,
        message: result.message,
        response: result
      });

      return {
        success: false,
        error: result.message || 'Paystack payment creation failed'
      };
    }
  } catch (error) {
    logger.error('Paystack API call failed', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Network error connecting to Paystack'
    };
  }
}

// Handle gateway fallback
async function handlePaymentFallback(data: BenpharmiCheckoutRequest, failedGateway: string) {
  const fallbackOrder = ['FLUTTERWAVE', 'OPAY', 'PAYSTACK'].filter(g => g !== failedGateway);
  
  for (const gateway of fallbackOrder) {
    const result = await createBenpharmiPayment(data, gateway);
    if (result.success) {
      return { ...result, gateway };
    }
  }
  
  return {
    success: false,
    error: 'All payment gateways failed'
  };
}

export { app as benpharmiPaymentsRouter };
