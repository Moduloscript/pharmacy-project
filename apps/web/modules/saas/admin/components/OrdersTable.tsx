'use client';

import './OrdersTable.css';
import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@ui/components/dropdown-menu';
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
  MessageSquareIcon,
  SlidersHorizontalIcon,
  MoreHorizontalIcon,
  FileTextIcon
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import Link from 'next/link';
import { toast } from 'sonner';

// Types
interface Order {
  id: string;
  orderNumber: string;
  requiresPrescription?: boolean;
  prescriptionStatus?: string | null;
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

interface ColumnVisibility {
  orderNumber: boolean;
  customer: boolean;
  items: boolean;
  total: boolean;
  payment: boolean;
  status: boolean;
  date: boolean;
}

const orderColumnsAtom = atomWithStorage<ColumnVisibility>('admin-orders-columns', {
  orderNumber: true,
  customer: true,
  items: true,
  total: true,
  payment: true,
  status: true,
  date: true,
});

const compactAtom = atomWithStorage<boolean>('admin-orders-compact', false);

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
      toast.error('Failed to update order status', {
        description: error.message,
      });
    },
  });
};

interface OrdersTableProps {
  className?: string;
}

export function OrdersTable({ className }: OrdersTableProps) {
  const [filters, setFilters] = useAtom(orderFiltersAtom);
  const [columns, setColumns] = useAtom(orderColumnsAtom);
  const [compact, setCompact] = useAtom(compactAtom);
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch 
  } = useOrders();
  
  const updateStatusMutation = useUpdateOrderStatus();

  // Action handlers
  const handleCallCustomer = (phone: string, customerName: string) => {
    // Open phone dialer or copy number
    if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
      // Mobile device - open phone dialer
      window.location.href = `tel:${phone}`;
    } else {
      // Desktop - copy to clipboard and show notification
      navigator.clipboard.writeText(phone).then(() => {
        toast.success('Phone number copied to clipboard', {
          description: `${customerName}: ${phone}`
        });
      }).catch(() => {
        toast.error('Failed to copy phone number');
      });
    }
  };

  const handleSendMessage = (order: Order) => {
    const { customer } = order;
    const message = `Hi ${customer.name}, regarding your order ${order.orderNumber}. How can we help you today?`;
    
    if (customer.phone) {
      // Try to open SMS app if on mobile, otherwise copy message
      if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
        window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(message)}`;
      } else {
        // Desktop - copy message template
        navigator.clipboard.writeText(`${customer.phone}\n${message}`).then(() => {
          toast.success('Message template copied to clipboard', {
            description: `Ready to send to ${customer.name}`
          });
        }).catch(() => {
          toast.error('Failed to copy message template');
        });
      }
    } else {
      toast.error('No phone number available for this customer');
    }
  };

  const handleTrackDelivery = (order: Order) => {
    // For now, show order details with tracking info
    // In a real implementation, this would integrate with delivery service API
    toast.info('Tracking delivery', {
      description: `Opening tracking details for order ${order.orderNumber}`
    });
    
    // Navigate to order details with tracking focus
    window.open(`/app/admin/orders/${order.id}?tab=delivery`, '_blank');
  };

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
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0 max-w-lg">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => updateFilter('showFilters', !filters.showFilters)}
            >
              <FilterIcon className="size-4 mr-2" />
              Filters
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontalIcon className="size-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={columns.orderNumber} onCheckedChange={(v)=> setColumns({ ...columns, orderNumber: !!v })}>Order #</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.customer} onCheckedChange={(v)=> setColumns({ ...columns, customer: !!v })}>Customer</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.items} onCheckedChange={(v)=> setColumns({ ...columns, items: !!v })}>Items</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.total} onCheckedChange={(v)=> setColumns({ ...columns, total: !!v })}>Total</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.payment} onCheckedChange={(v)=> setColumns({ ...columns, payment: !!v })}>Payment</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.status} onCheckedChange={(v)=> setColumns({ ...columns, status: !!v })}>Status</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columns.date} onCheckedChange={(v)=> setColumns({ ...columns, date: !!v })}>Date</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={compact} onCheckedChange={(v)=> setCompact(!!v)}>Compact mode</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
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
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold">
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
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <Table className="min-w-full table-fixed">
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      {columns.orderNumber && (
                        <TableHead className="w-[12%] font-semibold">Order #</TableHead>
                      )}
                      {columns.customer && (
                        <TableHead className="w-[20%] font-semibold">Customer</TableHead>
                      )}
                      {columns.items && (
                        <TableHead className="w-[20%] font-semibold">Items</TableHead>
                      )}
                      {columns.total && (
                        <TableHead className="w-[10%] font-semibold">Total</TableHead>
                      )}
                      {columns.payment && (
                        <TableHead className="w-[10%] font-semibold">Payment</TableHead>
                      )}
                      {columns.status && (
                        <TableHead className="w-[15%] font-semibold">Status</TableHead>
                      )}
                      {columns.date && (
                        <TableHead className="w-[10%] font-semibold">Date</TableHead>
                      )}
                      <TableHead className="w-[50px] sticky right-0 bg-muted/50 font-semibold"></TableHead>
                    </TableRow>
                  </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  {columns.orderNumber && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <div className="w-full max-w-full">
                        <p className="font-medium truncate" title={order.orderNumber}>
                          {order.orderNumber}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {order.requiresPrescription && (
                            <Badge className="text-[10px] py-0 px-1.5 h-5">Rx required</Badge>
                          )}
                          {order.deliveryFee > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <TruckIcon className="size-3 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delivery: {formatCurrency(order.deliveryFee)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  
                  {columns.customer && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <div className="flex flex-col gap-1 w-full max-w-full">
                        <div className="flex items-center gap-2 max-w-full">
                          <p className="font-medium truncate flex-1" title={order.customer.name}>
                            {order.customer.name}
                          </p>
                          <Badge className={cn("text-[10px] px-1 h-5 shrink-0", getCustomerTypeColor(order.customer.type))}>
                            {order.customer.type}
                          </Badge>
                        </div>
                        
                        {!compact && (
                          <div className="flex items-center justify-between gap-2 max-w-full">
                            <p className="text-sm text-gray-500 truncate" title={order.customer.email}>
                              {order.customer.email}
                            </p>
                            {order.customer.phone && (
                              <button
                                onClick={() => handleCallCustomer(order.customer.phone!, order.customer.name)}
                                className="text-gray-400 hover:text-gray-600 shrink-0"
                                title={`Call ${order.customer.name}`}
                              >
                                <PhoneIcon className="size-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                  {columns.items && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <div className="max-w-[200px]">
                        <p className="font-medium">{order.items.length} items</p>
                        <p className={cn('text-sm text-gray-600', compact ? 'truncate' : 'clamp-2')}>
                          {order.items.slice(0, 3).map(item => item.product.name).join(', ')}
                          {order.items.length > 3 && ` +${order.items.length - 3} more`}
                        </p>
                      </div>
                    </TableCell>
                  )}
                  
                  {columns.total && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                    </TableCell>
                  )}
                  
                  {columns.payment && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                  )}
                  
                  {columns.status && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <div className="w-full">
                        {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' ? (
                          <Select
                            value={order.orderStatus}
                            onValueChange={(value) => handleStatusUpdate(order.id, value)}
                            disabled={updateStatusMutation.isPending || (order.requiresPrescription && order.prescriptionStatus !== 'APPROVED')}
                          >
                            <SelectTrigger className={cn("h-7 text-xs w-full", getStatusColor(order.orderStatus))}>
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
                        ) : (
                          <Badge className={cn("w-full justify-center", getStatusColor(order.orderStatus))}>
                            {order.orderStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                  {columns.date && (
                    <TableCell className={cn(compact ? 'py-2' : 'py-3')}>
                      <p className="text-sm whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </TableCell>
                  )}
                  
                  <TableCell className="py-3 sticky right-0 bg-background">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href={`/app/admin/orders/${order.id}`} className="w-full">
                          <DropdownMenuCheckboxItem className="cursor-pointer">
                            <EyeIcon className="mr-2 size-4" />
                            View Details
                          </DropdownMenuCheckboxItem>
                        </Link>
                        <DropdownMenuCheckboxItem className="cursor-pointer" onClick={() => handleSendMessage(order)}>
                          <MessageSquareIcon className="mr-2 size-4" />
                          Message Customer
                        </DropdownMenuCheckboxItem>
                        {order.requiresPrescription && (
                          <Link href={`/app/admin/prescriptions`} className="w-full">
                            <DropdownMenuCheckboxItem className="cursor-pointer">
                              <FileTextIcon className="mr-2 size-4" />
                              Review Prescription
                            </DropdownMenuCheckboxItem>
                          </Link>
                        )}
                        {order.orderStatus === 'DISPATCHED' && (
                          <DropdownMenuCheckboxItem className="cursor-pointer" onClick={() => handleTrackDelivery(order)}>
                            <TruckIcon className="mr-2 size-4" />
                            Track Delivery
                          </DropdownMenuCheckboxItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-lg border p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{order.orderNumber}</p>
                      {columns.date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(order.orderStatus)}>
                      {order.orderStatus}
                    </Badge>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{order.customer.name}</span>
                      <Badge className={cn(getCustomerTypeColor(order.customer.type), "text-xs")}>
                        {order.customer.type}
                      </Badge>
                    </div>
                    {!compact && (
                      <p className="text-xs text-muted-foreground break-all">{order.customer.email}</p>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-3 py-2 border-y">
                    {columns.items && (
                      <div>
                        <p className="text-xs text-muted-foreground">Items</p>
                        <p className="text-sm font-medium">{order.items.length} items</p>
                      </div>
                    )}
                    {columns.total && (
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
                      </div>
                    )}
                    {columns.payment && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payment</p>
                        <Badge className={cn(getPaymentStatusColor(order.paymentStatus), "text-xs")}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="text-sm">
                        {order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'Free'}
                      </p>
                    </div>
                  </div>

                  {/* Status Update for Mobile */}
                  {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
                    <div>
                      <Label className="text-xs">Update Status</Label>
                      <Select
                        value={order.orderStatus}
                        onValueChange={(value) => handleStatusUpdate(order.id, value)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-full h-9 mt-1">
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
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/app/admin/orders/${order.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <EyeIcon className="size-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    {order.customer.phone && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCallCustomer(order.customer.phone!, order.customer.name)}
                        title={`Call ${order.customer.name}`}
                      >
                        <PhoneIcon className="size-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendMessage(order)}
                      title={`Message ${order.customer.name}`}
                    >
                      <MessageSquareIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
