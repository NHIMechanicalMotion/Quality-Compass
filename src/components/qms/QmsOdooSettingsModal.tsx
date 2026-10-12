import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Database, 
  Server, 
  KeyRound
} from 'lucide-react';
import type { OdooConfig } from '../../types/qms';
import { fetchLatestSyncLog } from '../../services/odooService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: OdooConfig;
  onSaveConfig: (cfg: OdooConfig) => void;
}

export const QmsOdooSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const [syncLog, setSyncLog] = useState<{
    timestamp: string;
    status: string;
    recordsSynced: number;
    durationSeconds: number;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const latest = await fetchLatestSyncLog();
      setSyncLog(latest);
    } catch (err) {
      console.error('Failed to load sync log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Odoo ERP Quality Sync Pipeline
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Hourly Automated Cron
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Server-side synchronization via GitHub Actions (.github/workflows/odoo_quality_sync.yml)
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Architecture Banner */}
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Credentials Stored in Frontend</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            In accordance with NHIMM enterprise security standards, Odoo passwords, API keys, and Supabase service role credentials are <strong>never stored in the browser</strong>. The sync pipeline runs as an isolated backend task in GitHub Actions once per hour, writing directly to Supabase.
          </p>
        </div>

        {/* Current Sync Pipeline Status Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              Pipeline Execution Status
            </span>
            <button
              onClick={loadStatus}
              disabled={loading}
              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>

          {syncLog ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Last Status</span>
                <span className={`font-bold flex items-center gap-1 mt-0.5 ${
                  syncLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {syncLog.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {syncLog.status}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Records Synced</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{syncLog.recordsSynced}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Execution Time</span>
                <span className="text-slate-300 font-bold mt-0.5 block">{syncLog.durationSeconds}s</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Last Synced</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block truncate" title={syncLog.timestamp}>
                  {new Date(syncLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-1">
              <Clock className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-xs font-bold text-white">Awaiting Initial GitHub Actions Sync Run</p>
              <p className="text-[11px] text-slate-400">
                The hourly cron triggers at minute 0 of every hour, or you can trigger it manually in GitHub Actions.
              </p>
            </div>
          )}

          {syncLog?.message && (
            <div className="text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
              Message: {syncLog.message}
            </div>
          )}
        </div>

        {/* Required GitHub Secrets Reference */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Required GitHub Repository Secrets
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Repository &gt; Settings &gt; Secrets and variables &gt; Actions
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Secret Name</th>
                  <th className="py-2 px-3">Purpose / Model</th>
                  <th className="py-2 px-3">Example Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-300">
                <tr>
                  <td className="py-2 px-3 text-purple-400 font-bold">ODOO_URL</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Odoo instance XML-RPC endpoint</td>
                  <td className="py-2 px-3 text-slate-500">https://odoo.nhi-mfg.com</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-purple-400 font-bold">ODOO_DB</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Odoo database name</td>
                  <td className="py-2 px-3 text-slate-500">nhimm</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-purple-400 font-bold">ODOO_USER</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Sync user email/login</td>
                  <td className="py-2 px-3 text-slate-500">sync-user@nhi-mfg.com</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-purple-400 font-bold">ODOO_API_KEY</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Odoo user API key or password</td>
                  <td className="py-2 px-3 text-slate-500">••••••••••••••••</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-emerald-400 font-bold">SUPABASE_URL</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Quality Compass Supabase URL</td>
                  <td className="py-2 px-3 text-slate-500">https://jggdqmygudsiueaiqzcn.supabase.co</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-emerald-400 font-bold">SUPABASE_SERVICE_ROLE_KEY</td>
                  <td className="py-2 px-3 font-sans text-slate-400">Service role secret to upsert sync tables</td>
                  <td className="py-2 px-3 text-slate-500">••••••••••••••••</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Target Tables: odoo_quality_records, odoo_quality_ppm_metrics</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
