import { describe, it, expect } from 'vitest';
import { computeEffectiveUnitPrice, type BulkRule } from '../bulk-pricing';

describe('computeEffectiveUnitPrice', () => {
  const rules: BulkRule[] = [
    { minQty: 10, discountPercent: 10, unitPrice: null },
    { minQty: 50, discountPercent: null, unitPrice: 900 },
    { minQty: 100, discountPercent: 20, unitPrice: null },
  ];

  it('returns base when no rules', () => {
    expect(computeEffectiveUnitPrice(1000, 1, [])).toBe(1000);
  });

  it('applies best eligible rule by highest minQty', () => {
    // qty 60 -> choose minQty 50 rule unitPrice=900
    expect(computeEffectiveUnitPrice(1000, 60, rules)).toBe(900);
  });

  it('applies percentage when unit price is not set', () => {
    // qty 10 -> 10% off 1000 = 900
    expect(computeEffectiveUnitPrice(1000, 10, rules)).toBe(900);
  });

  it('returns base when qty below first tier', () => {
    expect(computeEffectiveUnitPrice(1000, 5, rules)).toBe(1000);
  });

  it('handles large tier', () => {
    // qty 120 -> 20% off 1000 = 800
    expect(computeEffectiveUnitPrice(1000, 120, rules)).toBe(800);
  });
});