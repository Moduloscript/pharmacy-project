import { OrganizationList } from "@saas/admin/component/organizations/OrganizationList";
import { AdminPageContainer } from "@saas/admin/components/AdminPageContainer";

export default function AdminOrganizationsPage() {
	return (
		<AdminPageContainer maxWidth="5xl">
			<OrganizationList />
		</AdminPageContainer>
	);
}
