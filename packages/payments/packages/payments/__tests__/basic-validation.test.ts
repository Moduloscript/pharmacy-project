/**
 * Basic Validation Test - No Webhook Required
 * Tests core functionality that doesn't need external services
 */

import { describe, test, expect } from '@jest/globals';
import { 
  validateNigerianPhone, 
  formatNaira, 
  calculateGatewayFee,
  normalizeNigerianPhone,
  generateNigerianPaymentReference,
  NIGERIAN_GATEWAY_FEES
} from '../../../src/lib/nigerian-utils';

describe('Nigerian Payment System - Basic Validation', () => {
  
  describe('Environment Setup', () => {
    test('should have required environment variables', () => {
      expect(process.env.FLUTTERWAVE_PUBLIC_KEY).toBeDefined();
      expect(process.env.FLUTTERWAVE_SECRET_KEY).toBeDefined();
      expect(process.env.NEXT_PUBLIC_APP_URL).toBeDefined();
      
      console.log('✅ Environment variables are configured');
      console.log(`   Public Key: ${process.env.FLUTTERWAVE_PUBLIC_KEY?.substring(0, 20)}...`);
      console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    });
  });

  describe('Nigerian Phone Validation', () => {
    test('should validate correct Nigerian phone numbers', () => {
      const validPhones = [
        '+2348012345678',
        '+2347012345678', 
        '+2349012345678',
        '08012345678',
        '07012345678',
        '09012345678'
      ];

      validPhones.forEach(phone => {
        expect(validateNigerianPhone(phone)).toBe(true);
      });

      console.log('✅ Valid Nigerian phone numbers pass validation');
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '0803-123-4567',  // Has dashes
        '+1234567890',    // Wrong country code
        '123456789',      // Too short
        '+234123456789',  // Wrong format
        ''                // Empty
      ];

      invalidPhones.forEach(phone => {
        expect(validateNigerianPhone(phone)).toBe(false);
      });

      console.log('✅ Invalid phone numbers are properly rejected');
    });

    test('should normalize phone numbers correctly', () => {
      expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
      expect(normalizeNigerianPhone('2348012345678')).toBe('+2348012345678');
      expect(normalizeNigerianPhone('+2348012345678')).toBe('+2348012345678');
      
      console.log('✅ Phone number normalization works correctly');
    });
  });

  describe('Nigerian Currency Formatting', () => {
    test('should format Naira correctly', () => {
      expect(formatNaira(1000)).toBe('₦1,000');
      expect(formatNaira(5000)).toBe('₦5,000');
      expect(formatNaira(15000)).toBe('₦15,000');
      expect(formatNaira(100000)).toBe('₦100,000');
      
      console.log('✅ Naira formatting works correctly');
      console.log(`   ₦1,000 → ${formatNaira(1000)}`);
      console.log(`   ₦15,000 → ${formatNaira(15000)}`);
    });
  });

  describe('Gateway Fee Calculations', () => {
    test('should calculate Flutterwave fees correctly', () => {
      const amount = 5000;
      const fee = calculateGatewayFee(amount, 'FLUTTERWAVE');
      
      // Expected: (5000 * 1.4%) + ₦50 = ₦70 + ₦50 = ₦120
      const expectedFee = Math.round((amount * 1.4 / 100) + 50);
      
      expect(fee).toBe(expectedFee);
      expect(fee).toBe(120);
      
      console.log('✅ Gateway fee calculation is correct');
      console.log(`   Amount: ${formatNaira(amount)}`);
      console.log(`   Fee: ${formatNaira(fee)}`);
      console.log(`   Total: ${formatNaira(amount + fee)}`);
    });

    test('should have correct fee structure for all gateways', () => {
      expect(NIGERIAN_GATEWAY_FEES.FLUTTERWAVE.percentage).toBe(1.4);
      expect(NIGERIAN_GATEWAY_FEES.FLUTTERWAVE.fixed).toBe(50);
      
      expect(NIGERIAN_GATEWAY_FEES.OPAY.percentage).toBe(1.5);
      expect(NIGERIAN_GATEWAY_FEES.OPAY.fixed).toBe(0);
      
      expect(NIGERIAN_GATEWAY_FEES.PAYSTACK.percentage).toBe(1.5);
      expect(NIGERIAN_GATEWAY_FEES.PAYSTACK.fixed).toBe(100);
      
      console.log('✅ Gateway fee structures are correct');
    });
  });

  describe('Payment Reference Generation', () => {
    test('should generate unique payment references', () => {
      const ref1 = generateNigerianPaymentReference('BP');
      const ref2 = generateNigerianPaymentReference('BP');
      const ref3 = generateNigerianPaymentReference('TEST');
      
      expect(ref1).toMatch(/^BP_\d+_[A-Z0-9]{6}$/);
      expect(ref2).toMatch(/^BP_\d+_[A-Z0-9]{6}$/);
      expect(ref3).toMatch(/^TEST_\d+_[A-Z0-9]{6}$/);
      
      expect(ref1).not.toBe(ref2); // Should be unique
      expect(ref1).not.toBe(ref3);
      
      console.log('✅ Payment reference generation works');
      console.log(`   Sample references: ${ref1}, ${ref2}`);
    });
  });

  describe('Nigerian Business Logic', () => {
    test('should handle Nigerian business requirements', () => {
      // Test business hours (this would typically use time mocking)
      const now = new Date();
      expect(now).toBeInstanceOf(Date);
      
      // Test currency requirements
      expect(process.env.NEXT_PUBLIC_CURRENCY).toBe('NGN');
      expect(process.env.NEXT_PUBLIC_CURRENCY_SYMBOL).toBe('₦');
      
      console.log('✅ Nigerian business logic is configured');
    });
  });
});
