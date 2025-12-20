'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductEditForm } from '@saas/admin/components/ProductEditForm';
import { useSession } from '@saas/auth/hooks/use-session';
import { Loader2 } from 'lucide-react';

// Note: Metadata is handled by layout.tsx for client components

interface PageProps {
  params: Promise<{ id: string }>;
}

// API function for client-side fetching
const fetchProduct = async (id: string) => {
  const response = await fetch(`/api/admin/products/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  return response.json();
};

export default function EditProductPage({ params }: PageProps) {
  const router = useRouter();
  const { user, loaded } = useSession();
  
  // Unwrap params Promise
  const { id } = use(params);
  
  // Client-side data fetching
  const { 
    data: product, 
    isLoading: productLoading, 
    error: productError 
  } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!user && user.role === 'admin',
  });

  // Handle authentication
  useEffect(() => {
    if (loaded && !user) {
      router.push('/auth/login');
      return;
    }
    
    if (loaded && user && user.role !== 'admin') {
      router.push('/app');
      return;
    }
  }, [user, loaded, router]);

  // Handle product not found
  useEffect(() => {
    if (productError && !productLoading) {
      router.push('/app/admin/inventory');
    }
  }, [productError, productLoading, router]);

  // Loading states
  if (!loaded || productLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (productError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The requested product could not be found.</p>
          <button 
            onClick={() => router.push('/app/admin/inventory')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  // Don't render if no session or not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/app/admin/products/${id}`} className="text-primary hover:underline">View</a>
            <a href={`/app/admin/products/${id}/movements`} className="text-primary hover:underline">Movements</a>
          </div>
        </div>
        <p className="text-muted-foreground">
          Update product information, manage stock levels, and handle product images.
        </p>
      </div>
      
      {product && <ProductEditForm product={product} />}
    </div>
  );
}
