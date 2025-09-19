'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const fileDescriptor = useMemo(() => {
    // Avoid credentials for cross-origin signed URLs (Supabase returns ACAO: *)
    // PDF.js maps withCredentials=false to credentials:'same-origin'
    return {
      url: fileUrl,
      withCredentials: false,
      // Disable ALL range/stream features to avoid HEAD requests entirely
      disableRange: true,
      disableStream: true,
      // Force binary string loading (old method, but avoids HEAD)
      // @ts-ignore
      disableWorker: false,
      // @ts-ignore  
      isEvalSupported: false,
      // @ts-ignore - Force rangeChunkSize to 0 to prevent any range requests
      rangeChunkSize: 0,
      // @ts-ignore - Disable auto-fetch to prevent HEAD
      disableAutoFetch: true,
      // @ts-ignore - Force length to 0 to prevent length check
      length: 0,
    } as const;
  }, [fileUrl]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setScale((s) => Math.max(0.25, s - 0.1))} className="px-2 py-1 border rounded">
          -
        </button>
        <span className="text-sm">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(4, s + 0.1))} className="px-2 py-1 border rounded">
          +
        </button>
        <button onClick={() => setRotation((r) => (r + 90) % 360)} className="px-2 py-1 border rounded">
          Rotate
        </button>
        <div className="flex-1" />
        {numPages ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded">
              Prev
            </button>
            <span className="text-sm tabular-nums">
              Page {pageNumber} of {numPages}
            </span>
            <button onClick={() => setPageNumber((p) => Math.min(numPages!, p + 1))} className="px-2 py-1 border rounded">
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="w-full h-[70vh] overflow-auto flex items-center justify-center bg-black/5">
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
          <Page pageNumber={pageNumber} scale={scale} rotate={rotation} renderTextLayer renderAnnotationLayer />
        </Document>
      </div>
    </div>
  );
}
