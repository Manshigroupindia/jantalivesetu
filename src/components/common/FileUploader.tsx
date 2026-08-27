import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadToCloudinary, CloudinaryFolder } from '../../services/cloudinaryService';

export interface FileUploaderProps {
  label?: string;
  folder: CloudinaryFolder;
  accept?: string;
  onFileUploaded: (url: string) => void;
  currentUrl?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  folder,
  accept = 'image/*,.pdf',
  onFileUploaded,
  currentUrl,
}) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProgress(0);

    try {
      const res = await uploadToCloudinary(file, folder, 'auto', (percent) => {
        setProgress(percent);
      });

      setPreview(res.secureUrl);
      onFileUploaded(res.secureUrl);
      setProgress(null);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Media upload failed. Secure with Janta Live Setu.');
      setProgress(null);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">{label}</label>}

      <div className="relative border-2 border-dashed border-gray-200 hover:border-brand-500 rounded-2xl p-4 text-center bg-gray-50/50 transition-colors cursor-pointer group">
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {progress !== null ? (
          <div className="space-y-2 py-2">
            <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto animate-pulse">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-brand-600">Uploading... {progress}%</p>
            <div className="w-48 bg-gray-200 h-1.5 rounded-full mx-auto overflow-hidden">
              <div className="bg-brand-600 h-full transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : preview ? (
          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              {preview.endsWith('.pdf') ? (
                <FileText className="w-8 h-8 text-red-500 shrink-0" />
              ) : (
                <img src={preview} alt="Upload Preview" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
              )}
              <div className="text-left truncate">
                <p className="text-xs font-semibold text-gray-900 truncate">Document Attached</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                </p>
              </div>
            </div>
            <span className="text-xs text-brand-600 font-semibold group-hover:underline pl-2 shrink-0">Change</span>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-brand-600 mx-auto transition-colors" />
            <p className="text-xs font-semibold text-gray-700">Click or drag file to upload</p>
            <p className="text-[11px] text-gray-400">Supported formats: JPG, PNG, PDF</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
};
