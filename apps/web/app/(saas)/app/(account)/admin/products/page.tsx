
import { Metadata } from 'next';
import { InventoryTable } from '@saas/admin/components/InventoryTable';
import { AdminPageContainer } from '@saas/admin/components/AdminPageContainer';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Products - BenPharm Admin',
  description: 'Manage your product catalog.',
};

export default async function AdminProductsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin' && session.user?.role !== 'pharmacist') {
    redirect('/app');
  }

  return (
    <AdminPageContainer maxWidth="6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-2">
            Manage your product catalog and inventory.
        </p>
      </div>
      
      <InventoryTable />
    </AdminPageContainer>
  );
}
