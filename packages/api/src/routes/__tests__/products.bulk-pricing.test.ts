import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock auth middleware to avoid importing next/react chains during tests
import { vi } from 'vitest';
vi.mock('../../middleware/auth', () => ({
  authMiddleware: async (_c: any, next: any) => await next(),
}));
vi.mock('@repo/auth/lib/server', () => ({
  getSession: async () => ({ user: { id: 'test', role: 'admin' } }),
}));

import { productsRouter } from '../products';

vi.mock('@repo/database', () => ({
  db: {
    productBulkPriceRule: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from '@repo/database';

describe('products bulk pricing batch endpoint', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/products', productsRouter as any);
  });

  it('returns rules grouped by product id', async () => {
    vi.mocked(db.productBulkPriceRule.findMany).mockResolvedValue([
      { productId: 'p1', minQty: 10, discountPercent: null, unitPrice: 900 },
      { productId: 'p1', minQty: 50, discountPercent: 10, unitPrice: null },
      { productId: 'p2', minQty: 20, discountPercent: 5, unitPrice: null },
    ] as any);

    const res = await app.request('http://test/api/products/bulk-pricing/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: ['p1', 'p2'] }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rulesByProduct.p1).toBeDefined();
    expect(json.rulesByProduct.p1).toHaveLength(2);
    expect(json.rulesByProduct.p2[0]).toMatchObject({ minQty: 20, discountPercent: 5 });
  });
});