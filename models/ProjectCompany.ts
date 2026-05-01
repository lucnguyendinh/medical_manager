import mongoose, { Model, Schema, type InferSchemaType } from "mongoose";

const ProjectCompanySchema = new Schema(
  {
    project: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone_number: { type: String, default: "" },
    tax_number: { type: String, default: "" },
    address: { type: String, default: "" },
    bank_account_number: { type: String, default: "" },
    bank_name: { type: String, default: "" },
  },
  { timestamps: true },
);

ProjectCompanySchema.index({ project: 1, name: 1 }, { unique: true });

export type ProjectCompanyDocument = InferSchemaType<typeof ProjectCompanySchema>;

export const ProjectCompany: Model<ProjectCompanyDocument> =
  mongoose.models.ProjectCompany ||
  mongoose.model<ProjectCompanyDocument>("ProjectCompany", ProjectCompanySchema);
