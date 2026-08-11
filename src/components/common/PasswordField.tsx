import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, Lock } from 'lucide-react';
import { useSecurity } from '../../contexts/SecurityContext';

interface PasswordFieldProps {
  value?: string;
  label?: string;
  className?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({ value = '', label, className = '' }) => {
  const { requestSecurityVerification } = useSecurity();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (revealed) {
      // Auto hide revealed password after 30 seconds
      timer = setTimeout(() => {
        setRevealed(false);
      }, 30000);
    }
    return () => clearTimeout(timer);
  }, [revealed]);

  const handleToggleReveal = () => {
    if (revealed) {
      setRevealed(false);
      return;
    }

    requestSecurityVerification(
      () => setRevealed(true),
      'Reveal Protected Credential',
      'Please verify the Website Access Password to view this password.'
    );
  };

  const handleCopy = () => {
    if (!value) return;
    requestSecurityVerification(
      () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      'Copy Protected Credential',
      'Please verify Access Password to copy this credential.'
    );
  };

  if (!value) {
    return <span className="text-slate-400 text-xs italic">Not configured</span>;
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {label && <span className="text-xs text-slate-500 font-medium">{label}:</span>}
      <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-mono text-slate-800">
        <span>{revealed ? value : '••••••••••••'}</span>
        <button
          type="button"
          onClick={handleToggleReveal}
          className="ml-2 text-slate-500 hover:text-slate-800 transition-colors p-0.5"
          title={revealed ? 'Hide Password' : 'Show Password (Requires Access Password)'}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="ml-1 text-slate-500 hover:text-slate-800 transition-colors p-0.5"
          title="Copy Password"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>
    </div>
  );
};
