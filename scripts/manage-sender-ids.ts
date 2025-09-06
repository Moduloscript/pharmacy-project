#!/usr/bin/env node

import * as dotenv from 'dotenv';
dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
  const border = '═'.repeat(60);
  log(`\n${colors.bold}${colors.cyan}${border}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${message.toUpperCase().padStart((60 + message.length) / 2).padEnd(60)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${border}${colors.reset}\n`);
}

async function getRegisteredSenderIds(apiKey: string) {
  try {
    log('🔍 Checking registered sender IDs...', colors.blue);
    
    const response = await fetch(`https://api.ng.termii.com/api/sender-id?api_key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const errorText = await response.text();
      log(`❌ Failed to fetch sender IDs: ${response.status} ${response.statusText}`, colors.red);
      log(`Response: ${errorText}`, colors.dim);
      return null;
    }
  } catch (error) {
    log(`❌ Error fetching sender IDs: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    return null;
  }
}

async function requestSenderId(apiKey: string, senderId: string, usecase: string, company: string) {
  try {
    log(`📤 Requesting sender ID: ${senderId}...`, colors.blue);
    
    const payload = {
      api_key: apiKey,
      sender_id: senderId,
      usecase: usecase,
      company: company
    };
    
    const response = await fetch('https://api.ng.termii.com/api/sender-id/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      log(`✅ Sender ID '${senderId}' request submitted successfully!`, colors.green);
      log(`Response: ${JSON.stringify(result, null, 2)}`, colors.dim);
      return true;
    } else {
      log(`❌ Failed to request sender ID: ${result.message || 'Unknown error'}`, colors.red);
      log(`Response: ${JSON.stringify(result, null, 2)}`, colors.dim);
      return false;
    }
  } catch (error) {
    log(`❌ Error requesting sender ID: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    return false;
  }
}

async function testWithNumericSender(apiKey: string, testNumber: string) {
  try {
    // Sometimes a simple numeric sender works without registration
    const numericSender = '23480';
    
    log(`🧪 Testing with generic numeric sender: ${numericSender}`, colors.blue);
    
    const payload = {
      api_key: apiKey,
      to: testNumber.replace('+', ''),
      from: numericSender,
      sms: '🧪 BenPharm Test: This is sent using a generic numeric sender. Your Termii integration works!',
      type: 'plain',
      channel: 'generic', // Try generic instead of dnd
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
      log(`✅ SUCCESS! SMS sent with numeric sender ${numericSender}`, colors.green);
      log(`Message ID: ${result.message_id}`, colors.green);
      log(`📱 Check your phone for the message!`, colors.green);
      return numericSender;
    } else {
      log(`❌ Numeric sender failed: ${result.message || 'Unknown error'}`, colors.red);
      
      // Try with even simpler numeric sender
      const simplePayload = {
        ...payload,
        from: '234',
        channel: 'generic'
      };
      
      const simpleResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simplePayload),
      });
      
      const simpleResult = await simpleResponse.json();
      
      if (simpleResponse.ok && simpleResult.message_id) {
        log(`✅ SUCCESS! SMS sent with simple sender "234"`, colors.green);
        log(`Message ID: ${simpleResult.message_id}`, colors.green);
        return '234';
      } else {
        log(`❌ Simple sender also failed: ${simpleResult.message || 'Unknown error'}`, colors.red);
        return null;
      }
    }
  } catch (error) {
    log(`❌ Error testing numeric sender: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    return null;
  }
}

async function main() {
  header('Termii Sender ID Management');
  
  const apiKey = process.env.SMS_API_KEY;
  const testNumber = '+2348122931706';
  
  if (!apiKey) {
    log('❌ SMS_API_KEY not found in environment variables!', colors.red);
    process.exit(1);
  }
  
  log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  log(`Test Number: ${testNumber}`);
  log('');
  
  // Step 1: Check existing sender IDs
  const senderData = await getRegisteredSenderIds(apiKey);
  
  if (senderData) {
    if (senderData.data && senderData.data.length > 0) {
      log(`✅ Found ${senderData.data.length} registered sender ID(s):`, colors.green);
      log('');
      senderData.data.forEach((sender: any, index: number) => {
        const status = sender.status === 'verified' ? 
          `${colors.green}✅ ${sender.status}${colors.reset}` : 
          `${colors.yellow}⏳ ${sender.status}${colors.reset}`;
        
        log(`${colors.cyan}${index + 1}. ${sender.sender_id}${colors.reset} - ${status}`);
        log(`   Created: ${sender.created_at}`, colors.dim);
        log('');
      });
      
      // Test with verified sender IDs
      const verifiedSenders = senderData.data.filter((s: any) => s.status === 'verified');
      if (verifiedSenders.length > 0) {
        log(`🧪 Testing with verified sender ID: ${verifiedSenders[0].sender_id}`, colors.blue);
        
        const payload = {
          api_key: apiKey,
          to: testNumber.replace('+', ''),
          from: verifiedSenders[0].sender_id,
          sms: `🎉 BenPharm Test: Using verified sender "${verifiedSenders[0].sender_id}". Your SMS integration is working perfectly!`,
          type: 'plain',
          channel: 'dnd',
        };
        
        try {
          const response = await fetch('https://api.ng.termii.com/api/sms/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          const result = await response.json();
          
          if (response.ok && result.message_id) {
            log(`✅ SUCCESS! SMS sent with verified sender!`, colors.green);
            log(`Message ID: ${result.message_id}`, colors.green);
            log(`📱 Check your phone!`, colors.green);
            log('');
            log(`🎯 Update your .env file:`, colors.bold);
            log(`SMS_SENDER_ID="${verifiedSenders[0].sender_id}"`, colors.cyan);
            return;
          }
        } catch (error) {
          // Continue to next step
        }
      }
    } else {
      log('⚠️ No sender IDs found in your account', colors.yellow);
    }
  }
  
  // Step 2: Try numeric sender as fallback
  log('\n🔄 Trying numeric sender as workaround...', colors.yellow);
  const workingSender = await testWithNumericSender(apiKey, testNumber);
  
  if (workingSender) {
    log('');
    log(`🎯 Temporary Solution - Update your .env file:`, colors.bold);
    log(`SMS_SENDER_ID="${workingSender}"`, colors.cyan);
    log('');
    log(`${colors.yellow}⚠️ Note: Numeric senders work but are not ideal for branding.${colors.reset}`);
    log(`Consider registering a branded sender ID for production.`);
  }
  
  // Step 3: Offer to register sender IDs
  log('\n📋 Sender ID Registration Options:', colors.bold);
  log('');
  
  const sendersToRegister = [
    { 
      id: 'BenPharm', 
      company: 'BenPharm Online Pharmacy',
      usecase: 'Transactional notifications for online pharmacy including order confirmations, payment receipts, delivery updates, and low stock alerts for Nigerian customers.'
    },
    {
      id: 'modev',
      company: 'ModEv Development',
      usecase: 'Development and testing of SMS notifications for pharmacy management system.'
    }
  ];
  
  for (const sender of sendersToRegister) {
    log(`📤 Would register: ${colors.cyan}${sender.id}${colors.reset}`);
    log(`   Company: ${sender.company}`, colors.dim);
    log(`   Use case: ${sender.usecase}`, colors.dim);
    log('');
    
    // Auto-register for testing (you can modify this)
    const requested = await requestSenderId(apiKey, sender.id, sender.usecase, sender.company);
    
    if (requested) {
      log(`✅ Request submitted for ${sender.id}`, colors.green);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  log('');
  log('📋 Next Steps:', colors.bold);
  log('1. Check your Termii dashboard: https://accounts.termii.com/login');
  log('2. Go to "Sender ID" section to see request status');
  log('3. Upload required business documents if requested');
  log('4. Wait for approval (usually 24-48 hours)');
  log('5. Use numeric sender for immediate testing');
  log('');
  log('📱 Documentation: https://docs.termii.com');
}

main().catch(console.error);
