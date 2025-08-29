import { atom } from 'jotai';
import type { CustomerType } from '@saas/auth/components/CustomerTypeSelector';

// Selected customer type during onboarding
export const onboardingCustomerTypeAtom = atom<CustomerType | null>(null);

