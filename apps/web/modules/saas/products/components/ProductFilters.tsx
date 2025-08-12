'use client';

import React, { Fragment, useState } from 'react';
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
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

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

  // Helper function to get category icons
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'PAIN_RELIEF': '💊',
      'ANTIBIOTICS': '🦠',
      'VITAMINS': '🌟',
      'SKINCARE': '🧴',
      'BABY_CARE': '👶',
      'FIRST_AID': '🩹',
      'OTHER': '📋'
    };
    return iconMap[category] || '💊';
  };

  // Enhanced filter sections with icons and better styling
  const filterSections = [
    {
      id: 'category',
      name: 'Category',
      icon: '🏷️',
      description: 'Filter by product type',
      options: categories.map(cat => ({
        value: cat.name,
        label: cat.name,
        count: cat.count,
        icon: getCategoryIcon(cat.name)
      }))
    },
    {
      id: 'price',
      name: 'Price Range',
      icon: '💰',
      description: 'Select your budget',
      options: [
        { value: 'under-1000', label: 'Under ₦1,000', icon: '🟢', description: 'Budget friendly' },
        { value: '1000-5000', label: '₦1,000 - ₦5,000', icon: '🟡', description: 'Mid-range' },
        { value: '5000-10000', label: '₦5,000 - ₦10,000', icon: '🟠', description: 'Premium' },
        { value: 'over-10000', label: 'Above ₦10,000', icon: '🔴', description: 'High-end' },
      ]
    },
    {
      id: 'prescription',
      name: 'Prescription Type',
      icon: '🏥',
      description: 'Medical requirement',
      options: [
        { value: 'rx-required', label: 'Prescription Required', icon: '🔒', description: 'Requires valid prescription' },
        { value: 'otc', label: 'Over-the-Counter', icon: '🛒', description: 'Available without prescription' },
      ]
    },
    {
      id: 'availability',
      name: 'Stock Status',
      icon: '📦',
      description: 'Product availability',
      options: [
        { value: 'in-stock', label: 'In Stock', icon: '✅', description: 'Ready to ship' },
        { value: 'low-stock', label: 'Low Stock', icon: '⚠️', description: 'Limited quantities' },
      ]
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 w-full justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All Filters
          </Button>
        </div>
      )}
      
      {filterSections.map((section) => (
        <div key={section.name} className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-lg" role="img" aria-label={section.name}>
              {section.icon}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {section.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {section.description}
              </p>
            </div>
          </div>
          
          {/* Filter Options */}
          <div className="space-y-2">
            {section.options.map((option, optionIdx) => {
              const isChecked = 
                section.id === 'category' ? currentFilters.category === option.value :
                section.id === 'price' ? 
                  (option.value === 'under-1000' && currentFilters.max_price === 1000 && !currentFilters.min_price) ||
                  (option.value === '1000-5000' && currentFilters.min_price === 1000 && currentFilters.max_price === 5000) ||
                  (option.value === '5000-10000' && currentFilters.min_price === 5000 && currentFilters.max_price === 10000) ||
                  (option.value === 'over-10000' && currentFilters.min_price === 10000 && !currentFilters.max_price) :
                section.id === 'prescription' ?
                  (option.value === 'rx-required' && currentFilters.prescription_only === true) ||
                  (option.value === 'otc' && currentFilters.prescription_only === false) :
                section.id === 'availability' ?
                  (option.value === 'in-stock' && currentFilters.in_stock_only === true) :
                false;
              
              return (
                <label
                  key={option.value}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    isChecked
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  <div className="flex items-center">
                    <span className="text-sm mr-2" role="img">
                      {option.icon || section.icon}
                    </span>
                    
                    {/* Custom Checkbox */}
                    <div className="relative">
                      <input
                        type="checkbox"
                        id={`${section.id}-${optionIdx}`}
                        checked={isChecked}
                        onChange={(e) => {
                          if (section.id === 'category') {
                            updateFilter('category', e.target.checked ? option.value : undefined);
                          } else if (section.id === 'price') {
                            if (e.target.checked) {
                              switch(option.value) {
                                case 'under-1000':
                                  updateFilter('min_price', undefined);
                                  updateFilter('max_price', 1000);
                                  break;
                                case '1000-5000':
                                  updateFilter('min_price', 1000);
                                  updateFilter('max_price', 5000);
                                  break;
                                case '5000-10000':
                                  updateFilter('min_price', 5000);
                                  updateFilter('max_price', 10000);
                                  break;
                                case 'over-10000':
                                  updateFilter('min_price', 10000);
                                  updateFilter('max_price', undefined);
                                  break;
                              }
                            } else {
                              updateFilter('min_price', undefined);
                              updateFilter('max_price', undefined);
                            }
                          } else if (section.id === 'prescription') {
                            if (option.value === 'rx-required') {
                              updateFilter('prescription_only', e.target.checked ? true : undefined);
                            } else {
                              updateFilter('prescription_only', e.target.checked ? false : undefined);
                            }
                          } else if (section.id === 'availability') {
                            updateFilter('in_stock_only', e.target.checked || undefined);
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                        isChecked
                          ? "bg-blue-500 border-blue-500 dark:bg-blue-400 dark:border-blue-400"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 group-hover:border-blue-300"
                      )}>
                        {isChecked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-medium text-sm",
                        isChecked 
                          ? "text-blue-900 dark:text-blue-100" 
                          : "text-gray-700 dark:text-gray-200"
                      )}>
                        {option.label}
                      </span>
                      {option.count && (
                        <Badge 
                          className={cn(
                            "text-xs",
                            isChecked
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          )}
                        >
                          {option.count}
                        </Badge>
                      )}
                    </div>
                    {option.description && (
                      <p className={cn(
                        "text-xs mt-1",
                        isChecked
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-400"
                      )}>
                        {option.description}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Mobile Filter Dialog for ProductFilters
export function MobileFiltersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [filters, updateFilters] = useAtom(updateFiltersAtom);
  const [, clearFilters] = useAtom(clearFiltersAtom);
  const currentFilters = useAtomValue(productFiltersAtom);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories || [];

  const updateFilter = (key: keyof IProductFilters, value: any) => {
    updateFilters({ [key]: value });
  };

  const filterSections = [
    {
      id: 'category',
      name: 'Category',
      options: categories.map(cat => ({
        value: cat.name,
        label: `${cat.name} (${cat.count})`
      }))
    },
    {
      id: 'price',
      name: 'Price Range',
      options: [
        { value: 'under-1000', label: 'Under ₦1,000' },
        { value: '1000-5000', label: '₦1,000 - ₦5,000' },
        { value: '5000-10000', label: '₦5,000 - ₦10,000' },
        { value: 'over-10000', label: 'Above ₦10,000' },
      ]
    },
    {
      id: 'prescription',
      name: 'Prescription',
      options: [
        { value: 'rx-required', label: 'Prescription Required' },
        { value: 'otc', label: 'Over-the-Counter' },
      ]
    },
    {
      id: 'availability',
      name: 'Availability',
      options: [
        { value: 'in-stock', label: 'In Stock' },
        { value: 'low-stock', label: 'Low Stock' },
      ]
    },
  ];

  return (
    <>
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ease-linear"
            onClick={onClose}
          />
          
          {/* Filter Panel */}
          <div className="fixed inset-0 z-40 flex">
            <div className="relative ml-auto flex size-full max-w-xs transform flex-col overflow-y-auto bg-white py-4 pb-6 shadow-xl transition duration-300 ease-in-out">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-lg font-medium text-gray-900">Filters</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="relative -mr-2 flex size-10 items-center justify-center p-2 text-gray-400 hover:text-gray-500"
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Close menu</span>
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filters */}
              <form className="mt-4">
                {filterSections.map((section) => (
                  <Disclosure key={section.name} as="div" className="border-t border-gray-200 pt-4 pb-4">
                    <fieldset>
                      <legend className="w-full px-2">
                        <DisclosureButton className="group flex w-full items-center justify-between p-2 text-gray-400 hover:text-gray-500">
                          <span className="text-sm font-medium text-gray-900">{section.name}</span>
                          <span className="ml-6 flex h-7 items-center">
                            <ChevronDownIcon
                              aria-hidden="true"
                              className="size-5 rotate-0 transform group-data-open:-rotate-180"
                            />
                          </span>
                        </DisclosureButton>
                      </legend>
                      <DisclosurePanel className="px-4 pt-4 pb-2">
                        <div className="space-y-6">
                          {section.options.map((option, optionIdx) => (
                            <div key={option.value} className="flex gap-3">
                              <div className="flex h-5 shrink-0 items-center">
                                <div className="group grid size-4 grid-cols-1">
                                  <input
                                    defaultValue={option.value}
                                    id={`${section.id}-${optionIdx}-mobile`}
                                    name={`${section.id}[]`}
                                    type="checkbox"
                                    checked={
                                      section.id === 'category' ? currentFilters.category === option.value :
                                      section.id === 'price' ? 
                                        (option.value === 'under-1000' && currentFilters.max_price === 1000 && !currentFilters.min_price) ||
                                        (option.value === '1000-5000' && currentFilters.min_price === 1000 && currentFilters.max_price === 5000) ||
                                        (option.value === '5000-10000' && currentFilters.min_price === 5000 && currentFilters.max_price === 10000) ||
                                        (option.value === 'over-10000' && currentFilters.min_price === 10000 && !currentFilters.max_price) :
                                      section.id === 'prescription' ?
                                        (option.value === 'rx-required' && currentFilters.prescription_only === true) ||
                                        (option.value === 'otc' && currentFilters.prescription_only === false) :
                                      section.id === 'availability' ?
                                        (option.value === 'in-stock' && currentFilters.in_stock_only === true) :
                                      false
                                    }
                                    onChange={(e) => {
                                      if (section.id === 'category') {
                                        updateFilter('category', e.target.checked ? option.value : undefined);
                                      } else if (section.id === 'price') {
                                        if (e.target.checked) {
                                          switch(option.value) {
                                            case 'under-1000':
                                              updateFilter('min_price', undefined);
                                              updateFilter('max_price', 1000);
                                              break;
                                            case '1000-5000':
                                              updateFilter('min_price', 1000);
                                              updateFilter('max_price', 5000);
                                              break;
                                            case '5000-10000':
                                              updateFilter('min_price', 5000);
                                              updateFilter('max_price', 10000);
                                              break;
                                            case 'over-10000':
                                              updateFilter('min_price', 10000);
                                              updateFilter('max_price', undefined);
                                              break;
                                          }
                                        } else {
                                          updateFilter('min_price', undefined);
                                          updateFilter('max_price', undefined);
                                        }
                                      } else if (section.id === 'prescription') {
                                        if (option.value === 'rx-required') {
                                          updateFilter('prescription_only', e.target.checked ? true : undefined);
                                        } else {
                                          updateFilter('prescription_only', e.target.checked ? false : undefined);
                                        }
                                      } else if (section.id === 'availability') {
                                        updateFilter('in_stock_only', e.target.checked || undefined);
                                      }
                                    }}
                                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                                  />
                                  <svg
                                    fill="none"
                                    viewBox="0 0 14 14"
                                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                                  >
                                    <path
                                      d="M3 8L6 11L11 3.5"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="opacity-0 group-has-checked:opacity-100"
                                    />
                                    <path
                                      d="M3 7H11"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="opacity-0 group-has-indeterminate:opacity-100"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <label htmlFor={`${section.id}-${optionIdx}-mobile`} className="text-sm text-gray-500">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </DisclosurePanel>
                    </fieldset>
                  </Disclosure>
                ))}
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Mobile/Compact version with better UX
export function ProductFiltersCompact({ className }: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={cn("w-full justify-between", className)}
      >
        <span className="flex items-center gap-2">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <Badge variant="primary" className="ml-1">
              Active
            </Badge>
          )}
        </span>
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
      
      {/* Mobile Filter Sheet/Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Filter Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-full"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            {/* Filter Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-8rem)] p-4">
              <ProductFilters className="border-0 shadow-none p-0" />
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
