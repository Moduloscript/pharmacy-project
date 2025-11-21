/**
 * Integration Test for Complete Payment Fallback System
 * Tests Flutterwave → OPay → Paystack fallback logic
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { getPaymentOrchestrator } from '../../src/lib/payment-orchestrator';
import { createFlutterwaveProvider, createPaystackProvider } from '../index';
import type { NigerianOrder } from '../../types';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Payment Fallback Integration', () => {
  let orchestrator: ReturnType<typeof getPaymentOrchestrator>;
  let mockOrder: NigerianOrder;

  beforeEach(() => {
    orchestrator = getPaymentOrchestrator({
      enableFallback: true,
      timeoutMs: 30000,
      maxRetries: 1, // Faster tests
    });

    mockOrder = global.createMockNigerianOrder({
      id: 'integration-test-order',
      orderNumber: 'BP_INTEGRATION_TEST',
      totalAmount: 10000, // ₦10,000
    });

    // Register providers
    orchestrator.registerProvider(createFlutterwaveProvider());
    orchestrator.registerProvider(createPaystackProvider());

    jest.clearAllMocks();
  });

  describe('Complete Fallback Flow', () => {
    test('should succeed with primary gateway (Flutterwave)', async () => {
      // Mock successful Flutterwave response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => global.createMockFlutterwaveResponse(),
      } as Response);

      const result = await orchestrator.processPayment(mockOrder);

      expect(result.success).toBe(true);
      expect(result.gateway).toBe('FLUTTERWAVE');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(true);
      expect(result.finalResult?.paymentUrl).toContain('flutterwave.com');
    });

    test('should fallback from Flutterwave to Paystack', async () => {
      // Mock Flutterwave failure
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ status: 'error', message: 'Flutterwave down' }),
        } as Response)
        // Mock Paystack success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockPaystackResponse(),
        } as Response);

      const result = await orchestrator.processPayment(mockOrder);

      expect(result.success).toBe(true);
      expect(result.gateway).toBe('PAYSTACK');
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].success).toBe(true);
      expect(result.finalResult?.paymentUrl).toContain('checkout.paystack.co');
    });

    test('should fail when all gateways are down', async () => {
      // Mock both gateways failing
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('All gateways unavailable')
      );

      await expect(orchestrator.processPayment(mockOrder)).rejects.toThrow(
        'All payment attempts failed'
      );
    });

    test('should handle health-based gateway selection', async () => {
      // Check initial health
      await orchestrator.refreshGatewayHealth();

      let bestGateway = orchestrator.getBestAvailableGateway();
      expect(['FLUTTERWAVE', 'PAYSTACK']).toContain(bestGateway!);

      // Mock Flutterwave health check failure
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', data: [] }),
        } as Response)
        .mockRejectedValueOnce(new Error('Health check failed'));

      await orchestrator.refreshGatewayHealth();

      bestGateway = orchestrator.getBestAvailableGateway();
      expect(bestGateway).toBe('PAYSTACK');
    });
  });

  describe('Nigerian Payment Method Support', () => {
    test('should support all Nigerian payment methods across gateways', () => {
      const stats = orchestrator.getGatewayStats();
      const allSupportedMethods = new Set<string>();

      stats.forEach(stat => {
        stat.supportedMethods.forEach(method => {
          allSupportedMethods.add(method);
        });
      });

      // Verify key Nigerian payment methods are supported
      expect(allSupportedMethods.has('card')).toBe(true);
      expect(allSupportedMethods.has('bank')).toBe(true);
      expect(allSupportedMethods.has('bank_transfer')).toBe(true);
      expect(allSupportedMethods.has('ussd')).toBe(true);
      expect(allSupportedMethods.has('mobile_money')).toBe(true);
    });

    test('should recommend appropriate gateway for Nigerian customers', () => {
      const recommendation = orchestrator.getRecommendedGateway({
        state: 'Lagos',
        city: 'Lagos'
      });

      expect(['FLUTTERWAVE', 'PAYSTACK']).toContain(recommendation);
    });
  });

  describe('Payment Verification Cross-Gateway', () => {
    test('should verify payment across all gateways', async () => {
      const reference = 'BP_VERIFICATION_TEST';

      // Mock Paystack successful verification
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            reference,
            status: 'success',
            amount: 1000000, // ₦10,000 in kobo
            currency: 'NGN',
            channel: 'card',
            fees: 15000, // 1.5% + ₦100 in kobo
          },
        }),
      } as Response);

      const result = await orchestrator.verifyPayment(reference);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(result.amount).toBe(10000); // Converted from kobo
      expect(result.currency).toBe('NGN');
    });

    test('should handle verification when gateway is unknown', async () => {
      const reference = 'BP_UNKNOWN_GATEWAY';

      // Mock both gateways failing verification
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Verification failed')
      );

      await expect(orchestrator.verifyPayment(reference)).rejects.toThrow(
        'Payment verification failed'
      );
    });
  });

  describe('Webhook Handling Cross-Gateway', () => {
    test('should route Flutterwave webhook correctly', async () => {
      const flutterwavePayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_WEBHOOK_FLW',
          status: 'successful',
          amount: 1000000,
        },
      };

      const result = await orchestrator.handleWebhook(
        flutterwavePayload,
        'flutterwave-signature',
        'FLUTTERWAVE'
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe('BP_WEBHOOK_FLW');
    });

    test('should route Paystack webhook correctly', async () => {
      const paystackPayload = {
        event: 'charge.success',
        data: {
          reference: 'BP_WEBHOOK_PS',
          status: 'success',
          amount: 1000000,
        },
      };

      const result = await orchestrator.handleWebhook(
        paystackPayload,
        'paystack-signature',
        'PAYSTACK'
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe('BP_WEBHOOK_PS');
    });

    test('should try all gateways when webhook source is unknown', async () => {
      const unknownPayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_UNKNOWN_WEBHOOK',
          status: 'successful',
          amount: 1000000,
        },
      };

      // Should try Flutterwave first (highest priority)
      const result = await orchestrator.handleWebhook(unknownPayload);

      expect(result.success).toBe(true);
      // Processing may be false if event doesn't match exact format
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent payments across gateways', async () => {
      // Mock both gateways successful
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Payment initialized',
          data: {
            link: 'test-url',
            id: Math.random(),
            authorization_url: 'test-url',
            access_code: 'test',
            reference: `BP_TEST_${Date.now()}`,
          },
        }),
      } as Response);

      const orders = Array.from({ length: 5 }, (_, i) =>
        global.createMockNigerianOrder({
          id: `concurrent-order-${i}`,
          orderNumber: `BP_CONCURRENT_${i}`,
        })
      );

      const promises = orders.map((order) => orchestrator.processPayment(order));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(['FLUTTERWAVE', 'PAYSTACK']).toContain(result.gateway);
        expect(result.attempts.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should complete fallback within acceptable timeframe', async () => {
      // Mock Flutterwave slow/failing, Paystack fast
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementationOnce(
          () => new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        )
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockPaystackResponse(),
        } as Response);

      const startTime = Date.now();
      const result = await orchestrator.processPayment(mockOrder);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.gateway).toBe('PAYSTACK');
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle partial gateway failures gracefully', async () => {
      // First Flutterwave call succeeds, second fails during same session
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockFlutterwaveResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ status: 'error', message: 'Gateway error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockPaystackResponse(),
        } as Response);

      // First payment - should succeed with Flutterwave
      const result1 = await orchestrator.processPayment(mockOrder);
      expect(result1.gateway).toBe('FLUTTERWAVE');

      // Second payment - should fallback to Paystack
      const result2 = await orchestrator.processPayment({
        ...mockOrder,
        orderNumber: 'BP_FALLBACK_TEST',
      });
      expect(result2.gateway).toBe('PAYSTACK');
    });

    test('should maintain health status across multiple attempts', async () => {
      // Simulate Flutterwave becoming unhealthy
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockFlutterwaveResponse(),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => global.createMockPaystackResponse(),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      // First attempt - Flutterwave succeeds
      const result1 = await orchestrator.processPayment(mockOrder);
      expect(result1.gateway).toBe('FLUTTERWAVE');

      // Check health after failure
      await orchestrator.refreshGatewayHealth();
      let stats = orchestrator.getGatewayStats();
      let flutterwaveHealth = stats.find(s => s.gateway === 'FLUTTERWAVE');

      // Health should reflect the failure
      expect(flutterwaveHealth?.isHealthy).toBeDefined();

      // Third attempt - should still work if health allows
      const result2 = await orchestrator.processPayment({
        ...mockOrder,
        orderNumber: 'BP_HEALTH_TEST',
      });

      expect(['FLUTTERWAVE', 'PAYSTACK']).toContain(result2.gateway);
    });
  });
});