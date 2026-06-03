"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X, Loader2, ImageIcon } from "lucide-react";

import { uploadMedicalImage } from "@/lib/cloudinary-actions";
import { MAX_MEDICAL_MEDIA, type MedicalMedia } from "@/lib/medical-media";

type MediaUploaderProps = {
  name?: string;
  defaultValue?: MedicalMedia[];
};

/**
 * Manages a gallery of medical item images. Uploads go directly to Cloudinary
 * using a short-lived server-generated signature. The current list is mirrored
 * into a hidden input as JSON so the surrounding <form> submits it.
 */
export function MediaUploader({ name = "media", defaultValue = [] }: MediaUploaderProps) {
  const [items, setItems] = useState<MedicalMedia[]>(defaultValue);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.length + uploading;
  const atLimit = total >= MAX_MEDICAL_MEDIA;

  async function uploadBlob(file: Blob) {
    // Send the bytes to our Server Action; it uploads to Cloudinary server-side.
    // No Cloudinary key/secret/signature is ever exposed to the browser.
    const form = new FormData();
    form.append("file", file, "image.jpg");

    const media = await uploadMedicalImage(form);

    setItems((prev) =>
      prev.length >= MAX_MEDICAL_MEDIA || prev.some((m) => m.public_id === media.public_id)
        ? prev
        : [...prev, media],
    );
  }

  async function uploadBlobs(blobs: Blob[]) {
    if (blobs.length === 0) return;
    setError(null);
    for (const blob of blobs) {
      setUploading((n) => n + 1);
      try {
        await uploadBlob(blob);
      } catch {
        setError("Tải ảnh lên thất bại. Vui lòng thử lại.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_MEDICAL_MEDIA - items.length;
    if (remaining <= 0) return;
    void uploadBlobs(Array.from(files).slice(0, remaining));
  }

  function removeItem(publicId: string) {
    setItems((prev) => prev.filter((m) => m.public_id !== publicId));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={atLimit}
          className="mm-btn-secondary mm-btn-sm flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera size={14} />
          Chụp ảnh
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={atLimit}
          className="mm-btn-secondary mm-btn-sm flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={14} />
          Tải ảnh lên
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-xs text-zinc-400">
          {items.length}/{MAX_MEDICAL_MEDIA}
        </span>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {items.length > 0 || uploading > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((media) => (
            <div
              key={media.public_id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt="Ảnh vật tư"
                className="h-full w-full cursor-zoom-in object-cover"
                onClick={() => setPreview(media.url)}
              />
              <button
                type="button"
                onClick={() => removeItem(media.public_id)}
                className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-900/60 text-white opacity-100 transition hover:bg-red-600 md:opacity-0 md:group-hover:opacity-100"
                aria-label="Xóa ảnh"
                title="Xóa ảnh"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50"
            >
              <Loader2 size={18} className="animate-spin text-zinc-400" />
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <ImageIcon size={13} />
          Chưa có ảnh nào.
        </p>
      )}

      {cameraOpen ? (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(blob) => {
            setCameraOpen(false);
            void uploadBlobs([blob]);
          }}
        />
      ) : null}

      {preview ? <PreviewOverlay url={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

/** Live webcam capture using getUserMedia — works on desktop and mobile. */
function CameraCapture({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Trình duyệt không hỗ trợ camera.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setError("Không thể truy cập camera. Vui lòng cấp quyền hoặc dùng nút Tải ảnh lên.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Camera size={15} />
            Chụp ảnh
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex aspect-video items-center justify-center bg-zinc-900">
          {error ? (
            <p className="px-6 text-center text-sm text-zinc-300">{error}</p>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-contain"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3">
          <button type="button" onClick={onClose} className="mm-btn-ghost mm-btn-sm">
            Hủy
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready || Boolean(error)}
            className="mm-btn-primary mm-btn-sm flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera size={14} />
            Chụp
          </button>
        </div>
      </div>
    </div>
  );
}

/** Full-size preview overlay for a single image. */
function PreviewOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Đóng"
      >
        <X size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Ảnh vật tư"
        className="max-h-[90dvh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
