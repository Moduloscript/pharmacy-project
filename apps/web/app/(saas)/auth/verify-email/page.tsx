"use client";

import { authClient } from "@repo/auth/client";
import { useSession } from "@saas/auth/hooks/use-session";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { MailboxIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VerifyEmailPage() {
  const { user, reloadSession } = useSession();
  const router = useRouter();

  // Auto-redirect once email gets verified
  useEffect(() => {
    if (!user) return;
    if (user.emailVerified) {
      router.replace("/app");
      return;
    }
    const id = setInterval(async () => {
      try {
        await reloadSession();
      } catch {}
    }, 4000);
    return () => clearInterval(id);
  }, [user?.id, user?.emailVerified]);

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Missing email");
      const { error } = await authClient.sendVerificationEmail({ email: user.email });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Verification email sent. Please check your inbox."),
    onError: () => toast.error("Failed to send verification email. Please try again later."),
  });

  return (
    <div className="max-w-xl mx-auto py-12">
      <Card className="p-8">
        <Alert variant="success" className="mb-6">
          <MailboxIcon className="size-6" />
          <AlertTitle>Check your email to verify your account</AlertTitle>
          <AlertDescription>
            We've sent a verification link to your email. Click the link to verify your account, then return here to continue.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn’t receive the email? Check your spam folder. If it’s not there, wait a minute and try resending.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => toast.promise(resendMutation.mutateAsync(), { loading: "Sending..." })}
            disabled={resendMutation.isPending || !user?.email}
          >
            <RefreshCwIcon className="mr-2 size-4" />
            {resendMutation.isPending ? "Sending..." : "Resend verification email"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
