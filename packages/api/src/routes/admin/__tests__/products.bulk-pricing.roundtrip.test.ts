import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock auth to be admin
vi.mock('../../../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => { c.set('user', { id: 'admin', role: 'admin' }); await next(); },
}));

// Partially mock @repo/database keeping all actual exports except the db client methods we need to spy
vi.mock('@repo/database', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    db: {
      ...actual.db,
      product: { ...actual.db?.product, findUnique: vi.fn() },
      productBulkPriceRule: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

import { db } from '@repo/database';
import { productsRouter } from '../products';

describe('Admin bulk-pricing roundtrip', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/admin/products', productsRouter as any);

    vi.mocked(db.product.findUnique).mockResolvedValue({ id: 'p1' } as any);
    vi.mocked((db as any).$transaction).mockImplementation(async (cb: any) => {
      if (typeof cb === 'function') {
        // Provide tx with needed methods
        const tx = {
          productBulkPriceRule: {
            deleteMany: vi.mocked(db.productBulkPriceRule.deleteMany),
            createMany: vi.mocked(db.productBulkPriceRule.createMany),
          },
        } as any;
        return cb(tx);
      }
      return cb;
    });
  });

  it('saves rules and then fetches them', async () => {
    const rules = [
      { minQty: 10, discountPercent: 10 },
      { minQty: 50, unitPrice: 900 },
    ];

    // For PUT: after save, route calls findMany to return persisted rules
    vi.mocked(db.productBulkPriceRule.findMany).mockResolvedValueOnce([
      { productId: 'p1', minQty: 10, discountPercent: 10, unitPrice: null },
      { productId: 'p1', minQty: 50, discountPercent: null, unitPrice: 900 },
    ] as any);

    const putRes = await app.request('http://test/api/admin/products/p1/bulk-pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    expect(putRes.status).toBe(200);
    const saved = await putRes.json();
    expect(saved.rules).toHaveLength(2);

    // For GET: return same rules
    vi.mocked(db.productBulkPriceRule.findMany).mockResolvedValueOnce([
      { productId: 'p1', minQty: 10, discountPercent: 10, unitPrice: null },
      { productId: 'p1', minQty: 50, discountPercent: null, unitPrice: 900 },
    ] as any);

    const getRes = await app.request('http://test/api/admin/products/p1/bulk-pricing');
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.rules[0]).toMatchObject({ minQty: 10 });
    expect(fetched.rules[1]).toMatchObject({ minQty: 50 });
  });
});