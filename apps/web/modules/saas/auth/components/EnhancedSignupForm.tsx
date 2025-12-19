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
  EyeIcon,
  EyeOffIcon,
  MailboxIcon,
  PhoneIcon,
  UserIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { withQuery } from 'ufo';
import { SocialSigninButton } from './SocialSigninButton';
import {
  type OAuthProvider,
  oAuthProviders,
} from '../constants/oauth-providers';

// Basic signup form schema
const basicSignupSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
});

type BasicSignupFormData = z.infer<typeof basicSignupSchema>;

interface EnhancedSignupFormProps {
  prefillEmail?: string;
}

export function EnhancedSignupForm({ prefillEmail }: EnhancedSignupFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { zodErrorMap } = useFormErrors();
  const { getAuthErrorMessage } = useAuthErrorMessages();
  const searchParams = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupInitiated, setSignupInitiated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // URL parameters
  const invitationId = searchParams.get('invitationId');
  const email = searchParams.get('email');
  const redirectTo = searchParams.get('redirectTo');

  const invitationOnlyMode = !config.auth.enableSignup && invitationId;
  const redirectPath = invitationId
    ? `/app/organization-invitation/${invitationId}`
    : (redirectTo ?? '/app/onboarding');

  const form = useForm<BasicSignupFormData>({
    resolver: zodResolver(basicSignupSchema, { errorMap: zodErrorMap }),
    defaultValues: {
      name: '',
      email: prefillEmail ?? email ?? '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (data: BasicSignupFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: redirectPath,
      });

      if (error) {
        throw error;
      }

      setSignupInitiated(true);

      if (invitationOnlyMode) {
        await authClient.organization.acceptInvitation({
          invitationId,
        });
        router.push(config.auth.redirectAfterSignIn);
      }
    } catch (e) {
      form.setError('root', {
        message: getAuthErrorMessage(
          e && typeof e === 'object' && 'code' in e
            ? (e.code as string)
            : undefined,
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="max-w-2xl mx-auto">
        <Card className="border shadow-sm">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <UserIcon className="size-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Personal Information</h2>
              <p className="text-muted-foreground">
                Enter your details to create your account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {form.formState.isSubmitted &&
                  form.formState.errors.root && (
                    <Alert variant="error">
                      <AlertTriangleIcon className="size-6" />
                      <AlertDescription>
                        {form.formState.errors.root.message}
                      </AlertDescription>
                    </Alert>
                  )}

                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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

                <Button type="submit" loading={isSubmitting} className="w-full h-12 text-base font-medium">
                  Create Account
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
    </div>
  );
}
