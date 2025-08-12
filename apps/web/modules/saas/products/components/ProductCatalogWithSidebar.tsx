'use client';

import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { cn } from '@ui/lib';
import { Product } from '../lib/api';
import { useProducts } from '../lib/queries';
import { 
  productFiltersAtom,
  updateFiltersAtom,
  clearFiltersAtom,
  pricingPreferencesAtom
} from '../lib/store';
import { ProductCardTailwind } from './ProductCardTailwind';
import { ProductFilters, MobileFiltersDialog } from './ProductFilters';
import { PlusIcon } from '@heroicons/react/20/solid';

interface ProductCatalogWithSidebarProps {
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export function ProductCatalogWithSidebar({ 
  onAddToCart,
  className 
}: ProductCatalogWithSidebarProps) {
  const filters = useAtomValue(productFiltersAtom);
  const [, updateFilters] = useAtom(updateFiltersAtom);
  const [, clearFilters] = useAtom(clearFiltersAtom);
  const pricingPrefs = useAtomValue(pricingPreferencesAtom);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const {
    data: productsData,
    isLoading,
    error
  } = useProducts(filters);

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (!productsData?.pagination) return null;

    const { page, pages, total } = productsData.pagination;
    const maxPages = Math.min(pages, 10);
    const startPage = Math.max(1, page - 4);
    const endPage = Math.min(pages, startPage + maxPages - 1);

    return (
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="text-sm text-gray-600">
          Showing {((page - 1) * (filters.limit || 20)) + 1} to {Math.min(page * (filters.limit || 20), total)} of {total} products
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const pageNumber = startPage + i;
            return (
              <Button
                key={pageNumber}
                variant={page === pageNumber ? "primary" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Mobile filter dialog */}
      <MobileFiltersDialog open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} />

      <div className="mx-auto max-w-2xl px-4 lg:max-w-7xl lg:px-8">
        {/* Page Header */}
        <div className="border-b border-gray-200 pt-24 pb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Product Catalog
          </h1>
          <p className="mt-4 text-base text-gray-500">
            Browse our collection of NAFDAC-approved pharmaceutical products
          </p>
        </div>

        {/* Main Content with Sidebar */}
        <div className="pt-12 pb-24 lg:grid lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-4">
          {/* Filters Sidebar */}
          <aside>
            <h2 className="sr-only">Filters</h2>
            
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center lg:hidden"
            >
              <span className="text-sm font-medium text-gray-700">Filters</span>
              <PlusIcon aria-hidden="true" className="ml-1 size-5 shrink-0 text-gray-400" />
            </button>
            
            {/* Desktop Filters */}
            <div className="hidden lg:block">
              <ProductFilters className="divide-y divide-gray-200" />
            </div>
          </aside>

          {/* Products Section */}
          <section aria-labelledby="product-heading" className="mt-6 lg:col-span-2 lg:mt-0 xl:col-span-3">
            <h2 id="product-heading" className="sr-only">
              Products
            </h2>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="size-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-2 text-gray-600">Loading products...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-8 text-center">
                <div className="text-red-600 mb-4">
                  <svg className="size-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Products</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </Card>
            )}

            {/* Products Grid with exact template binding */}
            {!isLoading && !error && productsData && (
              <>
                {productsData.products.length > 0 ? (
                  <>
                    <div className="-mx-px grid grid-cols-2 border-l border-gray-200 sm:mx-0 md:grid-cols-2 lg:grid-cols-3">
                      {productsData.products.map((product) => (
                        <ProductCardTailwind
                          key={product.id}
                          product={product}
                          showWholesalePrice={pricingPrefs.showWholesale}
                          onAddToCart={onAddToCart}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  /* Empty State */
                  <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="size-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293L16 14H8l-2.707-1.707A1 1 0 004.586 13H2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
                    <p className="text-gray-600 mb-6">
                      We couldn't find any products matching your current filters.
                    </p>
                    <div className="space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => clearFilters()}
                      >
                        Clear Filters
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => window.location.href = '/app/products'}
                      >
                        Browse All Products
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </section>
        </div>

        {/* Pagination - Outside the grid */}
        {productsData && productsData.products.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-8">
            {renderPagination()}
          </div>
        )}
      </div>
    </div>
  );
}
