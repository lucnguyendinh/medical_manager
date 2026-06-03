"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/submit-button";

export type ProjectCompanyRow = {
  id: string;
  name: string;
  phone_number: string;
  tax_number: string;
  address: string;
  bank_account_number: string;
  bank_name: string;
};

type ProjectCompaniesTableProps = {
  basePath: string;
  q: string;
  page: number;
  totalPages: number;
  totalCount: number;
  companies: ProjectCompanyRow[];
  updateCompanyAction: (formData: FormData) => Promise<void>;
  deleteCompanyAction: (formData: FormData) => Promise<void>;
};

function Cell({
  value,
  className,
  maxWidth = "max-w-40",
}: {
  value: string;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <td title={value || undefined} className={`truncate ${maxWidth} ${className ?? ""}`}>
      {value || "—"}
    </td>
  );
}

function CompanyEditForm({
  company,
  action,
}: {
  company: ProjectCompanyRow;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="companyId" value={company.id} />
      <FormField label="Tên công ty" className="md:col-span-2">
        <input value={company.name} disabled className="mm-input-readonly" />
      </FormField>
      <FormField label="Số điện thoại">
        <input
          name="phone_number"
          defaultValue={company.phone_number}
          placeholder="0x xxx xxx xxx"
          className="mm-input"
        />
      </FormField>
      <FormField label="Mã số thuế">
        <input name="tax_number" defaultValue={company.tax_number} placeholder="MST" className="mm-input" />
      </FormField>
      <FormField label="Địa chỉ" className="md:col-span-2">
        <input name="address" defaultValue={company.address} placeholder="Địa chỉ đầy đủ" className="mm-input" />
      </FormField>
      <FormField label="Số tài khoản ngân hàng">
        <input
          name="bank_account_number"
          defaultValue={company.bank_account_number}
          placeholder="Số tài khoản"
          className="mm-input"
        />
      </FormField>
      <FormField label="Ngân hàng">
        <input name="bank_name" defaultValue={company.bank_name} placeholder="Tên ngân hàng" className="mm-input" />
      </FormField>
      <div className="flex justify-end md:col-span-2">
        <SubmitButton label="Lưu thay đổi" pendingLabel="Đang lưu..." />
      </div>
    </form>
  );
}

export function ProjectCompaniesTable({
  basePath,
  q,
  page,
  totalPages,
  totalCount,
  companies,
  updateCompanyAction,
  deleteCompanyAction,
}: ProjectCompaniesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingCompany = useMemo(
    () => (editingId ? companies.find((c) => c.id === editingId) ?? null : null),
    [companies, editingId],
  );

  const querySuffix = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <section className="mm-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="mm-section-title">Danh sách công ty</h2>
        </div>

        <div className="border-b border-zinc-100 px-4 py-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-48 flex-1">
              <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên, SĐT, MST, địa chỉ, ngân hàng..."
                className="mm-input pl-8"
              />
            </div>
            <button type="submit" className="mm-btn-primary shrink-0">
              <Search size={13} />
              Lọc
            </button>
          </form>
        </div>

        {/* Mobile: stacked cards (below md) */}
        <div className="space-y-3 p-4 md:hidden">
          {companies.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {totalCount === 0 ? "Chưa có công ty nào." : "Không có công ty khớp bộ lọc."}
            </p>
          ) : (
            companies.map((company) => (
              <div
                key={company.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {company.name || "—"}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="min-w-0">
                    <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                      Số điện thoại
                    </dt>
                    <dd className="truncate text-sm text-zinc-700">{company.phone_number || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                      Mã số thuế
                    </dt>
                    <dd className="truncate font-mono text-xs text-zinc-700">
                      {company.tax_number || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                      Địa chỉ
                    </dt>
                    <dd className="text-sm text-zinc-700">{company.address || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                      STK
                    </dt>
                    <dd className="truncate font-mono text-xs text-zinc-700">
                      {company.bank_account_number || "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                      Ngân hàng
                    </dt>
                    <dd className="truncate text-sm text-zinc-700">{company.bank_name || "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end gap-1.5 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(company.id)}
                    className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                    title="Chỉnh sửa"
                  >
                    <Pencil size={12} />
                    Sửa
                  </button>
                  <form action={deleteCompanyAction} className="contents">
                    <input type="hidden" name="companyId" value={company.id} />
                    <SubmitButton label="Xóa" pendingLabel="..." className="mm-btn-danger mm-btn-sm" />
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: full table (md and up) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Tên công ty</th>
                <th>Số điện thoại</th>
                <th>Mã số thuế</th>
                <th>Địa chỉ</th>
                <th>STK</th>
                <th>Ngân hàng</th>
                <th className="sticky right-0 bg-zinc-50 text-right shadow-[-1px_0_0_0_#e4e4e7]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400">
                    {totalCount === 0 ? "Chưa có công ty nào." : "Không có công ty khớp bộ lọc."}
                  </td>
                </tr>
              ) : null}
              {companies.map((company) => (
                <tr key={company.id} className="whitespace-nowrap">
                  <Cell value={company.name} maxWidth="max-w-48" className="font-medium text-zinc-800" />
                  <Cell value={company.phone_number} maxWidth="max-w-32" />
                  <Cell value={company.tax_number} maxWidth="max-w-28" className="font-mono text-xs" />
                  <Cell value={company.address} maxWidth="max-w-56" />
                  <Cell value={company.bank_account_number} maxWidth="max-w-32" className="font-mono text-xs" />
                  <Cell value={company.bank_name} maxWidth="max-w-40" />
                  <td className="sticky right-0 bg-white shadow-[-1px_0_0_0_#e4e4e7]">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(company.id)}
                        className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={12} />
                        Sửa
                      </button>
                      <form action={deleteCompanyAction} className="contents">
                        <input type="hidden" name="companyId" value={company.id} />
                        <SubmitButton
                          label="Xóa"
                          pendingLabel="..."
                          className="mm-btn-danger mm-btn-sm"
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mm-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-400">
            Trang <span className="font-semibold text-zinc-700">{page}</span> /{" "}
            <span className="font-semibold text-zinc-700">{totalPages}</span>
            {" — "}
            <span className="font-semibold text-zinc-700">{totalCount}</span> công ty
          </span>
          <div className="flex items-center gap-1">
            <Link
              className={`mm-btn-secondary mm-btn-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              href={`${basePath}?page=${Math.max(1, page - 1)}${querySuffix}`}
            >
              <ChevronLeft size={13} />
              Trước
            </Link>
            <Link
              className={`mm-btn-secondary mm-btn-sm ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
              href={`${basePath}?page=${Math.min(totalPages, page + 1)}${querySuffix}`}
            >
              Sau
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {editingCompany ? (
        <Modal title="Chỉnh sửa công ty" onClose={() => setEditingId(null)} maxWidth="max-w-2xl">
          <CompanyEditForm company={editingCompany} action={updateCompanyAction} />
        </Modal>
      ) : null}
    </>
  );
}
