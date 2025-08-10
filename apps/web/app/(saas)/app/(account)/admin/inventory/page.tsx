import { Metadata } from 'next';
import { InventoryTable } from '@saas/admin/components/InventoryTable';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Inventory Management - BenPharm',
  description: 'Manage product inventory, track stock levels, and handle low stock alerts.',
};

export default async function AdminInventoryPage() {
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600 mt-2">
          Track product stock levels, manage inventory, and handle alerts for Nigerian pharmacy operations.
        </p>
      </div>
      
      <InventoryTable />
    </div>
  );
}
