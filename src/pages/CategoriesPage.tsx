import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  X
} from 'lucide-react';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory
} from '../firebase/services/categoryService';
import { fetchAllWebsites } from '../firebase/services/websiteService';
import { Category, WebsiteClientData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { logAuditEvent } from '../firebase/services/auditService';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [websites, setWebsites] = useState<WebsiteClientData[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Form / Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#0c8ee9');
  const [formError, setFormError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const loadData = async () => {
    try {
      const [cats, webs] = await Promise.all([fetchCategories(), fetchAllWebsites()]);
      setCategories(cats);
      setWebsites(webs);
      if (cats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatColor('#0c8ee9');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color || '#0c8ee9');
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: catName, color: catColor });
      } else {
        await createCategory(catName, '', catColor);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setDeleteError('');

    try {
      const res = await deleteCategory(deleteTarget.id);
      if (!res.success) {
        setDeleteError(res.message);
      } else {
        await logAuditEvent(
          profile?.uid || '',
          profile?.displayName || 'User',
          profile?.role || 'SUPER_ADMIN',
          'DELETE_VERIFIED',
          'categories',
          deleteTarget.id,
          `Deleted category: ${deleteTarget.name}`
        );
        setDeleteTarget(null);
        if (selectedCategoryId === deleteTarget.id) {
          setSelectedCategoryId(null);
        }
        await loadData();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete category.');
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);
  const categoryWebsites = selectedCategoryId
    ? websites.filter(w => w.categoryId === selectedCategoryId || w.categoryName === selectedCategoryObj?.name)
    : [];

  return (
    <DashboardLayout title="Category System">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Dynamic Category System</h2>
          <p className="text-xs text-slate-500">Organize and filter client websites by category year or section.</p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Category</span>
          </button>
        )}
      </div>

      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Category Cards List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</span>
            <span className="text-xs font-mono font-semibold text-slate-600">{categories.length} total</span>
          </div>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
            {categories.map((cat) => {
              const count = websites.filter(w => w.categoryId === cat.id || w.categoryName === cat.name).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-brand-50 border-brand-300 text-brand-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#0c8ee9' }}
                    />
                    <span className="text-xs font-bold truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                      {count}
                    </span>
                    {isSuperAdmin && (
                      <div className="hidden group-hover:flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(cat);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-900"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(cat);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Category Websites Directory */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: selectedCategoryObj?.color || '#0c8ee9' }}
              />
              <h3 className="text-sm font-bold text-slate-900">
                {selectedCategoryObj?.name || 'Select Category'} Websites
              </h3>
              <span className="text-xs text-slate-400">({categoryWebsites.length} items)</span>
            </div>

            {selectedCategoryObj && (
              <button
                onClick={() => navigate(`/websites?category=${selectedCategoryObj.id}`)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
              >
                <span>Filter Main List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {categoryWebsites.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No websites currently assigned to this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryWebsites.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/websites/${item.id}`)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 font-semibold">#{item.srNo}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {item.websiteStatus}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-700">{item.clientName}</h4>
                    <p className="text-xs text-slate-500 font-medium">{item.websiteName}</p>
                  </div>
                  <p className="text-xs font-mono text-brand-600 font-semibold">{item.domain}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {formError && <p className="text-xs text-rose-600 font-semibold">⚠️ {formError}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Website 2027"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Badge Color
                </label>
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-full h-10 p-1 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Security PIN Modal */}
      <SecurityPinModal
        isOpen={!!deleteTarget}
        title="Delete Category"
        description="Deleting a category requires valid 4-digit Access PIN verification."
        actionName="Verify & Delete Category"
        targetCollection="categories"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.name}
        onVerified={handleDeleteCategory}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
      />
    </DashboardLayout>
  );
};
