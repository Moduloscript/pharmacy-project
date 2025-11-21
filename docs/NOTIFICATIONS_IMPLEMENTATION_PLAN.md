# SMS Notifications – Implementation Blueprint (BenPharm)

Status: Production Ready v2.0
Owner: Engineering (Backend/Full‑stack)
Scope: Customer and admin notifications via SMS (Termii) for orders, payments, delivery, verification, and inventory alerts. WhatsApp integration deferred to Phase 2.

---

## 1) Objectives

- Deliver reliable, low-latency customer/admin notifications via SMS (Termii).
- Align with BENIN_PHARMA_PRD.md (Phase 1/2) and TASKS.md (2.2 Notifications).
- Integrate seamlessly with existing Next.js + Hono API + Prisma stack.
- Ensure security, observability, and operational readiness.
- Prepare architecture for future WhatsApp integration (Phase 2).

Success criteria
- >98% successful SMS delivery for transactional notifications.
- <30s end-to-end latency from event to delivered message for 95th percentile.
- Zero duplicate notifications for the same event (idempotency).
- 100% coverage of Nigerian mobile networks (MTN, Airtel, Glo, 9mobile).

---

## 2) Recommended Stack (and rationale)

- **Primary Channel**: SMS via Termii – reliable Nigerian delivery, competitive pricing (₦3-4 per SMS), DND channel support, 100% phone coverage.
- **Future Channel** (Phase 2): WhatsApp Business Platform – rich media, templates, high engagement (deferred due to verification complexity).
- Queue: Redis + BullMQ – reliable processing, retries, backoff, concurrency control.
- Storage: Supabase Storage – reserved for future media attachments when WhatsApp/email is added (per project rule: Supabase manages image bucket).
- Monitoring/Tracing: Sentry + Prometheus/Grafana – failures, delivery times, throughput.
- Feature flags: Environment variables to enable/disable channels:
  - `NOTIFICATIONS_SMS_ENABLED=true` (default)
  - `NOTIFICATIONS_WHATSAPP_ENABLED=false` (future)

---

## 3) High-level Architecture

Event (order created / payment confirmed / status updated / low stock) → NotificationService
→ Create Notification row (status=PENDING) → enqueue job (BullMQ) → SMS Provider adapter
(Termii) → Provider response → Update Notification row (SENT/DELIVERED/FAILED)
→ Delivery status tracking → Metrics/alerts.

**Future Phase 2**: Add WhatsApp adapter parallel to SMS with webhook callbacks for delivery tracking.

---

## 4) Environments & Credentials

**Phase 1 (SMS) - Required**:
- `TERMII_API_KEY` or `SMS_API_KEY`
- `TERMII_SENDER_ID` or `SMS_SENDER_ID` (default: 'BenPharm')
- `REDIS_URL`
- `APP_URL` (for tracking links)
- `SENTRY_DSN` (optional)
- `NOTIFICATIONS_SMS_ENABLED=true`
- `NOTIFICATIONS_WHATSAPP_ENABLED=false`

**Phase 2 (Future WhatsApp) - Deferred**:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
- `SUPABASE_BUCKET_NOTIFICATIONS` (for media attachments)

Security
- Never log secrets. Mask PII (phone numbers) in logs.
- Use environment variables only; no secrets in code.
- Validate Nigerian phone number formats.
- Rate limit SMS sending to prevent abuse.

---

## 5) Data Model & Migrations

We will leverage the existing Notification model. Optional enhancements (phase 1.5):
- Add metadata Json? to store template params and provider message IDs.
- Add scheduledFor DateTime? for delayed messages (not required for v1).

Migration (optional):
- Add metadata Json?
- Add scheduledFor DateTime?

Idempotency
- Store an eventKey (string) on Notification (e.g., order:{id}:status:{state}) to prevent duplicates. Unique index on (eventKey, channel) in v1.5.

---

## 6) Provider Adapters (packages/mail)

**Phase 1 - SMS Provider (IMPLEMENTED)**:
- `packages/mail/src/provider/termii.ts` ✅
  - Send transactional SMS via Termii REST API using DND channel
  - Support for Nigerian phone number validation
  - OTP functionality for verification flows
  - Balance monitoring and account info

**Phase 2 - Future Providers**:
- `packages/mail/src/provider/whatsapp.ts` (Deferred)
  - Will support approved templates and interactive messages
  - Media attachment support via Supabase Storage

Interface:
```typescript
INotificationProvider
- sendMessage(input): Promise<ProviderResult>
- testConnection(): Promise<boolean>
- getAccountInfo(): Promise<AccountInfo>
```

Provider response payloads saved in Notification.gatewayResponse (truncated) and metadata.

---

## 7) Queue & Worker (BullMQ)

- Package: packages/queue (new) or colocate worker in packages/api with separate entrypoint.
- Queue name: notifications
- Concurrency: 10 (configurable)
- Backoff: exponential (e.g., 2s, 5s, 15s)
- Attempts: 3
- Dead-letter handling: if permanently failed, mark Notification as FAILED and alert.

Worker responsibilities
- Fetch Notification by ID
- Resolve channel → provider
- Compose message/template with params
- Call provider; update status + timestamps
- Record provider IDs in metadata

Operational
- Separate process: pnpm run start:worker (ecosystem or PM2/systemd in prod)

---

## 8) API Endpoints & Webhooks

**Phase 1 - SMS Endpoints (Active)**:
- POST /api/notifications/test – authenticated admin-only test sender
- GET /api/notifications/stats – delivery statistics and metrics

**Phase 2 - Future Endpoints (Deferred)**:
- POST /webhooks/whatsapp – WhatsApp delivery callbacks (commented out)

**Existing flows (integration points)**:
- Order created → enqueue order_confirmation (SMS primary)
- Payment webhook processed → enqueue payment_success (SMS)
- Order status update (READY/DISPATCHED/DELIVERED) → enqueue delivery_update (SMS)
- Low stock detection (cron) → enqueue low_stock_alert (SMS to admin phones)

---

## 9) Templates & Content

**Phase 1 - SMS Templates (Active)** ✅:
- **order_confirmation_sms**: "Order #{order} confirmed! Total: ₦{amount}. Track: {url} - BenPharm"
- **payment_success_sms**: "Payment received for Order #{order}: ₦{amount} via {method}. Thank you! - BenPharm"
- **delivery_update_sms**: "Order #{order} is {status}. {eta_or_notes} - BenPharm"
- **low_stock_alert_admin_sms**: "ALERT: {product} low stock ({qty}). Action: {action} - BenPharm"
- **business_verification_sms**: "Business verification for {business_name}: {status} - BenPharm"

**Phase 2 - WhatsApp Templates (Future)**:
Will require Meta Business Manager approval:
- order_confirmation_v1 (with rich formatting and buttons)
- payment_success_v1 (with receipt attachment)
- delivery_update_v1 (with tracking map)
- low_stock_alert_admin_v1 (with inventory dashboard link)

Localization
- Start with English. Add i18n tokens later if needed.

Branding
- Sender ID: BENPHARM (Termii) – register as needed.

---

## 10) Media Handling (Supabase Storage)

**Phase 2 - Future Implementation**:
- Not required for SMS-only Phase 1
- Will be used when WhatsApp/Email channels are added
- Bucket: notifications-media (managed by Supabase; per project rule)
- Store images/PDF invoices for rich messaging
- Generate short-lived pre-signed URLs for media messages
- Security: Never expose service role key client-side

---

## 11) Event Triggers & Integration Points

- orders.ts → after successful creation → NotificationService.sendOrderConfirmation(order)
- payments/webhooks.ts → after payment verified → NotificationService.sendPaymentSuccess(order, payment)
- admin/orders.ts → on status transitions → NotificationService.sendDeliveryUpdate(order)
- dashboard/inventory cron → low stock list → NotificationService.sendLowStockAlerts(items)

Guardrails
- Only one notification per eventKey/channel pair (idempotency)
- Feature flags per channel; fallback SMS if WhatsApp fails (configurable)

---

## 12) Retry, Idempotency, and DLQ

- BullMQ attempts: 3, exponential backoff
- Idempotency via Notification.eventKey (v1.5) or dedupe check by (orderId, type, channel, recent window)
- DLQ: move to FAILED; send admin email/Slack (future) or log Sentry alert

---

## 13) Observability & SLOs

Metrics (Prometheus/Grafana)
- notifications_sent_total{channel}
- notifications_delivered_total{channel}
- notifications_failed_total{channel,reason}
- notification_latency_seconds_bucket{type}

SLOs
- 95p delivery latency < 60s
- Failure rate < 2% daily (excluding provider outages)

Alerting
- Pager/Email on failure spikes; provider outage detection via health checks

---

## 14) Security & Compliance

- Validate Nigerian phone numbers (all carriers)
- Mask PII in logs (hash phone numbers)
- Template inputs sanitized; keep strictly transactional
- Store minimal necessary data in Notification rows
- Secrets via env only
- Rate limiting to prevent SMS bombing
- DND compliance via Termii's DND channel

---

## 15) Testing Strategy

Unit
- Termii provider adapter: mock HTTP; cover success/failure/timeout
- NotificationService: template merge, enqueue logic, idempotency
- Phone number validation for all Nigerian carriers

Integration
- Termii send to test numbers; assert gateway responses
- Test balance checking and OTP functionality
- Verify DND channel delivery

E2E (staging)
- Place order → observe SMS confirmation
- Simulate payment → observe payment_success SMS
- Update order status → observe delivery update SMS
- Trigger low stock → verify admin SMS alerts

Load/Resilience
- Burst send (e.g., 200 SMS) – confirm queue stability and Termii rate limits
- Test fallback behavior when balance is low

---

## 16) Rollout Plan

**Phase 0 (Testing)** - Week 1
- Test Termii integration with sandbox API key
- Verify SMS delivery to all Nigerian carriers
- Run through all notification flows in staging

**Phase 1 (Soft Launch)** - Week 2
- Enable SMS for internal team and beta customers
- Monitor delivery rates and latency
- Gather feedback on message clarity

**Phase 2 (Production)** - Week 3
- Enable SMS for all customers
- Monitor Termii balance and set up auto-recharge alerts
- Track metrics and optimize retry logic

**Rollback Plan**
- Feature flag `NOTIFICATIONS_SMS_ENABLED=false` to disable
- Queue messages remain in Redis for manual processing
- Email fallback for critical notifications

---

## 17) Milestones & Timeline (3 weeks - Accelerated)

**Week 1 - Foundation** ✅
- Termii provider implementation (DONE)
- SMS templates configured (DONE)
- NotificationService with SMS default (IN PROGRESS)
- Wire order/payment/status events to SMS

**Week 2 - Integration**
- Redis & BullMQ queue setup
- POST /api/notifications/test endpoint
- Low stock cron + admin SMS alerts
- Idempotency and retry logic
- Basic monitoring with Sentry

**Week 3 - Production**
- Staging E2E testing with real phone numbers
- Production Termii account setup
- Sender ID registration (BenPharm)
- Go-live with feature flags
- Documentation and runbooks

---

## 18) Definition of Done (per milestone)

- Code merged with tests (unit+integration) and docs updated
- Endpoints authenticated/verified; secrets in env
- Dashboards and alerts configured
- Runbooks for failures and provider outages
- Stakeholder signoff with sample deliveries captured

---

## 19) Risks & Mitigations

- **Termii outage** → Consider backup provider (Africa's Talking); implement circuit breaker
- **SMS delivery delays** → Use DND channel for transactional messages; monitor latency
- **Balance depletion** → Set up balance alerts; auto-recharge or manual top-up process
- **Phone number validation errors** → Comprehensive Nigerian number format support
- **Duplicate SMS** → Enforce idempotency keys; track sent messages in DB
- **WhatsApp migration complexity** → Deferred to Phase 2; SMS proven first

---

## 20) Future Enhancements

**Phase 2 (3-6 months)**:
- WhatsApp Business API integration
- Rich media messages with product images
- Interactive buttons and quick replies
- PDF invoice attachments via Supabase

**Phase 3 (6-12 months)**:
- Customer notification preferences dashboard
- Multi-language support (Yoruba, Igbo, Hausa)
- Email channel for receipts and reports
- Voice call notifications for critical alerts
- Two-way SMS for order inquiries
- Integration with additional providers (Twilio, Africa's Talking)

---

## 21) Work Breakdown (Backlog → In Progress → Done)

Backlog
- Provider adapters scaffolding
- Queue worker service
- Webhooks & test route
- Event emitters at orders/payments/admin
- Cron for low stock
- Grafana dashboards; Sentry setup

In Progress
- QA templates and copy
- Staging E2E flows

Done
- Prod rollout with metrics ≥ SLOs

---

## 22) RACI

- Responsible: Backend (providers, queue, APIs); DevOps (Redis, monitors)
- Accountable: Tech Lead / Eng Manager
- Consulted: Product, Operations (copy & recipients), Compliance
- Informed: Stakeholders, Support

---

References
- docs/TASKS.md → 2.2 WhatsApp & SMS Notifications
- docs/BENIN_PHARMA_PRD.md → Phases & payment priorities
- packages/api/src/routes/orders.ts, payments/webhooks.ts, admin/*
- packages/database/prisma/schema.prisma → Notification model
- Supabase Storage bucket policy (media attachments)

