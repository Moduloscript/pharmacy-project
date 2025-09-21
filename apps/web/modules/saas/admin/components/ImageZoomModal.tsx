'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components/button';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Download } from 'lucide-react';

interface ImageZoomModalProps {
  open: boolean;
  src: string;
  filename?: string;
  onClose: () => void;
}

const DEFAULT_IMAGE_SCALE = 0.79; // 79%

export function ImageZoomModal({ open, src, filename, onClose }: ImageZoomModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(DEFAULT_IMAGE_SCALE);
  const [rotation, setRotation] = useState(0);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [fit, setFit] = useState(false);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    // Reset state when opened
    if (open) {
      setScale(DEFAULT_IMAGE_SCALE);
      setRotation(0);
      setTx(0);
      setTy(0);
      // Start not fitted so the default zoom is respected
      setFit(false);
    }
  }, [open]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newScale = Math.min(8, Math.max(0.25, scale + delta));
    setScale(newScale);
    setFit(false);
  }

  function handleToggleFit() {
    setFit((prev) => {
      const next = !prev;
      if (next) {
        // Will fit via effect
      } else {
        // Switch to actual size and reset pan
        setScale(1);
        setTx(0);
        setTy(0);
      }
      return next;
    });
  }

  const isPanningRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isPanningRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    setTx((v) => v + dx);
    setTy((v) => v + dy);
  }
  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    isPanningRef.current = false;
  }

  function fitToScreen() {
    if (!containerRef.current || !imgNatural) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const wr = clientWidth / imgNatural.w;
    const hr = clientHeight / imgNatural.h;
    const s = Math.min(wr, hr);
    setScale(Math.max(0.1, Math.min(8, s)));
    setTx(0);
    setTy(0);
    setFit(true);
  }

  useEffect(() => {
    if (fit) {
      const t = setTimeout(fitToScreen, 0);
      return () => clearTimeout(t);
    }
  }, [fit, imgNatural, open]);

  function download() {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename || 'prescription';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  // Keyboard shortcuts when modal is open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      // Avoid repeating browser defaults
      const key = e.key;
      if (['+', '=', '-', '0', 'r', 'R', 'f', 'F', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'd', 'D'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (key === '+' || key === '=') setScale((s) => Math.min(8, s + 0.2));
      if (key === '-') setScale((s) => Math.max(0.25, s - 0.2));
      if (key === '0') { setScale(1); setFit(false); setTx(0); setTy(0); }
      if (key === 'r' || key === 'R') setRotation((r) => (r + 90) % 360);
      if (key === 'f' || key === 'F') handleToggleFit();
      if (key === 'ArrowLeft') setTx((v) => v + 20);
      if (key === 'ArrowRight') setTx((v) => v - 20);
      if (key === 'ArrowUp') setTy((v) => v + 20);
      if (key === 'ArrowDown') setTy((v) => v - 20);
      if (key === 'd' || key === 'D') download();
      if (key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true } as any);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0">
        <DialogHeader className="px-4 py-2">
          <DialogTitle>Prescription Preview</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.min(8, s + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.max(0.25, s - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleToggleFit}>
            {fit ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground ml-2">{Math.round(scale * 100)}%</div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div ref={containerRef} className="flex-1 h-[calc(90vh-96px)] bg-black/80 overflow-hidden relative">
          <div
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="w-full h-full touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
            onDoubleClick={handleToggleFit}
          >
            <img
              src={src}
              alt={filename || 'Prescription'}
              className="select-none"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                willChange: 'transform',
                imageRendering: 'auto',
                maxWidth: 'none',
              }}
              onLoad={(e) => {
                const el = e.currentTarget
                setImgNatural({ w: el.naturalWidth, h: el.naturalHeight })
                // Do not auto-fit here; respect DEFAULT_IMAGE_SCALE unless user toggles fit
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}