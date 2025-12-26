'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EditIcon,
  SaveIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  FileTextIcon,
  DownloadIcon,
  EyeIcon,
  ShieldCheckIcon,
  FileCheckIcon,
  AlertCircleIcon
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { config } from '@repo/config';
import { Spinner } from '@shared/components/Spinner';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import PdfDoc to avoid SSR issues with pdfjs-dist (requires browser APIs like DOMMatrix)
const PdfDoc = dynamic(() => import('./PdfDoc'), { ssr: false });

interface VerificationDocument {
  id: string;
  type: 'BUSINESS_LICENSE' | 'PHARMACY_LICENSE' | 'TAX_CERTIFICATE' | 'CAC_CERTIFICATE' | 'ID_CARD' | 'OTHER';
  name: string;
  url: string;
  key?: string;
  bucket?: string;
  mimeType?: string;
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

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
  verificationDocuments?: VerificationDocument[];
}

interface CustomerDetailViewProps {
  customerId: string;
}

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

    // Verify and parse verification documents (stored as JSON string of keys array in DB)
    // Format: "[\"verification/type/filename.pdf\", ...]"
    // Bucket: "documents"
    let parsedDocs: VerificationDocument[] = [];
    try {
      const raw = data.verificationDocuments;
      let keys: string[] = [];

      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            keys = parsed.filter(k => typeof k === 'string');
          }
        } catch {
          // Fallback: if somehow not JSON, treat as single string? Unlikely based on DB data.
          console.warn('Failed to parse verificationDocuments JSON', raw);
        }
      } else if (Array.isArray(raw)) {
        // If API already parsed it
        keys = raw.filter(k => typeof k === 'string');
      }

      parsedDocs = keys.map((key, idx) => {
        // Expected key format: verification/{type}/{filename}
        // e.g., verification/clinic/file.pdf
        const parts = key.split('/');
        const filename = parts.length > 0 ? parts[parts.length - 1] : `Document ${idx + 1}`;
        
        // Infer type from path "verification/{type}/..."
        const typeFromPath = parts.length >= 3 && parts[0] === 'verification' ? parts[1].toUpperCase() : 'OTHER';
        
        // Infer mime type from extension
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'pdf' ? 'application/pdf' : 
                         ext === 'png' ? 'image/png' :
                         ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : undefined;

        return {
          id: `doc-${idx}`,
          type: (typeFromPath || 'OTHER') as VerificationDocument['type'],
          name: filename,
          url: '', // We use key + bucket for proxy
          key: key,
          bucket: config.storage.bucketNames.documents, // Verified bucket 'documents'
          mimeType,
          uploadedAt: data.createdAt || new Date().toISOString(),
          status: 'PENDING', // Default status, real status might need a separate DB field or is per-customer
          reviewNotes: undefined,
        };
      });
    } catch (e) {
      console.error('Error parsing verification documents', e);
      parsedDocs = [];
    }
  
  // Map the backend data format to frontend format
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
    verificationDocuments: parsedDocs,
  };
};

const updateCustomerVerification = async ({
  customerId,
  status,
  notes
}: {
  customerId: string;
  status: string;
  notes?: string;
}): Promise<Customer> => {
  const response = await fetch(`/api/admin/customers/${customerId}/verification`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    throw new Error('Failed to update verification status');
  }
  return response.json();
};

export function CustomerDetailView({ customerId }: CustomerDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      // Don't retry for 404 errors
      if (error.message === 'Customer not found') {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update verification status mutation
  const verificationMutation = useMutation({
    mutationFn: updateCustomerVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      setVerificationNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update verification status', {
        description: error.message,
      });
    },
  });

  const handleVerificationUpdate = (status: string) => {
    verificationMutation.mutate({
      customerId,
      status,
      notes: verificationNotes.trim() || undefined,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
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

  // Helpers for preview and URLs
  const validHttpUrl = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u);
  const canAccessDoc = (doc: VerificationDocument) => validHttpUrl(doc.url) || !!doc.key;
  const extFromNameOrUrl = (name?: string, url?: string) => {
    const urlPath = (url || '').split('?')[0];
    const fromName = name?.split('.').pop()?.toLowerCase();
    const fromUrl = urlPath.split('.').pop()?.toLowerCase();
    return fromName || fromUrl || '';
  };
  const isImageDoc = (doc?: VerificationDocument | null, url?: string | null) => {
    if (doc?.mimeType && doc.mimeType.startsWith('image/')) return true;
    const ext = extFromNameOrUrl(doc?.name, url || undefined);
    return ['jpg','jpeg','png','webp','gif','svg'].includes(ext);
  };
  const isPdfDoc = (doc?: VerificationDocument | null, url?: string | null) => {
    if (doc?.mimeType === 'application/pdf') return true;
    const ext = extFromNameOrUrl(doc?.name, url || undefined);
    return ext === 'pdf';
  };
  const buildProxyUrl = (key: string, bucketOverride?: string) => {
    const bucket = bucketOverride || config.storage.bucketNames.documents;
    const parts = key.split('/').map(encodeURIComponent).join('/');
    return `/image-proxy/${bucket}/${parts}`;
  };
  const openPreview = (doc: VerificationDocument) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
    setPreviewError(null);
    setPreviewLoading(true);
    if (validHttpUrl(doc.url)) {
      setPreviewUrl(doc.url);
      setPreviewLoading(false);
      return;
    }
    if (doc.key) {
      const isImg = isImageDoc(doc);
      const proxy = buildProxyUrl(doc.key, doc.bucket) + (isImg ? '?preview=1' : '');
      setPreviewUrl(proxy);
      setPreviewLoading(false);
      return;
    }
    setPreviewError('No accessible URL for this document');
    setPreviewLoading(false);
  };
  const handleDownload = (doc: VerificationDocument) => {
    const url = validHttpUrl(doc.url) ? doc.url : doc.key ? buildProxyUrl(doc.key, doc.bucket) : null;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = (doc.name || 'document').replace(/\s+/g, '_');
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
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
                  ? 'The customer you are looking for does not exist or may have been removed.'
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
              <div className="h-6 bg-gray-300 rounded w-full"></div>
              <div className="h-6 bg-gray-300 rounded w-3/4"></div>
              <div className="h-6 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-300 rounded w-full"></div>
              <div className="h-6 bg-gray-300 rounded w-2/3"></div>
              <div className="h-6 bg-gray-300 rounded w-3/4"></div>
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
        <Link href="/app/admin/customers">
          <Button variant="outline" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getCustomerTypeColor(customer.type)}>
                {customer.type}
              </Badge>
              <Badge className={getVerificationStatusColor(customer.verificationStatus)}>
                {customer.verificationStatus}
              </Badge>
              {!customer.isActive && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              <EditIcon className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Customer Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-foreground">{customer.name}</span>
                  </div>
                </div>
                
                <div>
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MailIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{customer.email}</span>
                    {customer.emailVerified && (
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
                
                {customer.phone && (
                  <div>
                    <Label>Phone Number</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{customer.phone}</span>
                      {customer.phoneVerified && (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Customer Type</Label>
                  <div className="mt-1">
                    <Badge className={getCustomerTypeColor(customer.type)}>
                      {customer.type}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label>Member Since</Label>
                  <div className="mt-1">
                    <span className="text-foreground">
                      {new Date(customer.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Business Information */}
          {(customer.businessName || customer.type !== 'RETAIL') && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <BuildingIcon className="w-5 h-5 mr-2" />
                  Business Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.businessName && (
                    <div>
                      <Label>Business Name</Label>
                      <div className="mt-1">
                        <span className="text-foreground">{customer.businessName}</span>
                      </div>
                    </div>
                  )}
                  
                  {customer.businessAddress && (
                    <div className="md:col-span-2">
                      <Label>Business Address</Label>
                      <div className="flex items-start gap-2 mt-1">
                        <MapPinIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-foreground">{customer.businessAddress}</span>
                      </div>
                    </div>
                  )}
                  
                  {(customer.state || customer.lga) && (
                    <div>
                      <Label>Location</Label>
                      <div className="mt-1">
                        <span className="text-foreground">
                          {customer.lga && customer.state 
                            ? `${customer.lga}, ${customer.state}`
                            : customer.state || customer.lga}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {customer.licenseNumber && (
                    <div>
                      <Label>License Number</Label>
                      <div className="mt-1">
                        <span className="text-foreground">{customer.licenseNumber}</span>
                      </div>
                    </div>
                  )}
                  
                  {customer.taxId && (
                    <div>
                      <Label>Tax ID</Label>
                      <div className="mt-1">
                        <span className="text-foreground">{customer.taxId}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Statistics */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCardIcon className="w-5 h-5 mr-2" />
                Order Statistics
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Total Orders</Label>
                  <div className="text-2xl font-bold text-gray-900">{customer.totalOrders}</div>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Total Spent</Label>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.totalSpent)}</div>
                </div>
                
                {customer.totalOrders > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Average Order Value</Label>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(customer.totalSpent / customer.totalOrders)}
                    </div>
                  </div>
                )}
                
                {customer.lastOrderDate && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Last Order</Label>
                <div className="text-sm text-foreground">
                      {new Date(customer.lastOrderDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Verification Status */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Verification Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Status</span>
                  <Badge className={getVerificationStatusColor(customer.verificationStatus)}>
                    {customer.verificationStatus}
                  </Badge>
                </div>
                
                {customer.verificationStatus === 'PENDING' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="verification-notes">Admin Notes (Optional)</Label>
                      <Textarea
                        id="verification-notes"
                        placeholder="Add notes about the verification decision..."
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleVerificationUpdate('VERIFIED')}
                        disabled={verificationMutation.isPending}
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleVerificationUpdate('REJECTED')}
                        disabled={verificationMutation.isPending}
                      >
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Verification Documents Section */}
      <Card className="mt-6">
        <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Verification Documents
              </div>
              {customer.verificationDocuments && customer.verificationDocuments.length > 0 && (
                <Badge variant="outline">
                  {customer.verificationDocuments.filter(doc => doc.status === 'APPROVED').length}/
                  {customer.verificationDocuments.length} Approved
                </Badge>
              )}
            </h2>

            {(!customer.verificationDocuments || customer.verificationDocuments.length === 0) ? (
                <div className="text-center py-8 bg-muted/30 dark:bg-muted/20 rounded-lg border-2 border-dashed border-border">
                <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No verification documents uploaded</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {customer.type === 'PHARMACY' && 'Pharmacy license and business registration required'}
                  {customer.type === 'CLINIC' && 'Medical practice license and certifications required'}
                  {customer.type === 'WHOLESALE' && 'Business registration and tax certificates required'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.verificationDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors bg-white dark:bg-zinc-950/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-zinc-500 dark:text-zinc-400">
                        {doc.status === 'APPROVED' ? (
                          <FileCheckIcon className="w-5 h-5 text-green-600 dark:text-green-500" />
                        ) : doc.status === 'REJECTED' ? (
                          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-500" />
                        ) : (
                          <FileTextIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{doc.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {doc.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          <Badge 
                            className={`text-xs ${
                              doc.status === 'APPROVED' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' 
                                : doc.status === 'REJECTED'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                            }`}
                            variant="outline"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        {doc.reviewNotes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            Note: {doc.reviewNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        onClick={() => openPreview(doc)}
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        disabled={!canAccessDoc(doc)}
                        onClick={() => handleDownload(doc)}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document Requirements Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Required Documents for {customer.type} Customers:</p>
                  <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-1">
                    {customer.type === 'PHARMACY' && (
                      <>
                        <li>Valid Pharmacy License from PCN (Pharmacists Council of Nigeria)</li>
                        <li>CAC Business Registration Certificate</li>
                        <li>Tax Clearance Certificate</li>
                        <li>Premises Registration Certificate</li>
                      </>
                    )}
                    {customer.type === 'CLINIC' && (
                      <>
                        <li>Medical Practice License</li>
                        <li>CAC Business Registration Certificate</li>
                        <li>Health Facility Registration</li>
                        <li>Chief Medical Officer's License</li>
                      </>
                    )}
                    {customer.type === 'WHOLESALE' && (
                      <>
                        <li>CAC Business Registration Certificate</li>
                        <li>Tax Identification Number (TIN)</li>
                        <li>VAT Registration (if applicable)</li>
                        <li>Trade License</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-[#09090b] text-white border-zinc-800" aria-describedby={undefined}>
            <DialogHeader className="p-4 border-b border-zinc-800 shrink-0">
              <DialogTitle className="text-white font-mono text-sm truncate pr-8">
                {previewDoc?.name || 'Document Preview'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 relative bg-zinc-950/50">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-8 text-white" />
                  <span className="ml-3 text-zinc-400">Loading document...</span>
                </div>
              ) : previewError ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Failed to load</h3>
                    <p className="text-zinc-400">{previewError}</p>
                  </div>
                </div>
              ) : previewUrl ? (
                isPdfDoc(previewDoc, previewUrl) ? (
                  <div className="h-full w-full">
                    <PdfDoc fileUrl={previewUrl} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
                    <Image
                      src={previewUrl}
                      alt={previewDoc?.name || 'Document'}
                      width={1200}
                      height={800}
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      priority
                    />
                  </div>
                )
              ) : null}
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 shrink-0 bg-[#09090b]">
              {previewUrl && (
                <Button 
                  className="bg-black text-white border-2 border-white hover:bg-zinc-900 rounded-none px-6 font-bold uppercase tracking-wider"
                  onClick={() => previewDoc && handleDownload(previewDoc)}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button 
                className="bg-[#D9F903] text-black hover:bg-[#c2e002] rounded-none px-8 font-bold uppercase tracking-wider"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
