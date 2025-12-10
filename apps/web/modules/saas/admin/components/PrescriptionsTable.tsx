'use client';

import { useMemo, useState } from 'react';
import { useAdminPrescriptions } from '../hooks/use-prescriptions';
import type { PrescriptionStatus } from '../lib/prescriptions';
import { atom, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { PrescriptionActionDialog } from './PrescriptionActionDialog';
import { PrescriptionFilterToolbar } from './PrescriptionFilterToolbar';
import { PrescriptionDetailsModal } from './PrescriptionDetailsModal';
import { PrescriptionThumbnail } from './PrescriptionThumbnail';
import { StatusChip } from './StatusChip';
import { useRoleAccess, usePermission } from '@saas/auth/hooks/useRoleAccess';
import { cn } from '@ui/lib';
import { AlertCircle, Lock, FileText, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageZoomModal } from './ImageZoomModal';
import { PdfViewerModal } from './PdfViewerModal';

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
    search,
    setSearch,
    hasFile,
    setHasFile,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
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

  const [detailsModalState, setDetailsModalState] = useState<{
    isOpen: boolean;
    prescription: any | null; // Keeping as any for now to facilitate incremental changes, ideally strictly typed
  }>({ isOpen: false, prescription: null });

  const rows = useMemo(() => prescriptions, [prescriptions]);

  // Image viewer state
  const [viewer, setViewer] = useState<{ open: boolean; src: string; filename?: string }>(() => ({ open: false, src: '' }));
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; src: string; filename?: string }>(() => ({ open: false, src: '' }));

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

  const handleDialogConfirm = async (data: { status: string; notes?: string; rejectionReason?: string; clarificationRequest?: string }) => {
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

  const handleViewDetails = (prescription: any) => {
    setDetailsModalState({
      isOpen: true,
      prescription,
    });
  };

  const handleDetailsModalClose = () => {
    setDetailsModalState({ isOpen: false, prescription: null });
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

  // Render-time log of PDF viewer state
  console.log('[PDFModal] PrescriptionsTable render', { open: pdfViewer.open, hasSrc: !!pdfViewer.src, filename: pdfViewer.filename });

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <PrescriptionFilterToolbar
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        hasFile={hasFile}
        onHasFileChange={setHasFile}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={({ startDate, endDate }) => {
          setStartDate(startDate);
          setEndDate(endDate);
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
                        <div className="flex items-center gap-2">
                          <PrescriptionThumbnail prescriptionId={p.id} />
                          {/* Always enable preview; signed URL is resolved on demand */}
                          <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={async (e) => {
                                // Always stop propagation to prevent any parent row/link navigation
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[Preview] onClick fired for', p.id);
                                try {
                                  // Defensive: prevent any parent <a> default navigation to JSON endpoints
                                  try {
                                    const anchor = (e.currentTarget as HTMLElement)?.closest('a') as HTMLAnchorElement | null;
                                    if (anchor && /\/api\/prescriptions\/.+\/file(?!\/redirect)/.test(anchor.href)) {
                                      console.debug('[Preview] Preventing default anchor navigation to JSON endpoint:', anchor.href);
                                      anchor.removeAttribute('href');
                                    }
                                  } catch {}

                                  console.debug('[Preview] Clicked for prescription', p.id, { status: p.status, isPending });
                                  // Ask API for all available files (handles legacy and current)
                                  const res = await fetch(`/api/prescriptions/${p.id}/files`, { credentials: 'include' });
                                  console.debug('[Preview] /files response status', res.status);
                                  if (res.ok) {
                                    const json = await res.json();
                                    const files = json?.data?.files as Array<{ url: string; contentType?: string; key?: string | null; kind?: 'image' | 'pdf' | 'other' } | undefined>;
                                    console.debug('[Preview] files payload', files);
                                    const file = files?.[0];
                                    let url = file?.url || p.fileUrl || '';
                                    // Prefer direct signed URL for PDFs; fallback to proxy if only key is available
                                    if ((file?.kind === 'pdf' || file?.contentType === 'application/pdf')) {
                                      if (file?.url) {
                                        url = file.url;
                                      } else if (file?.key) {
                                        url = `/image-proxy/prescriptions/${encodeURIComponent(file.key)}`;
                                      }
                                    }
                                    // If URL points to JSON endpoint, switch to redirect endpoint
                                    if (/\/api\/prescriptions\/.+\/file$/.test(url) || !url) {
                                      url = `/api/prescriptions/${p.id}/file/redirect`;
                                    }
                                    // Determine if image: contentType OR filename ext OR url ext
                                    const hasImageCt = !!file?.contentType?.startsWith('image/');
                                    const fromFileName = (p.fileName || '').match(/\.(jpg|jpeg|png|gif|webp)$/i) != null;
                                    const fromUrl = /(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url);
                                    let isImage = hasImageCt || fromFileName || fromUrl;
                                    console.debug('[Preview] resolved url', url, { contentType: file?.contentType, isImage, currentTabStatus: status, fileName: p.fileName });

                                    if (!isImage && /\/api\/prescriptions\/.+\/file\/redirect$/.test(url)) {
                                      // We only have a redirect URL; fetch JSON endpoint to inspect fileName and decide if image
                                      try {
                                        const j = await fetch(`/api/prescriptions/${p.id}/file`, { credentials: 'include', headers: { 'Accept': 'application/json' } });
                                        if (j.ok) {
                                          const data = await j.json();
                                          const jsonUrl = data?.data?.url as string | undefined;
                                          const jsonFileName = (data?.data?.fileName as string | undefined) || p.fileName || '';
                                          const isImgByJson = /\.(jpg|jpeg|png|gif|webp)$/i.test(jsonFileName) || /(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(jsonUrl || '');
                                          console.debug('[Preview] refined isImage via JSON /file', { jsonUrl, jsonFileName, isImgByJson });
                                          if (isImgByJson && jsonUrl) {
                                            isImage = true;
                                            url = jsonUrl;
                                          }
                                        }
                                      } catch {}
                                    }

                                    if (isImage) {
                                      // Prefer zoom modal for all images for better UX (especially on Pending tab)
                                      console.log('[Preview] opening image viewer', { url, fileName: p.fileName });
                                      setViewer({ open: true, src: url, filename: p.fileName || 'prescription' });
                                    } else {
                                      const isPdf = (file?.contentType === 'application/pdf') || /\.(pdf)(\?|$)/i.test(p.fileName || '') || /(\.pdf)(\?|$)/i.test(url);
                                      if (isPdf) {
                                        console.log('[Preview] opening PDF viewer', { url, fileName: p.fileName });
                                        // If URL is the redirect endpoint, just use it (same-origin). Otherwise use as-is.
                                        // Do not append query params to presigned URLs (breaks signature)
                                        const isAbsolute = /^https?:\/\//i.test(url);
                                        const src = isAbsolute ? url : `${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
                                        setPdfViewer({ open: true, src, filename: p.fileName || 'document.pdf' });
                                      } else {
                                        console.log('[Preview] opening new tab (non-image/pdf)', { url });
                                        window.open(url, '_blank');
                                      }
                                    }
                                  } else {
                                    console.error('[Preview] /files request failed', res.status, 'attempting JSON /file endpoint');
                                    try {
                                      const j = await fetch(`/api/prescriptions/${p.id}/file`, { credentials: 'include', headers: { 'Accept': 'application/json' } });
                                      if (j.ok) {
                                        const data = await j.json();
                                        let url = data?.data?.url as string | undefined;
                                        const fileName = (data?.data?.fileName as string | undefined) || p.fileName || '';
                                        if (!url) {
                                          console.warn('[Preview] /file returned no url, falling back to redirect');
                                          url = `/api/prescriptions/${p.id}/file/redirect`;
                                        }
                                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName) || /(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url);
                                        console.debug('[Preview] JSON /file resolved', { url, fileName, isImage });
                                        if (isImage) {
                                          console.log('[Preview] opening image viewer via /file JSON fallback', { url, fileName });
                                          setViewer({ open: true, src: url, filename: fileName || 'prescription' });
                                        } else {
                                          console.log('[Preview] opening new tab via /file JSON fallback', { url, fileName });
                                          window.open(url, '_blank');
                                        }
                                      } else {
                                        console.error('[Preview] /file also failed', j.status, 'falling back to redirect');
                                        const fallback = `/api/prescriptions/${p.id}/file/redirect`;
                                        window.open(fallback, '_blank');
                                      }
                                    } catch (e) {
                                      console.error('[Preview] exception calling /file', e);
                                      const fallback = `/api/prescriptions/${p.id}/file/redirect`;
                                      window.open(fallback, '_blank');
                                    }
                                  }
                                } catch (err) {
                                  console.error('[Preview] Exception while opening preview', err);
                                  toast.error('Failed to open preview');
                                }
                              }}
                              disabled={isBusy}
                            >
                              Preview
                            </Button>
                        </div>
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
                                variant="error"
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
                              onClick={() => handleViewDetails(p)}
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

      {/* Prescription Details Modal */}
      <PrescriptionDetailsModal
        prescription={detailsModalState.prescription}
        isOpen={detailsModalState.isOpen}
        onClose={handleDetailsModalClose}
      />

      {/* Image Zoom Viewer */}
      <ImageZoomModal open={viewer.open} src={viewer.src} filename={viewer.filename} onClose={() => setViewer({ open: false, src: '' })} />

      {/* PDF Viewer */}
      <PdfViewerModal open={pdfViewer.open} src={pdfViewer.src} filename={pdfViewer.filename} onClose={() => setPdfViewer({ open: false, src: '' })} />
    </div>
  );
}
