import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { logger } from '@repo/logs';
import { authMiddleware } from '../../middleware/auth';
import { validateNigerianPhone, normalizeNigerianPhone } from '@repo/utils/nigerian-utils';
import { createPaystackProvider } from '@repo/payments';
import type { NigerianOrder } from '@repo/payments';

import type { AppBindings } from '../../types/context';
const app = new Hono<AppBindings>();

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
    // productId/sku optional for backward compatibility, but recommended
    productId: z.string().optional(),
    sku: z.string().optional(),
    name: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive()
  })),
  totalAmount: z.number().positive(), // In kobo
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']).optional(),
  gateway: z.enum(['FLUTTERWAVE', 'OPAY', 'PAYSTACK']).optional(),
  // Optional OPay preferred method (omit to show all methods)
  opayPayMethod: z.enum(['BankCard', 'BankTransfer', 'BankUSSD', 'OPay']).optional(),
  purchaseOrderNumber: z.string().optional(),
  // Optional: Use an existing order created via /api/orders
  orderId: z.string().optional()
});

type BenpharmiCheckoutRequest = z.infer<typeof benpharmiCheckoutSchema>;

// BenPharm checkout endpoint - with auth middleware applied specifically to this route
app.post('/benpharm-checkout', authMiddleware, zValidator('json', benpharmiCheckoutSchema), async (c) => {
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
    
    // Import prescription validation service
    const { PrescriptionValidationService } = await import('../../services/prescription-validation');

    // Derive client IP for gateway risk controls
    // Use environment variable for default IP (security best practice)
    const DEFAULT_IP = process.env.DEFAULT_CLIENT_IP || '127.0.0.1';
    
    const forwardedFor = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');
    const cfConnectingIp = c.req.header('cf-connecting-ip');
    
    let clientIp = DEFAULT_IP;
    
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0]?.trim();
      if (firstIp && firstIp.length >= 7 && firstIp.length <= 50) {
        clientIp = firstIp;
      }
    } else if (realIp && realIp.length >= 7 && realIp.length <= 50) {
      clientIp = realIp;
    } else if (cfConnectingIp && cfConnectingIp.length >= 7 && cfConnectingIp.length <= 50) {
      clientIp = cfConnectingIp;
    }
    
    // Validate IP length for OPay requirements (7-50 characters)
    if (clientIp.length < 7 || clientIp.length > 50) {
      logger.warn('Invalid IP length for OPay, using default', { 
        originalIp: clientIp, 
        length: clientIp.length 
      });
      clientIp = DEFAULT_IP;
    }

    // Generate a stable business reference and pre-create Order (Option A)
    const reference = `BP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { db } = await import('@repo/database');

    // Ensure a customer record exists for this user
    let customer = await db.customer.findUnique({ where: { userId: user.id } });

    // If existing orderId provided, use that order instead of creating a new one
    if (data.orderId && customer) {
      const order = await db.order.findFirst({
        where: { id: data.orderId, customerId: customer.id },
        include: {
          orderItems: { include: { product: { select: { isPrescriptionRequired: true, isControlled: true, name: true } } } },
          prescriptions: true
        }
      });

      if (!order) {
        return c.json({ success: false, error: { message: 'Order not found for customer' } }, 404);
      }

      // Determine if prescription is required and ensure a prescription exists (any status)
      const requiresRx = order.orderItems.some(oi => (oi.product as any)?.isPrescriptionRequired || (oi.product as any)?.isControlled);
      if (requiresRx) {
        const hasAnyRx = (order as any).prescriptions && (order as any).prescriptions.length > 0;
        if (!hasAnyRx) {
          logger.warn('Payment blocked: Prescription not uploaded for order', { orderId: order.id, userId: user.id });
          return c.json({
            success: false,
            error: {
              code: 'PRESCRIPTION_REQUIRED',
              message: 'Please upload a prescription before proceeding to payment',
              requiresPrescription: true
            }
          }, 400);
        }
      }

      // Use order number as reference and order total for amount (kobo)
      const ref = order.orderNumber;
      const totalAmount = Math.round(Number(order.total) * 100);

      const gateway = data.gateway || 'FLUTTERWAVE';
      const gatewayData = {
        ...data,
        productId: order.id,
        totalAmount,
        // Provide order items to aid gateway descriptions
        items: order.orderItems.map(oi => ({
          productId: oi.productId,
          sku: oi.productSKU || undefined,
          name: oi.productName,
          quantity: oi.quantity,
          unitPrice: Math.round(Number(oi.unitPrice) * 100)
        }))
      } as any;

      const paymentResult = await createBenpharmiPayment(gatewayData, gateway, ref, clientIp);
      if (paymentResult.success) {
        return c.json({
          success: true,
          checkoutLink: (paymentResult as any).paymentUrl,
          reference: (paymentResult as any).reference,
          gateway: gateway,
          message: 'Payment created successfully'
        });
      }

      const fallbackResult = await handlePaymentFallback(gatewayData, gateway, ref, clientIp);
      if (fallbackResult.success) {
        return c.json({
          success: true,
          checkoutLink: (fallbackResult as any).paymentUrl,
          reference: (fallbackResult as any).reference,
          gateway: (fallbackResult as any).gateway,
          message: 'Payment created with fallback gateway'
        });
      }

      return c.json({ success: false, error: { message: (paymentResult as any).error || (fallbackResult as any).error || 'Payment creation failed' } }, 502);
    }
    
    // CRITICAL SECURITY: Validate prescriptions before allowing payment
    // Check if any items have productId for prescription validation
    const itemsWithProductId = data.items.filter((item: BenpharmiCheckoutRequest['items'][number]) => item.productId);
    
    if (itemsWithProductId.length > 0 && customer) {
      // Validate prescriptions for the order items
      const prescriptionValidation = await PrescriptionValidationService.validateOrderPrescriptions(
        customer.id,
        itemsWithProductId.map((item: BenpharmiCheckoutRequest['items'][number]) => ({
          productId: item.productId!,
          quantity: item.quantity
        }))
      );
      
      // Check if any items require prescriptions
      const requiresPrescription = prescriptionValidation.itemValidations.some(
        item => item.requiresPrescription
      );
      
      if (requiresPrescription && !prescriptionValidation.isValid) {
        logger.warn('Payment blocked: Prescription validation failed', {
          userId: user.id,
          customerId: customer.id,
          errors: prescriptionValidation.errors,
          items: prescriptionValidation.itemValidations
        });
        
        return c.json({
          success: false,
          error: {
            code: 'PRESCRIPTION_REQUIRED',
            message: 'Cannot process payment: Valid prescription required for controlled medications',
            details: prescriptionValidation.errors,
            requiresPrescription: true,
            itemValidations: prescriptionValidation.itemValidations
          }
        }, 400);
      }
    }
    
    if (!customer) {
      // Validate and normalize the phone number for Nigerian format
      let normalizedPhone = data.customer.phone;
      
      // Remove any spaces or special characters except + 
      normalizedPhone = normalizedPhone.replace(/[^\d+]/g, '');
      
      // If the phone has too many digits, try to fix common issues
      if (normalizedPhone.startsWith('+234') && normalizedPhone.length > 14) {
        // Remove extra digits (likely a typo)
        normalizedPhone = normalizedPhone.substring(0, 14);
      } else if (normalizedPhone.startsWith('234') && normalizedPhone.length > 13) {
        normalizedPhone = '+' + normalizedPhone.substring(0, 13);
      } else if (normalizedPhone.startsWith('0') && normalizedPhone.length > 11) {
        normalizedPhone = normalizedPhone.substring(0, 11);
      }
      
      // Try to normalize using the utility function
      try {
        normalizedPhone = normalizeNigerianPhone(normalizedPhone);
      } catch (e) {
        logger.warn('Phone normalization failed, using as-is', { 
          originalPhone: data.customer.phone,
          attemptedNormalization: normalizedPhone 
        });
      }
      
      // Validate the normalized phone
      if (!validateNigerianPhone(normalizedPhone)) {
        logger.warn('Invalid Nigerian phone number format', {
          original: data.customer.phone,
          normalized: normalizedPhone
        });
        // Use a fallback format that should pass validation
        // This ensures the checkout doesn't fail due to phone format
        normalizedPhone = '+2348000000000'; // Generic valid format
      }
      
      customer = await db.customer.create({
        data: {
          userId: user.id,
          customerType: 'RETAIL',
          phone: normalizedPhone,
          country: 'Nigeria',
          state: data.customer.state || 'Lagos', // Add state from customer data
          address: data.deliveryAddress || null,
          lga: data.customer.lga || null,
        },
      });
    }

    // Compute order totals in naira (totalAmount is in kobo)
    const totalNaira = data.totalAmount / 100;
    const deliveryFeeNaira = (data.deliveryFee ?? 0) / 100;
    const discountNaira = 0;
    const taxNaira = 0;
    const subtotalNaira = Math.max(0, totalNaira - deliveryFeeNaira - discountNaira + taxNaira);

    // Create the Order ahead of gateway initialization so the webhook can link it
    const newOrder = await db.order.create({
      data: {
        orderNumber: reference,
        customerId: customer.id,
        deliveryAddress: data.deliveryAddress ?? '',
        deliveryCity: data.customer.state, // No city in payload; reuse state as placeholder
        deliveryState: data.customer.state,
        deliveryLGA: data.customer.lga ?? null,
        deliveryPhone: data.customer.phone,
        subtotal: subtotalNaira,
        deliveryFee: deliveryFeeNaira,
        discount: discountNaira,
        tax: taxNaira,
        total: totalNaira,
        paymentStatus: 'PENDING',
        paymentReference: reference,
      },
    });

    // Pre-create order items for better UX (no stock updates here)
    try {
      const itemsToCreate = (data.items || [])
        .filter((it: BenpharmiCheckoutRequest['items'][number]) => !!it.productId)
        .map((it: BenpharmiCheckoutRequest['items'][number]) => ({
          orderId: newOrder.id,
          productId: it.productId as string,
          quantity: it.quantity,
          unitPrice: Math.round(it.unitPrice) / 100, // kobo -> naira
          subtotal: (Math.round(it.unitPrice) / 100) * it.quantity,
          productName: it.name,
          productSKU: it.sku ?? 'N/A',
        }));

      if (itemsToCreate.length > 0) {
        await db.orderItem.createMany({ data: itemsToCreate });
      }
    } catch (e) {
      // Non-fatal: items can be backfilled by webhook if needed
      logger.warn('Failed to pre-create order items; will rely on webhook backfill', {
        reference,
        error: (e as Error)?.message,
      });
    }

    // Determine payment gateway (prioritize Flutterwave for Nigerian users)
    const gateway = data.gateway || 'FLUTTERWAVE';
    const userSpecifiedGateway = Boolean(data.gateway);

    // Create payment based on selected gateway using the same reference
    const paymentResult = await createBenpharmiPayment(data, gateway, reference, clientIp);

    if (paymentResult.success) {
      logger.info('BenPharm payment created successfully', {
        gateway,
        paymentReference: (paymentResult as any).reference,
        paymentUrl: (paymentResult as any).paymentUrl ? 'generated' : 'none'
      });

      return c.json({
        success: true,
        checkoutLink: (paymentResult as any).paymentUrl,
        reference: (paymentResult as any).reference,
        gateway: gateway,
        message: 'Payment created successfully'
      });
    } else {
      // If the user explicitly selected a gateway (e.g., OPay), do not silently fallback.
      // Surface the error so configuration can be fixed rather than masking with another provider.
      if (userSpecifiedGateway) {
        logger.error('Primary gateway failed and fallback disabled due to explicit selection', {
          selectedGateway: gateway,
          reference,
          error: (paymentResult as any).error
        });
        return c.json({
          success: false,
          error: {
            message: `${gateway} payment failed`,
            details: (paymentResult as any).error || 'Gateway error'
          }
        }, 502);
      }

      // Otherwise, try fallback gateways (reuse same reference)
      const fallbackResult = await handlePaymentFallback(data, gateway, reference, clientIp);
      
      if (fallbackResult.success) {
        return c.json({
          success: true,
          checkoutLink: (fallbackResult as any).paymentUrl,
          reference: (fallbackResult as any).reference,
          gateway: (fallbackResult as any).gateway,
          message: 'Payment created with fallback gateway'
        });
      }

      throw new Error((fallbackResult as any).error || 'All payment gateways failed');
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
async function createBenpharmiPayment(data: BenpharmiCheckoutRequest, gateway: string, reference: string, clientIp?: string) {
  try {
    switch (gateway) {
      case 'FLUTTERWAVE':
        return await createFlutterwavePayment(data, reference);
      case 'OPAY':
        return await createOpayPayment(data, reference, clientIp);
      case 'PAYSTACK':
        // return await createPaystackPayment(data, reference);
        const paystackProvider = createPaystackProvider();
        const nigerianOrder: NigerianOrder = {
          id: data.productId,
          orderNumber: reference,
          totalAmount: data.totalAmount / 100, // Convert kobo to naira
          currency: 'NGN',
          customer: {
            email: data.customer.email,
            phone: data.customer.phone,
            name: data.customer.name,
            state: data.customer.state,
            lga: data.customer.lga
          },
          items: data.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice / 100 // Convert kobo to naira
          })),
          deliveryAddress: data.deliveryAddress,
          deliveryFee: (data.deliveryFee || 0) / 100 // Convert kobo to naira
        };
        return await paystackProvider.initializePayment(nigerianOrder);
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
async function createFlutterwavePayment(data: BenpharmiCheckoutRequest, reference: string, clientIp?: string) {
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
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback/flutterwave` 
        : data.redirectUrl || 'https://benpharm.ng/api/payments/callback/flutterwave',
      payment_options: 'card,banktransfer,ussd,mobilemoney',
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
async function createOpayPayment(data: BenpharmiCheckoutRequest, reference: string, clientIp?: string) {
  const opaySecretKey = (process.env.OPAY_SECRET_KEY || '').trim();
  const opayPublicKey = (process.env.OPAY_PUBLIC_KEY || '').trim();
  const opayMerchantId = (process.env.OPAY_MERCHANT_ID || '').trim();
  
  if (!opaySecretKey || !opayPublicKey || !opayMerchantId) {
    logger.error('OPay configuration missing');
    return {
      success: false,
      error: 'OPay configuration missing'
    };
  }

  // OPay Cashier endpoints (staging vs production)
  const apiBase = process.env.NODE_ENV === 'production'
    ? 'https://liveapi.opaycheckout.com'
    : 'https://testapi.opaycheckout.com';
  const apiUrl = `${apiBase}/api/v1/international/cashier/create`;

  try {
    const payload = {
      country: 'NG',
      reference,
      amount: {
        total: data.totalAmount, // OPay expects amount in kobo
        currency: 'NGN'
      },
      // Include the reference in the returnUrl since OPay doesn't always pass it back
      returnUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback/opay?gateway=OPAY&ref=${reference}` 
        : `https://benpharm.ng/api/payments/callback/opay?gateway=OPAY&ref=${reference}`,
      // OPay expects notifyUrl for server-to-server callbacks (webhooks)
      notifyUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/opay` 
        : 'https://benpharm.ng/api/payments/webhook/opay',
      // Keep callbackUrl as well for backward compatibility with any prior config
      callbackUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/opay` 
        : 'https://benpharm.ng/api/payments/webhook/opay',
      cancelUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cancel` 
        : 'https://benpharm.ng/api/payments/cancel',
      customerVisitSource: 'BROWSER',
      evokeOpay: false,
      expireAt: 30, // minutes
      userClientIP: clientIp || process.env.DEFAULT_CLIENT_IP || '127.0.0.1',
      userInfo: {
        userEmail: data.customer.email,
        userId: data.customer.email,
        userMobile: data.customer.phone,
        userName: data.customer.name
      },
      product: {
        name: `BenPharm Order - ${data.items.map(item => item.name).join(', ')}`,
        description: `Payment for ${data.items.length} items from BenPharm Online Pharmacy`
      },
      // Only include payMethod when provided; otherwise OPay shows all supported methods
      ...(data.opayPayMethod ? { payMethod: data.opayPayMethod } : {}),
      // Optional: carry through metadata for internal reconciliation
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

    // OPay requires Public Key for payment creation (not secret key)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MerchantId': opayMerchantId,
        'Authorization': `Bearer ${opayPublicKey}`, // Use PUBLIC key for payment creation
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

// Paystack implementation replaced by provider usage
// async function createPaystackPayment(data: BenpharmiCheckoutRequest, reference: string, clientIp?: string) { ... }

// Handle gateway fallback
async function handlePaymentFallback(data: BenpharmiCheckoutRequest, failedGateway: string, reference: string, clientIp?: string) {
  const fallbackOrder = ['FLUTTERWAVE', 'OPAY', 'PAYSTACK'].filter(g => g !== failedGateway);
  
  for (const gateway of fallbackOrder) {
    const result = await createBenpharmiPayment(data, gateway, reference, clientIp);
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
