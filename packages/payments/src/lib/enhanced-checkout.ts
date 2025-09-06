import { createCheckoutLink as stripeCreateCheckoutLink } from '../../provider/stripe';
import { getPaymentOrchestrator } from './payment-orchestrator';
import { formatNaira, validateNigerianPhone } from './nigerian-utils';
import type { CreateCheckoutLink, NigerianOrder } from '../../types';

/**
 * Enhanced checkout link creation that supports both traditional and Nigerian payment flows
 */
export const createEnhancedCheckoutLink: CreateCheckoutLink = async (options) => {
  // Detect if this is a Nigerian user based on phone number or other criteria
  const isNigerianUser = await detectNigerianUser(options);
  
  if (isNigerianUser) {
    return await createNigerianCheckoutFlow(options);
  }
  
  // Fall back to traditional payment flow (Stripe, etc.)
  return await stripeCreateCheckoutLink(options);
};

/**
 * Detect if user is Nigerian based on various criteria
 */
async function detectNigerianUser(options: Parameters<CreateCheckoutLink>[0]): Promise<boolean> {
  // Check environment variable for Nigerian payment system enablement
  if (process.env.NIGERIAN_PAYMENTS_ENABLED !== 'true') {
    return false;
  }

  // Check for Nigerian phone number format if available
  if (options.email) {
    // Could implement phone number detection from user database
    // For now, we'll use environment-based detection
  }

  // Check if currency is set to NGN
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  if (currency === 'NGN') {
    return true;
  }

  return false;
}

/**
 * Create checkout flow using Nigerian payment system
 */
async function createNigerianCheckoutFlow(options: Parameters<CreateCheckoutLink>[0]): Promise<string | null> {
  try {
    const orchestrator = getPaymentOrchestrator();
    
    // Convert the traditional checkout options to Nigerian order format
    const nigerianOrder = await convertToNigerianOrder(options);
    
    // Initialize payment using the orchestrator
    const result = await orchestrator.processPayment(nigerianOrder);
    
    if (result.success && result.finalResult?.paymentUrl) {
      return result.finalResult.paymentUrl;
    }
    
    throw new Error(result.finalResult?.error || 'Failed to initialize Nigerian payment');
  } catch (error) {
    console.error('Nigerian checkout flow failed:', error);
    
    // Fallback to traditional payment system on error
    console.log('Falling back to traditional payment system');
    return await stripeCreateCheckoutLink(options);
  }
}

/**
 * Convert traditional checkout options to Nigerian order format
 */
async function convertToNigerianOrder(options: Parameters<CreateCheckoutLink>[0]): Promise<NigerianOrder> {
  // This is a simplified conversion - in a real implementation,
  // you'd need to map product IDs to actual product data
  const productData = await getProductData(options.productId);
  
  // Generate a unique order ID and number
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const orderNumber = `ORD-${Date.now()}`;
  
  // Convert amount if needed (assuming productId contains price info or fetch from database)
  const amount = productData?.amount || 10000; // Default to 10,000 NGN
  
  return {
    id: orderId,
    orderNumber,
    totalAmount: amount,
    currency: 'NGN',
    customer: {
      email: options.email || '',
      phone: await getCustomerPhone(options) || '+2348000000000', // Default Nigerian number
      name: options.name || 'Customer',
      state: 'Lagos',
      lga: 'Lagos Island'
    },
    items: [{
      name: productData?.name || 'Digital Product',
      quantity: options.seats || 1,
      unitPrice: amount / (options.seats || 1)
    }],
    deliveryAddress: await getDeliveryAddress(options),
    deliveryFee: 0 // Digital products typically have no delivery fee
  };
}

/**
 * Get product data from product ID
 */
async function getProductData(productId: string): Promise<{ name: string; amount: number } | null> {
  // This should integrate with your product database
  // For now, return mock data based on product ID patterns
  
  if (productId.includes('subscription')) {
    return {
      name: 'Monthly Subscription',
      amount: 5000 // 50 NGN
    };
  }
  
  if (productId.includes('one-time')) {
    return {
      name: 'One-time Purchase',
      amount: 10000 // 100 NGN
    };
  }
  
  // Default product
  return {
    name: 'Digital Product',
    amount: 10000 // 100 NGN
  };
}

/**
 * Get customer phone number from options or database
 */
async function getCustomerPhone(options: Parameters<CreateCheckoutLink>[0]): Promise<string | null> {
  // This should integrate with your user database to fetch phone number
  // For now, return a default Nigerian number
  return '+2348000000000';
}

/**
 * Get delivery address from options or use digital default
 */
async function getDeliveryAddress(options: Parameters<CreateCheckoutLink>[0]): Promise<string | undefined> {
  // For digital products, delivery address might not be needed
  // This could be enhanced to support physical product deliveries
  return undefined;
}
