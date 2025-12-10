'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ShoppingCartIcon,
  UsersIcon,
  PackageIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  CalendarIcon,
  PhoneIcon,
  CheckCircleIcon,
} from 'lucide-react';

// Types
interface DashboardStats {
  // Revenue
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  
  // Orders
  totalOrders: number;
  dailyOrders: number;
  orderGrowth: number;
  
  // Customers
  totalCustomers: number;
  activeCustomers: number;
  monthlyNewCustomers: number;
  customerRetentionRate: number;
  
  // Products & Inventory
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  
  // Additional metrics
  averageOrderValue: number;
  orderFulfillmentRate: number;
}

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  format?: 'number' | 'currency' | 'percentage';
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'revenue' | 'orders' | 'customers' | 'inventory';
  className?: string;
}

// Individual Stats Card Component
export function StatsCard({
  title,
  value,
  change,
  format = 'number',
  icon,
  description,
  variant = 'default',
  className
}: StatsCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-NG').format(val);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'revenue':
        return 'border-green-200 bg-green-50';
      case 'orders':
        return 'border-blue-200 bg-blue-50';
      case 'customers':
        return 'border-purple-200 bg-purple-50';
      case 'inventory':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'revenue':
        return 'text-green-600';
      case 'orders':
        return 'text-blue-600';
      case 'customers':
        return 'text-purple-600';
      case 'inventory':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={cn('p-6', getVariantStyles(), className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        
        <div className={cn('p-3 rounded-full', getIconColor())}>
          {icon}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center mt-4">
          {change >= 0 ? (
            <TrendingUpIcon className="size-4 text-green-600 mr-1" />
          ) : (
            <TrendingDownIcon className="size-4 text-red-600 mr-1" />
          )}
          <span className={cn(
            'text-sm font-medium',
            change >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {Math.abs(change).toFixed(1)}% vs last period
          </span>
        </div>
      )}
    </Card>
  );
}

// API function
const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch('/api/admin/dashboard/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
};

// Custom hook
const useDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
};

// Main StatsCards Component
interface StatsCardsProps {
  className?: string;
}

export function StatsCards({ className }: StatsCardsProps) {
  const { 
    data: stats, 
    isLoading, 
    error 
  } = useDashboardStats();

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center space-x-3">
          <AlertTriangleIcon className="size-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load stats</h3>
            <p className="text-sm text-red-700 mt-1">
              {error?.message || 'Unable to fetch dashboard statistics'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={stats.totalRevenue}
          change={stats.revenueGrowth}
          format="currency"
          variant="revenue"
          icon={<DollarSignIcon className="size-8" />}
          description={`₦${stats.monthlyRevenue.toLocaleString()} this month`}
        />

        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          change={stats.orderGrowth}
          format="number"
          variant="orders"
          icon={<ShoppingCartIcon className="size-8" />}
          description={`${stats.dailyOrders} orders today`}
        />

        <StatsCard
          title="Active Customers"
          value={stats.activeCustomers}
          format="number"
          variant="customers"
          icon={<UsersIcon className="size-8" />}
          description={`${stats.monthlyNewCustomers} new this month`}
        />

        <StatsCard
          title="Low Stock Items"
          value={stats.lowStockProducts}
          format="number"
          variant="inventory"
          icon={<PackageIcon className="size-8" />}
          description={`${stats.outOfStockProducts} out of stock`}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Average Order Value"
          value={stats.averageOrderValue}
          format="currency"
          icon={<TrendingUpIcon className="size-6" />}
          description="Per order revenue"
        />

        <StatsCard
          title="Customer Retention"
          value={stats.customerRetentionRate}
          format="percentage"
          icon={<CheckCircleIcon className="size-6" />}
          description="Returning customers"
        />

        <StatsCard
          title="Fulfillment Rate"
          value={stats.orderFulfillmentRate}
          format="percentage"
          icon={<PackageIcon className="size-6" />}
          description="Successfully fulfilled"
        />

        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          format="number"
          icon={<PackageIcon className="size-6" />}
          description="In catalog"
        />
      </div>

      {/* Quick Alert Cards */}
      {(stats.lowStockProducts > 0 || stats.outOfStockProducts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.outOfStockProducts > 0 && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center space-x-3">
                <AlertTriangleIcon className="size-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    {stats.outOfStockProducts} Products Out of Stock
                  </h3>
                  <p className="text-sm text-red-700">
                    Immediate restocking required
                  </p>
                </div>
              </div>
            </Card>
          )}

          {stats.lowStockProducts > 0 && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-3">
                <AlertTriangleIcon className="size-6 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    {stats.lowStockProducts} Products Low Stock
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Consider restocking soon
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Export individual components for flexibility
export {
  useDashboardStats,
  type DashboardStats,
  type StatsCardProps,
};
