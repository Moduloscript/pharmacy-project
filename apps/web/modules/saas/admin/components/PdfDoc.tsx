'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker so its version matches the runtime API version
// Use CDN by version to prevent mismatch (falls back to local files if needed)
function configurePdfWorker() {
  if (typeof window === 'undefined') return;
  const v = (pdfjs as any).version || '5.4.149';
  try {
    // Prefer versioned CDN so worker always matches API
    (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;
  } catch (_) {
    try {
      (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.js`;
    } catch {
      // Last resort: try local copies (ensure your middleware does not localize these paths)
      (pdfjs as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
  }
}

export type PdfDocProps = {
  fileUrl: string;
};

export default function PdfDoc({ fileUrl }: PdfDocProps) {
  const [numPages, setNumPages] = useState<number | undefined>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.6);
  const [rotation, setRotation] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track container and page intrinsic size to compute fit scales
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  const [basePageHeight, setBasePageHeight] = useState<number | null>(null);
  const [fitMode, setFitMode] = useState<'none' | 'width' | 'page'>('none');

  useEffect(() => {
    configurePdfWorker();
    // Helpful diagnostic
    console.debug('[PdfDoc] mount', { fileUrl });
  }, [fileUrl]);

  const options = useMemo(() => ({
    // Optional: enable if you need assets via CDN or public folders
    // cMapUrl: `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/cmaps/`,
    // wasmUrl: `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/wasm/`,
    // standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/standard_fonts/`,
  }), []);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(null);
  }

  const fileDescriptor = useMemo(() => ({
    url: fileUrl,
    withCredentials: false,
    // Reduce HEADs & chunking issues
    // @ts-ignore
    disableRange: true,
    // @ts-ignore
    disableStream: true,
    // @ts-ignore
    disableWorker: false,
    // @ts-ignore  
    isEvalSupported: false,
    // @ts-ignore
    rangeChunkSize: 0,
    // @ts-ignore
    disableAutoFetch: true,
    // @ts-ignore
    length: 0,
  }) as const, [fileUrl]);

  // Compute effective base dimensions given rotation
  const effectiveBase = useMemo(() => {
    if (basePageWidth == null || basePageHeight == null) return null;
    const rot = ((rotation % 360) + 360) % 360;
    const swapped = rot === 90 || rot === 270;
    return {
      width: swapped ? basePageHeight : basePageWidth,
      height: swapped ? basePageWidth : basePageHeight,
    };
  }, [basePageWidth, basePageHeight, rotation]);

  const applyFitWidth = () => {
    if (!containerRef.current || !effectiveBase) return;
    const cw = containerRef.current.clientWidth;
    const newScale = Math.max(0.1, Math.min(8, cw / effectiveBase.width));
    setScale(newScale);
    setFitMode('width');
  };

  const applyFitPage = () => {
    if (!containerRef.current || !effectiveBase) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const sw = cw / effectiveBase.width;
    const sh = ch / effectiveBase.height;
    const newScale = Math.max(0.1, Math.min(8, Math.min(sw, sh)));
    setScale(newScale);
    setFitMode('page');
  };

  // Keep fit mode on resize / rotation
  useEffect(() => {
    const onResize = () => {
      if (fitMode === 'width') applyFitWidth();
      if (fitMode === 'page') applyFitPage();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitMode, effectiveBase]);

  useEffect(() => {
    if (fitMode === 'width') applyFitWidth();
    if (fitMode === 'page') applyFitPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation]);

  // Keyboard shortcuts: + / -, r, 0, w, p, arrows
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((s) => Math.min(8, s + 0.1));
        setFitMode('none');
      } else if (e.key === '-') {
        e.preventDefault();
        setScale((s) => Math.max(0.1, s - 0.1));
        setFitMode('none');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setRotation((r) => (r + 90) % 360);
      } else if (e.key === '0') {
        e.preventDefault();
        setScale(1);
        setFitMode('none');
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        applyFitWidth();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        applyFitPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPageNumber((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPageNumber((p) => Math.min((numPages || 1), p + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages, applyFitWidth, applyFitPage]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setScale((s) => Math.max(0.25, s - 0.1)); setFitMode('none'); }} className="px-2 py-1 border rounded">-</button>
        <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => { setScale((s) => Math.min(4, s + 0.1)); setFitMode('none'); }} className="px-2 py-1 border rounded">+</button>
        <button onClick={() => setRotation((r) => (r + 90) % 360)} className="px-2 py-1 border rounded">Rotate</button>
        <button onClick={applyFitWidth} className="px-2 py-1 border rounded">Fit width</button>
        <button onClick={applyFitPage} className="px-2 py-1 border rounded">Fit page</button>
        <div className="flex-1" />
        {numPages ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded">Prev</button>
            <span className="text-sm tabular-nums">Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => setPageNumber(() => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) {
                  return Math.min(Math.max(1, v), numPages!);
                }
                return 1;
              })}
              className="w-16 px-1 py-1 border rounded text-sm text-center"
            />
            <span className="text-sm tabular-nums">of {numPages}</span>
            <button onClick={() => setPageNumber((p) => Math.min(numPages!, p + 1))} className="px-2 py-1 border rounded">Next</button>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="w-full h-[70vh] overflow-auto flex items-center justify-center bg-black/5">
        <Document
          key={fileUrl}
          file={fileDescriptor}
          options={options}
          onLoadSuccess={onLoadSuccess}
          onLoadProgress={(p) => console.debug('[PdfDoc] loading', p?.loaded, '/', p?.total)}
          onLoadError={(e: any) => {
            console.error('[PdfDoc] onLoadError', e);
            setLoadError(String(e?.message || e));
          }}
          onSourceError={(e: any) => {
            console.error('[PdfDoc] onSourceError', e);
            setLoadError(String(e?.message || e));
          }}
          loading={<p>Loading PDF...</p>}
          error={<p className="text-sm text-red-500">{loadError ? `Failed to load PDF: ${loadError}` : 'Failed to load PDF'}</p>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            renderTextLayer
            renderAnnotationLayer
            onLoadSuccess={(page) => {
              try {
                const v = page.getViewport({ scale: 1, rotation });
                setBasePageWidth(v.width);
                setBasePageHeight(v.height);
              } catch {}
            }}
          />
        </Document>
      </div>
    </div>
  );
}
