'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Textarea } from '@ui/components/textarea';
import { Select } from '@ui/components/select';
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
import { type CustomerType } from './CustomerTypeSelector';

// Nigerian states and their LGAs (abbreviated list for example)
const NIGERIAN_STATES_AND_LGAS = {
  'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Abuja': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
  'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai']
};

const businessSignupSchema = z.object({
  // Basic business information
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessPhone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
  businessEmail: z.string().email('Please enter a valid email address'),
  
  // Address information
  businessAddress: z.string().min(10, 'Please enter a complete business address'),
  state: z.string().min(1, 'Please select your state'),
  lga: z.string().min(1, 'Please select your Local Government Area'),
  
  // Business verification documents
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
  
  // Additional information
  establishedYear: z.coerce.number().min(1900).max(new Date().getFullYear()).optional(),
  description: z.string().max(500).optional(),
  
  // File uploads (URLs will be stored as strings)
  businessRegistration: z.string().optional(),
  pharmacyLicense: z.string().optional(),
  taxCertificate: z.string().optional(),
  utilityBill: z.string().optional(),
}).refine((data) => {
  // Pharmacy license is required for PHARMACY customer type
  // This validation will be handled by the parent component
  return true;
});

type BusinessSignupFormData = z.infer<typeof businessSignupSchema>;

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
  const [selectedState, setSelectedState] = useState<string>('');
  
  const form = useForm<BusinessSignupFormData>({
    resolver: zodResolver(businessSignupSchema),
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
    setSelectedState(state);
    form.setValue('state', state);
    form.setValue('lga', ''); // Reset LGA when state changes
  };

  const getLGAOptions = () => {
    if (!selectedState) return [];
    return NIGERIAN_STATES_AND_LGAS[selectedState as keyof typeof NIGERIAN_STATES_AND_LGAS] || [];
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
                      <Input placeholder="Enter your business name" {...field} />
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
                      <Input 
                        type="number" 
                        placeholder="2020" 
                        min="1900"
                        max={new Date().getFullYear()}
                        {...field} 
                      />
                    </FormControl>
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
                          <option value="">Select State</option>
                          {Object.keys(NIGERIAN_STATES_AND_LGAS).map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
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
                          disabled={!selectedState}
                        >
                          <option value="">Select LGA</option>
                          {getLGAOptions().map((lga) => (
                            <option key={lga} value={lga}>
                              {lga}
                            </option>
                          ))}
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
                        <Input placeholder="PCN License Number" {...field} />
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
                      <Input placeholder="Enter your TIN" {...field} />
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => {
                        // File upload logic would go here
                        // For now, we'll just show a placeholder
                        alert(`File upload for ${doc.label} would be implemented here`);
                      }}
                    >
                      <UploadIcon className="size-4 mr-2" />
                      Upload
                    </Button>
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
