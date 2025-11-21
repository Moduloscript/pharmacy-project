# Paystack Payment Integration Documentation

## Overview

This guide covers the complete implementation of the Paystack payment gateway as the tertiary payment option in the BenPharm Nigerian payment system. Paystack processes payments with a fee structure of **1.5% + ₦100** per transaction and provides comprehensive Nigerian payment method support.

## Features

### Supported Payment Methods
- 💳 **Debit/Credit Cards** - All major Nigerian bank cards
- 🏦 **Bank Transfer** - Direct bank account payments
- 📱 **USSD Payments** - Nigeria's widely used USSD banking
- 📲 **Mobile Money** - Mobile wallet integrations
- 🏧 **QR Codes** - QR-based payment processing
- 🔒 **Apple Pay** - iOS device payments

### Nigerian-Specific Features
- **Fee Structure**: 1.5% + ₦100 per transaction (T+2 settlement)
- **Health Monitoring**: Real-time gateway status tracking
- **Fallback Integration**: Automatic fallback to Flutterwave → OPay → Paystack
- **Nigerian Validation**: Phone number, currency, and amount validation
- **Local Error Messages**: Nigerian-friendly error text
- **Business Hours Awareness**: Nigerian banking hour considerations

## Implementation Details

### File Structure
```
packages/payments/provider/paystack/
├── index.ts                    # Main Paystack provider implementation
└── __tests__/
    └── paystack.test.ts        # Comprehensive test suite
```

### Core Classes and Functions

#### `PaystackProvider`
Implements the `NigerianPaymentProvider` interface with full Paystack integration:

```typescript
const provider = new PaystackProvider({
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  environment: env === 'production' ? 'production' : 'sandbox'
});
```

#### `createPaystackProvider()`
Factory function with automatic environment variable loading:

```typescript
const provider = createPaystackProvider();
```

### API Integration Points

#### Payment Initialization
- **Endpoint**: `POST /transaction/initialize`
- **Amount**: Converted Naira → Kobo (multiply by 100)
- **Metadata**: Includes Nigerian-specific order information
- **Channels**: `['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer']`

#### Payment Verification
- **Endpoint**: `GET /transaction/verify/{reference}`
- **Response Mapping**: Paystack status → Internal system status
- **Fee Handling**: Automatic kobo → Naira conversion

#### Webhook Processing
- **Events**: `charge.success`, `charge.failed`,
- **Verification**: HMAC-SHA512 signature verification
- **Security**: Replay attack prevention

## Environment Configuration

### Required Environment Variables
```bash
# Paystack Payment Gateway (Tertiary)
PAYSTACK_PUBLIC_KEY="pk_test_your_paystack_public_key"
PAYSTACK_SECRET_KEY="sk_test_your_paystack_secret_key"
PAYSTACK_WEBHOOK_SECRET="your_paystack_webhook_secret"
```

### Optional Environment Variables
```bash
PAYSTACK_BASE_URL="https://api.paystack.co"  # Production URL (sandbox uses same)
PAYSTACK_ENVIRONMENT="sandbox|production"    # Auto-detected from NODE_ENV
```

### Webhook Configuration
- **Webhook URL**: `https://your-domain.com/api/payments/webhook`
- **Header**: `x-paystack-signature` (HMAC-SHA512)
- **Events**: Subscribe to `charge.*` events

## Usage Examples

### Basic Payment Initialization
```typescript
import { PaystackProvider, createPaystackProvider } from '@repo/payments';

// Method 1: Direct instantiation
const provider = new PaystackProvider({
  publicKey: 'your_public_key',
  secretKey: 'your_secret_key',
  webhookSecret: 'your_webhook_secret',
});

// Method 2: Factory function (recommended)
const provider = createPaystackProvider();

// Initialize payment
const result = await provider.initializePayment({
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
    }
  ],
  deliveryAddress: '123 Medical Street, Lagos',
  deliveryFee: 1000,
});

// Redirect customer to payment URL
if (result.success) {
  window.location.href = result.paymentUrl!;
}
```

### Payment Verification
```typescript
// Verify after payment completion
const verification = await provider.verifyPayment('BP_1699123456_ABC123');

if (verification.success && verification.status === 'SUCCESS') {
  console.log(`Payment of ₦${verification.amount} successful`);
  console.log(`Gateway Fee: ₦${verification.gatewayFee}`);
  console.log(`Payment Method: ${verification.paymentMethod}`);
}
```

### USSD Payment Generation
```typescript
// Generate USSD payment instructions
const ussdPayment = await provider.generateUSSDPayment(order, '058'); // GTBank code

if (ussdPayment.ussdCode) {
  console.log(ussdPayment.instructions);
  // Output: "Dial *737*5000# to complete payment of ₦5000"
}
```

### Bank Transfer Payment
```typescript
// Initialize bank transfer payment
const bankTransfer = await provider.initializeBankTransfer(order);

if (bankTransfer.success) {
  console.log(`Bank transfer URL: ${bankTransfer.paymentUrl}`);
}
```

### Nigerian Banks Integration
```typescript
// Get list of supported Nigerian banks
const banks = await provider.getNigerianBanks();

console.log(`Found ${banks.length} Nigerian banks:");
banks.forEach(bank => {
  console.log(`${bank.code}: ${bank.name}`);
});

// Output:
// 058: GTBank
// 011: First Bank
// 057: Zenith Bank
// 044: Access Bank
// // ... etc
```

### Webhook Handling
```typescript
// In your webhook endpoint
export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get('x-paystack-signature');

  try {
    const result = await provider.handleWebhook(payload, signature);

    if (result.processed) {
      // Update order status in database
      await updateOrderStatus(result.orderId, result.paymentStatus);

      return Response.json({ success: true, processed: true });
    }

    return Response.json({ success: true, processed: false });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
```

## Payment Orchestration Integration

### Fallback Logic Integration
```typescript
import { getPaymentOrchestrator } from '@repo/payments';

const orchestrator = getPaymentOrchestrator();

// Register all three gateways
orchestrator.registerProvider(createFlutterwaveProvider());  // Primary
// orchestrator.registerProvider(createOPayProvider());      // Secondary (when implemented)
orchestrator.registerProvider(createPaystackProvider());    // Tertiary

// Process payment with automatic fallback
const result = await orchestrator.processPayment(nigerianOrder);

console.log(`Payment processed via: ${result.gateway}`);
console.log(`Attempts made: ${result.attempts.length}`);
```

### Gateway Health Monitoring
```typescript
// Check gateway health
const health = await provider.checkGatewayHealth();

if (health.isHealthy) {
  console.log(`Paystack is healthy (${health.responseTime}ms)`);
} else {
  console.log(`Paystack issue: ${health.error}`);
}

// Get orchestrator statistics
const stats = orchestrator.getGatewayStats();
stats.forEach(stat => {
  console.log(`${stat.gateway}: ${stat.isHealthy ? '✅' : '❌'} (${stat.responseTime}ms)`);
});
```

## Error Handling

### Nigerian Payment Error Types
```typescript
import { NIGERIAN_PAYMENT_ERRORS, NigerianPaymentError } from '@repo/payments';

try {
  await provider.initializePayment(order);
} catch (error) {
  if (error instanceof NigerianPaymentError) {
    switch (error.code) {
      case NIGERIAN_PAYMENT_ERRORS.INVALID_PHONE:
        console.log('Please enter a valid Nigerian phone number');
        break;
      case NIGERIAN_PAYMENT_ERRORS.INVALID_AMOUNT:
        console.log('Amount must be between ₦1 and ₦10,000,000');
        break;
      case NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN:
        console.log('Paystack is temporarily unavailable');
        break;
      // ... handle other error types
    }
  }
}
```

### User-Friendly Error Messages
The implementation provides Nigerian-specific error messages:

- **Network Issues**: *"Network connection issue. Please check your internet and try again."*
- **Bank Decline**: *"Your bank declined this transaction. Please contact your bank or try a different card."*
- **Insufficient Funds**: *"Insufficient funds. Please fund your account and try again."*
- **Invalid Phone**: *"Please enter a valid Nigerian phone number (e.g., +2348012345678)"*

## Testing

### Running Tests
```bash
# Run Paystack-specific tests
pnpm --filter payments test -- path/to/paystack/test

# Run all payment tests
pnpm --filter payments test

# Test with coverage
pnpm --filter payments test -- --coverage
```

### Test Data
```typescript
// Mock test order data
const mockOrder: NigerianOrder = {
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
    }
  ],
  deliveryAddress: '123 Medical Street, Lagos',
  deliveryFee: 0,
};
```

## Security Considerations

### API Key Management
- **Public Key**: Can be exposed in frontend code
- **Secret Key**: Must be server-side only
- **Webhook Secret**: Must be server-side only
- **Environment Separation**: Use different keys for test/live

### Webhook Security
- **Signature Verification**: Always verify `x-paystack-signature` header
- **HMAC-SHA512**: Paystack uses HMAC-SHA512 for webhook signatures
- **IP Whitelisting**: Restrict webhook endpoints to Paystack IPs
- **Replay Protection**: Implement deduplication logic

### PCI Compliance
- **Data Handling**: Never store full card details
- **Tokenization**: Use Paystack's token system for recurring payments
- **Audit Trail**: Log all payment operations for compliance

## Performance Optimization

### Response Time Targets
- **Payment Initialization**: < 2 seconds
- **Payment Verification**: < 1 second
- **Webhook Processing**: < 500ms
- **Health Checks**: < 5 seconds

### Caching Strategies
```typescript
// Cache bank lists (changes infrequently)
const BANKS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cache gateway health status
const HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Network Optimization
- **Keep-Alive**: Reuse HTTP connections
- **Timeouts**: Implement realistic timeout values (30s for payments)
- **Retry Logic**: Exponential backoff for failed requests
- **Graceful Degradation**: Fallback to other gateways when unhealthy

## Monitoring and Alerting

### Key Metrics
- **Success Rate**: Target > 98% payment success rate
- **Response Time**: Monitor API response times
- **Error Rates**: Track error types and frequencies
- **Gateway Health**: Real-time status monitoring

### Alerting Thresholds
- **Success Rate** < 95%: Immediate alert
- **Response Time** > 5s: Warning
- **Gateway Down**: Immediate alert
- **Error Rate** > 5%: Warning

### Logging
```typescript
// Payment events to log
- Payment initialization attempts
- Payment verification results
- Webhook processing
- Gateway health checks
- Error conditions with full context

// Log format (JSON)
{
  "timestamp": "2024-01-01T12:00:00Z",
  "gateway": "PAYSTACK",
  "event": "payment_initialized",
  "orderId": "order-123",
  "amount": 5000,
  "currency": "NGN",
  "responseTime": 1200,
  "success": true
}
```

## Troubleshooting

### Common Issues

#### 1. Payment Initialization Fails
**Symptoms**: API calls return "Invalid request" errors
**Solutions**:
- Check API keys and environment
- Verify order data validation
- Ensure currency is NGN
- Validate Nigerian phone format

#### 2. Webhook Signature Verification Fails
**Symptoms**: "Invalid webhook signature" errors
**Solutions**:
- Verify webhook secret matches dashboard
- Ensure JSON payload is stringified correctly
- Check header name: `x-paystack-signature`
- Verify HMAC-SHA512 implementation

#### 3. Payment Verification Fails
**Symptoms**: Verification returns failed status
**Solutions**:
- Use correct reference from initialization response
- Wait for payment completion before verifying
- Check webhook events for payment status
- Verify webhook processing completed

#### 4. Gateway Health Issues
**Symptoms**: Slow response times or timeouts
**Solutions**:
- Monitor `/bank` endpoint for health checks
- Implement circuit breaker pattern
- Use fallback gateways when unhealthy
- Check Nigerian network conditions

### Debug Mode
```typescript
// Enable debug logging
process.env.NODE_ENV = 'development';
process.env.DEBUG_PAYMENTS = 'true';

// Test webhook locally with ngrok
ngrok http 3000
# Update webhook URL to ngrok URL

# Use Paystack dashboard test cards
# https://paystack.com/docs/payments/test-cards
```

## Future Enhancements

### Planned Features
1. **Recurring Payments**: Support for subscription payments
2. **Split Payments**: Revenue sharing with multiple accounts
3. **Refund Management**: Automated refund processing
4. **Advanced Analytics**: Payment analytics and insights
5. **Mobile App Integration**: React Native support

### Integration Opportunities
1. **Bulk Discounts**: Integration with product pricing system
2. **Inventory Management**: Automatic stock updates
3. **Customer Accounts**: Wallet system integration
4. **Loyalty Programs**: Points and rewards integration

## Support and Resources

### Official Documentation
- **Paystack API Docs**: https://paystack.com/docs/api
- **Test Cards**: https://paystack.com/docs/payments/test-cards
- **Webhook Guide**: https://paystack.com/docs/payments/webhooks

### Nigerian Banking Resources
- **Nigerian Interbank Settlement System (NIBSS)**
- **Central Bank of Nigeria (CBN) Guidelines**
- **Local Bank USSD Codes and Limits**

### Community Support
- **GitHub Issues**: Report bugs and feature requests
- **Developer Forums**: Nigerian payment implementation discussions
- **Stack Overflow**: Use `nigerian-payments` tag

---

## Quick Reference

### Fee Comparison (Nigerian Market)
| Gateway | Fee Structure | Settlement Time | Priority |
|---------|---------------|-----------------|----------|
| Flutterwave | 1.4% + ₦50 | T+1 business days | Primary |
| OPay | 1.5% | Instant to 24 hours | Secondary |
| Paystack | 1.5% + ₦100 | T+2 business days | Tertiary |

### Status Mapping
| Paystack Status | Internal Status |
|-----------------|-----------------|
| `success` | `SUCCESS` |
| `failed` | `FAILED` |
| `pending` | `PENDING` |
| `abandoned` | `ABANDONED` |

### API Endpoints
- **Sandbox**: `https://api.paystack.co`
- **Production**: `https://api.paystack.co`
- **Documentation**: `https://paystack.com/docs/api`

This Paystack implementation provides robust, Nigerian-market-optimized payment processing with comprehensive error handling, security measures, and integration with the existing payment orchestration system.