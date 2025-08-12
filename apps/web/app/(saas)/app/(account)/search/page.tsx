'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCatalog } from '@saas/products/components/ProductCatalog';
import { ProductSearch } from '@saas/products/components/ProductSearch';
import { Card } from '@ui/components/card';
import { useAtom } from 'jotai';
import { updateFiltersAtom } from '@saas/products/lib/store';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [, updateFilters] = useAtom(updateFiltersAtom);
  
  // Get query parameter from URL
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      // Update the search filters when component mounts with a query
      updateFilters({ search: query, page: 1 });
    }
  }, [query, updateFilters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Search Products
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find the pharmaceutical products you need from our extensive catalog of 
            Nigerian medicines, medical supplies, and health products.
          </p>
        </div>

        {/* Featured Search Bar */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <ProductSearch 
              placeholder="Search by medicine name, brand, NAFDAC number..."
              showResults={false}
              className="w-full"
            />
            
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => updateFilters({ search: 'paracetamol', page: 1 })}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Paracetamol
                </button>
                <button 
                  onClick={() => updateFilters({ search: 'amoxicillin', page: 1 })}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Amoxicillin
                </button>
                <button 
                  onClick={() => updateFilters({ search: 'vitamins', page: 1 })}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Vitamins
                </button>
                <button 
                  onClick={() => updateFilters({ search: 'hypertension', page: 1 })}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Hypertension
                </button>
                <button 
                  onClick={() => updateFilters({ search: 'diabetes', page: 1 })}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Diabetes
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Results */}
        <div>
          {query && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Search results for "{query}"
              </h2>
            </div>
          )}
          
          <ProductCatalog />
        </div>

        {/* Help Section */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Search Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Find by Product Name</h4>
              <p>Search using brand names or generic names (e.g., "Panadol" or "Paracetamol")</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search by NAFDAC Number</h4>
              <p>Use official registration numbers for precise product identification</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search by Category</h4>
              <p>Use terms like "antibiotics", "vitamins", "painkillers" to find product groups</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search by Condition</h4>
              <p>Search for conditions like "diabetes", "hypertension", "malaria" to find relevant medications</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
