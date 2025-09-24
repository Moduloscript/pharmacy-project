export type BulkRule = { minQty: number; discountPercent: number | null; unitPrice: number | null };

export function computeEffectiveUnitPrice(base: number, qty: number, rules?: BulkRule[]): number {
  if (!rules || rules.length === 0) return base;
  const eligible = rules.filter(r => r.minQty > 0 && r.minQty <= qty);
  if (eligible.length === 0) return base;
  const rule = eligible.sort((a, b) => b.minQty - a.minQty)[0];
  if (rule.unitPrice != null) return Math.max(0, rule.unitPrice);
  if (rule.discountPercent != null) return Math.max(0, base * (rule.discountPercent >= 0 ? (1 - rule.discountPercent / 100) : 1));
  return base;
}