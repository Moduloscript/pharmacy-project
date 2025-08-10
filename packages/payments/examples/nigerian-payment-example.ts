/**
 * Example: Nigerian Payment System Implementation
 * Demonstrates how to integrate Flutterwave with fallback orchestration
 */

import {
  FlutterwaveProvider,
  createFlutterwaveProvider,
  PaymentOrchestrator,
  getPaymentOrchestrator,
  validateNigerianPhone,
  formatNaira,
  generateNigerianPaymentReference,
  calculateGatewayFee,
} from '@repo/payments';

import type {
  NigerianOrder,
  PaymentInitResponse,
  PaymentVerifyResponse,
  WebhookResponse
} from '@repo/payments';

/**
 * Initialize the Nigerian Payment System
 */
export class BenPharmPaymentSystem {
  private orchestrator: PaymentOrchestrator;

  constructor() {
    // Get the payment orchestrator instance
    this.orchestrator = getPaymentOrchestrator({
      enableFallback: true,
      timeoutMs: 30000,
      maxRetries: 2,
    });

    // Initialize payment providers
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Create Flutterwave provider (primary)
    const flutterwaveProvider = createFlutterwaveProvider({
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });

    // Register providers with orchestrator
    this.orchestrator.registerProvider(flutterwaveProvider);

    console.log('✅ Nigerian payment providers initialized');
    console.log('🔄 Flutterwave registered as primary gateway');
  }

  /**
   * Create a payment session for a pharmacy order
   */
  async createPayment(orderData: {
    orderId: string;
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    customerState?: string;
    customerLGA?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
    deliveryAddress: string;
    deliveryFee: number;
  }): Promise<PaymentInitResponse> {
    try {
      // Validate customer data
      if (!validateNigerianPhone(orderData.customerPhone)) {
        throw new Error('Invalid Nigerian phone number format');
      }

      // Calculate total amount
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );
      const totalAmount = subtotal + orderData.deliveryFee;

      // Generate order reference
      const orderReference = generateNigerianPaymentReference('BP');

      // Create Nigerian order object
      const nigerianOrder: NigerianOrder = {
        id: orderData.orderId,
        orderNumber: orderReference,
        totalAmount,
        currency: 'NGN',
        customer: {
          email: orderData.customerEmail,
          phone: orderData.customerPhone,
          name: orderData.customerName,
          state: orderData.customerState,
          lga: orderData.customerLGA,
        },
        items: orderData.items,
        deliveryAddress: orderData.deliveryAddress,
        deliveryFee: orderData.deliveryFee,
      };

      // Log payment attempt
      console.log(`💳 Initializing payment for order ${orderReference}`);
      console.log(`💰 Total amount: ${formatNaira(totalAmount)}`);
      console.log(`📱 Customer: ${orderData.customerName} (${orderData.customerPhone})`);

      // Process payment with automatic fallback
      const result = await this.orchestrator.processPayment(nigerianOrder);

      console.log(`✅ Payment initialized with ${result.gateway}`);
      console.log(`🔗 Payment URL: ${result.finalResult?.paymentUrl}`);

      return result.finalResult!;

    } catch (error) {
      console.error('❌ Payment initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      console.log(`🔍 Verifying payment: ${reference}`);

      const result = await this.orchestrator.verifyPayment(reference);

      console.log(`📊 Payment verification result:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Amount: ${formatNaira(result.amount)}`);
      console.log(`   Gateway: ${result.gatewayReference}`);

      return result;

    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      throw error;
    }
  }

  /**
   * Handle webhook from payment gateways
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResponse> {
    try {
      console.log('📨 Processing payment webhook');

      const result = await this.orchestrator.handleWebhook(payload, signature);

      if (result.processed) {
        console.log(`✅ Webhook processed for order: ${result.orderId}`);
        console.log(`📊 Payment status: ${result.paymentStatus}`);

        // Update order status in database
        await this.updateOrderStatus(result.orderId!, result.paymentStatus!);
      }

      return result;

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Get payment gateway statistics
   */
  getGatewayStats() {
    const stats = this.orchestrator.getGatewayStats();
    
    console.log('📊 Payment Gateway Statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat.gateway}:`);
      console.log(`     Status: ${stat.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`     Response Time: ${stat.responseTime}ms`);
      console.log(`     Last Checked: ${stat.lastChecked.toLocaleString()}`);
      console.log(`     Supported Methods: ${stat.supportedMethods.join(', ')}`);
    });

    return stats;
  }

  /**
   * Calculate fees for display to customer
   */
  calculatePaymentFees(amount: number) {
    const flutterwaveFee = calculateGatewayFee(amount, 'FLUTTERWAVE');
    
    return {
      amount: formatNaira(amount),
      flutterwaveFee: formatNaira(flutterwaveFee),
      total: formatNaira(amount + flutterwaveFee),
      breakdown: {
        subtotal: amount,
        gatewayFee: flutterwaveFee,
        total: amount + flutterwaveFee,
      }
    };
  }

  /**
   * Update order status in database (implement based on your database)
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    // TODO: Implement database update logic
    // Example using Prisma:
    /*
    await db.order.update({
      where: { orderNumber: orderId },
      data: { 
        paymentStatus: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        updatedAt: new Date(),
      },
    });
    */

    console.log(`🔄 Order ${orderId} status updated to: ${status}`);
  }

  /**
   * Get recommended payment method for customer
   */
  getRecommendedPaymentMethod(customerState?: string, customerCity?: string) {
    const gateway = this.orchestrator.getRecommendedGateway({ 
      state: customerState || 'Lagos', 
      city: customerCity || 'Lagos' 
    });

    const recommendations = {
      FLUTTERWAVE: {
        name: 'Flutterwave',
        methods: ['💳 Debit/Credit Card', '🏦 Bank Transfer', '📱 USSD', '💰 Mobile Money'],
        description: 'Fast and secure payments with all major Nigerian banks',
        estimatedTime: 'Instant to 5 minutes',
        fee: '1.4% + ₦50',
      }
    };

    return {
      recommended: gateway,
      details: recommendations[gateway as keyof typeof recommendations],
    };
  }
}

/**
 * Example usage in your application
 */
export async function exampleUsage() {
  const paymentSystem = new BenPharmPaymentSystem();

  try {
    // Example order data
    const orderData = {
      orderId: 'order_123',
      customerId: 'customer_456',
      customerEmail: 'customer@benpharm.ng',
      customerPhone: '+2348012345678',
      customerName: 'John Doe',
      customerState: 'Edo',
      customerLGA: 'Oredo',
      items: [
        { name: 'Paracetamol 500mg', quantity: 2, unitPrice: 500 },
        { name: 'Vitamin C 1000mg', quantity: 1, unitPrice: 4000 },
      ],
      deliveryAddress: '123 Medical Street, Benin City',
      deliveryFee: 1000,
    };

    // Step 1: Create payment
    const paymentResult = await paymentSystem.createPayment(orderData);
    
    console.log('Payment URL:', paymentResult.paymentUrl);
    console.log('Reference:', paymentResult.reference);

    // Step 2: Customer pays on gateway page (external)

    // Step 3: Verify payment (typically done after redirect/webhook)
    const verificationResult = await paymentSystem.verifyPayment(paymentResult.reference);
    
    console.log('Payment Status:', verificationResult.status);
    console.log('Amount Paid:', formatNaira(verificationResult.amount));

    // Step 4: Handle webhook (when payment is completed)
    const webhookPayload = {
      event: 'charge.completed',
      data: {
        tx_ref: paymentResult.reference,
        status: 'successful',
        amount: 500000, // In kobo
        currency: 'NGN',
      },
    };

    const webhookResult = await paymentSystem.handleWebhook(webhookPayload);
    console.log('Webhook Processed:', webhookResult.processed);

  } catch (error) {
    console.error('Payment example failed:', error);
  }
}

/**
 * Example API routes for Next.js application
 */
export const paymentAPIExamples = {
  /**
   * POST /api/payments/initialize
   */
  initializePayment: `
    import { BenPharmPaymentSystem } from '@/lib/payments';
    
    export async function POST(request: Request) {
      const paymentSystem = new BenPharmPaymentSystem();
      
      try {
        const orderData = await request.json();
        const result = await paymentSystem.createPayment(orderData);
        
        return Response.json({ 
          success: true, 
          data: result 
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: error.message 
        }, { status: 400 });
      }
    }
  `,

  /**
   * POST /api/payments/verify
   */
  verifyPayment: `
    export async function POST(request: Request) {
      const paymentSystem = new BenPharmPaymentSystem();
      
      try {
        const { reference } = await request.json();
        const result = await paymentSystem.verifyPayment(reference);
        
        return Response.json({ 
          success: true, 
          data: result 
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: error.message 
        }, { status: 400 });
      }
    }
  `,

  /**
   * POST /api/payments/webhook
   */
  handleWebhook: `
    export async function POST(request: Request) {
      const paymentSystem = new BenPharmPaymentSystem();
      
      try {
        const payload = await request.json();
        const signature = request.headers.get('x-flutterwave-signature');
        
        const result = await paymentSystem.handleWebhook(payload, signature);
        
        return Response.json({ 
          success: true, 
          processed: result.processed 
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: error.message 
        }, { status: 400 });
      }
    }
  `,
};

// Export the payment system for use in your application
export default BenPharmPaymentSystem;
