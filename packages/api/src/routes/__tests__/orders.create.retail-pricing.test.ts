import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock auth middleware and session/config to avoid next/react and to bypass business checks
vi.mock('../../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('session', { user: { id: 'u1', emailVerified: true } });
    c.set('user', { id: 'u1', emailVerified: true, role: 'user' });
    await next();
  },
}));
vi.mock('@repo/auth/lib/server', () => ({
  getSession: async () => ({ user: { id: 'u1', emailVerified: true } }),
}));
vi.mock('@repo/config', () => ({
  config: { users: { requireEmailVerification: false, requireBusinessApproval: false } },
}));
// Mock mail notifications to no-op
vi.mock('@repo/mail', () => ({
  enhancedNotificationService: { sendOrderConfirmation: vi.fn().mockResolvedValue(undefined) },
}));
// Mock prescription validation to allow all
vi.mock('../../services/prescription-validation', () => ({
  PrescriptionValidationService: {
    validateOrderPrescriptions: vi.fn().mockResolvedValue({ itemValidations: [] }),
    createPrescriptionRequirement: vi.fn().mockResolvedValue(undefined),
  },
}));
// Mock optional order prescription notification
vi.mock('../../services/order-prescription-notifications', () => ({
  sendPrescriptionRequiredNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock db
vi.mock('@repo/database', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    productBulkPriceRule: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    order: { findFirst: vi.fn() },
  },
}));

import { db } from '@repo/database';
import { ordersRouter } from '../orders';

// Helper to simulate Prisma $transaction with a provided callback
function setupTransactionMock() {
  vi.mocked(db.$transaction).mockImplementation(async (cb: any) => {
    if (typeof cb !== 'function') return cb;
    // Create a tx client with the methods used in the route
    const orderCreate = vi.fn().mockResolvedValue({ id: 'ord1', orderNumber: 'O-001', status: 'RECEIVED', total: 1 });
    const orderItemCreate = vi.fn().mockImplementation(async (args: any) => ({ id: 'oi', ...args.data }));
    const orderTrackingCreate = vi.fn().mockResolvedValue({ id: 'trk1' });
    const productUpdate = vi.fn().mockResolvedValue({ id: 'p', stockQuantity: 1 });
    const cartItemDeleteMany = vi.fn().mockResolvedValue({ count: 0 });

    const tx: any = {
      order: { create: orderCreate },
      orderItem: { create: orderItemCreate },
      orderTracking: { create: orderTrackingCreate },
      product: { update: productUpdate },
      cartItem: { deleteMany: cartItemDeleteMany },
    };

    const result = await cb(tx);
    (db as any).__tx = { orderCreate, orderItemCreate, orderTrackingCreate, productUpdate, cartItemDeleteMany };
    return result;
  });
}

describe('POST /api/orders - retail customers ignore bulk rules and use retail price', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    setupTransactionMock();
    app = new Hono();
    app.route('/api/orders', ordersRouter as any);

    // Mock retail customer
    vi.mocked(db.customer.findUnique).mockResolvedValue({ id: 'cust1', customerType: 'RETAIL' } as any);

    // Mock products
    vi.mocked(db.product.findMany).mockResolvedValue([
      { id: 'p1', wholesalePrice: 1000, retailPrice: 1250, stockQuantity: 999 } as any,
    ]);

    // Mock bulk rules that should be ignored
    vi.mocked(db.productBulkPriceRule.findMany).mockResolvedValue([
      { productId: 'p1', minQty: 10, discountPercent: 50, unitPrice: null },
    ] as any);
  });

  it('uses retail price even if rules exist', async () => {
    const payload = {
      items: [
        { productId: 'p1', quantity: 12, unitPrice: 1 },
      ],
      deliveryMethod: 'STANDARD',
      deliveryAddress: 'addr',
      deliveryCity: 'city',
      deliveryState: 'state',
      deliveryPhone: '08012345678',
    };

    const res = await app.request('http://test/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const tx = (db as any).__tx;
    const calls = tx.orderItemCreate.mock.calls.map((c: any[]) => c[0]);
    const created = calls.map((arg: any) => arg.data);
    // Retail must use retail price 1250
    expect(created[0].unitPrice).toBe(1250);
  });
});