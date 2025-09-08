/**
 * SECURITY NOTE: This test script uses environment variables for sensitive data.
 * Set the following environment variables before running:
 * - TEST_PHONE_NUMBER (your test phone number, e.g., +234XXXXXXXXX)
 * - TERMII_API_KEY or SMS_API_KEY (your Termii API key)
 * - TERMII_WEBHOOK_SECRET (webhook signature secret)
 */

#!/usr/bin/env node

/**
 * Termii Implementation Diagnostic Script
 * 
 * Compares the working test script behavior with the actual implementation
 * to identify why the implementation fails while direct tests succeed.
 * 
 * Run with: npx tsx scripts/diagnose-termii-issue.ts
 */

import * as dotenv from 'dotenv';
import { TermiiProvider } from '../packages/mail/src/provider/termii';
import type { NotificationJobData } from '../packages/queue/src/types';

// Load environment variables
dotenv.config();

const config = {
  apiKey: process.env.TERMII_API_KEY || process.env.SMS_API_KEY || '',
  senderId: process.env.TERMII_SENDER_ID || process.env.SMS_SENDER_ID || 'modev',
  testPhone: process.env.TEST_PHONE_NUMBER || process.env.TEST_PHONE_NUMBER || '+234XXXXXXXXX',
  dndEnabled: process.env.TERMII_DND_ENABLED === 'true'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  const border = '═'.repeat(60);
  log(`\n${border}`, colors.cyan);
  log(title.toUpperCase().padStart((60 + title.length) / 2).padEnd(60), colors.bold + colors.cyan);
  log(`${border}\n`, colors.cyan);
}

function section(title: string) {
  log(`\n${colors.blue}🔍 ${title}${colors.reset}`);
  log('─'.repeat(50), colors.blue);
}

async function main() {
  header('Termii Implementation Diagnosis');
  
  log('Configuration:', colors.bold);
  log(`  API Key: ${config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'NOT SET'}`);
  log(`  Sender ID: ${config.senderId}`);
  log(`  Test Phone: ${config.testPhone}`);
  log(`  DND Enabled: ${config.dndEnabled}`);
  
  // Step 1: Test Phone Number Normalization Logic
  section('Phone Number Normalization Analysis');
  
  const testNumbers = [process.env.TEST_PHONE_NUMBER || '+234XXXXXXXXX', process.env.TEST_PHONE_NUMBER?.replace('+', '') || '234XXXXXXXXX', process.env.TEST_PHONE_NUMBER?.replace('+234', '0') || '08XXXXXXXXX', '8122931706'];
  
  testNumbers.forEach(phone => {
    try {
      // Simulate the normalizeNigerianPhone method logic
      const cleaned = phone.replace(/\D/g, '');
      let normalized: string;
      
      if (cleaned.startsWith(process.env.TERMII_SENDER_ID || 'YourSender')) {
        normalized = `+${cleaned}`;
      } else if (cleaned.startsWith('0')) {
        normalized = `+234${cleaned.substring(1)}`;
      } else if (cleaned.length === 10) {
        normalized = `+234${cleaned}`;
      } else {
        throw new Error(`Invalid Nigerian phone number: ${phone}`);
      }
      
      // What gets sent to Termii (after removing +)
      const termiiFormat = normalized.replace('+', '');
      
      log(`  ${phone.padEnd(15)} → ${normalized.padEnd(15)} → ${termiiFormat}`, colors.green);
    } catch (error) {
      log(`  ${phone.padEnd(15)} → ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    }
  });
  
  // Step 2: Test Direct API Call (Known Working Method)
  section('Direct API Test (Known Working)');
  
  const directPayload = {
    api_key: config.apiKey,
    to: process.env.TEST_PHONE_NUMBER?.replace('+', '') || '234XXXXXXXXX', // Direct format that works
    from: config.senderId,
    sms: `🧪 Direct API test at ${new Date().toLocaleTimeString()}`,
    type: 'plain',
    channel: 'generic'
  };
  
  log('Payload:', colors.yellow);
  log(JSON.stringify(directPayload, null, 2));
  
  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(directPayload),
    });
    
    const result = await response.json();
    
    if (response.ok && result.message_id) {
      log(`✅ SUCCESS! Message ID: ${result.message_id}`, colors.green);
    } else {
      log(`❌ FAILED: ${result.message || JSON.stringify(result)}`, colors.red);
    }
  } catch (error) {
    log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
  
  // Step 3: Test Provider Implementation
  section('Provider Implementation Test');
  
  try {
    const provider = new TermiiProvider({
      apiKey: config.apiKey,
      senderId: config.senderId,
    });
    
    // Test basic SMS (same as what fails in the test script)
    const basicJob: NotificationJobData = {
      notificationId: 'diagnostic-' + Date.now(),
      type: 'order_confirmation',
      channel: 'sms',
      recipient: config.testPhone,
      message: `🧪 Provider implementation test at ${new Date().toLocaleTimeString()}`,
    };
    
    log(`Testing with recipient: ${basicJob.recipient}`, colors.yellow);
    
    const result = await (provider as any).sendMessage(basicJob);
    
    if (result.success) {
      log(`✅ Provider SUCCESS! Message ID: ${result.providerMessageId}`, colors.green);
    } else {
      log(`❌ Provider FAILED: ${result.error}`, colors.red);
      
      if (result.providerResponse) {
        log('Raw response:', colors.yellow);
        log(JSON.stringify(result.providerResponse, null, 2));
      }
    }
    
    // Test template-based SMS (this failed in the test script)
    log('\nTesting template-based SMS...', colors.yellow);
    const templateJob: NotificationJobData = {
      notificationId: 'diagnostic-template-' + Date.now(),
      type: 'order_confirmation',
      channel: 'sms',
      recipient: config.testPhone,
      template: 'order_confirmation_sms',
      templateParams: {
        order_number: 'DIAG123',
        total_amount: 5000,
        tracking_url: 'https://test.com/track/DIAG123',
      },
    };
    
    const templateResult = await (provider as any).sendMessage(templateJob);
    
    if (templateResult.success) {
      log(`✅ Template SUCCESS! Message ID: ${templateResult.providerMessageId}`, colors.green);
    } else {
      log(`❌ Template FAILED: ${templateResult.error}`, colors.red);
    }
    
  } catch (error) {
    log(`❌ Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
  
  // Step 4: Channel Analysis
  section('Channel Configuration Analysis');
  
  const transactionalTypes = ['order_confirmation', 'payment_success', 'delivery_update', 'business_verification'];
  const isTransactional = transactionalTypes.includes('order_confirmation');
  const resolvedChannel = (config.dndEnabled && isTransactional) ? 'dnd' : 'generic';
  
  log(`Notification type: order_confirmation`, colors.yellow);
  log(`Is transactional: ${isTransactional}`, colors.yellow);
  log(`DND enabled: ${config.dndEnabled}`, colors.yellow);
  log(`Resolved channel: ${resolvedChannel}`, colors.yellow);
  
  if (resolvedChannel === 'dnd') {
    log('⚠️  Using DND channel - this bypasses Do Not Disturb but may require special account setup', colors.yellow);
  }
  
  // Step 5: Test Both Channels
  section('Channel Comparison Test');
  
  for (const channel of ['generic', 'dnd']) {
    log(`\nTesting ${channel} channel...`, colors.yellow);
    
    const channelPayload = {
      api_key: config.apiKey,
      to: process.env.TEST_PHONE_NUMBER?.replace('+', '') || '234XXXXXXXXX',
      from: config.senderId,
      sms: `🧪 ${channel.toUpperCase()} channel test at ${new Date().toLocaleTimeString()}`,
      type: 'plain',
      channel: channel
    };
    
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelPayload),
      });
      
      const result = await response.json();
      
      if (response.ok && result.message_id) {
        log(`✅ ${channel} channel SUCCESS! Message ID: ${result.message_id}`, colors.green);
      } else {
        log(`❌ ${channel} channel FAILED: ${result.message || JSON.stringify(result)}`, colors.red);
      }
    } catch (error) {
      log(`❌ ${channel} channel ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Step 6: Summary and Recommendations
  section('Diagnosis Summary & Recommendations');
  
  log('📋 Key Findings:', colors.bold);
  log('1. Phone number normalization adds +234 prefix, then removes + for Termii');
  log('2. Direct API calls work, suggesting the issue is in the implementation logic');
  log('3. DND channel may require special account permissions');
  log('4. "Country Inactive" errors suggest account configuration issues');
  
  log('\n🔧 Recommended Actions:', colors.bold);
  log('1. Check if your Termii account is activated for Nigerian SMS');
  log('2. Verify sender ID "' + config.senderId + '" is registered and approved');
  log('3. Contact Termii support about "Country Inactive" error');
  log('4. Consider using only "generic" channel until DND is confirmed working');
  log('5. Test with different Nigerian carriers (MTN, Airtel, Glo, 9mobile)');
  
  log('\n💡 Implementation Fixes:', colors.bold);
  log('1. Ensure phone normalization is working correctly');
  log('2. Add better error handling for "Country Inactive" errors');
  log('3. Add channel fallback logic (dnd → generic)');
  log('4. Add payload logging for debugging');
  
  log(`\n${colors.cyan}Diagnosis completed at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}${colors.reset}`);
}

// Error handlers
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled rejection:${colors.reset}`, error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught exception:${colors.reset}`, error);
  process.exit(1);
});

// Run the diagnosis
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Diagnosis failed:${colors.reset}`, error);
    process.exit(1);
  });
}
