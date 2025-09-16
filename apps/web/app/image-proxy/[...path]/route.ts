import { config } from "@repo/config";
import { getSignedUrl } from "@repo/storage";

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

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => {
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
    if (!upstream.ok || !upstream.body) {
      return new Response("Failed to fetch object", { status: upstream.status || 502 });
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

      return new Response(output, { status: 200, headers });
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
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    return new Response(upstream.body, {
      status: upstream.status, // 200 or 206 if ranged
      headers,
    });
  } catch (e) {
    return new Response("Error generating preview", { status: 500 });
  }
};
