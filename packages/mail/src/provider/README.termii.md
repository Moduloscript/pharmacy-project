# Termii SMS Provider Setup Guide

## Overview
The Termii provider enables SMS notifications for the BenPharm pharmacy platform, optimized for Nigerian carriers and DND compliance.

## Features
- ✅ **DND Channel Support** - Bypasses Do Not Disturb for transactional messages
- ✅ **Nigerian Carrier Optimization** - Works with MTN, Airtel, Glo, and 9mobile
- ✅ **Phone Number Validation** - Automatic Nigerian number format validation
- ✅ **Template System** - Supports Nigerian pharmacy message templates
- ✅ **OTP Support** - Built-in OTP functionality for verification flows
- ✅ **Balance Monitoring** - Real-time account balance checking
- ✅ **Error Handling** - Intelligent retry logic for Nigerian network conditions

## Quick Setup

### 1. Get Termii API Credentials
1. Sign up at [termii.com](https://termii.com)
2. Complete KYC verification
3. Get your API key from the dashboard
4. Register your sender ID (BenPharm recommended)

### 2. Environment Configuration
Add these to your `.env` file:

```bash
# Termii Configuration (Primary option)
TERMII_API_KEY="your-termii-api-key-here"
TERMII_SENDER_ID="BenPharm"

# Alternative variable names (fallback)
SMS_API_KEY="your-termii-api-key-here" 
SMS_SENDER_ID="BenPharm"
```

### 3. Initialize Provider
```typescript
import { TermiiProvider, notificationService } from '@repo/mail';

// Create provider from environment variables
const termiiProvider = TermiiProvider.fromEnvironment();

// Register with notification service
notificationService.registerProvider(termiiProvider);

// Test connection
const isConnected = await termiiProvider.testConnection();
console.log('Termii connection:', isConnected ? '✅ Connected' : '❌ Failed');
```

## Usage Examples

### Order Confirmation SMS
```typescript
// Via NotificationService (recommended)
await notificationService.sendOrderConfirmation({
  id: 'order-123',
  orderNumber: 'ORD001',
  customerId: 'customer-456',
  total: 5000,
  deliveryAddress: 'Lagos, Nigeria'
});

// Direct provider usage
const result = await termiiProvider.send({
  notificationId: 'notif-123',
  type: 'order_confirmation',
  channel: 'sms',
  recipient: '+2348012345678',
  template: 'order_confirmation_sms',
  templateParams: {
    order_number: 'ORD001',
    total_amount: 5000,
    tracking_url: 'https://benpharm.ng/track/ORD001'
  }
});
```

### Low Stock Admin Alert
```typescript
await notificationService.sendLowStockAlerts([
  {
    id: 'prod-123',
    name: 'Paracetamol 500mg',
    stockQuantity: 5,
    minOrderQuantity: 100
  }
]);
```

### OTP Verification
```typescript
const otpResult = await termiiProvider.sendOTP(
  '+2348012345678',
  'Your BenPharm verification code is < 1234 >. Valid for 5 minutes.',
  4 // 4-digit PIN
);
```

## Nigerian Phone Number Formats

The provider automatically handles various Nigerian number formats:

```typescript
// All of these are valid and normalized to +2348012345678
const validFormats = [
  '+2348012345678',  // International format
  '2348012345678',   // Without + prefix  
  '08012345678',     // Local format with 0
  '8012345678',      // Without leading 0
  '+234 801 234 5678', // With spaces
  '0801 234 5678'    // Local with spaces
];
```

## Message Templates

### Pre-configured Templates
- `order_confirmation_sms` - Order confirmation with tracking
- `payment_success_sms` - Payment confirmation
- `delivery_update_sms` - Delivery status updates
- `low_stock_alert_admin_sms` - Admin stock alerts
- `business_verification_sms` - Business verification status

### Custom Templates
```typescript
// Register custom template
notificationService.registerTemplate({
  name: 'custom_promo',
  channel: 'sms',
  requiredParams: ['customer_name', 'discount_percent'],
  preview: 'Hi {{customer_name}}, enjoy {{discount_percent}}% off your next order!'
});
```

## Cost Optimization

### DND Channel Benefits
- **Transactional Priority**: Messages bypass Do Not Disturb settings
- **Higher Delivery Rates**: ~95% delivery success on major Nigerian networks
- **Regulatory Compliance**: Complies with NCC guidelines for pharmacy notifications

### Message Length Optimization
- **Single SMS**: 160 characters (₦3-4 per message)
- **Multi-part SMS**: Up to 612 characters (₦12-16 per message)
- **Automatic Warnings**: Provider warns if message exceeds optimal length

## Error Handling

### Retryable Errors
- Network timeouts
- Rate limiting (429)
- Server errors (5xx)
- Temporary carrier issues

### Non-Retryable Errors  
- Invalid API key
- Invalid phone numbers
- Insufficient account balance
- Invalid sender ID

### Monitoring
```typescript
// Check account balance
const accountInfo = await termiiProvider.getAccountInfo();
console.log(`Balance: ${accountInfo.balance} ${accountInfo.currency}`);

// Health check
const healthStatus = await notificationService.healthCheck();
console.log('Provider health:', healthStatus);
```

## Production Checklist

- [ ] **API Key**: Production Termii API key configured
- [ ] **Sender ID**: "BenPharm" sender ID approved by Termii
- [ ] **Balance**: Sufficient account balance for expected volume
- [ ] **Templates**: All message templates tested with real Nigerian numbers
- [ ] **Monitoring**: Error tracking and balance monitoring set up
- [ ] **Backup**: Consider fallback SMS provider for redundancy

## Troubleshooting

### Common Issues

**❌ "Invalid API key"**
- Check TERMII_API_KEY in environment variables
- Verify key is not expired
- Ensure no extra spaces in the key

**❌ "Invalid phone number"**  
- Check number format (must be Nigerian +234xxx)
- Ensure number starts with valid network prefix (701-909 range)
- Remove special characters except +

**❌ "Insufficient balance"**
- Check account balance via Termii dashboard
- Top up account or contact Termii support
- Consider setting up auto-recharge

**❌ "Sender ID not approved"**
- Submit sender ID for approval in Termii dashboard  
- Wait for approval (usually 24-48 hours)
- Use default numeric sender as temporary solution

### Support
- **Termii Support**: [support@termii.com](mailto:support@termii.com)
- **Documentation**: [docs.termii.com](https://docs.termii.com)
- **BenPharm Integration**: Check notification service logs and error tracking
