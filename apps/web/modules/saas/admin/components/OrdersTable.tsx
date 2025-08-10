'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/components/table';
import { cn } from '@ui/lib';
import {
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  EyeIcon,
  TruckIcon,
  XCircleIcon,
  ShoppingCartIcon,
  PhoneIcon,
  MessageSquareIcon
} from 'lucide-react';
import Link from 'next/link';

// Types
interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    type: 'RETAIL' | 'WHOLESALE' | 'PHARMACY' | 'CLINIC';
  };
  items: Array<{
    id: string;
    product: {
      name: string;
      category: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  orderStatus: 'RECEIVED' | 'PROCESSING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod?: string;
  deliveryAddress: string;
  deliveryFee: number;
  state?: string;
  lga?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderFilters {
  search: string;
  status: string;
  customerType: string;
  showFilters: boolean;
}

// Jotai atoms for state management
const orderFiltersAtom = atomWithStorage<OrderFilters>('admin-orders-filters', {
  search: '',
  status: 'all',
  customerType: 'all',
  showFilters: false,
});

// API functions
const fetchOrders = async (): Promise<Order[]> => {
  const response = await fetch('/api/admin/orders');
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  return response.json();
};

const updateOrderStatus = async ({ orderId, status }: { orderId: string; status: string }): Promise<Order> => {
  const response = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update order status');
  }
  return response.json();
};

// Custom hooks
const useOrders = () => {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: fetchOrders,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
};

const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (error) => {
      alert(`Failed to update order status: ${error.message}`);
    },
  });
};

interface OrdersTableProps {
  className?: string;
}

export function OrdersTable({ className }: OrdersTableProps) {
  const [filters, setFilters] = useAtom(orderFiltersAtom);
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch 
  } = useOrders();
  
  const updateStatusMutation = useUpdateOrderStatus();

  // Filter orders based on current filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customer.name.toLowerCase().includes(term) ||
        order.customer.email.toLowerCase().includes(term) ||
        order.deliveryAddress.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.orderStatus.toLowerCase() === filters.status);
    }

    // Apply customer type filter
    if (filters.customerType !== 'all') {
      filtered = filtered.filter(order => order.customer.type.toLowerCase() === filters.customerType);
    }

    return filtered;
  }, [orders, filters]);

  // Filter update helpers
  const updateFilter = (key: keyof OrderFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      customerType: 'all',
      showFilters: false,
    });
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    refetch();
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'dispatched':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wholesale':
        return 'bg-purple-100 text-purple-800';
      case 'pharmacy':
        return 'bg-blue-100 text-blue-800';
      case 'clinic':
        return 'bg-green-100 text-green-800';
      case 'retail':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  // Error state
  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center space-x-3">
          <XCircleIcon className="size-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load orders</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-3" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search orders, customers, addresses..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => updateFilter('showFilters', !filters.showFilters)}
            >
              <FilterIcon className="size-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} size="sm" disabled={isLoading}>
              <RefreshCwIcon className={cn("size-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {filters.showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Order Status</Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Customer Type</Label>
              <Select value={filters.customerType} onValueChange={(value) => updateFilter('customerType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Orders ({filteredOrders.length} of {orders.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingCartIcon className="size-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No orders found</h3>
            <p className="text-gray-600">
              {filters.search || filters.status !== 'all' || filters.customerType !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'No orders have been placed yet'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      {order.deliveryFee > 0 && (
                        <p className="text-xs text-gray-500">
                          + {formatCurrency(order.deliveryFee)} delivery
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer.name}</p>
                      <p className="text-sm text-gray-600">{order.customer.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getCustomerTypeColor(order.customer.type)}>
                          {order.customer.type}
                        </Badge>
                        {order.customer.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            <PhoneIcon className="size-3 mr-1" />
                            Call
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.items.length} items</p>
                      <p className="text-sm text-gray-600">
                        {order.items.slice(0, 2).map(item => item.product.name).join(', ')}
                        {order.items.length > 2 && ` +${order.items.length - 2} more`}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getStatusColor(order.orderStatus)}>
                        {order.orderStatus}
                      </Badge>
                      {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
                        <Select
                          value={order.orderStatus}
                          onValueChange={(value) => handleStatusUpdate(order.id, value)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RECEIVED">Received</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="READY">Ready</SelectItem>
                            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                            <SelectItem value="DELIVERED">Delivered</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <p className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Link href={`/app/admin/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <EyeIcon className="size-4" />
                        </Button>
                      </Link>
                      
                      <Button variant="outline" size="sm">
                        <MessageSquareIcon className="size-4" />
                      </Button>
                      
                      {order.orderStatus === 'DISPATCHED' && (
                        <Button variant="outline" size="sm">
                          <TruckIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
