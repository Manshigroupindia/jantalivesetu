import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = '',
  onChange,
  label = 'Website / Client Logo',
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const res = await uploadToCloudinary(file);
      onChange(res.secure_url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image to Cloudinary');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</label>}

      {value ? (
        <div className="relative inline-block group">
          <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 shadow-xs">
            <img src={value} alt="Uploaded logo" className="max-w-full max-h-full object-contain" />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="mt-1 flex items-center text-[10px] text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Cloudinary Uploaded
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-lg p-4 text-center bg-slate-50 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <div className="flex flex-col items-center justify-center space-y-1.5 text-slate-500">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                <span className="text-xs font-medium text-brand-600">Uploading to Cloudinary...</span>
              </>
            ) : (
              <>
                <div className="p-2 bg-white rounded-full shadow-xs border border-slate-200">
                  <Upload className="w-4 h-4 text-brand-600" />
                </div>
                <span className="text-xs font-medium text-slate-700">Click or drag image to upload</span>
                <span className="text-[10px] text-slate-400">PNG, JPG, WebP (Max 5MB)</span>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium flex items-center gap-1">⚠️ {error}</p>}
    </div>
  );
};
