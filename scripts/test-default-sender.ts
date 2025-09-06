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

async function testDefaultSender() {
  const apiKey = process.env.SMS_API_KEY;
  const testNumber = '+2348122931706';

  if (!apiKey) {
    log('❌ SMS_API_KEY not found!', colors.red);
    return;
  }

  log(`${colors.bold}${colors.cyan}🧪 Testing Termii with Default/No Sender ID${colors.reset}`);
  log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  log(`Test Number: ${testNumber}`);
  log('');

  // Try different approaches without custom sender ID
  const approaches = [
    {
      name: 'No from field (default)',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        sms: '🧪 BenPharm Test: Using Termii default sender. Testing SMS integration!',
        type: 'plain',
        channel: 'generic',
      }
    },
    {
      name: 'Empty from field',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        from: '',
        sms: '🧪 BenPharm Test: Empty sender field. Testing SMS integration!',
        type: 'plain',
        channel: 'generic',
      }
    },
    {
      name: 'DND channel without sender',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        sms: '🧪 BenPharm Test: DND channel without sender. Testing SMS integration!',
        type: 'plain',
        channel: 'dnd',
      }
    },
    {
      name: 'WhatsApp channel fallback',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        sms: '🧪 BenPharm Test: WhatsApp channel fallback. Testing SMS integration!',
        type: 'plain',
        channel: 'whatsapp',
      }
    }
  ];

  for (const approach of approaches) {
    log(`🔍 Testing: ${approach.name}...`, colors.blue);
    
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approach.payload),
      });

      const result = await response.json();

      if (response.ok && result.message_id) {
        log(`✅ SUCCESS! ${approach.name}`, colors.green);
        log(`   Message ID: ${result.message_id}`, colors.green);
        log(`   📱 Check your phone!`, colors.green);
        log('');
        log(`🎯 Working configuration:`, colors.bold);
        log(`Channel: ${approach.payload.channel}`, colors.cyan);
        log(`From field: ${approach.payload.from || 'Not specified'}`, colors.cyan);
        return approach;
      } else {
        log(`❌ Failed: ${result.message || 'Unknown error'}`, colors.red);
      }
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    log('');
  }

  log(`${colors.yellow}⚠️ All default sender approaches failed.${colors.reset}`);
  log('This usually means sender ID registration is mandatory for your account.');
  log('');
  log('📋 What to do now:');
  log('1. ✅ Sender ID requests already submitted (BenPharm & modev)');
  log('2. 📞 Contact Termii support for immediate assistance');
  log('3. 📧 Check your email for account manager contact');
  log('4. ⏳ Wait for sender ID approval (usually 24-48 hours)');
  log('');
  log('📞 Termii Support: support@termii.com');
  log('📞 Phone: +234 903 611 0885');
}

testDefaultSender().catch(console.error);
