import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock repo auth so middleware import doesn't pull Next/React
vi.mock('@repo/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => ({ session: {}, user: { id: 'admin-1', role: 'admin' } })),
    },
  },
}));

// Mock auth middleware to always inject an admin user
vi.mock('../../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'admin-1', role: 'admin' });
    await next();
  },
}));

// Also mock @repo/database to avoid hitting Prisma/DB in service layer
vi.mock('@repo/database', async (importOriginal) => {
  const actual: any = await importOriginal();
  const db = {
    $transaction: vi.fn(),
    productBatch: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
    },
  } as any;
  return { ...actual, db };
});

// Import db for fine-grained stubbing per test
import { db } from '@repo/database';

// Import the router after mocks are in place
import { productsRouter } from '../products';

function makeApp() {
  const app = new Hono();
  app.route('/admin/products', productsRouter);
  return app;
}

describe('Admin products inventory routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate Prisma $transaction helper
    vi.mocked(db.$transaction as any).mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(db);
      return arg;
    });
  });

  it('GET /admin/products/:id/batches returns paginated list', async () => {
    vi.mocked(db.productBatch.count as any).mockResolvedValue(1);
    vi.mocked(db.productBatch.findMany as any).mockResolvedValue([
      { id: 'b1', productId: 'PROD1', batchNumber: 'BN-001', qty: 10, costPrice: null, expiryDate: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const app = makeApp();
    const res = await app.request('/admin/products/PROD1/batches?page=1&pageSize=10&search=BN');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body?.meta).toMatchObject({ page: 1, pageSize: 10, total: 1 });
    expect(Array.isArray(body?.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ batchNumber: 'BN-001', qty: 10 });
  });

  it('GET /admin/products/:id/movements returns paginated list with filters', async () => {
    vi.mocked(db.inventoryMovement.count as any).mockResolvedValue(1);
    vi.mocked(db.inventoryMovement.findMany as any).mockResolvedValue([
      { id: 'm1', productId: 'PROD1', type: 'IN', quantity: 5, reason: 'restock', previousStock: 10, newStock: 15, batchNumber: 'BN-001', expiryDate: null, batchId: 'b1', userId: 'admin-1', notes: null, createdAt: new Date() },
    ]);

    const app = makeApp();
    const res = await app.request('/admin/products/PROD1/movements?page=1&pageSize=20&dateFrom=2024-01-01T00:00:00.000Z');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body?.meta).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(body?.data?.[0]).toMatchObject({ type: 'IN', quantity: 5 });
  });

  it('POST /admin/products/:id/adjustments creates adjustment (IN)', async () => {
    // Service will use db mocks below
    vi.mocked(db.product.findUnique as any).mockResolvedValue({ id: 'PROD1', stockQuantity: 7 });
    vi.mocked(db.productBatch.findFirst as any).mockResolvedValue(null);
    vi.mocked(db.productBatch.create as any).mockResolvedValue({ id: 'b1' });
    vi.mocked(db.productBatch.findUnique as any).mockResolvedValue({ id: 'b1', qty: 0 });
    vi.mocked(db.product.update as any).mockResolvedValue({ id: 'PROD1', stockQuantity: 10 });
    vi.mocked(db.inventoryMovement.create as any).mockResolvedValue({
      id: 'mov-1', productId: 'PROD1', type: 'IN', quantity: 3, reason: 'restock', previousStock: 7, newStock: 10,
      batchNumber: null, expiryDate: null, batchId: 'b1', userId: 'admin-1', notes: null, createdAt: new Date(),
    });

    const app = makeApp();
    const res = await app.request('/admin/products/PROD1/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'IN', qty: 3, reason: 'restock', batchNumber: 'BN-001' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ type: 'IN', quantity: 3 });
    expect(body.batchId).toBe('b1');
  });

  it('POST /admin/products/:id/adjustments returns 400 on insufficient stock', async () => {
    vi.mocked(db.product.findUnique as any).mockResolvedValue({ id: 'PROD1', stockQuantity: 2 });

    const app = makeApp();
    const res = await app.request('/admin/products/PROD1/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'OUT', qty: 999 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body?.error).toContain('Insufficient');
  });
});