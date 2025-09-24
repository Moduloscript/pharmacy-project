'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { Badge } from '@ui/components/badge';
import { DatePicker } from '@ui/components/date-picker';

export interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  reason?: string | null;
  previousStock: number;
  newStock: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  userId?: string | null;
  notes?: string | null;
  createdAt: string; // ISO string
}

export function ProductMovementsList({ productId }: { productId: string }) {
  const [items, setItems] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters + pagination
  const [typeFilter, setTypeFilter] = useState<'all' | 'IN' | 'OUT' | 'ADJUSTMENT'>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        params.set('dateFrom', start.toISOString());
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.set('dateTo', end.toISOString());
      }

      const res = await fetch(`/api/admin/products/${productId}/movements?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to load movements (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      setItems(list);
      const meta = data?.meta;
      setTotal(typeof meta?.total === 'number' ? meta.total : (page - 1) * pageSize + list.length);
    } catch (e: any) {
      setError(e.message || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const onUpdated = () => fetchData();
    if (typeof window !== 'undefined') {
      window.addEventListener('inventory:updated', onUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('inventory:updated', onUpdated);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, typeFilter, from, to]);

  const totals = useMemo(() => {
    const net = items.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    return { net };
  }, [items]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="OUT">OUT</SelectItem>
                <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From</Label>
            <DatePicker
              value={from ? new Date(from) : undefined}
              onChange={(d) => setFrom(d ? d.toISOString().slice(0, 10) : '')}
              placeholder="Select start date"
              className="h-9 w-full"
            />
          </div>

          <div>
            <Label>To</Label>
            <DatePicker
              value={to ? new Date(to) : undefined}
              onChange={(d) => setTo(d ? d.toISOString().slice(0, 10) : '')}
              placeholder="Select end date"
              className="h-9 w-full"
            />
          </div>

          <div>
            <Label>Page size</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchData} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </Button>
            <Button variant="outline" onClick={() => { setTypeFilter('all'); setFrom(''); setTo(''); setPage(1); setPageSize(20); }}>
              Reset
            </Button>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages} • Showing {rangeStart}–{rangeEnd} of {total}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage(1)} disabled={page <= 1}>First</Button>
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              <Button variant="outline" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</Button>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-red-700 text-sm">{error}</div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Movements</h3>
            <p className="text-sm text-muted-foreground">{items.length} record(s) • Net change: {totals.net}</p>
            <p className="text-xs text-muted-foreground mt-1">Tip: Use Export CSV for reconciliation. Types: IN (increase), OUT (decrease), ADJUSTMENT (manual).</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const headers = [
                  'createdAt','type','quantity','previousStock','newStock','reason','batchId','notes'
                ];
                const rows = items.map(m => [
                  new Date(m.createdAt).toISOString(),
                  m.type,
                  String(m.quantity),
                  String(m.previousStock),
                  String(m.newStock),
                  m.reason ?? '',
                  // batchNumber may be null when batchId is used; prefer batchId for joins
                  (m as any).batchId ?? '',
                  (m.notes ?? '').replace(/\n/g, ' '),
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `movements-${productId}-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading movements…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No movements found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                    <TableCell>
                      {m.previousStock} → {m.newStock}
                    </TableCell>
                    <TableCell>{m.reason || '—'}</TableCell>
                    <TableCell>{m.batchNumber || '—'}</TableCell>
                    <TableCell>{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="max-w-[400px] truncate" title={m.notes || undefined}>{m.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
