import { Metadata } from 'next';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { ProductMovementsList } from '@saas/admin/components/ProductMovementsList';
import { ProductBatchesList } from '@saas/admin/components/ProductBatchesList';
import { ProductAdjustStockForm } from '@saas/admin/components/ProductAdjustStockForm';

export const metadata: Metadata = {
  title: 'Inventory Movements',
  description: 'Audit trail for stock adjustments',
};

export default async function ProductMovementsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.user?.role !== 'admin') redirect('/app');

  const { id } = await params;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Movements</h1>
          <p className="text-sm text-muted-foreground">Product ID: {id}</p>
        </div>
        <div>
          <Link href={`/app/admin/products/${id}`}>
            <Button variant="outline">Back to Product</Button>
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Audit entries are generated automatically on stock adjustments via admin endpoints.
        </p>
      </Card>

      <ProductAdjustStockForm productId={id} />

      <ProductMovementsList productId={id} />

      <ProductBatchesList productId={id} />
    </div>
  );
}
