import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowRight, Building2, DollarSign, SlidersHorizontal, Stethoscope } from "lucide-react";

import { requireUser, userCompaniesInProject } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { Medical } from "@/models/Medical";
import { Project } from "@/models/Project";
import { ProjectCompany } from "@/models/ProjectCompany";
import { DashboardCharts } from "@/components/dashboard-charts";
import { PageShell } from "@/components/page-shell";
import { ProjectTabs } from "@/components/project-tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatCard } from "@/components/ui/stat-card";

function formatVndCompact(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 đ";
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, "")} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")} tr`;
  }
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectName: string }>;
  searchParams: Promise<{
    month?: string;
    week?: string;
    company?: string;
    ma_nhom?: string;
    hang_sx?: string;
    period_mode?: string;
  }>;
}) {
  const user = await requireUser();
  const { projectName } = await params;
  const decodedProjectName = decodeURIComponent(projectName);
  const query = await searchParams;

  await connectToDatabase();

  const project = await Project.findOne({ name: decodedProjectName }).lean();
  if (!project) {
    notFound();
  }

  const userCompanies = userCompaniesInProject(user, decodedProjectName);

  if (!user.isAdmin && userCompanies.length === 0) {
    notFound();
  }

  // --- Filter params ---
  const filterMonth = query.month ? Number(query.month) : null;
  const filterWeek = query.week ? Number(query.week) : null;
  const filterCompany = (query.company ?? "").trim();
  const filterMaNhom = (query.ma_nhom ?? "").trim();
  const filterHangSx = (query.hang_sx ?? "").trim();
  const periodMode = query.period_mode === "week" ? "week" : "month";

  const scopeQuery: Record<string, unknown> = user.isAdmin
    ? { project: decodedProjectName, is_delete: false }
    : { project: decodedProjectName, company: { $in: userCompanies }, is_delete: false };

  if (filterCompany) scopeQuery.company = filterCompany;
  if (filterMaNhom) scopeQuery.ma_nhom = filterMaNhom;
  if (filterHangSx) scopeQuery.hang_sx = filterHangSx;

  const [
    totalSupplies,
    distinctCompanies,
    totalBidAmountAgg,
    companiesInProject,
    distinctMaNhom,
    distinctHangSx,
  ] = await Promise.all([
    Medical.countDocuments(scopeQuery),
    Medical.distinct("company", scopeQuery),
    Medical.aggregate([
      { $match: scopeQuery },
      {
        $group: {
          _id: null,
          totalBidAmount: {
            $sum: { $convert: { input: "$don_gia", to: "double", onError: 0, onNull: 0 } },
          },
        },
      },
    ]),
    user.isAdmin
      ? ProjectCompany.find({ project: decodedProjectName }).sort({ name: 1 }).lean()
      : [],
    Medical.distinct("ma_nhom", { project: decodedProjectName, is_delete: false, ma_nhom: { $ne: "" } }),
    Medical.distinct("hang_sx", { project: decodedProjectName, is_delete: false, hang_sx: { $ne: "" } }),
  ]);

  const encodedProjectName = encodeURIComponent(decodedProjectName);

  // --- Chart aggregations ---

  // Build period match conditions
  const periodMatchConditions: Record<string, unknown>[] = [];
  if (filterMonth !== null) periodMatchConditions.push({ "period_values.month": filterMonth });
  if (filterWeek !== null) periodMatchConditions.push({ "period_values.week": filterWeek });

  const periodUnwindPipeline = [
    { $match: scopeQuery },
    { $unwind: "$period_values" },
    ...(periodMatchConditions.length > 0
      ? [{ $match: { $and: periodMatchConditions } }]
      : []),
  ];

  // Chart 1: Usage by period (group by month or week)
  const groupByField = periodMode === "week" ? "$period_values.week" : "$period_values.month";
  const usageByPeriodRaw: Array<{ _id: number; total: number }> = await Medical.aggregate([
    ...periodUnwindPipeline,
    {
      $group: {
        _id: groupByField,
        total: { $sum: { $convert: { input: "$period_values.so_luong_su_dung", to: "double", onError: 0, onNull: 0 } } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const usageByPeriod = usageByPeriodRaw.map((item) => ({
    label: periodMode === "week" ? `Tuần ${item._id}` : `T${item._id}`,
    value: Math.round(item.total),
  }));

  // Chart 2: Top 10 supplies by SL SD
  const topSuppliesRaw: Array<{ _id: string; total: number }> = await Medical.aggregate([
    ...periodUnwindPipeline,
    {
      $group: {
        _id: "$ten_vtyt_bv",
        total: { $sum: { $convert: { input: "$period_values.so_luong_su_dung", to: "double", onError: 0, onNull: 0 } } },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);
  const topSupplies = topSuppliesRaw
    .filter((i) => i.total > 0)
    .map((i) => ({ name: i._id || "—", value: Math.round(i.total) }));

  // Chart 3: Top 10 supplies closest to exhausting bid (lowest remaining %)
  const topCompaniesRaw: Array<{ _id: string; totalUsed: number; totalBid: number }> = await Medical.aggregate([
    ...periodUnwindPipeline,
    {
      $group: {
        _id: "$ten_vtyt_bv",
        totalUsed: {
          $sum: {
            $convert: { input: "$period_values.so_luong_su_dung", to: "double", onError: 0, onNull: 0 },
          },
        },
        totalBid: { $sum: { $convert: { input: "$so_luong", to: "double", onError: 0, onNull: 0 } } },
      },
    },
  ]);
  const topCompanies = topCompaniesRaw
    .filter((item) => item.totalBid > 0)
    .map((item) => {
      const usagePercent = (item.totalUsed / item.totalBid) * 100;
      const remainingPercent = Math.max(0, 100 - usagePercent);
      return {
        name: item._id || "—",
        value: Number(remainingPercent.toFixed(2)),
      };
    })
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);

  // Chart 4: % usage by supply (same as top 10 supplies)
  const usagePercent = topSupplies;

  return (
    <PageShell
      user={user}
      title={`Dashboard - ${decodedProjectName}`}
      action={<ProjectTabs projectName={decodedProjectName} current="dashboard" />}
    >

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Trạng thái dự án"
          value={project.status === "VISIBLE" ? "Hiển thị" : "Ẩn"}
          icon={<Activity size={20} />}
          accent={project.status === "VISIBLE" ? "green" : "amber"}
        />
        <StatCard
          label="Tổng VTYTTH"
          value={totalSupplies}
          icon={<Stethoscope size={20} />}
          accent="blue"
        />
        <StatCard
          label="Tổng số công ty"
          value={distinctCompanies.length}
          icon={<Building2 size={20} />}
          accent="teal"
        />
        <StatCard
          label="Tổng thầu"
          value={
            totalBidAmountAgg[0]?.totalBidAmount
              ? formatVndCompact(Number(totalBidAmountAgg[0].totalBidAmount))
              : "0 đ"
          }
          icon={<DollarSign size={20} />}
          accent="purple"
        />
      </section>

      {/* Quick info + link */}
      <section className="mm-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="mm-section-title">Thông tin dự án</h2>
            <p className="text-sm text-zinc-600">
              {project.description || "Chưa có mô tả cho dự án này."}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard filter + charts (admin only) */}
      {user.isAdmin ? <section className="mm-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-emerald-600" />
          <h2 className="mm-section-title">Biểu đồ thống kê</h2>
        </div>

        {/* Filter form */}
        <form className="mb-6 flex flex-wrap items-end gap-2">
          {/* Tháng */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Tháng</label>
            <SearchableSelect
              name="month"
              defaultValue={query.month ?? ""}
              placeholder="Tất cả"
              className="mm-input w-auto min-w-28"
              options={[
                { value: "", label: "Tất cả" },
                ...Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
                  value: String(month),
                  label: `Tháng ${month}`,
                })),
              ]}
            />
          </div>

          {/* Tuần */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Tuần</label>
            <SearchableSelect
              name="week"
              defaultValue={query.week ?? ""}
              placeholder="Tất cả"
              className="mm-input w-auto min-w-24"
              options={[
                { value: "", label: "Tất cả" },
                ...[1, 2, 3, 4].map((week) => ({
                  value: String(week),
                  label: `Tuần ${week}`,
                })),
              ]}
            />
          </div>

          {/* Công ty */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Công ty</label>
            <SearchableSelect
              name="company"
              defaultValue={filterCompany}
              placeholder="Tất cả"
              className="mm-input w-auto min-w-36"
              options={[
                { value: "", label: "Tất cả" },
                ...(user.isAdmin
                  ? companiesInProject.map((company) => ({ value: company.name }))
                  : userCompanies.map((companyName) => ({ value: companyName }))),
              ]}
            />
          </div>

          {/* Nhóm vật tư */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Nhóm vật tư</label>
            <SearchableSelect
              name="ma_nhom"
              defaultValue={filterMaNhom}
              placeholder="Tất cả"
              className="mm-input w-auto min-w-36"
              options={[
                { value: "", label: "Tất cả" },
                ...distinctMaNhom.sort().map((value) => ({ value })),
              ]}
            />
          </div>

          {/* Hãng sản xuất */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Hãng sản xuất</label>
            <SearchableSelect
              name="hang_sx"
              defaultValue={filterHangSx}
              placeholder="Tất cả"
              className="mm-input w-auto min-w-36"
              options={[
                { value: "", label: "Tất cả" },
                ...distinctHangSx.sort().map((value) => ({ value })),
              ]}
            />
          </div>

          {/* Trục X */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Trục X biểu đồ</label>
            <SearchableSelect
              name="period_mode"
              defaultValue={periodMode}
              className="mm-input w-auto min-w-28"
              options={[
                { value: "month", label: "Theo tháng" },
                { value: "week", label: "Theo tuần" },
              ]}
            />
          </div>

          <button type="submit" className="mm-btn-primary shrink-0">
            Áp dụng
          </button>
        </form>

        {/* Charts */}
        <DashboardCharts
          usageByPeriod={usageByPeriod}
          topSupplies={topSupplies}
          topCompanies={topCompanies}
          usagePercent={usagePercent}
          periodMode={periodMode}
        />
      </section> : null}
    </PageShell>
  );
}
