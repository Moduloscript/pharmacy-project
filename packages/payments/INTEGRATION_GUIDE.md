# Nigerian Payment System Integration Guide

This guide provides step-by-step instructions for integrating the Nigerian Payment System into your main application.

## Overview

The Nigerian Payment System has been enhanced to work seamlessly alongside your existing payment infrastructure (Stripe, etc.). The system provides:

- **Enhanced Checkout**: Automatically detects Nigerian users and routes them through appropriate payment gateways
- **Enhanced Webhooks**: Handles both traditional and Nigerian payment webhooks
- **Fallback Support**: Falls back to traditional payment systems if Nigerian gateways fail
- **Multi-Gateway Support**: Supports Flutterwave, Paystack, and OPay

## 1. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Nigerian Payment System Configuration
NIGERIAN_PAYMENTS_ENABLED=true
NEXT_PUBLIC_CURRENCY=NGN
NEXT_PUBLIC_CURRENCY_SYMBOL=₦

# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_webhook_secret

# Paystack Configuration (Optional)
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# OPay Configuration (Optional)
OPAY_PUBLIC_KEY=your_opay_public_key
OPAY_SECRET_KEY=your_opay_secret_key
```

## 2. Backend Integration

The backend integration has been completed automatically. The system now uses:

### Enhanced Checkout API
- **Endpoint**: `/api/payments/create-checkout-link`
- **Behavior**: Automatically detects Nigerian users and routes through appropriate gateways
- **Fallback**: Falls back to Stripe/traditional systems if Nigerian gateways fail

### Enhanced Webhook Handler
- **Endpoint**: `/webhooks/payments`
- **Behavior**: Processes both traditional (Stripe) and Nigerian payment webhooks
- **Auto-detection**: Determines webhook source based on headers and payload

## 3. Frontend Integration

### Option A: Use Enhanced Checkout Component

Replace your existing checkout component with the enhanced version:

```tsx
import { EnhancedCheckoutPage } from '@/modules/saas/cart/components/EnhancedCheckoutPage';

// In your checkout page
export default function CheckoutPage() {
  return (
    <EnhancedCheckoutPage 
      onOrderComplete={(orderId) => {
        // Handle order completion
        console.log('Order completed:', orderId);
      }}
    />
  );
}
```

### Option B: Update Existing Checkout Component

If you prefer to keep your existing checkout component, update it to use the enhanced API:

```tsx
// Replace your checkout API call
const response = await fetch('/api/payments/create-checkout-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'one-time',
    productId: productId,
    redirectUrl: redirectUrl,
    // Your existing data
  })
});
```

## 4. Testing the Integration

### Test Nigerian Detection

1. Set environment variables:
   ```bash
   NIGERIAN_PAYMENTS_ENABLED=true
   NEXT_PUBLIC_CURRENCY=NGN
   ```

2. Access the checkout page
3. Verify that Nigerian payment options are displayed
4. Test phone number validation for Nigerian format

### Test Fallback Mechanism

1. Temporarily set invalid Nigerian gateway credentials
2. Attempt a Nigerian payment
3. Verify system falls back to traditional payment gateway

### Test Webhook Processing

1. Use ngrok or similar tool to expose your webhook endpoint
2. Configure Nigerian gateway webhooks to point to your endpoint
3. Complete a test payment
4. Verify webhook is processed correctly

## 5. Database Considerations

The enhanced system works with your existing database schema. Nigerian payments are stored as regular purchase records with:

- `customerId`: Prefixed with `nigerian_` for Nigerian payments
- `productId`: Generated order IDs for pharmacy orders
- `type`: Set to `ONE_TIME` by default
- `status`: Mapped from Nigerian gateway statuses to your existing statuses

## 6. Monitoring and Debugging

### Log Monitoring

Monitor these log entries:
- `Enhanced checkout link creation`
- `Nigerian checkout flow`
- `Enhanced webhook handler`
- `Nigerian webhook processing`

### Common Issues

1. **Nigerian gateway not detected**: Check environment variables
2. **Webhook verification fails**: Verify webhook secrets
3. **Fallback not working**: Check traditional gateway configuration

## 7. Production Deployment

### Checklist

- [ ] Environment variables configured
- [ ] Nigerian gateway accounts set up (production keys)
- [ ] Webhook endpoints configured in gateway dashboards
- [ ] Database schema supports new fields
- [ ] Monitoring and alerting configured
- [ ] Fallback mechanisms tested

### Security Considerations

- All webhook signatures are verified
- Nigerian phone number validation is enforced
- Sensitive data is properly encrypted
- API keys are stored securely in environment variables

## 8. Advanced Configuration

### Custom Gateway Selection

You can customize gateway selection by modifying the detection logic in `enhanced-checkout.ts`:

```typescript
async function detectNigerianUser(options: Parameters<CreateCheckoutLink>[0]): Promise<boolean> {
  // Add custom logic here
  // Example: Check user's location, phone number, etc.
  return customDetectionLogic(options);
}
```

### Custom Order Mapping

Customize how traditional orders are mapped to Nigerian orders in `convertToNigerianOrder()`:

```typescript
async function convertToNigerianOrder(options: Parameters<CreateCheckoutLink>[0]): Promise<NigerianOrder> {
  // Add custom mapping logic
  const productData = await getProductDataFromDatabase(options.productId);
  // ... rest of mapping
}
```

## 9. API Reference

### Enhanced Checkout Link Creation

```typescript
interface CreateCheckoutLinkOptions {
  type: 'one-time' | 'subscription';
  productId: string;
  email?: string;
  name?: string;
  redirectUrl?: string;
  customerId?: string;
  organizationId?: string;
  userId?: string;
  trialPeriodDays?: number;
  seats?: number;
}
```

### Nigerian Order Format

```typescript
interface NigerianOrder {
  id: string;
  orderNumber: string;
  totalAmount: number; // In kobo (NGN * 100)
  currency: 'NGN';
  customer: {
    email: string;
    phone: string; // Nigerian format: +234XXXXXXXXXX
    name: string;
    state?: string;
    lga?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  deliveryAddress?: string;
  deliveryFee?: number;
}
```

## 10. Support and Troubleshooting

For issues related to the Nigerian Payment System integration:

1. Check the logs for error messages
2. Verify environment variable configuration
3. Test webhook endpoints with tools like Postman
4. Consult the Nigerian Payment System documentation
5. Check gateway-specific documentation (Flutterwave, Paystack, OPay)

## Next Steps

After successful integration:

1. Monitor payment success rates
2. Analyze user preferences for gateway selection
3. Optimize conversion rates
4. Consider adding more Nigerian payment methods
5. Implement advanced features like saved payment methods
6. Add analytics and reporting for Nigerian payments

The integration provides a solid foundation that can be extended based on your specific needs and user feedback.
