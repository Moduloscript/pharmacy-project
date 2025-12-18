'use client';

import { useEffect, useState } from 'react';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Textarea } from '@ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';

interface ProductInfo {
  id: string;
  name: string;
  stockQuantity: number;
  minStockLevel?: number;
}

export function ProductAdjustStockForm({ productId }: { productId: string }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('ADJUSTMENT');
  const [qty, setQty] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCurrent = async () => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch product');
      const data: ProductInfo = await res.json();
      setCurrent(Number((data as any).stockQuantity));
    } catch (e: any) {
      console.warn('Failed to load current product for adjust form:', e?.message || e);
    }
  };

  useEffect(() => { loadCurrent(); }, [productId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const parsed = parseInt(qty, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Please enter a valid positive quantity.');
      setLoading(false);
      return;
    }

    try {
      const body: any = {
        type,
        qty: parsed,
        reason: reason || undefined,
        batchNumber: batchNumber || undefined,
        // Generate a default idempotency key if not provided by user to protect against accidental double-submits
        idempotencyKey: (idempotencyKey && idempotencyKey.trim()) || `ui-${Date.now()}`,
      };

      const res = await fetch(`/api/admin/products/${productId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to create adjustment (${res.status})`);
      }

      setMessage('Adjustment created successfully');
      setQty('');
      await loadCurrent();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('inventory:updated', { detail: { productId } }));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4" id="adjust">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Adjust Stock</h3>
            <p className="text-sm text-muted-foreground">
              Create an IN, OUT or ADJUSTMENT movement. Uses batch-aware logic if batch is specified.
            </p>
          </div>
          {current !== null && (
            <div className="text-sm text-muted-foreground">
              Current stock: <span className="font-medium text-foreground">{current}</span>
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-600">{message}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-4 gap-y-5">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-11 md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="OUT">OUT</SelectItem>
                <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="h-11 md:h-9" />
          </div>
          <div>
            <Label>Batch Number (optional)</Label>
            <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g., BN-2025-001" className="h-11 md:h-9" />
          </div>
          <div>
            <Label>Idempotency Key (optional)</Label>
            <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} placeholder="Unique request key" className="h-11 md:h-9" />
          </div>
          <div className="md:col-span-2">
            <Label>Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Additional details..." className="min-h-[60px]" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <Button type="submit" disabled={loading} className="h-11 md:h-9">{loading ? 'Saving…' : 'Create Adjustment'}</Button>
          <Button type="button" variant="outline" onClick={() => { setQty(''); setReason(''); setBatchNumber(''); setIdempotencyKey(''); }} className="h-11 md:h-9">
            Clear
          </Button>
        </div>
      </form>
    </Card>
  );
}
