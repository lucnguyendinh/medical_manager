import mongoose, { Model, Schema, type InferSchemaType } from "mongoose";

const AssignmentSchema = new Schema(
  {
    project: { type: String, required: true },
    company: { type: String, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    gmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    // assignments replaces the old project[] + company fields.
    assignments: { type: [AssignmentSchema], default: [] },
    is_active: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
