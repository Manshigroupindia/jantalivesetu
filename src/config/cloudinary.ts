export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "kanmbdd8",
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "jantalivesetu",
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || "587246257112678",
  uploadUrl: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "kanmbdd8"}/upload`,
};
