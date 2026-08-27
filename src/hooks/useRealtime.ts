import { useEffect, useState } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { subscribeToCollection } from '../services/firestoreService';

export function useRealtimeCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): { data: T[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeToCollection<T>(
      collectionName,
      constraints,
      (items) => {
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || `Failed to load ${collectionName}`);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [collectionName, JSON.stringify(constraints)]);

  return { data, loading, error };
}
