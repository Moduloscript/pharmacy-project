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

  // Pre-fetch the PDF as ArrayBuffer to bypass PDF.js URL handling issues
  // PDF.js sometimes makes internal requests that strip query parameters,
  // causing cache misses or hitting stale 204 responses
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchPdf() {
      setIsFetching(true);
      setFetchError(null);
      setPdfData(null);
      
      try {
        // Add cache buster to the fetch URL
        const urlObj = new URL(fileUrl, window.location.href);
        urlObj.searchParams.set('t', String(Date.now()));
        
        const response = await fetch(urlObj.toString());
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Received empty PDF file');
        }
        
        if (!cancelled) {
          setPdfData(arrayBuffer);
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err?.message || 'Failed to fetch PDF');
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }
    
    fetchPdf();
    
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Pass the raw ArrayBuffer data to react-pdf instead of a URL
  const fileDescriptor = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

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
    <div className="flex flex-col h-full bg-zinc-900/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-950/90 border-b border-zinc-800 backdrop-blur-md z-10 shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          {/* Zoom Controls (Segmented) */}
          <div className="flex items-center h-9 ml-2 bg-white rounded-md shadow-sm ring-1 ring-zinc-200 overflow-hidden">
            <button 
              onClick={() => { setScale((s) => Math.max(0.25, s - 0.1)); setFitMode('none'); }} 
              className="h-full px-3 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 transition-colors border-r border-zinc-200 font-medium text-lg leading-none"
              title="Zoom Out"
            >
              -
            </button>
            <div className="h-full min-w-[3.5rem] flex items-center justify-center bg-white text-xs font-semibold text-zinc-900 select-none">
              {Math.round(scale * 100)}%
            </div>
            <button 
              onClick={() => { setScale((s) => Math.min(4, s + 0.1)); setFitMode('none'); }} 
              className="h-full px-3 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 transition-colors border-l border-zinc-200 font-medium text-lg leading-none"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-2 opacity-50" />

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setRotation((r) => (r + 90) % 360)} 
              className="h-9 px-4 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold rounded-md transition-all shadow-sm ring-1 ring-zinc-200 active:translate-y-px"
            >
              Rotate
            </button>
            <button 
              onClick={applyFitWidth} 
              className={`h-9 px-4 text-xs font-semibold rounded-md transition-all shadow-sm ring-1 ring-zinc-200 active:translate-y-px ${fitMode === 'width' ? 'bg-[#D9F903] text-black ring-[#D9F903] hover:bg-[#cbe802]' : 'bg-white text-zinc-900 hover:bg-zinc-50'}`}
            >
              Fit Width
            </button>
            <button 
              onClick={applyFitPage} 
              className={`h-9 px-4 text-xs font-semibold rounded-md transition-all shadow-sm ring-1 ring-zinc-200 active:translate-y-px ${fitMode === 'page' ? 'bg-[#D9F903] text-black ring-[#D9F903] hover:bg-[#cbe802]' : 'bg-white text-zinc-900 hover:bg-zinc-50'}`}
            >
              Fit Page
            </button>
          </div>
        </div>

        {/* Pagination */}
        {numPages ? (
          <div className="flex items-center gap-2 mr-2">
            <button 
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))} 
              className="h-9 px-4 bg-white text-zinc-900 text-xs font-semibold rounded-md hover:bg-zinc-50 transition-all shadow-sm ring-1 ring-zinc-200 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed active:translate-y-px disabled:active:translate-y-0"
              disabled={pageNumber <= 1}
            >
              Previous
            </button>
            
            <div className="flex items-center gap-2 h-9 px-3 bg-zinc-900 rounded-md border border-zinc-800 shadow-inner">
              <span className="text-xs text-zinc-400 font-medium text-nowrap">Page</span>
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
                className="w-8 h-full bg-transparent text-center text-sm font-bold text-white focus:outline-none appearance-none"
              />
              <span className="text-xs text-zinc-500 font-medium text-nowrap">/ {numPages}</span>
            </div>

            <button 
              onClick={() => setPageNumber((p) => Math.min(numPages!, p + 1))} 
              className="h-9 px-4 bg-white text-zinc-900 text-xs font-semibold rounded-md hover:bg-zinc-50 transition-all shadow-sm ring-1 ring-zinc-200 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed active:translate-y-px disabled:active:translate-y-0"
              disabled={pageNumber >= numPages}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="flex-1 w-full overflow-auto flex items-center justify-center p-8">
        {isFetching ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <p className="text-zinc-400 text-sm">Loading PDF...</p>
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-500">Failed to load PDF: {fetchError}</p>
        ) : fileDescriptor ? (
          <Document
            key={fileUrl}
            file={fileDescriptor}
            options={options}
            onLoadSuccess={onLoadSuccess}
            onLoadError={(e: any) => {
              setLoadError(String(e?.message || e));
            }}
            onSourceError={(e: any) => {
              setLoadError(String(e?.message || e));
            }}
            loading={
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <p className="text-zinc-400 text-sm">Parsing PDF...</p>
              </div>
            }
            error={<p className="text-sm text-red-500">{loadError ? `Failed to load PDF: ${loadError}` : 'Failed to load PDF'}</p>}
            className="shadow-2xl"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="bg-white shadow-xl"
              onLoadSuccess={(page) => {
                try {
                  const v = page.getViewport({ scale: 1, rotation });
                  setBasePageWidth(v.width);
                  setBasePageHeight(v.height);
                } catch {}
              }}
            />
          </Document>
        ) : (
          <p className="text-sm text-red-500">No PDF data available</p>
        )}
      </div>
    </div>
  );
}
