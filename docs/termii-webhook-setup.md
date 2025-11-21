# Termii Webhook Configuration Guide

This guide shows how to configure Termii webhooks for delivery status tracking based on the official Termii documentation.

## Overview

Termii sends delivery reports to your webhook endpoint when SMS messages are delivered, failed, or encounter other status changes.

## Webhook Configuration

### 1. Set up Webhook URL in Termii Dashboard

1. Go to your [Termii Developer Console](https://termii.com/account/webhook/config)
2. Add your webhook URL: `https://your-domain.com/api/webhooks/termii/delivery`
3. Configure the webhook secret (optional but recommended for security)

### 2. Webhook Payload Structure

Termii sends POST requests with the following JSON payload:

```json
{
  "type": "message_delivery_report",
  "id": "12345-67890-abcdef",
  "message_id": "msg_12345",
  "receiver": "+2348123456789",
  "sender": "modev",
  "message": "Your order confirmation...",
  "sent_at": "2025-01-06T10:30:00Z",
  "cost": "4.50",
  "status": "DELIVERED",
  "channel": "dnd"
}
```

### 3. Status Values

Termii sends the following status values:

| Status | Description | Internal Mapping |
|--------|-------------|------------------|
| `DELIVERED` | Message delivered to handset | `DELIVERED` |
| `Message Sent` | Sent to telecom providers, awaiting delivery report | `SENT` |
| `Message Failed` | Failed due to poor network | `FAILED` |
| `DND Active on Phone Number` | Do-not-disturb is active | `DND_BLOCKED` |
| `Rejected` | DND rejection | `FAILED` |
| `Expired` | Recipient device offline too long | `FAILED` |
| `Received` | Inbound message received | `RECEIVED` |

### 4. Webhook Security

Termii uses HMAC SHA512 signature verification:

- **Header**: `X-Termii-Signature`
- **Algorithm**: HMAC SHA512
- **Secret**: Your webhook secret from Termii dashboard
- **Payload**: The raw JSON payload

Our implementation automatically verifies the signature if `TERMII_WEBHOOK_SECRET` is configured.

### 5. Environment Variables

Make sure these environment variables are set:

```bash
# Required
TERMII_API_KEY="your_termii_api_key"
TERMII_SENDER_ID="modev"

# Optional but recommended for webhook security
TERMII_WEBHOOK_SECRET="your_webhook_secret_from_termii"

# Feature flags
TERMII_DND_ENABLED=true
NOTIFICATIONS_SMS_ENABLED=true
```

### 6. Testing the Webhook

#### Manual Test
```bash
curl -X POST https://your-domain.com/api/webhooks/termii/delivery \
  -H "Content-Type: application/json" \
  -H "X-Termii-Signature: your_signature_hash" \
  -d '{
    "type": "message_delivery_report",
    "id": "test-123",
    "message_id": "msg_test",
    "receiver": "+2348123456789",
    "sender": "modev",
    "message": "Test message",
    "sent_at": "2025-01-06T10:30:00Z",
    "cost": "4.50",
    "status": "DELIVERED",
    "channel": "dnd"
  }'
```

#### Test Endpoint
Use our test endpoint for debugging:
```bash
curl -X POST https://your-domain.com/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### 7. Monitoring

Check webhook health:
```bash
curl https://your-domain.com/api/webhooks/health
```

Monitor delivery status updates in your application logs for entries like:
```
📨 Received Termii delivery status: { messageId: 'msg_123', receiver: '+234...', status: 'DELIVERED' }
📊 Updated notification abc123 status to DELIVERED
```

## Troubleshooting

### Common Issues

1. **Missing webhook signature**: Ensure `TERMII_WEBHOOK_SECRET` is configured
2. **Notification not found**: Check if message_id exists in notification.gatewayResponse
3. **Invalid signature**: Verify webhook secret matches Termii dashboard configuration
4. **Wrong endpoint**: Ensure webhook URL in Termii dashboard matches your deployment

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL="debug"
```

This will show detailed webhook payload information and signature verification steps.

## Integration Checklist

- [ ] Webhook URL configured in Termii dashboard
- [ ] Environment variables set (`TERMII_API_KEY`, `TERMII_WEBHOOK_SECRET`)
- [ ] Notification system deployed and running
- [ ] Database migration applied (notification preferences tables)
- [ ] Test webhook endpoint responding
- [ ] Production webhook receiving Termii callbacks
- [ ] Delivery status updates visible in notification records

## Production Deployment

1. Configure webhook URL: `https://your-production-domain.com/api/webhooks/termii/delivery`
2. Set up SSL/TLS certificate for HTTPS
3. Configure firewall to allow Termii webhook IP addresses
4. Monitor webhook endpoint uptime and response times
5. Set up alerts for webhook failures or high error rates

## References

- [Termii Events and Reports Documentation](https://developer.termii.com/events-and-reports)
- [Termii Webhook Configuration Console](https://termii.com/account/webhook/config)
- [DND Service in Nigeria](https://termii.medium.com/the-dnd-service-in-nigeria-everything-you-need-to-know-72b7247e3968)
