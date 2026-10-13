// ============================================================================
// Quality Compass: Forced First-Login PIN Change Modal
// Path: src/components/auth/ForcePinChangeModal.tsx
//
// Blocks navigation until an operator logging in with a temporary PIN
// creates a secure, personalized 4-digit PIN.
// ============================================================================

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForcePinChangeModalProps {
  isOpen: boolean;
}

export const ForcePinChangeModal: React.FC<ForcePinChangeModalProps> = ({ isOpen }) => {
  const { currentUser, submitPinChange, logout } = useAuth();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeField, setActiveField] = useState<'OLD' | 'NEW' | 'CONFIRM'>('OLD');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleKeypadPress = (val: string) => {
    setError(null);
    const updateVal = (prev: string) => {
      if (val === 'CLEAR') return '';
      if (val === 'BACK') return prev.slice(0, -1);
      if (prev.length < 4) return prev + val;
      return prev;
    };

    if (activeField === 'OLD') {
      setOldPin((prev) => {
        const next = updateVal(prev);
        if (next.length === 4 && val !== 'BACK' && val !== 'CLEAR') {
          setActiveField('NEW');
        }
        return next;
      });
    } else if (activeField === 'NEW') {
      setNewPin((prev) => {
        const next = updateVal(prev);
        if (next.length === 4 && val !== 'BACK' && val !== 'CLEAR') {
          setActiveField('CONFIRM');
        }
        return next;
      });
    } else {
      setConfirmPin((prev) => updateVal(prev));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (oldPin.length !== 4) {
      setError('Please enter your 4-digit temporary PIN.');
      return;
    }
    if (newPin.length !== 4) {
      setError('Please choose a new 4-digit PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match.');
      return;
    }
    if (newPin === oldPin) {
      setError('New PIN must be different from your temporary PIN.');
      return;
    }
    const trivialPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321', '0123'];
    if (trivialPins.includes(newPin)) {
      setError('This PIN is too simple. Choose a less guessable 4-digit combination.');
      return;
    }
    if (currentUser.person.employee_number && newPin === currentUser.person.employee_number) {
      setError('PIN cannot match your employee badge number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPinChange(newPin, oldPin);
      if (!res.success) {
        setError(res.message || 'Failed to update PIN.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error updating PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Banner */}
        <div className="p-5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/40 border-b border-amber-500/30 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Security Requirement
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Create Your New PIN
            </h2>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Welcome, <strong className="text-white">{currentUser.person.first_name} {currentUser.person.last_name}</strong> (Badge #{currentUser.person.employee_number}).
            You are logging in with a temporary PIN. Company policy requires setting a personal 4-digit PIN to activate your account.
          </div>
        </div>

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Temporary PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Temporary / Current PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={oldPin}
              onFocus={() => setActiveField('OLD')}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={`w-full h-12 px-4 rounded-xl bg-slate-950 border text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none transition-all ${
                activeField === 'OLD' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'
              }`}
            />
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New 4-Digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onFocus={() => setActiveField('NEW')}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={`w-full h-12 px-4 rounded-xl bg-slate-950 border text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none transition-all ${
                activeField === 'NEW' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirm New 4-Digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onFocus={() => setActiveField('CONFIRM')}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={`w-full h-12 px-4 rounded-xl bg-slate-950 border text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none transition-all ${
                activeField === 'CONFIRM' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'
              }`}
            />
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => handleKeypadPress(btn)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-100 text-base font-bold transition-colors cursor-pointer select-none"
              >
                {btn === 'BACK' ? '⌫' : btn}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cancel / Exit</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving PIN...' : 'Save PIN & Continue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
