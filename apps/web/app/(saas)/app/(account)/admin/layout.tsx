import { config } from "@repo/config";
import { getSession } from "@saas/auth/lib/server";
import { SettingsMenu } from "@saas/settings/components/SettingsMenu";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { SidebarContentLayout } from "@saas/shared/components/SidebarContentLayout";
import { Logo } from "@shared/components/Logo";
import { 
	Building2Icon, 
	UsersIcon, 
	LayoutDashboard,
	ShoppingCartIcon,
	UsersIcon as CustomersIcon,
	PackageIcon,
	FileTextIcon
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function AdminLayout({ children }: PropsWithChildren) {
	const t = await getTranslations();
	const session = await getSession();

	if (!session) {
		return redirect("/auth/login");
	}

	// Allow both admin and pharmacist into the admin workspace
	if (session.user?.role !== "admin" && session.user?.role !== "pharmacist") {
		redirect("/app");
	}

	return (
		<>
			<PageHeader
				title={t("admin.title")}
				subtitle={t("admin.description")}
			/>
			<SidebarContentLayout
				sidebar={
					<SettingsMenu
						menuItems={[
							{
								avatar: (
									<Logo
										className="size-8"
										withLabel={false}
									/>
								),
								title: t("admin.title"),
								items: ((): any[] => {
									const base: any[] = [
										{
											title: "Dashboard",
											href: "/app/admin",
											icon: (
												<LayoutDashboard className="size-4 opacity-50" />
											),
										},
										{
											title: "Orders",
											href: "/app/admin/orders",
											icon: (
												<ShoppingCartIcon className="size-4 opacity-50" />
											),
										},
										{
											title: "Prescriptions",
											href: "/app/admin/prescriptions",
											icon: (
												<FileTextIcon className="size-4 opacity-50" />
											),
										},
									];
									// Admins see full menu; pharmacists see a limited set
									if (session.user?.role === "admin") {
										base.splice(1, 0,
											{
												title: t("admin.menu.users"),
												href: "/app/admin/users",
												icon: (
													<UsersIcon className="size-4 opacity-50" />
												),
											},
											{
												title: "Customers",
												href: "/app/admin/customers",
												icon: (
													<CustomersIcon className="size-4 opacity-50" />
												),
											},
											{
												title: "Inventory",
												href: "/app/admin/inventory",
												icon: (
													<PackageIcon className="size-4 opacity-50" />
												),
											}
										);
										if (config.organizations.enable) {
											base.push({
												title: t("admin.menu.organizations"),
												href: "/app/admin/organizations",
												icon: (
													<Building2Icon className="size-4 opacity-50" />
												),
											});
										}
									}
									return base;
								})(),
							},
						]}
					/>
				}
			>
				{children}
			</SidebarContentLayout>
		</>
	);
}
