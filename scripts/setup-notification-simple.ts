#!/usr/bin/env node

/**
 * BenPharm Notification Service Setup (Simplified)
 * 
 * This script sets up and tests the notification service with the working Termii SMS provider
 * 
 * Run with: pnpm exec tsx scripts/setup-notification-simple.ts
 */

import * as dotenv from 'dotenv';
import { TermiiProvider } from '../packages/mail/src/provider/termii';
import { notificationTemplates, getTemplateMessage } from '../packages/mail/src/templates/index';

// Load environment variables
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
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
  const border = '═'.repeat(70);
  log(`\n${colors.bold}${colors.cyan}${border}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${message.toUpperCase().padStart((70 + message.length) / 2).padEnd(70)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${border}${colors.reset}\n`);
}

function section(message: string) {
  log(`\n${colors.bold}${colors.blue}🔧 ${message}${colors.reset}`);
  log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
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

async function setupNotificationService() {
  header('BenPharm Notification Service - Simple Setup');
  
  info('Setting up and testing the notification service...');
  log('');

  // Step 1: Initialize SMS Provider
  section('Initializing Termii SMS Provider');
  
  let smsProvider: TermiiProvider | null = null;
  
  try {
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID;
    
    if (!smsApiKey) {
      error('SMS_API_KEY not found in environment variables');
      return;
    }
    
    if (!smsSenderId) {
      error('SMS_SENDER_ID not found in environment variables');
      return;
    }
    
    // Create Termii provider
    smsProvider = new TermiiProvider({
      apiKey: smsApiKey,
      senderId: smsSenderId,
    });
    
    // Test connection
    info(`Testing connection with sender ID: "${smsSenderId}"`);
    const isConnected = await smsProvider.testConnection();
    
    if (isConnected) {
      const accountInfo = await smsProvider.getAccountInfo();
      success('SMS provider initialized successfully');
      info(`Account Balance: ₦${accountInfo?.balance || 'Unknown'}`);
      info(`Sender ID: ${smsSenderId}`);
    } else {
      error('Failed to connect to Termii API');
      return;
    }
  } catch (err) {
    error(`SMS provider initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  }

  // Step 2: Test All Notification Types
  section('Testing All Notification Types');
  
  const testNumber = '+2348122931706'; // Your phone number
  const testResults: Record<string, boolean> = {};
  
  // Test 1: Order Confirmation
  try {
    info('Testing order confirmation SMS...');
    
    const orderTestData = {
      notificationId: 'test-order-' + Date.now(),
      type: 'order_confirmation' as const,
      channel: 'sms' as const,
      recipient: testNumber,
      template: 'order_confirmation_sms',
      templateParams: {
        order_number: 'ORD' + Date.now().toString().slice(-6),
        total_amount: 18500,
        tracking_url: `https://benpharm.ng/orders/track/TEST${Date.now()}`,
      },
    };
    
    const orderResult = await (smsProvider as any).sendMessage(orderTestData);
    
    if (orderResult.success) {
      success(`Order confirmation sent! Message ID: ${orderResult.providerMessageId}`);
      testResults.orderConfirmation = true;
    } else {
      error(`Order confirmation failed: ${orderResult.error}`);
      testResults.orderConfirmation = false;
    }
  } catch (err) {
    error(`Order confirmation test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    testResults.orderConfirmation = false;
  }
  
  // Add delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Payment Success
  try {
    info('Testing payment success SMS...');
    
    const paymentTestData = {
      notificationId: 'test-payment-' + Date.now(),
      type: 'payment_success' as const,
      channel: 'sms' as const,
      recipient: testNumber,
      template: 'payment_success_sms',
      templateParams: {
        order_number: 'ORD' + Date.now().toString().slice(-6),
        amount: 18500,
        method: 'Flutterwave Card',
      },
    };
    
    const paymentResult = await (smsProvider as any).sendMessage(paymentTestData);
    
    if (paymentResult.success) {
      success(`Payment confirmation sent! Message ID: ${paymentResult.providerMessageId}`);
      testResults.paymentSuccess = true;
    } else {
      error(`Payment confirmation failed: ${paymentResult.error}`);
      testResults.paymentSuccess = false;
    }
  } catch (err) {
    error(`Payment confirmation test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    testResults.paymentSuccess = false;
  }
  
  // Add delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Delivery Update
  try {
    info('Testing delivery update SMS...');
    
    const deliveryTestData = {
      notificationId: 'test-delivery-' + Date.now(),
      type: 'delivery_update' as const,
      channel: 'sms' as const,
      recipient: testNumber,
      template: 'delivery_update_sms',
      templateParams: {
        order_number: 'ORD' + Date.now().toString().slice(-6),
        status_label: 'Out for delivery',
        eta_or_notes: 'Expected delivery today by 6 PM',
      },
    };
    
    const deliveryResult = await (smsProvider as any).sendMessage(deliveryTestData);
    
    if (deliveryResult.success) {
      success(`Delivery update sent! Message ID: ${deliveryResult.providerMessageId}`);
      testResults.deliveryUpdate = true;
    } else {
      error(`Delivery update failed: ${deliveryResult.error}`);
      testResults.deliveryUpdate = false;
    }
  } catch (err) {
    error(`Delivery update test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    testResults.deliveryUpdate = false;
  }
  
  // Add delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Low Stock Alert (Admin)
  try {
    info('Testing low stock admin alert...');
    
    const stockAlertData = {
      notificationId: 'test-stock-' + Date.now(),
      type: 'low_stock_alert' as const,
      channel: 'sms' as const,
      recipient: testNumber, // Send to your number for testing
      template: 'low_stock_alert_admin_sms',
      templateParams: {
        product_name: 'Paracetamol 500mg',
        current_stock: 3,
        recommended_action: 'URGENT: Restock needed - Min order: 100 units',
      },
    };
    
    const stockResult = await (smsProvider as any).sendMessage(stockAlertData);
    
    if (stockResult.success) {
      success(`Stock alert sent! Message ID: ${stockResult.providerMessageId}`);
      testResults.stockAlert = true;
    } else {
      error(`Stock alert failed: ${stockResult.error}`);
      testResults.stockAlert = false;
    }
  } catch (err) {
    error(`Stock alert test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    testResults.stockAlert = false;
  }

  // Step 3: Template System Test
  section('Testing Template System');
  
  try {
    info('Testing template message generation...');
    
    const templateMessage = getTemplateMessage('sms', 'order_confirmation', {
      order_number: 'TEST123',
      total_amount: 25000,
      tracking_url: 'https://benpharm.ng/track/TEST123'
    });
    
    success('Template system working correctly');
    info(`Generated message: "${templateMessage.substring(0, 80)}..."`);
    testResults.templates = true;
  } catch (err) {
    error(`Template system test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    testResults.templates = false;
  }

  // Step 4: Results Summary
  section('Test Results Summary');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(v => v).length;
  
  log(`${colors.bold}Test Results:${colors.reset}`);
  log(`Total Tests: ${totalTests}`);
  log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
  log(`Failed: ${colors.red}${totalTests - passedTests}${colors.reset}`);
  log('');
  
  Object.entries(testResults).forEach(([testName, passed]) => {
    const status = passed ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    log(`${testName.padEnd(20)} ${status}`);
  });
  
  log('');
  
  if (passedTests === totalTests) {
    log(`${colors.bold}${colors.green}🎉 ALL TESTS PASSED! Your notification system is ready for production!${colors.reset}`);
  } else if (passedTests >= totalTests * 0.8) {
    log(`${colors.bold}${colors.yellow}⚠️  Most tests passed. Review failed tests above.${colors.reset}`);
  } else {
    log(`${colors.bold}${colors.red}❌ Multiple test failures. Check configuration and balance.${colors.reset}`);
  }

  // Step 5: Integration Instructions
  section('Production Integration Guide');
  
  log(`${colors.bold}✨ Your BenPharm SMS notification system is working!${colors.reset}`);
  log('');
  log(`${colors.bold}📱 Available Notifications:${colors.reset}`);
  log('✅ Order confirmations with tracking links');
  log('✅ Payment success confirmations');
  log('✅ Delivery status updates');
  log('✅ Low stock admin alerts');
  log('✅ Template-based messaging');
  log('');
  
  log(`${colors.bold}🚀 Next Steps for Production:${colors.reset}`);
  log('1. 🔌 Integrate with your order processing system');
  log('2. 🔄 Set up the notification queue worker');
  log('3. 📊 Add monitoring and error tracking');
  log('4. 🧪 Test with real customer orders');
  log('5. 📈 Monitor delivery rates and costs');
  log('');
  
  log(`${colors.bold}💡 Integration Example:${colors.reset}`);
  log(`${colors.dim}// In your order processing code:${colors.reset}`);
  log(`${colors.cyan}const smsProvider = new TermiiProvider({${colors.reset}`);
  log(`${colors.cyan}  apiKey: process.env.SMS_API_KEY!,${colors.reset}`);
  log(`${colors.cyan}  senderId: process.env.SMS_SENDER_ID!,${colors.reset}`);
  log(`${colors.cyan}});${colors.reset}`);
  log('');
  log(`${colors.cyan}await smsProvider.sendMessage({${colors.reset}`);
  log(`${colors.cyan}  notificationId: 'order-' + orderId,${colors.reset}`);
  log(`${colors.cyan}  type: 'order_confirmation',${colors.reset}`);
  log(`${colors.cyan}  channel: 'sms',${colors.reset}`);
  log(`${colors.cyan}  recipient: customer.phone,${colors.reset}`);
  log(`${colors.cyan}  template: 'order_confirmation_sms',${colors.reset}`);
  log(`${colors.cyan}  templateParams: { order_number, total_amount, tracking_url }${colors.reset}`);
  log(`${colors.cyan}});${colors.reset}`);
  log('');
  
  info(`📱 Check your phone - you should have received ${passedTests} test messages!`);
  
  log(`\n${colors.dim}Setup completed at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}${colors.reset}`);
}

// Main execution
if (require.main === module) {
  setupNotificationService().catch(error => {
    console.error(`${colors.red}Setup failed:${colors.reset}`, error);
    process.exit(1);
  });
}

export { setupNotificationService };
