"use client";

import { useState } from "react";
import { Plus, Pencil, Info, AlertTriangle, Calendar, ImageIcon } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MediaUploader } from "@/components/ui/media-uploader";
import { SubmitButton } from "@/components/submit-button";
import type { MedicalMedia } from "@/lib/medical-media";

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
  media: MedicalMedia[];
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

function MediaCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-600"
      title={`${count} ảnh`}
    >
      <ImageIcon size={10} />
      {count}
    </span>
  );
}

function PercentBar({ value, barWidth = "w-16" }: { value: string; barWidth?: string }) {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return <span className="text-zinc-400">—</span>;
  const pct = Math.min(100, Math.max(0, num));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`h-1.5 ${barWidth} overflow-hidden rounded-full bg-zinc-100`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-zinc-700">{value}%</span>
    </div>
  );
}

/* ── Mobile card — stacked layout shown below the `md` breakpoint ── */
function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="truncate text-sm text-zinc-700">{value || "—"}</dd>
    </div>
  );
}

function MedicalCard({
  medical,
  onEdit,
  deleteMedicalAction,
}: {
  medical: MedicalRow;
  onEdit: () => void;
  deleteMedicalAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {medical.ten_vtyt_bv || "—"}
            </p>
            <MediaCountBadge count={medical.media.length} />
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-emerald-700">
            {medical.ma_vtyt_bv || "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          {medical.company || "—"}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <MobileField label={FIELD_LABELS.ma_nhom} value={medical.ma_nhom} />
        <MobileField label={FIELD_LABELS.ma_hieu} value={medical.ma_hieu} />
        <MobileField label={FIELD_LABELS.don_vi_tinh} value={medical.don_vi_tinh} />
        <MobileField label={FIELD_LABELS.hang_sx} value={medical.hang_sx} />
        <MobileField label={FIELD_LABELS.don_gia} value={medical.don_gia} />
        <MobileField label={FIELD_LABELS.dinh_muc} value={medical.dinh_muc} />
        <MobileField label={FIELD_LABELS.so_luong} value={medical.so_luong} />
        <MobileField label={FIELD_LABELS.so_luong_su_dung} value={medical.so_luong_su_dung} />
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
            {FIELD_LABELS.phan_tram}
          </p>
          <PercentBar value={medical.phan_tram} barWidth="w-24" />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
            title="Chỉnh sửa"
          >
            <Pencil size={12} />
            Sửa
          </button>
          <form action={deleteMedicalAction} className="contents">
            <input type="hidden" name="medicalId" value={medical.id} />
            <SubmitButton label="Xóa" pendingLabel="..." className="mm-btn-danger mm-btn-sm" />
          </form>
        </div>
      </div>
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
        {/* Media stays editable for all roles, unlike the identity fields above. */}
        <FormField label="Hình ảnh" hint="Chụp ảnh hoặc tải lên (tối đa 10 ảnh).">
          <MediaUploader defaultValue={defaultRow?.media ?? []} />
        </FormField>
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
              type="number"
              name="don_gia"
              defaultValue={defaultRow?.don_gia ?? ""}
              placeholder="Đơn giá"
              disabled={isLimitedEdit}
              className="mm-input"
            />
          </FormField>
          <FormField label={FIELD_LABELS.dinh_muc}>
            <input
              type="number"
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
            <SearchableSelect
              name="company"
              defaultValue={defaultRow?.company ?? ""}
              required
              disabled={isLimitedEdit}
              placeholder="— Chọn công ty —"
              className="mm-input"
              options={[
                { value: "", label: "— Chọn công ty —" },
                ...companies.map((company) => ({ value: company.name })),
              ]}
            />
          </FormField>
          <FormField label={FIELD_LABELS.so_luong}>
            <input
              type="number"
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
        <fieldset className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/20 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-emerald-500">
            <Calendar size={11} />
            Dữ liệu kỳ — Tháng {selectedMonth} / Tuần {selectedWeek}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label={FIELD_LABELS.so_luong_su_dung}>
              <input
                type="number"
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
          </div>
          <FormField label={FIELD_LABELS.tstk}>
            <textarea
              name="tstk"
              defaultValue={defaultRow?.tstk ?? ""}
              placeholder="TSTK..."
              rows={3}
              className="mm-input resize-y"
            />
          </FormField>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
              <Calendar size={11} />
              Tháng {selectedMonth} — Tuần {selectedWeek}
            </span>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mm-btn-primary"
            >
              <Plus size={14} />
              Thêm mới
            </button>
          </div>
        </div>

        {/* Mobile: stacked cards (below md) */}
        <div className="space-y-3 p-4 md:hidden">
          {medicalRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">Không có bản ghi nào.</p>
          ) : (
            medicalRows.map((medical) => (
              <MedicalCard
                key={medical.id}
                medical={medical}
                onEdit={() => setEditingRowId(medical.id)}
                deleteMedicalAction={deleteMedicalAction}
              />
            ))
          )}
        </div>

        {/* Desktop: full table (md and up) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="mm-table">
            <thead>
              <tr>
                <th>{FIELD_LABELS.ma_nhom}</th>
                <th>{FIELD_LABELS.ma_vtyt_bv}</th>
                <th>{FIELD_LABELS.ten_vtyt_bv}</th>
                <th>{FIELD_LABELS.don_vi_tinh}</th>
                <th>{FIELD_LABELS.ma_hieu}</th>
                <th>{FIELD_LABELS.hang_sx}</th>
                <th>{FIELD_LABELS.don_gia}</th>
                <th>{FIELD_LABELS.company}</th>
                <th>{FIELD_LABELS.dinh_muc}</th>
                <th>{FIELD_LABELS.so_luong}</th>
                <th>{FIELD_LABELS.so_luong_su_dung}</th>
                <th>{FIELD_LABELS.phan_tram}</th>
                <th className="sticky right-0 bg-zinc-50 text-right shadow-[-1px_0_0_0_#e4e4e7]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {medicalRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-zinc-400">
                    Không có bản ghi nào.
                  </td>
                </tr>
              ) : null}
              {medicalRows.map((medical) => (
                <tr key={medical.id} className="whitespace-nowrap">
                  <Cell value={medical.ma_nhom} className="text-zinc-500" />
                  <Cell value={medical.ma_vtyt_bv} className="font-mono text-xs text-emerald-700" />
                  <td title={medical.ten_vtyt_bv || undefined} className="max-w-56">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-zinc-800">
                        {medical.ten_vtyt_bv || "—"}
                      </span>
                      <MediaCountBadge count={medical.media.length} />
                    </div>
                  </td>
                  <Cell value={medical.don_vi_tinh} maxWidth="max-w-24" />
                  <Cell value={medical.ma_hieu} className="font-mono text-xs" />
                  <Cell value={medical.hang_sx} />
                  <Cell value={medical.don_gia} maxWidth="max-w-32" className="text-right font-mono text-xs" />
                  <td title={medical.company || undefined} className="max-w-40 truncate">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {medical.company || "—"}
                    </span>
                  </td>
                  <Cell value={medical.dinh_muc} maxWidth="max-w-32" className="text-right font-mono text-xs" />
                  <Cell value={medical.so_luong} maxWidth="max-w-32" className="text-right font-mono text-xs" />
                  <Cell value={medical.so_luong_su_dung} maxWidth="max-w-32" className="text-right font-mono text-xs" />
                  <td className="max-w-32">
                    <PercentBar value={medical.phan_tram} />
                  </td>
                  <td className="sticky right-0 bg-white shadow-[-1px_0_0_0_#e4e4e7]">
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
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                Dữ liệu kỳ được lưu cho <strong>Tháng {selectedMonth} — Tuần {selectedWeek}</strong>.
              </span>
            </div>
            {!canEditAllFields ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
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
