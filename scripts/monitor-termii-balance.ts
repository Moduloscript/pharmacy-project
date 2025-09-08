#!/usr/bin/env tsx

/**
 * Monitor Termii balance and exit non-zero if below threshold
 * Usage:
 *   pnpm exec tsx scripts/monitor-termii-balance.ts
 * Optional env:
 *   SMS_BALANCE_THRESHOLD (defaults to 500 NGN)
 */

import * as dotenv from 'dotenv';
import { TermiiProvider } from '../packages/mail/src/provider/termii';

dotenv.config();

async function main() {
  const apiKey = process.env.TERMII_API_KEY || process.env.SMS_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || process.env.SMS_SENDER_ID || 'BenPharm';
  const threshold = Number(process.env.SMS_BALANCE_THRESHOLD || '500');

  if (!apiKey) {
    console.error('❌ TERMII_API_KEY or SMS_API_KEY is required');
    process.exit(2);
  }

  const provider = new TermiiProvider({ apiKey, senderId });

  try {
    const info = await provider.getAccountInfo();
    if (!info || typeof info.balance === 'undefined') {
      console.error('❌ Failed to fetch Termii account info');
      process.exit(2);
    }

    const balance = Number(info.balance);
    const currency = info.currency || 'NGN';

    if (balance < threshold) {
      console.error(`🚨 Low SMS balance: ${balance} ${currency} (threshold: ${threshold})`);
      process.exit(1);
    }

    console.log(`✅ Termii balance OK: ${balance} ${currency} (threshold: ${threshold})`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking Termii balance:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();

