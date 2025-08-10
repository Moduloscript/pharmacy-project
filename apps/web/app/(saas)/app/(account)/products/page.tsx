import { Metadata } from 'next';
import { ProductCatalog } from '@saas/products/components/ProductCatalog';

export const metadata: Metadata = {
  title: 'Product Catalog - BenPharm Online',
  description: 'Browse and order Nigerian pharmaceutical products. Wholesale and retail pricing available.',
};

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProductCatalog />
    </div>
  );
}
