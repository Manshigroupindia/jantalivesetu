import { CLOUDINARY_CONFIG } from '../config/cloudinary';

export type CloudinaryFolder = 
  | 'janta-live-setu/staff'
  | 'janta-live-setu/documents'
  | 'janta-live-setu/work'
  | 'janta-live-setu/expenses'
  | 'janta-live-setu/company'
  | 'janta-live-setu/voice'
  | 'janta-live-setu/chat'
  | 'janta-live-setu/notices'
  | 'janta-live-setu/electricity'
  | 'janta-live-setu/cleanliness'
  | 'janta-live-setu/rent'
  | 'janta-live-setu/water';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder: CloudinaryFolder,
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto',
  onProgress?: UploadProgressCallback
): Promise<{ url: string; publicId: string; secureUrl: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

    xhr.open('POST', endpoint, true);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.url,
            secureUrl: response.secure_url,
            publicId: response.public_id,
          });
        } catch (err) {
          reject(new Error('Invalid response from media server.'));
        }
      } else {
        try {
          const errorResp = JSON.parse(xhr.responseText);
          reject(new Error(errorResp.error?.message || 'Upload failed.'));
        } catch {
          reject(new Error(`Upload failed with status code ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload. Please check connection.'));
    };

    xhr.send(formData);
  });
}

export interface CloudinaryAudioUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format?: string;
  duration?: number;
}

export async function uploadAudioToCloudinary(
  file: File | Blob,
  onProgress?: UploadProgressCallback
): Promise<CloudinaryAudioUploadResult> {
  const mimeType = file.type || 'audio/webm';
  let ext = 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'mp4';
  else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
  else if (mimeType.includes('ogg')) ext = 'ogg';
  else if (mimeType.includes('wav')) ext = 'wav';

  const audioFile = file instanceof File ? file : new File([file], `voice_${Date.now()}.${ext}`, { type: mimeType });

  // Cloudinary requires resourceType = 'video' for audio files
  const res = await uploadToCloudinary(audioFile, 'janta-live-setu/voice', 'video', onProgress);

  return {
    url: res.url,
    secureUrl: res.secureUrl,
    publicId: res.publicId,
    resourceType: 'video',
    format: ext,
  };
}
