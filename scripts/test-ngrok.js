#!/usr/bin/env node

/**
 * Simple ngrok test script to debug connection issues
 */

const ngrok = require('ngrok');

async function testNgrok() {
  console.log('🧪 Testing ngrok connection...\n');
  
  try {
    console.log('📡 Attempting to connect to ngrok...');
    
    // Try to connect with minimal configuration
    const url = await ngrok.connect({
      addr: 3000,
      proto: 'http',
    });
    
    console.log('✅ Ngrok connected successfully!');
    console.log('🌍 Public URL:', url);
    console.log('\n📋 Test webhook URLs:');
    console.log('  Flutterwave:', `${url}/api/payments/webhook/flutterwave`);
    console.log('  Paystack:', `${url}/api/payments/webhook/paystack`);
    console.log('  OPay:', `${url}/api/payments/webhook/opay`);
    
    console.log('\n✨ Ngrok is working! Press Ctrl+C to disconnect.\n');
    
    // Keep the connection alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Disconnecting ngrok...');
      await ngrok.disconnect();
      await ngrok.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Ngrok connection failed!');
    console.error('\n🔍 Error details:');
    console.error(error);
    
    console.log('\n💡 Possible solutions:');
    console.log('1. Make sure your dev server is running on port 3000');
    console.log('2. Check if you have an ngrok account and authtoken');
    console.log('3. Try running: npx ngrok config add-authtoken YOUR_AUTH_TOKEN');
    console.log('4. Check firewall/antivirus settings');
    
    process.exit(1);
  }
}

testNgrok();
