// ============================================================================
// Quality Compass: Unified Enterprise Authentication Modal
// Path: src/components/auth/AuthModal.tsx
//
// Shared across all modules (CAD Inspection, QMS, APQP/PPAP, Shop Training).
// Supports Office Email/Password & Floor Kiosk Badge/PIN with rate limiting
// and account lockout protections. Zero hardcoded demo credentials.
// ============================================================================

import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  KeyRound, 
  HardHat, 
  Building2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Compass } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'FLOOR' | 'OFFICE';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'FLOOR',
}) => {
  const { loginFloor, loginOffice, currentUser, logout } = useAuth();
  const [loginMode, setLoginMode] = useState<'FLOOR' | 'OFFICE'>(defaultMode);

  // Floor Kiosk State
  const [badgeInput, setBadgeInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [activeKioskField, setActiveKioskField] = useState<'BADGE' | 'PIN'>('BADGE');

  // Office Email State
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Feedback States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Numeric Keypad for Floor Tablets
  const handleKeypadPress = (val: string) => {
    setErrorMessage(null);
    setErrorCode(null);

    if (activeKioskField === 'BADGE') {
      if (val === 'CLEAR') {
        setBadgeInput('');
      } else if (val === 'BACK') {
        setBadgeInput((prev) => prev.slice(0, -1));
      } else {
        if (badgeInput.length < 8) {
          const next = badgeInput + val;
          setBadgeInput(next);
          // If badge length looks complete (e.g. 4 digits), guide focus to PIN
          if (next.length === 4) {
            setActiveKioskField('PIN');
          }
        }
      }
    } else {
      if (val === 'CLEAR') {
        setPinInput('');
      } else if (val === 'BACK') {
        setPinInput((prev) => prev.slice(0, -1));
      } else {
        if (pinInput.length < 4) {
          setPinInput((prev) => prev + val);
        }
      }
    }
  };

  const handleFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);

    if (!badgeInput.trim()) {
      setErrorMessage('Please enter your Employee Badge Number.');
      setActiveKioskField('BADGE');
      return;
    }
    if (pinInput.length !== 4) {
      setErrorMessage('Please enter your 4-digit PIN.');
      setActiveKioskField('PIN');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginFloor(badgeInput, pinInput);
      if (res.success && res.user) {
        if (res.user.pinMustChange) {
          onClose();
        } else {
          setSuccessMessage(`Welcome, ${res.user.person.first_name} ${res.user.person.last_name}! Kiosk verified.`);
          setTimeout(() => {
            setSuccessMessage(null);
            onClose();
          }, 800);
        }
      } else {
        setErrorMessage(res.error || 'Authentication failed.');
        setErrorCode(res.errorCode || 'UNKNOWN');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error communicating with authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);

    if (!emailInput.trim() || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginOffice(emailInput, passwordInput);
      if (res.success && res.user) {
        setSuccessMessage(`Authenticated as ${res.user.person.first_name} ${res.user.person.last_name}.`);
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
        setErrorCode(res.errorCode || 'UNKNOWN');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with Supabase authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[94vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#07172C] via-[#0B2545] to-[#07172C] border-b border-[#132E58] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B2545] to-[#132E58] flex items-center justify-center border border-[#81C341]/40 shadow-md">
              <Compass className="w-5 h-5 text-[#81C341]" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-blue-400">
                NHI Mechanical Motion LLC
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Quality Compass Login</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Authenticated Banner if already logged in */}
        {currentUser && (
          <div className="p-3 bg-blue-950/50 border-b border-blue-900/50 flex items-center justify-between text-xs px-4">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Currently active:</span>
              <strong className="text-white">{currentUser.person.first_name} {currentUser.person.last_name}</strong>
              <span className="text-slate-400 font-mono">({currentUser.authMethod === 'FLOOR_PIN' ? 'Kiosk' : 'Office'})</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                setBadgeInput('');
                setPinInput('');
              }}
              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline text-[11px]"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Mode Tabs: Floor Kiosk vs Office Staff */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLoginMode('FLOOR');
              setErrorMessage(null);
            }}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'FLOOR'
                ? 'bg-[#132E58] text-white border border-[#81C341]/60 shadow-md text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HardHat className="w-4 h-4 text-[#81C341]" />
            <span>Shop Floor Kiosk (Badge &amp; PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('OFFICE');
              setErrorMessage(null);
            }}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'OFFICE'
                ? 'bg-[#132E58] text-white border border-blue-400/60 shadow-md text-blue-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-400" />
            <span>Office Staff (Email &amp; Password)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Error Message with Specific Security Codes */}
          {errorMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
              errorCode === 'RATE_LIMITED'
                ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                : errorCode === 'ACCOUNT_LOCKED'
                ? 'bg-rose-950/80 border-rose-500/70 text-rose-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}>
              {errorCode === 'RATE_LIMITED' ? (
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : errorCode === 'ACCOUNT_LOCKED' ? (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">
                  {errorCode === 'RATE_LIMITED' && 'Device Throttled (HTTP 429)'}
                  {errorCode === 'ACCOUNT_LOCKED' && 'Account Locked Out (HTTP 423)'}
                  {errorCode === 'DEACTIVATED' && 'Access Restricted (HTTP 403)'}
                  {errorCode === 'INVALID_CREDENTIALS' && 'Authentication Error (HTTP 401)'}
                  {(!errorCode || errorCode === 'SERVER_ERROR' || errorCode === 'UNKNOWN') && 'Login Failed'}
                </div>
                <div className="text-[11px] mt-0.5 text-slate-300">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* ========================================================
              FLOOR KIOSK FORM (BADGE NUMBER + 4-DIGIT PIN)
              ======================================================== */}
          {loginMode === 'FLOOR' ? (
            <form onSubmit={handleFloorSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Badge Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge Number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={badgeInput}
                    onFocus={() => setActiveKioskField('BADGE')}
                    onChange={(e) => setBadgeInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="e.g. 1015"
                    className={`w-full min-h-[48px] px-3 rounded-xl bg-slate-950 border font-mono text-center text-lg font-bold text-white focus:outline-none transition-all ${
                      activeKioskField === 'BADGE'
                        ? 'border-[#81C341] ring-2 ring-[#81C341]/30'
                        : 'border-slate-700'
                    }`}
                  />
                </div>

                {/* 4-Digit PIN Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    4-Digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onFocus={() => setActiveKioskField('PIN')}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className={`w-full min-h-[48px] px-3 rounded-xl bg-slate-950 border font-mono text-center text-2xl tracking-[0.4em] font-bold text-white focus:outline-none transition-all ${
                      activeKioskField === 'PIN'
                        ? 'border-[#81C341] ring-2 ring-[#81C341]/30'
                        : 'border-slate-700'
                    }`}
                  />
                </div>
              </div>

              {/* Active Target Indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Keypad entering: <strong className="text-[#81C341]">{activeKioskField === 'BADGE' ? 'Badge Number' : '4-Digit PIN'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveKioskField(activeKioskField === 'BADGE' ? 'PIN' : 'BADGE')}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  Switch to {activeKioskField === 'BADGE' ? 'PIN' : 'Badge'}
                </button>
              </div>

              {/* Touchscreen Numeric Keypad (48px Touch Targets) */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleKeypadPress(val)}
                    className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 text-white font-bold text-base transition-colors cursor-pointer select-none"
                  >
                    {val === 'BACK' ? '⌫' : val}
                  </button>
                ))}
              </div>

              {/* Security Policy Reminder */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Shared kiosk tablets auto-logout after <strong>5 minutes</strong> of inactivity.</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !badgeInput.trim() || pinInput.length !== 4}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-[#81C341] hover:from-emerald-500 hover:to-[#81C341] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Kiosk'}</span>
              </button>
            </form>
          ) : (
            /* ========================================================
                OFFICE STAFF FORM (EMAIL & PASSWORD)
                ======================================================== */
            <form onSubmit={handleOfficeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="first.last@nhimm.com"
                    autoComplete="email"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full min-h-[48px] pl-10 pr-12 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Office staff login authenticates with standard Supabase Auth &amp; enterprise credentials.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !emailInput.trim() || !passwordInput}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to Office'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
