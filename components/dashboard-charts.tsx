"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export type UsageByPeriodItem = { label: string; value: number };
export type TopSupplyItem = { name: string; value: number };
export type TopCompanyItem = { name: string; value: number };
export type UsagePercentItem = { name: string; value: number };

type Props = {
  usageByPeriod: UsageByPeriodItem[];
  topSupplies: TopSupplyItem[];
  topCompanies: TopCompanyItem[];
  usagePercent: UsagePercentItem[];
  periodMode: "month" | "week";
};

const PIE_COLORS = [
  "#0ea5e9", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#10b981", "#3b82f6", "#f97316", "#ec4899", "#6366f1",
];

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
      {label}
    </div>
  );
}

/* Shorten long names for axis labels */
function shortenLabel(name: string, max = 18) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

export function DashboardCharts({
  usageByPeriod,
  topSupplies,
  topCompanies,
  usagePercent,
  periodMode,
}: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Chart 1 — Usage over time */}
      <div className="mm-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700">
          Biểu đồ sử dụng theo thời gian
          <span className="ml-2 text-xs font-normal text-zinc-400">
            (Trục X: {periodMode === "month" ? "Tháng" : "Tuần"} — Trục Y: SL sử dụng)
          </span>
        </h3>
        {usageByPeriod.length === 0 ? (
          <EmptyState label="Không có dữ liệu kỳ." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usageByPeriod} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                formatter={(v) => [Number(v).toLocaleString(), "SL sử dụng"]}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2 — Top 10 supplies */}
      <div className="mm-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700">
          Top vật tư sử dụng nhiều nhất
          <span className="ml-2 text-xs font-normal text-zinc-400">(Top 10 theo SL SD)</span>
        </h3>
        {topSupplies.length === 0 ? (
          <EmptyState label="Không có dữ liệu." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topSupplies}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => shortenLabel(v, 16)}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                formatter={(v) => [Number(v).toLocaleString(), "SL sử dụng"]}
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 3 — Top companies */}
      <div className="mm-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700">
          Top công ty sử dụng nhiều
        </h3>
        {topCompanies.length === 0 ? (
          <EmptyState label="Không có dữ liệu." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topCompanies}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => shortenLabel(v, 16)}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                formatter={(v) => [Number(v).toLocaleString(), "SL sử dụng"]}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 4 — % usage by supply */}
      <div className="mm-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700">
          % sử dụng theo vật tư
          <span className="ml-2 text-xs font-normal text-zinc-400">(Top 10)</span>
        </h3>
        {usagePercent.length === 0 ? (
          <EmptyState label="Không có dữ liệu." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={usagePercent}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={32}
                paddingAngle={2}
                label={({ percent }) =>
                  (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(1)}%` : ""
                }
                labelLine={false}
              >
                {usagePercent.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                formatter={(v, name) => [Number(v).toLocaleString(), String(name)]}
              />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) => shortenLabel(value, 20)}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
