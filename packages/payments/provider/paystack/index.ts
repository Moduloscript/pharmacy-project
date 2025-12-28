/**
 * Paystack Payment Provider for Nigerian Payments
 * Tertiary payment gateway with comprehensive Nigerian payment method support
 */

import type {
  NigerianPaymentProvider,
  NigerianOrder,
  PaymentInitResponse,
  PaymentVerifyResponse,
  WebhookResponse,
  GatewayHealthResponse,
} from '../../types';
import { NigerianPaymentError, NIGERIAN_PAYMENT_ERRORS } from '../../types';
import {
  validateNigerianPhone,
  normalizeNigerianPhone,
  validatePaymentAmount,
  validateEmail,
  nairaToKobo,
  koboToNaira,
  generateNigerianPaymentReference,
  getNigerianErrorMessage,
} from '../../src/lib/nigerian-utils';
import crypto from 'crypto';

interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  // Note: Paystack uses the same secretKey for webhook signature verification
  // (no separate webhook secret like some other providers)
  baseUrl?: string;
  environment?: 'sandbox' | 'production';
}

interface PaystackInitializePayload {
  reference: string;
  amount: number;
  currency: 'NGN';
  email: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
  split?: any;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
}

interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data?: T;
}

interface PaystackPaymentData {
  id: number;
  domain: string;
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  amount: number;
  message: string;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  fees: number;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: Record<string, any>;
    risk_action: string;
  };
  plan: any;
  integration: number;
  subaccount: any;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string;
  };
  plan_object: any;
  order_id: string;
  paidAt: string | null;
  createdAt: string;
  metadata: Record<string, any>;
  requested_amount: number;
  transaction_date: string;
  plan_passport: any;
  payment_reference?: string;
}

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export class PaystackProvider implements NigerianPaymentProvider {
  private config: PaystackConfig;
  private baseUrl: string;

  constructor(config: PaystackConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl ||
      (config.environment === 'production'
        ? 'https://api.paystack.co'
        : 'https://api.paystack.co'
      );

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.publicKey || !this.config.secretKey) {
      throw new NigerianPaymentError(
        'Paystack API keys are required',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK'
      );
    }
  }

  getGatewayName(): 'PAYSTACK' {
    return 'PAYSTACK';
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'bank',
      'ussd',
      'qr',
      'mobile_money',
      'bank_transfer',
      'apple_pay',
      'visa'
    ];
  }

  /**
   * Initialize payment with Paystack
   */
  async initializePayment(order: NigerianOrder): Promise<PaymentInitResponse> {
    try {
      // Validate order data
      this.validateOrder(order);

      const reference = order.orderNumber || generateNigerianPaymentReference('PS');

      const payload: PaystackInitializePayload = {
        reference,
        amount: nairaToKobo(order.totalAmount),
        currency: 'NGN',
        email: order.customer.email,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        channels: ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer'],
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          deliveryAddress: order.deliveryAddress,
          deliveryFee: order.deliveryFee,
          items: order.items,
          customerName: order.customer.name,
          customerPhone: normalizeNigerianPhone(order.customer.phone),
          platform: 'BenPharm Online',
        },
        // transaction_charge: Math.round(nairaToKobo(100)), // Removed hardcoded charge
        bearer: 'account',
      };

      console.log('Initializing Paystack payment:', {
        reference,
        amount: payload.amount
      });

      const response = await this.makeApiCall<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>('/transaction/initialize', 'POST', payload);

      if (response.status === true && response.data) {
        return {
          success: true,
          paymentUrl: response.data.authorization_url,
          reference: response.data.reference,
          gateway: 'PAYSTACK',
          meta: {
            accessCode: response.data.access_code,
            paymentId: reference,
          },
        };
      }

      throw new NigerianPaymentError(
        response.message || 'Payment initialization failed',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK'
      );

    } catch (error) {
      console.error('Paystack payment initialization failed:', error);

      if (error instanceof NigerianPaymentError) {
        throw error;
      }

      throw new NigerianPaymentError(
        'Failed to initialize payment with Paystack',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK',
        error
      );
    }
  }

  /**
   * Verify payment status with Paystack
   */
  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      console.log('Verifying payment with Paystack:', reference);

      const response = await this.makeApiCall<PaystackPaymentData>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        'GET'
      );

      if (response.status === true && response.data) {
        const payment = response.data;

        return {
          success: true,
          status: this.mapPaystackStatus(payment.status),
          amount: koboToNaira(payment.amount),
          currency: payment.currency,
          reference: payment.reference,
          gatewayReference: payment.id.toString(),
          gatewayFee: koboToNaira(payment.fees),
          paymentMethod: payment.channel,
          gatewayResponse: payment,
        };
      }

      return {
        success: false,
        status: 'FAILED',
        amount: 0,
        currency: 'NGN',
        reference,
        error: response.message || 'Payment verification failed',
      };

    } catch (error) {
      console.error('Paystack payment verification failed:', error);

      return {
        success: false,
        status: 'FAILED',
        amount: 0,
        currency: 'NGN',
        reference,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Handle webhook from Paystack
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResponse> {
    try {
      // Verify webhook signature using secretKey (Paystack uses same key for API and webhooks)
      if (signature && this.config.secretKey) {
        const isValid = this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          throw new NigerianPaymentError(
            'Invalid webhook signature',
            NIGERIAN_PAYMENT_ERRORS.WEBHOOK_VERIFICATION_FAILED,
            'PAYSTACK'
          );
        }
      }

      // Process webhook payload
      if (payload.event === 'charge.success') {
        const data = payload.data;

        return {
          success: true,
          processed: true,
          orderId: data.reference,
          paymentStatus: this.mapPaystackStatus(data.status),
        };
      }

      if (payload.event === 'charge.failed') {
        const data = payload.data;

        return {
          success: true,
          processed: true,
          orderId: data.reference,
          paymentStatus: this.mapPaystackStatus(data.status),
        };
      }

      return {
        success: true,
        processed: false,
      };

    } catch (error) {
      console.error('Paystack webhook processing failed:', error);

      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  /**
   * Check Paystack gateway health
   */
  async checkGatewayHealth(): Promise<GatewayHealthResponse> {
    const startTime = Date.now();

    try {
      // Make a simple API call to check health
      await this.makeApiCall('/banks', 'GET');

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Get list of Nigerian banks for bank transfer
   */
  async getNigerianBanks(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await this.makeApiCall<PaystackBank[]>(
        '/bank?country=nigeria&perPage=100',
        'GET'
      );

      if (response.data) {
        return response.data.map(bank => ({
          code: bank.code,
          name: bank.name,
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to get Nigerian banks:', error);
      return [];
    }
  }

  /**
   * Initialize bank transfer payment
   */
  async initializeBankTransfer(order: NigerianOrder): Promise<PaymentInitResponse> {
    try {
      this.validateOrder(order);

      const reference = order.orderNumber || generateNigerianPaymentReference('PS_BT');

      const payload = {
        email: order.customer.email,
        amount: nairaToKobo(order.totalAmount),
        reference,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          deliveryAddress: order.deliveryAddress,
          deliveryFee: order.deliveryFee,
          items: order.items,
          customerName: order.customer.name,
          customerPhone: normalizeNigerianPhone(order.customer.phone),
          platform: 'BenPharm Online',
        },
      };

      const response = await this.makeApiCall<any>(
        '/transaction/initialize',
        'POST',
        {
          ...payload,
          channels: ['bank_transfer'],
        }
      );

      if (response.status === true && response.data) {
        return {
          success: true,
          paymentUrl: response.data.authorization_url,
          reference: response.data.reference,
          gateway: 'PAYSTACK',
          meta: {
            accessCode: response.data.access_code,
            // transferDetails: response.data.transferDetails, // Not returned by initialize endpoint
          },
        };
      }

      throw new NigerianPaymentError(
        response.message || 'Bank transfer initialization failed',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK'
      );

    } catch (error) {
      console.error('Paystack bank transfer initialization failed:', error);

      if (error instanceof NigerianPaymentError) {
        throw error;
      }

      throw new NigerianPaymentError(
        'Failed to initialize bank transfer with Paystack',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK',
        error
      );
    }
  }

  /**
   * Generate USSD payment reference for Nigerian banks
   */
  async generateUSSDPayment(order: NigerianOrder, bankCode?: string): Promise<{
    ussdCode?: string;
    reference?: string;
    instructions?: string;
    error?: string;
  }> {
    try {
      const reference = order.orderNumber || generateNigerianPaymentReference('PS_USSD');

      // Initialize USSD payment
      const payload = {
        email: order.customer.email,
        amount: nairaToKobo(order.totalAmount),
        reference,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          platform: 'BenPharm Online',
        },
      };

      if (bankCode) {
        (payload as any).metadata.bankCode = bankCode;
      }

      const response = await this.makeApiCall<any>(
        '/transaction/initialize',
        'POST',
        {
          ...payload,
          channels: ['ussd'],
        }
      );

      if (response.status === true && response.data) {
        return {
          reference: response.data.reference,
          // ussdCode: response.data.ussdCode, // Not returned by initialize endpoint
          // instructions: `Dial ${response.data.ussdCode} to complete payment of ₦${order.totalAmount}`,
          // Return the auth URL instead, as that's what initialize returns
          ussdCode: response.data.authorization_url, 
          instructions: `Visit ${response.data.authorization_url} to complete payment`,
        };
      }

      throw new NigerianPaymentError(
        response.message || 'USSD payment generation failed',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'PAYSTACK'
      );

    } catch (error) {
      console.error('Paystack USSD payment generation failed:', error);

      return {
        error: error instanceof Error ? error.message : 'USSD generation failed',
      };
    }
  }

  // Private helper methods

  private validateOrder(order: NigerianOrder): void {
    if (!validatePaymentAmount(order.totalAmount)) {
      throw new NigerianPaymentError(
        'Invalid payment amount',
        NIGERIAN_PAYMENT_ERRORS.INVALID_AMOUNT,
        'PAYSTACK'
      );
    }

    if (!validateEmail(order.customer.email)) {
      throw new NigerianPaymentError(
        'Invalid customer email',
        NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE,
        'PAYSTACK'
      );
    }

    if (!validateNigerianPhone(order.customer.phone)) {
      throw new NigerianPaymentError(
        'Invalid Nigerian phone number',
        NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE,
        'PAYSTACK'
      );
    }

    if (order.currency !== 'NGN') {
      throw new NigerianPaymentError(
        'Only Nigerian Naira (NGN) is supported',
        NIGERIAN_PAYMENT_ERRORS.INVALID_CURRENCY,
        'PAYSTACK'
      );
    }
  }

  private async makeApiCall<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<PaystackResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.secretKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`Paystack API call failed (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  private mapPaystackStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' {
    switch (status) {
      case 'success':
        return 'SUCCESS';
      case 'failed':
        return 'FAILED';
      case 'pending':
        return 'PENDING';
      case 'abandoned':
        return 'ABANDONED';
      default:
        return 'FAILED';
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Paystack uses the same secret key for webhook verification
    if (!this.config.secretKey) return true; // Skip verification if no secret

    const hash = crypto
      .createHmac('sha512', this.config.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}

// Factory function to create Paystack provider
export function createPaystackProvider(config?: Partial<PaystackConfig>): PaystackProvider {
  const defaultConfig: PaystackConfig = {
    publicKey: process.env.PAYSTACK_PUBLIC_KEY!,
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
    // Paystack uses secretKey for webhook verification (no separate webhook secret)
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
    ...config,
  };

  return new PaystackProvider(defaultConfig);
}

export default PaystackProvider;