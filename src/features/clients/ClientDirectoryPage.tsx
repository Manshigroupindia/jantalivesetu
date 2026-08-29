import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FolderGit2, Plus, Search, Mail, Phone, MapPin, Building } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ClientRecord } from '../../types';
import { createClientRecord } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { orderBy } from 'firebase/firestore';

export const ClientDirectoryPage: React.FC = () => {
  const { userDoc } = useAuth();
  const { showToast } = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: clients, loading } = useRealtimeCollection<ClientRecord>('clientRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createClientRecord({
        clientName,
        contactPerson,
        phone,
        email,
        address,
        gstNumber,
        notes,
        createdById: userDoc.uid,
        createdAt: new Date().toISOString(),
      });

      setModalOpen(false);
      setClientName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      showToast('Client record added to directory.', 'success');
    } catch (err) {
      showToast('Failed to add client.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-7 h-7 text-brand-600" />
            Client Directory
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Centralized database of Janta Live clients, advertisers, media contacts, and partners.
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Add New Client
        </Button>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Search by client name or contact person..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </Card>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading client directory...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No client records match your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-5 space-y-3">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">{c.clientName}</h3>
                  <p className="text-xs font-bold text-gray-500">{c.contactPerson}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span>{c.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                  <span>{c.address}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Client Record">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Client / Company Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          <Input label="Contact Person Name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <Input label="GSTIN / Registration Number (Optional)" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          <Input label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Save Client Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
