#!/usr/bin/env node

/**
 * Test Queue Worker Setup (Non-blocking)
 * 
 * This script tests the queue worker setup without keeping it running
 */

import * as dotenv from 'dotenv';
import { TermiiProvider } from '../packages/mail/src/provider/termii';

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

function success(message: string) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message: string) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function info(message: string) {
  log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

async function testQueueWorker() {
  log(`${colors.bold}${colors.cyan}🧪 Testing Queue Worker Setup${colors.reset}\n`);
  
  const testResults: Record<string, boolean> = {};
  
  // Test 1: Redis Connection
  try {
    info('Testing Redis connection...');
    
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      error('REDIS_URL not configured');
      testResults.redis = false;
    } else {
      const { getRedisConnection } = await import('../packages/queue/dist/connection.js');
      const redis = getRedisConnection();
      await redis.ping();
      success('Redis connection working');
      testResults.redis = true;
    }
  } catch (err) {
    error(`Redis test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    testResults.redis = false;
  }
  
  // Test 2: Provider Registration
  try {
    info('Testing provider registration...');
    
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID;
    
    if (smsApiKey && smsSenderId) {
      const termiiProvider = new TermiiProvider({
        apiKey: smsApiKey,
        senderId: smsSenderId,
      });
      
      const isConnected = await termiiProvider.testConnection();
      if (isConnected) {
        success('SMS provider ready for worker registration');
        testResults.provider = true;
      } else {
        error('SMS provider connection failed');
        testResults.provider = false;
      }
    } else {
      error('SMS provider credentials not configured');
      testResults.provider = false;
    }
  } catch (err) {
    error(`Provider test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    testResults.provider = false;
  }
  
  // Test 3: Queue Operations
  try {
    info('Testing queue operations...');
    
    const { getNotificationQueue, addNotificationJob } = await import('../packages/queue/dist/notifications.js');
    
    // Create a test job
    const testJobData = {
      notificationId: 'test-queue-' + Date.now(),
      type: 'order_confirmation' as const,
      channel: 'sms' as const,
      recipient: '+2348122931706',
      message: 'Queue worker test message - this will be processed when worker runs',
    };
    
    const queue = getNotificationQueue();
    const jobId = await addNotificationJob('test_notification', testJobData);
    
    success(`Test job queued successfully with ID: ${jobId}`);
    
    // Get queue stats
    const stats = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    info(`Queue stats - Waiting: ${stats.waiting}, Active: ${stats.active}, Completed: ${stats.completed}, Failed: ${stats.failed}`);
    
    testResults.queue = true;
  } catch (err) {
    error(`Queue operations test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    testResults.queue = false;
  }
  
  // Summary
  log(`\n${colors.bold}${colors.cyan}📊 Test Results:${colors.reset}`);
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(v => v).length;
  
  Object.entries(testResults).forEach(([testName, passed]) => {
    const status = passed ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    log(`${testName.padEnd(15)} ${status}`);
  });
  
  log(`\nTotal: ${passedTests}/${totalTests} tests passed\n`);
  
  if (passedTests === totalTests) {
    log(`${colors.bold}${colors.green}🎉 Queue Worker is ready to run!${colors.reset}`);
    log(`\n${colors.bold}Start the worker with:${colors.reset}`);
    log(`${colors.cyan}pnpm exec tsx scripts/setup-queue-worker.ts${colors.reset}`);
    log(`\n${colors.bold}Or run in background:${colors.reset}`);
    log(`${colors.cyan}nohup pnpm exec tsx scripts/setup-queue-worker.ts > logs/worker.log 2>&1 &${colors.reset}`);
  } else {
    log(`${colors.bold}${colors.red}❌ Fix the failed tests before starting the worker${colors.reset}`);
  }
  
  log(`\n${colors.dim}Test completed at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}${colors.reset}`);
}

testQueueWorker().catch(console.error);
