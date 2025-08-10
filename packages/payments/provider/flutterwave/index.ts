/**
 * Flutterwave Payment Provider for Nigerian Payments
 * Primary payment gateway with comprehensive Nigerian payment method support
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

interface FlutterwaveConfig {
  publicKey: string;
  secretKey: string;
  encryptionKey: string;
  webhookSecretHash: string;
  baseUrl?: string;
  environment?: 'sandbox' | 'production';
}

interface FlutterwaveInitializePayload {
  tx_ref: string;
  amount: number;
  currency: 'NGN';
  redirect_url: string;
  payment_options?: string;
  customer: {
    email: string;
    phonenumber: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: Record<string, any>;
}

interface FlutterwaveResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

interface FlutterwavePaymentData {
  id: number;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  processor_response: string;
  auth_model: string;
  ip: string;
  narration: string;
  status: 'successful' | 'failed' | 'pending';
  payment_type: string;
  created_at: string;
  account_id: number;
  customer: {
    id: number;
    name: string;
    phone_number: string;
    email: string;
    created_at: string;
  };
  link: string;
}

export class FlutterwaveProvider implements NigerianPaymentProvider {
  private config: FlutterwaveConfig;
  private baseUrl: string;

  constructor(config: FlutterwaveConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 
      (config.environment === 'production' 
        ? 'https://api.flutterwave.com/v3' 
        : 'https://api.flutterwave.com/v3'
      );
    
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.publicKey || !this.config.secretKey) {
      throw new NigerianPaymentError(
        'Flutterwave API keys are required',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'FLUTTERWAVE'
      );
    }
  }

  getGatewayName(): 'FLUTTERWAVE' {
    return 'FLUTTERWAVE';
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'banktransfer', 
      'ussd',
      'mobilemoney',
      'mpesa',
      'qr',
      'opay',
      'fawrypay'
    ];
  }

  /**
   * Initialize payment with Flutterwave
   */
  async initializePayment(order: NigerianOrder): Promise<PaymentInitResponse> {
    try {
      // Validate order data
      this.validateOrder(order);

      const payload: FlutterwaveInitializePayload = {
        tx_ref: order.orderNumber,
        amount: order.totalAmount,
        currency: 'NGN',
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`,
        payment_options: 'card,banktransfer,ussd,mobilemoney',
        customer: {
          email: order.customer.email,
          phonenumber: normalizeNigerianPhone(order.customer.phone),
          name: order.customer.name,
        },
        customizations: {
          title: 'BenPharm Online',
          description: `Payment for Order ${order.orderNumber}`,
          logo: process.env.NEXT_PUBLIC_LOGO_URL || undefined,
        },
        meta: {
          orderId: order.id,
          deliveryAddress: order.deliveryAddress,
          deliveryFee: order.deliveryFee,
          items: order.items,
        },
      };

      console.log('Initializing Flutterwave payment:', { 
        tx_ref: payload.tx_ref, 
        amount: payload.amount 
      });

      const response = await this.makeApiCall<{
        link: string;
        id: number;
      }>('/payments', 'POST', payload);

      if (response.status === 'success' && response.data) {
        return {
          success: true,
          paymentUrl: response.data.link,
          reference: order.orderNumber,
          gateway: 'FLUTTERWAVE',
          meta: {
            paymentId: response.data.id,
            flutterwaveRef: response.data.id.toString(),
          },
        };
      }

      throw new NigerianPaymentError(
        response.message || 'Payment initialization failed',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'FLUTTERWAVE'
      );

    } catch (error) {
      console.error('Flutterwave payment initialization failed:', error);
      
      if (error instanceof NigerianPaymentError) {
        throw error;
      }

      throw new NigerianPaymentError(
        'Failed to initialize payment with Flutterwave',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
        'FLUTTERWAVE',
        error
      );
    }
  }

  /**
   * Verify payment status with Flutterwave
   */
  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      console.log('Verifying payment with Flutterwave:', reference);

      const response = await this.makeApiCall<FlutterwavePaymentData>(
        `/transactions/verify_by_reference?tx_ref=${reference}`,
        'GET'
      );

      if (response.status === 'success' && response.data) {
        const payment = response.data;
        
        return {
          success: true,
          status: this.mapFlutterwaveStatus(payment.status),
          amount: koboToNaira(payment.amount),
          currency: payment.currency,
          reference: payment.tx_ref,
          gatewayReference: payment.flw_ref,
          gatewayFee: koboToNaira(payment.app_fee),
          appFee: koboToNaira(payment.merchant_fee),
          paymentMethod: payment.payment_type,
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
      console.error('Flutterwave payment verification failed:', error);
      
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
   * Handle webhook from Flutterwave
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResponse> {
    try {
      // Verify webhook signature
      if (signature && this.config.webhookSecretHash) {
        const isValid = this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          throw new NigerianPaymentError(
            'Invalid webhook signature',
            NIGERIAN_PAYMENT_ERRORS.WEBHOOK_VERIFICATION_FAILED,
            'FLUTTERWAVE'
          );
        }
      }

      // Process webhook payload
      if (payload.event === 'charge.completed') {
        const data = payload.data;
        
        return {
          success: true,
          processed: true,
          orderId: data.tx_ref,
          paymentStatus: this.mapFlutterwaveStatus(data.status),
        };
      }

      return {
        success: true,
        processed: false,
      };

    } catch (error) {
      console.error('Flutterwave webhook processing failed:', error);
      
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  /**
   * Check Flutterwave gateway health
   */
  async checkGatewayHealth(): Promise<GatewayHealthResponse> {
    const startTime = Date.now();
    
    try {
      // Make a simple API call to check health
      await this.makeApiCall('/banks/NG', 'GET');
      
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
      const response = await this.makeApiCall<Array<{ code: string; name: string }>>(
        '/banks/NG',
        'GET'
      );

      return response.data || [];
    } catch (error) {
      console.error('Failed to get Nigerian banks:', error);
      return [];
    }
  }

  /**
   * Generate USSD code for bank transfer
   */
  async generateUSSDCode(amount: number, bankCode: string): Promise<string | null> {
    try {
      const response = await this.makeApiCall<{ ussd_code: string }>(
        '/charges?type=ussd',
        'POST',
        {
          amount,
          currency: 'NGN',
          bank_code: bankCode,
        }
      );

      return response.data?.ussd_code || null;
    } catch (error) {
      console.error('Failed to generate USSD code:', error);
      return null;
    }
  }

  // Private helper methods

  private validateOrder(order: NigerianOrder): void {
    if (!validatePaymentAmount(order.totalAmount)) {
      throw new NigerianPaymentError(
        'Invalid payment amount',
        NIGERIAN_PAYMENT_ERRORS.INVALID_AMOUNT,
        'FLUTTERWAVE'
      );
    }

    if (!validateEmail(order.customer.email)) {
      throw new NigerianPaymentError(
        'Invalid customer email',
        NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE,
        'FLUTTERWAVE'
      );
    }

    if (!validateNigerianPhone(order.customer.phone)) {
      throw new NigerianPaymentError(
        'Invalid Nigerian phone number',
        NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE,
        'FLUTTERWAVE'
      );
    }

    if (order.currency !== 'NGN') {
      throw new NigerianPaymentError(
        'Only Nigerian Naira (NGN) is supported',
        NIGERIAN_PAYMENT_ERRORS.INVALID_CURRENCY,
        'FLUTTERWAVE'
      );
    }
  }

  private async makeApiCall<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<FlutterwaveResponse<T>> {
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
      console.error(`Flutterwave API call failed (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  private mapFlutterwaveStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' {
    switch (status) {
      case 'successful':
        return 'SUCCESS';
      case 'failed':
        return 'FAILED';
      case 'pending':
        return 'PENDING';
      default:
        return 'ABANDONED';
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.config.webhookSecretHash) return true; // Skip verification if no secret

    const hash = crypto
      .createHmac('sha256', this.config.webhookSecretHash)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}

// Factory function to create Flutterwave provider
export function createFlutterwaveProvider(config?: Partial<FlutterwaveConfig>): FlutterwaveProvider {
  const defaultConfig: FlutterwaveConfig = {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY!,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY!,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY!,
    webhookSecretHash: process.env.FLUTTERWAVE_WEBHOOK_SECRET!,
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
    ...config,
  };

  return new FlutterwaveProvider(defaultConfig);
}

export default FlutterwaveProvider;
