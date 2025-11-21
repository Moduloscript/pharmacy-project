# OPay Payment Integration Documentation

## Overview
This document describes the complete OPay payment integration implementation for the BenPharma project, including callback handling, signature verification, and security measures.

## Implementation Status ✅

### 1. **Callback Signature Verification** (HMAC-SHA3-512)
- **Location**: `packages/api/src/utils/opay-signature.ts`
- **Implementation**: Full HMAC-SHA3-512 signature verification as per OPay documentation
- **Key Features**:
  - Proper signature string formatting: `{Amount:"...",Currency:"...",Reference:"...",Refunded:t|f,Status:"...",Timestamp:"...",Token:"...",TransactionID:"..."}`
  - Handles edge cases (null/empty tokens, refunded status)
  - Validates signature from `sha512` field in callback body

### 2. **Webhook Endpoint**
- **URL**: `POST /webhook/opay`
- **Location**: `packages/api/src/routes/payments/webhooks.ts`
- **Features**:
  - Accepts unauthenticated POST requests
  - Parses JSON body with structure: `{ payload: {...}, sha512: "...", type: "transaction-status" }`
  - Returns HTTP 200 for acknowledgement (prevents 72-hour retries)
  - Logs source IP for security monitoring

### 3. **Security Measures**

#### a. Signature Verification
```typescript
// HMAC-SHA3-512 verification using merchant's private key
const isValidSignature = verifyOpaySignatureWithHmac(body, process.env.OPAY_SECRET_KEY);
```

#### b. Cross-Verification with Payment Status API
```typescript
// Additional verification in production
if (process.env.NODE_ENV === 'production') {
  const verificationResult = await verifyOpayPayment(callbackPayload.reference);
  // Compare callback status with API verification
}
```

#### c. IP Logging
- Logs source IP from headers (`x-forwarded-for`, `x-real-ip`)
- Can be used for IP whitelisting if needed

### 4. **Response Handling**
- **Success**: Returns HTTP 200 with `{ success: true, message: "Webhook processed" }`
- **Invalid Signature**: Returns HTTP 200 (to prevent retries) with error message
- **Processing Error**: Returns HTTP 200 with error (prevents 72-hour retry loop)
- **Key Point**: Always returns 200 to acknowledge receipt per OPay requirements

## Configuration Requirements

### Environment Variables
```env
# Required for OPay Integration
OPAY_MERCHANT_ID=your_merchant_id
OPAY_PUBLIC_KEY=your_public_key
OPAY_SECRET_KEY=your_private_key  # Used for HMAC-SHA3-512 signature

# Optional
NODE_ENV=production  # Enables strict signature verification
DEFAULT_CLIENT_IP=127.0.0.1  # Fallback IP for payment creation
```

### Webhook URL Configuration
You must configure your webhook URL in the OPay merchant dashboard:
- **Webhook URL**: `https://your-domain.com/webhook/opay`
- This is set in the OPay account settings panel

## Callback Structure

### Request Body Format
```json
{
  "payload": {
    "amount": "49160",
    "channel": "Web",
    "country": "NG",
    "currency": "NGN",
    "displayedFailure": "",
    "fee": "737",
    "feeCurrency": "NGN",
    "instrumentType": "BankCard",
    "reference": "10023",
    "refunded": false,
    "status": "SUCCESS",
    "timestamp": "2022-05-07T06:20:46Z",
    "token": "220507145660712931829",
    "transactionId": "220507145660712931829",
    "updated_at": "2022-05-07T07:20:46Z"
  },
  "sha512": "9f605d69f04e94172875dc156537071cead060bbcaeaca94a7b8805af9f89611e2fdf6836713c9c90b028ca7e4470b1356e996975f2abc862315aaa9b7f2ae2d",
  "type": "transaction-status"
}
```

### Supported Payment Statuses
- `SUCCESS` - Payment completed successfully
- `FAIL` / `FAILED` - Payment failed
- `PENDING` / `INITIAL` - Payment is pending
- `CLOSE` - Transaction closed

## Security Best Practices

### 1. Signature Verification (Implemented ✅)
- Uses HMAC-SHA3-512 with merchant's private key
- Validates `sha512` field in callback body
- Rejects invalid signatures in production mode

### 2. Cross-Verification (Implemented ✅)
- Queries OPay Payment Status API to verify callback authenticity
- Compares callback status with API response
- Prevents replay attacks and spoofed callbacks

### 3. IP Whitelisting (Optional)
- System logs source IP addresses
- Can implement IP whitelist if OPay provides their callback IP ranges

### 4. Idempotency (Implemented ✅)
- Checks for existing payments before processing
- Prevents duplicate payment records
- Returns success for already-processed payments

## Testing

### Test Script
Run the signature verification test:
```bash
cd packages/api
node test-opay-simple.js
```

### Expected Output
```
Testing OPay HMAC-SHA3-512 Signature Verification
✅ HMAC properties validated
✅ Self-verification passed
✅ Implementation working correctly
```

## Common Issues and Solutions

### Issue 1: Invalid Signature Errors
**Cause**: Wrong secret key or incorrect signature format
**Solution**: 
- Verify `OPAY_SECRET_KEY` is set correctly
- Ensure using HMAC-SHA3-512, not SHA-512
- Check signature string format matches specification exactly

### Issue 2: Callbacks Not Received
**Cause**: Webhook URL not configured or incorrect
**Solution**:
- Verify webhook URL in OPay dashboard
- Check server logs for incoming POST requests
- Ensure endpoint is publicly accessible

### Issue 3: Duplicate Payments
**Cause**: Multiple callback processing
**Solution**:
- Idempotency check implemented
- Always returns 200 to prevent retries
- Cross-verification prevents duplicate processing

## API Endpoints

### Webhook Endpoint
```
POST /webhook/opay
Content-Type: application/json

Body: OPay callback JSON (see structure above)
Response: 200 OK with JSON acknowledgement
```

### Manual Verification Endpoint
```
GET /verify/:reference

Response:
{
  "success": true,
  "data": {
    "reference": "REF123",
    "status": "SUCCESS",
    "amount": 1000,
    "currency": "NGN",
    "gateway": "OPAY"
  }
}
```

### Health Check Endpoint
```
GET /health

Response:
{
  "timestamp": "2025-08-24T12:00:00Z",
  "environment": "production",
  "gateways": {
    "opay": {
      "configured": true,
      "tested": true,
      "working": true
    }
  }
}
```

## Implementation Files

1. **Signature Verification**: `packages/api/src/utils/opay-signature.ts`
2. **Webhook Handler**: `packages/api/src/routes/payments/webhooks.ts`
3. **Payment Creation**: `packages/api/src/routes/payments/benpharm-checkout.ts`
4. **Callback Handler**: `packages/api/src/routes/payments/callbacks.ts`
5. **Test Script**: `packages/api/test-opay-simple.js`

## Compliance Checklist

- ✅ Webhook endpoint accepts POST requests
- ✅ Returns 200 OK for acknowledgement
- ✅ Implements HMAC-SHA3-512 signature verification
- ✅ Validates callback signature from `sha512` field
- ✅ Cross-verifies with Payment Status API
- ✅ Logs source IP for monitoring
- ✅ Handles all payment statuses (SUCCESS, FAIL, PENDING)
- ✅ Implements idempotency checks
- ✅ Properly formats response body
- ✅ Configured for both sandbox and production environments

## Support and Maintenance

### Monitoring
- Monitor webhook logs for signature failures
- Track payment success rates
- Alert on repeated verification failures

### Updates
- Keep OPay SDK/API versions updated
- Review OPay documentation for API changes
- Test in sandbox before production deployment

## References

- [OPay Callback Documentation](https://documentation.opaycheckout.com/payment-notifications-callbacks)
- [OPay Signature Verification](https://documentation.opaycheckout.com/callback-signature)
- [OPay Payment Status API](https://documentation.opaycheckout.com/query-payment-status)
