'use client';

import { useMemo, useState } from 'react';
import { useAdminPrescriptions } from '../hooks/use-prescriptions';
import type { PrescriptionStatus } from '../lib/prescriptions';
import { atom, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { PrescriptionActionDialog } from './PrescriptionActionDialog';
import { PrescriptionFilterToolbar } from './PrescriptionFilterToolbar';
import { StatusChip } from './StatusChip';
import { useRoleAccess, usePermission } from '@saas/auth/hooks/useRoleAccess';
import { cn } from '@ui/lib';
import { AlertCircle, Lock, FileText, Eye, Loader2 } from 'lucide-react';

const localBusyAtom = atom<string | null>(null);

const statusLabels: Record<PrescriptionStatus, string> = {
  PENDING_VERIFICATION: 'Pending Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_CLARIFICATION: 'Needs Clarification',
};

const statuses: PrescriptionStatus[] = [
  'PENDING_VERIFICATION',
  'APPROVED',
  'REJECTED',
  'NEEDS_CLARIFICATION',
];

export function PrescriptionsTable() {
  // Check user role and permissions
  const { hasAccess, userRole, isLoading: isLoadingAuth } = useRoleAccess({
    allowedRoles: ['admin', 'pharmacist'],
    redirectTo: '/app'
  });
  
  const { hasPermission: canApprove } = usePermission('prescriptions.approve');
  const { hasPermission: canReject } = usePermission('prescriptions.reject');
  const { hasPermission: canClarify } = usePermission('prescriptions.clarify');

  const {
    status,
    setStatus,
    prescriptions,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateStatus,
    isUpdating,
  } = useAdminPrescriptions();

  const [busyId, setBusyId] = useAtom(localBusyAtom);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | 'clarify' | null;
    prescriptionId: string;
    orderNumber: string;
  }>({ isOpen: false, action: null, prescriptionId: '', orderNumber: '' });

  const rows = useMemo(() => prescriptions, [prescriptions]);

  const handleApprove = (id: string, orderNumber: string) => {
    setDialogState({
      isOpen: true,
      action: 'approve',
      prescriptionId: id,
      orderNumber,
    });
  };

  const handleReject = (id: string, orderNumber: string) => {
    setDialogState({
      isOpen: true,
      action: 'reject',
      prescriptionId: id,
      orderNumber,
    });
  };

  const handleClarify = (id: string, orderNumber: string) => {
    setDialogState({
      isOpen: true,
      action: 'clarify',
      prescriptionId: id,
      orderNumber,
    });
  };

  const handleDialogConfirm = async (data: any) => {
    console.log('handleDialogConfirm called with data:', data);
    setBusyId(dialogState.prescriptionId);
    
    try {
      // Map dialog data to the expected format for updateStatus
      if (data.status === 'APPROVED') {
        updateStatus({ 
          id: dialogState.prescriptionId, 
          nextStatus: 'APPROVED',
          notes: data.notes 
        });
      } else if (data.status === 'REJECTED') {
        updateStatus({ 
          id: dialogState.prescriptionId, 
          nextStatus: 'REJECTED', 
          rejectionReason: data.rejectionReason,
          notes: data.notes 
        });
      } else if (data.status === 'CLARIFICATION_REQUESTED') {
        updateStatus({ 
          id: dialogState.prescriptionId, 
          nextStatus: 'NEEDS_CLARIFICATION', 
          notes: data.clarificationRequest 
        });
      }
      
      setDialogState({ isOpen: false, action: null, prescriptionId: '', orderNumber: '' });
    } catch (error) {
      console.error('Error in handleDialogConfirm:', error);
      setBusyId(null);
      // You might want to show an error toast here
    }
  };

  const handleDialogClose = () => {
    setDialogState({ isOpen: false, action: null, prescriptionId: '', orderNumber: '' });
  };

  // Show loading state while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--rx-muted)' }} />
      </div>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!hasAccess) {
    return (
      <div className="rounded-lg border p-8" style={{ backgroundColor: 'var(--rx-surface)', borderColor: 'var(--rx-border)' }}>
        <div className="flex flex-col items-center space-y-4">
          <Lock className="h-12 w-12" style={{ color: 'var(--rx-muted)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--rx-text)' }}>Access Denied</h3>
          <p className="text-center" style={{ color: 'var(--rx-muted)' }}>
            You don't have permission to view prescription verifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <PrescriptionFilterToolbar
        status={status}
        onStatusChange={setStatus}
        onSearchChange={(search) => {
          // TODO: Implement search functionality
          console.log('Search:', search);
        }}
      />

      {/* Table Container */}
      <div className="rounded-lg border overflow-hidden" style={{ 
        backgroundColor: 'var(--rx-surface)', 
        borderColor: 'var(--rx-border)' 
      }}>
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--rx-muted)' }} />
          </div>
        )}
        
        {isError && (
          <div className="flex items-center gap-2 p-4 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load prescriptions. Please try again.</span>
          </div>
        )}
        
        {!isLoading && !isError && rows.length === 0 && (
          <div className="flex flex-col items-center p-8" style={{ color: 'var(--rx-muted)' }}>
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">No prescriptions found for this status.</p>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="rx-table">
              <thead>
                <tr>
                  <th className="w-[160px]">Date</th>
                  <th className="w-[160px]">Order #</th>
                  <th className="w-[280px]">Customer</th>
                  <th className="w-[140px]">File</th>
                  <th className="w-[180px]">Status</th>
                  <th className="w-[200px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const isPending = p.status === 'PENDING_VERIFICATION';
                  const orderNumber = p.order?.orderNumber || p.orderId;
                  const isBusy = isUpdating && busyId === p.id;
                  
                  return (
                    <tr key={p.id} className={cn("group", isBusy && "opacity-60")}>
                      <td className="whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium" style={{ color: 'var(--rx-text)' }}>
                            {new Date(p.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--rx-muted)' }}>
                            {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-mono text-sm" style={{ color: 'var(--rx-text)' }}>
                        {orderNumber}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium truncate max-w-[240px]" style={{ color: 'var(--rx-text)' }} title={p.customer?.user?.name || ''}>
                            {p.customer?.user?.name || 'Unknown Customer'}
                          </div>
                          <div className="text-xs truncate max-w-[240px]" style={{ color: 'var(--rx-muted)' }} title={p.customer?.user?.email || ''}>
                            {p.customer?.user?.email || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {p.fileUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(p.fileUrl, '_blank')}
                            disabled={isBusy}
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--rx-muted)' }}>No file</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusChip status={p.status} />
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {isPending ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(p.id, orderNumber)}
                                disabled={!canApprove || isBusy}
                                title={!canApprove ? 'You don\'t have permission to approve prescriptions' : ''}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReject(p.id, orderNumber)}
                                disabled={!canReject || isBusy}
                                title={!canReject ? 'You don\'t have permission to reject prescriptions' : ''}
                              >
                                Disapprove
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClarify(p.id, orderNumber)}
                                disabled={!canClarify || isBusy}
                                title={!canClarify ? 'You don\'t have permission to request clarification' : ''}
                              >
                                Clarify
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Open details drawer
                                console.log('View details for', p.id);
                              }}
                              disabled={isBusy}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasNextPage && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--rx-border)' }}>
            <div className="flex justify-center">
              <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Prescription Action Dialog */}
      <PrescriptionActionDialog
        isOpen={dialogState.isOpen}
        onClose={handleDialogClose}
        action={dialogState.action}
        prescriptionId={dialogState.prescriptionId}
        orderNumber={dialogState.orderNumber}
        onConfirm={handleDialogConfirm}
      />
    </div>
  );
}
