import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@saas/auth/lib/server';
import { CustomerDetailView } from '@saas/admin/components/CustomerDetailView';

export const metadata: Metadata = {
  title: 'Customer Detail - BenPharm',
};

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.user?.role !== 'admin') redirect('/app');

  const { id } = await params;

  return <CustomerDetailView customerId={id} />;
}
