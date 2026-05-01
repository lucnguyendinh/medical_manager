import mongoose, { Model, Schema, type InferSchemaType } from "mongoose";

const MedicalPeriodValueSchema = new Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    week: { type: Number, required: true, min: 1, max: 4 },
    so_luong_su_dung: { type: String, default: "" },
    phan_tram: { type: String, default: "" },
    tstk: { type: String, default: "" },
    ghi_chu: { type: String, default: "" },
  },
  { _id: false },
);

const MedicalSchema = new Schema(
  {
    ma_nhom: { type: String, default: "" },
    ma_vtyt_bv: { type: String, default: "" },
    ten_vtyt_bv: { type: String, default: "" },
    quy_cach: { type: String, default: "" },
    don_vi_tinh: { type: String, default: "" },
    ma_hieu: { type: String, default: "" },
    hang_sx: { type: String, default: "" },
    nuoc_sx: { type: String, default: "" },
    don_gia: { type: String, default: "" },
    company: { type: String, required: true },
    project: { type: String, required: true },
    dinh_muc: { type: String, default: "" },
    so_luong: { type: String, default: "" },
    period_values: { type: [MedicalPeriodValueSchema], default: [] },
    is_delete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type MedicalDocument = InferSchemaType<typeof MedicalSchema>;

if (mongoose.models.Medical) {
  delete mongoose.models.Medical;
}

export const Medical: Model<MedicalDocument> = mongoose.model<MedicalDocument>(
  "Medical",
  MedicalSchema,
);
