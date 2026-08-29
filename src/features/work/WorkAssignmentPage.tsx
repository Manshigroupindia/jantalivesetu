import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { VoiceRecorder } from '../../components/common/VoiceRecorder';
import { AudioPlayer } from '../../components/common/AudioPlayer';
import { FileUploader } from '../../components/common/FileUploader';
import { Briefcase, Plus, Search, Clock, CheckCircle2, FileText, User } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotification } from '../../contexts/NotificationContext';
import { WorkAssignment, WorkPriority, WorkStatus, StaffProfile } from '../../types';
import { createWorkAssignment, updateWorkAssignmentStatus } from '../../services/firestoreService';
import { orderBy } from 'firebase/firestore';

export const WorkAssignmentPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { can, isDirector } = usePermissions();
  const { showToast } = useNotification();
  const { data: assignments, loading } = useRealtimeCollection<WorkAssignment>('workAssignments', [
    orderBy('createdAt', 'desc'),
  ]);
  const { data: staffList } = useRealtimeCollection<StaffProfile>('staffProfiles');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorkAssignment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<WorkPriority>('normal');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Work Submission State for staff
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (!assignedTo) {
      setError('Please select a staff member to assign work.');
      return;
    }

    setCreating(true);
    setError(null);

    const selectedStaff = staffList.find((s) => s.userId === assignedTo);

    try {
      await createWorkAssignment({
        title,
        description,
        assignedTo,
        assignedToName: selectedStaff?.fullName || 'Staff Member',
        assignedById: userDoc.uid,
        assignedByName: staffProfile?.fullName || userDoc.name || 'Director',
        priority,
        deadlineDate,
        deadlineTime,
        voiceNoteUrl,
        attachmentUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setVoiceNoteUrl('');
      setAttachmentUrl('');
      showToast('Work assignment dispatched successfully.', 'success');
    } catch (err: any) {
      console.error('Work creation error:', err);
      setError('Failed to dispatch work assignment. Secure with Janta Live Setu.');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (workId: string, newStatus: WorkStatus, proof?: string) => {
    setSubmitting(true);
    try {
      await updateWorkAssignmentStatus(workId, newStatus, proof);
      setSelectedWork(null);
      showToast(`Work status updated to ${newStatus.replace('_', ' ').toUpperCase()}.`, 'success');
    } catch (err) {
      showToast('Failed to update work status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter((w) => {
    // If not director, filter by assigned user
    if (!isDirector && w.assignedTo !== userDoc?.uid) {
      return false;
    }
    const matchesSearch =
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.assignedToName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-brand-600" />
            Work Assignment Portal
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Dispatch, track, and complete daily field & office reporting tasks.
          </p>
        </div>

        {can('work.assign') && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setCreateModalOpen(true)}
          >
            Assign New Task
          </Button>
        )}
      </div>

      {/* FILTERS */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search tasks or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Work Statuses' },
              { value: 'pending', label: 'Pending Tasks' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'submitted', label: 'Submitted (Review)' },
              { value: 'completed', label: 'Completed & Closed' },
            ]}
          />
        </div>
      </Card>

      {/* TASK LIST */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading work assignments...</p>
      ) : filteredAssignments.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No work assignments found matching search criteria.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((work) => (
            <Card
              key={work.id}
              hoverable
              className="p-5 space-y-3 flex flex-col justify-between"
              onClick={() => setSelectedWork(work)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      work.priority === 'urgent'
                        ? 'danger'
                        : work.priority === 'high'
                        ? 'warning'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {work.priority.toUpperCase()}
                  </Badge>

                  <Badge
                    variant={
                      work.status === 'completed'
                        ? 'success'
                        : work.status === 'submitted'
                        ? 'info'
                        : work.status === 'in_progress'
                        ? 'brand'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {work.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <h3 className="text-base font-extrabold text-gray-900 line-clamp-1">{work.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{work.description}</p>
              </div>

              {work.voiceNoteUrl && (
                <div className="pt-2">
                  <AudioPlayer src={work.voiceNoteUrl} title="Audio Instruction" />
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3 h-3 text-brand-600" /> {work.assignedToName}
                </span>
                <span className="flex items-center gap-1 font-mono font-bold text-gray-700">
                  <Clock className="w-3 h-3" /> {work.deadlineDate}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE WORK ASSIGNMENT MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Assign New Work Task" maxWidth="lg">
        <form onSubmit={handleCreateWork} className="space-y-4">
          <Input
            label="Task Title / Topic"
            placeholder="e.g. Ground Reporting on Election Rally"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Detailed Work Description
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              placeholder="Provide clear instructions for staff..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assign To Staff"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              options={[
                { value: '', label: 'Select Staff Member' },
                ...staffList.map((s) => ({ value: s.userId, label: `${s.fullName} (${s.designation})` })),
              ]}
            />

            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value as WorkPriority)}
              options={[
                { value: 'normal', label: 'Normal Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'urgent', label: 'Urgent Action Required' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Deadline Date"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              required
            />
            <Input
              label="Deadline Time"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              required
            />
          </div>

          {/* VOICE NOTE RECORDER */}
          <VoiceRecorder onAudioUploaded={(url) => setVoiceNoteUrl(url)} />

          {/* ATTACHMENT UPLOADER */}
          <FileUploader
            label="Task Document / Media File Attachment"
            folder="janta-live-setu/work"
            currentUrl={attachmentUrl}
            onFileUploaded={(url) => setAttachmentUrl(url)}
          />

          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={creating}>
              Dispatch Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL VIEW & UPDATE MODAL */}
      {selectedWork && (
        <Modal isOpen={!!selectedWork} onClose={() => setSelectedWork(null)} title="Work Assignment Details">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="brand">{selectedWork.priority.toUpperCase()}</Badge>
              <Badge variant="neutral">{selectedWork.status.toUpperCase()}</Badge>
            </div>

            <h3 className="text-lg font-black text-gray-900">{selectedWork.title}</h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              {selectedWork.description}
            </p>

            {selectedWork.voiceNoteUrl && (
              <div className="py-2">
                <AudioPlayer src={selectedWork.voiceNoteUrl} title="Play Audio Instruction" />
              </div>
            )}

            {selectedWork.attachmentUrl && (
              <a
                href={selectedWork.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 underline"
              >
                <FileText className="w-4 h-4" /> View Task File Attachment
              </a>
            )}

            {/* STAFF SUBMISSION / DIRECTOR APPROVAL ACTIONS */}
            <div className="pt-4 border-t space-y-3">
              {selectedWork.assignedTo === userDoc?.uid && selectedWork.status !== 'completed' && (
                <div className="space-y-3 bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                  <h4 className="text-xs font-extrabold text-gray-900">Update Work Progress</h4>
                  <FileUploader
                    label="Attach Proof / Report Media"
                    folder="janta-live-setu/work"
                    currentUrl={proofUrl}
                    onFileUploaded={(url) => setProofUrl(url)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedWork.id, 'in_progress')}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={submitting}
                      onClick={() => handleStatusUpdate(selectedWork.id, 'submitted', proofUrl)}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                </div>
              )}

              {isDirector && selectedWork.status !== 'completed' && (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    loading={submitting}
                    onClick={() => handleStatusUpdate(selectedWork.id, 'completed')}
                  >
                    Mark Completed & Close Task
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
