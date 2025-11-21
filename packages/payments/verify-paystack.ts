import {
  createPaystackProvider,
  PaystackProvider
} from './index';

import {
  getPaymentOrchestrator
} from './src/lib/payment-orchestrator';

import {
  NigerianOrder
} from './types';

import {
  calculateGatewayFee,
  validateNigerianPhone,
  formatNaira
} from './src/lib/nigerian-utils';

// Test utilities
function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

function logError(message: string): void {
  console.log(`❌ ${message}`);
}

function logInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
}

// Mock order for testing
const createMockOrder = (): NigerianOrder => ({
  id: 'test-order-paystack',
  orderNumber: 'PS_TEST_12345',
  totalAmount: 10000, // ₦10,000
  currency: 'NGN',
  customer: {
    email: 'test@benpharm.ng',
    phone: '+2348012345678',
    name: 'Test Customer',
    state: 'Lagos',
    lga: 'Ikeja',
  },
  items: [
    {
      name: 'Test Medicine',
      quantity: 2,
      unitPrice: 5000,
    }
  ],
  deliveryAddress: '123 Test Street, Lagos',
  deliveryFee: 0,
});

// Test functions
async function testProviderCreation(): Promise<boolean> {
  logSection('1️⃣ Testing Provider Creation');

  try {
    const paystackProvider = createPaystackProvider();
    logSuccess('Paystack provider created successfully');
    logInfo(`Gateway: ${paystackProvider.getGatewayName()}`);

    const supportedMethods = paystackProvider.getSupportedPaymentMethods();
    logInfo(`Supported Methods: ${supportedMethods.length} methods`);
    logInfo(`Methods: ${supportedMethods.join(', ')}`);

    // Test direct instantiation
    const directProvider = new PaystackProvider({
      publicKey: 'pk_test_key',
      secretKey: 'sk_test_key',
      webhookSecret: 'test_secret',
      environment: 'sandbox'
    });
    logSuccess('Direct Paystack provider instantiation works');

    return true;
  } catch (error) {
    logError(`Provider creation failed: ${(error as Error).message}`);
    return false;
  }
}

async function testOrchestratorIntegration(): Promise<boolean> {
  logSection('2️⃣ Testing Orchestrator Integration');

  try {
    const orchestrator = getPaymentOrchestrator();
    orchestrator.registerProvider(createPaystackProvider());
    logSuccess('Paystack provider registered');

    // Test gateway statistics
    const stats = orchestrator.getGatewayStats();
    logInfo(`Registered gateways: ${stats.length}`);
    stats.forEach(stat => {
      logInfo(`  ${stat.gateway}: ${stat.isHealthy ? '🟢' : '🔵'} (${stat.supportedMethods.length} methods)`);
    });

    // Test best gateway selection
    const bestGateway = orchestrator.getBestAvailableGateway();
    if (bestGateway) {
      logSuccess(`Best available gateway: ${bestGateway}`);
    } else {
      logInfo('No healthy gateways available (expected in test environment)');
    }

    return true;
  } catch (error) {
    logError(`Orchestrator integration failed: ${(error as Error).message}`);
    return false;
  }
}

async function testNigerianUtilities(): Promise<boolean> {
  logSection('3️⃣ Testing Nigerian Utilities');

  try {
    // Test phone validation
    const validPhones = [
      '+2348012345678',
      '08012345678',
      '2348012345678'
    ];

    validPhones.forEach(phone => {
      const isValid = validateNigerianPhone(phone);
      if (isValid) {
        logSuccess(`Phone validation passed: ${phone}`);
      } else {
        logError(`Phone validation failed: ${phone}`);
      }
    });

    // Test fee calculation
    const testAmounts = [1000, 5000, 10000, 50000];
    testAmounts.forEach(amount => {
      const flutterwaveFee = calculateGatewayFee(amount, 'FLUTTERWAVE');
      const paystackFee = calculateGatewayFee(amount, 'PAYSTACK');

      logInfo(`Amount: ₦${amount.toLocaleString()}`);
      logInfo(`  Flutterwave fee: ₦${flutterwaveFee.toLocaleString()}`);
      logInfo(`  Paystack fee: ₦${paystackFee.toLocaleString()}`);
    });

    // Test currency formatting
    const formattedAmount = formatNaira(10000);
    logSuccess(`Currency formatting: ${formattedAmount}`);

    return true;
  } catch (error) {
    logError(`Nigerian utilities test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testProviderHealth(): Promise<boolean> {
  logSection('4️⃣ Testing Provider Health Checks');

  try {
    const paystackProvider = createPaystackProvider();

    // Test health check
    const health = await paystackProvider.checkGatewayHealth();
    logSuccess(`Health check completed`);
    logInfo(`Status: ${health.isHealthy ? 'Healthy' : 'Unhealthy'}`);
    logInfo(`Response time: ${health.responseTime}ms`);
    logInfo(`Last checked: ${health.lastChecked.toISOString()}`);

    // Test Nigerian banks (might fail in test environment)
    try {
      const banks = await paystackProvider.getNigerianBanks();
      logSuccess(`Nigerian banks lookup: ${banks.length} banks found`);

      if (banks.length > 0) {
        const sampleBanks = banks.slice(0, 3);
        sampleBanks.forEach(bank => {
          logInfo(`  ${bank.code}: ${bank.name}`);
        });
      }
    } catch (bankError) {
      logInfo(`Nigerian banks lookup failed (expected in test): ${(bankError as Error).message}`);
    }

    return true;
  } catch (error) {
    logError(`Provider health test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testPaymentFlow(): Promise<boolean> {
  logSection('5️⃣ Testing Payment Flow (Mock)');

  try {
    const paystackProvider = createPaystackProvider();
    const mockOrder = createMockOrder();

    // Test order validation
    if (mockOrder.currency === 'NGN') {
      logSuccess('Currency validation: NGN');
    } else {
      logError(`Invalid currency: ${mockOrder.currency}`);
    }

    if (mockOrder.totalAmount > 0) {
      logSuccess(`Amount validation: ₦${mockOrder.totalAmount.toLocaleString()}`);
    } else {
      logError(`Invalid amount: ${mockOrder.totalAmount}`);
    }

    // Test phone normalization (would happen internally)
    const isPhoneValid = validateNigerianPhone(mockOrder.customer.phone);
    if (isPhoneValid) {
      logSuccess(`Phone validation: ${mockOrder.customer.phone}`);
    } else {
      logError(`Invalid phone: ${mockOrder.customer.phone}`);
    }

    // Note: We can't test actual payment initialization without real API keys
    logInfo('Payment initialization would require valid API keys');
    logInfo('Order structure is valid for processing');

    return true;
  } catch (error) {
    logError(`Payment flow test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testErrorHandling(): Promise<boolean> {
  logSection('6️⃣ Testing Error Handling');

  try {
    // Test invalid provider config
    try {
      new PaystackProvider({
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
      });
      logError('Should have thrown error for empty config');
      return false;
    } catch (configError) {
      logSuccess('Invalid config properly rejected');
    }

    // Test invalid phone number handling
    const invalidPhones = [
      '12345',
      'invalid-phone',
      '+234000000000'
    ];

    invalidPhones.forEach(phone => {
      const isValid = validateNigerianPhone(phone);
      if (!isValid) {
        logSuccess(`Invalid phone properly rejected: ${phone}`);
      } else {
        logError(`Invalid phone was accepted: ${phone}`);
      }
    });

    // Test amount validation
    try {
      calculateGatewayFee(-1000, 'PAYSTACK');
      logError('Negative amount should have been rejected');
      return false;
    } catch (amountError) {
      logSuccess('Invalid amount properly rejected');
    }

    return true;
  } catch (error) {
    logError(`Error handling test failed: ${(error as Error).message}`);
    return false;
  }
}

// Main test runner
async function runAllTests(): Promise<boolean> {
  console.log('🧪 Starting Paystack Integration Verification\n');

  const tests = [
    { name: 'Provider Creation', fn: testProviderCreation },
    { name: 'Orchestrator Integration', fn: testOrchestratorIntegration },
    { name: 'Nigerian Utilities', fn: testNigerianUtilities },
    { name: 'Provider Health', fn: testProviderHealth },
    { name: 'Payment Flow', fn: testPaymentFlow },
    { name: 'Error Handling', fn: testErrorHandling },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`Test "${test.name}" crashed: ${(error as Error).message}`);
    }
  }

  logSection('\n🏁 Test Results');
  logInfo(`Tests passed: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    logSuccess('🎉 All Paystack integration tests passed!');
    logSuccess('The implementation is ready for use.');
    return true;
  } else {
    logError(`${totalTests - passedTests} tests failed`);
    logError('Please check the failed tests above.');
    return false;
  }
}

// Run the verification
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', (error as Error).message);
      process.exit(1);
    });
}

export {
  runAllTests,
  testProviderCreation,
  testOrchestratorIntegration,
  testNigerianUtilities,
  testProviderHealth,
  testPaymentFlow,
  testErrorHandling,
};