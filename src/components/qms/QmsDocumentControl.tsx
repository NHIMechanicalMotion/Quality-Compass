import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  History, 
  CheckCircle2, 
  Clock, 
  X,
  FolderOpen
} from 'lucide-react';
import type { 
  ControlledDocument, 
  DocumentCategory, 
  DocumentStatus 
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

export const QmsDocumentControl: React.FC<Props> = ({
  documents,
  onAddDocument,
  onAddRevision,
  onUpdateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');

  // Modals
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [selectedDocForRevisions, setSelectedDocForRevisions] = useState<ControlledDocument | null>(null);

  // New Document Form
  const [newDoc, setNewDoc] = useState<Partial<ControlledDocument>>(() => ({
    doc_number: 'SOP-QA-0',
    title: '',
    category: 'SOP',
    department: 'Quality Assurance',
    current_revision: 'Rev A',
    status: 'APPROVED',
    owner: '',
    effective_date: new Date().toISOString().slice(0, 10),
    next_review_date: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
    description: '',
  }));

  // New Revision Form
  const [newRevisionCode, setNewRevisionCode] = useState('');
  const [newChangeSummary, setNewChangeSummary] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newApprover, setNewApprover] = useState('');

  // Filter logic
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

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.doc_number || !newDoc.title || !newDoc.owner) return;
    await onAddDocument(newDoc);
    setIsAddDocModalOpen(false);
    setNewDoc({
      doc_number: 'SOP-QA-0',
      title: '',
      category: 'SOP',
      department: 'Quality Assurance',
      current_revision: 'Rev A',
      status: 'APPROVED',
      owner: '',
      effective_date: new Date().toISOString().slice(0, 10),
      next_review_date: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
      description: '',
    });
  };

  const handleOpenRevisionModal = (doc: ControlledDocument) => {
    setSelectedDocForRevisions(doc);
    // Suggest next letter
    const currentLetter = doc.current_revision.replace(/Rev\s*/i, '').trim();
    const nextCharCode = currentLetter.charCodeAt(0) + 1;
    const nextLetter = isNaN(nextCharCode) ? 'B' : String.fromCharCode(nextCharCode);
    setNewRevisionCode(`Rev ${nextLetter}`);
    setNewChangeSummary('');
    setNewAuthor(doc.owner);
    setNewApprover('Sarah Jenkins (QA VP)');
    setIsRevisionModalOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForRevisions || !newRevisionCode || !newChangeSummary || !newAuthor) return;
    await onAddRevision(
      selectedDocForRevisions.id,
      newRevisionCode,
      newChangeSummary,
      newAuthor,
      newApprover || undefined
    );
    setIsRevisionModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            ISO 9001:2015 Clause 7.5 Document Control System (DCS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centrally governed repository of Quality Manuals, SOPs, Work Instructions, and Forms directly backed by Supabase Postgres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddDocModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Controlled Document
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Documents</div>
            <div className="text-lg font-bold text-white">{documents.length} Managed</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Approved / Active</div>
            <div className="text-lg font-bold text-emerald-400">
              {documents.filter(d => d.status === 'APPROVED').length} Docs
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Under Review</div>
            <div className="text-lg font-bold text-amber-400">
              {documents.filter(d => d.status === 'IN_REVIEW' || d.status === 'DRAFT').length} Docs
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Revisions</div>
            <div className="text-lg font-bold text-purple-300">
              {documents.reduce((acc, d) => acc + (d.revisions?.length || 1), 0)} Versions
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search document #, title, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Master Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Document #</th>
                <th className="p-3.5">Title & Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Dept</th>
                <th className="p-3.5">Rev</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Owner</th>
                <th className="p-3.5">Annual Review</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-blue-400">{doc.doc_number}</td>
                  <td className="p-3.5 max-w-sm">
                    <div className="font-bold text-white text-sm">{doc.title}</div>
                    {doc.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{doc.description}</p>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300">{doc.department}</td>
                  <td className="p-3.5 font-mono font-bold text-emerald-400">{doc.current_revision}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      doc.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : doc.status === 'IN_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300">{doc.owner}</td>
                  <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                    {doc.next_review_date}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenRevisionModal(doc)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="View revision log and bump revision"
                      >
                        <History className="w-3.5 h-3.5 text-purple-400" /> Revisions ({doc.revisions?.length || 1})
                      </button>

                      <select
                        value={doc.status}
                        onChange={(e) => onUpdateStatus(doc.id, e.target.value as DocumentStatus)}
                        className="bg-slate-950 text-[10px] text-slate-300 border border-slate-700 rounded px-1.5 py-1 focus:outline-none"
                      >
                        <option value="APPROVED">APPROVED</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="OBSOLETE">OBSOLETE</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Controlled Document */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Register New Controlled Document (Clause 7.5)
              </h3>
              <button onClick={() => setIsAddDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Document #</label>
                  <input
                    type="text"
                    placeholder="e.g. SOP-QA-015"
                    value={newDoc.doc_number}
                    onChange={(e) => setNewDoc({ ...newDoc, doc_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Current Revision</label>
                  <input
                    type="text"
                    value={newDoc.current_revision}
                    onChange={(e) => setNewDoc({ ...newDoc, current_revision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Optical Measurement & CMM Sampling Protocol"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Category</label>
                  <select
                    value={newDoc.category}
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as DocumentCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department</label>
                  <select
                    value={newDoc.department}
                    onChange={(e) => setNewDoc({ ...newDoc, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All Departments').map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Owner / Author</label>
                  <input
                    type="text"
                    placeholder="e.g. David Chen"
                    value={newDoc.owner}
                    onChange={(e) => setNewDoc({ ...newDoc, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Status</label>
                  <select
                    value={newDoc.status}
                    onChange={(e) => setNewDoc({ ...newDoc, status: e.target.value as DocumentStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="IN_REVIEW">IN REVIEW</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Description / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Outline purpose, application, and compliance requirements..."
                  value={newDoc.description || ''}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
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
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Revisions & Change Log */}
      {isRevisionModalOpen && selectedDocForRevisions && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Revision History: {selectedDocForRevisions.doc_number}
                </h3>
                <p className="text-xs text-slate-400">{selectedDocForRevisions.title}</p>
              </div>
              <button onClick={() => setIsRevisionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Revision Timeline */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {(selectedDocForRevisions.revisions && selectedDocForRevisions.revisions.length > 0) ? (
                selectedDocForRevisions.revisions.map((rev) => (
                  <div key={rev.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-400">{rev.revision}</span>
                      <span className="text-[11px] text-slate-500">{rev.created_at?.slice(0, 10)}</span>
                    </div>
                    <p className="text-slate-200">{rev.change_summary}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Author: {rev.created_by}</span>
                      <span>Approved by: {rev.approved_by || 'Pending Sign-off'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-500">
                  Initial baseline revision active.
                </div>
              )}
            </div>

            {/* Form to Bump Revision */}
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Release New Revision
              </h4>

              <form onSubmit={handleSubmitRevision} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">New Revision Code</label>
                    <input
                      type="text"
                      value={newRevisionCode}
                      onChange={(e) => setNewRevisionCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">Approver Sign-Off</label>
                    <input
                      type="text"
                      value={newApprover}
                      onChange={(e) => setNewApprover(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      placeholder="e.g. Sarah Jenkins (QA VP)"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Change Summary & Rationale</label>
                  <textarea
                    rows={2}
                    value={newChangeSummary}
                    onChange={(e) => setNewChangeSummary(e.target.value)}
                    placeholder="Describe what sections were changed, engineering ECO reference, or reason for revision..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/20"
                  >
                    Release Revision
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
