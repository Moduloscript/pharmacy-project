import { config } from "@repo/config";
export const dynamic = "force-dynamic";
import { getSignedUrl, getObjectMetadata } from "@repo/storage";

// Stream the storage object inline so previews render in-place (no new tab download)
// Also set cache headers for an hour to avoid repeated signed URL fetches during a session

function guessContentTypeFromKey(key: string): string {
  const ext = key.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  const [bucket, ...parts] = path ?? [];
  const key = parts.join("/");

  if (!(bucket && key)) {
    return new Response("Invalid path", { status: 400 });
  }

  const allowedBuckets = [
    config.storage.bucketNames.avatars,
    config.storage.bucketNames.documents,
    config.storage.bucketNames.productImages,
    config.storage.bucketNames.prescriptions,
  ];

  if (!allowedBuckets.includes(bucket)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const url = new URL(req.url);
    const w = url.searchParams.get("w");
    const h = url.searchParams.get("h");
    const q = url.searchParams.get("q");
    const preview = url.searchParams.get("preview");
    const rangeHeader = req.headers.get("range");

    const signedUrl = await getSignedUrl(key, { bucket, expiresIn: 60 * 60 });

    // Forward Range header for partial content (PDFs/videos/images)
    const upstream = await fetch(signedUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
    });
    
    // Handle error cases: non-2xx responses, 204 No Content, or missing body
    if (!upstream.ok) {
      console.error('[image-proxy GET] upstream not ok:', upstream.status, key);
      return new Response("Failed to fetch object", { status: upstream.status || 502 });
    }
    
    // 204 No Content means file doesn't exist or storage returned empty
    if (upstream.status === 204 || !upstream.body) {
      console.error('[image-proxy GET] No content returned:', upstream.status, key);
      return new Response("Object not found or empty", { status: 404 });
    }

    const originalContentType = upstream.headers.get("content-type") || guessContentTypeFromKey(key);
    const isImage = originalContentType.startsWith("image/");

    // If we need a resized preview, transform with sharp (buffered)
    if (isImage && (preview === "1" || w || h)) {
      const sharp = (await import("sharp")).default;
      const input = Buffer.from(await upstream.arrayBuffer());
      const width = preview === "1" && !w ? 800 : (w ? Math.max(1, Math.min(4096, parseInt(w, 10) || 0)) : undefined);
      const height = h ? Math.max(1, Math.min(4096, parseInt(h, 10) || 0)) : undefined;
      const quality = q ? Math.max(30, Math.min(95, parseInt(q, 10) || 75)) : 75;

      // Choose output format based on input (keep jpg/png/webp)
      const ext = key.split("?")[0].split(".").pop()?.toLowerCase();
      let pipeline = sharp(input).resize({ width, height, withoutEnlargement: true });
      let contentType = originalContentType;
      if (ext === "png") {
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        contentType = "image/png";
      } else if (ext === "webp") {
        pipeline = pipeline.webp({ quality });
        contentType = "image/webp";
      } else {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        contentType = "image/jpeg";
      }
      const output = await pipeline.toBuffer();

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      headers.set("Content-Disposition", "inline");
      headers.set("Content-Length", String(output.length));

      return new Response(output as unknown as BodyInit, { status: 200, headers });
    }

    // For PDFs, buffer the response to avoid streaming issues with PDF.js
    // PDF.js has issues with ReadableStream handling in Next.js environments
    const ext = key.split("?")[0].split(".").pop()?.toLowerCase();
    const isPdf = originalContentType === "application/pdf" || ext === 'pdf';
    


    if (isPdf) {
      try {
        // Buffer the entire PDF to avoid streaming issues
        // Use Uint8Array (web-standard) instead of Node Buffer for Response body compatibility
        const arrayBuffer = await upstream.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        


        if (pdfData.byteLength === 0) {
          console.error('[image-proxy] PDF buffer is empty!');
          return new Response("Empty PDF file", { status: 404 });
        }
        
        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Content-Disposition", "inline");
        headers.set("Content-Length", String(pdfData.byteLength));
        headers.set("Accept-Ranges", "bytes");

        // Uint8Array is a valid BodyInit in the web Response API
        return new Response(pdfData, { status: 200, headers });
      } catch (err) {
        console.error('[image-proxy] Error buffering PDF:', err);
        throw err;
      }
    }



    // Otherwise stream original (supporting 200 or 206)
    const headers = new Headers();
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");

    headers.set("Content-Type", originalContentType);
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    headers.set("Content-Disposition", "inline");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (contentRange) headers.set("Content-Range", contentRange);
    // Always advertise range support so PDF.js behaves reliably, even if upstream omits it
    headers.set("Accept-Ranges", acceptRanges || "bytes");

    return new Response(upstream.body, {
      status: upstream.status, // 200 or 206 if ranged
      headers,
    });
  } catch (e) {
    return new Response("Error generating preview", { status: 500 });
  }
}

// Support HEAD so clients like PDF.js can probe for length/range support.
export async function HEAD(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const [bucket, ...parts] = path ?? [];
  const key = parts.join("/");
  
  if (!(bucket && key)) return new Response("Invalid path", { status: 400 });

  const allowedBuckets = [
    config.storage.bucketNames.avatars,
    config.storage.bucketNames.documents,
    config.storage.bucketNames.productImages,
    config.storage.bucketNames.prescriptions,
  ];
  if (!allowedBuckets.includes(bucket)) return new Response("Not found", { status: 404 });

  try {
    // Use provider metadata API instead of presigned GET URL for HEAD.
    // Some S3-compatible backends (including Supabase S3 gateway) require a
    // method-specific signature, so issuing HEAD against a GET-signed URL can 403.
    const meta = await getObjectMetadata(key, { bucket });
    if (!meta.exists) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    const contentType = meta.contentType || guessContentTypeFromKey(key);
    headers.set('Content-Type', contentType);
    // Disable caching for HEAD requests to prevent PDF.js from hitting stagnant 204/404 responses
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Content-Disposition', 'inline');
    if (typeof meta.size === 'number') headers.set('Content-Length', String(meta.size));
    // We explicitly advertise range support so PDF.js can perform range requests.
    headers.set('Accept-Ranges', 'bytes');
    if (meta.lastModified) headers.set('Last-Modified', meta.lastModified.toUTCString());

    // Explicit 200 to avoid default 204. passing empty string to force 200 status.
    return new Response('', { status: 200, headers });
  } catch (e) {
    console.error('[image-proxy HEAD] Error:', e);
    return new Response('Error probing object', { status: 500 });
  }
}

// Also export OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}
