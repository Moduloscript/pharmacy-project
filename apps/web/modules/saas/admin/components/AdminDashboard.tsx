'use client';

import { useState, useEffect } from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { cn } from '@ui/lib';
import {
  LayoutDashboard as DashboardIcon,
  RefreshCwIcon,
  SettingsIcon,
  BellIcon,
  UsersIcon,
  PackageIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon
} from 'lucide-react';

import { 
  useDashboardMetrics,
  useRevenueAnalytics,
  useTopProducts,
  useInventoryAlerts,
  useSystemHealth,
  useDashboardFilters,
  useRealtimeUpdates,
  useAdminCache
} from '../lib/queries';

import { 
  MetricsCard, 
  RevenueCard, 
  OrdersCard, 
  CustomersCard, 
  InventoryCard 
} from './MetricsCard';

import { AdminUtils } from '../lib/api';
import { DashboardFilters } from '../lib/types';
import Link from 'next/link';

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const { 
    filters, 
    updateFilter, 
    resetFilters, 
    getDateRange 
  } = useDashboardFilters();

  const [showFilters, setShowFilters] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Dashboard queries with filters
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError
  } = useDashboardMetrics(filters);

  const {
    data: revenueData,
    isLoading: revenueLoading
  } = useRevenueAnalytics(filters);

  const {
    data: topProducts,
    isLoading: productsLoading
  } = useTopProducts(5, filters);

  const {
    data: inventoryAlerts,
    isLoading: alertsLoading
  } = useInventoryAlerts();

  const {
    data: systemHealth,
    isLoading: healthLoading
  } = useSystemHealth();

  // Cache management and real-time updates
  const { refreshDashboard } = useAdminCache();
  const { enableRealtimeUpdates } = useRealtimeUpdates();

  // Handle real-time updates
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (realtimeEnabled) {
      cleanup = enableRealtimeUpdates();
    }

    return cleanup;
  }, [realtimeEnabled, enableRealtimeUpdates]);

  const handleRefresh = () => {
    refreshDashboard();
  };

  const handleExportData = () => {
    // Implementation would depend on backend support
    alert('Export functionality would generate Excel/PDF reports');
  };

  const isLoading = metricsLoading || revenueLoading || productsLoading;

  const dateRange = getDateRange();
  const criticalAlerts = inventoryAlerts?.filter(alert => alert.severity === 'critical') || [];
  const unreadAlerts = inventoryAlerts?.filter(alert => alert.type === 'out_of_stock') || [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-xl font-bold text-gray-900 lg:text-3xl">
            <DashboardIcon className="mr-3 size-6 lg:size-8" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of BenPharm operations • {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Real-time toggle */}
          <Button
            variant={realtimeEnabled ? "primary" : "outline"}
            size="sm"
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={realtimeEnabled ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <div className={cn(
              "size-2 rounded-full mr-2",
              realtimeEnabled ? "bg-green-300 animate-pulse" : "bg-gray-400"
            )} />
            {realtimeEnabled ? 'Live' : 'Static'}
          </Button>

          {/* Notifications */}
          <Button variant="outline" size="sm" className="relative">
            <BellIcon className="size-4 mr-2" />
            Alerts
            {criticalAlerts.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs"
              >
                {criticalAlerts.length}
              </Badge>
            )}
          </Button>

          {/* Filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon className="size-4 mr-2" />
            Filters
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <DownloadIcon className="size-4 mr-2" />
            Export
          </Button>

          {/* Refresh */}
          <Button onClick={handleRefresh} size="sm">
            <RefreshCwIcon className="size-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Time Period</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => updateFilter('dateRange', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Customer Type</Label>
              <Select
                value={filters.customerType}
                onValueChange={(value) => updateFilter('customerType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="retail">Retail Only</SelectItem>
                  <SelectItem value="wholesale">Wholesale Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => updateFilter('category', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="pain_relief">Pain Relief</SelectItem>
                  <SelectItem value="antibiotics">Antibiotics</SelectItem>
                  <SelectItem value="vitamins">Vitamins</SelectItem>
                  <SelectItem value="first_aid">First Aid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.customDateFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('customDateFrom', new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.customDateTo?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('customDateTo', new Date(e.target.value))}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Error State */}
      {metricsError && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <XCircleIcon className="size-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Failed to load dashboard data</h3>
              <p className="text-sm text-red-700 mt-1">{metricsError.message}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-3" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangleIcon className="size-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Critical Alerts</h3>
                <p className="text-sm text-red-700">
                  {criticalAlerts.length} critical issues require immediate attention
                </p>
              </div>
            </div>
            <Link href="/app/admin/inventory/alerts">
              <Button size="sm" variant="error">
                View All Alerts
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RevenueCard
          title="Total Revenue"
          value={metrics?.totalRevenue || 0}
          growth={metrics?.revenueGrowth}
          icon={<TrendingUpIcon className="size-6" />}
          description={`₦${(metrics?.monthlyRevenue || 0).toLocaleString()} this month`}
          isLoading={isLoading}
        />

        <OrdersCard
          title="Total Orders"
          value={metrics?.totalOrders || 0}
          growth={metrics?.orderGrowth}
          icon={<ShoppingCartIcon className="size-6" />}
          description={`${metrics?.dailyOrders || 0} orders today`}
          isLoading={isLoading}
        />

        <CustomersCard
          title="Active Customers"
          value={metrics?.activeCustomers || 0}
          icon={<UsersIcon className="size-6" />}
          description={`${metrics?.monthlyNewCustomers || 0} new this month`}
          isLoading={isLoading}
        />

        <InventoryCard
          title="Low Stock Items"
          value={metrics?.lowStockProducts || 0}
          icon={<PackageIcon className="size-6" />}
          description={`${metrics?.outOfStockProducts || 0} out of stock`}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricsCard
          title="Average Order Value"
          value={metrics?.averageOrderValue || 0}
          format="currency"
          icon={<TrendingUpIcon className="size-5" />}
          isLoading={isLoading}
        />

        <MetricsCard
          title="Customer Retention"
          value={metrics?.customerRetentionRate || 0}
          format="percentage"
          icon={<CheckCircleIcon className="size-5" />}
          variant="customers"
          isLoading={isLoading}
        />

        <MetricsCard
          title="Fulfillment Rate"
          value={metrics?.orderFulfillmentRate || 0}
          format="percentage"
          icon={<PackageIcon className="size-5" />}
          variant="orders"
          isLoading={isLoading}
        />
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <Button variant="outline" size="sm">
              <EyeIcon className="size-4 mr-2" />
              View Details
            </Button>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUpIcon className="size-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Revenue chart will be displayed here</p>
              <p className="text-sm text-gray-500 mt-1">
                {revenueLoading ? 'Loading data...' : `${revenueData?.length || 0} data points`}
              </p>
            </div>
          </div>
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
            <Link href="/app/admin/products">
              <Button variant="outline" size="sm">
                View All Products
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {productsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="size-10 bg-gray-300 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
              ))
            ) : topProducts?.length ? (
              topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="size-10 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.totalSold} sold</p>
                    <p className="text-sm text-gray-600">{AdminUtils.formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <PackageIcon className="size-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No product data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* System Health */}
      {systemHealth && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Database</span>
              <Badge className={AdminUtils.getStatusColor(systemHealth.database.status)}>
                {systemHealth.database.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">API</span>
              <Badge className={AdminUtils.getStatusColor(systemHealth.api.status)}>
                {systemHealth.api.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Payments</span>
              <Badge className={AdminUtils.getStatusColor(systemHealth.payments.flutterwave)}>
                Flutterwave: {systemHealth.payments.flutterwave}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Notifications</span>
              <Badge className={AdminUtils.getStatusColor(systemHealth.notifications.whatsapp)}>
                WhatsApp: {systemHealth.notifications.whatsapp}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Last updated: {systemHealth.lastUpdated.toLocaleString()}
          </p>
        </Card>
      )}
    </div>
  );
}
