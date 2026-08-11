import { db } from '../config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  where
} from 'firebase/firestore';
import { Category } from '../../types';

const CATEGORIES_COLLECTION = 'categories';
const WEBSITES_COLLECTION = 'websites';

const DEFAULT_CATEGORIES = [
  { name: 'Self Website', order: 1, color: '#0c8ee9' },
  { name: 'Website 2022', order: 2, color: '#6366f1' },
  { name: 'Website 2023', order: 3, color: '#8b5cf6' },
  { name: 'Website 2024', order: 4, color: '#ec4899' },
  { name: 'Website 2025', order: 5, color: '#10b981' },
  { name: 'Website 2026', order: 6, color: '#f59e0b' },
];

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Seed default categories if empty
      await seedDefaultCategories();
      return fetchCategories();
    }

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const seedDefaultCategories = async (): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  DEFAULT_CATEGORIES.forEach(cat => {
    const newRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(newRef, {
      name: cat.name,
      order: cat.order,
      color: cat.color,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
};

export const createCategory = async (name: string, description?: string, color?: string): Promise<string> => {
  const categories = await fetchCategories();
  const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 1;
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    name,
    description: description || '',
    color: color || '#0c8ee9',
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
  const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
  await updateDoc(categoryRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const checkCategoryDependencies = async (categoryId: string): Promise<number> => {
  const q = query(collection(db, WEBSITES_COLLECTION), where('categoryId', '==', categoryId));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const deleteCategory = async (id: string): Promise<{ success: boolean; message: string }> => {
  const count = await checkCategoryDependencies(id);
  if (count > 0) {
    return { 
      success: false, 
      message: `Cannot delete category. It is currently assigned to ${count} website record(s).` 
    };
  }

  await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
  return { success: true, message: 'Category deleted successfully.' };
};

export const reorderCategories = async (categoryIdsInOrder: string[]): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  categoryIdsInOrder.forEach((id, index) => {
    const ref = doc(db, CATEGORIES_COLLECTION, id);
    batch.update(ref, { order: index + 1, updatedAt: now });
  });

  await batch.commit();
};
