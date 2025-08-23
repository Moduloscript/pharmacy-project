import { db } from '@repo/database';
import { logger } from '@repo/logs';

/**
 * Enhanced webhook payment validation with amount guardrails
 * This function should be called before marking any payment as COMPLETED
 */
export async function validatePaymentAmounts(
  paymentId?: string,
  gatewayAmount?: number,
  orderId?: string,
  currency = 'NGN',
  reference?: string
): Promise<{ isValid: boolean; reason?: string; correctedAmount?: number }> {
  try {
    // For validation by reference, find payment first
    let payment = null;
    
    if (paymentId) {
      payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            select: { id: true, total: true }
          }
        }
      });
    } else if (reference) {
      payment = await db.payment.findFirst({
        where: { transactionId: reference },
        include: {
          order: {
            select: { id: true, total: true }
          }
        }
      });
    } else if (orderId) {
      payment = await db.payment.findFirst({
        where: { orderId: orderId },
        include: {
          order: {
            select: { id: true, total: true }
          }
        }
      });
    }

    if (!payment) {
      // If no payment found, but we have gateway amount and order details, check against order directly
      if (orderId && gatewayAmount) {
        const order = await db.order.findUnique({
          where: { id: orderId },
          select: { total: true }
        });
        
        if (order) {
          const orderTotal = parseFloat(order.total.toString());
          const gatewayAmountNormalized = normalizeAmount(gatewayAmount, currency);
          const diff = Math.abs(orderTotal - gatewayAmountNormalized);
          
          if (diff >= 1.0) {
            const ratio = orderTotal / gatewayAmountNormalized;
            if (ratio >= 99 && ratio <= 101) {
              logger.warn('Pre-creation validation: 100x mismatch detected', {
                orderId,
                orderTotal,
                gatewayAmount: gatewayAmountNormalized,
                ratio
              });
              return {
                isValid: true,
                correctedAmount: orderTotal,
                reason: `Auto-corrected 100x factor mismatch: gateway=${gatewayAmountNormalized}, order=${orderTotal}`
              };
            }
            
            logger.error('Pre-creation validation: Amount mismatch detected', {
              orderId,
              orderTotal,
              gatewayAmount: gatewayAmountNormalized,
              difference: diff
            });
            
            return {
              isValid: false,
              reason: `Amount mismatch: order total ₦${orderTotal} vs gateway ₦${gatewayAmountNormalized}`
            };
          }
        }
      }
      
      // No payment found but no explicit validation data - allow creation
      return { isValid: true };
    }

    const linkedOrder = payment.order;
    if (!linkedOrder) {
      // If no order linked, we can't validate against order total
      return { isValid: true };
    }

    const orderTotal = parseFloat(linkedOrder.total.toString());
    const paymentAmount = parseFloat(payment.amount.toString());
    
    // Use provided gateway amount or existing payment amount
    const amountToValidate = gatewayAmount ?? paymentAmount;
    const gatewayAmountNormalized = normalizeAmount(amountToValidate, currency);

    // Check for amount mismatches with 1 NGN threshold
    const orderPaymentDiff = Math.abs(orderTotal - paymentAmount);
    const orderGatewayDiff = Math.abs(orderTotal - gatewayAmountNormalized);
    const paymentGatewayDiff = Math.abs(paymentAmount - gatewayAmountNormalized);

    logger.debug('Payment Amount Validation:', {
      paymentId: payment.id,
      reference,
      paymentAmount,
      orderTotal,
      gatewayAmountRaw: amountToValidate,
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
        logger.warn('Detected 100x amount mismatch, using order total as correct amount', {
          paymentId: payment.id,
          reference,
          orderTotal,
          gatewayAmount: gatewayAmountNormalized,
          ratio
        });
        
        return {
          isValid: true,
          correctedAmount: orderTotal,
          reason: `Auto-corrected 100x factor mismatch: gateway=${gatewayAmountNormalized}, order=${orderTotal}`
        };
      }

      // Log the mismatch for audit
      await logAmountMismatch(payment.id, {
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
    logger.error('Payment validation error:', {
      paymentId,
      reference,
      gatewayAmount,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { isValid: false, reason: 'Validation error occurred' };
  }
}

/**
 * Normalize amount from gateway (handles kobo/naira conversion)
 */
export function normalizeAmount(amount: number, currency: string): number {
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
    logger.error('PAYMENT AMOUNT MISMATCH DETECTED:', {
      paymentId,
      ...details,
      timestamp: new Date().toISOString()
    });

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
    logger.error('Failed to log amount mismatch:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Enhanced wrapper for updateOrderStatus with validation
 */
export async function updateOrderStatusWithValidation(
  reference: string, 
  status: string, 
  paymentData: any
): Promise<{ success: boolean; error?: string; validationResult?: any }> {
  try {
    // Only validate for successful payments
    if (status === 'SUCCESS' && paymentData.amount) {
      // Validate amounts before updating
      const validation = await validatePaymentAmounts(
        undefined, // paymentId
        paymentData.amount, // gatewayAmount
        undefined, // orderId - will be resolved by reference
        paymentData.currency || 'NGN',
        reference
      );

      if (!validation.isValid) {
        logger.error('Payment blocked due to amount validation failure', {
          reference,
          reason: validation.reason,
          gatewayAmount: paymentData.amount,
          currency: paymentData.currency
        });
        
        return { 
          success: false, 
          error: `Payment validation failed: ${validation.reason}`,
          validationResult: validation
        };
      }

      // If validation passed with correction, use corrected amount
      if (validation.correctedAmount) {
        logger.info('Payment amount auto-corrected', {
          reference,
          originalAmount: paymentData.amount,
          correctedAmount: validation.correctedAmount,
          reason: validation.reason
        });
        
        paymentData.amount = validation.correctedAmount;
      }
    }

    return { success: true, validationResult: null };
  } catch (error) {
    logger.error('Validation wrapper error:', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: 'Validation process failed',
      validationResult: null
    };
  }
}
