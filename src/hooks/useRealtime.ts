import { useEffect, useState } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { subscribeToCollection } from '../services/firestoreService';

export function useRealtimeCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCollection<T>(collectionName, constraints, (items) => {
      setData(items);
      setLoading(false);
    });

    return () => unsub();
  }, [collectionName, JSON.stringify(constraints)]);

  return { data, loading };
}
