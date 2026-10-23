import React, { useState, useEffect } from 'react';
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
  Eye,
  Upload,
  UploadCloud,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import type { 
  ControlledDocument, 
  DocumentCategory, 
  DocumentStatus,
  SourceVaultItem,
  WorkingDocument
} from '../../types/qms';
import { downloadControlledDocumentPdf } from '../../services/controlledPdfGenerator';
import { parseUploadedDocument } from '../../services/docParser';

interface Props {
  documents: ControlledDocument[];
  onAddDocument: (doc: Partial<ControlledDocument>) => Promise<void>;
  onAddRevision: (docId: string, revision: string, summary: string, author: string, approver?: string) => Promise<void>;
  onUpdateStatus: (docId: string, status: DocumentStatus) => Promise<void>;
  onDeleteDocument?: (docId: string) => Promise<void>;
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

const VAULT_STORAGE_KEY = 'qc_vault_items';
const WORKING_DOCS_STORAGE_KEY = 'qc_working_docs';

// Initial empty state for native vault files and working drafts
const INITIAL_VAULT_ITEMS: SourceVaultItem[] = [];
const INITIAL_WORKING_DOCS: WorkingDocument[] = [];

function loadStoredVaultItems(): SourceVaultItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load vault items from localStorage:', e);
  }
  return INITIAL_VAULT_ITEMS;
}

function loadStoredWorkingDocs(): WorkingDocument[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(WORKING_DOCS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load working docs from localStorage:', e);
  }
  return INITIAL_WORKING_DOCS;
}

export const QmsDocumentControl: React.FC<Props> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
}) => {
  // Consensus-aligned 3-tier view selector
  const [activeTier, setActiveTier] = useState<'CONTROLLED_PDFS' | 'SOURCE_VAULT' | 'WORKING_DOCS'>('CONTROLLED_PDFS');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);

  // Modals
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

  // PDF Viewer Modal
  const [viewingPdfDoc, setViewingPdfDoc] = useState<ControlledDocument | null>(null);

  // Promote Working Document Modal
  const [promotingDoc, setPromotingDoc] = useState<WorkingDocument | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Tier 2 & 3 local states with localStorage persistence
  const [vaultItems, setVaultItems] = useState<SourceVaultItem[]>(loadStoredVaultItems);
  const [workingDocs, setWorkingDocs] = useState<WorkingDocument[]>(loadStoredWorkingDocs);
  const [isAddWorkingDocModalOpen, setIsAddWorkingDocModalOpen] = useState(false);
  const [newWorkingDoc, setNewWorkingDoc] = useState<Partial<WorkingDocument>>({
    doc_number: '',
    title: '',
    target_revision: 'Rev A',
    category: 'SOP',
    department: 'Quality Assurance',
    author: '',
    source_file_name: '',
    change_summary: '',
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaultItems));
      }
    } catch {
      // ignore
    }
  }, [vaultItems]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(WORKING_DOCS_STORAGE_KEY, JSON.stringify(workingDocs));
      }
    } catch {
      // ignore
    }
  }, [workingDocs]);

  // Parsing states
  const [isParsingDraft, setIsParsingDraft] = useState(false);
  const [isParsingVault, setIsParsingVault] = useState(false);
  const [isParsingTier1, setIsParsingTier1] = useState(false);
  const [showDraftSectionPreview, setShowDraftSectionPreview] = useState(false);
  const [showVaultSectionPreview, setShowVaultSectionPreview] = useState(false);

  // Optional file upload state for Tier 1 direct registration
  const [tier1File, setTier1File] = useState<File | null>(null);
  const [tier1ExtractedText, setTier1ExtractedText] = useState<string | null>(null);
  const [tier1ExtractedSections, setTier1ExtractedSections] = useState<Array<{ num?: string; title: string; content: string }> | null>(null);

  // File upload state for Tier 3 Working Drafts
  const [selectedDraftFile, setSelectedDraftFile] = useState<File | null>(null);
  const [draftFileDataUrl, setDraftFileDataUrl] = useState<string | null>(null);

  // File upload state for Tier 2 Source Vault Deposit
  const [isAddVaultItemModalOpen, setIsAddVaultItemModalOpen] = useState(false);
  const [selectedVaultFile, setSelectedVaultFile] = useState<File | null>(null);
  const [vaultFileDataUrl, setVaultFileDataUrl] = useState<string | null>(null);
  const [newVaultItem, setNewVaultItem] = useState<{
    doc_number: string;
    title: string;
    revision: string;
    department: string;
    notes: string;
    extracted_text?: string | null;
    extracted_sections?: Array<{ num?: string; title: string; content: string }> | null;
  }>({
    doc_number: '',
    title: '',
    revision: 'Rev A',
    department: 'Quality Assurance',
    notes: '',
    extracted_text: null,
    extracted_sections: null,
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

  // Deletion handlers
  const handleDeleteControlledDoc = async (doc: ControlledDocument) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete document "${doc.doc_number}" (${doc.title})?\n\nThis will remove the document and all associated revisions from the master register.`
    );
    if (!confirmed) return;

    try {
      setIsDeletingDocId(doc.id);
      if (onDeleteDocument) {
        await onDeleteDocument(doc.id);
      }
    } catch (err: any) {
      alert(`Failed to delete document: ${err?.message || err}`);
    } finally {
      setIsDeletingDocId(null);
    }
  };

  const handleDeleteVaultItem = (item: SourceVaultItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${item.file_name}" (${item.doc_number}) from the Tier 2 Source File Vault?`
    );
    if (!confirmed) return;

    setVaultItems((prev) => prev.filter((v) => v.id !== item.id));
  };

  const handleDeleteWorkingDoc = (doc: WorkingDocument) => {
    const confirmed = window.confirm(
      `Are you sure you want to discard draft "${doc.doc_number}" (${doc.title}) from Tier 3 Working Documents?`
    );
    if (!confirmed) return;

    setWorkingDocs((prev) => prev.filter((w) => w.id !== doc.id));
  };

  // Promotion handler (Tier 3 Working Doc -> Tier 1 Controlled PDF + Tier 2 Vault)
  const handlePromoteWorkingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingDoc) return;

    const finalApprover = approverName.trim() || 'VP Quality Assurance';
    const finalNotes = approvalNotes.trim() || 'Official release and controlled watermark compilation.';

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
      extracted_text: promotingDoc.extracted_text,
      extracted_sections: promotingDoc.extracted_sections,
      pdf_file_name: `${promotingDoc.doc_number}_${promotingDoc.target_revision.replace(/\s+/g, '')}_CONTROLLED.pdf`,
      approved_by: finalApprover,
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
      file_size_bytes: promotingDoc.source_file_size_bytes || 2150000,
      file_data_url: promotingDoc.file_data_url || null,
      extracted_text: promotingDoc.extracted_text || null,
      extracted_sections: promotingDoc.extracted_sections || null,
      uploaded_by: promotingDoc.author,
      uploaded_at: new Date().toISOString().slice(0, 10),
      is_checked_out: false,
      notes: `Archived during promotion to Controlled PDF by ${finalApprover}.`,
    };
    setVaultItems((prev) => [vaultEntry, ...prev]);

    // 3. Immediately trigger automatic download of the compiled Controlled PDF!
    downloadControlledDocumentPdf(
      {
        ...promotingDoc,
        status: 'APPROVED',
        approved_by: finalApprover,
        approved_at: new Date().toISOString().slice(0, 10),
      },
      finalApprover,
      finalNotes
    );

    // 4. Remove from Working Documents
    setWorkingDocs((prev) => prev.filter((w) => w.id !== promotingDoc.id));
    setPromotingDoc(null);
  };

  // Direct promotion from Tier 2 Source File Vault -> Tier 1 Controlled PDF
  const handlePromoteFromVault = (vaultItem: SourceVaultItem) => {
    const existingDoc = documents.find((d) => d.doc_number === vaultItem.doc_number);
    const doc: WorkingDocument = {
      id: `work-vault-${vaultItem.id}`,
      doc_number: vaultItem.doc_number,
      title: vaultItem.title,
      target_revision: vaultItem.revision || 'Rev A',
      category: existingDoc?.category || 'SOP',
      department: existingDoc?.department || 'Quality Assurance',
      author: vaultItem.uploaded_by || existingDoc?.owner || 'Quality Engineering',
      stage: 'PENDING_APPROVAL',
      source_file_name: vaultItem.file_name,
      source_file_type: vaultItem.file_type,
      source_vault_ref: vaultItem.id,
      file_data_url: vaultItem.file_data_url,
      extracted_text: vaultItem.extracted_text,
      extracted_sections: vaultItem.extracted_sections,
      change_summary: vaultItem.notes || `Promoting checked-in master source file (${vaultItem.file_name}) to released Controlled PDF.`,
      created_at: vaultItem.uploaded_at || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    };
    setApproverName(existingDoc?.owner || 'VP Quality Assurance');
    setApprovalNotes(`Official release and watermark compilation from source vault item ${vaultItem.file_name}.`);
    setPromotingDoc(doc);
  };

  // Check out source file from vault
  const handleToggleVaultCheckout = (vaultId: string) => {
    setVaultItems((prev) =>
      prev.map((v) => {
        if (v.id === vaultId) {
          const nextState = !v.is_checked_out;
          return {
            ...v,
            is_checked_out: nextState,
            checked_out_by: nextState ? 'Current User (Author)' : null,
          };
        }
        return v;
      })
    );
  };

  // Handle draft file selection in Start Working Draft modal
  const handleDraftFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedDraftFile(file);
    setIsParsingDraft(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'docx';

    // Auto-detect doc number pattern if present in filename (e.g. SOP-QA-001)
    const docMatch = file.name.match(/([A-Z]{2,5}-[A-Z0-9]+-\d+)/i);
    const detectedDocNo = docMatch ? docMatch[1].toUpperCase() : '';

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .trim();

    let parsedText = '';
    let parsedSections: Array<{ num?: string; title: string; content: string }> = [];

    try {
      const parsed = await parseUploadedDocument(file);
      parsedText = parsed.rawText;
      parsedSections = parsed.sections;
    } catch (err) {
      console.warn('Failed to parse uploaded document:', err);
    } finally {
      setIsParsingDraft(false);
    }

    setNewWorkingDoc((prev) => ({
      ...prev,
      source_file_name: file.name,
      source_file_type: ext,
      source_file_size_bytes: file.size,
      doc_number: prev.doc_number || detectedDocNo,
      title: prev.title || cleanTitle,
      extracted_text: parsedText || prev.extracted_text,
      extracted_sections: parsedSections.length > 0 ? parsedSections : prev.extracted_sections,
      change_summary: prev.change_summary || (parsedSections.length > 0 ? `Uploaded source file: ${file.name}. Parsed ${parsedSections.length} section(s).` : ''),
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setDraftFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      source_file_name: newWorkingDoc.source_file_name || (selectedDraftFile ? selectedDraftFile.name : `${newWorkingDoc.doc_number}_Draft.docx`),
      source_file_type: newWorkingDoc.source_file_type || 'docx',
      source_file_size_bytes: selectedDraftFile?.size || 154000,
      file_data_url: draftFileDataUrl,
      extracted_text: newWorkingDoc.extracted_text || null,
      extracted_sections: newWorkingDoc.extracted_sections || null,
      change_summary: newWorkingDoc.change_summary || '',
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    };
    setWorkingDocs((prev) => [doc, ...prev]);
    setIsAddWorkingDocModalOpen(false);
    setSelectedDraftFile(null);
    setDraftFileDataUrl(null);
    setShowDraftSectionPreview(false);
    setNewWorkingDoc({
      doc_number: '',
      title: '',
      target_revision: 'Rev A',
      category: 'SOP',
      department: 'Quality Assurance',
      author: '',
      source_file_name: '',
      change_summary: '',
      extracted_text: null,
      extracted_sections: null,
    });
  };

  // Upload or replace draft file on an existing Tier 3 draft row
  const handleUploadToExistingDraft = async (draftId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'docx';

    let parsedText = '';
    let parsedSections: Array<{ num?: string; title: string; content: string }> = [];
    try {
      const parsed = await parseUploadedDocument(file);
      parsedText = parsed.rawText;
      parsedSections = parsed.sections;
    } catch (err) {
      console.warn('Failed to parse uploaded document:', err);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setWorkingDocs((prev) =>
        prev.map((d) =>
          d.id === draftId
            ? {
                ...d,
                source_file_name: file.name,
                source_file_type: ext,
                source_file_size_bytes: file.size,
                file_data_url: dataUrl,
                extracted_text: parsedText || d.extracted_text,
                extracted_sections: parsedSections.length > 0 ? parsedSections : d.extracted_sections,
                updated_at: new Date().toISOString().slice(0, 10),
              }
            : d
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // Download draft file
  const handleDownloadWorkingDraft = (doc: WorkingDocument) => {
    if (doc.file_data_url) {
      const link = document.createElement('a');
      link.href = doc.file_data_url;
      link.download = doc.source_file_name || `${doc.doc_number}_${doc.target_revision}.docx`;
      link.click();
    } else {
      const blob = new Blob(
        [
          `Quality Compass Working Draft\nDocument No: ${doc.doc_number}\nTitle: ${doc.title}\nTarget Revision: ${doc.target_revision}\nCategory: ${doc.category}\nAuthor: ${doc.author}\nDate: ${doc.created_at}`,
        ],
        { type: 'application/octet-stream' }
      );
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.source_file_name || `${doc.doc_number}_${doc.target_revision}.docx`;
      link.click();
    }
  };

  // Handler for Tier 2 Vault deposit file change
  const handleVaultFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVaultFile(file);
    setIsParsingVault(true);
    const docMatch = file.name.match(/([A-Z]{2,5}-[A-Z0-9]+-\d+)/i);
    const detectedDocNo = docMatch ? docMatch[1].toUpperCase() : '';
    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .trim();

    let parsedText = '';
    let parsedSections: Array<{ num?: string; title: string; content: string }> = [];
    try {
      const parsed = await parseUploadedDocument(file);
      parsedText = parsed.rawText;
      parsedSections = parsed.sections;
    } catch (err) {
      console.warn('Failed to parse uploaded document:', err);
    } finally {
      setIsParsingVault(false);
    }

    setNewVaultItem((prev) => ({
      ...prev,
      doc_number: prev.doc_number || detectedDocNo,
      title: prev.title || cleanTitle,
      extracted_text: parsedText,
      extracted_sections: parsedSections,
      notes: prev.notes || (parsedSections.length > 0 ? `Deposited master source file (${file.name}) with ${parsedSections.length} parsed section(s).` : ''),
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setVaultFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handler for Tier 1 direct Controlled PDF upload
  const handleTier1FileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTier1File(file);
    setIsParsingTier1(true);
    try {
      const parsed = await parseUploadedDocument(file);
      setTier1ExtractedText(parsed.rawText);
      setTier1ExtractedSections(parsed.sections);
    } catch (err) {
      console.warn('Failed to parse Tier 1 document:', err);
    } finally {
      setIsParsingTier1(false);
    }
  };

  // Create native source vault deposit
  const handleCreateVaultItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaultFile && !newVaultItem.title) return;

    const fileName = selectedVaultFile ? selectedVaultFile.name : `${newVaultItem.doc_number || 'DOC-001'}_Master.docx`;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'docx';

    const item: SourceVaultItem = {
      id: `vault-${Date.now()}`,
      document_id: `doc-${Date.now()}`,
      doc_number: newVaultItem.doc_number || 'SOP-000',
      title: newVaultItem.title || fileName,
      revision: newVaultItem.revision || 'Rev A',
      file_name: fileName,
      file_type: ext,
      file_size_bytes: selectedVaultFile ? selectedVaultFile.size : 245000,
      file_data_url: vaultFileDataUrl,
      extracted_text: newVaultItem.extracted_text || null,
      extracted_sections: newVaultItem.extracted_sections || null,
      uploaded_by: 'Quality Engineering',
      uploaded_at: new Date().toISOString().slice(0, 10),
      is_checked_out: false,
      notes: newVaultItem.notes || `Master editable native source file (${ext.toUpperCase()}) deposited into Tier-2 Vault.`,
    };

    setVaultItems((prev) => [item, ...prev]);
    setIsAddVaultItemModalOpen(false);
    setSelectedVaultFile(null);
    setVaultFileDataUrl(null);
    setNewVaultItem({
      doc_number: '',
      title: '',
      revision: 'Rev A',
      department: 'Quality Assurance',
      notes: '',
      extracted_text: null,
      extracted_sections: null,
    });
  };

  // Download native master vault file
  const handleDownloadVaultItem = (item: SourceVaultItem) => {
    if (item.file_data_url) {
      const link = document.createElement('a');
      link.href = item.file_data_url;
      link.download = item.file_name;
      link.click();
    } else {
      const blob = new Blob(
        [
          `NHI Mechanical Motion Master Source File\nDocument: ${item.doc_number} Rev ${item.revision}\nTitle: ${item.title}\nUploaded: ${item.uploaded_at} by ${item.uploaded_by}`,
        ],
        { type: 'application/octet-stream' }
      );
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = item.file_name;
      link.click();
    }
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Start Working Draft
            </button>
          ) : activeTier === 'SOURCE_VAULT' ? (
            <button
              onClick={() => setIsAddVaultItemModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Deposit Native Master
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

                              <button
                                onClick={() => downloadControlledDocumentPdf(doc)}
                                title="Download Official ISO 9001 Controlled PDF"
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                              >
                                <Download className="w-3 h-3 text-emerald-400" /> PDF
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

                              {onDeleteDocument && (
                                <button
                                  onClick={() => handleDeleteControlledDoc(doc)}
                                  disabled={isDeletingDocId === doc.id}
                                  title="Permanently remove document from register"
                                  className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded border border-rose-500/30 transition-colors disabled:opacity-50"
                                >
                                  {isDeletingDocId === doc.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  )}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Source File Vault (Native Masters Repository)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted repository for editable Word (.docx), Excel (.xlsx), and CAD (.dwg) source files used to generate controlled PDFs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hidden md:inline-block">
                Access Restricted • Author Check-in / Check-out
              </span>
              <button
                onClick={() => setIsAddVaultItemModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow shadow-amber-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Deposit Native Master
              </button>
            </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {getFileTypeIcon(item.file_type)}
                        <span className="font-mono text-slate-200 font-semibold">{item.file_name}</span>
                        {item.extracted_sections && item.extracted_sections.length > 0 && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            ✓ {item.extracted_sections.length} Secs
                          </span>
                        )}
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
                          onClick={() => handlePromoteFromVault(item)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                          title="Convert and promote this source file into an approved Tier-1 Controlled PDF"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Promote to Controlled PDF</span>
                        </button>

                        <button
                          onClick={() => handleToggleVaultCheckout(item.id)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                            item.is_checked_out
                              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {item.is_checked_out ? 'Check-in Source' : 'Check-out Source'}
                        </button>

                        <button
                          onClick={() => handleDownloadVaultItem(item)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                          title={`Download native master ${item.file_type.toUpperCase()} file`}
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Download Master</span>
                        </button>

                        <button
                          onClick={() => downloadControlledDocumentPdf({
                            id: item.document_id,
                            doc_number: item.doc_number,
                            title: item.title,
                            category: 'SOP',
                            department: 'Quality Assurance',
                            current_revision: item.revision,
                            status: 'APPROVED',
                            owner: item.uploaded_by,
                            effective_date: item.uploaded_at,
                            next_review_date: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
                            description: item.notes,
                            extracted_text: item.extracted_text,
                            extracted_sections: item.extracted_sections,
                          })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1"
                          title="Generate and Download Official Controlled PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400" /> Export PDF
                        </button>

                        <button
                          onClick={() => handleDeleteVaultItem(item)}
                          title="Remove file from Source Vault"
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded border border-rose-500/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                        <div className="flex items-center gap-1.5 mt-1">
                          {getFileTypeIcon(w.source_file_type || 'docx')}
                          <span className="text-[11px] text-slate-300 font-mono truncate">{w.source_file_name || `${w.doc_number}.docx`}</span>
                          {w.source_file_size_bytes ? (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({(w.source_file_size_bytes / 1024).toFixed(0)} KB)
                            </span>
                          ) : null}
                        </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadWorkingDraft(w)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                            title="Download draft document (.docx / .xlsx)"
                          >
                            <Download className="w-3.5 h-3.5 text-purple-400" />
                            <span>Download Draft</span>
                          </button>

                          <label
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Attach or replace draft file (.docx, .xlsx, .dwg)"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-400" />
                            <span>Attach File</span>
                            <input
                              type="file"
                              accept=".docx,.doc,.xlsx,.xls,.dwg,.dxf,.pptx,.pdf"
                              onChange={(e) => handleUploadToExistingDraft(w.id, e)}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={() => setPromotingDoc(w)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                            title="Promote draft to official Tier 1 Controlled PDF"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Promote to PDF</span>
                          </button>

                          <button
                            onClick={() => handleDeleteWorkingDoc(w)}
                            title="Discard draft working document"
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded border border-rose-500/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                {viewingPdfDoc.extracted_sections && viewingPdfDoc.extracted_sections.length > 0 ? (
                  viewingPdfDoc.extracted_sections.map((sec, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-800 pb-1">
                        {sec.num ? `${sec.num} ${sec.title}` : sec.title}
                      </h4>
                      <div className="text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {sec.content}
                      </div>
                    </div>
                  ))
                ) : viewingPdfDoc.extracted_text ? (
                  <div className="text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                    {viewingPdfDoc.extracted_text}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 gap-2">
                <span>CONTROLLED COPY • DO NOT DUPLICATE WITHOUT AUTHORIZATION</span>
                <span>ISO 9001:2015 / IATF 16949 COMPLIANT</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">Status: Released & Controlled</span>
                {onDeleteDocument && (
                  <button
                    onClick={async () => {
                      const docToDelete = viewingPdfDoc;
                      setViewingPdfDoc(null);
                      await handleDeleteControlledDoc(docToDelete);
                    }}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Document
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingPdfDoc(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadControlledDocumentPdf(viewingPdfDoc)}
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

              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {promotingDoc.extracted_sections && promotingDoc.extracted_sections.length > 0
                      ? `${promotingDoc.extracted_sections.length} structured sections ready to compile into PDF`
                      : promotingDoc.extracted_text
                      ? 'Extracted text content ready to compile into PDF'
                      : 'Standard ISO 9001 template sections will be compiled'}
                  </span>
                </div>
                {promotingDoc.extracted_sections && (
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {promotingDoc.extracted_sections.length} sections
                  </span>
                )}
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

              <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (promotingDoc) {
                      downloadControlledDocumentPdf(promotingDoc, approverName || 'Authorized Signer', approvalNotes);
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Preview the compiled ISO 9001 controlled PDF with watermarks and approval stamps"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Preview PDF</span>
                </button>
                <div className="flex gap-2">
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
              {/* Draft File Upload Area */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Draft Source File (.docx, .xlsx, .dwg, .pptx)
                </label>
                {!selectedDraftFile ? (
                  <label className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 bg-slate-950/60 hover:bg-purple-950/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                    <input
                      type="file"
                      accept=".docx,.doc,.xlsx,.xls,.dwg,.dxf,.pptx,.pdf"
                      onChange={handleDraftFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-semibold text-slate-200">
                      Upload Word (.docx), Excel (.xlsx), or CAD draft
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 text-center">
                      Auto-detects document number, title, and file extension
                    </span>
                  </label>
                ) : (
                  <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        {getFileTypeIcon(selectedDraftFile.name.split('.').pop() || '')}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{selectedDraftFile.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {(selectedDraftFile.size / 1024).toFixed(1)} KB • {selectedDraftFile.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDraftFile(null);
                        setDraftFileDataUrl(null);
                        setShowDraftSectionPreview(false);
                      }}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded"
                      title="Remove selected file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isParsingDraft && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-purple-300 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                    <span>Parsing Word / Excel document and extracting structured sections...</span>
                  </div>
                )}

                {newWorkingDoc.extracted_sections && newWorkingDoc.extracted_sections.length > 0 && !isParsingDraft && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>✓ Extracted {newWorkingDoc.extracted_sections.length} structured section(s)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDraftSectionPreview(!showDraftSectionPreview)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-mono"
                      >
                        {showDraftSectionPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showDraftSectionPreview ? 'Hide' : 'Preview'}
                      </button>
                    </div>

                    {showDraftSectionPreview && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                        {newWorkingDoc.extracted_sections.map((sec, idx) => (
                          <div key={idx} className="border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
                            <strong className="text-white block font-semibold">{sec.num ? `${sec.num} ` : ''}{sec.title}</strong>
                            <p className="text-slate-400 line-clamp-2">{sec.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  disabled={isParsingDraft}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isParsingDraft ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing File...</span>
                    </>
                  ) : (
                    <span>Create Working Draft</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deposit Native Master into Tier 2 Source File Vault */}
      {isAddVaultItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                Deposit Native Master into Source Vault
              </h3>
              <button onClick={() => setIsAddVaultItemModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVaultItem} className="space-y-4 text-xs">
              {/* Native File Upload Area */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Native Master File (.docx, .xlsx, .dwg)
                </label>
                {!selectedVaultFile ? (
                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-amber-950/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                    <input
                      type="file"
                      accept=".docx,.doc,.xlsx,.xls,.dwg,.dxf,.pptx,.pdf"
                      onChange={handleVaultFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-semibold text-slate-200">
                      Upload Master Word (.docx), Excel (.xlsx), or CAD (.dwg)
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 text-center">
                      Auto-detects document number, title, and file extension
                    </span>
                  </label>
                ) : (
                  <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        {getFileTypeIcon(selectedVaultFile.name.split('.').pop() || '')}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{selectedVaultFile.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {(selectedVaultFile.size / 1024).toFixed(1)} KB • {selectedVaultFile.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVaultFile(null);
                        setVaultFileDataUrl(null);
                        setShowVaultSectionPreview(false);
                      }}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded"
                      title="Remove selected file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isParsingVault && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>Parsing Master Word / Excel document and extracting structured sections...</span>
                  </div>
                )}

                {newVaultItem.extracted_sections && newVaultItem.extracted_sections.length > 0 && !isParsingVault && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>✓ Extracted {newVaultItem.extracted_sections.length} structured section(s)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVaultSectionPreview(!showVaultSectionPreview)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-mono"
                      >
                        {showVaultSectionPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showVaultSectionPreview ? 'Hide' : 'Preview'}
                      </button>
                    </div>

                    {showVaultSectionPreview && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                        {newVaultItem.extracted_sections.map((sec, idx) => (
                          <div key={idx} className="border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
                            <strong className="text-white block font-semibold">{sec.num ? `${sec.num} ` : ''}{sec.title}</strong>
                            <p className="text-slate-400 line-clamp-2">{sec.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Document #</label>
                  <input
                    type="text"
                    placeholder="SOP-QA-001"
                    value={newVaultItem.doc_number}
                    onChange={(e) => setNewVaultItem({ ...newVaultItem, doc_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Revision</label>
                  <input
                    type="text"
                    value={newVaultItem.revision}
                    onChange={(e) => setNewVaultItem({ ...newVaultItem, revision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  placeholder="Master Procedure or Specification Title"
                  value={newVaultItem.title}
                  onChange={(e) => setNewVaultItem({ ...newVaultItem, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Vault Notes / Check-in Comments</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Master source file with baseline validation and formulas..."
                  value={newVaultItem.notes}
                  onChange={(e) => setNewVaultItem({ ...newVaultItem, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddVaultItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isParsingVault}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isParsingVault ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing File...</span>
                    </>
                  ) : (
                    <span>Deposit to Vault</span>
                  )}
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
              const docNum = formData.get('doc_number') as string;
              const docTitle = formData.get('title') as string;
              const docRev = (formData.get('current_revision') as string) || 'Rev A';
              const docOwner = formData.get('owner') as string;
              const docDesc = formData.get('description') as string;
              const category = formData.get('category') as DocumentCategory;
              const department = formData.get('department') as string;
              const effectiveDate = formData.get('effective_date') as string;
              const nextReviewDate = formData.get('next_review_date') as string;

              await onAddDocument({
                doc_number: docNum,
                title: docTitle,
                category,
                department,
                current_revision: docRev,
                status: 'APPROVED',
                owner: docOwner,
                effective_date: effectiveDate,
                next_review_date: nextReviewDate,
                description: docDesc,
                extracted_text: tier1ExtractedText,
                extracted_sections: tier1ExtractedSections,
                pdf_file_name: `${docNum}_${docRev.replace(/\s+/g, '')}_CONTROLLED.pdf`,
              });

              // Automatically trigger official Controlled PDF download
              downloadControlledDocumentPdf(
                {
                  id: `doc-${Date.now()}`,
                  doc_number: docNum,
                  title: docTitle,
                  category,
                  department,
                  current_revision: docRev,
                  status: 'APPROVED',
                  owner: docOwner,
                  effective_date: effectiveDate,
                  next_review_date: nextReviewDate,
                  description: docDesc,
                  extracted_text: tier1ExtractedText,
                  extracted_sections: tier1ExtractedSections,
                },
                docOwner,
                docDesc || 'Initial release under ISO 9001:2015 Tier-1 Document Control'
              );

              setIsAddDocModalOpen(false);
              setTier1File(null);
              setTier1ExtractedText(null);
              setTier1ExtractedSections(null);
            }} className="space-y-4 text-xs">
              {/* Optional Word / Excel Document Upload */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Attach Source Document (.docx, .xlsx, .txt) <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                {!tier1File ? (
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-950/60 hover:bg-blue-950/10 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                    <input
                      type="file"
                      accept=".docx,.doc,.xlsx,.xls,.dwg,.dxf,.pptx,.pdf,.txt,.md"
                      onChange={handleTier1FileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform mb-1.5" />
                    <span className="text-xs font-semibold text-slate-200">
                      Upload Word (.docx) or Excel (.xlsx) to embed into PDF
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 text-center">
                      Auto-extracts headings and paragraphs for multi-page controlled release
                    </span>
                  </label>
                ) : (
                  <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        {getFileTypeIcon(tier1File.name.split('.').pop() || '')}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{tier1File.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(tier1File.size / 1024).toFixed(1)} KB • {tier1ExtractedSections?.length || 0} sections parsed
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTier1File(null);
                        setTier1ExtractedText(null);
                        setTier1ExtractedSections(null);
                      }}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isParsingTier1 && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Extracting sections and paragraphs from document...</span>
                  </div>
                )}
                {tier1ExtractedSections && tier1ExtractedSections.length > 0 && !isParsingTier1 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Parsed {tier1ExtractedSections.length} sections ready to compile into PDF</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Doc Number</label>
                  <input
                    name="doc_number"
                    type="text"
                    defaultValue="SOP-QA-001"
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
                  disabled={isParsingTier1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isParsingTier1 ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing Document...</span>
                    </>
                  ) : (
                    <span>Release & Download Controlled PDF</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
