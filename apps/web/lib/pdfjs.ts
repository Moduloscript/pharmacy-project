// Robust loader for pdfjs-dist across versions and bundlers
export async function loadPdfjs() {
  let pdfjsLib: any;

  // Load library entry (prefer modern entry; fallback to legacy build)
  try {
    pdfjsLib = await import('pdfjs-dist');
  } catch {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
  }

  // Try several worker entrypoints (depending on pdfjs-dist version and bundler)
  let workerMod: any = null;
  try { workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs'); } catch {}
  if (!workerMod) { try { workerMod = await import('pdfjs-dist/build/pdf.worker.mjs'); } catch {} }
  if (!workerMod) { try { workerMod = await import('pdfjs-dist/build/pdf.worker.min.js'); } catch {} }
  if (!workerMod) { try { workerMod = await import('pdfjs-dist/build/pdf.worker.js'); } catch {} }
  if (!workerMod) { try { workerMod = await import('pdfjs-dist/legacy/build/pdf.worker.js'); } catch {} }
  if (!workerMod) { try { workerMod = await import('pdfjs-dist/build/pdf.worker.entry'); } catch {} }

  const workerSrc = (workerMod as any)?.default ?? workerMod ?? undefined;
  if (workerSrc && (pdfjsLib as any)?.GlobalWorkerOptions) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;
  }

  return pdfjsLib;
}
