# Termii Webhook Signature Verification - Fixed ✅

## Issue
The webhook signature verification was failing with 401 Unauthorized errors when Termii sent delivery status updates.

## Root Cause
The signature verification was re-serializing the JSON body instead of using the raw request body for HMAC computation.

## Solution Implemented

### 1. Use Raw Body for Signature Verification
According to Termii documentation, the `X-Termii-Signature` header contains an HMAC SHA512 signature of the **raw event payload** signed with your secret key.

**Before (incorrect):**
```typescript
const deliveryData = c.req.valid('json');
const rawBody = JSON.stringify(deliveryData); // Re-serialization issue
```

**After (correct):**
```typescript
const rawBody = await c.req.text(); // Get raw body first
const deliveryData = JSON.parse(rawBody); // Parse for validation
// Use rawBody for signature verification
```

### 2. Support Multiple Encoding Formats
The verification now supports both hex and base64 encoding formats:
- **Hex format** (used by Termii) ✅
- **Base64 format** (fallback)

### 3. Case-Insensitive Comparison
Signatures are compared case-insensitively for hex format to handle any case variations.

## Testing

### Debug Endpoint
Created `/api/webhooks/notifications/debug-signature` to test different signature computation methods:
- Direct raw body (✅ matches)
- Compact JSON (✅ matches)
- Pretty-printed JSON (doesn't match)
- Sorted keys JSON (doesn't match)

### Test Results
```powershell
# Signature verification successful
.\scripts\test-termii-webhook-delivery.ps1 -NgrokUrl "https://your-ngrok-url"

# Different statuses work correctly
-Status "DELIVERED"        # Maps to DELIVERED
-Status "Message Failed"   # Maps to FAILED
-Status "DND Active on Phone Number"  # Maps to DND_BLOCKED
```

## Configuration

### Environment Variables
```env
# Webhook secret for signature verification
TERMII_WEBHOOK_SECRET=your_webhook_secret_here
```

### Webhook URL
Configure in Termii dashboard:
```
https://your-domain.com/api/webhooks/notifications/termii/delivery
```

## Security Notes

1. **Always verify signatures in production** - Prevents unauthorized webhook calls
2. **Use timing-safe comparison** - Prevents timing attacks
3. **Return success even for unmatched notifications** - Prevents webhook retry storms
4. **Log signature verification failures** - For debugging but don't expose details

## Status Mappings

| Termii Status | Internal Status |
|--------------|-----------------|
| DELIVERED | DELIVERED |
| Delivered | DELIVERED |
| Message Failed | FAILED |
| Rejected | FAILED |
| Expired | FAILED |
| Message Sent | SENT |
| DND Active on Phone Number | DND_BLOCKED |
| Received | RECEIVED |

## Next Steps

1. ✅ Signature verification working
2. ✅ Webhook endpoint receiving and processing delivery updates
3. ✅ Status mappings configured
4. ⏳ Configure webhook URL in Termii dashboard when ready for production
5. ⏳ Monitor delivery status updates in production

## References
- [Termii Events Documentation](https://developer.termii.com/events-and-reports)
- Signature Algorithm: HMAC SHA512
- Header: `X-Termii-Signature`
- Encoding: Hexadecimal (lowercase)
