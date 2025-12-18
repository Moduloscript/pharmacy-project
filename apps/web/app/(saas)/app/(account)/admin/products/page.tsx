
import { Metadata } from 'next';
import { InventoryTable } from '@saas/admin/components/InventoryTable';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';
import { PageHeader } from "@saas/shared/components/PageHeader";

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
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-2">
            Manage your product catalog and inventory.
        </p>
      </div>
      
      <InventoryTable />
    </div>
  );
}
