import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  X, 
  Lock, 
  Download, 
  ShieldCheck, 
  FileCode, 
  FileSpreadsheet, 
  File, 
  Eye 
} from 'lucide-react';
import type { 
  ControlledDocument, 
  DocumentCategory, 
  DocumentStatus,
  SourceVaultItem,
  WorkingDocument
} from '../../types/qms';

interface Props {
  documents: ControlledDocument[];
  onAddDocument: (doc: Partial<ControlledDocument>) => Promise<void>;
  onAddRevision: (docId: string, revision: string, summary: string, author: string, approver?: string) => Promise<void>;
  onUpdateStatus: (docId: string, status: DocumentStatus) => Promise<void>;
}

const CATEGORIES: DocumentCategory[] = [
  'Quality Manual',
  'SOP',
  'Work Instruction',
  'Inspection Procedure',
  'Form/Template',
];

const DEPARTMENTS = [
  'All Departments',
  'Quality Assurance',
  'Engineering',
  'Manufacturing',
  'Supply Chain',
  'Executive',
];

// Initial empty state for native vault files and working drafts
const INITIAL_VAULT_ITEMS: SourceVaultItem[] = [];
const INITIAL_WORKING_DOCS: WorkingDocument[] = [];

export const QmsDocumentControl: React.FC<Props> = ({
  documents,
  onAddDocument,
}) => {
  // Consensus-aligned 3-tier view selector
  const [activeTier, setActiveTier] = useState<'CONTROLLED_PDFS' | 'SOURCE_VAULT' | 'WORKING_DOCS'>('CONTROLLED_PDFS');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');

  // Modals
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

  // PDF Viewer Modal
  const [viewingPdfDoc, setViewingPdfDoc] = useState<ControlledDocument | null>(null);

  // Promote Working Document Modal
  const [promotingDoc, setPromotingDoc] = useState<WorkingDocument | null>(null);
  const [approverName, setApproverName] = useState('Sarah Jenkins (QA VP)');
  const [approvalNotes, setApprovalNotes] = useState('Verified compliant with ISO 9001:2015 Clause 7.5. Controlled copy released.');

  // Tier 2 & 3 local states
  const [vaultItems, setVaultItems] = useState<SourceVaultItem[]>(INITIAL_VAULT_ITEMS);
  const [workingDocs, setWorkingDocs] = useState<WorkingDocument[]>(INITIAL_WORKING_DOCS);
  const [isAddWorkingDocModalOpen, setIsAddWorkingDocModalOpen] = useState(false);
  const [newWorkingDoc, setNewWorkingDoc] = useState<Partial<WorkingDocument>>({
    doc_number: 'SOP-QA-016',
    title: '',
    target_revision: 'Rev A',
    category: 'SOP',
    department: 'Quality Assurance',
    author: 'David Chen',
    source_file_name: '',
    change_summary: 'Initial draft.',
  });

  // Filter logic for Tier 1 Controlled Documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.doc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
    if (selectedDepartment !== 'All Departments' && doc.department !== selectedDepartment) return false;
    return true;
  });

  // Promotion handler (Tier 3 Working Doc -> Tier 1 Controlled PDF + Tier 2 Vault)
  const handlePromoteWorkingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingDoc) return;

    // 1. Add to Controlled Documents
    await onAddDocument({
      doc_number: promotingDoc.doc_number,
      title: promotingDoc.title,
      category: promotingDoc.category,
      department: promotingDoc.department,
      current_revision: promotingDoc.target_revision,
      status: 'APPROVED',
      owner: promotingDoc.author,
      effective_date: new Date().toISOString().slice(0, 10),
      next_review_date: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
      description: promotingDoc.change_summary,
      pdf_file_name: `${promotingDoc.doc_number}_${promotingDoc.target_revision.replace(/\s+/g, '')}_CONTROLLED.pdf`,
      approved_by: approverName,
      approved_at: new Date().toISOString().slice(0, 10),
    });

    // 2. Deposit master source file into Tier 2 Source Vault
    const vaultEntry: SourceVaultItem = {
      id: `vault-${Date.now()}`,
      document_id: promotingDoc.id,
      doc_number: promotingDoc.doc_number,
      title: promotingDoc.title,
      revision: promotingDoc.target_revision,
      file_name: promotingDoc.source_file_name || `${promotingDoc.doc_number}_Master.docx`,
      file_type: promotingDoc.source_file_type || 'docx',
      file_size_bytes: 2150000,
      uploaded_by: promotingDoc.author,
      uploaded_at: new Date().toISOString().slice(0, 10),
      is_checked_out: false,
      notes: `Archived during promotion to Controlled PDF by ${approverName}.`,
    };
    setVaultItems(prev => [vaultEntry, ...prev]);

    // 3. Remove from Working Documents
    setWorkingDocs(prev => prev.filter(w => w.id !== promotingDoc.id));
    setPromotingDoc(null);
  };

  // Check out source file from vault
  const handleToggleVaultCheckout = (vaultId: string) => {
    setVaultItems(prev => prev.map(v => {
      if (v.id === vaultId) {
        const nextState = !v.is_checked_out;
        return {
          ...v,
          is_checked_out: nextState,
          checked_out_by: nextState ? 'Current User (Author)' : null,
        };
      }
      return v;
    }));
  };

  // Create new working document draft
  const handleCreateWorkingDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkingDoc.doc_number || !newWorkingDoc.title) return;
    const doc: WorkingDocument = {
      id: `work-${Date.now()}`,
      doc_number: newWorkingDoc.doc_number || 'SOP-000',
      title: newWorkingDoc.title || '',
      target_revision: newWorkingDoc.target_revision || 'Rev A',
      category: newWorkingDoc.category || 'SOP',
      department: newWorkingDoc.department || 'Quality Assurance',
      author: newWorkingDoc.author || 'Author',
      stage: 'DRAFT',
      source_file_name: newWorkingDoc.source_file_name || `${newWorkingDoc.doc_number}_Draft.docx`,
      source_file_type: 'docx',
      change_summary: newWorkingDoc.change_summary || '',
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    };
    setWorkingDocs(prev => [doc, ...prev]);
    setIsAddWorkingDocModalOpen(false);
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('doc')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (type.includes('xls')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (type.includes('dwg') || type.includes('dxf')) return <FileCode className="w-4 h-4 text-purple-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> ISO 9001:2015 Clause 7.5
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Three-Tier Document Governance
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Document Control System & Source File Vault
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict consensus strategy: Controlled approved PDFs only, secure master source file repository, and separated draft workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTier === 'WORKING_DOCS' ? (
            <button
              onClick={() => setIsAddWorkingDocModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Start Working Draft
            </button>
          ) : (
            <button
              onClick={() => setIsAddDocModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Register Controlled PDF
            </button>
          )}
        </div>
      </div>

      {/* Consensus 3-Tier Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTier('CONTROLLED_PDFS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTier === 'CONTROLLED_PDFS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Tier 1: Controlled Documents (Approved PDFs Only)
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-950 font-mono font-bold text-emerald-400">
              {documents.filter(d => d.status === 'APPROVED').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTier('SOURCE_VAULT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTier === 'SOURCE_VAULT'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400" />
            Tier 2: Source File Vault (Native Repository)
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-950 font-mono font-bold text-amber-400">
              {vaultItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTier('WORKING_DOCS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTier === 'WORKING_DOCS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-400" />
            Tier 3: Working Documents (Drafts in Progress)
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-950 font-mono font-bold text-purple-400">
              {workingDocs.length}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 italic hidden xl:block">
          {activeTier === 'CONTROLLED_PDFS' && 'Read-only approved PDFs published for manufacturing & audits'}
          {activeTier === 'SOURCE_VAULT' && 'Restricted master source files (.docx, .xlsx, .dwg) linked to approved PDFs'}
          {activeTier === 'WORKING_DOCS' && 'Isolated draft workspace — prevents unapproved revisions on shopfloor'}
        </span>
      </div>

      {/* =========================================================================
          TIER 1: CONTROLLED DOCUMENTS (APPROVED PDFS ONLY)
          ========================================================================= */}
      {activeTier === 'CONTROLLED_PDFS' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search controlled document #, title, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Controlled Documents Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Doc Number</th>
                    <th className="py-3 px-4">Document Title & Scope</th>
                    <th className="py-3 px-4">Category / Dept</th>
                    <th className="py-3 px-4">Approved Revision</th>
                    <th className="py-3 px-4">Effective / Review Date</th>
                    <th className="py-3 px-4">Official Control Stamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                        No approved controlled documents matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => {
                      const vaultMatch = vaultItems.find(v => v.doc_number === doc.doc_number);

                      return (
                        <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            <span className="text-blue-400 block">{doc.doc_number}</span>
                            <span className="text-[10px] text-slate-500 font-sans">Owner: {doc.owner}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-[300px]">
                            <span className="font-semibold text-white block truncate">{doc.title}</span>
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">{doc.description}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 block w-fit">
                              {doc.category}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block">{doc.department}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {doc.current_revision}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            <div>Effective: <strong className="text-slate-300">{doc.effective_date}</strong></div>
                            <div className="text-[10px] text-slate-500">Next Rev: {doc.next_review_date}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 rounded text-center w-fit">
                              <span className="text-[9px] font-mono font-extrabold uppercase text-emerald-300 block tracking-wider">
                                CONTROLLED PDF
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                Approved: {doc.owner.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingPdfDoc(doc)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                              >
                                <Eye className="w-3.5 h-3.5" /> View PDF
                              </button>

                              {vaultMatch && (
                                <button
                                  onClick={() => setActiveTier('SOURCE_VAULT')}
                                  title={`Source Vault File: ${vaultMatch.file_name}`}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 border border-slate-700 transition-colors"
                                >
                                  <Lock className="w-3 h-3 text-amber-400" /> Vault
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 2: SOURCE FILE VAULT (NATIVE REPOSITORY)
          ========================================================================= */}
      {activeTier === 'SOURCE_VAULT' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Source File Vault (Native Masters Repository)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted repository for editable Word (.docx), Excel (.xlsx), and CAD (.dwg) source files used to generate controlled PDFs.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Access Restricted • Author Check-in / Check-out
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Doc # / Target Rev</th>
                  <th className="py-3 px-4">Native Source File Name</th>
                  <th className="py-3 px-4">File Type & Size</th>
                  <th className="py-3 px-4">Vault Status</th>
                  <th className="py-3 px-4">Last Deposited Date & Author</th>
                  <th className="py-3 px-4 text-right">Vault Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vaultItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">
                      No native source files currently in vault. Check in editable .docx, .xlsx, or .dwg files here.
                    </td>
                  </tr>
                ) : (
                  vaultItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <span className="text-amber-400 block">{item.doc_number}</span>
                      <span className="text-[10px] text-slate-400">{item.revision}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(item.file_type)}
                        <span className="font-mono text-slate-200 font-semibold">{item.file_name}</span>
                      </div>
                      {item.notes && <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <span className="uppercase text-slate-200 block">{item.file_type} File</span>
                      <span>{(item.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.is_checked_out ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Checked Out ({item.checked_out_by || 'Author'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Locked in Vault (Ready)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <div>{item.uploaded_at}</div>
                      <div className="text-[10px] text-slate-500">{item.uploaded_by}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleVaultCheckout(item.id)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                            item.is_checked_out
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {item.is_checked_out ? 'Check-in Source' : 'Check-out Source'}
                        </button>

                        <button
                          onClick={() => alert(`Downloading master native file: ${item.file_name}`)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 3: WORKING DOCUMENTS (DRAFTS IN PROGRESS)
          ========================================================================= */}
      {activeTier === 'WORKING_DOCS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Working Documents (Drafts & In-Progress Workspace)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Isolated workspace for authoring drafts and revisions. Kept strictly separate from the shopfloor controlled register.
              </p>
            </div>
            <button
              onClick={() => setIsAddWorkingDocModalOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Draft
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Doc # / Target Rev</th>
                  <th className="py-3 px-4">Draft Title & Scope</th>
                  <th className="py-3 px-4">Author / Department</th>
                  <th className="py-3 px-4">Lifecycle Stage</th>
                  <th className="py-3 px-4">Change Summary</th>
                  <th className="py-3 px-4 text-right">Promotion Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {workingDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">
                      No working documents or drafts in progress.
                    </td>
                  </tr>
                ) : (
                  workingDocs.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <span className="text-purple-400 block">{w.doc_number}</span>
                        <span className="text-[10px] text-slate-400">{w.target_revision}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <span className="font-semibold text-white block truncate">{w.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{w.source_file_name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-200 font-medium block">{w.author}</span>
                        <span className="text-[10px] text-slate-500">{w.department}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.stage === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : w.stage === 'IN_REVIEW'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {w.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px] text-slate-300 text-[11px]">
                        {w.change_summary}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setPromotingDoc(w)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow ml-auto"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Promote to Controlled PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* Modal: PDF Viewer with Official Controlled Copy Watermark */}
      {viewingPdfDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {viewingPdfDoc.doc_number}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{viewingPdfDoc.current_revision}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{viewingPdfDoc.title}</h3>
              </div>
              <button onClick={() => setViewingPdfDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Controlled Document Paper Preview */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-8 rounded-xl border border-slate-800 relative space-y-6 text-slate-300 font-sans shadow-inner">
              {/* Controlled Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-[-30deg]">
                <span className="text-6xl sm:text-7xl font-extrabold text-red-500 uppercase tracking-widest border-8 border-red-500 p-8 rounded-3xl">
                  CONTROLLED COPY
                </span>
              </div>

              {/* Document Header Table */}
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Organization</span>
                  <strong className="text-white">Quality Compass / NHI LLC</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Document No</span>
                  <strong className="text-emerald-400">{viewingPdfDoc.doc_number}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Effective Date</span>
                  <strong className="text-white">{viewingPdfDoc.effective_date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Approved By</span>
                  <strong className="text-white">{viewingPdfDoc.owner}</strong>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-800 pb-1">
                    1. Purpose & Scope
                  </h4>
                  <p className="mt-1 text-slate-300">{viewingPdfDoc.description || 'This controlled document defines the mandatory operating criteria and governance requirements.'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-800 pb-1">
                    2. Department & Governance
                  </h4>
                  <p className="mt-1 text-slate-300">
                    Governed by the {viewingPdfDoc.department} department in accordance with ISO 9001:2015 Clause 7.5.3 (Control of documented information).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-800 pb-1">
                    3. Source File Traceability
                  </h4>
                  <p className="mt-1 text-slate-300">
                    Master editable file is securely retained in the Tier 2 Source File Vault. This PDF represents the immutable, authorized manufacturing release.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 gap-2">
                <span>CONTROLLED COPY • DO NOT DUPLICATE WITHOUT AUTHORIZATION</span>
                <span>ISO 9001:2015 / IATF 16949 COMPLIANT</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">Status: Released & Controlled</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingPdfDoc(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => alert(`Downloading controlled PDF: ${viewingPdfDoc.doc_number}_CONTROLLED.pdf`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" /> Download Controlled PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Promote Working Document to Controlled Document */}
      {promotingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Promote to Controlled Document (PDF Release)
              </h3>
              <button onClick={() => setPromotingDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteWorkingDoc} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-mono text-xs font-bold text-purple-400 block">{promotingDoc.doc_number}</span>
                <h4 className="font-bold text-white text-xs">{promotingDoc.title}</h4>
                <div className="text-[11px] text-slate-400 pt-1">
                  Target Revision: <strong className="text-emerald-400">{promotingDoc.target_revision}</strong> | Author: {promotingDoc.author}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Approving Authority (QA Executive)</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Approval Sign-Off Notes</label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                <strong className="text-emerald-400 block">Automated Document Lifecycle Actions:</strong>
                <div>✓ Generates & publishes approved PDF into Tier 1 Controlled Documents register.</div>
                <div>✓ Archives native source file (`{promotingDoc.source_file_name}`) into Tier 2 Source Vault.</div>
                <div>✓ Removes active draft from Tier 3 Working Documents.</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromotingDoc(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Authorize & Release Controlled PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Working Document Draft */}
      {isAddWorkingDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Start Working Document Draft
              </h3>
              <button onClick={() => setIsAddWorkingDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkingDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Document #</label>
                  <input
                    type="text"
                    value={newWorkingDoc.doc_number}
                    onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, doc_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Target Revision</label>
                  <input
                    type="text"
                    value={newWorkingDoc.target_revision}
                    onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, target_revision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. CMM Optical Comparator Calibration Protocol"
                  value={newWorkingDoc.title}
                  onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Category</label>
                  <select
                    value={newWorkingDoc.category}
                    onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, category: e.target.value as DocumentCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Author / Owner</label>
                  <input
                    type="text"
                    value={newWorkingDoc.author}
                    onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, author: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Initial Change Summary / Objectives</label>
                <textarea
                  rows={2}
                  value={newWorkingDoc.change_summary || ''}
                  onChange={(e) => setNewWorkingDoc({ ...newWorkingDoc, change_summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddWorkingDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/20"
                >
                  Create Working Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Controlled PDF Creation */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Register Approved Controlled PDF
              </h3>
              <button onClick={() => setIsAddDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const formData = new FormData(formEl);
              await onAddDocument({
                doc_number: formData.get('doc_number') as string,
                title: formData.get('title') as string,
                category: formData.get('category') as DocumentCategory,
                department: formData.get('department') as string,
                current_revision: formData.get('current_revision') as string,
                status: 'APPROVED',
                owner: formData.get('owner') as string,
                effective_date: formData.get('effective_date') as string,
                next_review_date: formData.get('next_review_date') as string,
                description: formData.get('description') as string,
                pdf_file_name: `${formData.get('doc_number')}_CONTROLLED.pdf`,
              });
              setIsAddDocModalOpen(false);
            }} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Doc Number</label>
                  <input
                    name="doc_number"
                    type="text"
                    defaultValue="SOP-QA-0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Revision</label>
                  <input
                    name="current_revision"
                    type="text"
                    defaultValue="Rev A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Document Title</label>
                <input
                  name="title"
                  type="text"
                  placeholder="e.g. Optical Comparator Measurement Protocol"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Category</label>
                  <select name="category" defaultValue="SOP" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department</label>
                  <select name="department" defaultValue="Quality Assurance" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {DEPARTMENTS.filter(d => d !== 'All Departments').map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Approving Owner</label>
                  <input
                    name="owner"
                    type="text"
                    defaultValue="Sarah Jenkins (QA VP)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Effective Date</label>
                  <input
                    name="effective_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <input type="hidden" name="next_review_date" value={new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10)} />

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Scope / Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Outline purpose and compliance scope..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-semibold shadow-lg shadow-blue-500/20"
                >
                  Release to Controlled Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
