import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getPaginationRange } from "@/lib/pagination";

type PaginationBarProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  recordLabel?: string;
  buildPageHref: (page: number) => string;
};

export function PaginationBar({
  page,
  totalPages,
  totalCount,
  recordLabel = "bản ghi",
  buildPageHref,
}: PaginationBarProps) {
  const pages = getPaginationRange(page, totalPages);

  return (
    <section className="mm-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-zinc-400">
          Trang{" "}
          <span className="font-semibold text-zinc-700">{page}</span>
          {" "}/{" "}
          <span className="font-semibold text-zinc-700">{totalPages}</span>
          {" — "}
          <span className="font-semibold text-zinc-700">{totalCount}</span>
          {" "}
          {recordLabel}
        </span>

        <div className="flex items-center gap-1">
          <Link
            href={buildPageHref(Math.max(1, page - 1))}
            aria-label="Trang trước"
            className={`mm-btn-secondary mm-btn-sm inline-flex h-7 w-7 items-center justify-center p-0 ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <ChevronLeft size={14} />
          </Link>

          {pages.map((item, index) =>
            item === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-zinc-400">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={buildPageHref(item)}
                aria-current={item === page ? "page" : undefined}
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                  item === page
                    ? "bg-[oklch(0.52_0.15_152)] text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {item}
              </Link>
            ),
          )}

          <Link
            href={buildPageHref(Math.min(totalPages, page + 1))}
            aria-label="Trang sau"
            className={`mm-btn-secondary mm-btn-sm inline-flex h-7 w-7 items-center justify-center p-0 ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
