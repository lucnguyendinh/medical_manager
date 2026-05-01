import type { ReactNode } from "react";

import { SubmitButton } from "@/components/submit-button";

type CsvImportCardProps = {
  icon: ReactNode;
  title: string;
  hint: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel?: string;
};

export function CsvImportCard({
  icon,
  title,
  hint,
  action,
  submitLabel,
  pendingLabel = "Đang nhập...",
}: CsvImportCardProps) {
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
      </div>
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="block w-full cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-xs text-zinc-600 transition file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-sky-50 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-sky-700 hover:border-sky-400 hover:bg-sky-50/20"
      />
      <div className="flex justify-end">
        <SubmitButton
          label={submitLabel}
          pendingLabel={pendingLabel}
          className="mm-btn-sm"
        />
      </div>
    </form>
  );
}
