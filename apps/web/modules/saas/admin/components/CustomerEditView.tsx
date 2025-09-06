'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Textarea } from '@ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingIcon,
  SaveIcon,
  RefreshCwIcon,
  AlertTriangleIcon
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  type: 'RETAIL' | 'WHOLESALE' | 'PHARMACY' | 'CLINIC';
  businessName: string;
  businessAddress: string;
  state: string;
  lga: string;
  licenseNumber: string;
  taxId: string;
  isActive: boolean;
}

interface CustomerEditViewProps {
  customerId: string;
}

// Nigerian States for select
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// API functions
const fetchCustomer = async (customerId: string): Promise<Customer> => {
  const response = await fetch(`/api/admin/customers/${customerId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Customer not found');
    }
    throw new Error('Failed to fetch customer');
  }
  const data = await response.json();
  
  return {
    id: data.id,
    name: data.userName || data.name,
    email: data.userEmail || data.email,
    phone: data.phone || data.businessPhone,
    type: data.type || 'RETAIL',
    businessName: data.businessName,
    businessAddress: data.businessAddress,
    state: data.state,
    lga: data.lga,
    licenseNumber: data.pharmacyLicense,
    taxId: data.taxId,
    verificationStatus: data.businessVerificationStatus || data.verificationStatus || 'PENDING',
    emailVerified: data.emailVerified || false,
    phoneVerified: data.phoneVerified || false,
    isActive: data.isActive !== false,
    totalOrders: data.totalOrders || 0,
    totalSpent: data.totalSpent || 0,
    lastOrderDate: data.lastOrderDate,
    createdAt: data.createdAt || data.userCreatedAt,
    updatedAt: data.updatedAt,
  };
};

const updateCustomer = async ({
  customerId,
  data
}: {
  customerId: string;
  data: Partial<CustomerFormData>;
}): Promise<Customer> => {
  const response = await fetch(`/api/admin/customers/${customerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update customer');
  }
  return response.json();
};

export function CustomerEditView({ customerId }: CustomerEditViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    type: 'RETAIL',
    businessName: '',
    businessAddress: '',
    state: '',
    lga: '',
    licenseNumber: '',
    taxId: '',
    isActive: true,
  });

  // Fetch customer data
  const {
    data: customer,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => fetchCustomer(customerId),
    retry: (failureCount, error) => {
      if (error.message === 'Customer not found') {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update form data when customer data is loaded
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        type: customer.type,
        businessName: customer.businessName || '',
        businessAddress: customer.businessAddress || '',
        state: customer.state || '',
        lga: customer.lga || '',
        licenseNumber: customer.licenseNumber || '',
        taxId: customer.taxId || '',
        isActive: customer.isActive,
      });
    }
  }, [customer]);

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      router.push(`/app/admin/customers/${customerId}`);
    },
    onError: (error) => {
      toast.error('Failed to update customer', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      customerId,
      data: formData,
    });
  };

  const handleInputChange = (
    field: keyof CustomerFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/app/admin/customers">
            <Button variant="outline" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
        
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertTriangleIcon className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">
                {error.message === 'Customer not found' ? 'Customer Not Found' : 'Error Loading Customer'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error.message === 'Customer not found' 
                  ? 'The customer you are trying to edit does not exist or may have been removed.'
                  : error.message}
              </p>
              <Button variant="outline" onClick={() => refetch()} className="mt-3" size="sm">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/app/admin/customers">
            <Button variant="outline" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
        
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-300 rounded w-full"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-300 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/app/admin/customers/${customerId}`}>
          <Button variant="outline" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Customer Details
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-gray-600 mt-1">Update customer information and business details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Customer Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => handleInputChange('type', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="isActive">Account Status</Label>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => handleInputChange('isActive', value === 'active')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Business Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <BuildingIcon className="w-5 h-5 mr-2" />
              Business Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No State Selected</SelectItem>
                    {NIGERIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lga">Local Government Area</Label>
                <Input
                  id="lga"
                  type="text"
                  value={formData.lga}
                  onChange={(e) => handleInputChange('lga', e.target.value)}
                  className="mt-1"
                  placeholder="Enter LGA"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="mt-1"
                  placeholder="Pharmacy/Business license number"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Link href={`/app/admin/customers/${customerId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="min-w-[120px]"
          >
            {updateMutation.isPending ? (
              <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SaveIcon className="w-4 h-4 mr-2" />
            )}
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
