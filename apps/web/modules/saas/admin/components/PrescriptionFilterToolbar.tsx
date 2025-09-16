'use client';

import { useState, useEffect } from 'react';
import { Input } from '@ui/components/input';
import { Button } from '@ui/components/button';
import { cn } from '@ui/lib';
import { Search, X, Calendar, FileText } from 'lucide-react';
import type { PrescriptionStatus } from '../lib/prescriptions';

interface PrescriptionFilterToolbarProps {
  status: PrescriptionStatus;
  onStatusChange: (status: PrescriptionStatus) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  hasFile?: boolean;
  onHasFileChange?: (v: boolean) => void;
  startDate?: string | null;
  endDate?: string | null;
  onDateRangeChange?: (range: { startDate: string | null; endDate: string | null }) => void;
  totalCounts?: {
    pending: number;
    clarification: number;
    approved: number;
    rejected: number;
  };
}

const statusTabs: { value: PrescriptionStatus; label: string }[] = [
  { value: 'PENDING_VERIFICATION', label: 'Pending' },
  { value: 'NEEDS_CLARIFICATION', label: 'Clarification' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function PrescriptionFilterToolbar({ 
  status, 
  onStatusChange, 
  search,
  onSearchChange,
  hasFile = false,
  onHasFileChange,
  startDate = null,
  endDate = null,
  onDateRangeChange,
  totalCounts 
}: PrescriptionFilterToolbarProps) {
  const [searchValue, setSearchValue] = useState(search ?? '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [localStart, setLocalStart] = useState<string | ''>(startDate ?? '');
  const [localEnd, setLocalEnd] = useState<string | ''>(endDate ?? '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handleClearSearch = () => {
    setSearchValue('');
    onSearchChange?.('');
  };

  const handleApplyDates = () => {
    onDateRangeChange?.({ startDate: localStart || null, endDate: localEnd || null });
  };

  const handleClearDates = () => {
    setLocalStart('');
    setLocalEnd('');
    onDateRangeChange?.({ startDate: null, endDate: null });
  };

  return (
    <div className="space-y-4 rounded-lg border p-4" style={{ 
      backgroundColor: 'var(--rx-surface)', 
      borderColor: 'var(--rx-border)' 
    }}>
      {/* Search and filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search by order #, customer name, or email..."
            className={cn(
              "pl-10 pr-10",
              "bg-transparent border",
              "focus:ring-2 focus:ring-blue-500/20",
              "placeholder:text-gray-500"
            )}
            style={{ 
              borderColor: isSearchFocused ? 'var(--rx-accent)' : 'var(--rx-border)',
              color: 'var(--rx-text)'
            }}
          />
          {searchValue && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Additional filters placeholder */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowDates(v => !v)}>
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
          <Button
            variant={hasFile ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => onHasFileChange?.(!hasFile)}
            aria-pressed={hasFile}
          >
            <FileText className="h-4 w-4" />
            Has File
          </Button>
        </div>
      </div>

      {/* Optional date inputs */}
      {showDates && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--rx-muted)' }}>From</label>
            <Input type="date" value={localStart} onChange={(e) => setLocalStart(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--rx-muted)' }}>To</label>
            <Input type="date" value={localEnd} onChange={(e) => setLocalEnd(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApplyDates}>Apply</Button>
            <Button size="sm" variant="outline" onClick={handleClearDates}>Clear</Button>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--rx-elevated)' }}>
        {statusTabs.map((tab) => {
          const isActive = status === tab.value;
          const count = totalCounts ? {
            'PENDING_VERIFICATION': totalCounts.pending,
            'NEEDS_CLARIFICATION': totalCounts.clarification,
            'APPROVED': totalCounts.approved,
            'REJECTED': totalCounts.rejected,
          }[tab.value] : undefined;

          return (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                isActive 
                  ? "shadow-sm" 
                  : "hover:text-opacity-80"
              )}
              style={{
                backgroundColor: isActive ? 'var(--rx-surface)' : 'transparent',
                color: isActive ? 'var(--rx-text)' : 'var(--rx-muted)',
                borderColor: isActive ? 'var(--rx-border)' : 'transparent',
                border: '1px solid',
              }}
            >
              {tab.label}
              {count !== undefined && (
                <span className={cn(
                  "ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full",
                  isActive ? "opacity-100" : "opacity-60"
                )} style={{
                  backgroundColor: isActive ? 'var(--rx-accent)' : 'var(--rx-elevated)',
                  color: isActive ? 'white' : 'var(--rx-muted)',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}