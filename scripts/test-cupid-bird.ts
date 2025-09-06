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

async function testCupidBird() {
  const apiKey = process.env.SMS_API_KEY;
  const testNumber = '+2348122931706';
  const senderId = 'Cupid bird';

  if (!apiKey) {
    log('❌ SMS_API_KEY not found!', colors.red);
    return;
  }

  log(`${colors.bold}${colors.cyan}🧪 Testing with "Cupid bird" Sender ID${colors.reset}`);
  log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  log(`Sender ID: ${senderId}`);
  log(`Test Number: ${testNumber}`);
  log('');

  // Test different channel types with "Cupid bird"
  const testCases = [
    {
      name: 'DND Channel (Transactional)',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        from: senderId,
        sms: '🧪 BenPharm Test with Cupid bird sender! DND channel for transactional messages. If you receive this, the sender ID works!',
        type: 'plain',
        channel: 'dnd',
      }
    },
    {
      name: 'Generic Channel',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        from: senderId,
        sms: '🧪 BenPharm Test with Cupid bird sender! Generic channel. Testing SMS integration!',
        type: 'plain',
        channel: 'generic',
      }
    },
    {
      name: 'WhatsApp Channel',
      payload: {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        from: senderId,
        sms: '🧪 BenPharm Test with Cupid bird sender! WhatsApp channel fallback. Testing SMS!',
        type: 'plain',
        channel: 'whatsapp',
      }
    }
  ];

  let successCount = 0;
  const results = [];

  for (const testCase of testCases) {
    log(`🔍 Testing: ${testCase.name}...`, colors.blue);
    
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload),
      });

      const result = await response.json();

      if (response.ok && result.message_id) {
        log(`✅ SUCCESS! ${testCase.name}`, colors.green);
        log(`   Message ID: ${result.message_id}`, colors.green);
        log(`   📱 Check your phone for the message!`, colors.green);
        successCount++;
        results.push({ ...testCase, success: true, messageId: result.message_id });
      } else {
        log(`❌ Failed: ${result.message || JSON.stringify(result)}`, colors.red);
        results.push({ ...testCase, success: false, error: result.message });
      }
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
      results.push({ ...testCase, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    log('');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tests
  }

  // Summary
  log(`${colors.bold}${colors.cyan}📊 Test Results Summary${colors.reset}`);
  log('─'.repeat(50));
  log(`Total Tests: ${testCases.length}`);
  log(`Successful: ${successCount}`, successCount > 0 ? colors.green : colors.red);
  log(`Failed: ${testCases.length - successCount}`, colors.red);
  log('');

  if (successCount > 0) {
    log(`${colors.bold}${colors.green}🎉 SUCCESS! "Cupid bird" sender ID works!${colors.reset}`);
    log('');
    log(`🎯 Update your .env file permanently:`, colors.bold);
    log(`SMS_SENDER_ID="Cupid bird"`, colors.cyan);
    log('');
    log(`📋 Working configurations:`, colors.bold);
    results.filter(r => r.success).forEach(r => {
      log(`✅ ${r.name} - Message ID: ${r.messageId}`, colors.green);
    });

    // Test the Termii provider with this working sender
    log('');
    log(`🚀 Testing with BenPharm Termii Provider...`, colors.blue);
    
    try {
      // Import and test the provider
      const { TermiiProvider } = await import('../packages/mail/src/provider/termii');
      
      const provider = new TermiiProvider({
        apiKey: apiKey,
        senderId: senderId,
      });
      
      const testJobData = {
        notificationId: 'test-cupid-' + Date.now(),
        type: 'order_confirmation' as const,
        channel: 'sms' as const,
        recipient: testNumber,
        message: `🎉 BenPharm SMS Integration Working!
        
Sender: ${senderId}
Time: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}

✅ Order confirmations
✅ Payment receipts  
✅ Delivery updates
✅ Low stock alerts

Your pharmacy SMS notifications are ready! 🏥`,
      };
      
      const providerResult = await (provider as any).sendMessage(testJobData);
      
      if (providerResult.success) {
        log(`✅ Provider test successful!`, colors.green);
        log(`   Message ID: ${providerResult.providerMessageId}`, colors.green);
        log(`   Provider: ${providerResult.provider || 'Termii'}`, colors.green);
        log(`   Channel: ${providerResult.channel || 'sms'}`, colors.green);
      } else {
        log(`❌ Provider test failed: ${providerResult.error}`, colors.red);
      }
      
    } catch (providerError) {
      log(`⚠️ Provider test error: ${providerError instanceof Error ? providerError.message : 'Unknown error'}`, colors.yellow);
    }

  } else {
    log(`${colors.red}❌ "Cupid bird" sender ID failed on all channels${colors.reset}`);
    log('');
    log('📋 This means either:');
    log('1. "Cupid bird" is not registered in your account');
    log('2. It needs approval like the others');
    log('3. There might be a typo in the sender ID name');
    log('');
    log('💡 Suggestions:');
    log('• Double-check the exact spelling in your Termii dashboard');
    log('• Try variations: "CupidBird", "cupid bird", "CUPID BIRD"');
    log('• Contact Termii support for existing sender IDs');
  }
  
  log(`\n${colors.dim}Test completed: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}${colors.reset}`);
}

testCupidBird().catch(console.error);
