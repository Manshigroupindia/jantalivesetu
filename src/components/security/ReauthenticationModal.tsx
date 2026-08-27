import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { verifyUserPin } from '../../services/authService';

export const ReauthenticationModal: React.FC = () => {
  const { userDoc, firebaseUser } = useAuth();
  const { reauthModalOpen, activeActionName, pendingCallback, cancelSecurityVerification } = useSecurity();
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!reauthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.email || !userDoc) return;

    if (!password) {
      setError('Password is required.');
      return;
    }
    if (pin.length !== 4) {
      setError('4-digit PIN is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Re-authenticate Firebase password
      await signInWithEmailAndPassword(auth, firebaseUser.email, password);

      // Step 2: Verify PIN
      const pinValid = await verifyUserPin(userDoc, pin);
      if (!pinValid) {
        setError('Incorrect 4-digit security PIN.');
        setLoading(false);
        return;
      }

      setLoading(false);
      if (pendingCallback) {
        pendingCallback();
      }
      cancelSecurityVerification();
    } catch (err: any) {
      console.error('Re-auth error:', err);
      setError('Invalid password or verification failed. Secure with Janta Live Setu.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={reauthModalOpen} onClose={cancelSecurityVerification} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Critical Action Verification</h3>
          <p className="text-xs text-red-600 font-semibold mt-1 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Permanent Deletion / Elevated Authorization Required</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {activeActionName || 'This action cannot be undone. Enter password & PIN to confirm.'}
          </p>
        </div>

        <Input
          label="Password"
          type="password"
          placeholder="Enter your login password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          required
        />

        <Input
          label="4-Digit Security PIN"
          type="password"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          icon={<Lock className="w-4 h-4" />}
          required
        />

        {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="w-full" onClick={cancelSecurityVerification}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" className="w-full" loading={loading}>
            Authorize Action
          </Button>
        </div>

        <p className="text-[11px] text-gray-400 font-medium text-center">Secure with Janta Live Setu</p>
      </form>
    </Modal>
  );
};
