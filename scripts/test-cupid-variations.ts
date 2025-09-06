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

async function testCupidVariations() {
  const apiKey = process.env.SMS_API_KEY;
  const testNumber = '+2348122931706';

  if (!apiKey) {
    log('❌ SMS_API_KEY not found!', colors.red);
    return;
  }

  log(`${colors.bold}${colors.cyan}🧪 Testing Cupid Bird Variations (Minimal Message)${colors.reset}`);
  log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  log(`Test Number: ${testNumber}`);
  log(`Current Balance: ₦10`);
  log('');

  // Test different variations of Cupid bird with minimal message to reduce cost
  const senderVariations = [
    'Cupid bird',
    'CupidBird', 
    'cupid bird',
    'CUPID BIRD',
    'Cupid',
    'Bird'
  ];

  const minimalMessage = 'BenPharm test'; // Very short to minimize cost

  for (const senderId of senderVariations) {
    log(`🔍 Testing sender: "${senderId}" with minimal message...`, colors.blue);
    
    try {
      // Try generic channel first as it seemed to have the best chance
      const payload = {
        api_key: apiKey,
        to: testNumber.replace('+', ''),
        from: senderId,
        sms: minimalMessage,
        type: 'plain',
        channel: 'generic',
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
        log(`✅ SUCCESS! "${senderId}" works!`, colors.green);
        log(`   Message ID: ${result.message_id}`, colors.green);
        log(`   Message: "${minimalMessage}"`, colors.green);
        log(`   Channel: generic`, colors.green);
        log(`   📱 Check your phone!`, colors.green);
        log('');
        
        // If successful, update .env and test the provider
        log(`🎯 Working Sender ID Found: "${senderId}"`, colors.bold);
        log(`Update your .env file:`, colors.cyan);
        log(`SMS_SENDER_ID="${senderId}"`, colors.cyan);
        
        // Test with provider
        log('');
        log('🚀 Testing with BenPharm Termii Provider...', colors.blue);
        
        try {
          const { TermiiProvider } = await import('../packages/mail/src/provider/termii');
          
          const provider = new TermiiProvider({
            apiKey: apiKey,
            senderId: senderId,
          });
          
          // Test with a slightly longer but still cost-effective message
          const testJobData = {
            notificationId: 'test-working-' + Date.now(),
            type: 'order_confirmation' as const,
            channel: 'sms' as const,
            recipient: testNumber,
            message: `🎉 BenPharm SMS Working! Sender: ${senderId}. Order notifications ready!`,
          };
          
          const providerResult = await (provider as any).sendMessage(testJobData);
          
          if (providerResult.success) {
            log(`✅ Provider test SUCCESS!`, colors.green);
            log(`   Provider Message ID: ${providerResult.providerMessageId}`, colors.green);
            log('');
            log(`${colors.bold}${colors.green}🎉 BenPharm SMS Integration is now WORKING!${colors.reset}`);
            log('');
            log('📋 Next steps:');
            log('1. Update your .env file with the working sender ID');
            log('2. Add more balance to your Termii account (recommend ₦1,000+)'); 
            log('3. Run full test suite when you have more balance');
            log('4. Deploy to production');
            return;
          } else {
            log(`❌ Provider test failed: ${providerResult.error}`, colors.red);
          }
          
        } catch (providerError) {
          log(`⚠️ Provider import error: ${providerError}`, colors.yellow);
        }
        
        return; // Exit on first success
        
      } else {
        log(`❌ "${senderId}" failed: ${result.message || JSON.stringify(result)}`, colors.red);
        
        // If it's a balance issue, that's actually promising
        if (result.message && result.message.includes('insufficient balance')) {
          log(`   💡 This sender ID might work with more balance!`, colors.yellow);
        }
      }
    } catch (error) {
      log(`❌ "${senderId}" error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    }
    
    log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
  }

  log(`${colors.yellow}⚠️ None of the Cupid bird variations worked${colors.reset}`);
  log('');
  log('📊 Analysis of errors:');
  log('• "insufficient balance" = Sender ID might be valid but need more credits');
  log('• "Country Inactive" = DND channel might need activation');
  log('• "ApplicationSenderId not found" = Sender ID not registered');
  log('');
  log('💡 Recommendations:');
  log('1. 💰 Add more balance to your Termii account (₦100-500)');
  log('2. 📞 Contact Termii support about country activation');
  log('3. 🔍 Check your Termii dashboard for existing sender IDs');
  log('4. ⏳ Wait for previously requested sender IDs approval');
}

testCupidVariations().catch(console.error);
