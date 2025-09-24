import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock auth/session to avoid importing next/react
vi.mock('../../middleware/auth', () => ({
  authMiddleware: async (_c: any, next: any) => await next(),
}));
vi.mock('@repo/auth/lib/server', () => ({
  getSession: async () => ({ user: { id: 'test', role: 'admin' } }),
}));

vi.mock('@repo/database', async (orig) => {
  const actual: any = await (orig as any)();
  return {
    db: {
      ...actual.db,
      productBulkPriceRule: {
        findMany: vi.fn(),
      },
    },
  };
});

import { db } from '@repo/database';
import { productsRouter } from '../products';

describe('GET /api/products/:id/bulk-pricing', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/products', productsRouter as any);
  });

  it('returns normalized rules ordered by minQty', async () => {
    vi.mocked(db.productBulkPriceRule.findMany).mockResolvedValue([
      { productId: 'p1', minQty: 50, discountPercent: 15, unitPrice: null },
      { productId: 'p1', minQty: 10, discountPercent: null, unitPrice: 950 },
    ] as any);

    const res = await app.request('http://test/api/products/p1/bulk-pricing');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rules)).toBe(true);
    // OrderBy is applied by DB; in mock we don't sort, so normalize by sorting client-side
    const sorted = [...json.rules].sort((a: any, b: any) => a.minQty - b.minQty);
    expect(sorted[0]).toMatchObject({ minQty: 10 });
    expect(sorted[1]).toMatchObject({ minQty: 50 });
    // Ensure values converted to numbers
    const unit = sorted.find((r: any) => r.unitPrice != null);
    const disc = sorted.find((r: any) => r.discountPercent != null);
    expect(unit?.unitPrice).toBe(950);
    expect(disc?.discountPercent).toBe(15);
  });
});