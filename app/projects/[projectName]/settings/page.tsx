import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building2, CheckCircle2, Stethoscope, Upload, XCircle } from "lucide-react";

import { requireAdmin, requireUser, userCompaniesInProject } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { ensureRequiredHeaders, parseCsvFile } from "@/lib/csv-import";
import { Medical } from "@/models/Medical";
import { Project } from "@/models/Project";
import { ProjectCompany } from "@/models/ProjectCompany";
import { PageShell } from "@/components/page-shell";
import { ProjectTabs } from "@/components/project-tabs";
import { ProjectCreateCompanyModal } from "@/components/project-create-company-modal";
import { ProjectCompaniesTable } from "@/components/project-companies-table";
import { FormField } from "@/components/ui/form-field";
import { CsvImportCard } from "@/components/ui/csv-import-card";
import { SubmitButton } from "@/components/submit-button";

const COMPANIES_PAGE_SIZE = 10;

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectName: string }>;
  searchParams: Promise<{
    importStatus?: string;
    importMessage?: string;
    actionStatus?: string;
    actionMessage?: string;
    q?: string;
    page?: string;
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

  const encodedProjectName = encodeURIComponent(decodedProjectName);
  const settingsBasePath = `/projects/${encodedProjectName}/settings`;

  const companySearchQ = (query.q ?? "").trim();
  const companyPageRaw = Math.max(1, Number(query.page ?? "1") || 1);

  const companyMatch: Record<string, unknown> = { project: decodedProjectName };
  if (companySearchQ) {
    const escaped = companySearchQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    companyMatch.$or = [
      { name: regex },
      { phone_number: regex },
      { tax_number: regex },
      { address: regex },
      { bank_account_number: regex },
      { bank_name: regex },
    ];
  }

  let companiesTotalCount = 0;
  let companiesPage = 1;
  let companiesTotalPages = 1;
  let companiesTableRows: Array<{
    id: string;
    name: string;
    phone_number: string;
    tax_number: string;
    address: string;
    bank_account_number: string;
    bank_name: string;
  }> = [];

  if (user.isAdmin) {
    companiesTotalCount = await ProjectCompany.countDocuments(companyMatch);
    companiesTotalPages = Math.max(1, Math.ceil(companiesTotalCount / COMPANIES_PAGE_SIZE));
    companiesPage = Math.min(companyPageRaw, companiesTotalPages);
    const skip = (companiesPage - 1) * COMPANIES_PAGE_SIZE;
    const docs = await ProjectCompany.find(companyMatch)
      .sort({ name: 1 })
      .skip(skip)
      .limit(COMPANIES_PAGE_SIZE)
      .lean();
    companiesTableRows = docs.map((c) => ({
      id: c._id.toString(),
      name: c.name ?? "",
      phone_number: c.phone_number ?? "",
      tax_number: c.tax_number ?? "",
      address: c.address ?? "",
      bank_account_number: c.bank_account_number ?? "",
      bank_name: c.bank_name ?? "",
    }));
  }

  const userCompanyDocs = userCompanies.length > 0
    ? await ProjectCompany.find({ project: decodedProjectName, name: { $in: userCompanies } })
        .sort({ name: 1 })
        .lean()
    : [];

  async function createCompanyAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    if (!actor.isAdmin) return;
    await connectToDatabase();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await ProjectCompany.create({
      project: decodedProjectName,
      name,
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      tax_number: String(formData.get("tax_number") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim(),
      bank_name: String(formData.get("bank_name") ?? "").trim(),
    });

    revalidatePath(`/projects/${encodedProjectName}/dashboard`);
    revalidatePath(`/projects/${encodedProjectName}/medical`);
    revalidatePath(`/projects/${encodedProjectName}/settings`);
    revalidatePath("/projects");
    revalidatePath("/admin/users");
  }

  async function updateCompanyAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    await connectToDatabase();

    const companyId = String(formData.get("companyId") ?? "");
    const updateData = {
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      tax_number: String(formData.get("tax_number") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim(),
      bank_name: String(formData.get("bank_name") ?? "").trim(),
    };

    if (actor.isAdmin) {
      await ProjectCompany.findOneAndUpdate(
        { _id: companyId, project: decodedProjectName },
        updateData,
      );
    } else {
      const actorCompanies = actor.assignments
        .filter((a) => a.project === decodedProjectName)
        .map((a) => a.company);
      if (actorCompanies.length > 0) {
        await ProjectCompany.findOneAndUpdate(
          { _id: companyId, project: decodedProjectName, name: { $in: actorCompanies } },
          updateData,
        );
      }
    }

    revalidatePath(`/projects/${encodedProjectName}/dashboard`);
    revalidatePath(`/projects/${encodedProjectName}/medical`);
    revalidatePath(`/projects/${encodedProjectName}/settings`);
    revalidatePath("/projects");
    revalidatePath("/admin/users");
  }

  async function deleteCompanyAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const companyId = String(formData.get("companyId") ?? "").trim();
    if (!companyId) return;

    const doc = await ProjectCompany.findOne({
      _id: companyId,
      project: decodedProjectName,
    }).lean();
    if (!doc) return;

    const inUse = await Medical.countDocuments({
      project: decodedProjectName,
      company: doc.name,
      is_delete: false,
    });
    if (inUse > 0) {
      redirect(
        `${settingsBasePath}?actionStatus=error&actionMessage=${encodeURIComponent(
          `Không thể xóa công ty: đang có ${inUse} vật tư gắn với công ty này.`,
        )}`,
      );
    }

    await ProjectCompany.deleteOne({ _id: companyId, project: decodedProjectName });

    revalidatePath(`/projects/${encodedProjectName}/dashboard`);
    revalidatePath(`/projects/${encodedProjectName}/medical`);
    revalidatePath(`/projects/${encodedProjectName}/settings`);
    revalidatePath("/projects");
    revalidatePath("/admin/users");
  }

  async function importCompaniesCsvAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    let importedCount = 0;

    try {
      const rows = await parseCsvFile(formData.get("file"));
      ensureRequiredHeaders(rows, ["name"], "Companies CSV");
      if (rows.length > 5000) {
        throw new Error("Companies CSV vượt quá giới hạn 5000 dòng.");
      }

      const normalized = rows.map((row, index) => {
        const name = row.name.trim();
        if (!name) {
          throw new Error(`Companies CSV dòng ${index + 2}: name là bắt buộc.`);
        }
        const rowProject = (row.project ?? "").trim();
        if (rowProject && rowProject !== decodedProjectName) {
          throw new Error(
            `Companies CSV dòng ${index + 2}: project "${rowProject}" không khớp với dự án hiện tại.`,
          );
        }
        return {
          project: decodedProjectName,
          name,
          phone_number: (row.phone_number ?? "").trim(),
          tax_number: (row.tax_number ?? "").trim(),
          address: (row.address ?? "").trim(),
          bank_account_number: (row.bank_account_number ?? "").trim(),
          bank_name: (row.bank_name ?? "").trim(),
        };
      });

      const inFileKeySet = new Set<string>();
      for (const row of normalized) {
        if (inFileKeySet.has(row.name)) {
          throw new Error(`Companies CSV trùng lặp trong file: ${row.name}`);
        }
        inFileKeySet.add(row.name);
      }

      const existing = await ProjectCompany.find({
        project: decodedProjectName,
        name: { $in: Array.from(inFileKeySet) },
      })
        .select("name")
        .lean();
      if (existing.length > 0) {
        throw new Error(`Companies CSV trùng với DB: ${existing[0].name}`);
      }

      await ProjectCompany.insertMany(normalized, { ordered: true });
      importedCount = normalized.length;
      revalidatePath(`/projects/${encodedProjectName}/dashboard`);
      revalidatePath(`/projects/${encodedProjectName}/medical`);
      revalidatePath(`/projects/${encodedProjectName}/settings`);
      revalidatePath("/admin/users");
    } catch (error) {
      redirect(
        `${settingsBasePath}?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Nhập Công ty CSV thất bại.",
        )}`,
      );
    }

    redirect(
      `${settingsBasePath}?importStatus=success&importMessage=${encodeURIComponent(
        `Đã nhập ${importedCount} công ty thành công.`,
      )}`,
    );
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

      const companies = await ProjectCompany.find({ project: decodedProjectName })
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
        const rowProject = (row.project ?? "").trim();
        if (rowProject && rowProject !== decodedProjectName) {
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
          project: decodedProjectName,
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
        project: decodedProjectName,
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
      revalidatePath(`/projects/${encodedProjectName}/dashboard`);
      revalidatePath(`/projects/${encodedProjectName}/medical`);
      revalidatePath(`/projects/${encodedProjectName}/settings`);
    } catch (error) {
      redirect(
        `${settingsBasePath}?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Nhập vật tư CSV thất bại.",
        )}`,
      );
    }

    redirect(
      `${settingsBasePath}?importStatus=success&importMessage=${encodeURIComponent(
        `Đã nhập ${importedCount} vật tư y tế thành công.`,
      )}`,
    );
  }

  return (
    <PageShell
      user={user}
      title={`Settings - ${decodedProjectName}`}
      description=""
      action={<ProjectTabs projectName={decodedProjectName} current="settings" />}
    >

      {query.importMessage || query.actionMessage ? (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
            query.importStatus === "success" || query.actionStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {query.importStatus === "success" || query.actionStatus === "success" ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <XCircle size={15} className="shrink-0" />
          )}
          {query.importMessage || query.actionMessage}
        </div>
      ) : null}

      {!user.isAdmin && userCompanyDocs.length > 0 ? (
        <section className="mm-card p-5">
          <div className="mb-4">
            <h2 className="mm-section-title flex items-center gap-2">
              <Building2 size={16} className="text-sky-600" />
              Thông tin công ty của bạn
            </h2>
            <p className="mm-section-desc mt-1">
              Cập nhật thông tin liên hệ công ty. Tên công ty không thể thay đổi.
            </p>
          </div>
          <div className="space-y-4">
            {userCompanyDocs.map((company) => (
              <form
                key={company._id.toString()}
                action={updateCompanyAction}
                className="grid gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-3"
              >
                <input type="hidden" name="companyId" value={company._id.toString()} />
                <FormField label="Tên công ty">
                  <input value={company.name} disabled className="mm-input-readonly" />
                </FormField>
                <FormField label="Số điện thoại">
                  <input
                    name="phone_number"
                    defaultValue={company.phone_number ?? ""}
                    placeholder="0x xxx xxx xxx"
                    className="mm-input"
                  />
                </FormField>
                <FormField label="Mã số thuế">
                  <input
                    name="tax_number"
                    defaultValue={company.tax_number ?? ""}
                    placeholder="MST"
                    className="mm-input"
                  />
                </FormField>
                <FormField label="Địa chỉ" className="md:col-span-2">
                  <input
                    name="address"
                    defaultValue={company.address ?? ""}
                    placeholder="Địa chỉ đầy đủ"
                    className="mm-input"
                  />
                </FormField>
                <FormField label="Số tài khoản ngân hàng">
                  <input
                    name="bank_account_number"
                    defaultValue={company.bank_account_number ?? ""}
                    placeholder="Số tài khoản"
                    className="mm-input"
                  />
                </FormField>
                <FormField label="Ngân hàng" className="md:col-span-2">
                  <input
                    name="bank_name"
                    defaultValue={company.bank_name ?? ""}
                    placeholder="Tên ngân hàng"
                    className="mm-input"
                  />
                </FormField>
                <div className="flex items-end justify-end md:col-span-3">
                  <SubmitButton label="Cập nhật" pendingLabel="Đang lưu..." />
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {user.isAdmin ? (
        <section className="mm-card p-5">
          <div className="mb-4">
            <h2 className="mm-section-title flex items-center gap-2">
              <Upload size={16} className="text-sky-600" />
              Nhập dữ liệu từ CSV
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CsvImportCard
              icon={<Building2 size={16} />}
              title="Nhập danh sách công ty"
              action={importCompaniesCsvAction}
              submitLabel="Nhập Công ty"
            />
            <CsvImportCard
              icon={<Stethoscope size={16} />}
              title="Nhập vật tư y tế"
              action={importMedicalCsvAction}
              submitLabel="Nhập vật tư"
            />
          </div>
        </section>
      ) : null}

      {user.isAdmin ? (
        <div className="space-y-4">
          <section className="mm-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="mm-section-title flex items-center gap-2">
                <Building2 size={16} className="text-sky-600" />
                Quản lý công ty trong dự án
              </h2>
              <ProjectCreateCompanyModal action={createCompanyAction} />
            </div>
          </section>

          <ProjectCompaniesTable
            basePath={settingsBasePath}
            q={companySearchQ}
            page={companiesPage}
            totalPages={companiesTotalPages}
            totalCount={companiesTotalCount}
            companies={companiesTableRows}
            updateCompanyAction={updateCompanyAction}
            deleteCompanyAction={deleteCompanyAction}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
