import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Check, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadAudioToCloudinary } from '../../services/cloudinaryService';
import { useNotification } from '../../contexts/NotificationContext';
import { WorkAudioAttachment } from '../../types';

export interface VoiceRecorderProps {
  onAudioUploaded: (audioUrl: string, attachment?: WorkAudioAttachment) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  initialAudioUrl?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioUploaded,
  onUploadStateChange,
  initialAudioUrl = '',
}) => {
  const { showToast } = useNotification();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialAudioUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (initialAudioUrl && !uploadedUrl) {
      setUploadedUrl(initialAudioUrl);
    }
  }, [initialAudioUrl]);

  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange(uploading);
    }
  }, [uploading, onUploadStateChange]);

  const autoUploadBlob = async (blob: Blob, duration: number) => {
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const res = await uploadAudioToCloudinary(blob, (percent) => {
        setUploadProgress(percent);
      });

      const attachment: WorkAudioAttachment = {
        url: res.secureUrl,
        publicId: res.publicId,
        resourceType: res.resourceType,
        format: res.format,
        duration: duration,
      };

      setUploadedUrl(res.secureUrl);
      onAudioUploaded(res.secureUrl, attachment);
      showToast('Audio uploaded to Cloudinary successfully.', 'success');
    } catch (err: any) {
      console.error('Audio Cloudinary upload error:', err);
      const errMsg = err.message || 'Audio upload failed. Please try recording/uploading again.';
      setUploadError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      setUploadError(null);
      setUploadedUrl('');
      setLocalPreviewUrl(null);
      setAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select supported mimeType
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setLocalPreviewUrl(previewUrl);

        // Auto Upload to Cloudinary immediately
        const duration = recordingTime;
        autoUploadBlob(blob, duration);
      };

      mediaRecorderRef.current.start(100);
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      showToast('Microphone access denied or unavailable.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRetryUpload = () => {
    if (audioBlob) {
      autoUploadBlob(audioBlob, recordingTime);
    }
  };

  const discard = () => {
    if (recording) {
      stopRecording();
    }
    setAudioBlob(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setUploadedUrl('');
    setUploadError(null);
    setRecordingTime(0);
    onAudioUploaded('', undefined);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainderSecs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-brand-50/20 border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Mic className="w-4 h-4 text-brand-600" /> Voice Instruction (Cloudinary Sync)
        </span>

        {recording && (
          <span className="text-xs font-extrabold text-red-600 animate-pulse flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            REC {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {/* IDLE STATE — RECORD BUTTON */}
      {!localPreviewUrl && !uploadedUrl && !recording && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto bg-white border-brand-200 hover:bg-brand-50 text-brand-700 font-bold"
          icon={<Mic className="w-4 h-4 text-brand-600" />}
          onClick={startRecording}
        >
          Record Voice Note
        </Button>
      )}

      {/* RECORDING STATE */}
      {recording && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="animate-pulse"
            icon={<Square className="w-4 h-4" />}
            onClick={stopRecording}
          >
            Stop & Save Audio
          </Button>
          <span className="text-xs text-gray-500 font-medium">Recording in progress...</span>
        </div>
      )}

      {/* UPLOADING STATE */}
      {uploading && (
        <div className="space-y-2 bg-white p-3 rounded-xl border border-brand-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-brand-700">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              Uploading audio to Cloudinary...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* UPLOAD ERROR STATE */}
      {uploadError && !uploading && (
        <div className="bg-red-50 p-3 rounded-xl border border-red-200 space-y-2 text-xs">
          <p className="text-red-700 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            {uploadError}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleRetryUpload}
            >
              Retry Upload
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-100"
              onClick={discard}
            >
              Discard & Re-record
            </Button>
          </div>
        </div>
      )}

      {/* SUCCESS OR EXISTING PREVIEW STATE */}
      {(localPreviewUrl || uploadedUrl) && !uploading && !uploadError && (
        <div className="space-y-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              {uploadedUrl ? 'Voice Note Ready & Uploaded (Cloudinary)' : 'Local Audio Recorded'}
            </span>
            <button
              type="button"
              onClick={discard}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Remove Audio"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>

          {/* AUDIO PLAYER PREVIEW */}
          <div className="pt-1">
            <audio
              src={uploadedUrl || localPreviewUrl || undefined}
              controls
              preload="metadata"
              className="h-10 w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
