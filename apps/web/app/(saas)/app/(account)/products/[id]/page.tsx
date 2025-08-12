import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetails } from '@saas/products/components/ProductDetails';
import { Button } from '@ui/components/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  
  // In a real app, you would fetch the product details here to generate proper metadata
  // For now, we'll use a generic title
  return {
    title: `Product Details - BenPharm Online`,
    description: 'Detailed information about pharmaceutical products available at BenPharm Online.',
  };
}

export default function ProductDetailsPage({ params }: Props) {
  const { id } = params;

  if (!id) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/app/products">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Products
          </Button>
        </Link>
      </div>

      {/* Product Details */}
      <ProductDetails productId={id} />
    </div>
  );
}
