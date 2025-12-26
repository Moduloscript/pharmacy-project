import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';
import { CustomerEditView } from '@saas/admin/components/CustomerEditView';
import { AdminPageContainer } from '@saas/admin/components/AdminPageContainer';

interface CustomerEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CustomerEditPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Customer - BenPharm Admin`,
    description: 'Edit customer information and business details.',
  };
}

export default async function CustomerEditPage({
  params,
}: CustomerEditPageProps) {
  const { id } = await params;
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  // Validate the customer ID format (basic check)
  if (!id || id.length < 10) {
    notFound();
  }

  return (
    <AdminPageContainer maxWidth="5xl">
      <CustomerEditView customerId={id} />
    </AdminPageContainer>
  );
}
