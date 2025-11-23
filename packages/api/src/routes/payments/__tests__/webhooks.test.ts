import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { webhooksRouter } from '../webhooks';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    PAYSTACK_WEBHOOK_SECRET: 'test-webhook-secret',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock database
vi.mock('@repo/database', () => ({
  db: {
    $transaction: vi.fn(),
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    orderItem: {
      count: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@repo/logs', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock validation guards
vi.mock('@repo/payments/lib/validation-guards', () => ({
  updateOrderStatusWithValidation: vi.fn(),
}));

import { db } from '@repo/database';
import { updateOrderStatusWithValidation } from '@repo/payments/lib/validation-guards';

describe('POST /api/payments/webhook/paystack', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/payments', webhooksRouter as any);

    // Setup database mocks for basic success scenario
    vi.mocked(db.order.findFirst).mockResolvedValue({
      id: 'order123',
      orderNumber: 'O-001',
      status: 'PENDING',
      total: 10000,
    } as any);

    // Mock validation to return success by default
    vi.mocked(updateOrderStatusWithValidation).mockResolvedValue({
      success: true,
    });

    vi.mocked(db.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        order: {
          update: vi.fn().mockResolvedValue({ id: 'order123', status: 'SUCCESS' }),
        },
        payment: {
          create: vi.fn().mockResolvedValue({ id: 'payment123' }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({ id: 'payment123' }),
        },
        orderItem: {
          count: vi.fn().mockResolvedValue(0),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return await callback(mockTx as any);
    });
  });

  describe('Basic Functionality', () => {
    it('should accept charge.success events when signature verification bypassed in test mode', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'O-001',
          status: 'success',
          amount: 10000,
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('should handle unsupported events gracefully', async () => {
      const payload = {
        event: 'transfer.success',
        data: {
          reference: 'TRANSFER-001',
          status: 'success',
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        message: 'Event not processed',
      });
    });

    it('should handle malformed JSON payload', async () => {
      const invalidJson = '{"event": "charge.success", invalid}';

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: invalidJson,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: 'Webhook processing failed',
      });
    });

    it('should handle payment validation failures', async () => {
      // Mock validation to return failure
      vi.mocked(updateOrderStatusWithValidation).mockResolvedValue({
        success: false,
        error: 'Amount mismatch detected',
      });

      const payload = {
        event: 'charge.success',
        data: {
          reference: 'O-001',
          status: 'success',
          amount: 10000,
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Amount mismatch detected');
    });
  });

  describe('Environment-based Signature Verification', () => {
    it('should bypass signature verification in test mode', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'O-001',
          status: 'success',
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(200);
    });

    it('should require signature verification in production environment', async () => {
      process.env.NODE_ENV = 'production';

      const payload = {
        event: 'charge.success',
        data: {
          reference: 'O-001',
          status: 'success',
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid signature');
    });
  });

  describe('Request Flow Validation', () => {
    it('should process charge.success events through the expected flow', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'O-001',
          status: 'success',
          amount: 10000,
        },
      };

      const body = JSON.stringify(payload);

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(200);
      expect(updateOrderStatusWithValidation).toHaveBeenCalledWith(
        'O-001',
        'SUCCESS',
        expect.objectContaining({
          gateway: 'PAYSTACK',
          amount: 100, // 10000 kobo / 100 = 100 naira
        })
      );
    });

    it('should handle empty payload gracefully', async () => {
      const body = '';

      const res = await app.request('/api/payments/webhook/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      expect(res.status).toBe(500);
    });
  });
});