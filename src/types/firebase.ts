import { User as FirebaseUser } from 'firebase/auth';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: any | null;
  profileDoc: any | null;
  loading: boolean;
  error: string | null;
}
