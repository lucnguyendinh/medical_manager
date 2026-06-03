// Shared types and pure helpers for medical item images.
// This module must stay free of server-only imports so it can be used
// from both client components and server actions.

export type MedicalMedia = {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  uploaded_by?: string;
  uploaded_at?: string;
};

export const MAX_MEDICAL_MEDIA = 10;
export const MAX_MEDICAL_MEDIA_BYTES = 10 * 1024 * 1024; // 10MB per image

/** Whether a URL points at the configured Cloudinary cloud (prevents storing arbitrary URLs). */
export function isValidCloudinaryUrl(url: string, cloudName: string) {
  if (!cloudName) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
}

/** Parse the media JSON submitted from the form into a sanitized, bounded list. */
export function parseMediaJson(raw: unknown, cloudName: string): MedicalMedia[] {
  if (typeof raw !== "string" || !raw.trim()) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const result: MedicalMedia[] = [];
  const seen = new Set<string>();

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url : "";
    const publicId = typeof rec.public_id === "string" ? rec.public_id : "";
    if (!url || !publicId || seen.has(publicId)) continue;
    if (!isValidCloudinaryUrl(url, cloudName)) continue;

    seen.add(publicId);
    result.push({
      url,
      public_id: publicId,
      width: typeof rec.width === "number" ? rec.width : undefined,
      height: typeof rec.height === "number" ? rec.height : undefined,
      format: typeof rec.format === "string" ? rec.format : undefined,
      bytes: typeof rec.bytes === "number" ? rec.bytes : undefined,
      uploaded_by: typeof rec.uploaded_by === "string" ? rec.uploaded_by : undefined,
      uploaded_at: typeof rec.uploaded_at === "string" ? rec.uploaded_at : undefined,
    });

    if (result.length >= MAX_MEDICAL_MEDIA) break;
  }

  return result;
}
