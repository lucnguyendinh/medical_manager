"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
};

export function Modal({ title, onClose, children, maxWidth = "max-w-2xl", className }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          /* Container: full width on mobile (bottom sheet), bounded on desktop */
          "flex w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl",
          "max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
          maxWidth,
          className,
        )}
      >
        {/* Header — never scrolls */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrolls when content overflows */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      </div>
    </div>
  );
}
