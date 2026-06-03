import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const cloudinaryConfig = {
  cloudName,
  apiKey,
  // Folder where medical item images are stored.
  uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "medical_management",
};

export { cloudinary };
