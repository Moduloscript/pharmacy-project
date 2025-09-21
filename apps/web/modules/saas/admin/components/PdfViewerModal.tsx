'use client';

import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/components/dialog';
import { Button } from '@ui/components/button';

const DynamicPdfDoc = dynamic(() => import('./PdfDoc'), { ssr: false });

interface PdfViewerModalProps {
  open: boolean;
  src: string; // PDF URL
  filename?: string;
  onClose: () => void;
}

export function PdfViewerModal({ open, src, filename, onClose }: PdfViewerModalProps) {
  function download() {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename || 'document.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0" aria-describedby="pdf-desc">
        <DialogHeader className="px-4 py-2 flex items-center justify-between gap-3">
          <DialogTitle>PDF Preview</DialogTitle>
          <div className="flex items-center gap-2 min-w-0">
            {filename ? (
              <span className="text-xs text-muted-foreground truncate max-w-[320px]" title={filename}>
                {filename}
              </span>
            ) : null}
            <Button size="sm" variant="outline" onClick={download}>Download</Button>
          </div>
        </DialogHeader>
        <DialogDescription id="pdf-desc" className="sr-only">PDF document viewer</DialogDescription>
        <div className="w-full h-[calc(90vh-64px)] p-2">
          {open ? <DynamicPdfDoc fileUrl={src} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
