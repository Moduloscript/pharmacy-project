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
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-4 md:space-y-6">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold">Inventory Movements</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none" title={id}>
            Product ID: {id}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link href={`/app/admin/products/${id}`}>
            <Button variant="outline" size="sm" className="h-10 md:h-9 w-full md:w-auto">Back to Product</Button>
          </Link>
        </div>
      </div>

      <Card className="p-3 md:p-4">
        <p className="text-xs md:text-sm text-muted-foreground">
          Audit entries are generated automatically on stock adjustments via admin endpoints.
        </p>
      </Card>

      <ProductAdjustStockForm productId={id} />

      <ProductMovementsList productId={id} />

      <ProductBatchesList productId={id} />
    </div>
  );
}
