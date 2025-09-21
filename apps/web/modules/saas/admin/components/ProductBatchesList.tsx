'use client';

import { useEffect, useState } from 'react';
import { Card } from '@ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';

interface BatchRow {
  id: string;
  batchNumber: string;
  qty: number;
  expiryDate: string | null;
  createdAt: string;
}

export function ProductBatchesList({ productId }: { productId: string }) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/products/${productId}/batches?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch batches (${res.status})`);
      const data = await res.json();
      const list = (data?.data || []).map((b: any) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        qty: b.qty,
        expiryDate: b.expiryDate ?? null,
        createdAt: b.createdAt,
      }));
      setRows(list);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    const onUpdated = () => fetchBatches();
    if (typeof window !== 'undefined') window.addEventListener('inventory:updated', onUpdated);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('inventory:updated', onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  return (
    <Card>
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Batches</h3>
          <p className="text-sm text-muted-foreground">Page {page}</p>
          <p className="text-xs text-muted-foreground mt-1">Tip: Export CSV to audit batch quantities and expiries.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch #" className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Page size</Label>
            <Input type="number" min={5} max={100} value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value) || 20)} className="h-8 w-24" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>Next</Button>
            <Button variant="outline" onClick={fetchBatches} disabled={loading}>Refresh</Button>
            <Button
              variant="outline"
              onClick={() => {
                const headers = ['batchNumber','qty','expiryDate','createdAt','id'];
                const rows = rows.map(b => [
                  b.batchNumber,
                  String(b.qty),
                  b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0,10) : '',
                  new Date(b.createdAt).toISOString(),
                  b.id,
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `batches-${productId}-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading batches…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No batches found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(b => (
                <TableRow key={b.id}>
                  <TableCell>{b.batchNumber}</TableCell>
                  <TableCell className="text-right">{b.qty}</TableCell>
                  <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
