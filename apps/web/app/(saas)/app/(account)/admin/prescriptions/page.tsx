import { PrescriptionsTable } from '@saas/admin/components/PrescriptionsTable';
import { AdminPageContainer } from '@saas/admin/components/AdminPageContainer';
import { cn } from '@ui/lib';

export default function AdminPrescriptionsPage() {
  return (
    <AdminPageContainer maxWidth="6xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--rx-text)' }}>
            Prescription Verification
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--rx-muted)' }}>
            Review and verify customer prescriptions for prescription-only medications.
          </p>
        </div>
        
        {/* Main Content */}
        <PrescriptionsTable />
      </div>
    </AdminPageContainer>
  );
}
