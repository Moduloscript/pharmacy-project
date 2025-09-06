#!/usr/bin/env node

import * as dotenv from 'dotenv';
dotenv.config();

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

const testSenders = [
  'Termii',           // Usually pre-approved
  '2348000000000',    // Numeric sender
  'Test',             // Generic
  'SMS',              // Generic
  'Info',             // Generic
  'Alert',            // Generic
  'modev',            // Your original
  'BenPharm',         // Your desired
];

async function testSender(senderId: string, testNumber: string, apiKey: string) {
  try {
    const payload = {
      api_key: apiKey,
      to: testNumber.replace('+', ''),
      from: senderId,
      sms: `🧪 Testing sender ID: ${senderId}. If you receive this, the sender ID works!`,
      type: 'plain',
      channel: 'dnd',
    };

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.message_id) {
      log(`✅ ${senderId.padEnd(15)} - SUCCESS! Message ID: ${result.message_id}`, colors.green);
      return { senderId, success: true, messageId: result.message_id };
    } else {
      log(`❌ ${senderId.padEnd(15)} - FAILED: ${result.message || 'Unknown error'}`, colors.red);
      return { senderId, success: false, error: result.message };
    }
  } catch (error) {
    log(`❌ ${senderId.padEnd(15)} - ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    return { senderId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main() {
  const apiKey = process.env.SMS_API_KEY;
  const testNumber = '+2348122931706';

  if (!apiKey) {
    log('❌ SMS_API_KEY not found in environment variables!', colors.red);
    process.exit(1);
  }

  log(`${colors.bold}${colors.cyan}🧪 Testing Different Sender IDs${colors.reset}`);
  log(`Test Number: ${testNumber}`);
  log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  log('');

  const results = [];

  for (const senderId of testSenders) {
    log(`Testing: ${senderId}...`);
    const result = await testSender(senderId, testNumber, apiKey);
    results.push(result);
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  log('');
  log(`${colors.bold}${colors.cyan}📊 Results Summary:${colors.reset}`);
  log('─'.repeat(50));

  const successfulSenders = results.filter(r => r.success);
  const failedSenders = results.filter(r => !r.success);

  if (successfulSenders.length > 0) {
    log(`${colors.green}✅ Working Sender IDs (${successfulSenders.length}):${colors.reset}`);
    successfulSenders.forEach(s => {
      log(`   ${s.senderId} - Message ID: ${s.messageId}`);
    });
    
    log('');
    log(`${colors.bold}${colors.green}🎉 Recommendation:${colors.reset}`);
    log(`Use "${successfulSenders[0].senderId}" as your SMS_SENDER_ID`);
    log('');
    log(`Update your .env file:`);
    log(`SMS_SENDER_ID="${successfulSenders[0].senderId}"`);
  } else {
    log(`${colors.red}❌ No working sender IDs found.${colors.reset}`);
  }

  if (failedSenders.length > 0) {
    log('');
    log(`${colors.red}❌ Failed Sender IDs (${failedSenders.length}):${colors.reset}`);
    failedSenders.forEach(s => {
      log(`   ${s.senderId} - ${s.error}`);
    });
  }

  log('');
  log(`${colors.yellow}💡 Note: Check your phone for test messages!${colors.reset}`);
}

main().catch(console.error);
