import { db } from '@repo/database';
import { NotificationType, NotificationChannel } from '@repo/database';
import { createNotificationWorker, registerNotificationProvider } from '../worker.js';
import { addNotificationJob } from '../notifications.js';
import type { NotificationJobData, NotificationJobResult, NotificationProvider } from '../types.js';

// Simple fallback provider for smoke testing when real provider creds are not set
class TestProvider implements NotificationProvider {
  name = 'TestProvider';
  channel: 'sms' = 'sms';

  async send(data: NotificationJobData): Promise<NotificationJobResult> {
    console.log(`📨 [TestProvider] Pretending to send ${data.type} to ${data.recipient}`);
    await new Promise((r) => setTimeout(r, 250));
    return {
      success: true,
      providerMessageId: 'test-msg-123',
      providerResponse: { echoed: { ...data, provider: 'test' } },
    };
  }
}

async function main() {
  // Basic env checks
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
  const dbUrl = process.env.DATABASE_URL;

  if (!redisUrl) {
    console.error('❌ Missing REDIS_URL or REDIS_CONNECTION_STRING');
    process.exit(1);
  }
  if (!dbUrl) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }

  // Start worker
  console.log('🔧 Starting notification worker (smoke)...');
  createNotificationWorker({ concurrency: 1 });

  // Register a provider: prefer Termii if configured, else use TestProvider
  // For smoke test, always use the in-memory TestProvider (no external SMS provider required)
  registerNotificationProvider(new TestProvider());
  console.log('✅ Registered TestProvider');

  // Create a notification DB record
  const recipient = process.env.SMOKE_TEST_PHONE || '+2348012345678';
  const record = await db.notification.create({
    data: {
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.SMS,
      recipient,
      body: 'This is a BenPharma SMS smoke test. If you received this, notifications are working.',
      message: 'This is a BenPharma SMS smoke test. If you received this, notifications are working.',
    },
  });

  // Enqueue the job
  const jobId = await addNotificationJob('order_confirmation', {
    notificationId: record.id,
    type: 'order_confirmation',
    channel: 'sms',
    recipient,
    message: 'This is a BenPharma SMS smoke test. If you received this, notifications are working.',
  });

  console.log(`🚚 Enqueued smoke notification job ${jobId} (notificationId=${record.id})`);

  // Give the worker a moment to process
  await new Promise((r) => setTimeout(r, 1500));

  // Check final status
  const updated = await db.notification.findUnique({ where: { id: record.id } });
  console.log('📊 Notification status:', {
    id: record.id,
    status: updated?.status,
    sentAt: updated?.sentAt,
  });

  if (updated?.status === 'SENT') {
    console.log('✅ Smoke test passed');
    process.exit(0);
  } else {
    console.error('❌ Smoke test did not complete successfully');
    process.exit(2);
  }
}

main().catch((e) => {
  console.error('❌ Smoke script error:', e);
  process.exit(1);
});
