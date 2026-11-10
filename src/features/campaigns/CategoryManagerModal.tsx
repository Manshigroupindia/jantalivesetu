import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Trash2, Tag, ShieldCheck } from 'lucide-react';
import { ClientCategory } from '../../types/campaign';
import { addCategory, deleteCategory } from '../../services/campaignService';
import { useNotification } from '../../contexts/NotificationContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ClientCategory[];
  onRefresh: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefresh,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast, showConfirm } = useNotification();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
      showToast('Client category added successfully.', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to add category.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (cat: ClientCategory) => {
    if (cat.isDefault) {
      showToast('Default system categories cannot be deleted.', 'warning');
      return;
    }

    showConfirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat.name}"? Existing clients assigned to this category will keep their label.`,
      isDanger: true,
      confirmText: 'Delete Category',
      onConfirm: async () => {
        try {
          await deleteCategory(cat.id);
          showToast(`Category "${cat.name}" deleted.`, 'success');
          onRefresh();
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete category.', 'error');
        }
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Client Categories" maxWidth="md">
      <div className="space-y-5">
        <p className="text-xs text-gray-500">
          Categories help segment clients for targeted WhatsApp Broadcast campaigns. You can use system default categories or create custom business categories.
        </p>

        {/* ADD CATEGORY FORM */}
        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="New Category Name"
              placeholder="e.g. Media Partners, Distributors"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            loading={submitting}
          >
            Add
          </Button>
        </form>

        {/* CATEGORY LIST */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Available Categories ({categories.length})
          </label>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                  {cat.isDefault && (
                    <Badge variant="neutral" size="sm" className="gap-1">
                      <ShieldCheck className="w-3 h-3 text-gray-500" />
                      Default
                    </Badge>
                  )}
                </div>

                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

