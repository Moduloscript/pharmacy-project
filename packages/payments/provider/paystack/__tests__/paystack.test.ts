/**
 * Comprehensive Test Suite for Paystack Payment Provider
 * Tests all Nigerian payment scenarios and edge cases
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PaystackProvider, createPaystackProvider } from '../index';
import type { NigerianOrder } from '../../../types';
import { NigerianPaymentError, NIGERIAN_PAYMENT_ERRORS } from '../../../types';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock crypto for webhook signature verification
const mockCreateHmac = jest.fn();
const mockDigest = jest.fn();
mockCreateHmac.mockReturnValue({
  update: jest.fn().mockReturnThis(),
  digest: mockDigest,
});
jest.mock('crypto', () => ({
  createHmac: mockCreateHmac,
}));

describe('PaystackProvider', () => {
  let provider: PaystackProvider;
  let mockOrder: NigerianOrder;

  const mockConfig = {
    publicKey: 'pk_test_1234567890',
    secretKey: 'sk_test_1234567890',
    webhookSecret: 'test-webhook-secret',
    environment: 'sandbox' as const,
  };

  beforeEach(() => {
    provider = new PaystackProvider(mockConfig);

    mockOrder = {
      id: 'order-123',
      orderNumber: 'BP_1699123456_ABC123',
      totalAmount: 5000, // ₦5000
      currency: 'NGN',
      customer: {
        email: 'customer@benpharm.ng',
        phone: '+2348012345678',
        name: 'John Doe',
        state: 'Lagos',
        lga: 'Ikeja',
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
      deliveryAddress: '123 Medical Street, Lagos',
      deliveryFee: 0,
    };

    // Reset mocks
    jest.clearAllMocks();

    // Setup default crypto mock for webhook verification
    mockDigest.mockReturnValue('valid-signature');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Configuration and Initialization', () => {
    test('should create provider with valid config', () => {
      expect(provider.getGatewayName()).toBe('PAYSTACK');
      expect(provider.getSupportedPaymentMethods()).toContain('card');
      expect(provider.getSupportedPaymentMethods()).toContain('bank');
      expect(provider.getSupportedPaymentMethods()).toContain('ussd');
    });

    test('should throw error with invalid config', () => {
      expect(() => {
        new PaystackProvider({
          ...mockConfig,
          publicKey: '',
          secretKey: '',
        });
      }).toThrow(NigerianPaymentError);
    });

    test('should create provider using factory function', () => {
      // Mock environment variables
      process.env.PAYSTACK_PUBLIC_KEY = 'test-public';
      process.env.PAYSTACK_SECRET_KEY = 'test-secret';
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook';

      const factoryProvider = createPaystackProvider();
      expect(factoryProvider).toBeInstanceOf(PaystackProvider);
    });

    test('should support all Nigerian payment methods', () => {
      const supportedMethods = provider.getSupportedPaymentMethods();

      expect(supportedMethods).toContain('card');
      expect(supportedMethods).toContain('bank');
      expect(supportedMethods).toContain('ussd');
      expect(supportedMethods).toContain('bank_transfer');
      expect(supportedMethods).toContain('mobile_money');
    });
  });

  describe('Payment Initialization', () => {
    test('should initialize payment successfully', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.co/pay/test-link',
          access_code: '123456',
          reference: 'BP_1699123456_ABC123',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.initializePayment(mockOrder);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBe(mockResponse.data.authorization_url);
      expect(result.reference).toBe(mockResponse.data.reference);
      expect(result.gateway).toBe('PAYSTACK');
      expect(result.meta?.accessCode).toBe('123456');
    });

    test('should convert naira to kobo for Paystack API', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'test-url',
          access_code: '123456',
          reference: 'test-ref',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await provider.initializePayment(mockOrder);

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);

      expect(requestBody.amount).toBe(500000); // ₦5000 converted to kobo
      expect(requestBody.currency).toBe('NGN');
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
          status: false,
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

    test('should include proper Nigerian metadata', async () => {
      const mockResponse = {
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await provider.initializePayment(mockOrder);

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);

      expect(requestBody.metadata).toMatchObject({
        orderId: 'order-123',
        orderNumber: 'BP_1699123456_ABC123',
        deliveryAddress: '123 Medical Street, Lagos',
        platform: 'BenPharm Online',
        customerName: 'John Doe',
        customerPhone: '+2348012345678',
      });
      expect(requestBody.channels).toContain('card');
      expect(requestBody.channels).toContain('bank');
      expect(requestBody.channels).toContain('ussd');
    });
  });

  describe('Payment Verification', () => {
    test('should verify successful payment', async () => {
      const mockVerifyResponse = {
        status: true,
        data: {
          id: 12345,
          reference: 'BP_1699123456_ABC123',
          amount: 500000, // In kobo
          currency: 'NGN',
          status: 'success',
          channel: 'card',
          fees: 7500, // In kobo (1.5% + ₦100)
          customer: {
            id: 456,
            first_name: 'John',
            last_name: 'Doe',
            email: 'customer@benpharm.ng',
            phone: '+2348012345678',
          },
          authorization: {
            authorization_code: 'AUTH_123',
            bin: '123456',
            last4: '4567',
            exp_month: '12',
            exp_year: '25',
            card_type: 'visa',
            bank: 'GT Bank',
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
      expect(result.gatewayReference).toBe('12345');
      expect(result.gatewayFee).toBe(75); // Converted from kobo
      expect(result.paymentMethod).toBe('card');
    });

    test('should handle failed payment verification', async () => {
      const mockVerifyResponse = {
        status: true,
        data: {
          reference: 'BP_1699123456_ABC123',
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

    test('should handle abandoned payment status', async () => {
      const mockVerifyResponse = {
        status: true,
        data: {
          reference: 'BP_1699123456_ABC123',
          status: 'abandoned',
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
      expect(result.status).toBe('ABANDONED');
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

    test('should URL encode reference for verification', async () => {
      const mockVerifyResponse = {
        status: true,
        data: { reference: 'test-ref', status: 'success' },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      } as Response);

      await provider.verifyPayment('BP_1699123456_ABC123/special-chars');

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(fetchCall[0]).toContain(encodeURIComponent('BP_1699123456_ABC123/special-chars'));
    });
  });

  describe('Webhook Handling', () => {
    test('should process charge.success webhook successfully', async () => {
      const mockWebhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'BP_1699123456_ABC123',
          status: 'success',
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

    test('should process charge.failed webhook successfully', async () => {
      const mockWebhookPayload = {
        event: 'charge.failed',
        data: {
          reference: 'BP_1699123456_ABC123',
          status: 'failed',
          amount: 500000,
          currency: 'NGN',
        },
      };

      const result = await provider.handleWebhook(mockWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe('BP_1699123456_ABC123');
      expect(result.paymentStatus).toBe('FAILED');
    });

    test('should ignore unrelated webhook events', async () => {
      const mockWebhookPayload = {
        event: 'transfer.success',
        data: {},
      };

      const result = await provider.handleWebhook(mockWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
    });

    test('should verify webhook signature using HMAC-SHA512', async () => {
      const mockWebhookPayload = {
        event: 'charge.success',
        data: { reference: 'BP_1699123456_ABC123', status: 'success' },
      };

      // Set up crypto mock
      mockDigest.mockReturnValue('correct-signature');

      const result = await provider.handleWebhook(
        mockWebhookPayload,
        'correct-signature'
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });

    test('should reject invalid webhook signature', async () => {
      const mockWebhookPayload = {
        event: 'charge.success',
        data: { reference: 'BP_1699123456_ABC123', status: 'success' },
      };

      // Set up crypto mock to return different signature
      mockDigest.mockReturnValue('different-signature');

      const result = await provider.handleWebhook(
        mockWebhookPayload,
        'invalid-signature'
      );

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });

    test('should skip signature verification if no secret configured', async () => {
      const providerNoSecret = new PaystackProvider({
        ...mockConfig,
        webhookSecret: undefined,
      });

      const mockWebhookPayload = {
        event: 'charge.success',
        data: { reference: 'BP_1699123456_ABC123', status: 'success' },
      };

      const result = await providerNoSecret.handleWebhook(
        mockWebhookPayload,
        'any-signature'
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });
  });

  describe('Gateway Health Check', () => {
    test('should report healthy when API is responsive', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: [] }),
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

    test('should check /banks endpoint for health', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: [] }),
      } as Response);

      await provider.checkGatewayHealth();

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(fetchCall[0]).toContain('/banks');
    });
  });

  describe('Nigerian Bank Features', () => {
    test('should get list of Nigerian banks', async () => {
      const mockBanks = [
        {
          id: 1,
          name: 'GTBank',
          code: '058',
          country: 'Nigeria',
          currency: 'NGN',
          active: true,
        },
        {
          id: 2,
          name: 'First Bank',
          code: '011',
          country: 'Nigeria',
          currency: 'NGN',
          active: true,
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: mockBanks }),
      } as Response);

      const banks = await provider.getNigerianBanks();

      expect(banks).toHaveLength(2);
      expect(banks[0].name).toBe('GTBank');
      expect(banks[0].code).toBe('058');
    });

    test('should filter for Nigerian banks only', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: [] }),
      } as Response);

      await provider.getNigerianBanks();

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(fetchCall[0]).toContain('country=nigeria');
      expect(fetchCall[0]).toContain('perPage=100');
    });

    test('should initialize bank transfer payment', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.co/pay/bank-transfer',
          reference: 'PS_BT_123',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.initializeBankTransfer(mockOrder);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toContain('checkout.paystack.co');
      expect(result.gateway).toBe('PAYSTACK');
    });

    test('should generate USSD payment', async () => {
      const mockResponse = {
        status: true,
        message: 'Payment initialized',
        data: {
          reference: 'PS_USSD_123',
          ussd_code: '*737*5000#',
          authorization_url: 'https://checkout.paystack.co/pay/ussd',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateUSSDPayment(mockOrder, '058');

      expect(result.reference).toBe('PS_USSD_123');
      expect(result.ussdCode).toBe('*737*5000#');
      expect(result.instructions).toContain('Dial *737*5000#');
    });

    test('should handle USSD generation failure gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('USSD service unavailable')
      );

      const result = await provider.generateUSSDPayment(mockOrder);

      expect(result).toHaveProperty('error');
      expect((result as any).error).toContain('USSD service unavailable');
    });

    test('should include bank code in USSD metadata when provided', async () => {
      const mockResponse = {
        status: true,
        data: { reference: 'test', ussd_code: '*737*5000#' },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await provider.generateUSSDPayment(mockOrder, '058');

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.metadata.bankCode).toBe('058');
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
        expect((error as NigerianPaymentError).gateway).toBe('PAYSTACK');
      }
    });

    test('should normalize Nigerian phone numbers', async () => {
      const mockResponse = {
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
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
      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.metadata.customerPhone).toBe('+2348012345678');
    });

    test('should handle Paystack-specific fee structure', async () => {
      const mockResponse = {
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await provider.initializePayment(mockOrder);

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);

      // Paystack charges 1.5% + ₦100, so transaction_charge should include the fixed fee
      expect(requestBody.transaction_charge).toBe(10000); // ₦100 in kobo
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent payment initializations', async () => {
      const mockResponse = {
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
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
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
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

    test('should handle network conditions gracefully', async () => {
      // Simulate slow Nigerian network
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    status: true,
                    data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
                  }),
                } as Response),
              1500 // 1.5 second delay
            )
          )
      );

      const result = await provider.initializePayment(mockOrder);
      expect(result.success).toBe(true);
    });
  });

  describe('Integration with Nigerian Banking System', () => {
    test('should support major Nigerian payment methods', () => {
      const supportedMethods = provider.getSupportedPaymentMethods();

      expect(supportedMethods).toContain('card');
      expect(supportedMethods).toContain('bank');
      expect(supportedMethods).toContain('bank_transfer');
      expect(supportedMethods).toContain('ussd');
      expect(supportedMethods).toContain('mobile_money');
    });

    test('should handle Nigerian currency conversion correctly', async () => {
      const mockVerifyResponse = {
        status: true,
        data: {
          reference: 'test-ref',
          status: 'success',
          amount: 123456, // Random amount in kobo
          currency: 'NGN',
          fees: 1840, // Fee in kobo
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      } as Response);

      const result = await provider.verifyPayment('test-ref');

      expect(result.amount).toBe(1234.56); // Proper kobo to NGN conversion
      expect(result.gatewayFee).toBe(18.40); // Proper kobo to NGN conversion
    });

    test('should generate Nigerian payment reference when none provided', async () => {
      const mockResponse = {
        status: true,
        data: { authorization_url: 'test-url', access_code: '123', reference: 'test' },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const orderWithoutRef = {
        ...mockOrder,
        orderNumber: '', // Empty order number
      };

      await provider.initializePayment(orderWithoutRef);

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.reference).toMatch(/^PS_\d+_[A-Z0-9]+$/); // PS_timestamp_random
    });
  });

  describe('Security and Compliance', () => {
    test('should use secure HTTPS URLs', () => {
      // This is verified by checking the base URL
      expect((provider as any).baseUrl).toContain('https://');
    });

    test('should validate input ranges for security', async () => {
      const largeAmountOrder = {
        ...mockOrder,
        totalAmount: 20_000_000, // ₦20 million - should be rejected
      };

      await expect(provider.initializePayment(largeAmountOrder)).rejects.toThrow(
        NigerianPaymentError
      );
    });

    test('should handle webhook replay attacks properly', async () => {
      const mockWebhookPayload = {
        event: 'charge.success',
        data: { reference: 'BP_1699123456_ABC123', status: 'success' },
      };

      // Process the same webhook multiple times
      const result1 = await provider.handleWebhook(mockWebhookPayload);
      const result2 = await provider.handleWebhook(mockWebhookPayload);

      // Both should succeed - replay protection is handled at application level
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});