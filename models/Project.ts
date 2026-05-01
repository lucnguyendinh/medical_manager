import mongoose, { Model, Schema, type InferSchemaType } from "mongoose";

export const PROJECT_STATUS = ["VISIBLE", "HIDDEN"] as const;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: PROJECT_STATUS,
      required: true,
      default: "VISIBLE",
    },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

export type ProjectDocument = InferSchemaType<typeof ProjectSchema>;

export const Project: Model<ProjectDocument> =
  mongoose.models.Project ||
  mongoose.model<ProjectDocument>("Project", ProjectSchema);
