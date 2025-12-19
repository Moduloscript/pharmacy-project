'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { z } from 'zod';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Textarea } from '@ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { YearEstablishedPicker } from '@ui/components/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@ui/components/form';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Alert, AlertDescription } from '@ui/components/alert';
import { 
  UploadIcon, 
  BuildingIcon, 
  PhoneIcon, 
  ShieldIcon,
  InfoIcon,
  CheckCircleIcon
} from 'lucide-react';
import { DocumentUpload } from "@/modules/saas/shared/components/DocumentUpload";
import { type CustomerType } from './CustomerTypeSelector';

import { NIGERIAN_STATES_AND_LGAS, isValidState, isValidLGAForState } from "@shared/lib/nigeria";

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const buildBusinessSignupSchema = (customerType: CustomerType) => z
  .object({
    // Basic business information
    businessName: z.preprocess(trim, z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name is too long')),
    businessPhone: z.preprocess(trim, z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number')),
    businessEmail: z.preprocess(trim, z.string().email('Please enter a valid email address')),
    
    // Address information
    businessAddress: z.preprocess(trim, z.string().min(10, 'Please enter a complete business address').max(300, 'Business address is too long')),
    state: z.preprocess(trim, z.string().min(1, 'Please select your state')),
    lga: z.preprocess(trim, z.string().min(1, 'Please select your Local Government Area')),
    
    // Business verification documents
    licenseNumber: z.preprocess(trim, z.string().optional()),
    taxId: z.preprocess(trim, z.string().optional()),
    
    // Additional information
    establishedYear: z.coerce.number().min(1900).max(new Date().getFullYear()).optional(),
    description: z.preprocess(trim, z.string().max(500).optional()),
    
    // File uploads (URLs will be stored as strings)
    businessRegistration: z.string().optional(),
    pharmacyLicense: z.string().optional(),
    taxCertificate: z.string().optional(),
    utilityBill: z.string().optional(),
  })
  .refine((d) => isValidState(String(d.state)), {
    path: ['state'],
    message: 'Invalid state selected',
  })
  .refine((d) => isValidLGAForState(String(d.state), String(d.lga)), {
    path: ['lga'],
    message: 'Invalid LGA for the selected state',
  })
  .superRefine((d, ctx) => {
    if (customerType === 'PHARMACY' && !d.licenseNumber?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseNumber'], message: 'Pharmacy license number is required for Pharmacies' });
    }
  });

type BusinessSignupFormData = {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  state: string;
  lga: string;
  licenseNumber?: string;
  taxId?: string;
  establishedYear?: number;
  description?: string;
  businessRegistration?: string;
  pharmacyLicense?: string;
  taxCertificate?: string;
  utilityBill?: string;
};

interface BusinessSignupFormProps {
  customerType: CustomerType;
  onSubmit: (data: BusinessSignupFormData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export function BusinessSignupForm({ 
  customerType, 
  onSubmit, 
  isSubmitting = false,
  className 
}: BusinessSignupFormProps) {
  const schema = useMemo(() => buildBusinessSignupSchema(customerType), [customerType]);
  const form = useForm<BusinessSignupFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: '',
      businessPhone: '',
      businessEmail: '',
      businessAddress: '',
      state: '',
      lga: '',
      licenseNumber: '',
      taxId: '',
      establishedYear: undefined,
      description: '',
    },
  });

  const handleStateChange = (state: string) => {
    form.setValue('state', state);
    form.setValue('lga', ''); // Reset LGA when state changes
  };

  const getLGAOptions = () => {
    const currentState = form.watch('state');
    if (!currentState) return [];
    return NIGERIAN_STATES_AND_LGAS[currentState as keyof typeof NIGERIAN_STATES_AND_LGAS] || [];
  };

  const getRequiredDocuments = () => {
    const baseDocuments = [
      { 
        key: 'businessRegistration', 
        label: 'Certificate of Business Registration', 
        description: 'CAC certificate or business registration document',
        required: true 
      },
      { 
        key: 'utilityBill', 
        label: 'Utility Bill', 
        description: 'Recent utility bill (not older than 3 months) for address verification',
        required: true 
      },
    ];

    const additionalDocuments = [];

    if (customerType === 'PHARMACY') {
      additionalDocuments.push({
        key: 'pharmacyLicense',
        label: 'Pharmacy License',
        description: 'Valid pharmacy license from Pharmacists Council of Nigeria (PCN)',
        required: true
      });
    }

    if (['WHOLESALE', 'PHARMACY', 'CLINIC'].includes(customerType)) {
      additionalDocuments.push({
        key: 'taxCertificate',
        label: 'Tax Identification Number (TIN) Certificate',
        description: 'TIN certificate from Federal Inland Revenue Service (FIRS)',
        required: false
      });
    }

    return [...baseDocuments, ...additionalDocuments];
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BuildingIcon className="size-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
            <p className="text-sm text-gray-600">
              Please provide your business details for verification and account setup.
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Details Section */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Business Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
<Input placeholder="Enter your business name" maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-3 size-4 text-gray-400" />
<Input 
                          placeholder="+234 808 123 4567" 
                          className="pl-10"
                          maxLength={20}
                          inputMode="tel"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Nigerian phone number for business contact
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email *</FormLabel>
                    <FormControl>
<Input 
                        type="email" 
                        placeholder="business@example.com" 
                        maxLength={254}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="establishedYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Established</FormLabel>
                    <FormControl>
                      <YearEstablishedPicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select year your business was established"
                      />
                    </FormControl>
                    <FormDescription>
                      Year when your business was officially established
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Business Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of your business activities..."
                      className="min-h-[100px]"
                      maxLength={500}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Describe what your business does (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Address Information Section */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Business Address
            </h3>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
<Textarea 
                        placeholder="Enter your complete business address including street name, area, and landmarks"
                        className="min-h-[80px]"
                        maxLength={300}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value}
                          onValueChange={handleStateChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(NIGERIAN_STATES_AND_LGAS).map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local Government Area *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!form.watch('state')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select LGA" />
                          </SelectTrigger>
                          <SelectContent>
                            {getLGAOptions().map((lga) => (
                              <SelectItem key={lga} value={lga}>
                                {lga}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          {/* License and Registration Section */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              License & Registration Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerType === 'PHARMACY' && (
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Pharmacy License Number *
                        <Badge variant="secondary" className="ml-2">Required</Badge>
                      </FormLabel>
                      <FormControl>
<Input placeholder="PCN License Number" maxLength={64} {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Pharmacists Council of Nigeria (PCN) license number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Identification Number (TIN)</FormLabel>
                    <FormControl>
<Input placeholder="Enter your TIN" maxLength={64} {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Federal Inland Revenue Service (FIRS) TIN
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Document Upload Section */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ShieldIcon className="size-5 mr-2 text-blue-600" />
              Verification Documents
            </h3>
            
            <Alert className="mb-4">
              <InfoIcon className="size-4" />
              <AlertDescription>
                Please upload clear, legible copies of the following documents for business verification. 
                Accepted formats: PDF, JPG, PNG (max 5MB each).
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {getRequiredDocuments().map((doc) => (
                <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{doc.label}</h4>
                        {doc.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                    </div>
                    <div className="ml-4 w-64">
                      <DocumentUpload
                        multiple={false}
                        bypassAuth={true}
                        accept={{
                          'application/pdf': ['.pdf'],
                          'image/jpeg': ['.jpg', '.jpeg'],
                          'image/png': ['.png']
                        }}
                        prefix={`verification/${customerType.toLowerCase()}`}
                        onUploaded={({ key }) => {
                          // Persist the storage key into the form field
                          // We store the storage key (not a signed URL) to keep a stable reference
                          // Backend can resolve/download via documents API when needed
                          // @ts-expect-error dynamic key assignment
                          form.setValue(doc.key, key, { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      {/* Show current value if present */}
                      {form.watch(doc.key as any) && (
                        <p className="mt-2 text-xs text-gray-600 break-all">Saved: {form.watch(doc.key as any)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <ShieldIcon className="size-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Verification Process</p>
                  <p className="text-amber-700">
                    Your documents will be reviewed within 1-2 business days. You'll receive an email 
                    notification once your account is verified and wholesale pricing is activated.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isSubmitting}
              className="px-8"
            >
              <CheckCircleIcon className="size-4 mr-2" />
              Complete Registration
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
