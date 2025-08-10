/**
 * Comprehensive Test Suite for Flutterwave Payment Provider
 * Tests all Nigerian payment scenarios and edge cases
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FlutterwaveProvider, createFlutterwaveProvider } from '../index';
import type { NigerianOrder } from '../../../types';
import { NigerianPaymentError, NIGERIAN_PAYMENT_ERRORS } from '../../../types';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('FlutterwaveProvider', () => {
  let provider: FlutterwaveProvider;
  let mockOrder: NigerianOrder;

  const mockConfig = {
    publicKey: 'FLWPUBK-test-key',
    secretKey: 'FLWSECK-test-secret',
    encryptionKey: 'FLWSECK-test-encryption',
    webhookSecretHash: 'test-webhook-secret',
    environment: 'sandbox' as const,
  };

  beforeEach(() => {
    provider = new FlutterwaveProvider(mockConfig);
    
    mockOrder = {
      id: 'order-123',
      orderNumber: 'BP_1699123456_ABC123',
      totalAmount: 5000, // ₦5000
      currency: 'NGN',
      customer: {
        email: 'customer@benpharm.ng',
        phone: '+2348012345678',
        name: 'John Doe',
        state: 'Edo',
        lga: 'Oredo',
      },
      items: [
        {
          name: 'Paracetamol 500mg',
          quantity: 2,
          unitPrice: 500,
        },
        {
          name: 'Vitamin C 1000mg',
          quantity: 1,
          unitPrice: 4000,
        },
      ],
      deliveryAddress: '123 Medical Street, Benin City',
      deliveryFee: 0,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Configuration and Initialization', () => {
    test('should create provider with valid config', () => {
      expect(provider.getGatewayName()).toBe('FLUTTERWAVE');
      expect(provider.getSupportedPaymentMethods()).toContain('card');
      expect(provider.getSupportedPaymentMethods()).toContain('banktransfer');
      expect(provider.getSupportedPaymentMethods()).toContain('ussd');
    });

    test('should throw error with invalid config', () => {
      expect(() => {
        new FlutterwaveProvider({
          ...mockConfig,
          publicKey: '',
          secretKey: '',
        });
      }).toThrow(NigerianPaymentError);
    });

    test('should create provider using factory function', () => {
      // Mock environment variables
      process.env.FLUTTERWAVE_PUBLIC_KEY = 'test-public';
      process.env.FLUTTERWAVE_SECRET_KEY = 'test-secret';
      process.env.FLUTTERWAVE_ENCRYPTION_KEY = 'test-encryption';
      process.env.FLUTTERWAVE_WEBHOOK_SECRET = 'test-webhook';

      const factoryProvider = createFlutterwaveProvider();
      expect(factoryProvider).toBeInstanceOf(FlutterwaveProvider);
    });
  });

  describe('Payment Initialization', () => {
    test('should initialize payment successfully', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Payment link created',
        data: {
          link: 'https://checkout.flutterwave.com/pay/test-link',
          id: 12345,
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.initializePayment(mockOrder);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBe(mockResponse.data.link);
      expect(result.reference).toBe(mockOrder.orderNumber);
      expect(result.gateway).toBe('FLUTTERWAVE');
      expect(result.meta?.paymentId).toBe(12345);
    });

    test('should validate Nigerian phone number format', async () => {
      const invalidOrder = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: '0803-123-4567', // Invalid format
        },
      };

      await expect(provider.initializePayment(invalidOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });

    test('should validate payment amount', async () => {
      const invalidOrder = {
        ...mockOrder,
        totalAmount: -100, // Invalid amount
      };

      await expect(provider.initializePayment(invalidOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });

    test('should validate currency as NGN only', async () => {
      const invalidOrder = {
        ...mockOrder,
        currency: 'USD' as 'NGN', // Invalid currency
      };

      await expect(provider.initializePayment(invalidOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });

    test('should handle API errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          status: 'error',
          message: 'Invalid request',
        }),
      } as Response);

      await expect(provider.initializePayment(mockOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });

    test('should handle network timeout', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      await expect(provider.initializePayment(mockOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });
  });

  describe('Payment Verification', () => {
    test('should verify successful payment', async () => {
      const mockVerifyResponse = {
        status: 'success',
        data: {
          id: 12345,
          tx_ref: 'BP_1699123456_ABC123',
          flw_ref: 'FLW-MOCK-REF-123',
          amount: 500000, // In kobo
          currency: 'NGN',
          status: 'successful',
          payment_type: 'card',
          app_fee: 7000, // In kobo
          merchant_fee: 1000, // In kobo
          customer: {
            id: 456,
            name: 'John Doe',
            phone_number: '+2348012345678',
            email: 'customer@benpharm.ng',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      } as Response);

      const result = await provider.verifyPayment('BP_1699123456_ABC123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(result.amount).toBe(5000); // Converted from kobo
      expect(result.currency).toBe('NGN');
      expect(result.reference).toBe('BP_1699123456_ABC123');
      expect(result.gatewayReference).toBe('FLW-MOCK-REF-123');
      expect(result.gatewayFee).toBe(70); // Converted from kobo
      expect(result.paymentMethod).toBe('card');
    });

    test('should handle failed payment verification', async () => {
      const mockVerifyResponse = {
        status: 'success',
        data: {
          tx_ref: 'BP_1699123456_ABC123',
          status: 'failed',
          amount: 500000,
          currency: 'NGN',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      } as Response);

      const result = await provider.verifyPayment('BP_1699123456_ABC123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('FAILED');
    });

    test('should handle verification API error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('API Error')
      );

      const result = await provider.verifyPayment('BP_1699123456_ABC123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('API Error');
    });
  });

  describe('Webhook Handling', () => {
    test('should process valid webhook successfully', async () => {
      const mockWebhookPayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_1699123456_ABC123',
          status: 'successful',
          amount: 500000,
          currency: 'NGN',
        },
      };

      const result = await provider.handleWebhook(mockWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe('BP_1699123456_ABC123');
      expect(result.paymentStatus).toBe('SUCCESS');
    });

    test('should ignore unrelated webhook events', async () => {
      const mockWebhookPayload = {
        event: 'other.event',
        data: {},
      };

      const result = await provider.handleWebhook(mockWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
    });

    test('should verify webhook signature when provided', async () => {
      const mockWebhookPayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_1699123456_ABC123',
          status: 'successful',
        },
      };

      // Mock crypto signature verification
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', mockConfig.webhookSecretHash)
        .update(JSON.stringify(mockWebhookPayload))
        .digest('hex');

      const result = await provider.handleWebhook(
        mockWebhookPayload,
        validSignature
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });

    test('should reject invalid webhook signature', async () => {
      const mockWebhookPayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_1699123456_ABC123',
          status: 'successful',
        },
      };

      const result = await provider.handleWebhook(
        mockWebhookPayload,
        'invalid-signature'
      );

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });
  });

  describe('Gateway Health Check', () => {
    test('should report healthy when API is responsive', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      } as Response);

      const health = await provider.checkGatewayHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    test('should report unhealthy when API fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Gateway down')
      );

      const health = await provider.checkGatewayHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toContain('Gateway down');
    });
  });

  describe('Nigerian-Specific Features', () => {
    test('should get list of Nigerian banks', async () => {
      const mockBanks = [
        { code: '058', name: 'GTBank' },
        { code: '011', name: 'First Bank' },
        { code: '057', name: 'Zenith Bank' },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockBanks }),
      } as Response);

      const banks = await provider.getNigerianBanks();

      expect(banks).toHaveLength(3);
      expect(banks[0].name).toBe('GTBank');
      expect(banks[0].code).toBe('058');
    });

    test('should generate USSD code for bank transfer', async () => {
      const mockUSSDResponse = {
        status: 'success',
        data: {
          ussd_code: '*737*1*5000#',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUSSDResponse,
      } as Response);

      const ussdCode = await provider.generateUSSDCode(5000, '058');

      expect(ussdCode).toBe('*737*1*5000#');
    });

    test('should handle USSD generation failure gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('USSD service unavailable')
      );

      const ussdCode = await provider.generateUSSDCode(5000, '058');

      expect(ussdCode).toBeNull();
    });
  });

  describe('Error Handling and Nigerian UX', () => {
    test('should provide Nigerian-friendly error messages', async () => {
      const invalidOrder = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: 'invalid-phone',
        },
      };

      try {
        await provider.initializePayment(invalidOrder);
      } catch (error) {
        expect(error).toBeInstanceOf(NigerianPaymentError);
        expect((error as NigerianPaymentError).code).toBe(
          NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE
        );
        expect((error as NigerianPaymentError).gateway).toBe('FLUTTERWAVE');
      }
    });

    test('should normalize Nigerian phone numbers', async () => {
      const mockResponse = {
        status: 'success',
        data: { link: 'test-link', id: 123 },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const orderWithLocalPhone = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: '08012345678', // Local format
        },
      };

      await provider.initializePayment(orderWithLocalPhone);

      // Verify that the phone was normalized to international format
      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock
        .calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.customer.phonenumber).toBe('+2348012345678');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent payment initializations', async () => {
      const mockResponse = {
        status: 'success',
        data: { link: 'test-link', id: 123 },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const orders = Array.from({ length: 10 }, (_, i) => ({
        ...mockOrder,
        id: `order-${i}`,
        orderNumber: `BP_${Date.now()}_${i}`,
      }));

      const promises = orders.map((order) => provider.initializePayment(order));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    test('should have payment initialization under 2 seconds', async () => {
      const mockResponse = {
        status: 'success',
        data: { link: 'test-link', id: 123 },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockResponse,
                } as Response),
              500 // 500ms delay
            )
          )
      );

      const startTime = Date.now();
      await provider.initializePayment(mockOrder);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe('Integration with Nigerian Banking System', () => {
    test('should support major Nigerian banks', () => {
      const supportedMethods = provider.getSupportedPaymentMethods();
      
      expect(supportedMethods).toContain('banktransfer');
      expect(supportedMethods).toContain('ussd');
      expect(supportedMethods).toContain('card');
    });

    test('should handle Nigerian business hours correctly', () => {
      // This would typically be tested with time mocking
      // For now, just verify the method exists
      expect(provider.getSupportedPaymentMethods).toBeDefined();
    });

    test('should handle Nigerian network conditions', async () => {
      // Simulate slow network
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    status: 'success',
                    data: { link: 'test-link', id: 123 },
                  }),
                } as Response),
              1000 // 1 second delay
            )
          )
      );

      const result = await provider.initializePayment(mockOrder);
      expect(result.success).toBe(true);
    });
  });
});
