import { Metadata } from 'next';
import { CustomersTable } from '@saas/admin/components/CustomersTable';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Customers Management - BenPharm',
  description: 'Manage customer accounts, business verifications, and customer relationships.',
};

export default async function AdminCustomersPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Customers Management</h1>
        <p className="text-gray-600 mt-2">
          Manage customer accounts, verify business registrations, and track customer relationships.
        </p>
      </div>
      
      <CustomersTable />
    </div>
  );
}
