'use client';

import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  MinusIcon,
  LoaderIcon 
} from 'lucide-react';
import { AdminUtils } from '../lib/api';

interface MetricsCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  growth?: number;
  format?: 'currency' | 'number' | 'percentage';
  icon?: React.ReactNode;
  description?: string;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'revenue' | 'orders' | 'customers' | 'inventory';
}

export function MetricsCard({
  title,
  value,
  previousValue,
  growth,
  format = 'number',
  icon,
  description,
  isLoading = false,
  className,
  variant = 'default'
}: MetricsCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return AdminUtils.formatCurrency(val);
      case 'percentage':
        return AdminUtils.formatPercentage(val);
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getGrowthInfo = () => {
    if (growth === undefined) return null;
    
    const growthInfo = AdminUtils.getGrowthIndicator(growth);
    return {
      ...growthInfo,
      icon: growthInfo.icon === 'up' 
        ? TrendingUpIcon 
        : growthInfo.icon === 'down' 
        ? TrendingDownIcon 
        : MinusIcon
    };
  };

  const growthInfo = getGrowthInfo();

  const getVariantStyles = () => {
    const styles = {
      default: 'border-gray-200',
      revenue: 'border-green-200 bg-green-50/30',
      orders: 'border-blue-200 bg-blue-50/30',
      customers: 'border-purple-200 bg-purple-50/30',
      inventory: 'border-orange-200 bg-orange-50/30'
    };
    return styles[variant];
  };

  const getIconColor = () => {
    const colors = {
      default: 'text-gray-600',
      revenue: 'text-green-600',
      orders: 'text-blue-600',
      customers: 'text-purple-600',
      inventory: 'text-orange-600'
    };
    return colors[variant];
  };

  if (isLoading) {
    return (
      <Card className={cn('p-6', getVariantStyles(), className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={cn('flex items-center justify-center size-12 rounded-lg bg-gray-100', getIconColor())}>
                {icon}
              </div>
            )}
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
              <div className="h-6 bg-gray-300 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          <LoaderIcon className="size-5 text-gray-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6 transition-all hover:shadow-md', getVariantStyles(), className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {icon && (
            <div className={cn(
              'flex items-center justify-center size-12 rounded-lg',
              variant === 'default' ? 'bg-gray-100' : 'bg-white/60',
              getIconColor()
            )}>
              {icon}
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(value)}
              </p>
              
              {growthInfo && (
                <div className="flex items-center space-x-1">
                  <growthInfo.icon className={cn('size-4', growthInfo.color)} />
                  <span className={cn('text-sm font-medium', growthInfo.color)}>
                    {growthInfo.text}
                  </span>
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>

        {previousValue !== undefined && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Previous</p>
            <p className="text-sm font-medium text-gray-700">
              {formatValue(previousValue)}
            </p>
          </div>
        )}
      </div>

      {/* Additional stats or badges */}
      {variant === 'inventory' && typeof value === 'number' && value < 10 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Badge variant="destructive" className="text-xs">
            Low Stock Alert
          </Badge>
        </div>
      )}

      {variant === 'orders' && growth !== undefined && growth > 20 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Badge className="text-xs bg-blue-100 text-blue-800">
            High Growth Period
          </Badge>
        </div>
      )}

      {variant === 'revenue' && growth !== undefined && growth > 15 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Badge className="text-xs bg-green-100 text-green-800">
            Exceeding Target
          </Badge>
        </div>
      )}
    </Card>
  );
}

// Pre-configured metric card variants for common use cases
export function RevenueCard(props: Omit<MetricsCardProps, 'variant' | 'format'>) {
  return <MetricsCard {...props} variant="revenue" format="currency" />;
}

export function OrdersCard(props: Omit<MetricsCardProps, 'variant' | 'format'>) {
  return <MetricsCard {...props} variant="orders" format="number" />;
}

export function CustomersCard(props: Omit<MetricsCardProps, 'variant' | 'format'>) {
  return <MetricsCard {...props} variant="customers" format="number" />;
}

export function InventoryCard(props: Omit<MetricsCardProps, 'variant' | 'format'>) {
  return <MetricsCard {...props} variant="inventory" format="number" />;
}
