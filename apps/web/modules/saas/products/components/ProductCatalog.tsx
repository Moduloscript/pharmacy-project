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
import { ProductFilters, MobileFiltersDialog } from './ProductFilters';
import { ProductSearch } from './ProductSearch';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  Package,
  Filter,
  Search,
  ShieldCheck,
  TrendingUp,
  Grid3X3,
  List,
  SlidersHorizontal
} from 'lucide-react';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
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
    const limit = filters.limit || 20;
    const startItem = ((page - 1) * limit) + 1;
    const endItem = Math.min(page * limit, total);

    // Calculate visible page numbers
    const getVisiblePages = () => {
      const delta = 2; // Show 2 pages before and after current page
      const range = [];
      const rangeWithDots = [];
      
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
          range.push(i);
        }
      }

      let prev = 0;
      range.forEach(i => {
        if (prev + 1 !== i) {
          rangeWithDots.push('...');
        }
        rangeWithDots.push(i);
        prev = i;
      });

      return rangeWithDots;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg">
        {/* Mobile pagination */}
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className={`inline-flex items-center px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 ${
              page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pages}
            className={`inline-flex items-center px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 ${
              page >= pages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Next
          </button>
        </div>

        {/* Desktop pagination */}
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{startItem}</span>-<span className="font-medium">{endItem}</span> of <span className="font-medium">{total}</span>
            </p>
          </div>
          <div>
            <nav aria-label="Pagination" className="flex items-center space-x-1">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-muted focus:z-20 focus:outline-offset-0 ${
                  page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeftIcon aria-hidden="true" className="size-5" />
              </button>

              {/* Page numbers */}
              {visiblePages.map((pageNum, index) => {
                if (pageNum === '...') {
                  return (
                    <span
                      key={`dots-${index}`}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border ring-inset focus:outline-offset-0"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrentPage = pageNum === page;
                const isHidden = pageNum > 3 && pageNum < pages - 2 && Math.abs(pageNum - page) > 1;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    aria-current={isCurrentPage ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                      isCurrentPage
                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        : 'text-foreground ring-1 ring-border ring-inset hover:bg-muted'
                    } ${isHidden ? 'hidden md:inline-flex' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next button */}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pages}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-muted focus:z-20 focus:outline-offset-0 ${
                  page >= pages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="sr-only">Next</span>
                <ChevronRightIcon aria-hidden="true" className="size-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile filter dialog */}
      <MobileFiltersDialog open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Compact Page Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pt-16 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs">
                  <ShieldCheck className="size-3 mr-1" />
                  NAFDAC Certified
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Product Catalog
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Browse <span className="font-medium text-green-600 dark:text-green-400">NAFDAC-approved</span> pharmaceutical products
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>1,234 Products</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3 text-orange-500" />
                <span>Daily Updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Main Content Layout */}
        <div className="py-6 lg:grid lg:grid-cols-4 lg:gap-6">
          {/* Compact Filters Sidebar */}
          <aside className="lg:col-span-1">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow-md transition-all lg:hidden w-full mb-4"
            >
              <SlidersHorizontal className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Filters</span>
            </button>
            
            {/* Desktop Filters */}
            <div className="hidden lg:block">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="size-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Filters</h3>
                </div>
                <ProductFilters className="space-y-4" />
              </div>
            </div>
          </aside>

          {/* Compact Products Section */}
          <section aria-labelledby="product-heading" className="lg:col-span-3">
            <h2 id="product-heading" className="sr-only">
              Products
            </h2>
            
            {/* Compact Sort and View Options Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Showing</span>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
                    {productsData?.pagination?.total || 0}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-1 rounded transition-all",
                        viewMode === 'grid' 
                          ? "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400" 
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      )}
                    >
                      <Grid3X3 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-1 rounded transition-all",
                        viewMode === 'list' 
                          ? "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400" 
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      )}
                    >
                      <List className="size-3.5" />
                    </button>
                  </div>
                  
                  {/* Sort Dropdown */}
                  <select
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="stock">In Stock</option>
                  </select>
                </div>
              </div>
            </div>

          {/* Enhanced Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="relative">
                  <div className="size-16 mx-auto animate-spin rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400" />
                  <Package className="size-8 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading pharmaceutical products...</p>
              </div>
            </div>
          )}

          {/* Enhanced Error State */}
          {error && (
            <Card className="p-12 text-center bg-white dark:bg-gray-800 border-red-200 dark:border-red-800">
              <div className="text-red-500 dark:text-red-400 mb-4">
                <svg className="size-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed to Load Products</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error?.message || error || 'Something went wrong while loading products.'}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              >
                Try Again
              </Button>
            </Card>
          )}

          {/* Enhanced Products Grid */}
          {!isLoading && !error && productsData && (
            <>
              {productsData.products.length > 0 ? (
                <>
                  {/* Responsive grid with better spacing */}
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                      : "space-y-4"
                  )}>
                    {productsData.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showWholesalePrice={pricingPrefs.showWholesale}
                        onAddToCart={onAddToCart}
                        className={viewMode === 'list' ? 'max-w-full' : ''}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-8">
                    {renderPagination()}
                  </div>
                </>
              ) : (
                <>
                  {/* Enhanced Empty State */}
                  <Card className="p-16 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-dashed border-2 border-gray-300 dark:border-gray-600">
                    <div className="text-gray-400 dark:text-gray-500 mb-6">
                      <Package className="size-20 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      No Products Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      We couldn't find any products matching your current filters. Try adjusting your search criteria or browse all products.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => clearFilters()}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Filter className="size-4 mr-2" />
                        Clear Filters
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/app/search'}
                        className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                      >
                        <Search className="size-4 mr-2" />
                        Browse All Products
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
          </section>
        </div>
      </main>
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
