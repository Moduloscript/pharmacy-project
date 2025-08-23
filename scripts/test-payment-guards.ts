#!/usr/bin/env npx ts-node

import { validatePaymentAmounts, processPaymentWebhookWithValidation } from './enhanced-webhook-guards.js';

/**
 * Test Suite for Payment Validation Guardrails
 */
async function runGuardTests() {
  console.log('🧪 Testing Payment Validation Guardrails...\n');

  try {
    // Test 1: Validate with existing payment data (should detect mismatch)
    console.log('Test 1: Testing with known problematic payment...');
    const test1 = await validatePaymentAmounts('cmenpcf620003u3a8jgmzs1dw', 25.00, undefined, 'NGN');
    console.log('Result:', test1);
    console.log('Expected: Should detect mismatch and suggest correction\n');

    // Test 2: Test with good amounts (should pass)
    console.log('Test 2: Testing with matching amounts...');
    const test2 = await validatePaymentAmounts('test_payment_1755921943', 2700.00, undefined, 'NGN');
    console.log('Result:', test2);
    console.log('Expected: Should pass validation\n');

    // Test 3: Test kobo conversion detection
    console.log('Test 3: Testing kobo to naira conversion...');
    const test3 = await validatePaymentAmounts('test_payment_1755921943', 270000, undefined, 'NGN');
    console.log('Result:', test3);
    console.log('Expected: Should convert 270000 kobo to 2700 naira and pass\n');

    // Test 4: Test webhook processing with mismatch (should fail)
    console.log('Test 4: Testing webhook processing with amount mismatch...');
    try {
      const test4 = await processPaymentWebhookWithValidation('test_payment_1755921943', {
        amount: 1000,  // Wrong amount
        currency: 'NGN',
        reference: 'TEST-REF',
        status: 'successful'
      });
      console.log('Result:', test4);
      console.log('Expected: Should fail and block payment\n');
    } catch (error) {
      console.log('Error (expected):', error instanceof Error ? error.message : String(error));
    }

    console.log('✅ Payment guardrail tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
runGuardTests();
