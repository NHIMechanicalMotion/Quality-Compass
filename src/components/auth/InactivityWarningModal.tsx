// ============================================================================
// Quality Compass: Kiosk Inactivity Warning Modal
// Path: src/components/auth/InactivityWarningModal.tsx
//
// Warns the user when a floor kiosk session has 30 seconds of inactivity
// remaining before automatic logout occurs.
// ============================================================================

import React from 'react';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const InactivityWarningModal: React.FC = () => {
  const { showInactivityWarning, inactivitySecondsRemaining, extendSession, logout } = useAuth();

  if (!showInactivityWarning || inactivitySecondsRemaining === null) return null;

  return (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={extendSession}
    >
      <div 
        className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-4 text-amber-400 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          Are you still there?
        </h3>

        <p className="text-xs text-slate-300 mb-4">
          For shop-floor security, this kiosk will automatically log out in:
        </p>

        <div className="text-4xl font-extrabold font-mono text-amber-400 mb-6 bg-slate-950 px-6 py-3 rounded-xl border border-slate-800">
          {inactivitySecondsRemaining}s
        </div>

        <div className="flex flex-col w-full gap-2.5">
          <button
            type="button"
            onClick={extendSession}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-[#81C341] hover:from-emerald-500 hover:to-[#81C341] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Stay Logged In</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
