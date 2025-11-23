import 'dotenv/config';
import { db } from '@repo/database';

async function resetLimits() {
  const email = 'tundesalawo@gmail.com'; // The user's email from logs
  
  console.log(`🔄 Resetting notification limits for ${email}...`);

  const user = await db.user.findUnique({
    where: { email },
    include: { customer: true }
  });

  if (!user || !user.customer) {
    console.error('❌ User or customer not found');
    process.exit(1);
  }

  const customerId = user.customer.id;

  // 1. Reset Rate Limits
  const deleted = await db.notificationRateLimit.deleteMany({
    where: { customerId }
  });
  console.log(`✅ Deleted ${deleted.count} rate limit records`);

  // 2. Update Preferences (Ensure limits are high enough)
  const updated = await db.notificationPreferences.upsert({
    where: { customerId },
    create: {
      customerId,
      dailyNotificationLimit: 100,
      weeklyNotificationLimit: 500,
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true
    },
    update: {
      dailyNotificationLimit: 100,
      weeklyNotificationLimit: 500,
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true
    }
  });
  console.log(`✅ Updated preferences: Daily Limit = ${updated.dailyNotificationLimit}`);

  process.exit(0);
}

resetLimits().catch(console.error);
