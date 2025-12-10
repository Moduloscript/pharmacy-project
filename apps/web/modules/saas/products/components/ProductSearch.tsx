'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom, useAtomValue } from 'jotai';
import { Input } from '@ui/components/input';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Card } from '@ui/components/card';
import { cn } from '@ui/lib';
import { Product } from '../lib/api';
import { useSearchProducts } from '../lib/queries';
import { searchQueryAtom, setSearchFocusAtom } from '../lib/store';
import { useDebounceValue } from 'usehooks-ts';

interface ProductSearchProps {
  onProductSelect?: (product: Product) => void;
  placeholder?: string;
  className?: string;
  showResults?: boolean;
  autoFocus?: boolean;
}

function BulkTiersInline({ productId }: { productId: string }) {
  const [tooltip, setTooltip] = React.useState('');
  const [fetched, setFetched] = React.useState(false);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onMouseEnter={async () => {
              if (fetched) return;
              try {
                const res = await fetch(`/api/products/${productId}/bulk-pricing`);
                const data = await res.json();
                if (Array.isArray(data?.rules)) {
                  const s = data.rules
                    .slice()
                    .sort((a: any, b: any) => a.minQty - b.minQty)
                    .map((r: any) => `${r.minQty}+ → ${r.unitPrice ? `₦${Number(r.unitPrice).toLocaleString()}/u` : `${r.discountPercent}% off`}`)
                    .join(' | ');
                  setTooltip(s);
                }
              } catch {}
              setFetched(true);
            }}
          >
            Bulk tiers
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-words">
          {tooltip || 'No tiers found'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProductSearch({ 
  onProductSelect,
  placeholder = "Search medicines, brands, or NAFDAC numbers...",
  className,
  showResults = true,
  autoFocus = false
}: ProductSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [, setSearchFocus] = useAtom(setSearchFocusAtom);
  
  // Debounce the search query
  const [debouncedQuery] = useDebounceValue(query, 300);
  
  // Use TanStack Query for search
  const { 
    data: searchResults, 
    isLoading, 
    error 
  } = useSearchProducts(debouncedQuery, 8);
  
  const results = searchResults?.products || [];
  
  // Show dropdown when we have a query and results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-search-dropdown]')) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductClick = (product: Product) => {
    setQuery(product.name);
    setShowDropdown(false);
    
    if (onProductSelect) {
      onProductSelect(product);
    } else {
      router.push(`/app/products/${product.id}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setShowDropdown(false);
    router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
  };

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={cn('relative', className)} data-search-dropdown>
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          className="w-full pr-10"
        />
        
        {/* Search Button */}
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3"
          disabled={!query.trim()}
        >
          {isLoading ? (
            <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </Button>
      </form>

      {/* Search Results Dropdown */}
      {showResults && showDropdown && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-red-600">
              {error?.message || (typeof error === 'string' ? error : null) || 'Search failed. Please try again.'}
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y">
              {results.map((product) => (
                <div
                  key={product.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Product Image */}
                      <div className="size-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <div className="size-6 rounded-full bg-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {highlightMatch(product.name, query)}
                        </h4>
                        
                        {product.generic_name && (
                          <p className="text-sm text-gray-600 truncate">
                            Generic: {highlightMatch(product.generic_name, query)}
                          </p>
                        )}
                        
                        {product.brand_name && (
                          <p className="text-sm text-gray-600 truncate">
                            Brand: {highlightMatch(product.brand_name, query)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          
                          {product.nafdac_reg_number && query.toLowerCase().includes(product.nafdac_reg_number.toLowerCase()) && (
                            <Badge variant="secondary" className="text-xs">
                              NAFDAC: {highlightMatch(product.nafdac_reg_number, query)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Price and Stock */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₦{product.retail_price.toLocaleString('en-NG')}
                        </p>
                        <p className={cn(
                          'text-xs',
                          product.stock_quantity > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        )}>
                          {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </p>
                        <div className="mt-1">
                          {(product as any)._count?.bulkPriceRules > 0 || (product as any).hasBulkRules ? (
                            <BulkTiersInline productId={product.id} />
                          ) : null
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* View All Results */}
              <div className="p-4 border-t bg-gray-50">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => {
                    setShowDropdown(false);
                    router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  View all results for "{query}"
                </Button>
              </div>
            </div>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-gray-600">
              No products found for "{query}"
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

// Simplified search bar for navigation
export function ProductSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Input
        type="text"
        placeholder="Search medicines..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pr-10"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full px-3"
        disabled={!query.trim()}
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Button>
    </form>
  );
}

// Quick search suggestions
interface QuickSearchProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function QuickSearch({ onSearch, className }: QuickSearchProps) {
  const popularSearches = [
    'Paracetamol',
    'Amoxicillin',
    'Vitamin C',
    'Malaria drugs',
    'Cough syrup',
    'Blood pressure',
    'Diabetes',
    'Antibiotics'
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-medium text-gray-700">Popular Searches</h4>
      <div className="flex flex-wrap gap-2">
        {popularSearches.map((search) => (
          <Button
            key={search}
            variant="outline"
            size="sm"
            onClick={() => onSearch(search)}
            className="text-xs"
          >
            {search}
          </Button>
        ))}
      </div>
    </div>
  );
}
