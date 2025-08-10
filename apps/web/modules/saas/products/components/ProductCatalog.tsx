'use client';

import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Select } from '@ui/components/select';
import { cn } from '@ui/lib';
import { Product, IProductFilters, productsAPI } from '../lib/api';
import { useProducts } from '../lib/queries';
import { 
  productFiltersAtom,
  updateFiltersAtom,
  clearFiltersAtom,
  viewModeAtom,
  pricingPreferencesAtom
} from '../lib/store';
import { ProductCard } from './ProductCard';
import { ProductFilters, ProductFiltersCompact } from './ProductFilters';
import { ProductSearch } from './ProductSearch';

interface ProductCatalogProps {
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export function ProductCatalog({ 
  onAddToCart,
  className 
}: ProductCatalogProps) {
  // Use Jotai for state management
  const filters = useAtomValue(productFiltersAtom);
  const [, updateFilters] = useAtom(updateFiltersAtom);
  const [, clearFilters] = useAtom(clearFiltersAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const pricingPrefs = useAtomValue(pricingPreferencesAtom);
  
  // Use TanStack Query for data fetching
  const {
    data: productsData,
    isLoading,
    error
  } = useProducts(filters);

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sortValue: string) => {
    switch (sortValue) {
      case 'name-asc':
        // Default sort, clear other filters
        updateFilters({ 
          min_price: undefined, 
          max_price: undefined, 
          in_stock_only: undefined 
        });
        break;
      case 'price-low':
        updateFilters({ min_price: undefined });
        break;
      case 'price-high':
        updateFilters({ max_price: undefined });
        break;
      case 'newest':
        // Backend handles this
        break;
      case 'stock':
        updateFilters({ in_stock_only: true });
        break;
    }
  };

  const renderPagination = () => {
    if (!productsData?.pagination) return null;

    const { page, pages, total } = productsData.pagination;
    const maxPages = Math.min(pages, 10); // Show max 10 page buttons
    const startPage = Math.max(1, page - 4);
    const endPage = Math.min(pages, startPage + maxPages - 1);

    return (
      <div className="flex items-center justify-between">
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
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pricingPrefs.showWholesale ? 'Wholesale Catalog' : 'Product Catalog'}
          </h1>
          <p className="text-gray-600">
            Discover and order Nigerian pharmaceutical products
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="lg:w-96">
          <ProductSearch 
            placeholder="Search medicines, brands, NAFDAC numbers..."
            showResults={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          {/* Mobile Filters */}
          <div className="lg:hidden mb-4">
            <ProductFiltersCompact />
          </div>
          
          {/* Desktop Filters */}
          <div className="hidden lg:block">
            <ProductFilters />
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Results Count */}
              {productsData && (
                <p className="text-sm text-gray-600">
                  {productsData.pagination.total} products found
                </p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort Options */}
              <Select
                value=""
                onValueChange={handleSortChange}
              >
                <option value="">Sort by</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="newest">Newest First</option>
                <option value="stock">In Stock</option>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

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

          {/* Products Grid/List */}
          {!isLoading && !error && productsData && (
            <>
              {productsData.products.length > 0 ? (
                <>
                  <div className={cn(
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6' 
                      : 'space-y-4'
                  )}>
                    {productsData.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                        className={viewMode === 'list' ? 'flex-row' : ''}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-8">
                    {renderPagination()}
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
                      onClick={() => window.location.href = '/app/search'}
                    >
                      Browse All Products
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified version for embedding in other components
export function ProductCatalogSimple({ 
  category, 
  limit = 8,
  showWholesalePrice = false,
  onAddToCart,
  className 
}: {
  category?: string;
  limit?: number;
  showWholesalePrice?: boolean;
  onAddToCart?: (product: Product) => void;
  className?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const filters: IProductFilters = { 
          limit,
          in_stock_only: true
        };
        
        if (category) {
          filters.category = category;
        }
        
        const response = await productsAPI.getProducts(filters);
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, [category, limit]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showWholesalePrice={showWholesalePrice}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
