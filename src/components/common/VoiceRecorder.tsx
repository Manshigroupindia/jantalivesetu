import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Upload, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { useNotification } from '../../contexts/NotificationContext';

export interface VoiceRecorderProps {
  onAudioUploaded: (audioUrl: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioUploaded }) => {
  const { showToast } = useNotification();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start();
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
      clearInterval(timerRef.current);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const res = await uploadToCloudinary(file, 'janta-live-setu/voice', 'auto');
      setUploadedUrl(res.secureUrl);
      onAudioUploaded(res.secureUrl);
    } catch (err: any) {
      showToast(err.message || 'Voice note upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const discard = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedUrl(null);
    setRecordingTime(0);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-brand-600" /> Voice Note Instructions
        </span>
        {recording && (
          <span className="text-xs font-bold text-red-600 animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            00:{String(recordingTime).padStart(2, '0')}
          </span>
        )}
      </div>

      {!audioUrl && !recording && (
        <Button type="button" variant="outline" size="sm" icon={<Mic className="w-4 h-4 text-brand-600" />} onClick={startRecording}>
          Record Voice Note
        </Button>
      )}

      {recording && (
        <Button type="button" variant="danger" size="sm" icon={<Square className="w-4 h-4" />} onClick={stopRecording}>
          Stop Recording
        </Button>
      )}

      {audioUrl && !uploadedUrl && (
        <div className="flex items-center gap-2">
          <audio src={audioUrl} controls className="h-9 w-full max-w-xs rounded" />
          <Button type="button" variant="primary" size="sm" loading={uploading} icon={<Upload className="w-4 h-4" />} onClick={handleUpload}>
            Attach
          </Button>
          <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-500" />} onClick={discard} />
        </div>
      )}

      {uploadedUrl && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
          <Check className="w-4 h-4" />
          <span>Voice Note Attached</span>
          <button type="button" onClick={discard} className="ml-auto text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
