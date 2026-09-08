import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Calendar, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Search, 
  FileCheck,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import type { 
  QmsAudit, 
  QmsAuditFinding, 
  AuditType, 
  FindingSeverity,
  FindingStatus 
} from '../../types/qms';

interface Props {
  audits: QmsAudit[];
  onAddAudit: (audit: Partial<QmsAudit>) => Promise<void>;
  onAddFinding: (finding: Partial<QmsAuditFinding>) => Promise<void>;
  onUpdateFindingStatus: (findingId: string, status: FindingStatus) => Promise<void>;
}

export const QmsAuditsManager: React.FC<Props> = ({
  audits,
  onAddAudit,
  onAddFinding,
  onUpdateFindingStatus,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(audits[0]?.id || null);

  // Modals
  const [isAddAuditModalOpen, setIsAddAuditModalOpen] = useState(false);
  const [isAddFindingModalOpen, setIsAddFindingModalOpen] = useState(false);
  const [selectedAuditForFinding, setSelectedAuditForFinding] = useState<string>('');

  // New Audit Form State
  const [newAudit, setNewAudit] = useState<Partial<QmsAudit>>(() => ({
    audit_number: `AUD-2026-${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    audit_type: 'INTERNAL',
    scope_standard: 'ISO 9001:2015',
    lead_auditor: '',
    department: 'Quality Assurance',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    status: 'SCHEDULED',
    score: 95,
    summary_notes: '',
  }));

  // New Finding Form State
  const [newFinding, setNewFinding] = useState<Partial<QmsAuditFinding>>(() => ({
    finding_number: `FND-2026-${Math.floor(10 + Math.random() * 90)}`,
    severity: 'MINOR',
    standard_clause: '8.5.1 Control of production',
    description: '',
    department: 'Manufacturing',
    target_closure_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    status: 'OPEN',
    root_cause: '',
  }));

  // Filtering
  const filteredAudits = audits.filter((a) => {
    const matchesSearch = 
      a.audit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.lead_auditor.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedTypeFilter === 'INTERNAL') return a.audit_type === 'INTERNAL';
    if (selectedTypeFilter === 'EXTERNAL') return a.audit_type !== 'INTERNAL';
    return true;
  });

  // Metrics
  const totalFindings = audits.reduce((sum, a) => sum + (a.findings?.length || 0), 0);
  const majorFindings = audits.reduce(
    (sum, a) => sum + (a.findings?.filter(f => f.severity === 'MAJOR').length || 0), 0
  );
  const minorFindings = audits.reduce(
    (sum, a) => sum + (a.findings?.filter(f => f.severity === 'MINOR').length || 0), 0
  );
  const ofiFindings = audits.reduce(
    (sum, a) => sum + (a.findings?.filter(f => f.severity === 'OFI').length || 0), 0
  );

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudit.title || !newAudit.lead_auditor) return;
    await onAddAudit(newAudit);
    setIsAddAuditModalOpen(false);
    setNewAudit({
      audit_number: `AUD-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      audit_type: 'INTERNAL',
      scope_standard: 'ISO 9001:2015',
      lead_auditor: '',
      department: 'Quality Assurance',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      status: 'SCHEDULED',
      score: 95,
      summary_notes: '',
    });
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditForFinding || !newFinding.description) return;
    await onAddFinding({ ...newFinding, audit_id: selectedAuditForFinding });
    setIsAddFindingModalOpen(false);
    setNewFinding({
      finding_number: `FND-2026-${Math.floor(10 + Math.random() * 90)}`,
      severity: 'MINOR',
      standard_clause: '8.5.1 Control of production',
      description: '',
      department: 'Manufacturing',
      target_closure_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      status: 'OPEN',
      root_cause: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            QMS Internal & External Audit Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracking ISO 9001:2015, IATF 16949, registrar surveillance audits, customer audits, and non-conformance findings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddAuditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Schedule / Log Audit
          </button>
        </div>
      </div>

      {/* KPI Severity Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Audits</div>
            <div className="text-lg font-bold text-white">{audits.length} ({totalFindings} Findings)</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Major NCs</div>
            <div className="text-lg font-bold text-rose-400">{majorFindings} Open</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Minor NCs</div>
            <div className="text-lg font-bold text-amber-400">{minorFindings} Logged</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Opportunities (OFI)</div>
            <div className="text-lg font-bold text-cyan-300">{ofiFindings} Suggestions</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'INTERNAL', 'EXTERNAL'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedTypeFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedTypeFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'ALL' ? 'All Audits' : filter === 'INTERNAL' ? 'Internal QMS' : 'External & Registrar'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by auditor, standard, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audits List & Findings Accordion */}
      <div className="space-y-4">
        {filteredAudits.map((audit) => {
          const isExpanded = expandedAuditId === audit.id;
          const auditFindings = audit.findings || [];

          return (
            <div
              key={audit.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-400" /> : <ChevronRight className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {audit.audit_number}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        audit.audit_type === 'INTERNAL' 
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {audit.audit_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">• Standard: <strong className="text-slate-200">{audit.scope_standard}</strong></span>
                    </div>

                    <h3 className="text-base font-bold text-white">{audit.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target Dept: <span className="text-slate-200">{audit.department}</span> • Lead Auditor: <span className="text-slate-200">{audit.lead_auditor}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5" />
                      {audit.start_date} to {audit.end_date}
                    </div>
                    <div className="text-xs font-semibold text-slate-300 mt-0.5">
                      Findings: <span className="text-amber-400">{auditFindings.length}</span> ({auditFindings.filter(f => f.severity === 'MAJOR').length} Major)
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-emerald-400">{audit.score || 95}%</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      audit.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {audit.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible Findings Body */}
              {isExpanded && (
                <div className="border-t border-slate-800 bg-slate-950/60 p-5 space-y-4">
                  {audit.summary_notes && (
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                      <strong className="text-slate-100 block mb-1">Lead Auditor Executive Summary:</strong>
                      {audit.summary_notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Identified Findings & Non-Conformances ({auditFindings.length})
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAuditForFinding(audit.id);
                        setIsAddFindingModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" /> Log Finding
                    </button>
                  </div>

                  {auditFindings.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/40 rounded-lg border border-dashed border-slate-800">
                      No non-conformances identified in this audit. Full standard compliance verified!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {auditFindings.map((finding) => (
                        <div
                          key={finding.id}
                          className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-300">
                                {finding.finding_number}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                finding.severity === 'MAJOR'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : finding.severity === 'MINOR'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                {finding.severity}
                              </span>
                              <span className="text-xs text-blue-400 font-mono">
                                Clause: {finding.standard_clause}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 font-medium">
                              {finding.description}
                            </p>
                            {finding.root_cause && (
                              <p className="text-[11px] text-slate-400">
                                <strong className="text-slate-300">Root Cause:</strong> {finding.root_cause}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            {finding.target_closure_date && (
                              <span className="text-[11px] text-slate-400">
                                Due: <strong className="text-slate-200">{finding.target_closure_date}</strong>
                              </span>
                            )}

                            <select
                              value={finding.status}
                              onChange={(e) => onUpdateFindingStatus(finding.id, e.target.value as FindingStatus)}
                              className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="OPEN">OPEN</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="CLOSED">CLOSED</option>
                              <option value="VERIFIED">VERIFIED</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Schedule / Log New Audit */}
      {isAddAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Schedule / Record QMS Audit
              </h3>
              <button
                onClick={() => setIsAddAuditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAudit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Audit Number</label>
                  <input
                    type="text"
                    value={newAudit.audit_number}
                    onChange={(e) => setNewAudit({ ...newAudit, audit_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Audit Type</label>
                  <select
                    value={newAudit.audit_type}
                    onChange={(e) => setNewAudit({ ...newAudit, audit_type: e.target.value as AuditType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="INTERNAL">Internal Systems Audit</option>
                    <option value="EXTERNAL_REGISTRAR">External Registrar (e.g. TUV / BSI)</option>
                    <option value="EXTERNAL_CUSTOMER">Customer OEM Audit</option>
                    <option value="EXTERNAL_REGULATORY">Regulatory Compliance Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Audit Title</label>
                <input
                  type="text"
                  placeholder="e.g. Q2 Precision Machining & Tooling Audit"
                  value={newAudit.title}
                  onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Scope Standard</label>
                  <input
                    type="text"
                    value={newAudit.scope_standard}
                    onChange={(e) => setNewAudit({ ...newAudit, scope_standard: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Auditee Department</label>
                  <input
                    type="text"
                    value={newAudit.department}
                    onChange={(e) => setNewAudit({ ...newAudit, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Lead Auditor</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={newAudit.lead_auditor}
                    onChange={(e) => setNewAudit({ ...newAudit, lead_auditor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Status</label>
                  <select
                    value={newAudit.status}
                    onChange={(e) => setNewAudit({ ...newAudit, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={newAudit.start_date}
                    onChange={(e) => setNewAudit({ ...newAudit, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">End Date</label>
                  <input
                    type="date"
                    value={newAudit.end_date}
                    onChange={(e) => setNewAudit({ ...newAudit, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Summary Notes / Scope Outline</label>
                <textarea
                  rows={3}
                  value={newAudit.summary_notes || ''}
                  onChange={(e) => setNewAudit({ ...newAudit, summary_notes: e.target.value })}
                  placeholder="Summarize key audit checkpoints and areas to inspect..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAuditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-semibold shadow-lg shadow-blue-500/20"
                >
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Audit Finding */}
      {isAddFindingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Log Audit Non-Conformance / Finding
              </h3>
              <button
                onClick={() => setIsAddFindingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFinding} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Finding Number</label>
                  <input
                    type="text"
                    value={newFinding.finding_number}
                    onChange={(e) => setNewFinding({ ...newFinding, finding_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Severity</label>
                  <select
                    value={newFinding.severity}
                    onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value as FindingSeverity })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="MAJOR">Major Non-Conformance</option>
                    <option value="MINOR">Minor Non-Conformance</option>
                    <option value="OFI">Opportunity for Improvement (OFI)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Standard Clause Reference</label>
                <input
                  type="text"
                  placeholder="e.g. 7.1.5 Monitoring & measuring resources"
                  value={newFinding.standard_clause}
                  onChange={(e) => setNewFinding({ ...newFinding, standard_clause: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Finding Description & Evidence</label>
                <textarea
                  rows={3}
                  placeholder="State the non-conforming condition, evidence observed, and requirements violated..."
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department Responsible</label>
                  <input
                    type="text"
                    value={newFinding.department}
                    onChange={(e) => setNewFinding({ ...newFinding, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Target Closure Date</label>
                  <input
                    type="date"
                    value={newFinding.target_closure_date || ''}
                    onChange={(e) => setNewFinding({ ...newFinding, target_closure_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Preliminary Root Cause (if identified)</label>
                <input
                  type="text"
                  placeholder="Initial observation or cause..."
                  value={newFinding.root_cause || ''}
                  onChange={(e) => setNewFinding({ ...newFinding, root_cause: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddFindingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold shadow-lg shadow-amber-500/20"
                >
                  Record Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
