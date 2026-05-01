import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Activity, Stethoscope, DollarSign, Building2, ArrowRight, Plus, Upload, CheckCircle2, XCircle } from "lucide-react";

import { requireUser, requireAdmin, userCompaniesInProject } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { ensureRequiredHeaders, parseCsvFile } from "@/lib/csv-import";
import { Medical } from "@/models/Medical";
import { Project } from "@/models/Project";
import { ProjectCompany } from "@/models/ProjectCompany";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { FormField } from "@/components/ui/form-field";
import { CsvImportCard } from "@/components/ui/csv-import-card";
import { SubmitButton } from "@/components/submit-button";

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectName: string }>;
  searchParams: Promise<{ importStatus?: string; importMessage?: string }>;
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

  const scopeQuery = user.isAdmin
    ? { project: decodedProjectName, is_delete: false }
    : { project: decodedProjectName, company: { $in: userCompanies }, is_delete: false };

  const [totalSupplies, distinctCompanies, avgPriceMock, companiesInProject, userCompanyDocs] =
    await Promise.all([
    Medical.countDocuments(scopeQuery),
    Medical.distinct("company", scopeQuery),
    Medical.aggregate([
      { $match: scopeQuery },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: { $toDouble: { $ifNull: ["$don_gia", 0] } } },
        },
      },
    ]),
      user.isAdmin
        ? ProjectCompany.find({ project: decodedProjectName })
            .sort({ name: 1 })
            .lean()
        : [],
      userCompanies.length > 0
        ? ProjectCompany.find({ project: decodedProjectName, name: { $in: userCompanies } })
            .sort({ name: 1 })
            .lean()
        : Promise.resolve([]),
    ]);
  const encodedProjectName = encodeURIComponent(decodedProjectName);

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
      // Admin can update any company in this project.
      await ProjectCompany.findOneAndUpdate(
        { _id: companyId, project: decodedProjectName },
        updateData,
      );
    } else {
      // Regular user may only update companies from their own assignments (name is immutable).
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
    revalidatePath("/projects");
    revalidatePath("/admin/users");
  }

  async function importCompaniesCsvAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const redirectBase = `/projects/${encodedProjectName}/dashboard`;
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
        // Accept optional "project" column — must match current project if present.
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
      revalidatePath(redirectBase);
      revalidatePath(`/projects/${encodedProjectName}/medical`);
      revalidatePath("/admin/users");
    } catch (error) {
      redirect(
        `${redirectBase}?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Nhập Companies CSV thất bại.",
        )}`,
      );
    }

    // redirect() must be called outside try/catch — it works via thrown errors internally.
    redirect(
      `${redirectBase}?importStatus=success&importMessage=${encodeURIComponent(
        `Đã nhập ${importedCount} công ty thành công.`,
      )}`,
    );
  }

  async function importMedicalCsvAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const redirectBase = `/projects/${encodedProjectName}/dashboard`;
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
        // Accept optional "project" column — must match current project if present.
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
      revalidatePath(redirectBase);
      revalidatePath(`/projects/${encodedProjectName}/medical`);
    } catch (error) {
      redirect(
        `${redirectBase}?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Nhập Medical CSV thất bại.",
        )}`,
      );
    }

    redirect(
      `${redirectBase}?importStatus=success&importMessage=${encodeURIComponent(
        `Đã nhập ${importedCount} vật tư y tế thành công.`,
      )}`,
    );
  }

  return (
    <PageShell
      user={user}
      title={`Dashboard: ${decodedProjectName}`}
      description="Tổng quan thống kê và quản lý công ty trong dự án."
    >
      {/* Import status banner */}
      {query.importMessage ? (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
            query.importStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {query.importStatus === "success" ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <XCircle size={15} className="shrink-0" />
          )}
          {query.importMessage}
        </div>
      ) : null}

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Trạng thái dự án"
          value={project.status === "VISIBLE" ? "Hiển thị" : "Ẩn"}
          icon={<Activity size={20} />}
          accent={project.status === "VISIBLE" ? "green" : "amber"}
          description="Trạng thái hiện tại"
        />
        <StatCard
          label="Tổng hồ sơ vật tư"
          value={totalSupplies}
          icon={<Stethoscope size={20} />}
          accent="blue"
          description="Bản ghi không bị xóa"
        />
        <StatCard
          label="Số công ty tham gia"
          value={distinctCompanies.length}
          icon={<Building2 size={20} />}
          accent="teal"
          description="Công ty có vật tư trong dự án"
        />
        <StatCard
          label="Đơn giá trung bình"
          value={avgPriceMock[0]?.avgPrice ? Number(avgPriceMock[0].avgPrice).toFixed(2) : "0.00"}
          icon={<DollarSign size={20} />}
          accent="purple"
          description="Giá trung bình tất cả vật tư"
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
          <Link
            className="mm-btn-secondary flex items-center gap-1.5"
            href={`/projects/${encodedProjectName}/medical`}
          >
            Xem danh sách vật tư
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Company info editor for regular users (one form per assigned company) */}
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

      {/* CSV imports (admin only) */}
      {user.isAdmin ? (
        <section className="mm-card p-5">
          <div className="mb-4">
            <h2 className="mm-section-title flex items-center gap-2">
              <Upload size={16} className="text-sky-600" />
              Nhập dữ liệu từ CSV
            </h2>
            <p className="mm-section-desc mt-1">
              Chế độ nghiêm ngặt: nếu phát hiện bất kỳ dòng trùng lặp hoặc không hợp lệ, toàn bộ lần nhập sẽ bị hủy.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CsvImportCard
              icon={<Building2 size={16} />}
              title="Nhập danh sách công ty"
              hint="Cột bắt buộc: name. Tùy chọn: phone_number, tax_number, address, bank_account_number, bank_name"
              action={importCompaniesCsvAction}
              submitLabel="Nhập Companies"
            />
            <CsvImportCard
              icon={<Stethoscope size={16} />}
              title="Nhập vật tư y tế"
              hint="Cột bắt buộc: company, ma_vtyt_bv, ten_vtyt_bv, ma_hieu. Tùy chọn: ma_nhom, quy_cach, don_vi_tinh, hang_sx, nuoc_sx, don_gia, dinh_muc, so_luong"
              action={importMedicalCsvAction}
              submitLabel="Nhập Medical"
            />
          </div>
        </section>
      ) : null}

      {/* Company management (admin only) */}
      {user.isAdmin ? (
        <section className="mm-card p-5">
          <div className="mb-5">
            <h2 className="mm-section-title flex items-center gap-2">
              <Building2 size={16} className="text-sky-600" />
              Quản lý công ty trong dự án
            </h2>
            <p className="mm-section-desc mt-1">Quản lý thông tin công ty cho dự án này.</p>
          </div>

          {/* Create company form */}
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
              <Plus size={14} />
              Thêm công ty mới
            </p>
            <form action={createCompanyAction} className="grid gap-3 md:grid-cols-3">
              <FormField label="Tên công ty" required>
                <input name="name" required placeholder="Tên công ty" className="mm-input" />
              </FormField>
              <FormField label="Số điện thoại">
                <input name="phone_number" placeholder="0x xxx xxx xxx" className="mm-input" />
              </FormField>
              <FormField label="Mã số thuế">
                <input name="tax_number" placeholder="MST" className="mm-input" />
              </FormField>
              <FormField label="Địa chỉ" className="md:col-span-2">
                <input name="address" placeholder="Địa chỉ đầy đủ" className="mm-input" />
              </FormField>
              <FormField label="Số tài khoản ngân hàng">
                <input name="bank_account_number" placeholder="Số tài khoản" className="mm-input" />
              </FormField>
              <FormField label="Ngân hàng" className="md:col-span-3">
                <input name="bank_name" placeholder="Tên ngân hàng" className="mm-input" />
              </FormField>
              <div className="flex justify-end md:col-span-3">
                <SubmitButton label="Thêm công ty" pendingLabel="Đang thêm..." />
              </div>
            </form>
          </div>

          {/* Existing companies */}
          {companiesInProject.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-zinc-600">
                {companiesInProject.length} công ty hiện có:
              </p>
              {companiesInProject.map((company) => (
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
                  <div className="flex items-end justify-end">
                    <SubmitButton label="Cập nhật" pendingLabel="Đang lưu..." />
                  </div>
                </form>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Chưa có công ty nào được cấu hình.</p>
          )}
        </section>
      ) : null}
    </PageShell>
  );
}
