'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { Product, ProductFilters, productsAPI, ProductSortOption } from '../lib/api';
import { useProducts, useCategories } from '../lib/queries';
import { 
  productFiltersAtom,
  updateFiltersAtom,
  clearFiltersAtom,
  viewModeAtom,
  pricingPreferencesAtom,
  densityAtom,
  setSelectedProductAtom,
  productUIAtom,
  hasActiveFiltersAtom
} from '../lib/store';
import { ProductCard } from './ProductCard';
import { MobileFiltersDialog } from './ProductFilters';
import { ProductSearch } from './ProductSearch';
import { ProductsTable } from './ProductsTable';
import { ProductQuickView } from './ProductQuickView';
import { useProductsURLStateSync } from '../lib/urlState';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  Package,
  Filter,
  Search,
  TrendingUp,
  Grid3X3,
  List,
  X as XIcon,
} from 'lucide-react';

interface ProductCatalogProps {
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export function ProductCatalog({ 
  onAddToCart,
  className 
}: ProductCatalogProps) {
  // Sync Jotai state <-> URL
  useProductsURLStateSync();

  // Use Jotai for state management
  const filters = useAtomValue(productFiltersAtom);
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom);
  const [, updateFilters] = useAtom(updateFiltersAtom);
  const [, clearFilters] = useAtom(clearFiltersAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [density, setDensity] = useAtom(densityAtom);
  const pricingPrefs = useAtomValue(pricingPreferencesAtom);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [ui, setUI] = useAtom(productUIAtom);
  
  // Use TanStack Query for data fetching
  const {
    data: productsData,
    isLoading,
    error
  } = useProducts(filters);
  const { data: categoriesData } = useCategories();
  const topCategories = (categoriesData?.categories ?? [])
    .slice()
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 8);
  const showHero = !hasActiveFilters && !filters.search;

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sortValue: string) => {
    // Persist a sort param the backend can use
    // Example values: 'updated_desc', 'name_asc', 'price_asc', 'price_desc', 'stock_desc'
    updateFilters({ sort: sortValue as ProductSortOption });
  };

  const getSortLabel = (value?: string) => {
    if (!value) return '';
    const map: Record<string, string> = {
      updated_desc: 'Updated (newest)',
      name_asc: 'Name (A-Z)',
      price_asc: 'Price: Low to High',
      price_desc: 'Price: High to Low',
      stock_desc: 'Stock: High to Low',
    };
    return map[value] ?? value;
  };

  const handleClearAll = () => {
    // Reset all filters, including search and sort, and page
    clearFilters();
    updateFilters({
      search: undefined,
      category: undefined,
      min_price: undefined,
      max_price: undefined,
      prescription_only: undefined,
      in_stock_only: undefined,
      sort: undefined,
    });
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
      const rangeWithDots: (number | string)[] = [];
      
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

                if (typeof pageNum !== 'number') return null;

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
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pt-16 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <Badge className="text-xs">NAFDAC Certified</Badge>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
              <p className="text-sm text-foreground/70 mt-1">Manage and browse NAFDAC-approved pharmaceutical products</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-foreground/70">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>{productsData?.pagination?.total ?? 0} Products</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3 text-highlight" />
                <span>Updated daily</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional first-load hero (no search/filters applied) */}
        {showHero && (
          <section className="mx-auto max-w-6xl pt-12 pb-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold">Explore the BenPharm catalog</h2>
              <p className="text-foreground/70">NAFDAC‑approved medicines with real‑time availability and clear pricing.</p>
            </div>
            <div className="mt-6 mx-auto max-w-4xl">
              <ProductSearch className="w-full" autoFocus />
            </div>
            {topCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {topCategories.slice(0, 8).map((cat) => (
                  <Button key={cat.name} variant="outline" size="sm" onClick={() => updateFilters({ category: cat.name })}>
                    {cat.name} ({cat.count})
                  </Button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Toolbar (centered, sticky affordance via surrounding layout) */}
        <section className="mx-auto max-w-6xl">
          <div className="bg-card rounded-lg border border-border p-3 mb-6 sticky top-16 z-30">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              {/* Left: Search (hidden if hero present) + chips */}
              <div className="flex-1 min-w-0">
                {!showHero && <ProductSearch className="max-w-4xl" />}

                {/* Active filter chips */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge status="info" className="text-xs flex items-center gap-1">
                      Search: {filters.search}
                      <button aria-label="Clear search" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ search: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.category && (
                    <Badge status="info" className="text-xs flex items-center gap-1">
                      Category: {filters.category}
                      <button aria-label="Clear category" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ category: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {(filters.min_price !== undefined || filters.max_price !== undefined) && (
                    <Badge status="warning" className="text-xs flex items-center gap-1">
                      Price: {filters.min_price ?? 0} - {filters.max_price ?? '∞'}
                      <button aria-label="Clear price" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ min_price: undefined, max_price: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.prescription_only !== undefined && (
                    <Badge status={filters.prescription_only ? 'error' : 'success'} className="text-xs flex items-center gap-1">
                      {filters.prescription_only ? 'Rx required' : 'OTC'}
                      <button aria-label="Clear prescription" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ prescription_only: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.in_stock_only && (
                    <Badge status="success" className="text-xs flex items-center gap-1">
                      In stock
                      <button aria-label="Clear in-stock" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ in_stock_only: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.sort && (
                    <Badge status="info" className="text-xs flex items-center gap-1">
                      Sort: {getSortLabel(filters.sort)}
                      <button aria-label="Clear sort" className="ml-1 hover:opacity-80" onClick={() => updateFilters({ sort: undefined })}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {(hasActiveFilters || !!filters.sort) && (
                    <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={handleClearAll}>
                      Clear all
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-2">
                {/* Filters trigger opens right sheet (all breakpoints) */}
                <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)}>
                  <Filter className="size-4 mr-1" /> Filters
                </Button>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-md p-0.5 bg-muted">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "px-2 py-1 rounded text-sm",
                      viewMode === 'grid' ? 'bg-card shadow-xs' : 'text-foreground/70 hover:text-foreground'
                    )}
                    title="Grid view"
                  >
                    <Grid3X3 className="size-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-2 py-1 rounded text-sm",
                      viewMode === 'list' ? 'bg-card shadow-xs' : 'text-foreground/70 hover:text-foreground'
                    )}
                    title="List view"
                  >
                    <List className="size-4" />
                  </button>
                </div>

                {/* Density Toggle */}
                <div className="hidden sm:flex items-center rounded-md p-0.5 bg-muted">
                  <button
                    onClick={() => setDensity('comfortable')}
                    className={cn(
                      "px-2 py-1 rounded text-sm",
                      density === 'comfortable' ? 'bg-card shadow-xs' : 'text-foreground/70 hover:text-foreground'
                    )}
                    title="Comfortable density"
                  >
                    C
                  </button>
                  <button
                    onClick={() => setDensity('compact')}
                    className={cn(
                      "px-2 py-1 rounded text-sm",
                      density === 'compact' ? 'bg-card shadow-xs' : 'text-foreground/70 hover:text-foreground'
                    )}
                    title="Compact density"
                  >
                    S
                  </button>
                </div>

                {/* Sort Select */}
                <select
                  value={filters.sort ?? ''}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-2 py-1 text-xs bg-card border border-border rounded-md"
                  aria-label="Sort products"
                >
                  <option value="">Sort</option>
                  <option value="updated_desc">Updated (newest)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="stock_desc">Stock: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Loading / Content (centered) */}
        <section className="mx-auto max-w-6xl">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="relative">
                  <div className="size-16 mx-auto animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                  <Package className="size-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-foreground/70 font-medium">Loading products...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="p-12 text-center border-red-200 dark:border-red-800">
              <div className="text-red-500 dark:text-red-400 mb-4">
                <svg className="size-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Failed to Load Products</h3>
              <p className="text-foreground/70 mb-6">{(error as any)?.message || String(error) || 'Something went wrong while loading products.'}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </Card>
          )}

          {/* Content */}
          {!isLoading && !error && productsData && (
            <>
              {productsData.products.length > 0 ? (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                      {productsData.products.map((product) => (
                        <div key={product.id} onClick={() => setUI({ ...ui, selectedProductId: product.id })}>
                          <ProductCard
                            product={product}
                            showWholesalePrice={pricingPrefs.showWholesalePrice}
                            onAddToCart={onAddToCart}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ProductsTable
                      products={productsData.products}
                      density={density}
                      onRowClick={(p) => setUI({ ...ui, selectedProductId: p.id })}
                    />
                  )}

                  {/* Pagination */}
                  <div className="mt-8">{renderPagination()}</div>
                </>
              ) : (
                <Card className="p-16 text-center border-dashed border-2">
                  <div className="text-foreground/50 mb-6">
                    <Package className="size-20 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">No Products Found</h3>
                  <p className="text-foreground/70 mb-8 max-w-md mx-auto">
                    We couldn't find any products matching your current filters. Try adjusting your search criteria or browse all products.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => clearFilters()}>
                      <Filter className="size-4 mr-2" />
                      Clear Filters
                    </Button>
                    <Button onClick={() => (window.location.href = '/app/search')}>
                      <Search className="size-4 mr-2" />
                      Browse All Products
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      </main>

      {/* Quick View */}
      <ProductQuickView
        product={productsData?.products.find((p) => p.id === ui.selectedProductId) ?? null}
        open={!!ui.selectedProductId}
        onOpenChange={(open) => setUI({ ...ui, selectedProductId: open ? ui.selectedProductId : null })}
      />
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
        const filters: ProductFilters = { 
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
