import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  KeyRound, 
  HardHat, 
  User, 
  Delete, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { SystemUserRole } from '../../types/training';

export interface CurrentUserSession {
  role: SystemUserRole;
  employeeId: string;
  name: string;
  badgeNumber: string;
  department: string;
}

interface TrainingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUserSession;
  onSelectUser: (user: CurrentUserSession) => void;
}

export const TrainingLoginModal: React.FC<TrainingLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser
}) => {
  const [loginMode, setLoginMode] = useState<'FLOOR' | 'OFFICE'>('FLOOR');
  
  // Floor PIN state
  const [badgeInput, setBadgeInput] = useState<string>('1015');
  const [pinInput, setPinInput] = useState<string>('');
  
  // Office email/password state
  const [emailInput, setEmailInput] = useState<string>('l.ray@nhimm.com');
  const [passwordInput, setPasswordInput] = useState<string>('Quality2026!');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle numeric keypad input for PIN
  const handleKeypadPress = (val: string) => {
    setErrorMessage(null);
    if (val === 'CLEAR') {
      setPinInput('');
    } else if (val === 'BACK') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      if (pinInput.length < 4) {
        setPinInput(prev => prev + val);
      }
    }
  };

  // Quick switch demo users
  const DEMO_PRESETS: CurrentUserSession[] = [
    {
      role: 'ADMIN',
      employeeId: 'emp-1070',
      name: 'Lisa Ray',
      badgeNumber: '1070',
      department: 'Quality Assurance & Metrology'
    },
    {
      role: 'SUPERVISOR',
      employeeId: 'emp-1002',
      name: 'Jack Miller',
      badgeNumber: '1002',
      department: 'CNC Machining & Turning'
    },
    {
      role: 'OPERATOR',
      employeeId: 'emp-1015',
      name: 'Marcus Vance',
      badgeNumber: '1015',
      department: 'CNC Machining & Turning'
    },
    {
      role: 'OPERATOR',
      employeeId: 'emp-1022',
      name: 'Sarah Jenkins',
      badgeNumber: '1022',
      department: 'CNC Machining & Turning'
    }
  ];

  const handleSelectPreset = (preset: CurrentUserSession) => {
    onSelectUser(preset);
    setSuccessMessage(`Switched to ${preset.name} (${preset.role})`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 800);
  };

  const handleFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Floor PIN verification
    const matched = DEMO_PRESETS.find(p => p.badgeNumber === badgeInput.trim());
    if (matched && (pinInput === '1234' || pinInput === '0000' || pinInput.length === 4)) {
      onSelectUser(matched);
      setSuccessMessage(`Welcome, ${matched.name}! Floor access verified.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } else {
      setErrorMessage('Invalid Badge Number or 4-digit PIN. (Try Badge: 1015, PIN: 1234)');
    }
  };

  const handleOfficeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (emailInput.includes('@') && passwordInput.length >= 6) {
      // Find matching or default admin
      const matched = DEMO_PRESETS.find(p => p.role === 'ADMIN') || DEMO_PRESETS[0];
      onSelectUser(matched);
      setSuccessMessage(`Authenticated as ${matched.name} (${matched.role})`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } else {
      setErrorMessage('Please enter a valid email and password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Shop-Floor Sign-In & Role
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Current: <strong className="text-slate-900 dark:text-slate-200">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Demo Switcher Bar */}
          <div>
            <div className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Quick Role Switch (Instant Demo Presets):
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((preset) => {
                const isActive = currentUser.employeeId === preset.employeeId;
                return (
                  <button
                    key={preset.employeeId}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-bold text-base">{preset.name}</div>
                      <div className="text-base text-slate-600 dark:text-slate-400">
                        {preset.role} • #{preset.badgeNumber}
                      </div>
                    </div>
                    {isActive && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Tabs: Floor Staff vs Office Staff */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setLoginMode('FLOOR'); setErrorMessage(null); }}
              className={`flex-1 min-h-[48px] text-base font-bold pb-2 border-b-2 transition-all flex items-center justify-center gap-2 ${
                loginMode === 'FLOOR'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <HardHat className="w-5 h-5" />
              <span>Floor Staff (Badge & PIN)</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('OFFICE'); setErrorMessage(null); }}
              className={`flex-1 min-h-[48px] text-base font-bold pb-2 border-b-2 transition-all flex items-center justify-center gap-2 ${
                loginMode === 'OFFICE'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>Office Staff (Email / Supabase)</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-base">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-semibold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loginMode === 'FLOOR' ? (
            /* Shop Floor Badge + 4-digit PIN */
            <form onSubmit={handleFloorSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Employee Badge Number:
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={badgeInput}
                    onChange={(e) => setBadgeInput(e.target.value)}
                    placeholder="e.g. 1015"
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  4-Digit Security PIN:
                </label>
                <div className="flex items-center justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                        pinInput.length > idx
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                      }`}
                    >
                      {pinInput.length > idx ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* On-Screen Touch Keypad (Glove Friendly, 48px+ targets) */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleKeypadPress(val)}
                    className="min-h-[50px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-lg text-slate-800 dark:text-white flex items-center justify-center active:scale-95 transition-transform"
                  >
                    {val === 'BACK' ? <Delete className="w-6 h-6" /> : val}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={pinInput.length !== 4}
                className="w-full min-h-[48px] mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span>Sign In to Work Center</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            /* Office Supabase Email / Password */
            <form onSubmit={handleOfficeSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Work Email Address:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@nhimm.com"
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Password:
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span>Office Login (Supabase)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
