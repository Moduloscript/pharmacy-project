/**
 * Integration Tests for Nigerian Payment System
 * Tests the complete payment flow with Flutterwave
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { BenPharmPaymentSystem } from '../examples/nigerian-payment-example';
import { 
  validateNigerianPhone, 
  formatNaira, 
  calculateGatewayFee,
  normalizeNigerianPhone,
  generateNigerianPaymentReference
} from '../src/lib/nigerian-utils';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Nigerian Payment System Integration', () => {
  let paymentSystem: BenPharmPaymentSystem;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new payment system instance
    paymentSystem = new BenPharmPaymentSystem();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Nigerian Utility Functions', () => {
    test('should validate Nigerian phone numbers correctly', () => {
      expect(validateNigerianPhone('+2348012345678')).toBe(true);
      expect(validateNigerianPhone('08012345678')).toBe(true);
      expect(validateNigerianPhone('+2347012345678')).toBe(true);
      expect(validateNigerianPhone('09012345678')).toBe(true);
      
      // Invalid formats
      expect(validateNigerianPhone('0803-123-4567')).toBe(false);
      expect(validateNigerianPhone('+1234567890')).toBe(false);
      expect(validateNigerianPhone('123456789')).toBe(false);
      expect(validateNigerianPhone('')).toBe(false);
    });

    test('should normalize Nigerian phone numbers', () => {
      expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
      expect(normalizeNigerianPhone('07012345678')).toBe('+2347012345678');
      expect(normalizeNigerianPhone('09012345678')).toBe('+2349012345678');
      expect(normalizeNigerianPhone('+2348012345678')).toBe('+2348012345678');
      expect(normalizeNigerianPhone('2348012345678')).toBe('+2348012345678');
    });

    test('should format Naira currency correctly', () => {
      expect(formatNaira(5000)).toBeNairaCurrency();
      expect(formatNaira(1000)).toBe('₦1,000');
      expect(formatNaira(15000)).toBe('₦15,000');
      expect(formatNaira(1500.50)).toBe('₦1,501'); // Rounded to nearest integer
    });

    test('should calculate gateway fees correctly', () => {
      // Flutterwave: 1.4% + ₦50
      const amount = 5000;
      const fee = calculateGatewayFee(amount, 'FLUTTERWAVE');
      const expectedFee = Math.round((amount * 1.4 / 100) + 50); // 70 + 50 = 120
      
      expect(fee).toBe(expectedFee);
      expect(fee).toBeGreaterThan(0);
      expect(fee).toBeLessThan(amount); // Fee should be less than total amount
    });

    test('should generate valid payment references', () => {
      const ref1 = generateNigerianPaymentReference('BP');
      const ref2 = generateNigerianPaymentReference('TEST');
      
      expect(ref1).toMatch(/^BP_\d+_[A-Z0-9]{6}$/);
      expect(ref2).toMatch(/^TEST_\d+_[A-Z0-9]{6}$/);
      expect(ref1).not.toBe(ref2); // Should be unique
    });
  });

  describe('Payment System Integration', () => {
    const mockOrderData = {
      orderId: 'test-order-123',
      customerId: 'test-customer-456',
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

    test('should create payment successfully', async () => {
      // Mock successful Flutterwave response
      const mockFlutterwaveResponse = createMockFlutterwaveResponse();
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFlutterwaveResponse,
        text: async () => JSON.stringify(mockFlutterwaveResponse),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const performanceTimer = mockPerformanceTest();
      
      const result = await paymentSystem.createPayment(mockOrderData);
      
      const duration = performanceTimer.end();
      
      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBe(mockFlutterwaveResponse.data.link);
      expect(result.gateway).toBe('FLUTTERWAVE');
      expect(result.reference).toBeDefined();
      expect(result.meta?.paymentId).toBe(mockFlutterwaveResponse.data.id);
      
      // Verify performance requirement (< 2 seconds)
      expect(duration).toBeLessThan(2000);
      
      console.log(`✅ Payment created successfully in ${duration}ms`);
      console.log(`   Payment URL: ${result.paymentUrl}`);
      console.log(`   Reference: ${result.reference}`);
      console.log(`   Gateway: ${result.gateway}`);
    });

    test('should handle invalid phone number', async () => {
      const invalidOrderData = {
        ...mockOrderData,
        customerPhone: '0803-123-4567', // Invalid format
      };

      await expect(paymentSystem.createPayment(invalidOrderData))
        .rejects.toThrow('Invalid Nigerian phone number format');
      
      console.log('✅ Invalid phone number properly rejected');
    });

    test('should verify payment successfully', async () => {
      // Mock successful verification response
      const mockVerificationResponse = {
        status: 'success',
        data: {
          id: 12345,
          tx_ref: 'BP_TEST_123456_ABC',
          flw_ref: 'FLW-MOCK-123',
          amount: 600000, // In kobo (₦6000)
          currency: 'NGN',
          status: 'successful',
          payment_type: 'card',
          app_fee: 12000, // In kobo (₦120)
          merchant_fee: 2000, // In kobo (₦20)
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
        status: 200,
        json: async () => mockVerificationResponse,
        text: async () => JSON.stringify(mockVerificationResponse),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const performanceTimer = mockPerformanceTest();
      
      const result = await paymentSystem.verifyPayment('BP_TEST_123456_ABC');
      
      const duration = performanceTimer.end();
      
      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(result.amount).toBe(6000); // Converted from kobo
      expect(result.currency).toBe('NGN');
      expect(result.reference).toBe('BP_TEST_123456_ABC');
      expect(result.gatewayReference).toBe('FLW-MOCK-123');
      expect(result.gatewayFee).toBe(120); // Converted from kobo
      expect(result.paymentMethod).toBe('card');
      
      // Verify performance (should be fast)
      expect(duration).toBeLessThan(1000);
      
      console.log(`✅ Payment verified successfully in ${duration}ms`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Amount: ${formatNaira(result.amount)}`);
      console.log(`   Gateway Fee: ${formatNaira(result.gatewayFee || 0)}`);
    });

    test('should handle webhook correctly', async () => {
      const mockWebhookPayload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'BP_TEST_123456_ABC',
          status: 'successful',
          amount: 600000, // In kobo
          currency: 'NGN',
          customer: {
            email: 'customer@benpharm.ng',
            phone_number: '+2348012345678',
          },
        },
      };

      const performanceTimer = mockPerformanceTest();
      
      const result = await paymentSystem.handleWebhook(mockWebhookPayload);
      
      const duration = performanceTimer.end();
      
      // Verify webhook processing
      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe('BP_TEST_123456_ABC');
      expect(result.paymentStatus).toBe('SUCCESS');
      
      // Verify performance requirement (< 1 second)
      expect(duration).toBeLessThan(1000);
      
      console.log(`✅ Webhook processed successfully in ${duration}ms`);
      console.log(`   Order ID: ${result.orderId}`);
      console.log(`   Payment Status: ${result.paymentStatus}`);
    });

    test('should calculate payment fees correctly', () => {
      const amount = 5000;
      const fees = paymentSystem.calculatePaymentFees(amount);
      
      expect(fees.amount).toBeNairaCurrency();
      expect(fees.flutterwaveFee).toBeNairaCurrency();
      expect(fees.total).toBeNairaCurrency();
      expect(fees.breakdown.subtotal).toBe(amount);
      expect(fees.breakdown.gatewayFee).toBeGreaterThan(0);
      expect(fees.breakdown.total).toBe(amount + fees.breakdown.gatewayFee);
      
      console.log('✅ Payment fee calculation:');
      console.log(`   Amount: ${fees.amount}`);
      console.log(`   Gateway Fee: ${fees.flutterwaveFee}`);
      console.log(`   Total: ${fees.total}`);
    });

    test('should get recommended payment method', () => {
      const recommendation = paymentSystem.getRecommendedPaymentMethod('Edo', 'Benin City');
      
      expect(recommendation.recommended).toBe('FLUTTERWAVE');
      expect(recommendation.details).toBeDefined();
      expect(recommendation.details.name).toBe('Flutterwave');
      expect(recommendation.details.methods).toContain('💳 Debit/Credit Card');
      expect(recommendation.details.methods).toContain('🏦 Bank Transfer');
      expect(recommendation.details.methods).toContain('📱 USSD');
      
      console.log('✅ Payment recommendation:');
      console.log(`   Gateway: ${recommendation.recommended}`);
      console.log(`   Methods: ${recommendation.details.methods.join(', ')}`);
      console.log(`   Fee: ${recommendation.details.fee}`);
    });
  });

  describe('Error Handling & Network Resilience', () => {
    test('should handle network timeout gracefully', async () => {
      // Mock network timeout
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const mockOrderData = createMockNigerianOrder();
      
      await expect(paymentSystem.createPayment({
        orderId: mockOrderData.id,
        customerId: 'test-customer',
        customerEmail: mockOrderData.customer.email,
        customerPhone: mockOrderData.customer.phone,
        customerName: mockOrderData.customer.name,
        items: mockOrderData.items,
        deliveryAddress: mockOrderData.deliveryAddress || 'Test Address',
        deliveryFee: mockOrderData.deliveryFee || 0,
      })).rejects.toThrow();
      
      console.log('✅ Network timeout handled gracefully');
    });

    test('should handle API errors correctly', async () => {
      // Mock API error response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          status: 'error',
          message: 'Invalid request parameters',
        }),
        text: async () => JSON.stringify({
          status: 'error',
          message: 'Invalid request parameters',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const mockOrderData = createMockNigerianOrder();
      
      await expect(paymentSystem.createPayment({
        orderId: mockOrderData.id,
        customerId: 'test-customer',
        customerEmail: mockOrderData.customer.email,
        customerPhone: mockOrderData.customer.phone,
        customerName: mockOrderData.customer.name,
        items: mockOrderData.items,
        deliveryAddress: mockOrderData.deliveryAddress || 'Test Address',
        deliveryFee: mockOrderData.deliveryFee || 0,
      })).rejects.toThrow();
      
      console.log('✅ API errors handled gracefully');
    });

    test('should handle slow network conditions', async () => {
      // Mock slow API response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => createMockFlutterwaveResponse(),
                  text: async () => JSON.stringify(createMockFlutterwaveResponse()),
                  headers: new Headers({ 'content-type': 'application/json' }),
                } as Response),
              1500 // 1.5 second delay
            )
          )
      );

      const mockOrderData = createMockNigerianOrder();
      const performanceTimer = mockPerformanceTest();
      
      const result = await paymentSystem.createPayment({
        orderId: mockOrderData.id,
        customerId: 'test-customer',
        customerEmail: mockOrderData.customer.email,
        customerPhone: mockOrderData.customer.phone,
        customerName: mockOrderData.customer.name,
        items: mockOrderData.items,
        deliveryAddress: mockOrderData.deliveryAddress || 'Test Address',
        deliveryFee: mockOrderData.deliveryFee || 0,
      });
      
      const duration = performanceTimer.end();
      
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(1000); // Should be slow
      expect(duration).toBeLessThan(4000); // But not too slow
      
      console.log(`✅ Slow network handled (${duration}ms)`);
    });
  });

  describe('Gateway Health Monitoring', () => {
    test('should check gateway statistics', () => {
      const stats = paymentSystem.getGatewayStats();
      
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      
      const flutterwaveStats = stats.find(stat => stat.gateway === 'FLUTTERWAVE');
      expect(flutterwaveStats).toBeDefined();
      expect(flutterwaveStats?.supportedMethods).toContain('card');
      expect(flutterwaveStats?.supportedMethods).toContain('banktransfer');
      expect(flutterwaveStats?.supportedMethods).toContain('ussd');
      
      console.log('✅ Gateway statistics retrieved successfully');
    });
  });
});

// Test type augmentation for custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeNigerianPhone(): R;
      toBeNairaCurrency(): R;
      toBeWithinTimeRange(expectedTime: number, tolerance?: number): R;
    }
  }
}
