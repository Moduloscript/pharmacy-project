# Epic 8: SMS Notification System (WhatsApp Deferred)

## Overview
Implement automated customer communication via SMS gateway using Termii (Nigerian provider) to ensure reliable delivery of order updates and notifications. WhatsApp Business API integration deferred to Phase 2 due to verification complexity.

## Nigerian Communication Landscape

### SMS Gateway (Termii) - PRIMARY
- **Provider**: Termii (Nigerian SMS provider)
- **Cost**: ₦3-4 per SMS (DND channel)
- **Coverage**: 100% mobile network coverage (MTN, Airtel, Glo, 9mobile)
- **Benefits**: Reaches all phone types, reliable delivery, DND bypass for transactional
- **Use Cases**: Order confirmations, payment notifications, delivery updates, OTP
- **Priority**: P0 (Must Have - IMPLEMENTED)

### WhatsApp Business API - FUTURE
- **Platform**: Meta WhatsApp Business Platform
- **Coverage**: High penetration in Nigeria (95%+ smartphone users)
- **Benefits**: Rich media, templates, high engagement
- **Use Cases**: Enhanced notifications with images, interactive messages
- **Priority**: P2 (Deferred to Phase 2)

### Alternative SMS Provider
- **Provider**: Africa's Talking
- **Cost**: Competitive Nigerian rates
- **Coverage**: Pan-African coverage
- **Benefits**: Reliable alternative, good API
- **Priority**: P1 (Backup option)

## Functional Requirements

### FR-NOT-001: SMS Notifications (PRIMARY)
- Order confirmation messages via SMS
- Payment status updates via SMS
- Shipping and delivery notifications via SMS
- Low stock alerts for pharmacy admins
- Verification codes (OTP) for account security
- Business verification status updates

### FR-NOT-002: WhatsApp Notifications (FUTURE - Phase 2)
- Rich media order confirmations
- Interactive payment receipts
- Delivery tracking with maps
- Promotional messages (with opt-in)
- Customer support chat integration

### FR-NOT-003: Notification Templates
- SMS message templates optimized for 160 character limit
- Nigerian context and local currency formatting (₦)
- Clear, concise English messaging
- Personalization with customer and order data
- Sender ID branding (BenPharm)

### FR-NOT-004: Delivery Management
- Message queue system for reliable delivery
- Retry logic for failed messages
- Delivery status tracking and logging
- Rate limiting to comply with platform rules

### FR-NOT-005: User Preferences
- Customer opt-in/opt-out management
- Notification channel preferences
- Message frequency controls
- Unsubscribe handling

## User Stories

### Customer Stories
- As a customer, I want to receive SMS confirmations for my orders
- As a customer, I want timely SMS updates on my order status
- As a customer, I want payment confirmation via SMS
- As a customer, I want delivery notifications via SMS
- As a customer, I want notifications in clear, simple English

### Business Stories
- As a pharmacy, I want low stock alerts via SMS
- As an admin, I want to track SMS delivery rates
- As a business owner, I want to monitor SMS costs
- As an admin, I want to manage SMS templates
- As an admin, I want balance alerts for SMS credits

## Technical Implementation

### SMS Integration (Termii) - ACTIVE
```typescript
interface TermiiProvider {
  sendMessage(data: NotificationJobData): Promise<NotificationJobResult>
  sendOTP(phone: string, message: string, pinLength: number): Promise<OTPResponse>
  testConnection(): Promise<boolean>
  getAccountInfo(): Promise<{ balance: number; currency: string }>
}

// Implemented in packages/mail/src/provider/termii.ts
class TermiiProvider extends BaseNotificationProvider {
  channel = 'sms'
  // DND channel for transactional messages
  // Nigerian phone number validation
  // Balance monitoring
}
```

### WhatsApp Integration (FUTURE - Phase 2)
```typescript
interface WhatsAppProvider {
  sendTemplate(phone: string, template: WhatsAppTemplate): Promise<MessageResponse>
  sendMessage(phone: string, message: string): Promise<MessageResponse>
  getMessageStatus(messageId: string): Promise<MessageStatus>
}

// Will be implemented in packages/mail/src/provider/whatsapp.ts
// Requires Meta Business verification and template approval
```

### Notification Queue System
```typescript
interface NotificationQueue {
  enqueue(notification: Notification): Promise<void>
  process(): Promise<void>
  retry(failedNotification: Notification): Promise<void>
}
```

## Message Templates

### SMS Templates (ACTIVE)

#### Order Confirmation
```
Order #{{order}} confirmed! Total: ₦{{amount}}. Track: {{url}} - BenPharm
```

#### Payment Confirmation
```
Payment received for Order #{{order}}: ₦{{amount}} via {{method}}. Thank you! - BenPharm
```

#### Delivery Update
```
Order #{{order}} is {{status}}. {{eta_or_notes}} - BenPharm
```

#### Low Stock Alert (Admin)
```
ALERT: {{product}} low stock ({{qty}}). Action: {{action}} - BenPharm
```

#### Business Verification
```
Business verification for {{business_name}}: {{status}} - BenPharm
```

### WhatsApp Templates (FUTURE - Phase 2)
```
🏥 *BenPharm Order Confirmation*
Order #{{order_number}} confirmed!
Total: ₦{{total}}
[Track Order] [View Details]

📦 *Delivery Update*
Your order is {{status}}
[Track Package] [Contact Support]
```

## Nigerian-Specific Considerations

### Phone Number Handling
- Support +234 Nigerian format
- Handle various input formats (0801..., 234801..., +234801...)
- Validate against Nigerian mobile networks (MTN, Airtel, Glo, 9mobile)

### Network Optimization
- Message delivery during network congestion
- Retry logic for failed deliveries
- SMS fallback for poor internet connectivity areas
- Time-based delivery optimization

### Cultural Considerations
- Clear, simple English messages
- Respect for business hours in notifications
- Cultural sensitivity in promotional content
- Local payment method references

## Non-Functional Requirements

### Performance
- Message queue processing < 5 seconds
- WhatsApp template delivery < 10 seconds
- SMS delivery < 30 seconds
- Support 10,000+ daily messages

### Reliability
- 99.5% message delivery rate
- Automatic fallback to SMS if WhatsApp fails
- Message retry up to 3 attempts
- Delivery confirmation tracking

### Compliance
- WhatsApp Business Policy compliance
- Nigerian telecommunications regulations
- Data privacy for customer phone numbers
- Opt-in/opt-out compliance (GDPR-like)

### Cost Management
- SMS cost tracking and budgeting
- WhatsApp conversation cost monitoring
- Prevent spam and over-messaging
- Cost alerts for excessive usage

## Testing Requirements

### WhatsApp Testing
- Test with Nigerian phone numbers
- Test template approval process
- Test message delivery during peak hours
- Test multimedia message delivery

### SMS Testing
- Test with all Nigerian mobile networks
- Test SMS delivery to different phone types
- Test special characters and emojis
- Test message concatenation for long texts

### Integration Testing
- Test notification triggers from order flow
- Test fallback from WhatsApp to SMS
- Test bulk message sending
- Test delivery status tracking

## Success Criteria
- [x] SMS provider (Termii) integration functional
- [x] SMS templates configured and tested
- [x] Nigerian phone number validation working
- [x] OTP functionality implemented
- [⚠️] Notification queue system (BullMQ) deployment needed
- [⚠️] SMS delivery tracking and logging (basic implemented, advanced needed)
- [x] Admin dashboard for SMS management (basic implemented)
- [x] SMS cost tracking and balance monitoring
- [x] DND channel compliance verified
- [x] WhatsApp integration deferred to Phase 2
- [x] Webhook integration for Termii
- [x] Nigerian phone number normalization

## Risk Mitigation
- **SMS Provider Outage**: Consider backup provider (Africa's Talking)
- **High SMS Costs**: Monitor usage, set balance alerts at ₦10,000
- **Network Issues**: Exponential backoff retry (3 attempts)
- **Phone Number Errors**: Comprehensive validation for Nigerian formats
- **Balance Depletion**: Auto-recharge alerts, manual top-up process
- **WhatsApp Complexity**: Successfully deferred to Phase 2

## Integration Points
- **Order System**: Trigger notifications on order events
- **Payment System**: Send payment confirmations
- **Inventory System**: Low stock alerts
- **User Management**: Handle opt-in/opt-out preferences

## Budget: ₦200,000
## Timeline: 2 weeks
## Dependencies: Epic 7 (Payment Gateway Integration)
## Status: Near Complete 🔄 (90% - Queue System & Advanced Tracking Remaining)
## Implementation Notes: Termii SMS provider fully implemented with Nigerian phone validation, OTP, DND bypass, and webhook integration. Basic admin dashboard and cost tracking implemented. Only BullMQ deployment and advanced delivery tracking remain.
## Priority: High (P0)
