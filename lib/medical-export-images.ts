import { isValidCloudinaryUrl, type MedicalMedia } from "@/lib/medical-media";

export const EXPORT_THUMB_WIDTH = 72;
export const EXPORT_THUMB_HEIGHT = 54;
export const MAX_EMBEDDED_IMAGES_PER_ROW = 5;
export const IMAGE_FETCH_TIMEOUT_MS = 12_000;

type ImageExtension = "jpeg" | "png" | "gif";

export type ExportImageAsset = {
  buffer: Buffer;
  extension: ImageExtension;
};

/** Cloudinary resize transform for smaller Excel thumbnails. */
export function cloudinaryThumbnailUrl(url: string): string {
  const marker = "/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) {
    return url;
  }

  const prefix = url.slice(0, markerIndex + marker.length);
  const suffix = url.slice(markerIndex + marker.length);
  if (suffix.startsWith("w_") || suffix.startsWith("c_")) {
    return url;
  }

  return `${prefix}w_144,h_108,c_fill,q_auto,f_jpg/${suffix}`;
}

function extensionFromContentType(contentType: string): ImageExtension {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  return "jpeg";
}

export async function fetchExportImage(url: string): Promise<ExportImageAsset | null> {
  try {
    const response = await fetch(cloudinaryThumbnailUrl(url), {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      return null;
    }

    return {
      buffer,
      extension: extensionFromContentType(response.headers.get("content-type") ?? ""),
    };
  } catch {
    return null;
  }
}

export function sanitizeExportMedia(
  media: MedicalMedia[] | undefined,
  cloudName: string,
): MedicalMedia[] {
  if (!media?.length || !cloudName) {
    return [];
  }

  const seen = new Set<string>();
  const result: MedicalMedia[] = [];

  for (const item of media) {
    if (!item?.url || !item.public_id || seen.has(item.public_id)) {
      continue;
    }
    if (!isValidCloudinaryUrl(item.url, cloudName)) {
      continue;
    }

    seen.add(item.public_id);
    result.push(item);
    if (result.length >= 10) {
      break;
    }
  }

  return result;
}

/** Prefetch unique image URLs once for the whole export. */
export async function prefetchExportImages(urls: string[]): Promise<Map<string, ExportImageAsset>> {
  const uniqueUrls = [...new Set(urls)];
  const cache = new Map<string, ExportImageAsset>();

  await Promise.all(
    uniqueUrls.map(async (url) => {
      const asset = await fetchExportImage(url);
      if (asset) {
        cache.set(url, asset);
      }
    }),
  );

  return cache;
}
