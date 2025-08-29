"use client";
import { authClient } from "@repo/auth/client";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { Progress } from "@ui/components/progress";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { OnboardingStep1 } from "./OnboardingStep1";
import { CustomerTypeSelector } from "@saas/auth/components/CustomerTypeSelector";
import { BusinessSignupForm } from "@saas/auth/components/BusinessSignupForm";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Button } from "@ui/components/button";
import { Alert, AlertDescription } from "@ui/components/alert";
import { AlertTriangleIcon } from "lucide-react";
import { useAtom } from 'jotai';
import { onboardingCustomerTypeAtom, onboardingStepAtom } from "../state";
import { useMutation } from "@tanstack/react-query";

// Retail (individual) address/phone schema
const retailSchema = z.object({
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
  address: z.string().min(10, 'Please enter a complete address'),
  state: z.string().min(1, 'Please select your state'),
  lga: z.string().min(1, 'Please select your Local Government Area'),
});

type RetailFormData = z.infer<typeof retailSchema>;

import { NIGERIAN_STATES_AND_LGAS } from "@shared/lib/nigeria";

// Nigerian states and LGAs are imported from shared lib

export function OnboardingForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirectTo");
  const [onboardingStep, setOnboardingStep] = useAtom(onboardingStepAtom);

  const [customerType, setCustomerType] = useAtom(onboardingCustomerTypeAtom);

  const retailForm = useForm<RetailFormData>({
    resolver: zodResolver(retailSchema),
    defaultValues: { phone: "", address: "", state: "", lga: "" },
  });

  const setStep = (step: number) => {
    setOnboardingStep(step);
  };

  const updateOnboardingMutation = useMutation({
    mutationFn: async () => {
      await authClient.updateUser({ onboardingComplete: true });
    },
    onSuccess: async () => {
      await clearCache();
      router.replace(redirectTo ?? "/app");
    }
  });

  const createCustomerProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/customers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create customer profile");
      }
      return res.json();
    },
    onSuccess: async () => {
      await updateOnboardingMutation.mutateAsync();
    }
  });

  // Steps definition
  const steps = [1, 2, 3]; // 1: name/avatar, 2: type, 3: details & submit

  const renderStep = () => {
    if (onboardingStep === 1) {
      return <OnboardingStep1 onNext={() => setStep(2)} />;
    }

    if (onboardingStep === 2) {
      return (
        <div className="space-y-6">
          <CustomerTypeSelector value={customerType ?? undefined as any} onChange={setCustomerType} />
          <div className="flex justify-end">
            <Button onClick={() => setStep(3)} disabled={!customerType}>Continue</Button>
          </div>
        </div>
      );
    }

    // Step 3
    if (!customerType || customerType === 'RETAIL') {
      // Retail form
      const state = retailForm.watch('state');
      return (
        <div className="space-y-6">
          {(createCustomerProfileMutation.isError || updateOnboardingMutation.isError) && (
            <Alert variant="error">
              <AlertTriangleIcon className="size-4" />
              <AlertDescription>{(createCustomerProfileMutation.error as Error)?.message || (updateOnboardingMutation.error as Error)?.message}</AlertDescription>
            </Alert>
          )}
          <Form {...retailForm}>
            <form
              onSubmit={retailForm.handleSubmit(async (data) => {
                await createCustomerProfileMutation.mutateAsync({
                  customerType: 'RETAIL',
                  phone: data.phone,
                  address: data.address,
                  state: data.state,
                  lga: data.lga,
                });
              })}
              className="space-y-4"
            >
              <FormField
                control={retailForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+234 808 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={retailForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Street, area, landmark" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={retailForm.control}
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
                          {Object.keys(NIGERIAN_STATES_AND_LGAS).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={retailForm.control}
                  name="lga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LGA *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={!state}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                          <option value="">Select LGA</option>
                          {(state ? NIGERIAN_STATES_AND_LGAS[state] : [])?.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={createCustomerProfileMutation.isPending || updateOnboardingMutation.isPending}>Complete Registration</Button>
              </div>
            </form>
          </Form>
        </div>
      );
    }

    // Business customer
    return (
      <div className="space-y-6">
        {(createCustomerProfileMutation.isError || updateOnboardingMutation.isError) && (
          <Alert variant="error">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>{(createCustomerProfileMutation.error as Error)?.message || (updateOnboardingMutation.error as Error)?.message}</AlertDescription>
          </Alert>
        )}
        <BusinessSignupForm
          customerType={customerType}
          isSubmitting={createCustomerProfileMutation.isPending || updateOnboardingMutation.isPending}
          onSubmit={async (biz) => {
            await createCustomerProfileMutation.mutateAsync({
              customerType,
              // required phone for profile: derive from businessPhone
              phone: biz.businessPhone,
              // business details
              businessName: biz.businessName,
              businessAddress: biz.businessAddress,
              businessPhone: biz.businessPhone,
              businessEmail: biz.businessEmail,
              state: biz.state,
              lga: biz.lga,
              // map license number to pharmacyLicense field when applicable
              pharmacyLicense: biz.licenseNumber ?? (biz as any).pharmacyLicense,
              taxId: biz.taxId,
              // TODO: handle uploads when implemented; for now skip verificationDocuments
            });
          }}
        />
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-bold text-2xl md:text-3xl">
        {t("onboarding.title")}
      </h1>
      <p className="mt-2 mb-6 text-foreground/60">
        {t("onboarding.message")}
      </p>

      {steps.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <Progress value={(onboardingStep / steps.length) * 100} className="h-2" />
          <span className="shrink-0 text-foreground/60 text-xs">
            {t("onboarding.step", { step: onboardingStep, total: steps.length })}
          </span>
        </div>
      )}

      {renderStep()}
    </div>
  );
}
