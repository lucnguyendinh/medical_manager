import mongoose, { Model, Schema, type InferSchemaType } from "mongoose";

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    phone_number: { type: String, default: "" },
    tax_number: { type: String, default: "" },
    address: { type: String, default: "" },
    bank_account_number: { type: String, default: "" },
    bank_name: { type: String, default: "" },
  },
  { timestamps: true },
);

export type CompanyDocument = InferSchemaType<typeof CompanySchema>;

export const Company: Model<CompanyDocument> =
  mongoose.models.Company ||
  mongoose.model<CompanyDocument>("Company", CompanySchema);
