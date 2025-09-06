#!/usr/bin/env node

/**
 * Termii SMS Provider Test Script with Real Credentials
 * 
 * This script tests the Termii SMS provider with the actual API credentials
 * Run with: npx tsx scripts/test-termii-sms.ts
 * 
 * Make sure to set TEST_PHONE_NUMBER environment variable with your Nigerian phone number
 */

import * as dotenv from 'dotenv';
import { TermiiProvider } from '../packages/mail/src/provider/termii';
import type { NotificationJobData } from '../packages/queue/src/types';

// Load environment variables
dotenv.config();

// Real credentials from .env file
const REAL_CONFIG = {
  apiKey: process.env.SMS_API_KEY || '',
  senderId: process.env.SMS_SENDER_ID || 'BenPharm',
  baseUrl: process.env.SMS_BASE_URL || 'https://api.ng.termii.com',
  
  // Test phone number - set this in environment or update below
  testNumber: process.env.TEST_PHONE_NUMBER || '+2348123456789', // Update with your number
  
  // Additional test numbers if available
  adminNumbers: (process.env.ADMIN_PHONE_NUMBERS || '').split(',').filter(n => n.trim()),
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
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

function section(message: string) {
  log(`\n${colors.bold}${colors.blue}🔍 ${message}${colors.reset}`);
  log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
}

function success(message: string) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message: string) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message: string) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message: string) {
  log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

async function testTermiiProvider() {
  header('BenPharm Termii SMS Provider Test');
  
  // Validate configuration
  if (!REAL_CONFIG.apiKey) {
    error('SMS_API_KEY not found in environment variables!');
    error('Make sure your .env file contains the Termii API key.');
    process.exit(1);
  }
  
  if (REAL_CONFIG.testNumber === '+2348123456789') {
    warning('Using default test number. Set TEST_PHONE_NUMBER environment variable.');
    warning('Example: export TEST_PHONE_NUMBER="+2348012345678"');
  }
  
  info(`API Key: ${REAL_CONFIG.apiKey.substring(0, 10)}...${REAL_CONFIG.apiKey.slice(-4)}`);
  info(`Sender ID: ${REAL_CONFIG.senderId}`);
  info(`Base URL: ${REAL_CONFIG.baseUrl}`);
  info(`Test Number: ${REAL_CONFIG.testNumber}`);
  
  if (REAL_CONFIG.adminNumbers.length > 0) {
    info(`Admin Numbers: ${REAL_CONFIG.adminNumbers.join(', ')}`);
  }
  
  try {
    // Initialize provider with real credentials
    const provider = new TermiiProvider({
      apiKey: REAL_CONFIG.apiKey,
      senderId: REAL_CONFIG.senderId,
    });
    
    const testResults: Record<string, { success: boolean; details?: string }> = {};
    
    // Test 1: Connection and Balance Check
    section('Connection & Account Balance');
    try {
      const isConnected = await provider.testConnection();
      if (isConnected) {
        success('Successfully connected to Termii API');
        
        const accountInfo = await provider.getAccountInfo();
        if (accountInfo && accountInfo.balance !== undefined) {
          success(`Account Balance: ${accountInfo.balance} ${accountInfo.currency || 'NGN'}`);
          info(`User: ${accountInfo.user || 'N/A'}`);
          testResults.connection = { success: true, details: `Balance: ${accountInfo.balance}` };
        } else {
          warning('Connected but could not retrieve balance');
          testResults.connection = { success: true, details: 'Connected but no balance info' };
        }
      } else {
        error('Failed to connect to Termii API');
        testResults.connection = { success: false, details: 'Connection failed' };
      }
    } catch (err) {
      error(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      testResults.connection = { success: false, details: err instanceof Error ? err.message : 'Unknown error' };
    }
    
    // Test 2: Basic SMS
    section('Basic SMS Sending');
    try {
      const testMessage = `🧪 BenPharm SMS Test
      
Time: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}

This is a test message from BenPharm's SMS notification system powered by Termii.

✅ Order confirmations
✅ Payment receipts  
✅ Delivery updates
✅ Stock alerts

Thank you for testing BenPharm! 🏥`;
      
      const basicSmsJob: NotificationJobData = {
        notificationId: 'test-basic-' + Date.now(),
        type: 'order_confirmation',
        channel: 'sms',
        recipient: REAL_CONFIG.testNumber,
        message: testMessage,
      };
      
      info(`Sending SMS to: ${REAL_CONFIG.testNumber}`);
      info(`Message length: ${testMessage.length} characters`);
      
      const result = await (provider as any).sendMessage(basicSmsJob);
      
      if (result.success) {
        success('SMS sent successfully!');
        info(`Provider Message ID: ${result.providerMessageId}`);
        info('Check your phone for the message.');
        testResults.basicSMS = { success: true, details: result.providerMessageId };
      } else {
        error(`SMS sending failed: ${result.error}`);
        info(`Retryable: ${result.retryable}`);
        if (result.providerResponse) {
          info(`Provider response: ${JSON.stringify(result.providerResponse, null, 2)}`);
        }
        testResults.basicSMS = { success: false, details: result.error };
      }
    } catch (err) {
      error(`Basic SMS error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      testResults.basicSMS = { success: false, details: err instanceof Error ? err.message : 'Unknown error' };
    }
    
    // Test 3: Template-based SMS (Order Confirmation)
    section('Template-based SMS (Order Confirmation)');
    try {
      const orderNumber = 'ORD' + Date.now().toString().slice(-6);
      const templateJob: NotificationJobData = {
        notificationId: 'test-template-' + Date.now(),
        type: 'order_confirmation',
        channel: 'sms',
        recipient: REAL_CONFIG.testNumber,
        template: 'order_confirmation_sms',
        templateParams: {
          order_number: orderNumber,
          total_amount: 25750,
          tracking_url: `https://benpharm.ng/orders/track/${orderNumber}`,
        },
      };
      
      info(`Template: ${templateJob.template}`);
      info(`Order Number: ${orderNumber}`);
      info(`Amount: ₦${templateJob.templateParams?.total_amount}`);
      
      const result = await (provider as any).sendMessage(templateJob);
      
      if (result.success) {
        success('Template SMS sent successfully!');
        info(`Provider Message ID: ${result.providerMessageId}`);
        testResults.templateSMS = { success: true, details: result.providerMessageId };
      } else {
        error(`Template SMS failed: ${result.error}`);
        testResults.templateSMS = { success: false, details: result.error };
      }
    } catch (err) {
      error(`Template SMS error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      testResults.templateSMS = { success: false, details: err instanceof Error ? err.message : 'Unknown error' };
    }
    
    // Test 4: OTP Sending
    section('OTP Sending Test');
    try {
      const otpMessage = 'Your BenPharm verification code is < 1234 >. Valid for 5 minutes. Do not share this code.';
      
      info('Sending 4-digit OTP...');
      
      const otpResult = await provider.sendOTP(
        REAL_CONFIG.testNumber,
        otpMessage,
        4
      );
      
      if (otpResult && (otpResult.pinId || otpResult.message_id)) {
        success('OTP sent successfully!');
        info(`OTP ID: ${otpResult.pinId || otpResult.message_id}`);
        info('Check your phone for the verification code.');
        testResults.otpSMS = { success: true, details: otpResult.pinId || otpResult.message_id };
      } else {
        error(`OTP sending failed: ${JSON.stringify(otpResult)}`);
        testResults.otpSMS = { success: false, details: JSON.stringify(otpResult) };
      }
    } catch (err) {
      error(`OTP error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      testResults.otpSMS = { success: false, details: err instanceof Error ? err.message : 'Unknown error' };
    }
    
    // Test 5: Low Stock Alert (Admin SMS)
    if (REAL_CONFIG.adminNumbers.length > 0) {
      section('Low Stock Alert (Admin SMS)');
      try {
        const adminNumber = REAL_CONFIG.adminNumbers[0];
        const stockAlertJob: NotificationJobData = {
          notificationId: 'test-stock-alert-' + Date.now(),
          type: 'low_stock_alert',
          channel: 'sms',
          recipient: adminNumber,
          template: 'low_stock_alert_admin_sms',
          templateParams: {
            product_name: 'Paracetamol 500mg',
            current_stock: 5,
            recommended_action: 'URGENT: Restock immediately - Min order: 100 units',
          },
        };
        
        info(`Sending to admin: ${adminNumber}`);
        info(`Product: ${stockAlertJob.templateParams?.product_name}`);
        
        const result = await (provider as any).sendMessage(stockAlertJob);
        
        if (result.success) {
          success('Admin alert sent successfully!');
          testResults.adminAlert = { success: true, details: result.providerMessageId };
        } else {
          error(`Admin alert failed: ${result.error}`);
          testResults.adminAlert = { success: false, details: result.error };
        }
      } catch (err) {
        error(`Admin alert error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        testResults.adminAlert = { success: false, details: err instanceof Error ? err.message : 'Unknown error' };
      }
    }
    
    // Test 6: Invalid Number Handling
    section('Error Handling - Invalid Number');
    try {
      const invalidJob: NotificationJobData = {
        notificationId: 'test-invalid-' + Date.now(),
        type: 'order_confirmation',
        channel: 'sms',
        recipient: '+1234567890', // US number (invalid for Nigerian provider)
        message: 'This should fail due to invalid number format',
      };
      
      const result = await (provider as any).sendMessage(invalidJob);
      
      if (!result.success && !result.retryable) {
        success('Invalid number correctly rejected and marked as non-retryable');
        info(`Error: ${result.error}`);
        testResults.errorHandling = { success: true, details: 'Correctly handled invalid number' };
      } else {
        warning(`Unexpected result for invalid number: Success=${result.success}, Retryable=${result.retryable}`);
        testResults.errorHandling = { success: false, details: 'Invalid number not properly handled' };
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid Nigerian phone number')) {
        success('Invalid number correctly caught by validation');
        testResults.errorHandling = { success: true, details: 'Validation caught invalid number' };
      } else {
        error(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        testResults.errorHandling = { success: false, details: 'Unexpected error handling' };
      }
    }
    
    // Results Summary
    header('Test Results Summary');
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(r => r.success).length;
    
    log(`${colors.bold}Total Tests: ${totalTests}${colors.reset}`);
    log(`${colors.bold}${colors.green}Passed: ${passedTests}${colors.reset}`);
    log(`${colors.bold}${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);
    log('');
    
    Object.entries(testResults).forEach(([testName, result]) => {
      const status = result.success ? 
        `${colors.green}✅ PASSED${colors.reset}` : 
        `${colors.red}❌ FAILED${colors.reset}`;
      
      log(`${testName.padEnd(20)} ${status}`);
      if (result.details) {
        log(`${colors.dim}   └─ ${result.details}${colors.reset}`);
      }
    });
    
    log('');
    
    if (passedTests === totalTests) {
      header('🎉 All Tests Passed!');
      success('Your Termii SMS provider is fully configured and working!');
      info('You can now use SMS notifications in your BenPharm application.');
    } else if (passedTests >= totalTests * 0.7) {
      header('✅ Most Tests Passed');
      warning(`${passedTests}/${totalTests} tests passed. Review the failed tests above.`);
    } else {
      header('❌ Multiple Test Failures');
      error(`Only ${passedTests}/${totalTests} tests passed.`);
      error('Check your API key, account balance, and network connectivity.');
    }
    
    // Next Steps
    log(`\n${colors.bold}${colors.cyan}📋 Next Steps:${colors.reset}`);
    log('1. If SMS tests passed, integrate with your notification service');
    log('2. Test with different Nigerian carriers (MTN, Airtel, Glo, 9mobile)');
    log('3. Monitor delivery rates and adjust message length if needed');
    log('4. Set up balance monitoring alerts in production');
    log('5. Configure backup SMS provider for redundancy');
    log(`\n${colors.dim}Test completed at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}${colors.reset}`);
    
  } catch (error) {
    header('Fatal Error');
    error(`Critical error during testing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  }
}

// Environment validation
function validateEnvironment() {
  const missing = [];
  
  if (!process.env.SMS_API_KEY) missing.push('SMS_API_KEY');
  
  if (missing.length > 0) {
    error(`Missing required environment variables: ${missing.join(', ')}`);
    error('Make sure your .env file contains all required Termii configuration.');
    process.exit(1);
  }
}

// Main execution
async function main() {
  validateEnvironment();
  
  info('Starting Termii SMS tests in 3 seconds...');
  info('Make sure you have a Nigerian phone number ready to receive test messages.');
  
  // Countdown
  for (let i = 3; i > 0; i--) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write(`${colors.yellow}${i}... ${colors.reset}`);
  }
  console.log('\n');
  
  await testTermiiProvider();
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

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Script failed:${colors.reset}`, error);
    process.exit(1);
  });
}
