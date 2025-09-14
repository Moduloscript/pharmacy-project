import { getSession } from "@saas/auth/lib/server";
import { PreferenceManager } from "@saas/settings/components/PreferenceManager";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const t = await getTranslations();

  return {
    title: t("settings.preferences.title") || "Communication Preferences",
  };
}

export default async function PreferencesPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/auth/login");
  }

  return (
    <SettingsList>
      <PreferenceManager userId={session.user.id} />
    </SettingsList>
  );
}
