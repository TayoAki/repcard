/**
 * Cover-image storage. With IMAGEKIT_PRIVATE_KEY set, uploads to ImageKit and
 * stores the CDN URL. Without it (local dev, fresh clones) falls back to an
 * inline data URI so the feature works with zero third-party keys.
 */
const DATA_URI_LIMIT = 300_000; // ~225KB decoded; plenty for a 0.4-quality cover

export async function storeCoverImage(base64: string, fileName: string): Promise<string | null> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;

  if (key) {
    const body = new FormData();
    body.append("file", base64);
    body.append("fileName", fileName);
    body.append("folder", "/repcard-covers");
    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
      body,
    });
    if (!res.ok) throw new Error("Cover upload failed");
    return ((await res.json()) as { url: string }).url;
  }

  if (base64.length > DATA_URI_LIMIT) return null; // silently skip oversized covers in keyless mode
  return `data:image/jpeg;base64,${base64}`;
}
