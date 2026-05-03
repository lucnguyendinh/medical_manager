import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";

import { canManageMedicalRecord, requireAdmin, requireUser, userCompaniesInProject } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { buildMedicalListMatch } from "@/lib/medical-list-match";
import { ensureRequiredHeaders, parseCsvFile } from "@/lib/csv-import";
import { Medical } from "@/models/Medical";
import { Project } from "@/models/Project";
import { ProjectCompany } from "@/models/ProjectCompany";
import { MedicalTable } from "@/components/medical-table";
import { PageShell } from "@/components/page-shell";
import { ProjectTabs } from "@/components/project-tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

function parseDecimal(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculatePercent(soLuong: string, soLuongSuDung: string) {
  const total = parseDecimal(soLuong);
  const used = parseDecimal(soLuongSuDung);
  if (total === null || used === null || total === 0) {
    return "";
  }
  return ((used / total) * 100).toFixed(2);
}

function readFormText(formData: FormData, fieldName: string) {
  const direct = formData.get(fieldName);
  if (typeof direct === "string") {
    const directValue = direct.trim();
    if (directValue) {
      return directValue;
    }
  }

  for (const [key, value] of formData.entries()) {
    if (
      new RegExp(`^\\d+_${fieldName}$`).test(key) &&
      typeof value === "string"
    ) {
      return value.trim();
    }
  }

  return typeof direct === "string" ? direct.trim() : "";
}

function hasSubmittedField(formData: FormData, fieldName: string) {
  if (formData.has(fieldName)) {
    return true;
  }
  for (const key of formData.keys()) {
    if (new RegExp(`^\\d+_${fieldName}$`).test(key)) {
      return true;
    }
  }
  return false;
}

export default async function ProjectMedicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectName: string }>;
  searchParams: Promise<{
    q?: string;
    company?: string;
    month?: string;
    week?: string;
    page?: string;
    importStatus?: string;
    importMessage?: string;
  }>;
}) {
  const user = await requireUser();
  const { projectName } = await params;
  const resolvedProjectName = decodeURIComponent(projectName);
  const query = await searchParams;
  await connectToDatabase();

  const project = await Project.findOne({ name: resolvedProjectName }).lean();
  if (!project) {
    notFound();
  }

  const userCompanies = userCompaniesInProject(user, resolvedProjectName);

  if (!user.isAdmin && userCompanies.length === 0) {
    notFound();
  }

  const q = (query.q ?? "").trim();
  const companyFilter = (query.company ?? "").trim();
  const monthFilter = Math.min(12, Math.max(1, Number(query.month ?? "1") || 1));
  const weekFilter = Math.min(4, Math.max(1, Number(query.week ?? "1") || 1));
  const page = Math.max(1, Number(query.page ?? "1") || 1);

  const companies = user.isAdmin
    ? await ProjectCompany.find({ project: resolvedProjectName })
        .sort({ name: 1 })
        .lean()
    : await ProjectCompany.find({
        project: resolvedProjectName,
        name: { $in: userCompanies },
      })
        .sort({ name: 1 })
        .lean();

  const matchQuery = buildMedicalListMatch({
    projectName: resolvedProjectName,
    user,
    q,
    companyFilter,
  });

  const [totalCount, medicalRows] = await Promise.all([
    Medical.countDocuments(matchQuery),
    Medical.find(matchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = `/projects/${encodeURIComponent(resolvedProjectName)}/medical`;

  async function createMedicalAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    await connectToDatabase();

    const company = readFormText(formData, "company");
    const projectNameFromForm = readFormText(formData, "project");
    if (projectNameFromForm !== resolvedProjectName) {
      return;
    }

    const hasCompanyInProject = await ProjectCompany.exists({
      project: resolvedProjectName,
      name: company,
    });
    if (!hasCompanyInProject) {
      return;
    }

    if (
      !actor.isAdmin &&
      !canManageMedicalRecord(actor, company, projectNameFromForm)
    ) {
      return;
    }

    const payload = {
      ma_nhom: readFormText(formData, "ma_nhom"),
      ma_vtyt_bv: readFormText(formData, "ma_vtyt_bv"),
      ten_vtyt_bv: readFormText(formData, "ten_vtyt_bv"),
      quy_cach: readFormText(formData, "quy_cach"),
      don_vi_tinh: readFormText(formData, "don_vi_tinh"),
      ma_hieu: readFormText(formData, "ma_hieu"),
      hang_sx: readFormText(formData, "hang_sx"),
      nuoc_sx: readFormText(formData, "nuoc_sx"),
      don_gia: readFormText(formData, "don_gia"),
      company,
      project: projectNameFromForm,
      dinh_muc: readFormText(formData, "dinh_muc"),
      so_luong: readFormText(formData, "so_luong"),
    };

    await Medical.create(payload);
    revalidatePath(basePath);
  }

  async function updateMedicalAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    await connectToDatabase();

    const medicalId = readFormText(formData, "medicalId");
    const existing = await Medical.findById(medicalId);
    if (!existing || existing.project !== resolvedProjectName) {
      return;
    }

    if (
      !actor.isAdmin &&
      !canManageMedicalRecord(actor, existing.company, existing.project)
    ) {
      return;
    }

    const submittedCompany = readFormText(formData, "company");
    const nextCompany = actor.isAdmin
      ? submittedCompany || existing.company
      : existing.company;

    if (!actor.isAdmin) {
      // Block tampered payloads early for non-admin users.
      const blockedFields = [
        "ma_nhom",
        "ma_vtyt_bv",
        "ten_vtyt_bv",
        "ma_hieu",
        "hang_sx",
        "nuoc_sx",
        "don_gia",
        "company",
        "dinh_muc",
        "so_luong",
      ];

      for (const fieldName of blockedFields) {
        if (hasSubmittedField(formData, fieldName)) {
          const submittedValue = readFormText(formData, fieldName);
          const currentValue = String((existing as unknown as Record<string, unknown>)[fieldName] ?? "");
          if (submittedValue !== currentValue) {
            return;
          }
        }
      }

      const forbiddenFields: Array<[string, string]> = [
        ["ma_nhom", String(existing.ma_nhom ?? "")],
        ["ma_vtyt_bv", String(existing.ma_vtyt_bv ?? "")],
        ["ten_vtyt_bv", String(existing.ten_vtyt_bv ?? "")],
        ["ma_hieu", String(existing.ma_hieu ?? "")],
        ["hang_sx", String(existing.hang_sx ?? "")],
        ["nuoc_sx", String(existing.nuoc_sx ?? "")],
        ["don_gia", String(existing.don_gia ?? "")],
        ["company", String(existing.company ?? "")],
        ["dinh_muc", String(existing.dinh_muc ?? "")],
        ["so_luong", String(existing.so_luong ?? "")],
      ];

      for (const [fieldName, currentValue] of forbiddenFields) {
        const submittedValue = readFormText(formData, fieldName);
        if (submittedValue && submittedValue !== currentValue) {
          return;
        }
      }
    }

    if (actor.isAdmin && nextCompany !== existing.company) {
      const hasCompanyInProject = await ProjectCompany.exists({
        project: resolvedProjectName,
        name: nextCompany,
      });
      if (!hasCompanyInProject) {
        return;
      }
    }

    const month = Math.min(12, Math.max(1, Number(readFormText(formData, "month") || "1") || 1));
    const week = Math.min(4, Math.max(1, Number(readFormText(formData, "week") || "1") || 1));
    const soLuong = actor.isAdmin
      ? readFormText(formData, "so_luong")
      : String(existing.so_luong ?? "");
    const soLuongSuDung = readFormText(formData, "so_luong_su_dung");

    const periodPayload = {
      month,
      week,
      so_luong_su_dung: soLuongSuDung,
      phan_tram: calculatePercent(soLuong, soLuongSuDung),
      tstk: readFormText(formData, "tstk"),
      ghi_chu: readFormText(formData, "ghi_chu"),
    };

    const periodValues: typeof periodPayload[] = Array.isArray(existing.period_values)
      ? [...existing.period_values]
      : [];

    const existingPeriodIndex = periodValues.findIndex(
      (period) => period.month === month && period.week === week,
    );
    if (existingPeriodIndex >= 0) {
      periodValues.splice(existingPeriodIndex, 1, periodPayload);
    } else {
      periodValues.push(periodPayload);
    }
    await Medical.updateOne(
      { _id: medicalId },
      {
        $set: {
          ma_nhom: actor.isAdmin
            ? readFormText(formData, "ma_nhom")
            : String(existing.ma_nhom ?? ""),
          ma_vtyt_bv: actor.isAdmin
            ? readFormText(formData, "ma_vtyt_bv")
            : String(existing.ma_vtyt_bv ?? ""),
          ten_vtyt_bv: actor.isAdmin
            ? readFormText(formData, "ten_vtyt_bv")
            : String(existing.ten_vtyt_bv ?? ""),
          quy_cach: readFormText(formData, "quy_cach"),
          don_vi_tinh: readFormText(formData, "don_vi_tinh"),
          ma_hieu: actor.isAdmin
            ? readFormText(formData, "ma_hieu")
            : String(existing.ma_hieu ?? ""),
          hang_sx: actor.isAdmin
            ? readFormText(formData, "hang_sx")
            : String(existing.hang_sx ?? ""),
          nuoc_sx: actor.isAdmin
            ? readFormText(formData, "nuoc_sx")
            : String(existing.nuoc_sx ?? ""),
          don_gia: actor.isAdmin
            ? readFormText(formData, "don_gia")
            : String(existing.don_gia ?? ""),
          company: nextCompany,
          project: resolvedProjectName,
          dinh_muc: actor.isAdmin
            ? readFormText(formData, "dinh_muc")
            : String(existing.dinh_muc ?? ""),
          so_luong: soLuong,
          period_values: periodValues,
        },
      },
    );
    revalidatePath(basePath);
  }

  async function deleteMedicalAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    await connectToDatabase();

    const medicalId = readFormText(formData, "medicalId");
    const existing = await Medical.findById(medicalId).lean();
    if (!existing || existing.project !== resolvedProjectName) {
      return;
    }

    if (
      !actor.isAdmin &&
      !canManageMedicalRecord(actor, existing.company, existing.project)
    ) {
      return;
    }

    await Medical.findByIdAndUpdate(medicalId, { is_delete: true });
    revalidatePath(basePath);
  }

  async function importMedicalCsvAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    let importedCount = 0;

    try {
      const rows = await parseCsvFile(formData.get("file"));
      ensureRequiredHeaders(
        rows,
        ["company", "ma_vtyt_bv", "ten_vtyt_bv", "ma_hieu"],
        "Medical CSV",
      );
      if (rows.length > 5000) {
        throw new Error("Medical CSV vượt quá giới hạn 5000 dòng.");
      }

      const companies = await ProjectCompany.find({ project: resolvedProjectName })
        .select("name")
        .lean();
      const companyNameSet = new Set(companies.map((c) => c.name));

      const normalized = rows.map((row, index) => {
        const company = row.company.trim();
        const ma_vtyt_bv = (row.ma_vtyt_bv ?? "").trim();
        const ten_vtyt_bv = (row.ten_vtyt_bv ?? "").trim();
        const ma_hieu = (row.ma_hieu ?? "").trim();
        if (!company || !ma_vtyt_bv || !ten_vtyt_bv || !ma_hieu) {
          throw new Error(
            `Medical CSV dòng ${index + 2}: company, ma_vtyt_bv, ten_vtyt_bv, ma_hieu là bắt buộc.`,
          );
        }
        if (!companyNameSet.has(company)) {
          throw new Error(
            `Medical CSV dòng ${index + 2}: công ty "${company}" không thuộc dự án này.`,
          );
        }
        // Accept optional "project" column — must match current project if present.
        const rowProject = (row.project ?? "").trim();
        if (rowProject && rowProject !== resolvedProjectName) {
          throw new Error(
            `Medical CSV dòng ${index + 2}: project "${rowProject}" không khớp với dự án hiện tại.`,
          );
        }

        return {
          ma_nhom: (row.ma_nhom ?? "").trim(),
          ma_vtyt_bv,
          ten_vtyt_bv,
          quy_cach: (row.quy_cach ?? "").trim(),
          don_vi_tinh: (row.don_vi_tinh ?? "").trim(),
          ma_hieu,
          hang_sx: (row.hang_sx ?? "").trim(),
          nuoc_sx: (row.nuoc_sx ?? "").trim(),
          don_gia: (row.don_gia ?? "").trim(),
          company,
          project: resolvedProjectName,
          dinh_muc: (row.dinh_muc ?? "").trim(),
          so_luong: (row.so_luong ?? "").trim(),
          period_values: [],
          is_delete: false,
        };
      });

      const keySet = new Set<string>();
      for (const row of normalized) {
        const key = `${row.company}::${row.ma_vtyt_bv}::${row.ten_vtyt_bv}::${row.ma_hieu}`;
        if (keySet.has(key)) {
          throw new Error(`Medical CSV trùng lặp trong file: ${key}`);
        }
        keySet.add(key);
      }

      const existing = await Medical.find({
        project: resolvedProjectName,
        $or: normalized.map((item) => ({
          company: item.company,
          ma_vtyt_bv: item.ma_vtyt_bv,
          ten_vtyt_bv: item.ten_vtyt_bv,
          ma_hieu: item.ma_hieu,
          is_delete: false,
        })),
      })
        .select("company ma_vtyt_bv ten_vtyt_bv ma_hieu")
        .lean();
      if (existing.length > 0) {
        const dup = existing[0];
        throw new Error(
          `Medical CSV trùng với DB: ${dup.company}::${dup.ma_vtyt_bv}::${dup.ten_vtyt_bv}::${dup.ma_hieu}`,
        );
      }

      await Medical.insertMany(normalized, { ordered: true });
      importedCount = normalized.length;
      revalidatePath(basePath);
    } catch (error) {
      redirect(
        `${basePath}?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Nhập vật tư CSV thất bại.",
        )}`,
      );
    }

    // redirect() must be called outside try/catch — it works via thrown errors internally.
    redirect(
      `${basePath}?importStatus=success&importMessage=${encodeURIComponent(
        `Đã nhập ${importedCount} vật tư y tế thành công.`,
      )}`,
    );
  }

  function getPeriodValue(
    medical: {
      period_values?: Array<{
        month: number;
        week: number;
        so_luong_su_dung?: string;
        phan_tram?: string;
        tstk?: string;
        ghi_chu?: string;
      }>;
    },
    month: number,
    week: number,
  ) {
    return medical.period_values?.find(
      (period) => Number(period.month) === month && Number(period.week) === week,
    );
  }

  return (
    <PageShell
      user={user}
      title={`Quản lý VTYTTH — ${resolvedProjectName}`}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ProjectTabs projectName={resolvedProjectName} current="medical" />
          <a
            href={`/api/projects/${encodeURIComponent(resolvedProjectName)}/medical/export?month=${monthFilter}&week=${weekFilter}&company=${encodeURIComponent(companyFilter)}&q=${encodeURIComponent(q)}`}
            className="mm-btn-secondary text-xs"
            download
            title="Xuất toàn bộ vật tư khớp bộ lọc hiện tại (tất cả trang, không chỉ trang đang xem)."
          >
            <FileSpreadsheet size={13} />
            Xuất Excel
          </a>
        </div>
      }
    >

      {/* Import status banner */}
      {query.importMessage ? (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            query.importStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {query.importStatus === "success" ? (
            <CheckCircle2 size={14} className="shrink-0" />
          ) : (
            <XCircle size={14} className="shrink-0" />
          )}
          {query.importMessage}
        </div>
      ) : null}

      <section className="mm-card px-4 py-3.5">
        <form className="flex flex-wrap items-end gap-2 md:flex-nowrap">
          <div className="relative min-w-48 flex-1">
            <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo mã, tên, mã hiệu..."
              className="mm-input pl-8"
            />
          </div>
          <SearchableSelect
            name="company"
            defaultValue={companyFilter}
            placeholder="Tất cả công ty"
            className="mm-input w-auto min-w-40"
            options={[
              { value: "", label: "Tất cả công ty" },
              ...companies.map((company) => ({ value: company.name })),
            ]}
          />
          <SearchableSelect
            name="month"
            defaultValue={String(monthFilter)}
            placeholder="Chọn tháng"
            className="mm-input w-auto min-w-32"
            options={Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => ({
              value: String(month),
              label: `Tháng ${month}`,
            }))}
          />
          <SearchableSelect
            name="week"
            defaultValue={String(weekFilter)}
            placeholder="Chọn tuần"
            className="mm-input w-auto min-w-28"
            options={Array.from({ length: 4 }, (_, idx) => idx + 1).map((week) => ({
              value: String(week),
              label: `Tuần ${week}`,
            }))}
          />
          <button type="submit" className="mm-btn-primary shrink-0">
            <Search size={13} />
            Tìm kiếm
          </button>
        </form>
      </section>
      <MedicalTable
        projectName={resolvedProjectName}
        companies={companies.map((company) => ({
          id: company._id.toString(),
          name: company.name,
        }))}
        canEditAllFields={user.isAdmin}
        medicalRows={medicalRows.map((medical) => ({
          id: medical._id.toString(),
          ma_nhom: medical.ma_nhom ?? "",
          ma_vtyt_bv: medical.ma_vtyt_bv ?? "",
          ten_vtyt_bv: medical.ten_vtyt_bv ?? "",
          quy_cach: medical.quy_cach ?? "",
          don_vi_tinh: medical.don_vi_tinh ?? "",
          ma_hieu: medical.ma_hieu ?? "",
          hang_sx: medical.hang_sx ?? "",
          nuoc_sx: medical.nuoc_sx ?? "",
          don_gia: medical.don_gia ?? "",
          company: medical.company ?? "",
          dinh_muc: medical.dinh_muc ?? "",
          so_luong: medical.so_luong ?? "",
          so_luong_su_dung:
            getPeriodValue(medical, monthFilter, weekFilter)?.so_luong_su_dung ?? "",
          phan_tram: calculatePercent(
            medical.so_luong ?? "",
            getPeriodValue(medical, monthFilter, weekFilter)?.so_luong_su_dung ?? "",
          ),
          tstk: getPeriodValue(medical, monthFilter, weekFilter)?.tstk ?? "",
          ghi_chu: getPeriodValue(medical, monthFilter, weekFilter)?.ghi_chu ?? "",
        }))}
        createMedicalAction={createMedicalAction}
        updateMedicalAction={updateMedicalAction}
        deleteMedicalAction={deleteMedicalAction}
        selectedMonth={monthFilter}
        selectedWeek={weekFilter}
      />

      <section className="mm-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-400">
            Trang{" "}
            <span className="font-semibold text-zinc-700">{page}</span>
            {" "}/{" "}
            <span className="font-semibold text-zinc-700">{totalPages}</span>
            {" — "}
            <span className="font-semibold text-zinc-700">{totalCount}</span>
            {" "}bản ghi
          </span>
          <div className="flex items-center gap-1">
            <a
              className={`mm-btn-secondary mm-btn-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              href={`${basePath}?q=${encodeURIComponent(q)}&company=${encodeURIComponent(companyFilter)}&month=${monthFilter}&week=${weekFilter}&page=${Math.max(1, page - 1)}`}
            >
              <ChevronLeft size={13} />
              Trước
            </a>
            <a
              className={`mm-btn-secondary mm-btn-sm ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
              href={`${basePath}?q=${encodeURIComponent(q)}&company=${encodeURIComponent(companyFilter)}&month=${monthFilter}&week=${weekFilter}&page=${Math.min(totalPages, page + 1)}`}
            >
              Sau
              <ChevronRight size={13} />
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
