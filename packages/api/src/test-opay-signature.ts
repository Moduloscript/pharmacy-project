#!/usr/bin/env node

/**
 * Test script for OPay HMAC-SHA3-512 signature verification
 * Run with: npx tsx test-opay-signature.ts
 */

import { verifyOpaySignatureWithHmac, OpayCallbackBody, testOpaySignatureVerification } from './utils/opay-signature';

console.log('Testing OPay Signature Verification Implementation\n');
console.log('=' .repeat(60));

// Test with the example from documentation
const examplePayload: OpayCallbackBody = {
  payload: {
    amount: "49160",
    channel: "Web",
    country: "NG",
    currency: "NGN",
    displayedFailure: "",
    fee: "737",
    feeCurrency: "NGN",
    instrumentType: "BankCard",
    reference: "10023",
    refunded: false,
    status: "SUCCESS",
    timestamp: "2022-05-07T06:20:46Z",
    token: "220507145660712931829",
    transactionId: "220507145660712931829",
    updated_at: "2022-05-07T07:20:46Z"
  },
  sha512: "9f605d69f04e94172875dc156537071cead060bbcaeaca94a7b8805af9f89611e2fdf6836713c9c90b028ca7e4470b1356e996975f2abc862315aaa9b7f2ae2d",
  type: "transaction-status"
};

console.log('\n1. Testing with documentation example:');
console.log('Reference:', examplePayload.payload.reference);
console.log('Status:', examplePayload.payload.status);
console.log('Amount:', examplePayload.payload.amount);
console.log('Currency:', examplePayload.payload.currency);
console.log('Expected SHA512:', examplePayload.sha512.substring(0, 40) + '...');

// This would need the actual secret key used in the documentation
const testSecretKey = process.env.OPAY_TEST_SECRET_KEY || 'OPAYPRV16498196872570.13953388019021462';

console.log('\n2. Attempting verification with test key...');
const isValid = verifyOpaySignatureWithHmac(examplePayload, testSecretKey);
console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

if (!isValid) {
  console.log('\nNote: This is expected to fail unless you have the exact secret key');
  console.log('      used in the OPay documentation example.');
}

// Test with different scenarios
console.log('\n' + '=' .repeat(60));
console.log('\n3. Testing edge cases:');

// Test with refunded = true
const refundedPayload: OpayCallbackBody = {
  ...examplePayload,
  payload: {
    ...examplePayload.payload,
    refunded: true
  }
};

console.log('\n- Testing with refunded = true');
const refundedValid = verifyOpaySignatureWithHmac(refundedPayload, testSecretKey);
console.log('  Result:', refundedValid ? '✅ VALID' : '❌ INVALID (expected)');

// Test with empty token
const emptyTokenPayload: OpayCallbackBody = {
  ...examplePayload,
  payload: {
    ...examplePayload.payload,
    token: ""
  }
};

console.log('\n- Testing with empty token');
const emptyTokenValid = verifyOpaySignatureWithHmac(emptyTokenPayload, testSecretKey);
console.log('  Result:', emptyTokenValid ? '✅ VALID' : '❌ INVALID (expected)');

// Test with null token
const nullTokenPayload: OpayCallbackBody = {
  ...examplePayload,
  payload: {
    ...examplePayload.payload,
    token: null as any
  }
};

console.log('\n- Testing with null token');
const nullTokenValid = verifyOpaySignatureWithHmac(nullTokenPayload, testSecretKey);
console.log('  Result:', nullTokenValid ? '✅ VALID' : '❌ INVALID (expected)');

// Test creating our own signature for validation
console.log('\n' + '=' .repeat(60));
console.log('\n4. Testing signature generation:');

import { hmacSha3_512 } from './utils/opay-signature';

// Create a test payload with known values
const testPayload: OpayCallbackBody['payload'] = {
  amount: "10000",
  currency: "NGN",
  reference: "TEST_REF_123",
  refunded: false,
  status: "SUCCESS",
  timestamp: "2025-08-24T12:00:00Z",
  token: "TEST_TOKEN_456",
  transactionId: "TEST_TXN_789",
  channel: "Web",
  country: "NG",
  displayedFailure: "",
  fee: "150",
  feeCurrency: "NGN",
  instrumentType: "BankCard",
  updated_at: "2025-08-24T12:00:00Z"
};

// Build the signature string
const refundedValue = testPayload.refunded === true ? 't' : 'f';
const tokenValue = testPayload.token || '';
const signatureString = `{Amount:"${testPayload.amount}",Currency:"${testPayload.currency}",Reference:"${testPayload.reference}",Refunded:${refundedValue},Status:"${testPayload.status}",Timestamp:"${testPayload.timestamp}",Token:"${tokenValue}",TransactionID:"${testPayload.transactionId}"}`;

console.log('\nSignature string format:');
console.log(signatureString);

// Generate signature with a known secret
const knownSecret = "TEST_SECRET_KEY_123";
const generatedSignature = hmacSha3_512(signatureString, knownSecret);

console.log('\nGenerated signature with known secret:');
console.log(generatedSignature);

// Verify with the same secret
const testCallbackBody: OpayCallbackBody = {
  payload: testPayload,
  sha512: generatedSignature,
  type: "transaction-status"
};

const selfVerified = verifyOpaySignatureWithHmac(testCallbackBody, knownSecret);
console.log('\nSelf-verification result:', selfVerified ? '✅ VALID' : '❌ INVALID');

if (selfVerified) {
  console.log('\n✨ Success! The HMAC-SHA3-512 implementation is working correctly.');
  console.log('   The signature generation and verification are consistent.');
} else {
  console.log('\n⚠️ Warning: Self-verification failed. There may be an issue with the implementation.');
}

console.log('\n' + '=' .repeat(60));
console.log('\n5. Environment check:');
console.log('OPAY_SECRET_KEY is', process.env.OPAY_SECRET_KEY ? 'SET ✅' : 'NOT SET ❌');
console.log('OPAY_MERCHANT_ID is', process.env.OPAY_MERCHANT_ID ? 'SET ✅' : 'NOT SET ❌');
console.log('OPAY_PUBLIC_KEY is', process.env.OPAY_PUBLIC_KEY ? 'SET ✅' : 'NOT SET ❌');
console.log('NODE_ENV is', process.env.NODE_ENV || 'not set');

console.log('\n' + '=' .repeat(60));
console.log('\nTest completed!');
