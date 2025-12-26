import { UserList } from "@saas/admin/component/users/UserList";
import { AdminPageContainer } from "@saas/admin/components/AdminPageContainer";

export default function AdminUserPage() {
	return (
		<AdminPageContainer maxWidth="5xl">
			<UserList />
		</AdminPageContainer>
	);
}
