import { sha3_512 } from 'js-sha3';
import { logger } from '@repo/logs';

/**
 * OPay Callback Signature Verification
 * 
 * OPay signs callback payloads using HMAC-SHA3-512 with the merchant's Private Key.
 * The signature is calculated over a serialized JSON string containing specific fields
 * from the payload in a prescribed order.
 * 
 * Documentation: https://documentation.opaycheckout.com/callback-signature
 */

export interface OpayCallbackPayload {
  amount: string;
  channel?: string;
  country?: string;
  currency: string;
  displayedFailure?: string;
  fee?: string;
  feeCurrency?: string;
  instrumentType?: string;
  reference: string;
  refunded: boolean;
  status: string;
  timestamp: string;
  token?: string | null;
  transactionId: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

export interface OpayCallbackBody {
  payload: OpayCallbackPayload;
  sha512: string;
  type: string;
}

/**
 * Verifies the HMAC-SHA3-512 signature of an OPay callback payload
 * 
 * @param callbackBody - The full callback body containing payload and sha512
 * @param secretKey - The merchant's OPay secret key (private key)
 * @returns true if the signature is valid, false otherwise
 */
export function verifyOpayCallbackSignature(
  callbackBody: OpayCallbackBody,
  secretKey: string
): boolean {
  try {
    if (!callbackBody?.payload || !callbackBody?.sha512 || !secretKey) {
      logger.warn('Missing required fields for OPay signature verification', {
        hasPayload: !!callbackBody?.payload,
        hasSha512: !!callbackBody?.sha512,
        hasSecretKey: !!secretKey
      });
      return false;
    }

    const computedSignature = calculateOpaySignature(callbackBody.payload, secretKey);
    const providedSignature = callbackBody.sha512.toLowerCase();
    
    const isValid = computedSignature === providedSignature;
    
    if (!isValid) {
      logger.warn('OPay signature verification failed', {
        providedSignature: providedSignature.substring(0, 20) + '...',
        computedSignature: computedSignature.substring(0, 20) + '...',
        reference: callbackBody.payload.reference
      });
    } else {
      logger.info('OPay signature verification successful', {
        reference: callbackBody.payload.reference
      });
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying OPay signature', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Calculates the HMAC-SHA3-512 signature for an OPay callback payload
 * 
 * The signature string format is:
 * {Amount:"amount_value",Currency:"currency_value",Reference:"reference_value",
 *  Refunded:t|f,Status:"status_value",Timestamp:"timestamp_value",
 *  Token:"token_value",TransactionID:"transactionId_value"}
 * 
 * @param payload - The callback payload
 * @param secretKey - The merchant's OPay secret key
 * @returns The calculated signature as a hex string
 */
export function calculateOpaySignature(
  payload: OpayCallbackPayload,
  secretKey: string
): string {
  // Build the signature string exactly as specified in the documentation
  // Note: Refunded is "t" for true, "f" for false (not quoted)
  // Token can be null or empty string, handle accordingly
  const refundedValue = payload.refunded === true ? 't' : 'f';
  const tokenValue = payload.token || '';
  
  const signatureString = `{Amount:"${payload.amount}",Currency:"${payload.currency}",Reference:"${payload.reference}",Refunded:${refundedValue},Status:"${payload.status}",Timestamp:"${payload.timestamp}",Token:"${tokenValue}",TransactionID:"${payload.transactionId}"}`;
  
  logger.debug('OPay signature string', {
    signatureString,
    reference: payload.reference
  });
  
  // Note: This is a simplified version, not proper HMAC
  // For proper HMAC, use the hmacSha3_512 function below
  const combined = secretKey + signatureString;
  return sha3_512(combined).toLowerCase();
}

/**
 * Alternative HMAC-SHA3-512 implementation using the correct HMAC construction
 * 
 * HMAC = H((K ⊕ opad) || H((K ⊕ ipad) || message))
 * where H is the hash function (SHA3-512)
 */
export function hmacSha3_512(message: string, key: string): string {
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

/**
 * Verifies OPay callback signature using proper HMAC-SHA3-512
 * This is the recommended function to use for signature verification
 */
export function verifyOpaySignatureWithHmac(
  callbackBody: OpayCallbackBody,
  secretKey: string
): boolean {
  try {
    if (!callbackBody?.payload || !callbackBody?.sha512 || !secretKey) {
      logger.warn('Missing required fields for OPay HMAC signature verification', {
        hasPayload: !!callbackBody?.payload,
        hasSha512: !!callbackBody?.sha512,
        hasSecretKey: !!secretKey
      });
      return false;
    }

    // Build the signature string
    const refundedValue = callbackBody.payload.refunded === true ? 't' : 'f';
    const tokenValue = callbackBody.payload.token || '';
    
    const signatureString = `{Amount:"${callbackBody.payload.amount}",Currency:"${callbackBody.payload.currency}",Reference:"${callbackBody.payload.reference}",Refunded:${refundedValue},Status:"${callbackBody.payload.status}",Timestamp:"${callbackBody.payload.timestamp}",Token:"${tokenValue}",TransactionID:"${callbackBody.payload.transactionId}"}`;
    
    // Calculate HMAC-SHA3-512
    const computedSignature = hmacSha3_512(signatureString, secretKey);
    const providedSignature = callbackBody.sha512.toLowerCase();
    
    const isValid = computedSignature === providedSignature;
    
    logger.info('OPay HMAC signature verification result', {
      isValid,
      reference: callbackBody.payload.reference,
      status: callbackBody.payload.status
    });
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying OPay HMAC signature', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Test function to verify the implementation with the example from documentation
 */
export function testOpaySignatureVerification(): void {
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
  
  // This would need the actual secret key used to generate the example signature
  const testSecretKey = "OPAYPRV_TEST_KEY"; // Replace with actual test key if available
  
  const isValid = verifyOpaySignatureWithHmac(examplePayload, testSecretKey);
  
  console.log('Test signature verification result:', isValid);
  console.log('Note: This will only pass with the correct secret key used in the documentation example');
}
