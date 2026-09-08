import React, { useState } from 'react';
import { Zap, X, CheckCircle2, AlertCircle, RefreshCw, Key, Globe, Database, Sliders } from 'lucide-react';
import type { OdooConfig } from '../../types/qms';
import { testOdooConnection } from '../../services/odooService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: OdooConfig;
  onSaveConfig: (cfg: OdooConfig) => void;
}

export const QmsOdooSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<OdooConfig>(config);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success: boolean;
    message: string;
    version?: string;
  }>({
    tested: false,
    loading: false,
    success: false,
    message: '',
  });

  if (!isOpen) return null;

  const handleTest = async () => {
    setTestStatus({ tested: false, loading: true, success: false, message: '' });
    const res = await testOdooConnection(formData);
    setTestStatus({
      tested: true,
      loading: false,
      success: res.success,
      message: res.message,
      version: res.version,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Odoo ERP Quality Sync Connector</h3>
              <p className="text-xs text-slate-400">Connect Quality Compass to Odoo v14-v18 JSON-RPC/REST API</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              Odoo Server Endpoint URL
            </label>
            <input
              type="url"
              placeholder="https://odoo.yourcompany.com"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                Database Name
              </label>
              <input
                type="text"
                placeholder="e.g. odoo_prod"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                API Token / User Key
              </label>
              <input
                type="password"
                placeholder="User API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Username / Login Email</label>
              <input
                type="text"
                placeholder="admin@company.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Auto-Sync Interval
              </label>
              <select
                value={formData.autoSyncIntervalMinutes}
                onChange={(e) => setFormData({ ...formData, autoSyncIntervalMinutes: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value={5}>Every 5 Minutes (Real-time)</option>
                <option value={15}>Every 15 Minutes (Recommended)</option>
                <option value={60}>Hourly</option>
                <option value={0}>Manual Only</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Active Sync Channels
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.syncShopfloorScrap}
                onChange={(e) => setFormData({ ...formData, syncShopfloorScrap: e.target.checked })}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
              />
              <span>Sync Shopfloor Scrap Orders & Costs (<code>stock.scrap</code>)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.syncQualityAlerts}
                onChange={(e) => setFormData({ ...formData, syncQualityAlerts: e.target.checked })}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
              />
              <span>Sync Quality Alert Tickets from Work Centers (<code>quality.alert</code>)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.syncMrbLots}
                onChange={(e) => setFormData({ ...formData, syncMrbLots: e.target.checked })}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
              />
              <span>Sync MRB Quarantine Stock & Production Lots (<code>stock.lot</code>)</span>
            </label>
          </div>

          {/* Test connection output */}
          {testStatus.tested && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
              testStatus.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />}
              <div>
                <p className="font-semibold">{testStatus.message}</p>
                {testStatus.version && <p className="text-[11px] text-slate-400 mt-0.5">{testStatus.version}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus.loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin text-purple-400' : ''}`} />
              {testStatus.loading ? 'Testing...' : 'Test Connection'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/20"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
