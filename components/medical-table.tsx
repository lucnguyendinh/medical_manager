"use client";

import { useState } from "react";
import { Plus, Pencil, Info, AlertTriangle, Calendar } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/submit-button";

type CompanyOption = {
  id: string;
  name: string;
};

type MedicalRow = {
  id: string;
  ma_nhom: string;
  ma_vtyt_bv: string;
  ten_vtyt_bv: string;
  quy_cach: string;
  don_vi_tinh: string;
  ma_hieu: string;
  hang_sx: string;
  nuoc_sx: string;
  don_gia: string;
  company: string;
  dinh_muc: string;
  so_luong: string;
  so_luong_su_dung: string;
  phan_tram: string;
  tstk: string;
  ghi_chu: string;
};

type MedicalTableProps = {
  projectName: string;
  companies: CompanyOption[];
  medicalRows: MedicalRow[];
  canEditAllFields: boolean;
  createMedicalAction: (formData: FormData) => Promise<void>;
  updateMedicalAction: (formData: FormData) => Promise<void>;
  deleteMedicalAction: (formData: FormData) => Promise<void>;
  selectedMonth: number;
  selectedWeek: number;
};

/* ── Field labels (Vietnamese) ── */
const FIELD_LABELS: Record<string, string> = {
  ma_nhom: "Mã Nhóm",
  ma_vtyt_bv: "Mã VTYT-BV",
  ten_vtyt_bv: "Tên Vật Tư Y Tế",
  quy_cach: "Quy Cách",
  don_vi_tinh: "Đơn Vị Tính",
  ma_hieu: "Mã Hiệu",
  hang_sx: "Hãng Sản Xuất",
  nuoc_sx: "Nước SX",
  don_gia: "Đơn Giá",
  company: "Công Ty",
  dinh_muc: "Định Mức",
  so_luong: "Số Lượng",
  so_luong_su_dung: "SL Sử Dụng",
  phan_tram: "Tỷ Lệ %",
  tstk: "TSTK",
  ghi_chu: "Ghi Chú",
};

function PercentBar({ value }: { value: string }) {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return <span className="text-zinc-400">—</span>;
  const pct = Math.min(100, Math.max(0, num));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-zinc-700">{value}%</span>
    </div>
  );
}

function MedicalForm({
  projectName,
  companies,
  action,
  pendingLabel,
  submitLabel,
  defaultRow,
  selectedMonth,
  selectedWeek,
  includePeriodInputs,
  canEditAllFields,
}: {
  projectName: string;
  companies: CompanyOption[];
  action: (formData: FormData) => Promise<void>;
  pendingLabel: string;
  submitLabel: string;
  defaultRow?: MedicalRow;
  selectedMonth: number;
  selectedWeek: number;
  includePeriodInputs: boolean;
  canEditAllFields: boolean;
}) {
  const isLimitedEdit = Boolean(defaultRow) && !canEditAllFields;

  return (
    <form action={action} className="space-y-4">
      {defaultRow ? <input type="hidden" name="medicalId" value={defaultRow.id} /> : null}
      <input type="hidden" name="project" value={projectName} />
      <input type="hidden" name="month" value={selectedMonth} />
      <input type="hidden" name="week" value={selectedWeek} />

      {/* Identity fields */}
      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Thông tin vật tư
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label={FIELD_LABELS.ma_nhom}>
            <input
              name="ma_nhom"
              defaultValue={defaultRow?.ma_nhom ?? ""}
              placeholder="Nhập mã nhóm"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.ma_vtyt_bv}>
            <input
              name="ma_vtyt_bv"
              defaultValue={defaultRow?.ma_vtyt_bv ?? ""}
              placeholder="Nhập mã VTYT-BV"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
        </div>
        <FormField label={FIELD_LABELS.ten_vtyt_bv}>
          <input
            name="ten_vtyt_bv"
            defaultValue={defaultRow?.ten_vtyt_bv ?? ""}
            placeholder="Tên đầy đủ của vật tư y tế"
            disabled={isLimitedEdit}
            className="mm-input"
          />
        </FormField>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label={FIELD_LABELS.ma_hieu}>
            <input
              name="ma_hieu"
              defaultValue={defaultRow?.ma_hieu ?? ""}
              placeholder="Mã hiệu"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.hang_sx}>
            <input
              name="hang_sx"
              defaultValue={defaultRow?.hang_sx ?? ""}
              placeholder="Hãng sản xuất"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.nuoc_sx}>
            <input
              name="nuoc_sx"
              defaultValue={defaultRow?.nuoc_sx ?? ""}
              placeholder="Nước sản xuất"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
        </div>
      </fieldset>

      {/* Quantity & pricing */}
      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Đơn vị & giá trị
        </legend>
        <div className="grid gap-3 md:grid-cols-4">
          <FormField label={FIELD_LABELS.quy_cach}>
            <input
              name="quy_cach"
              defaultValue={defaultRow?.quy_cach ?? ""}
              placeholder="Quy cách"
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.don_vi_tinh}>
            <input
              name="don_vi_tinh"
              defaultValue={defaultRow?.don_vi_tinh ?? ""}
              placeholder="ĐVT"
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.don_gia}>
            <input
              name="don_gia"
              defaultValue={defaultRow?.don_gia ?? ""}
              placeholder="Đơn giá"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.dinh_muc}>
            <input
              name="dinh_muc"
              defaultValue={defaultRow?.dinh_muc ?? ""}
              placeholder="Định mức"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label={FIELD_LABELS.company} required>
            <select
              name="company"
              defaultValue={defaultRow?.company ?? ""}
              required
              disabled={isLimitedEdit}
              className="mm-input"
            >
              <option value="">— Chọn công ty —</option>
              {companies.map((company) => (
                <option key={company.id} value={company.name}>
                  {company.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={FIELD_LABELS.so_luong}>
            <input
              name="so_luong"
              defaultValue={defaultRow?.so_luong ?? ""}
              placeholder="Số lượng"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
        </div>
      </fieldset>

      {/* Period fields */}
      {includePeriodInputs ? (
        <fieldset className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/30 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold text-sky-700 uppercase tracking-wide">
            <Calendar size={12} />
            Dữ liệu kỳ — Tháng {selectedMonth} / Tuần {selectedWeek}
          </legend>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label={FIELD_LABELS.so_luong_su_dung}>
              <input
                name="so_luong_su_dung"
                defaultValue={defaultRow?.so_luong_su_dung ?? ""}
                placeholder="SL đã sử dụng"
                className="mm-input"
              />
            </FormField>
            <FormField label={FIELD_LABELS.phan_tram}>
              <input
                value={defaultRow?.phan_tram ? `${defaultRow.phan_tram}%` : ""}
                placeholder="Tự động tính"
                disabled
                className="mm-input-readonly"
              />
            </FormField>
            <FormField label={FIELD_LABELS.tstk}>
              <input
                name="tstk"
                defaultValue={defaultRow?.tstk ?? ""}
                placeholder="TSTK"
                className="mm-input"
              />
            </FormField>
          </div>
          <FormField label={FIELD_LABELS.ghi_chu}>
            <input
              name="ghi_chu"
              defaultValue={defaultRow?.ghi_chu ?? ""}
              placeholder="Ghi chú thêm..."
              className="mm-input"
            />
          </FormField>
        </fieldset>
      ) : null}

      {/* Sticky footer — always visible at the bottom of the scroll area */}
      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end border-t border-zinc-100 bg-white px-5 py-3">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}

export function MedicalTable({
  projectName,
  companies,
  medicalRows,
  canEditAllFields,
  createMedicalAction,
  updateMedicalAction,
  deleteMedicalAction,
  selectedMonth,
  selectedWeek,
}: MedicalTableProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  // Store only the id — derive the full row from the live medicalRows prop
  // so the form always reflects the latest server data after a save.
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const editingRow = editingRowId
    ? (medicalRows.find((r) => r.id === editingRowId) ?? null)
    : null;

  return (
    <>
      <section className="mm-card overflow-hidden">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="mm-section-title">Danh sách vật tư y tế</h2>
            <p className="mm-section-desc">Quản lý hồ sơ vật tư và theo dõi sử dụng theo kỳ.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              <Calendar size={12} />
              Tháng {selectedMonth} — Tuần {selectedWeek}
            </span>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mm-btn-primary"
            >
              <Plus size={15} />
              Thêm mới
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="mm-table">
            <thead>
              <tr>
                <th>{FIELD_LABELS.ma_nhom}</th>
                <th>{FIELD_LABELS.ma_vtyt_bv}</th>
                <th>{FIELD_LABELS.ten_vtyt_bv}</th>
                <th>{FIELD_LABELS.quy_cach}</th>
                <th>{FIELD_LABELS.don_vi_tinh}</th>
                <th>{FIELD_LABELS.ma_hieu}</th>
                <th>{FIELD_LABELS.hang_sx}</th>
                <th>{FIELD_LABELS.nuoc_sx}</th>
                <th>{FIELD_LABELS.don_gia}</th>
                <th>{FIELD_LABELS.company}</th>
                <th>{FIELD_LABELS.dinh_muc}</th>
                <th>{FIELD_LABELS.so_luong}</th>
                <th>{FIELD_LABELS.so_luong_su_dung}</th>
                <th>{FIELD_LABELS.phan_tram}</th>
                <th>{FIELD_LABELS.tstk}</th>
                <th>{FIELD_LABELS.ghi_chu}</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {medicalRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-10 text-center text-zinc-400">
                    Không có bản ghi nào.
                  </td>
                </tr>
              ) : null}
              {medicalRows.map((medical) => (
                <tr key={medical.id}>
                  <td className="text-zinc-500">{medical.ma_nhom || "—"}</td>
                  <td className="font-mono text-xs text-sky-700">{medical.ma_vtyt_bv || "—"}</td>
                  <td className="max-w-48 font-medium text-zinc-800">{medical.ten_vtyt_bv || "—"}</td>
                  <td>{medical.quy_cach || "—"}</td>
                  <td>{medical.don_vi_tinh || "—"}</td>
                  <td className="font-mono text-xs">{medical.ma_hieu || "—"}</td>
                  <td>{medical.hang_sx || "—"}</td>
                  <td>{medical.nuoc_sx || "—"}</td>
                  <td className="text-right font-mono text-xs">{medical.don_gia || "—"}</td>
                  <td>
                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                      {medical.company || "—"}
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs">{medical.dinh_muc || "—"}</td>
                  <td className="text-right font-mono text-xs">{medical.so_luong || "—"}</td>
                  <td className="text-right font-mono text-xs">{medical.so_luong_su_dung || "—"}</td>
                  <td>
                    <PercentBar value={medical.phan_tram} />
                  </td>
                  <td>{medical.tstk || "—"}</td>
                  <td className="max-w-32 truncate text-zinc-500">{medical.ghi_chu || "—"}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingRowId(medical.id)}
                        className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={12} />
                        Sửa
                      </button>
                      <form action={deleteMedicalAction} className="contents">
                        <input type="hidden" name="medicalId" value={medical.id} />
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

      {/* Create modal */}
      {isCreateOpen ? (
        <Modal
          title="Thêm vật tư y tế mới"
          onClose={() => setCreateOpen(false)}
          maxWidth="max-w-3xl"
        >
          <MedicalForm
            projectName={projectName}
            companies={companies}
            action={createMedicalAction}
            submitLabel="Tạo mới"
            pendingLabel="Đang tạo..."
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            includePeriodInputs={false}
            canEditAllFields={canEditAllFields}
          />
        </Modal>
      ) : null}

      {/* Edit modal */}
      {editingRow ? (
        <Modal
          title="Chỉnh sửa vật tư y tế"
          onClose={() => setEditingRowId(null)}
          maxWidth="max-w-3xl"
        >
          <div className="mb-4 space-y-2">
            <div className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-700">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Dữ liệu kỳ được lưu cho <strong>Tháng {selectedMonth} — Tuần {selectedWeek}</strong>.
              </span>
            </div>
            {!canEditAllFields ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>
                  Bạn chỉ được chỉnh sửa: <strong>Quy Cách, ĐVT, SL Sử Dụng, TSTK, Ghi Chú</strong>.
                </span>
              </div>
            ) : null}
          </div>
          <MedicalForm
            projectName={projectName}
            companies={companies}
            action={updateMedicalAction}
            submitLabel="Lưu thay đổi"
            pendingLabel="Đang lưu..."
            defaultRow={editingRow}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            includePeriodInputs
            canEditAllFields={canEditAllFields}
          />
        </Modal>
      ) : null}
    </>
  );
}
