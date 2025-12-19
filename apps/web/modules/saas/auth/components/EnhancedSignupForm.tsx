'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@repo/auth/client';
import { config } from '@repo/config';
import { useAuthErrorMessages } from '@saas/auth/hooks/errors-messages';
import { useFormErrors } from '@shared/hooks/form-errors';
import { OrganizationInvitationAlert } from '@saas/organizations/components/OrganizationInvitationAlert';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Input } from '@ui/components/input';
import { Badge } from '@ui/components/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@ui/components/form';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  MailboxIcon,
  PhoneIcon,
  UserIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { withQuery } from 'ufo';
import { CustomerTypeSelector, type CustomerType } from './CustomerTypeSelector';
import { SocialSigninButton } from './SocialSigninButton';
import {
  type OAuthProvider,
  oAuthProviders,
} from '../constants/oauth-providers';

// Step 1: Basic signup form
const basicSignupSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
});

// Step 2: Customer type selection (no additional validation needed)

// Step 3: Personal address for retail customers
const personalAddressSchema = z.object({
  address: z.string().min(10, 'Please enter a complete address'),
  state: z.string().min(1, 'Please select your state'),
  lga: z.string().min(1, 'Please select your Local Government Area'),
});

type BasicSignupFormData = z.infer<typeof basicSignupSchema>;
type PersonalAddressFormData = z.infer<typeof personalAddressSchema>;

// Business address schema (simplified - no document uploads during signup)
const businessAddressSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessPhone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
  businessEmail: z.string().email('Please enter a valid email address'),
  businessAddress: z.string().min(10, 'Please enter a complete business address'),
  state: z.string().min(1, 'Please select your state'),
  lga: z.string().min(1, 'Please select your Local Government Area'),
  licenseNumber: z.string().optional(),
});

type BusinessAddressFormData = z.infer<typeof businessAddressSchema>;

interface EnhancedSignupFormProps {
  prefillEmail?: string;
}

export function EnhancedSignupForm({ prefillEmail }: EnhancedSignupFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { zodErrorMap } = useFormErrors();
  const { getAuthErrorMessage } = useAuthErrorMessages();
  const searchParams = useSearchParams();

  // Multi-step state management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [basicFormData, setBasicFormData] = useState<BasicSignupFormData | null>(null);
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerType>('RETAIL');
  const [personalAddressData, setPersonalAddressData] = useState<PersonalAddressFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks whether sign-up has been initiated on the server (email sent/verification started)
  const [signupInitiated, setSignupInitiated] = useState(false);

  // Form states
  const [showPassword, setShowPassword] = useState(false);

  // URL parameters
  const invitationId = searchParams.get('invitationId');
  const email = searchParams.get('email');
  const redirectTo = searchParams.get('redirectTo');

  const invitationOnlyMode = !config.auth.enableSignup && invitationId;
  const redirectPath = invitationId
    ? `/app/organization-invitation/${invitationId}`
    : (redirectTo ?? '/app/onboarding');

  // Step 1: Basic signup form
  const basicForm = useForm<BasicSignupFormData>({
    resolver: zodResolver(basicSignupSchema, { errorMap: zodErrorMap }),
    defaultValues: {
      name: '',
      email: prefillEmail ?? email ?? '',
      password: '',
      phone: '',
    },
  });

  // Step 3: Personal address form (for retail customers)
  const addressForm = useForm<PersonalAddressFormData>({
    resolver: zodResolver(personalAddressSchema, { errorMap: zodErrorMap }),
    defaultValues: {
      address: '',
      state: '',
      lga: '',
    },
  });

  const NIGERIAN_STATES_AND_LGAS = {
    'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
    'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
    'Abuja': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
    'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
    'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai']
  };

  // Business address form (for business customers - simplified, no uploads)
  const businessForm = useForm<BusinessAddressFormData>({
    resolver: zodResolver(businessAddressSchema, { errorMap: zodErrorMap }),
    defaultValues: {
      businessName: '',
      businessPhone: '',
      businessEmail: '',
      businessAddress: '',
      state: '',
      lga: '',
      licenseNumber: '',
    },
  });

  // Step handlers
  const handleBasicFormSubmit = (data: BasicSignupFormData) => {
    setBasicFormData(data);
    setCurrentStep(2);
  };

  const handleCustomerTypeNext = () => {
    if (selectedCustomerType === 'RETAIL') {
      setCurrentStep(3);
    } else {
      // For business customers, proceed to the business information step
      setCurrentStep(3);
    }
  };

  const handlePersonalAddressSubmit = (data: PersonalAddressFormData) => {
    setPersonalAddressData(data);
    handleFinalSubmission();
  };

  const handleBusinessSubmit = async (data: BusinessAddressFormData) => {
    // Submit business data without document uploads
    // Documents will be collected during onboarding after authentication
    await handleFinalSubmission(data);
  };

  const handleFinalSubmission = async (businessData?: any) => {
    if (!basicFormData) return;

    setIsSubmitting(true);
    try {
      const { error } = await authClient.signUp.email({
        email: basicFormData.email,
        password: basicFormData.password,
        name: basicFormData.name,
        callbackURL: redirectPath,
      });

      if (error) {
        throw error;
      }

      // Mark that the sign-up flow has been initiated (verification email should be sent by server)
      setSignupInitiated(true);

      // TODO: Create customer profile with additional data
      // This would involve calling an API to create the Customer record
      // with the customer type, address, and business information

      if (invitationOnlyMode) {
        await authClient.organization.acceptInvitation({
          invitationId,
        });
        router.push(config.auth.redirectAfterSignIn);
      }
    } catch (e) {
      basicForm.setError('root', {
        message: getAuthErrorMessage(
          e && typeof e === 'object' && 'code' in e
            ? (e.code as string)
            : undefined,
        ),
      });
      // Go back to step 1 to show the error
      setCurrentStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress indicator
  const getStepProgress = () => {
    const totalSteps = selectedCustomerType === 'RETAIL' ? 3 : 
                     selectedCustomerType ? 3 : 2; // Business customers have 3 steps too
    return {
      current: currentStep,
      total: totalSteps,
      percentage: (currentStep / totalSteps) * 100,
    };
  };

  const progress = getStepProgress();

  // Success state (only when sign-up has actually been initiated on the server)
  if (signupInitiated && !invitationOnlyMode) {
    return (
      <div className="text-center">
        <Alert variant="success" className="text-left">
          <MailboxIcon className="size-6" />
          <AlertTitle>
            {t('auth.signup.hints.verifyEmail')}
          </AlertTitle>
          <AlertDescription>
            Please check your email and click the verification link to complete your registration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="font-bold text-3xl md:text-4xl text-foreground">
          Create Your BenPharm Account
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Join Nigeria's leading pharmaceutical distribution platform
        </p>
      </div>

      {invitationId && (
        <OrganizationInvitationAlert className="mb-6" />
      )}

      {/* Progress Indicator */}
      <div className="bg-card rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            Step {progress.current} of {progress.total}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progress.percentage)}% Complete
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto">
          <Card className="border shadow-sm">
            <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <UserIcon className="size-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Personal Information</h2>
              <p className="text-muted-foreground">
                Let's start with your basic details to create your account
              </p>
            </div>

          <Form {...basicForm}>
            <form onSubmit={basicForm.handleSubmit(handleBasicFormSubmit)} className="space-y-6">
              {basicForm.formState.isSubmitted &&
                basicForm.formState.errors.root && (
                  <Alert variant="error">
                    <AlertTriangleIcon className="size-6" />
                    <AlertDescription>
                      {basicForm.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

              <FormField
                control={basicForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={basicForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        autoComplete="email"
                        readOnly={!!prefillEmail}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={basicForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
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
                      Nigerian phone number for order updates and verification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={basicForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          className="pr-10"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary"
                        >
                          {showPassword ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Minimum 8 characters with letters and numbers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 text-base font-medium">
                Continue to Account Type
                <ArrowRightIcon className="ml-2 size-5" />
              </Button>
            </form>
          </Form>

          {/* Social login options */}
          {config.auth.enableSignup && config.auth.enableSocialLogin && (
            <>
              <div className="relative my-8 h-px bg-border">
                <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm font-medium text-muted-foreground">
                  {t('auth.login.continueWith')}
                </p>
              </div>

              <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
                {Object.keys(oAuthProviders).map((providerId) => (
                  <SocialSigninButton
                    key={providerId}
                    provider={providerId as OAuthProvider}
                  />
                ))}
              </div>
            </>
          )}
          </div>
        </Card>
        </div>
      )}

      {/* Step 2: Customer Type Selection */}
      {currentStep === 2 && (
        <div className="w-full mx-auto md:max-w-5xl lg:max-w-6xl">
          <Card className="border shadow-sm">
            <div className="p-8">
              <div className="text-center space-y-3 md:space-y-4 max-w-3xl mx-auto mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Choose Your Account Type
                </h2>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Select the option that best describes your business or needs for proper pricing and verification.
                </p>
              </div>
              
              <CustomerTypeSelector
                value={selectedCustomerType}
                onChange={setSelectedCustomerType}
              />

            <div className="flex flex-col sm:flex-row gap-4 sm:justify-between mt-12">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="order-2 sm:order-1 h-12"
              >
                <ArrowLeftIcon className="mr-2 size-4" />
                Back
              </Button>
              <Button
                onClick={handleCustomerTypeNext}
                disabled={!selectedCustomerType}
                className="order-1 sm:order-2 h-12 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedCustomerType ? 'Continue' : 'Select Account Type'}
                <ArrowRightIcon className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </Card>
        </div>
      )}

      {/* Step 3a: Personal Address (for retail customers) */}
      {currentStep === 3 && selectedCustomerType === 'RETAIL' && (
        <Card className="border shadow-sm">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <UserIcon className="size-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Delivery Address</h2>
              <p className="text-muted-foreground">
                Where should we deliver your pharmaceutical orders?
              </p>
            </div>

          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handlePersonalAddressSubmit)} className="space-y-6">
              <FormField
                control={addressForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complete Address *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your complete address including street, area, and landmarks"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select State</option>
                          {Object.keys(NIGERIAN_STATES_AND_LGAS).map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addressForm.control}
                  name="lga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local Government Area *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={!addressForm.watch('state')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select LGA</option>
                          {addressForm.watch('state') &&
                            NIGERIAN_STATES_AND_LGAS[addressForm.watch('state') as keyof typeof NIGERIAN_STATES_AND_LGAS]?.map(
                              (lga) => (
                                <option key={lga} value={lga}>
                                  {lga}
                                </option>
                              )
                            )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between mt-12">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="order-2 sm:order-1 h-12"
                >
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="order-1 sm:order-2 h-12 text-base font-medium"
                >
                  <CheckIcon className="mr-2 size-5" />
                  Complete Registration
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </Card>
      )}

      {/* Step 3b: Business Information (for business customers) - Simplified, no uploads */}
      {currentStep === 3 && selectedCustomerType !== 'RETAIL' && (
        <Card className="border shadow-sm">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <UserIcon className="size-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Business Information</h2>
              <p className="text-muted-foreground">
                Provide your business details. You'll upload verification documents after signing in.
              </p>
            </div>

            <Form {...businessForm}>
              <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-6">
                <FormField
                  control={businessForm.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="businessPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Phone *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <PhoneIcon className="absolute left-3 top-3 size-4 text-gray-400" />
                            <Input placeholder="+234 808 123 4567" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={businessForm.control}
                    name="businessEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="business@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={businessForm.control}
                  name="businessAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter complete business address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Select State</option>
                            {Object.keys(NIGERIAN_STATES_AND_LGAS).map((state) => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={businessForm.control}
                    name="lga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Government Area *</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            disabled={!businessForm.watch('state')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <option value="">Select LGA</option>
                            {businessForm.watch('state') &&
                              NIGERIAN_STATES_AND_LGAS[businessForm.watch('state') as keyof typeof NIGERIAN_STATES_AND_LGAS]?.map((lga) => (
                                <option key={lga} value={lga}>{lga}</option>
                              ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedCustomerType === 'PHARMACY' && (
                  <FormField
                    control={businessForm.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pharmacy License Number</FormLabel>
                        <FormControl>
                          <Input placeholder="PCN License Number (optional for now)" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your PCN license. You can also provide this during the verification step after signup.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After creating your account, you'll be asked to upload verification documents (CAC certificate, pharmacy license, etc.) to complete your business verification.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="order-2 sm:order-1 h-12"
                  >
                    <ArrowLeftIcon className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    className="order-1 sm:order-2 h-12 text-base font-medium"
                  >
                    <CheckIcon className="mr-2 size-5" />
                    Create Account
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Card>
      )}

      {/* Login link */}
      {currentStep === 1 && (
        <div className="text-center py-6 border-t bg-muted/30">
          <p className="text-muted-foreground mb-2">
            Already have an account?
          </p>
          <Link
            href={withQuery(
              '/auth/login',
              Object.fromEntries(searchParams.entries()),
            )}
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in to your account
            <ArrowRightIcon className="ml-2 size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
