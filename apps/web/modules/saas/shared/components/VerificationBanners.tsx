'use client';

import Link from 'next/link';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@saas/auth/hooks/use-session';
import { emailBannerDismissedAtom, pendingBannerDismissedAtom } from '../state/verification-banners';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
import { Button } from '@ui/components/button';
import { MailboxIcon, ShieldAlertIcon, XIcon } from 'lucide-react';

interface ProfileInfo {
  needsProfile?: boolean;
  customerType?: 'RETAIL' | 'WHOLESALE' | 'PHARMACY' | 'CLINIC' | null;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | null;
}

export function VerificationBanners() {
  const { user } = useSession();
  const [emailDismissed, setEmailDismissed] = useAtom(emailBannerDismissedAtom);
  const [pendingDismissed, setPendingDismissed] = useAtom(pendingBannerDismissedAtom);

  const profileQuery = useQuery<ProfileInfo>({
    queryKey: ['customers', 'profile'],
    queryFn: async () => {
      const res = await fetch('/api/customers/profile', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
    enabled: Boolean(user && user.emailVerified),
    staleTime: 60_000, // 1 min
  });

  if (!user) return null;

  // Email not verified banner (local UI state via Jotai)
  if (!user.emailVerified && !emailDismissed) {
    return (
      <div className="container px-4 sm:px-6 lg:px-8 py-3">
        <Alert variant="warning">
          <MailboxIcon className="size-5" />
          <div className="flex-1">
            <AlertTitle>Email verification required</AlertTitle>
            <AlertDescription>
              Please verify your email to continue. Check your inbox, then go to{' '}
              <Link href="/auth/verify-email" className="underline font-medium">Verify Email</Link>.
            </AlertDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEmailDismissed(true)} aria-label="Dismiss">
            <XIcon className="size-4" />
          </Button>
        </Alert>
      </div>
    );
  }

  // Only consider business approval banner if email is verified
  const data = profileQuery.data;
  const ct = data?.customerType;
  const vs = data?.verificationStatus;

  if (
    user.emailVerified &&
    !profileQuery.isLoading &&
    data &&
    !data.needsProfile &&
    ct && ct !== 'RETAIL' &&
    vs !== 'VERIFIED' &&
    !pendingDismissed
  ) {
    return (
      <div className="container px-4 sm:px-6 lg:px-8 py-3">
        <Alert variant="warning">
          <ShieldAlertIcon className="size-5" />
          <div className="flex-1">
            <AlertTitle>Business account pending approval</AlertTitle>
            <AlertDescription>
              Your business account is awaiting admin approval. Learn more on{' '}
              <Link href="/app/pending-verification" className="underline font-medium">Pending Verification</Link>.
            </AlertDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPendingDismissed(true)} aria-label="Dismiss">
            <XIcon className="size-4" />
          </Button>
        </Alert>
      </div>
    );
  }

  return null;
}
