#!/usr/bin/env node

/**
 * Development script for BenPharm payment webhooks with ngrok
 * This starts the Next.js dev server and exposes it via ngrok for webhook testing
 */

const { spawn } = require('child_process');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

async function startDevWithNgrok() {
  console.log('🚀 Starting BenPharm development server with ngrok...\n');

  try {
    // Start Next.js development server
    console.log('📦 Starting Next.js dev server...');
    const nextProcess = spawn('pnpm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    });

    // Wait for the server to start (adjust timing as needed)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Start ngrok tunnel
    console.log('🌐 Starting ngrok tunnel...');
    const url = await ngrok.connect({
      port: 3000,
      proto: 'http',
      authtoken_from_env: true, // Will use NGROK_AUTHTOKEN from env if available
    });

    console.log('\n✅ Development environment ready!\n');
    console.log('🏠 Local development server: http://localhost:3000');
    console.log('🌍 Public ngrok URL: ' + url);
    console.log('\n📡 **Webhook URLs for Payment Gateways:**');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  Gateway   │  Webhook URL                                  │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ Flutterwave│ ${url}/api/payments/webhook/flutterwave    │`);
    console.log(`│ Paystack   │ ${url}/api/payments/webhook/paystack       │`);
    console.log(`│ OPay       │ ${url}/api/payments/webhook/opay           │`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    // Save URLs to a file for easy access
    const webhookInfo = {
      publicUrl: url,
      localUrl: 'http://localhost:3000',
      webhooks: {
        flutterwave: `${url}/api/payments/webhook/flutterwave`,
        paystack: `${url}/api/payments/webhook/paystack`,
        opay: `${url}/api/payments/webhook/opay`,
      },
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(__dirname, '..', '.ngrok-urls.json'),
      JSON.stringify(webhookInfo, null, 2)
    );

    console.log('💾 Webhook URLs saved to .ngrok-urls.json');
    console.log('\n🔧 **Next Steps:**');
    console.log('1. Copy the webhook URLs above');
    console.log('2. Add them to your payment gateway dashboards');
    console.log('3. Test a payment from your frontend');
    console.log('4. Check the terminal for webhook logs');
    console.log('\n⚠️  Keep this terminal open to maintain the tunnel\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down development environment...');
      await ngrok.kill();
      nextProcess.kill();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down development environment...');
      await ngrok.kill();
      nextProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting development environment:', error);
    process.exit(1);
  }
}

startDevWithNgrok();
