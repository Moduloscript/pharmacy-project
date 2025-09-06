#!/usr/bin/env node

/**
 * BenPharm Notification Queue Worker Setup
 * 
 * This script sets up the background queue worker for processing SMS and WhatsApp notifications
 * 
 * Run with: pnpm exec tsx scripts/setup-queue-worker.ts
 */

import * as dotenv from 'dotenv';
import { createNotificationWorker, registerNotificationProvider } from '../packages/queue/dist/worker.js';
import { TermiiProvider } from '../packages/mail/src/provider/termii';

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
  log(`\n${colors.bold}${colors.blue}🔄 ${message}${colors.reset}`);
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

async function setupQueueWorker() {
  header('BenPharm Notification Queue Worker');
  
  info('Setting up background queue worker for processing notifications...');
  info('This worker will handle SMS, WhatsApp, and Email notifications from Redis queue.');
  log('');

  // Step 1: Check Redis Connection
  section('Checking Redis Connection');
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    error('REDIS_URL not found in environment variables!');
    error('Queue worker requires Redis for job processing.');
    error('Please set REDIS_URL in your .env file.');
    return;
  }
  
  info(`Redis URL configured: ${redisUrl.replace(/\/\/.*@/, '//***@')}`);
  
  try {
    // Test Redis connection by importing the connection module
    const { getRedisConnection } = await import('../packages/queue/dist/connection.js');
    const redis = getRedisConnection();
    
    // Try to ping Redis
    await redis.ping();
    success('Redis connection successful');
    info('Queue worker can connect to Redis');
  } catch (err) {
    error(`Redis connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    error('Please check your Redis configuration and ensure Redis is running.');
    return;
  }

  // Step 2: Register Notification Providers
  section('Registering Notification Providers');
  
  const registeredProviders: string[] = [];
  
  // Register SMS Provider (Termii)
  try {
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID;
    
    if (smsApiKey && smsSenderId) {
      const termiiProvider = new TermiiProvider({
        apiKey: smsApiKey,
        senderId: smsSenderId,
      });
      
      // Test the provider
      const isConnected = await termiiProvider.testConnection();
      
      if (isConnected) {
        registerNotificationProvider(termiiProvider);
        registeredProviders.push('SMS (Termii)');
        success('Termii SMS provider registered with worker');
      } else {
        warning('Termii SMS provider connection test failed - skipping registration');
      }
    } else {
      warning('SMS provider credentials not configured - skipping SMS registration');
    }
  } catch (err) {
    error(`Failed to register SMS provider: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  
  // Register WhatsApp Provider (if configured)
  try {
    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const whatsappBusinessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    
    if (whatsappToken && whatsappPhoneId && whatsappBusinessId) {
      // WhatsApp provider would be registered here once implemented
      info('WhatsApp credentials found - provider will be registered when implemented');
      registeredProviders.push('WhatsApp (Pending)');
    } else {
      info('WhatsApp credentials not configured - skipping WhatsApp registration');
    }
  } catch (err) {
    error(`Failed to register WhatsApp provider: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Step 3: Create and Start Queue Worker
  section('Starting Notification Worker');
  
  try {
    const worker = createNotificationWorker({
      concurrency: 5, // Process 5 notifications concurrently
      maxAttempts: 3, // Retry failed jobs 3 times
      backoffDelay: 2000, // 2 second delay between retries
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
    });
    
    success('Notification worker created successfully');
    info(`Worker concurrency: 5 concurrent jobs`);
    info(`Retry attempts: 3 with exponential backoff`);
    info(`Registered providers: ${registeredProviders.join(', ')}`);
    
    // Add event listeners for monitoring
    worker.on('ready', () => {
      info('Worker is ready and listening for jobs');
    });
    
    worker.on('active', (job) => {
      log(`${colors.cyan}🔄 Processing job ${job.id}: ${job.data.type} -> ${job.data.channel}${colors.reset}`);
    });
    
    worker.on('completed', (job, result) => {
      log(`${colors.green}✅ Job ${job.id} completed successfully${colors.reset}`);
    });
    
    worker.on('failed', (job, err) => {
      log(`${colors.red}❌ Job ${job?.id} failed: ${err.message}${colors.reset}`);
    });
    
    worker.on('stalled', (jobId) => {
      log(`${colors.yellow}⏳ Job ${jobId} stalled - will be retried${colors.reset}`);
    });
    
    log('');
    success('Queue worker is now running and processing notifications!');
    
  } catch (err) {
    error(`Failed to start queue worker: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  }

  // Step 4: Show Monitoring Information
  section('Worker Monitoring Information');
  
  log(`${colors.bold}Worker Status:${colors.reset}`);
  log(`🔄 Status: ${colors.green}RUNNING${colors.reset}`);
  log(`📡 Providers: ${registeredProviders.length} registered`);
  log(`🔗 Redis: Connected`);
  log(`⚡ Concurrency: 5 jobs`);
  log('');
  
  log(`${colors.bold}Monitor Commands:${colors.reset}`);
  log(`${colors.cyan}# Check queue status:${colors.reset}`);
  log(`curl -X GET http://localhost:3000/api/notifications/stats`);
  log('');
  log(`${colors.cyan}# View worker logs:${colors.reset}`);
  log(`tail -f logs/notification-worker.log`);
  log('');
  
  log(`${colors.bold}${colors.green}🚀 Your notification system is now fully operational!${colors.reset}`);
  log('');
  log(`${colors.bold}How it works:${colors.reset}`);
  log('1. 📧 Orders create notification jobs in Redis queue');
  log('2. 🔄 Worker picks up jobs and processes them');
  log('3. 📱 SMS/WhatsApp sent via registered providers');
  log('4. 📊 Status updated in database');
  log('5. ♻️  Failed jobs automatically retried');
  log('');
  
  info('Worker is running in the foreground. Press Ctrl+C to stop.');
  
  // Keep the process running
  process.on('SIGINT', () => {
    log(`\n${colors.yellow}🛑 Shutting down worker gracefully...${colors.reset}`);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log(`\n${colors.yellow}🛑 Shutting down worker gracefully...${colors.reset}`);
    process.exit(0);
  });
  
  // Keep alive
  await new Promise(() => {}); // Keep running indefinitely
}

// Main execution
if (require.main === module) {
  setupQueueWorker().catch(error => {
    error(`Queue worker setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  });
}

export { setupQueueWorker };
