import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardAccent = "blue" | "teal" | "green" | "purple" | "amber";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  className?: string;
  accent?: StatCardAccent;
};

const accentMap: Record<StatCardAccent, { icon: string; value: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600", value: "text-blue-700" },
  teal: { icon: "bg-teal-50 text-teal-600", value: "text-teal-700" },
  green: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
  purple: { icon: "bg-purple-50 text-purple-600", value: "text-purple-700" },
  amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
};

export function StatCard({ label, value, icon, description, className, accent = "blue" }: StatCardProps) {
  const colors = accentMap[accent];
  return (
    <article className={cn("mm-card flex items-start gap-4 p-5", className)}>
      {icon ? (
        <div
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
            colors.icon,
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", colors.value)}>{value}</p>
        {description ? <p className="mt-0.5 text-xs text-zinc-400">{description}</p> : null}
      </div>
    </article>
  );
}
