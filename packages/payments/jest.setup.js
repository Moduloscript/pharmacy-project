// Jest setup file for payments package

// Mock environment variables for testing
process.env.FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK-test-mock-public-key';
process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK-test-mock-secret-key';
process.env.FLUTTERWAVE_ENCRYPTION_KEY = 'test-mock-encryption-key';
process.env.FLUTTERWAVE_WEBHOOK_SECRET = 'test-mock-webhook-secret';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.benpharm.ng';
process.env.NEXT_PUBLIC_LOGO_URL = 'https://test.benpharm.ng/logo.png';
process.env.NEXT_PUBLIC_CURRENCY = 'NGN';
process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = '₦';
process.env.NODE_ENV = 'test';

// Extend Jest matchers for better assertions
expect.extend({
  toBeNigerianPhone(received) {
    const nigerianPhoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    const pass = nigerianPhoneRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Nigerian phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Nigerian phone number format (+234XXXXXXXXXX or 0XXXXXXXXXX)`,
        pass: false,
      };
    }
  },
  
  toBeNairaCurrency(received) {
    const nairaRegex = /^₦[\d,]+(\.\d{2})?$/;
    const pass = nairaRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Naira currency format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Naira currency format (₦X,XXX.XX)`,
        pass: false,
      };
    }
  },

  toBeWithinTimeRange(received, expectedTime, tolerance = 1000) {
    const pass = Math.abs(received - expectedTime) <= tolerance;
    
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be within ${tolerance}ms of ${expectedTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be within ${tolerance}ms of ${expectedTime}ms`,
        pass: false,
      };
    }
  }
});

// Global test helpers
global.createMockNigerianOrder = (overrides = {}) => ({
  id: 'test-order-123',
  orderNumber: 'BP_TEST_123456_ABC',
  totalAmount: 5000,
  currency: 'NGN',
  customer: {
    email: 'test@benpharm.ng',
    phone: '+2348012345678',
    name: 'Test Customer',
    state: 'Edo',
    lga: 'Oredo',
  },
  items: [
    {
      name: 'Test Medicine',
      quantity: 2,
      unitPrice: 2500,
    },
  ],
  deliveryAddress: '123 Test Street, Benin City',
  deliveryFee: 0,
  ...overrides,
});

global.createMockFlutterwaveResponse = (overrides = {}) => ({
  status: 'success',
  message: 'Payment link created successfully',
  data: {
    link: 'https://checkout.flutterwave.com/pay/test-link-123',
    id: 12345,
    ...overrides.data,
  },
  ...overrides,
});

// Mock timers for performance testing
global.mockPerformanceTest = () => {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    expectWithin: (maxTime) => {
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(maxTime);
      return duration;
    }
  };
};

// Console output control for tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.VERBOSE_TESTS ? originalConsole.log : () => {},
  warn: process.env.VERBOSE_TESTS ? originalConsole.warn : () => {},
  error: originalConsole.error, // Always show errors
};
