'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components/button';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { loadPdfjs } from '@/lib/pdfjs';

interface PdfViewerModalProps {
  open: boolean;
  src: string; // Signed URL or proxy URL
  filename?: string;
  onClose: () => void;
}

export function PdfViewerModal({ open, src, filename, onClose }: PdfViewerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [doc, setDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(true);
  const [rendering, setRendering] = useState(false);

  // Load pdfjs lazily
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const lib = await loadPdfjs();
        if (!mounted) return;
        setPdfLib(lib);
      } catch (e) {
        console.error('Failed to load pdfjs', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Open PDF when src changes
  useEffect(() => {
    let cancelled = false;
    async function openPdf() {
      if (!pdfLib || !src || !open) return;
      try {
        const loadingTask = pdfLib.getDocument({ url: src });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setDoc(pdf);
        setNumPages(pdf.numPages || 1);
        setPageNum(1);
        setScale(1);
        setRotation(0);
        setFit(true);
      } catch (e) {
        console.error('Failed to open PDF', e);
      }
    }
    openPdf();
    return () => { cancelled = true; };
  }, [pdfLib, src, open]);

  function fitToScreen(viewport: { width: number; height: number }) {
    if (!containerRef.current) return 1;
    const { clientWidth, clientHeight } = containerRef.current;
    const wr = clientWidth / viewport.width;
    const hr = clientHeight / viewport.height;
    const s = Math.max(0.1, Math.min(4, Math.min(wr, hr)));
    return s;
  }

  // Render current page
  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!doc || !canvasRef.current) return;
      setRendering(true);
      try {
        const page = await doc.getPage(pageNum);
        let vp = page.getViewport({ scale: 1, rotation });
        let targetScale = scale;
        if (fit) {
          targetScale = fitToScreen(vp);
        }
        const viewport = page.getViewport({ scale: targetScale, rotation });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // HiDPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = { canvasContext: ctx, viewport };
        const task = page.render(renderContext);
        await task.promise;
        if (cancelled) return;
      } catch (e) {
        console.error('Failed to render page', e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }
    renderPage();
    return () => { cancelled = true; };
  }, [doc, pageNum, scale, rotation, fit, open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, s + 0.1));
      if (e.key === '-') setScale((s) => Math.max(0.25, s - 0.1));
      if (e.key === '0') { setScale(1); setFit(false); }
      if (e.key.toLowerCase() === 'r') setRotation((r) => (r + 90) % 360);
      if (e.key.toLowerCase() === 'f') setFit((f) => !f);
      if (e.key === 'ArrowRight') setPageNum((p) => Math.min(numPages, p + 1));
      if (e.key === 'ArrowLeft') setPageNum((p) => Math.max(1, p - 1));
      if (e.key.toLowerCase() === 'd') download();
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [open, numPages, onClose]);

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
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0">
        <DialogHeader className="px-4 py-2">
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.min(4, s + 0.1))} disabled={rendering}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.max(0.25, s - 0.1))} disabled={rendering}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)} disabled={rendering}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFit((f) => !f)} disabled={rendering}>
            {fit ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground ml-2">{Math.round(scale * 100)}%</div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1 || rendering}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm tabular-nums">{pageNum} / {numPages}</div>
            <Button size="sm" variant="outline" onClick={() => setPageNum((p) => Math.min(numPages, p + 1))} disabled={pageNum >= numPages || rendering}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div ref={containerRef} className="flex-1 h-[calc(90vh-112px)] bg-black/80 overflow-auto relative">
          <div className="w-full h-full flex items-center justify-center">
            <canvas ref={canvasRef} className="bg-white rounded shadow" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}