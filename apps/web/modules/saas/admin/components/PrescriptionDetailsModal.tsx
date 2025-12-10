'use client';

import { useEffect, useState } from 'react';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/components/dialog';
import { PdfViewerModal } from './PdfViewerModal';
import { Separator } from '@ui/components/separator';
import {
  FileText,
  User,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@ui/lib';
import type { AdminPrescription } from '../lib/prescriptions';

interface PrescriptionDetailsModalProps {
  prescription: AdminPrescription | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  REJECTED: {
    label: 'Rejected',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  NEEDS_CLARIFICATION: {
    label: 'Needs Clarification',
    icon: MessageSquare,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
};

export function PrescriptionDetailsModal({
  prescription,
  isOpen,
  onClose,
}: PrescriptionDetailsModalProps) {
  const [imageError, setImageError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(prescription?.fileUrl || '');
  const [previewKind, setPreviewKind] = useState<'image' | 'pdf' | 'other' | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | undefined>(undefined);
  const [previewExists, setPreviewExists] = useState<boolean>(true);
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; src: string; filename?: string }>({ open: false, src: '' });

  useEffect(() => {
    if (!prescription) return;
    let cancelled = false;
    async function refresh() {
      try {
        // Prefer the list endpoint which handles legacy imageUrl and documentKey
        const res = await fetch(`/api/prescriptions/${prescription?.id}/files`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const f = json?.data?.files?.[0];
          const url = f?.url || prescription?.fileUrl || '';
          if (!cancelled) {
            setPreviewUrl(url);
            setPreviewContentType(f?.contentType || undefined);
            const inferredKind = (f?.kind as ('image' | 'pdf' | 'other' | undefined))
              || (f?.contentType?.startsWith?.('image/') ? 'image' : (f?.contentType === 'application/pdf' ? 'pdf' : undefined));
            if (inferredKind) {
              setPreviewKind(inferredKind);
            } else {
              // Fallback by extension
              if (/\.(pdf)(\?|$)/i.test(url)) setPreviewKind('pdf');
              else if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url)) setPreviewKind('image');
              else setPreviewKind('other');
            }
            setPreviewExists(f?.exists !== false);
          }
        } else {
          if (!cancelled) {
            const url = prescription?.fileUrl || '';
            setPreviewUrl(url);
            // Fallback inference by URL
            if (/\.(pdf)(\?|$)/i.test(url)) setPreviewKind('pdf');
            else if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url)) setPreviewKind('image');
            else setPreviewKind('other');
          }
        }
      } catch {
        if (!cancelled) {
          const url = prescription?.fileUrl || '';
          setPreviewUrl(url);
          if (/\.(pdf)(\?|$)/i.test(url)) setPreviewKind('pdf');
          else if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url)) setPreviewKind('image');
          else setPreviewKind('other');
        }
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [prescription?.id]);
  
  if (!prescription) return null;

  const statusInfo = statusConfig[prescription.status];
  const StatusIcon = statusInfo.icon;

  const handleViewOrder = () => {
    if (prescription.orderId) {
      window.open(`/app/admin/orders/${prescription.orderId}`, '_blank');
    }
  };

  const handlePreviewFile = async (e?: React.MouseEvent) => {
    try {
      // Always stop propagation
      e?.preventDefault();
      e?.stopPropagation();
      try {
        const anchor = (e?.currentTarget as HTMLElement | undefined)?.closest?.('a') as HTMLAnchorElement | null;
        if (anchor && /\/api\/prescriptions\/.+\/file(?!\/redirect)/.test(anchor.href)) {
          console.debug('[Details Preview] Preventing default anchor navigation to JSON endpoint:', anchor.href);
          anchor.removeAttribute('href');
        }
      } catch {}

      // If we already know it's a PDF and have a URL, open the PDF viewer immediately
      if (previewKind === 'pdf' && previewUrl) {
        setPdfViewer({ open: true, src: previewUrl, filename: prescription?.fileName || 'document.pdf' });
        return;
      }

      console.debug('[Details Preview] Fetching files for', prescription.id);
      const res = await fetch(`/api/prescriptions/${prescription.id}/files`, { credentials: 'include' });
      console.debug('[Details Preview] /files status', res.status);
      if (res.ok) {
        const json = await res.json();
        const file = json?.data?.files?.[0] as { url?: string; key?: string | null; kind?: 'image' | 'pdf' | 'other'; contentType?: string } | undefined;
        let url = file?.url || previewUrl || prescription?.fileUrl;
        const fileName = prescription?.fileName || '';
        console.debug('[Details Preview] resolved url', url, { contentType: file?.contentType, key: file?.key, kind: file?.kind });
        if (url) {
          const isPdf = (file?.kind === 'pdf') || (file?.contentType === 'application/pdf') || /\.(pdf)(\?|$)/i.test(fileName) || /(\.pdf)(\?|$)/i.test(url);
          if (isPdf) {
            // Prefer direct signed URL when available to avoid any proxy interop issues
            if (file?.url) {
              url = file.url;
            } else if (file?.key) {
              url = `/image-proxy/prescriptions/${encodeURIComponent(file.key)}`;
            }
            // IMPORTANT: Do not append query params to presigned URLs (breaks signature)
            const isAbsolute = /^https?:\/\//i.test(url);
            const finalUrl = isAbsolute ? url : `${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
            setPdfViewer({ open: true, src: finalUrl, filename: fileName || 'document.pdf' });
          } else {
            window.open(url, '_blank');
          }
        }
      } else if (previewUrl) {
        console.warn('[Details Preview] /files failed, falling back to previewUrl');
        window.open(previewUrl, '_blank');
      }
    } catch (err) {
      console.error('[Details Preview] Exception opening preview', err);
      if (previewUrl) window.open(previewUrl, '_blank');
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prescription Details
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="space-y-6 pr-4">
            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Status</h3>
              <div className="flex items-center gap-3">
                <Badge className={cn('px-3 py-1', statusInfo.color)}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusInfo.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last updated: {new Date(prescription.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Order Number
                  </div>
                  <div className="font-mono text-sm">
                    {prescription.order?.orderNumber || prescription.orderId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Customer
                  </div>
                  <div>
                    <div className="font-medium">
                      {prescription.customer?.user?.name || 'Unknown Customer'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {prescription.customer?.user?.email || '—'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Submitted Date
                  </div>
                  <div className="text-sm">
                    {new Date(prescription.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    File Name
                  </div>
                  <div className="text-sm font-mono">
                    {prescription.fileName || 'No file name'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* File Preview */}
            {(previewUrl || prescription?.fileUrl) && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Prescription File</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewFile}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    {!imageError && (previewKind === 'image' || (previewUrl || '').match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) ? (
                      <img
                        src={previewUrl}
                        alt="Prescription"
                        className="max-w-full h-auto max-h-96 mx-auto rounded-lg shadow-sm"
                        onError={() => setImageError(true)}
                      />
                    ) : (previewKind === 'pdf' || ((previewUrl || '').match(/\.(pdf)(\?|$)/i))) ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-2">
                          PDF file detected
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click the button below to preview the PDF
                        </p>
                        <Button variant="outline" onClick={() => {
                          const isAbsolute = /^https?:\/\//i.test(previewUrl || '');
                          const src = isAbsolute ? (previewUrl || '') : `${previewUrl}${(previewUrl || '').includes('?') ? '&' : '?'}nocache=${Date.now()}`;
                          setPdfViewer({ open: true, src, filename: prescription?.fileName || 'document.pdf' });
                        }} className="gap-2">
                          <Eye className="h-4 w-4" />
                          Preview PDF
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-2">
                          File preview not available
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click the button above to view the file
                        </p>
                        <Button variant="outline" onClick={handlePreviewFile} className="gap-2">
                          <Eye className="h-4 w-4" />
                          View File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Notes and Reasons */}
            {(prescription.notes || prescription.rejectionReason) && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  
                  {prescription.rejectionReason && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        Rejection Reason
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-900 dark:text-red-100">
                          {prescription.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {prescription.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg">
                        <p className="text-sm">
                          {prescription.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Technical Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Prescription ID
                  </div>
                  <div className="font-mono text-xs">
                    {prescription.id}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Order ID
                  </div>
                  <div className="font-mono text-xs">
                    {prescription.orderId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Customer ID
                  </div>
                  <div className="font-mono text-xs">
                    {prescription.customerId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Created At
                  </div>
                  <div className="text-xs">
                    {new Date(prescription.createdAt).toISOString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {prescription.orderId && (
            <Button variant="outline" onClick={handleViewOrder} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Related Order
            </Button>
          )}
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* PDF Viewer Modal */}
    <PdfViewerModal open={pdfViewer.open} src={pdfViewer.src} filename={pdfViewer.filename} onClose={() => setPdfViewer({ open: false, src: '' })} />
  </>
  );
}
