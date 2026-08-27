import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FileUploader } from '../../components/common/FileUploader';
import { Bell, Plus, Pin, Calendar, FileText, Trash2 } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { Notice, NoticePriority } from '../../types';
import { createNotice, deleteNotice } from '../../services/firestoreService';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { orderBy } from 'firebase/firestore';

export const NoticeBoardPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { isDirector, can } = usePermissions();
  const { requireReauthVerification } = useSecurity();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: notices, loading } = useRealtimeCollection<Notice>('notices', [
    orderBy('createdAt', 'desc'),
  ]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createNotice({
        title,
        description,
        priority,
        isPinned,
        attachmentUrl,
        date: getCurrentDateISO(),
        createdById: userDoc.uid,
        createdByName: staffProfile?.fullName || userDoc.name || 'Director',
        createdAt: new Date().toISOString(),
      });

      setModalOpen(false);
      setTitle('');
      setDescription('');
      setAttachmentUrl('');
      alert('Official notice published.');
    } catch (err) {
      alert('Failed to publish notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    requireReauthVerification('Permanently Delete Official Notice', async () => {
      try {
        await deleteNotice(id);
        alert('Notice deleted.');
      } catch (err) {
        alert('Failed to delete notice.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-brand-600" />
            Official Notice Board
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Company-wide announcements, policy updates, and executive directives.
          </p>
        </div>

        {can('notices.create') && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Publish New Notice
          </Button>
        )}
      </div>

      {/* NOTICES LIST */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading notices...</p>
      ) : notices.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No official announcements on the notice board.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((n) => (
            <Card
              key={n.id}
              className={`p-6 space-y-3 relative ${
                n.isPinned ? 'border-2 border-brand-500 bg-brand-50/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {n.isPinned && <Pin className="w-4 h-4 text-brand-600 fill-current" />}
                  <Badge variant={n.priority === 'urgent' ? 'danger' : 'neutral'}>
                    {n.priority.toUpperCase()}
                  </Badge>
                </div>
                {isDirector && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="text-base font-extrabold text-gray-900">{n.title}</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{n.description}</p>

              {n.attachmentUrl && (
                <a
                  href={n.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 underline pt-1"
                >
                  <FileText className="w-4 h-4" /> View Attachment / Document PDF
                </a>
              )}

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
                <span>By {n.createdByName}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {n.date}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE NOTICE MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Publish Official Announcement">
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <Input
            label="Notice Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Notice Content / Announcement Details
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value as NoticePriority)}
              options={[
                { value: 'normal', label: 'Normal Announcement' },
                { value: 'high', label: 'High Importance' },
                { value: 'urgent', label: 'Urgent Directive' },
              ]}
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pinNotice"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <label htmlFor="pinNotice" className="text-xs font-bold text-gray-700">
                Pin to top of Notice Board
              </label>
            </div>
          </div>

          <FileUploader
            label="Attach PDF Document / Circular Image"
            folder="janta-live-setu/notices"
            currentUrl={attachmentUrl}
            onFileUploaded={(url) => setAttachmentUrl(url)}
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Publish Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
