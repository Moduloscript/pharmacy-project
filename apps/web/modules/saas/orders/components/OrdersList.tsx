'use client';

import { useState, useMemo } from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { cn } from '@ui/lib';
import {
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  PackageIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon
} from 'lucide-react';
import { OrderCard } from './OrderCard';
import { Order, OrderFilters, OrderStatus, PaymentStatus } from '../lib/types';
import { useOrders, useOrderStats } from '../lib/queries';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface OrdersListProps {
  initialFilters?: OrderFilters;
  showCustomerInfo?: boolean;
  compact?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: 'received', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partial', label: 'Partial' },
];

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

export function OrdersList({
  initialFilters,
  showCustomerInfo = false,
  compact = false,
  className,
  title = 'Orders',
  description = 'Manage and track your orders'
}: OrdersListProps) {

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus[]>([]);
  const [dateRange, setDateRange] = useState('30days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Build filters for queries
  const queryFilters = useMemo(() => {
    const filters: OrderFilters = {
      ...initialFilters,
      search: searchTerm || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      paymentStatus: paymentStatusFilter.length > 0 ? paymentStatusFilter : undefined,
    };

    // Handle date range
    if (dateRange !== 'custom') {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          filters.dateFrom = startOfDay(now);
          filters.dateTo = endOfDay(now);
          break;
        case '7days':
          filters.dateFrom = startOfDay(subDays(now, 7));
          filters.dateTo = endOfDay(now);
          break;
        case '30days':
          filters.dateFrom = startOfDay(subDays(now, 30));
          filters.dateTo = endOfDay(now);
          break;
        case '90days':
          filters.dateFrom = startOfDay(subDays(now, 90));
          filters.dateTo = endOfDay(now);
          break;
      }
    } else {
      if (customDateFrom) {
        filters.dateFrom = new Date(customDateFrom);
      }
      if (customDateTo) {
        filters.dateTo = new Date(customDateTo);
      }
    }

    return filters;
  }, [initialFilters, searchTerm, statusFilter, paymentStatusFilter, dateRange, customDateFrom, customDateTo]);

  // Use TanStack Query for orders
  const {
    data: searchResult,
    isLoading,
    error,
    refetch
  } = useOrders(queryFilters, currentPage, pageSize);

  // Use TanStack Query for stats
  const {
    data: stats,
    isLoading: statsLoading
  } = useOrderStats(
    queryFilters.dateFrom,
    queryFilters.dateTo,
    queryFilters.customerId
  );


  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setPaymentStatusFilter([]);
    setDateRange('30days');
    setCustomDateFrom('');
    setCustomDateTo('');
    setCurrentPage(1);
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    // Order updates are handled automatically by TanStack Query mutations
    // No need to manually update state
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleExportOrders = async () => {
    try {
      // Implementation would depend on backend support
      alert('Export functionality would be implemented here');
    } catch (error) {
      alert('Failed to export orders');
    }
  };

  const orders = searchResult?.orders || [];
  const totalPages = searchResult?.totalPages || 0;

  return (
    <div className={cn('space-y-8', className)}>
      {/* Simple Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
              <PackageIcon className="h-8 w-8 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
              <p className="text-slate-600 mt-1 text-lg dark:text-slate-400">{description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg transition-all duration-200 ${showFilters ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <FilterIcon className="size-4 mr-2" strokeWidth={1.5} />
              Filters
            </Button>

            <Button
              variant="outline"
              onClick={handleExportOrders}
              disabled={!orders.length}
              className="rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <DownloadIcon className="size-4 mr-2" strokeWidth={1.5} />
              Export
            </Button>

            <Button 
              onClick={() => refetch()}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all duration-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <RefreshCwIcon className="size-4 mr-2" strokeWidth={1.5} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Simple Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
                  <PackageIcon className="size-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Orders</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalOrders}</p>
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                +12% from last month
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
                  <TrendingUpIcon className="size-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    ₦{stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                +8% from last month
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
                  <TrendingDownIcon className="size-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Order Value</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    ₦{Math.round(stats.averageOrderValue).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                -3% from last month
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
                  <CalendarIcon className="size-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pending Orders</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingOrders}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md dark:text-slate-400 dark:bg-slate-800">
                  Requires attention
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Simple Search and Filters */}
      <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="p-8 space-y-6">
          {/* Simple Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="size-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" strokeWidth={1.5} />
              <Input
                placeholder="Search orders by number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-lg border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 bg-white text-slate-900 placeholder-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="h-12 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all duration-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Search
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Status Filter */}
              <div>
                <Label>Order Status</Label>
                <Select value={statusFilter.length > 0 ? statusFilter.join(',') : 'all'} onValueChange={(value) => {
                  setStatusFilter(value && value !== 'all' ? value.split(',') as OrderStatus[] : []);
                }}>
                  <SelectTrigger className="h-12 rounded-lg bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:ring-slate-400/20 dark:focus:ring-slate-500/20">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <Label>Payment Status</Label>
                <Select value={paymentStatusFilter.length > 0 ? paymentStatusFilter.join(',') : 'all'} onValueChange={(value) => {
                  setPaymentStatusFilter(value && value !== 'all' ? value.split(',') as PaymentStatus[] : []);
                }}>
                  <SelectTrigger className="h-12 rounded-lg bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:ring-slate-400/20 dark:focus:ring-slate-500/20">
                    <SelectValue placeholder="All payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    {paymentStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-12 rounded-lg bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:ring-slate-400/20 dark:focus:ring-slate-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <div>
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCwIcon className="size-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-600">Loading orders...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-3">
            Try Again
          </Button>
        </Card>
      )}

      {/* Orders List */}
      {!isLoading && !error && (
        <>
          {orders.length === 0 ? (
            <Card className="p-12 text-center">
              <PackageIcon className="size-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter.length > 0 || paymentStatusFilter.length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'When customers place orders, they will appear here.'}
              </p>
              {(searchTerm || statusFilter.length > 0 || paymentStatusFilter.length > 0) && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onOrderUpdate={handleOrderUpdate}
                  showCustomerInfo={showCustomerInfo}
                  compact={compact}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, searchResult?.totalCount || 0)} of {searchResult?.totalCount || 0} orders
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeftIcon className="size-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
