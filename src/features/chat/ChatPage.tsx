import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { VoiceRecorder } from '../../components/common/VoiceRecorder';
import { AudioPlayer } from '../../components/common/AudioPlayer';
import { FileUploader } from '../../components/common/FileUploader';
import { MessageSquare, Send, Mic, Paperclip, FileText } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ChatMessage } from '../../types';
import { sendChatMessage } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { orderBy, limit } from 'firebase/firestore';

export const ChatPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { showToast } = useNotification();
  const [text, setText] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, loading } = useRealtimeCollection<ChatMessage>('chatMessages', [
    orderBy('createdAt', 'asc'),
    limit(100),
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc || (!text.trim() && !voiceUrl && !attachmentUrl)) return;

    setSending(true);

    try {
      await sendChatMessage({
        senderId: userDoc.uid,
        senderName: staffProfile?.fullName || userDoc.name || 'User',
        senderPhotoUrl: staffProfile?.photoUrl || userDoc.photoUrl || '',
        senderRole: userDoc.role,
        text: text.trim(),
        voiceNoteUrl: voiceUrl || undefined,
        mediaUrl: attachmentUrl || undefined,
        channel: 'general',
        createdAt: new Date().toISOString(),
      });

      setText('');
      setVoiceUrl('');
      setAttachmentUrl('');
      setShowVoiceRecorder(false);
      setShowUploader(false);
    } catch (err) {
      showToast('Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
      {/* CHAT HEADER */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900"># General Office Channel</h2>
            <p className="text-[11px] text-gray-400 font-medium">Janta Live Setu Internal Communication</p>
          </div>
        </div>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50/30 to-white">
        {loading ? (
          <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading channel messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-12 italic">
            No messages in general channel yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === userDoc?.uid;
            return (
              <div key={msg.id} className={`flex gap-3 max-w-xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                <img
                  src={
                    msg.senderPhotoUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-xl object-cover border shrink-0 mt-1"
                />

                <div className={`space-y-1 ${isMe ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    <span>{msg.senderName}</span>
                    <span className="uppercase text-[9px] text-brand-600 font-mono">({msg.senderRole})</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs space-y-2 shadow-sm ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                    }`}
                  >
                    {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                    {msg.voiceNoteUrl && (
                      <div className="pt-1">
                        <AudioPlayer src={msg.voiceNoteUrl} title="Voice Note" />
                      </div>
                    )}

                    {msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-gray-200"
                      >
                        {msg.mediaUrl.endsWith('.pdf') ? (
                          <div className="p-2 flex items-center gap-2 text-red-500 font-semibold">
                            <FileText className="w-5 h-5" /> View PDF Document
                          </div>
                        ) : (
                          <img src={msg.mediaUrl} alt="Attached" className="max-h-48 w-full object-cover" />
                        )}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* EXPANDABLE INPUT TOOLS */}
      {showVoiceRecorder && (
        <div className="p-3 border-t bg-gray-50 border-gray-200">
          <VoiceRecorder onAudioUploaded={(url) => setVoiceUrl(url)} />
        </div>
      )}

      {showUploader && (
        <div className="p-3 border-t bg-gray-50 border-gray-200">
          <FileUploader
            label="Upload Image or Document"
            folder="janta-live-setu/chat"
            onFileUploaded={(url) => setAttachmentUrl(url)}
          />
        </div>
      )}

      {/* INPUT FORM */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          className={`p-2 rounded-xl transition-colors ${
            showVoiceRecorder ? 'bg-brand-100 text-brand-700' : 'text-gray-400 hover:text-brand-600'
          }`}
          title="Voice Note"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowUploader(!showUploader)}
          className={`p-2 rounded-xl transition-colors ${
            showUploader ? 'bg-brand-100 text-brand-700' : 'text-gray-400 hover:text-brand-600'
          }`}
          title="Attach Media"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Type your message here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-brand-500"
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="rounded-xl px-4"
          icon={<Send className="w-4 h-4" />}
          loading={sending}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
