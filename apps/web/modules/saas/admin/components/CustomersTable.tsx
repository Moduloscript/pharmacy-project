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
  EditIcon,
  XCircleIcon,
  UsersIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  BuildingIcon
} from 'lucide-react';
import Link from 'next/link';

// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'RETAIL' | 'WHOLESALE' | 'PHARMACY' | 'CLINIC';
  businessName?: string;
  businessAddress?: string;
  state?: string;
  lga?: string;
  licenseNumber?: string;
  taxId?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFilters {
  search: string;
  type: string;
  verificationStatus: string;
  state: string;
  showFilters: boolean;
}

// Jotai atoms for state management
const customerFiltersAtom = atomWithStorage<CustomerFilters>('admin-customers-filters', {
  search: '',
  type: 'all',
  verificationStatus: 'all',
  state: 'all',
  showFilters: false,
});

// Nigerian States for filter
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// API functions
const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await fetch('/api/admin/customers');
  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }
  const data = await response.json();
  
  // Handle the API response format that includes pagination
  const customers = data.customers || data;
  
  // Map the backend data format to frontend format
  return customers.map((customer: any) => ({
    id: customer.id,
    name: customer.userName || customer.name,
    email: customer.userEmail || customer.email,
    phone: customer.phone || customer.businessPhone,
    type: customer.type,
    businessName: customer.businessName,
    businessAddress: customer.businessAddress,
    state: customer.state,
    lga: customer.lga,
    licenseNumber: customer.pharmacyLicense,
    taxId: customer.taxId,
    verificationStatus: customer.businessVerificationStatus || customer.verificationStatus || 'PENDING',
    emailVerified: customer.emailVerified || false, // This needs to come from the user table
    phoneVerified: customer.phoneVerified || false,
    isActive: customer.isActive !== false,
    totalOrders: customer.totalOrders || 0,
    totalSpent: customer.totalSpent || 0,
    lastOrderDate: customer.lastOrderDate,
    createdAt: customer.createdAt || customer.userCreatedAt,
    updatedAt: customer.updatedAt,
  }));
};

const updateCustomerStatus = async ({ 
  customerId, 
  status 
}: { 
  customerId: string; 
  status: string; 
}): Promise<Customer> => {
  const response = await fetch(`/api/admin/customers/${customerId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update customer status');
  }
  return response.json();
};

const verifyCustomer = async ({ 
  customerId, 
  verificationStatus 
}: { 
  customerId: string; 
  verificationStatus: string; 
}): Promise<Customer> => {
  const response = await fetch(`/api/admin/customers/${customerId}/verification`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: verificationStatus }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify customer');
  }
  return response.json();
};

// Custom hooks
const useCustomers = () => {
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: fetchCustomers,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
};

const useUpdateCustomerStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCustomerStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (error) => {
      alert(`Failed to update customer status: ${error.message}`);
    },
  });
};

const useVerifyCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: verifyCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (error) => {
      alert(`Failed to verify customer: ${error.message}`);
    },
  });
};

interface CustomersTableProps {
  className?: string;
}

export function CustomersTable({ className }: CustomersTableProps) {
  const [filters, setFilters] = useAtom(customerFiltersAtom);
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { 
    data: customers = [], 
    isLoading, 
    error, 
    refetch 
  } = useCustomers();
  
  const updateStatusMutation = useUpdateCustomerStatus();
  const verifyMutation = useVerifyCustomer();

  // Calculate customer stats and filter customers
  const { filteredCustomers, customerStats } = useMemo(() => {
    // Ensure customers is always an array to prevent .filter() errors
    const validCustomers = Array.isArray(customers) ? customers : [];
    let filtered = validCustomers;

    // Apply search filter
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term) ||
        customer.businessName?.toLowerCase().includes(term) ||
        customer.licenseNumber?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(customer => customer.type.toLowerCase() === filters.type);
    }

    // Apply verification status filter
    if (filters.verificationStatus !== 'all') {
      filtered = filtered.filter(customer => customer.verificationStatus.toLowerCase() === filters.verificationStatus);
    }

    // Apply state filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(customer => customer.state === filters.state);
    }

    // Calculate stats
    const stats = {
      totalCustomers: validCustomers.length,
      retailCustomers: validCustomers.filter(c => c.type === 'RETAIL').length,
      wholesaleCustomers: validCustomers.filter(c => c.type === 'WHOLESALE').length,
      pharmacyCustomers: validCustomers.filter(c => c.type === 'PHARMACY').length,
      clinicCustomers: validCustomers.filter(c => c.type === 'CLINIC').length,
      verifiedCustomers: validCustomers.filter(c => c.verificationStatus === 'VERIFIED').length,
      pendingVerification: validCustomers.filter(c => c.verificationStatus === 'PENDING').length,
      totalRevenue: validCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      avgOrderValue: validCustomers.length > 0 ? validCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / validCustomers.reduce((sum, c) => sum + c.totalOrders, 0) : 0,
    };

    return { filteredCustomers: filtered, customerStats: stats };
  }, [customers, filters]);

  // Filter update helpers
  const updateFilter = (key: keyof CustomerFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      verificationStatus: 'all',
      state: 'all',
      showFilters: false,
    });
  };

  const handleStatusUpdate = (customerId: string, status: string) => {
    updateStatusMutation.mutate({ customerId, status });
  };

  const handleVerification = (customerId: string, verificationStatus: string) => {
    verifyMutation.mutate({ customerId, verificationStatus });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    refetch();
  };

  // Utility functions
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

  const getVerificationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
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

  const getCustomerValue = (customer: Customer) => {
    if (customer.totalOrders === 0) return 'New Customer';
    const avgOrder = customer.totalSpent / customer.totalOrders;
    if (avgOrder > 50000) return 'High Value';
    if (avgOrder > 20000) return 'Medium Value';
    return 'Regular';
  };

  // Error state
  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center space-x-3">
          <XCircleIcon className="size-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load customers</h3>
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
      {/* Customer Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <UsersIcon className="size-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customerStats.totalCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="size-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{customerStats.verifiedCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <ClockIcon className="size-8 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Verification</p>
              <p className="text-2xl font-bold text-yellow-600">{customerStats.pendingVerification}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <BuildingIcon className="size-8 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Business Customers</p>
              <p className="text-2xl font-bold text-purple-600">
                {customerStats.wholesaleCustomers + customerStats.pharmacyCustomers + customerStats.clinicCustomers}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search customers, emails, business names..."
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Customer Type</Label>
              <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
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

            <div>
              <Label>Verification Status</Label>
              <Select value={filters.verificationStatus} onValueChange={(value) => updateFilter('verificationStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>State</Label>
              <Select value={filters.state} onValueChange={(value) => updateFilter('state', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {NIGERIAN_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
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

      {/* Customers Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Customers ({filteredCustomers.length} of {Array.isArray(customers) ? customers.length : 0})
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total Revenue: {formatCurrency(customerStats.totalRevenue)}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-6 text-center">
            <UsersIcon className="size-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No customers found</h3>
            <p className="text-gray-600">
              {filters.search || filters.type !== 'all' || filters.verificationStatus !== 'all' || filters.state !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'No customers have registered yet'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.businessName && (
                        <p className="text-sm text-gray-600">{customer.businessName}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary">
                          {getCustomerValue(customer)}
                        </Badge>
                        {!customer.isActive && (
                          <Badge variant="destructive">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MailIcon className="size-3 text-gray-400" />
                        <span className="text-sm">{customer.email}</span>
                        {customer.emailVerified && (
                          <CheckCircleIcon className="size-3 text-green-600" />
                        )}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="size-3 text-gray-400" />
                          <span className="text-sm">{customer.phone}</span>
                          {customer.phoneVerified && (
                            <CheckCircleIcon className="size-3 text-green-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getCustomerTypeColor(customer.type)}>
                      {customer.type}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="size-3 text-gray-400" />
                      <span className="text-sm">
                        {customer.state && customer.lga 
                          ? `${customer.lga}, ${customer.state}`
                          : customer.state || 'Not specified'
                        }
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.totalOrders} orders</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                      {customer.lastOrderDate && (
                        <p className="text-xs text-gray-500">
                          Last: {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getVerificationStatusColor(customer.verificationStatus)}>
                        {customer.verificationStatus}
                      </Badge>
                      {customer.verificationStatus === 'PENDING' && (
                        <div className="space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleVerification(customer.id, 'VERIFIED')}
                            disabled={verifyMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleVerification(customer.id, 'REJECTED')}
                            disabled={verifyMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Link href={`/app/admin/customers/${customer.id}`}>
                        <Button variant="outline" size="sm">
                          <EyeIcon className="size-4" />
                        </Button>
                      </Link>
                      
                      <Link href={`/app/admin/customers/${customer.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <EditIcon className="size-4" />
                        </Button>
                      </Link>
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
