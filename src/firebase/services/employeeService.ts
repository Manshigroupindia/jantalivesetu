import { db } from '../config';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Employee, CustomPermissions, UserRole } from '../../types';

const EMPLOYEES_COLLECTION = 'employees';

export const DEFAULT_PERMISSIONS: CustomPermissions = {
  websites: { view: true, add: true, edit: true, delete: false },
  gmail: { view: true, add: true, edit: true, delete: false },
  hosting: { view: true, add: true, edit: true, delete: false },
  social: { view: true, add: true, edit: true, delete: false },
  categories: { view: true, add: false, edit: false, delete: false },
  employees: { view: false, add: false, edit: false, delete: false },
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const q = query(collection(db, EMPLOYEES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Employee[];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

export const createEmployeeRecord = async (
  data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = doc(collection(db, EMPLOYEES_COLLECTION));
  
  const newEmployee: Employee = {
    ...data,
    id: docRef.id,
    permissions: data.permissions || DEFAULT_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, newEmployee);
  return docRef.id;
};

export const createEmployee = createEmployeeRecord;

export const updateEmployeeRecord = async (
  id: string,
  updates: Partial<Employee>
): Promise<void> => {
  const ref = doc(db, EMPLOYEES_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const updateEmployee = updateEmployeeRecord;

export const deleteEmployeeRecord = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
};

export const deleteEmployee = deleteEmployeeRecord;

export const subscribeToEmployees = (callback: (data: Employee[]) => void) => {
  const q = query(collection(db, EMPLOYEES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Employee[];
    callback(list);
  }, (error) => {
    console.error('Error subscribing to employees:', error);
  });
};
