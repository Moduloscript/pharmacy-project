import { Metadata } from 'next';
import { OrdersTable } from '@saas/admin/components/OrdersTable';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Orders Management - BenPharm',
  description: 'Manage all customer orders, update statuses, and track deliveries.',
};

export default async function AdminOrdersPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600 mt-2">
          Manage customer orders, update statuses, and track deliveries for all pharmacy operations.
        </p>
      </div>
      
      <OrdersTable />
    </div>
  );
}
