import { Metadata } from 'next';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';
import { ProductCreateForm } from '@saas/admin/components/ProductCreateForm';
import { AdminPageContainer } from '@saas/admin/components/AdminPageContainer';

export const metadata: Metadata = {
  title: 'Create New Product - BenPharm Admin',
  description: 'Add a new product to the inventory with detailed information and images.',
};

export default async function CreateProductPage() {
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <AdminPageContainer maxWidth="5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
        <p className="text-gray-600 mt-2">
          Add a new product to your pharmacy inventory with complete details and images.
        </p>
      </div>
      
      <ProductCreateForm />
    </AdminPageContainer>
  );
}
