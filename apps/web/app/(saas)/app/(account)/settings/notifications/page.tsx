import { getSession } from "@saas/auth/lib/server";
import { NotificationSettings } from "@saas/settings/components/NotificationSettings";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const t = await getTranslations();

  return {
    title: t("settings.notifications.title") || "Notification Preferences",
  };
}

export default async function NotificationSettingsPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/auth/login");
  }

  return (
    <SettingsList>
      <NotificationSettings />
    </SettingsList>
  );
}
