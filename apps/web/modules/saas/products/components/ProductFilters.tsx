'use client';

import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select } from '@ui/components/select';
import { Card } from '@ui/components/card';
import { cn } from '@ui/lib';
import { ProductFilters as IProductFilters } from '../lib/api';
import { useCategories } from '../lib/queries';
import { 
  productFiltersAtom, 
  updateFiltersAtom, 
  clearFiltersAtom,
  hasActiveFiltersAtom 
} from '../lib/store';

interface ProductFiltersProps {
  className?: string;
}

export function ProductFilters({ className }: ProductFiltersProps) {
  // Use Jotai for state management
  const [filters, updateFilters] = useAtom(updateFiltersAtom);
  const [, clearFilters] = useAtom(clearFiltersAtom);
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom);
  const currentFilters = useAtomValue(productFiltersAtom);
  
  // Use TanStack Query for data fetching
  const { data: categoriesData, isLoading } = useCategories();
  const categories = categoriesData?.categories || [];

  const updateFilter = (key: keyof IProductFilters, value: any) => {
    updateFilters({ [key]: value });
  };

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Products</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search by name, brand, or NAFDAC number..."
            value={currentFilters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={currentFilters.category || ''}
            onValueChange={(value) => updateFilter('category', value || undefined)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-4">
          <Label>Price Range (₦)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="number"
                placeholder="Min"
                value={currentFilters.min_price || ''}
                onChange={(e) => updateFilter('min_price', e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                step="50"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max"
                value={currentFilters.max_price || ''}
                onChange={(e) => updateFilter('max_price', e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                step="50"
              />
            </div>
          </div>
        </div>

        {/* Quick Price Filters */}
        <div className="space-y-2">
          <Label>Quick Price Filters</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter('min_price', undefined);
                updateFilter('max_price', 1000);
              }}
              className={cn(
                currentFilters.max_price === 1000 && !currentFilters.min_price 
                  ? 'bg-primary text-primary-foreground' 
                  : ''
              )}
            >
              Under ₦1,000
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter('min_price', 1000);
                updateFilter('max_price', 5000);
              }}
              className={cn(
                currentFilters.min_price === 1000 && currentFilters.max_price === 5000
                  ? 'bg-primary text-primary-foreground' 
                  : ''
              )}
            >
              ₦1,000 - ₦5,000
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter('min_price', 5000);
                updateFilter('max_price', undefined);
              }}
              className={cn(
                currentFilters.min_price === 5000 && !currentFilters.max_price
                  ? 'bg-primary text-primary-foreground' 
                  : ''
              )}
            >
              Above ₦5,000
            </Button>
          </div>
        </div>

        {/* Prescription Filter */}
        <div className="space-y-3">
          <Label>Prescription Requirements</Label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentFilters.prescription_only === true}
                onChange={(e) => 
                  updateFilter('prescription_only', e.target.checked ? true : undefined)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Prescription Required Only</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentFilters.prescription_only === false}
                onChange={(e) => 
                  updateFilter('prescription_only', e.target.checked ? false : undefined)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Over-the-Counter Only</span>
            </label>
          </div>
        </div>

        {/* Stock Availability */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={currentFilters.in_stock_only || false}
              onChange={(e) => updateFilter('in_stock_only', e.target.checked || undefined)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">In Stock Only</span>
          </label>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label>Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {currentFilters.search && (
                <Badge 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => updateFilter('search', undefined)}
                >
                  Search: "{currentFilters.search}" ×
                </Badge>
              )}
              {currentFilters.category && (
                <Badge 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => updateFilter('category', undefined)}
                >
                  {currentFilters.category} ×
                </Badge>
              )}
              {(currentFilters.min_price || currentFilters.max_price) && (
                <Badge 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    updateFilter('min_price', undefined);
                    updateFilter('max_price', undefined);
                  }}
                >
                  ₦{currentFilters.min_price || 0} - ₦{currentFilters.max_price || '∞'} ×
                </Badge>
              )}
              {currentFilters.prescription_only !== undefined && (
                <Badge 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => updateFilter('prescription_only', undefined)}
                >
                  {currentFilters.prescription_only ? 'Prescription' : 'OTC'} ×
                </Badge>
              )}
              {currentFilters.in_stock_only && (
                <Badge 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => updateFilter('in_stock_only', undefined)}
                >
                  In Stock ×
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Mobile/Compact version
export function ProductFiltersCompact({ className }: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        Filters
        <span className="ml-2">
          {isOpen ? '−' : '+'}
        </span>
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-10 mt-2">
          <ProductFilters className={className} />
        </div>
      )}
    </div>
  );
}
