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

export type RecordingState =
  | 'idle'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'ready'
  | 'uploading'
  | 'uploaded'
  | 'error';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioUploaded,
  onUploadStateChange,
  initialAudioUrl = '',
}) => {
  const { showToast } = useNotification();

  const [status, setStatus] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialAudioUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayDuration, setDisplayDuration] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (initialAudioUrl && !uploadedUrl) {
      setUploadedUrl(initialAudioUrl);
    }
  }, [initialAudioUrl]);

  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange(status === 'stopping' || status === 'processing' || status === 'uploading');
    }
  }, [status, onUploadStateChange]);

  // Clean up stream & timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const autoUploadBlob = async (blob: Blob, durationSecs: number) => {
    setStatus('uploading');
    setErrorMessage(null);
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
        duration: durationSecs,
      };

      setUploadedUrl(res.secureUrl);
      setStatus('uploaded');
      onAudioUploaded(res.secureUrl, attachment);
      showToast('Audio uploaded to Cloudinary successfully.', 'success');
    } catch (err: any) {
      console.error('Cloudinary audio upload error:', err);
      const errMsg = err.message || 'Audio upload failed. Click retry to re-upload.';
      setErrorMessage(errMsg);
      setStatus('error');
      showToast(errMsg, 'error');
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setUploadedUrl('');
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setAudioBlob(null);
      setDisplayDuration(0);
      setRecordingSeconds(0);

      // Reset chunks and start time refs to prevent old recording overlap
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect supported mimeTypes cleanly
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setStatus('processing');

        // 1. Calculate fallback duration from exact start timestamp ref
        const elapsedMs = Date.now() - startTimeRef.current;
        const fallbackSeconds = Math.max(1, Math.round(elapsedMs / 1000));

        // 2. Stop stream tracks after onstop has captured final chunks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // 3. Assemble Blob
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        // 4. Validate Blob size
        if (blob.size === 0) {
          setStatus('error');
          setErrorMessage('Recording failed (empty audio file). Please record again.');
          return;
        }

        // 5. Create Object URL & Inspect metadata duration
        const objectUrl = URL.createObjectURL(blob);
        setLocalPreviewUrl(objectUrl);
        setAudioBlob(blob);

        let finalDuration = fallbackSeconds;

        try {
          const tempAudio = new Audio(objectUrl);
          await new Promise<void>((resolve) => {
            let doneCalled = false;
            const finish = () => {
              if (!doneCalled) {
                doneCalled = true;
                resolve();
              }
            };

            tempAudio.onloadedmetadata = () => {
              if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                finalDuration = Math.round(tempAudio.duration);
              }
              finish();
            };

            tempAudio.onerror = finish;
            setTimeout(finish, 1200); // 1.2s timeout safety for metadata load
          });
        } catch {
          // fallback to fallbackSeconds
        }

        // 6. Validate minimum recording length (< 0.5 sec)
        if (finalDuration < 1 && fallbackSeconds < 1) {
          setStatus('error');
          setErrorMessage('Recording is too short. Please record again.');
          return;
        }

        setDisplayDuration(finalDuration);
        setStatus('ready');

        // 7. Auto Upload to Cloudinary
        await autoUploadBlob(blob, finalDuration);
      };

      // Start with 100ms timeslice to ensure frequent dataavailable events
      mediaRecorder.start(100);
      setStatus('recording');

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setStatus('error');
      setErrorMessage('Microphone access denied or unavailable.');
      showToast('Microphone access denied or unavailable.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      setStatus('stopping');
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetryUpload = () => {
    if (audioBlob) {
      autoUploadBlob(audioBlob, displayDuration || 1);
    }
  };

  const discard = () => {
    if (status === 'recording' || status === 'stopping') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);

    setAudioBlob(null);
    setLocalPreviewUrl(null);
    setUploadedUrl('');
    setErrorMessage(null);
    setDisplayDuration(0);
    setRecordingSeconds(0);
    setStatus('idle');
    onAudioUploaded('', undefined);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainderSecs).padStart(2, '0')}`;
  };

  const isWorking = status === 'stopping' || status === 'processing' || status === 'uploading';

  return (
    <div className="bg-gradient-to-r from-gray-50 to-brand-50/20 border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Mic className="w-4 h-4 text-brand-600" /> Voice Instruction (Cloudinary Sync)
        </span>

        {status === 'recording' && (
          <span className="text-xs font-extrabold text-red-600 animate-pulse flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            REC {formatTime(recordingSeconds)}
          </span>
        )}

        {(status === 'stopping' || status === 'processing') && (
          <span className="text-xs font-bold text-amber-700 animate-pulse flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> Processing Recording...
          </span>
        )}
      </div>

      {/* IDLE STATE — RECORD BUTTON */}
      {status === 'idle' && !localPreviewUrl && !uploadedUrl && (
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
      {status === 'recording' && (
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
          <span className="text-xs text-gray-500 font-medium">Click stop when finished speaking.</span>
        </div>
      )}

      {/* STOPPING / PROCESSING STATE */}
      {(status === 'stopping' || status === 'processing') && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span>Finalizing audio recording & duration metadata...</span>
        </div>
      )}

      {/* UPLOADING STATE */}
      {status === 'uploading' && (
        <div className="space-y-2 bg-white p-3 rounded-xl border border-brand-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-brand-700">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              Uploading audio ({formatTime(displayDuration)}) to Cloudinary...
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

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="bg-red-50 p-3 rounded-xl border border-red-200 space-y-2 text-xs">
          <p className="text-red-700 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            {errorMessage || 'Audio processing or upload failed.'}
          </p>
          <div className="flex gap-2 pt-1">
            {audioBlob && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleRetryUpload}
              >
                Retry Upload
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-100 font-bold"
              onClick={discard}
            >
              Discard & Re-record
            </Button>
          </div>
        </div>
      )}

      {/* READY / UPLOADED / PREVIEW STATE */}
      {(status === 'ready' || status === 'uploaded' || uploadedUrl || localPreviewUrl) &&
        !isWorking &&
        status !== 'error' && (
          <div className="space-y-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                {uploadedUrl ? 'Voice Note Ready & Uploaded (Cloudinary)' : 'Local Audio Recorded'}
                {displayDuration > 0 && ` (${formatTime(displayDuration)})`}
              </span>
              <button
                type="button"
                onClick={discard}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Remove / Re-record Audio"
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
