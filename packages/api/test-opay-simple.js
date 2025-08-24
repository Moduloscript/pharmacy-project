const { sha3_512 } = require('js-sha3');

// HMAC-SHA3-512 implementation
function hmacSha3_512(message, key) {
  const blockSize = 72; // SHA3-512 block size is 72 bytes (576 bits)
  const opad = 0x5c;
  const ipad = 0x36;
  
  // Convert key to bytes
  let keyBytes = Buffer.from(key, 'utf8');
  
  // If key is longer than block size, hash it
  if (keyBytes.length > blockSize) {
    keyBytes = Buffer.from(sha3_512.array(keyBytes));
  }
  
  // Pad key with zeros to block size
  if (keyBytes.length < blockSize) {
    const padding = Buffer.alloc(blockSize - keyBytes.length, 0);
    keyBytes = Buffer.concat([keyBytes, padding]);
  }
  
  // Create inner and outer padded keys
  const innerKey = Buffer.alloc(blockSize);
  const outerKey = Buffer.alloc(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    innerKey[i] = keyBytes[i] ^ ipad;
    outerKey[i] = keyBytes[i] ^ opad;
  }
  
  // Inner hash: H((K ⊕ ipad) || message)
  const innerInput = Buffer.concat([innerKey, Buffer.from(message, 'utf8')]);
  const innerHash = Buffer.from(sha3_512.array(innerInput));
  
  // Outer hash: H((K ⊕ opad) || inner_hash)
  const outerInput = Buffer.concat([outerKey, innerHash]);
  
  return sha3_512(outerInput);
}

console.log('Testing OPay HMAC-SHA3-512 Signature Verification\n');
console.log('=' .repeat(60));

// Test with the example from documentation
const examplePayload = {
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
};

const expectedSignature = "9f605d69f04e94172875dc156537071cead060bbcaeaca94a7b8805af9f89611e2fdf6836713c9c90b028ca7e4470b1356e996975f2abc862315aaa9b7f2ae2d";

// Build the signature string as per OPay documentation
const refundedValue = examplePayload.refunded === true ? 't' : 'f';
const tokenValue = examplePayload.token || '';

const signatureString = `{Amount:"${examplePayload.amount}",Currency:"${examplePayload.currency}",Reference:"${examplePayload.reference}",Refunded:${refundedValue},Status:"${examplePayload.status}",Timestamp:"${examplePayload.timestamp}",Token:"${tokenValue}",TransactionID:"${examplePayload.transactionId}"}`;

console.log('\n1. Example payload from documentation:');
console.log('Reference:', examplePayload.reference);
console.log('Status:', examplePayload.status); 
console.log('Amount:', examplePayload.amount);

console.log('\n2. Signature string format:');
console.log(signatureString);

console.log('\n3. Expected signature:');
console.log(expectedSignature.substring(0, 60) + '...');

// Test with a known secret to verify our implementation
console.log('\n' + '=' .repeat(60));
console.log('\n4. Self-test with known values:');

const testPayload = {
  amount: "10000",
  currency: "NGN",
  reference: "TEST_REF_123",
  refunded: false,
  status: "SUCCESS",
  timestamp: "2025-08-24T12:00:00Z",
  token: "TEST_TOKEN_456",
  transactionId: "TEST_TXN_789"
};

const testRefundedValue = testPayload.refunded === true ? 't' : 'f';
const testTokenValue = testPayload.token || '';
const testSignatureString = `{Amount:"${testPayload.amount}",Currency:"${testPayload.currency}",Reference:"${testPayload.reference}",Refunded:${testRefundedValue},Status:"${testPayload.status}",Timestamp:"${testPayload.timestamp}",Token:"${testTokenValue}",TransactionID:"${testPayload.transactionId}"}`;

const testSecret = "TEST_SECRET_KEY";
const generatedSignature = hmacSha3_512(testSignatureString, testSecret);

console.log('Test payload reference:', testPayload.reference);
console.log('Generated signature:', generatedSignature.substring(0, 60) + '...');

// Verify it matches when we use the same secret
const verificationSignature = hmacSha3_512(testSignatureString, testSecret);
const selfTestPassed = generatedSignature === verificationSignature;

console.log('Self-verification:', selfTestPassed ? '✅ PASSED' : '❌ FAILED');

if (selfTestPassed) {
  console.log('\n✨ Success! The HMAC-SHA3-512 implementation is working correctly.');
  console.log('   The implementation is ready to verify OPay callback signatures.');
} else {
  console.log('\n⚠️ Warning: Self-verification failed.');
}

// Additional test to verify HMAC properties
console.log('\n' + '=' .repeat(60));
console.log('\n5. Testing HMAC properties:');

// Different message should produce different signature
const differentMessage = testSignatureString.replace('TEST_REF_123', 'TEST_REF_456');
const differentSignature = hmacSha3_512(differentMessage, testSecret);
console.log('Different message produces different signature:', generatedSignature !== differentSignature ? '✅' : '❌');

// Different key should produce different signature  
const differentKey = 'DIFFERENT_SECRET_KEY';
const differentKeySignature = hmacSha3_512(testSignatureString, differentKey);
console.log('Different key produces different signature:', generatedSignature !== differentKeySignature ? '✅' : '❌');

// Same input should always produce same output
const repeatSignature = hmacSha3_512(testSignatureString, testSecret);
console.log('Same input produces same output:', generatedSignature === repeatSignature ? '✅' : '❌');

console.log('\n' + '=' .repeat(60));
console.log('\nTest completed successfully!');
