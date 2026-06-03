"use server";

import type { UploadApiResponse } from "cloudinary";

import { requireUser } from "@/lib/authz";
import { cloudinary, cloudinaryConfig } from "@/lib/cloudinary";
import { MAX_MEDICAL_MEDIA_BYTES, type MedicalMedia } from "@/lib/medical-media";

/**
 * Proxy upload: the browser sends the image bytes to this Server Action, which
 * uploads to Cloudinary using the SDK. No Cloudinary credentials (key, secret,
 * or signature) ever reach the browser — the network only shows a request to
 * this app.
 */
export async function uploadMedicalImage(formData: FormData): Promise<MedicalMedia> {
  const user = await requireUser();

  if (!cloudinaryConfig.cloudName) {
    throw new Error("Cloudinary chưa được cấu hình.");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new Error("Thiếu tệp ảnh.");
  }

  const blob = file as File;
  if (blob.type && !blob.type.startsWith("image/")) {
    throw new Error("Tệp không phải là ảnh.");
  }
  if (blob.size > MAX_MEDICAL_MEDIA_BYTES) {
    throw new Error("Ảnh vượt quá dung lượng cho phép.");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: cloudinaryConfig.uploadFolder, resource_type: "image" },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Upload thất bại."));
            return;
          }
          resolve(uploadResult);
        },
      )
      .end(buffer);
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    uploaded_by: user.gmail,
    uploaded_at: new Date().toISOString(),
  };
}
