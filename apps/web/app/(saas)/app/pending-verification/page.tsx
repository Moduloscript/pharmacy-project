import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { Card } from "@ui/components/card";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { ShieldAlertIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PendingVerificationPage() {
  const session = await getSession();
  if (!session) {
    return redirect("/auth/login");
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="p-8 space-y-6">
        <Alert variant="warning">
          <ShieldAlertIcon className="size-6" />
          <AlertTitle>Your account is pending approval</AlertTitle>
          <AlertDescription>
            Thanks for providing your business details. Our admin team is reviewing your information. You'll be notified once your account is approved. You can still update your profile and settings in the meantime.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          If you believe this is taking too long, please contact support.
        </p>
      </Card>
    </div>
  );
}
