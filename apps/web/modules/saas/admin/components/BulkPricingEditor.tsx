"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Card } from "@ui/components/card";
import { Separator } from "@ui/components/separator";
import { Plus, Trash2 } from "lucide-react";

export type BulkPricingRule = {
  minQty: number; // minimum quantity for this rule
  // One of the following should be provided
  discountPercent?: number; // percentage discount to apply (e.g., 10 = 10%)
  unitPrice?: number; // absolute override unit price (e.g., 950.00)
};

function isRuleValid(rule: BulkPricingRule): boolean {
  if (!Number.isFinite(rule.minQty) || rule.minQty <= 0) return false;
  const hasPercent = rule.discountPercent !== undefined && rule.discountPercent !== null;
  const hasUnit = rule.unitPrice !== undefined && rule.unitPrice !== null;
  if (hasPercent && hasUnit) return false; // must be mutually exclusive
  if (!hasPercent && !hasUnit) return false; // one required
  if (hasPercent) {
    const v = Number(rule.discountPercent);
    if (!Number.isFinite(v) || v < 0 || v > 100) return false;
  }
  if (hasUnit) {
    const v = Number(rule.unitPrice);
    if (!Number.isFinite(v) || v <= 0) return false;
  }
  return true;
}

function parseValue(raw: string | undefined | null): BulkPricingRule[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isRuleValid);
    }
    return [];
  } catch {
    // Not JSON — legacy free text; ignore and start empty
    return [];
  }
}

function serializeValue(rules: BulkPricingRule[]): string {
  return JSON.stringify(rules);
}

export interface BulkPricingEditorProps {
  value?: string;
  onChange: (next: string) => void;
  currency?: string; // UI hint
}

export function BulkPricingEditor({ value, onChange, currency = "₦" }: BulkPricingEditorProps) {
  const [rules, setRules] = useState<BulkPricingRule[]>(() => parseValue(value));
  const [dirty, setDirty] = useState(false);

  // Keep local state in sync when outer value changes (unless we've been editing)
  useEffect(() => {
    if (!dirty) {
      setRules(parseValue(value));
    }
  }, [value, dirty]);

  const canSave = useMemo(() => rules.length === 0 || rules.every(isRuleValid), [rules]);

  const addRule = () => {
    setDirty(true);
    setRules((prev) => [...prev, { minQty: 1, discountPercent: 5 }]);
  };

  const removeRule = (index: number) => {
    setDirty(true);
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, patch: Partial<BulkPricingRule>) => {
    setDirty(true);
    setRules((prev) => {
      const next = [...prev];
      const base = next[index] ?? { minQty: 1 };
      const merged = { ...base, ...patch } as BulkPricingRule;
      // Enforce mutual exclusivity: if discountPercent set, clear unitPrice and vice versa
      if (patch.discountPercent !== undefined) {
        merged.unitPrice = undefined;
      }
      if (patch.unitPrice !== undefined) {
        merged.discountPercent = undefined;
      }
      next[index] = merged;
      return next;
    });
  };

  const handleSave = () => {
    setDirty(false);
    onChange(serializeValue(rules.filter(isRuleValid)));
  };

  const handleClear = () => {
    setDirty(true);
    setRules([]);
    onChange("[]");
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700">Define quantity-based pricing.</p>
          <p className="text-xs text-gray-500">Stored as JSON in bulkPricing for now. Exactly one of discount or unit price per rule.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4 mr-1" /> Add rule
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
            Save rules
          </Button>
        </div>
      </div>
      <Separator />

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500">No bulk pricing rules. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => {
            const invalid = !isRuleValid(rule);
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3">
                  <Label htmlFor={`minQty-${idx}`}>Min Qty</Label>
                  <Input
                    id={`minQty-${idx}`}
                    type="number"
                    min={1}
                    value={Number.isFinite(rule.minQty) ? rule.minQty : 1}
                    onChange={(e) => updateRule(idx, { minQty: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                  />
                </div>

                <div className="md:col-span-4">
                  <Label htmlFor={`percent-${idx}`}>Discount (%)</Label>
                  <Input
                    id={`percent-${idx}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={rule.discountPercent ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') updateRule(idx, { discountPercent: undefined });
                      else updateRule(idx, { discountPercent: parseFloat(v) });
                    }}
                  />
                </div>

                <div className="md:col-span-4">
                  <Label htmlFor={`unit-${idx}`}>Unit Price ({currency})</Label>
                  <Input
                    id={`unit-${idx}`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={rule.unitPrice ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') updateRule(idx, { unitPrice: undefined });
                      else updateRule(idx, { unitPrice: parseFloat(v) });
                    }}
                  />
                </div>

                <div className="md:col-span-1 flex items-center">
                  <Button type="button" variant="outline" size="icon" onClick={() => removeRule(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {invalid && (
                  <div className="md:col-span-12">
                    <p className="text-xs text-red-600">Rule is invalid. Provide a min quantity and either a discount percent (0-100) or a positive unit price.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}