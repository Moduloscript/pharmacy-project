// Database connection will be imported dynamically

/**
 * Enhanced webhook payment validation with amount guardrails
 * This function should be called before marking any payment as COMPLETED
 */
export async function validatePaymentAmounts(
  paymentId: string,
  gatewayAmount: number,
  orderId?: string,
  currency = 'NGN'
): Promise<{ isValid: boolean; reason?: string; correctedAmount?: number }> {
  try {
    // Import db connection dynamically
    const { db } = await import('@repo/database');
    
    // Get the payment and linked order
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: { id: true, total: true }
        }
      }
    });

    if (!payment) {
      return { isValid: false, reason: 'Payment not found' };
    }

    const linkedOrder = payment.order;
    if (!linkedOrder) {
      // If no order linked, we can't validate
      return { isValid: true };
    }

    const orderTotal = parseFloat(linkedOrder.total.toString());
    const paymentAmount = parseFloat(payment.amount.toString());
    const gatewayAmountNormalized = normalizeAmount(gatewayAmount, currency);

    // Check for amount mismatches with 1 NGN threshold
    const orderPaymentDiff = Math.abs(orderTotal - paymentAmount);
    const orderGatewayDiff = Math.abs(orderTotal - gatewayAmountNormalized);
    const paymentGatewayDiff = Math.abs(paymentAmount - gatewayAmountNormalized);

    console.log('Payment Amount Validation:', {
      paymentId,
      paymentAmount,
      orderTotal,
      gatewayAmountRaw: gatewayAmount,
      gatewayAmountNormalized,
      orderPaymentDiff,
      orderGatewayDiff,
      paymentGatewayDiff
    });

    // Primary validation: order total should match gateway amount
    if (orderGatewayDiff >= 1.0) {
      // Check if it's a known 100x factor issue
      const ratio = orderTotal / gatewayAmountNormalized;
      if (ratio >= 99 && ratio <= 101) {
        console.warn('Detected 100x amount mismatch, using order total as correct amount');
        return {
          isValid: true,
          correctedAmount: orderTotal,
          reason: `Auto-corrected 100x factor mismatch: gateway=${gatewayAmountNormalized}, order=${orderTotal}`
        };
      }

      // Log the mismatch for audit
      await logAmountMismatch(paymentId, {
        paymentAmount,
        orderTotal,
        gatewayAmount: gatewayAmountNormalized,
        reason: 'Gateway amount does not match order total'
      });

      return {
        isValid: false,
        reason: `Amount mismatch: order total ₦${orderTotal} vs gateway ₦${gatewayAmountNormalized}`
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Payment validation error:', error);
    return { isValid: false, reason: 'Validation error occurred' };
  }
}

/**
 * Normalize amount from gateway (handles kobo/naira conversion)
 */
function normalizeAmount(amount: number, currency: string): number {
  if (currency === 'NGN') {
    // If amount is in kobo (very large number), convert to naira
    if (amount > 100000) { // Assume amounts > 100k are in kobo
      return amount / 100;
    }
  }
  return amount;
}

/**
 * Log amount mismatches for audit trail
 */
async function logAmountMismatch(paymentId: string, details: {
  paymentAmount: number;
  orderTotal: number;
  gatewayAmount: number;
  reason: string;
}): Promise<void> {
  try {
    console.error('PAYMENT AMOUNT MISMATCH DETECTED:', {
      paymentId,
      ...details,
      timestamp: new Date().toISOString()
    });

    // Import db connection dynamically
    const { db } = await import('@repo/database');
    
    // Also log to database via raw SQL for audit
    await db.$executeRaw`
      INSERT INTO public.payment_mismatch_audit 
      (payment_id, payment_amount, order_amount, mismatch_ratio, reason) 
      VALUES (
        ${paymentId}, 
        ${details.paymentAmount}, 
        ${details.orderTotal}, 
        ${details.orderTotal / details.paymentAmount}, 
        ${details.reason}
      )
    `;
  } catch (error) {
    console.error('Failed to log amount mismatch:', error);
  }
}

/**
 * Enhanced webhook handler wrapper that includes amount validation
 */
export async function processPaymentWebhookWithValidation(
  paymentId: string,
  gatewayData: {
    amount: number;
    currency: string;
    reference: string;
    status: string;
  }
): Promise<{ success: boolean; reason?: string }> {
  
  // Import db connection dynamically
  const { db } = await import('@repo/database');
  
  // Validate amounts before marking as completed
  const validation = await validatePaymentAmounts(
    paymentId,
    gatewayData.amount,
    undefined,
    gatewayData.currency
  );

  if (!validation.isValid) {
    console.error('Payment webhook blocked due to amount mismatch:', validation.reason);
    
    // Update payment with failure reason instead of marking as completed
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: `Amount validation failed: ${validation.reason}`,
        updatedAt: new Date()
      }
    });

    return { success: false, reason: validation.reason };
  }

  // If validation passed, update with correct amount if provided
  const updateData: any = {
    status: 'COMPLETED',
    completedAt: new Date(),
    updatedAt: new Date(),
    gatewayResponse: JSON.stringify(gatewayData)
  };

  if (validation.correctedAmount) {
    updateData.amount = validation.correctedAmount;
    updateData.failureReason = validation.reason; // Log the correction reason
  }

  await db.payment.update({
    where: { id: paymentId },
    data: updateData
  });

  // Also update the linked order status if payment is completed
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { orderId: true }
  });

  if (payment?.orderId) {
    await db.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'COMPLETED',
        status: 'PROCESSING',
        updatedAt: new Date()
      }
    });
  }

  return { success: true };
}
