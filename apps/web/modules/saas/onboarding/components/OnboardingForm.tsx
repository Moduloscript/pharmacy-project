"use client";
import { authClient } from "@repo/auth/client";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { Progress } from "@ui/components/progress";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { withQuery } from "ufo";
import { OnboardingStep1 } from "./OnboardingStep1";
import { useState } from "react";
import { CustomerTypeSelector, type CustomerType } from "@saas/auth/components/CustomerTypeSelector";
import { BusinessSignupForm } from "@saas/auth/components/BusinessSignupForm";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Button } from "@ui/components/button";
import { Alert, AlertDescription } from "@ui/components/alert";
import { AlertTriangleIcon } from "lucide-react";

// Retail (individual) address/phone schema
const retailSchema = z.object({
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number'),
  address: z.string().min(10, 'Please enter a complete address'),
  state: z.string().min(1, 'Please select your state'),
  lga: z.string().min(1, 'Please select your Local Government Area'),
});

type RetailFormData = z.infer<typeof retailSchema>;

// Nigerian states and LGAs (subset used elsewhere for consistency)
const NIGERIAN_STATES_AND_LGAS: Record<string, string[]> = {
  'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Abuja': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
  'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai']
};

export function OnboardingForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepSearchParam = searchParams.get("step");
  const redirectTo = searchParams.get("redirectTo");
  const onboardingStep = stepSearchParam
    ? Number.parseInt(stepSearchParam, 10)
    : 1;

  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const retailForm = useForm<RetailFormData>({
    resolver: zodResolver(retailSchema),
    defaultValues: { phone: "", address: "", state: "", lga: "" },
  });

  const setStep = (step: number) => {
    router.replace(
      withQuery(window.location.search ?? "", {
        step,
      }),
    );
  };

  const finishOnboarding = async () => {
    await authClient.updateUser({ onboardingComplete: true });
    await clearCache();
    router.replace(redirectTo ?? "/app");
  };

  async function createCustomerProfile(payload: any) {
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/customers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create customer profile");
      }
      await finishOnboarding();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to create customer profile");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {errorMessage && (
            <Alert variant="error">
              <AlertTriangleIcon className="size-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Form {...retailForm}>
            <form
              onSubmit={retailForm.handleSubmit(async (data) => {
                await createCustomerProfile({
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
                <Button type="submit" loading={isSubmitting}>Complete Registration</Button>
              </div>
            </form>
          </Form>
        </div>
      );
    }

    // Business customer
    return (
      <div className="space-y-6">
        {errorMessage && (
          <Alert variant="error">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <BusinessSignupForm
          customerType={customerType}
          isSubmitting={isSubmitting}
          onSubmit={async (biz) => {
            await createCustomerProfile({
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
