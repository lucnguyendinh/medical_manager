import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { User } from "@/models/User";

const MONGODB_URI = process.env.MONGODB_URI;
const SUPER_ADMIN_GMAIL = process.env.SUPER_ADMIN_GMAIL?.trim().toLowerCase() ?? "";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

async function ensureSuperAdminAccount() {
  if (!SUPER_ADMIN_GMAIL || !SUPER_ADMIN_PASSWORD) {
    return;
  }

  const existingUser = await User.findOne({ gmail: SUPER_ADMIN_GMAIL })
    .select("_id password isAdmin is_active")
    .lean();

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    await User.create({
      gmail: SUPER_ADMIN_GMAIL,
      password: passwordHash,
      assignments: [],
      is_active: true,
      isAdmin: true,
    });
    return;
  }

  const updates: {
    password?: string;
    isAdmin?: boolean;
    is_active?: boolean;
  } = {};

  if (!existingUser.isAdmin) {
    updates.isAdmin = true;
  }

  if (!existingUser.is_active) {
    updates.is_active = true;
  }

  const passwordMatches = await bcrypt.compare(
    SUPER_ADMIN_PASSWORD,
    existingUser.password,
  );
  if (!passwordMatches) {
    updates.password = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  }

  if (Object.keys(updates).length > 0) {
    await User.findByIdAndUpdate(existingUser._id, updates);
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your environment variables.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "medical_management",
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  await ensureSuperAdminAccount();
  return cached.conn;
}
