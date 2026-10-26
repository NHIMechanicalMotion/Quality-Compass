import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { 
  ControlledDocument, 
  DocumentCategory, 
  DocumentStatus,
  SourceVaultItem,
  WorkingDocument
} from '../../types/qms';
import { 
  uploadVaultFile, 
  uploadWorkingFile, 
  uploadControlledPdfFile, 
  downloadDocumentFile, 
  getPdfViewUrl,
  compileControlledMasterPdf,
  generateControlledPdfBlob,
  syncDocxRevisionAndExtractContent
} from '../../services/qmsStorageService';
import { useAuth } from '../../context/AuthContext';

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

const VAULT_STORAGE_KEY = 'qc_qms_source_vault_items_v2';
const WORKING_STORAGE_KEY = 'qc_qms_working_documents_v2';

interface StandardBaseline {
  id: string;
  doc_number: string;
  title: string;
  category: DocumentCategory;
  department: string;
  current_revision: string;
  source_file_name: string;
  has_vault_master: boolean;
  is_standard_baseline: boolean;
}

const STANDARD_BASELINES: StandardBaseline[] = [
  {
    id: 'base-qms-001',
    doc_number: 'SOP-QMS-001',
    title: 'ISO 9001:2015 Quality Policy & Defect Quarantine SOP',
    category: 'SOP',
    department: 'Quality Assurance',
    current_revision: 'Rev A',
    source_file_name: 'SOP-QMS-001_Quality_Policy_Master.docx',
    has_vault_master: false,
    is_standard_baseline: true,
  },
  {
    id: 'base-qua-010',
    doc_number: 'SOP-QUA-010',
    title: 'Five-Piece First Article Inspection & Blueprint Sign-Off',
    category: 'SOP',
    department: 'Quality Assurance',
    current_revision: 'Rev A',
    source_file_name: 'SOP-QUA-010_FAI_Signoff_Master.docx',
    has_vault_master: false,
    is_standard_baseline: true,
  },
  {
    id: 'base-mch-022',
    doc_number: 'WI-MCH-022',
    title: 'First-Piece Quality Metrology & Optical Comparator Protocol',
    category: 'Work Instruction',
    department: 'Manufacturing',
    current_revision: 'Rev A',
    source_file_name: 'WI-MCH-022_Optical_Comparator.xlsx',
    has_vault_master: false,
    is_standard_baseline: true,
  },
  {
    id: 'base-saf-001',
    doc_number: 'SOP-SAF-001',
    title: 'Lockout/Tagout (LOTO) & Electrical Zero Energy State Protocol',
    category: 'SOP',
    department: 'Manufacturing',
    current_revision: 'Rev A',
    source_file_name: 'SOP-SAF-001_LOTO_Procedure.docx',
    has_vault_master: false,
    is_standard_baseline: true,
  },
  {
    id: 'base-form-fai',
    doc_number: 'FORM-APQP-004',
    title: 'AIAG 4th Edition First Article Inspection Balloon Report',
    category: 'Form/Template',
    department: 'Engineering',
    current_revision: 'Rev 01',
    source_file_name: 'FORM-APQP-004_FAI_Report.xlsx',
    has_vault_master: false,
    is_standard_baseline: true,
  },
];

function loadStoredVault(): SourceVaultItem[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStoredWorking(): WorkingDocument[] {
  try {
    const raw = localStorage.getItem(WORKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const QmsDocumentControl: React.FC<Props> = ({
  documents,
  onAddDocument,
}) => {
  // Safe authentication resolution (non-blocking fallback for pre-login)
  let currentAuthorName = 'Sarah Jenkins (QA)';
  try {
    const auth = useAuth();
    if (auth?.currentUser?.person) {
      currentAuthorName = `${auth.currentUser.person.first_name} ${auth.currentUser.person.last_name}`;
    }
  } catch {
    // AuthProvider not mounted or fallback
  }

  // Consensus-aligned 3-tier view selector
  const [activeTier, setActiveTier] = useState<'CONTROLLED_PDFS' | 'SOURCE_VAULT' | 'WORKING_DOCS'>('CONTROLLED_PDFS');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');

  // Modals
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isDepositVaultModalOpen, setIsDepositVaultModalOpen] = useState(false);
  const [isAddWorkingDocModalOpen, setIsAddWorkingDocModalOpen] = useState(false);

  // PDF Viewer Modal State
  const [viewingPdfDoc, setViewingPdfDoc] = useState<ControlledDocument | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfViewerTab, setPdfViewerTab] = useState<'PDF_VIEW' | 'CONTROL_SHEET'>('PDF_VIEW');

  // Promote Working Document Modal State
  const [promotingDoc, setPromotingDoc] = useState<WorkingDocument | null>(null);
  const [approverName, setApproverName] = useState('Sarah Jenkins (QA VP)');
  const [approvalNotes, setApprovalNotes] = useState('Approved for production release per ISO 9001:2015 Clause 7.5.');
  const [promotionMethod, setPromotionMethod] = useState<'AUTO_COMPILE' | 'CUSTOM_UPLOAD'>('AUTO_COMPILE');
  const [promotionPdfFile, setPromotionPdfFile] = useState<File | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isCompilingPreview, setIsCompilingPreview] = useState(false);

  // Check-In Vault Item Modal State
  const [checkingInVaultItem, setCheckingInVaultItem] = useState<SourceVaultItem | null>(null);
  const [checkInRevisedFile, setCheckInRevisedFile] = useState<File | null>(null);
  const [checkInNewRev, setCheckInNewRev] = useState('Rev B');
  const [checkInChangeSummary, setCheckInChangeSummary] = useState('');
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  // Direct Deposit Vault Item Modal State
  const [depositDocNumber, setDepositDocNumber] = useState('');
  const [depositTitle, setDepositTitle] = useState('');
  const [depositRev, setDepositRev] = useState('Rev A');
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [depositNotes, setDepositNotes] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  // File Input References for Direct Button Clicks
  const workingSourceFileInputRef = useRef<HTMLInputElement>(null);
  const workingDraftPdfInputRef = useRef<HTMLInputElement>(null);
  const promotionPdfInputRef = useRef<HTMLInputElement>(null);
  const checkInFileInputRef = useRef<HTMLInputElement>(null);
  const depositFileInputRef = useRef<HTMLInputElement>(null);
  const directPdfInputRef = useRef<HTMLInputElement>(null);
  const directSourceInputRef = useRef<HTMLInputElement>(null);
  const quickDropFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOverWorkingDocs, setIsDraggingOverWorkingDocs] = useState(false);
  const [isDraggingInModal, setIsDraggingInModal] = useState(false);

  // Persistent Tier 2 & Tier 3 local state
  const [vaultItems, setVaultItems] = useState<SourceVaultItem[]>(() => loadStoredVault());
  const [workingDocs, setWorkingDocs] = useState<WorkingDocument[]>(() => loadStoredWorking());

  // Toast / Status notification for vault and lifecycle events
  const [vaultNotification, setVaultNotification] = useState<{
    message: string;
    type: 'success' | 'info';
    actionLabel?: string;
    actionTier?: 'CONTROLLED_PDFS' | 'SOURCE_VAULT' | 'WORKING_DOCS';
  } | null>(null);

  // Save changes to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaultItems));
    } catch (e) {
      console.warn('Failed to save vault items to localStorage:', e);
    }
  }, [vaultItems]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKING_STORAGE_KEY, JSON.stringify(workingDocs));
    } catch (e) {
      console.warn('Failed to save working docs to localStorage:', e);
    }
  }, [workingDocs]);

  // Effective Tier 2 Source Vault Items:
  // Dynamically merges Standard Enterprise Baselines, Tier 1 Controlled Documents, and Vault Locks/Edits
  const effectiveVaultItems = useMemo<SourceVaultItem[]>(() => {
    const map = new Map<string, SourceVaultItem>();

    // 1. Standard Enterprise Baselines as default foundation
    STANDARD_BASELINES.forEach((b) => {
      const ext = b.source_file_name.split('.').pop() || 'docx';
      map.set(b.doc_number.toUpperCase(), {
        id: `vault-${b.id}`,
        document_id: b.id,
        doc_number: b.doc_number,
        title: b.title,
        revision: b.current_revision,
        file_name: b.source_file_name,
        file_type: ext,
        file_size_bytes: ext === 'xlsx' ? 84000 : 1420000,
        file_url: null,
        storage_path: null,
        uploaded_by: 'ISO 9001 Lead Auditor',
        uploaded_at: '2026-01-15',
        is_checked_out: false,
        checked_out_by: null,
        notes: `Enterprise procedure master baseline template (${ext.toUpperCase()}).`,
      });
    });

    // 2. Synchronize from Tier 1 Controlled Documents:
    // Every approved document in Tier 1 has its native master vaulted in Tier 2
    documents.forEach((doc) => {
      const ext =
        doc.source_file_type ||
        (doc.source_file_name ? doc.source_file_name.split('.').pop() : null) ||
        (doc.category === 'Work Instruction' || doc.category === 'Form/Template' ? 'xlsx' : 'docx');
      const fileName = doc.source_file_name || `${doc.doc_number}_Master.${ext}`;

      map.set(doc.doc_number.toUpperCase(), {
        id: doc.source_vault_id || `vault-auto-${doc.id}`,
        document_id: doc.id,
        doc_number: doc.doc_number,
        title: doc.title,
        revision: doc.current_revision,
        file_name: fileName,
        file_type: ext,
        file_size_bytes: 1250000,
        file_url: doc.file_url || null,
        storage_path: doc.storage_path || null,
        uploaded_by: doc.owner || doc.approved_by || 'Quality Assurance',
        uploaded_at: doc.effective_date || new Date().toISOString().slice(0, 10),
        is_checked_out: false,
        checked_out_by: null,
        notes: `Master native source file for released controlled procedure ${doc.doc_number}.`,
      });
    });

    // 3. User deposits, edits, and active check-out locks in vaultItems take precedence
    vaultItems.forEach((v) => {
      map.set(v.doc_number.toUpperCase(), v);
    });

    return Array.from(map.values());
  }, [vaultItems, documents]);

  // Filtered Vault Items for Tier 2 view
  const filteredVaultItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return effectiveVaultItems.filter((item) => {
      if (!query) return true;
      return (
        item.doc_number.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.file_name.toLowerCase().includes(query) ||
        (item.notes || '').toLowerCase().includes(query) ||
        (item.checked_out_by || '').toLowerCase().includes(query)
      );
    });
  }, [effectiveVaultItems, searchQuery]);

  // Combined Repository Catalog (Tier 1 documents + Tier 2 vault items + Standard Enterprise Baselines)
  const repositoryCatalog = useMemo(() => {
    return effectiveVaultItems.map((v) => {
      const docMatch = documents.find((d) => d.doc_number.toUpperCase() === v.doc_number.toUpperCase());
      return {
        id: v.id,
        doc_number: v.doc_number,
        title: v.title,
        category: (docMatch ? docMatch.category : (v.file_type === 'xlsx' ? 'Work Instruction' : 'SOP')) as DocumentCategory,
        department: docMatch ? docMatch.department : 'Quality Assurance',
        current_revision: v.revision,
        source_file_name: v.file_name,
        has_vault_master: true,
      };
    });
  }, [documents, effectiveVaultItems]);

  // Working Document Modal State (Select from Repository vs Create New)
  const [workingDocMode, setWorkingDocMode] = useState<'SELECT_REPO' | 'NEW_DOC'>('SELECT_REPO');
  const [selectedRepoDocId, setSelectedRepoDocId] = useState<string>('');
  const [useVaultBaseline, setUseVaultBaseline] = useState<boolean>(true);

  const [newWorkingDoc, setNewWorkingDoc] = useState<Partial<WorkingDocument>>({
    doc_number: '',
    title: '',
    target_revision: 'Rev A',
    category: 'SOP',
    department: 'Quality Assurance',
    author: currentAuthorName,
    change_summary: '',
  });
  const [workingDocSourceFile, setWorkingDocSourceFile] = useState<File | null>(null);
  const [workingDocDraftPdfFile, setWorkingDocDraftPdfFile] = useState<File | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Direct Controlled PDF Form State
  const [directPdfFile, setDirectPdfFile] = useState<File | null>(null);
  const [directSourceFile, setDirectSourceFile] = useState<File | null>(null);
  const [isRegisteringDirectPdf, setIsRegisteringDirectPdf] = useState(false);

  // Handle selection from repository catalog
  const handleSelectRepositoryDoc = (repoId: string) => {
    setSelectedRepoDocId(repoId);
    const found = repositoryCatalog.find((r) => r.id === repoId);
    if (found) {
      // Calculate next revision
      let nextRev = 'Rev B';
      if (found.current_revision.startsWith('Rev ')) {
        const letter = found.current_revision.replace('Rev ', '').trim();
        if (letter.length === 1 && letter >= 'A' && letter < 'Z') {
          nextRev = `Rev ${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
        } else {
          nextRev = `${found.current_revision}-Rev`;
        }
      } else if (!isNaN(Number(found.current_revision))) {
        nextRev = String(Number(found.current_revision) + 1).padStart(2, '0');
      }

      setNewWorkingDoc({
        doc_number: found.doc_number,
        title: found.title,
        category: found.category,
        department: found.department,
        target_revision: nextRev,
        author: currentAuthorName,
        source_file_name: found.source_file_name || `${found.doc_number}_Draft.docx`,
        source_file_type: found.source_file_name?.split('.').pop() || 'docx',
        change_summary: `Revision ${nextRev} initiated from ${found.current_revision}.`,
      });

      setUseVaultBaseline(found.has_vault_master);
      setWorkingDocSourceFile(null);
    }
  };

  // Open "Start Working Draft" modal and auto-select first repository item if none chosen
  const handleOpenWorkingDraftModal = () => {
    if (repositoryCatalog.length > 0 && !selectedRepoDocId) {
      handleSelectRepositoryDoc(repositoryCatalog[0].id);
    }
    setIsAddWorkingDocModalOpen(true);
  };

  const handleSwitchToNewDocMode = () => {
    setWorkingDocMode('NEW_DOC');
    setSelectedRepoDocId('');
    setNewWorkingDoc({
      doc_number: '',
      title: '',
      target_revision: 'Rev A',
      category: 'SOP',
      department: 'Quality Assurance',
      author: currentAuthorName,
      change_summary: '',
    });
    setWorkingDocSourceFile(null);
    setWorkingDocDraftPdfFile(null);
  };

  const handleSwitchToSelectRepoMode = () => {
    setWorkingDocMode('SELECT_REPO');
    if (repositoryCatalog.length > 0) {
      handleSelectRepositoryDoc(selectedRepoDocId || repositoryCatalog[0].id);
    }
  };

  // Intelligent filename parser for drag-and-drop document intake
  const parseDocumentFromFilename = (fileName: string) => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    
    // Pattern match standard IDs: e.g. SOP-QMS-001, WI-MCH-022, FORM-APQP-004
    const prefixMatch = baseName.match(/([A-Z]{2,5}[-_][A-Z0-9]+[-_][0-9]{2,4})/i);
    let docNumber = prefixMatch ? prefixMatch[1].replace(/_/g, '-').toUpperCase() : '';

    // Revision match: e.g. Rev_A, Rev-02, Revision-B
    const revMatch = baseName.match(/[-_]?(Rev|Revision)[-_]?([A-Z0-9]+)/i);
    let revision = revMatch ? `Rev ${revMatch[2].toUpperCase()}` : 'Rev A';

    // Category inference
    let category: DocumentCategory = 'SOP';
    const upper = baseName.toUpperCase();
    if (upper.startsWith('WI') || upper.includes('WORK_INSTRUCTION') || upper.includes('WORK INSTRUCTION')) {
      category = 'Work Instruction';
    } else if (upper.startsWith('FORM') || upper.includes('TEMPLATE') || upper.includes('REPORT')) {
      category = 'Form/Template';
    } else if (upper.includes('INSPECTION') || upper.includes('FAI') || upper.includes('METROLOGY')) {
      category = 'Inspection Procedure';
    } else if (upper.includes('MANUAL') || upper.includes('POLICY')) {
      category = 'Quality Manual';
    }

    // Cleaned Title
    let cleanedTitle = baseName;
    if (docNumber) {
      cleanedTitle = cleanedTitle.replace(new RegExp(docNumber.replace('-', '[-_]'), 'i'), '');
    }
    if (revMatch) {
      cleanedTitle = cleanedTitle.replace(new RegExp(`[-_]?${revMatch[0]}`, 'i'), '');
    }
    cleanedTitle = cleanedTitle.replace(/[-_]+/g, ' ').trim();
    if (!cleanedTitle) {
      cleanedTitle = baseName.replace(/[-_]+/g, ' ');
    }

    if (!docNumber) {
      const letters = baseName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'DOC';
      docNumber = `SOP-${letters}-${Math.floor(100 + Math.random() * 900)}`;
    }

    return { docNumber, revision, title: cleanedTitle, category };
  };

  // Process a dropped or browsed native document file
  const handleProcessIntakeFile = (file: File) => {
    const parsed = parseDocumentFromFilename(file.name);
    
    // Check if this matches an existing procedure in the catalog
    const repoMatch = repositoryCatalog.find(
      (r) => r.doc_number.toLowerCase() === parsed.docNumber.toLowerCase()
    );

    if (repoMatch) {
      setWorkingDocMode('SELECT_REPO');
      handleSelectRepositoryDoc(repoMatch.id);
      setWorkingDocSourceFile(file);
      setUseVaultBaseline(false);
    } else {
      setWorkingDocMode('NEW_DOC');
      setSelectedRepoDocId('');
      setNewWorkingDoc({
        doc_number: parsed.docNumber,
        title: parsed.title,
        target_revision: parsed.revision,
        category: parsed.category,
        department: 'Quality Assurance',
        author: currentAuthorName,
        change_summary: `Initial working draft created from dropped file (${file.name}).`,
        source_file_name: file.name,
        source_file_type: file.name.split('.').pop() || 'docx',
        source_file_size_bytes: file.size,
      });
      setWorkingDocSourceFile(file);
    }

    setIsAddWorkingDocModalOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverWorkingDocs(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOverWorkingDocs(false);
  };

  const handleDropOnWorkingDocs = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverWorkingDocs(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessIntakeFile(file);
    }
  };

  // Load preview PDF whenever viewingPdfDoc changes
  useEffect(() => {
    if (viewingPdfDoc) {
      setIsLoadingPdf(true);
      getPdfViewUrl(viewingPdfDoc.storage_path, viewingPdfDoc.pdf_file_url)
        .then((url) => {
          setActivePdfUrl(url);
          setIsLoadingPdf(false);
        })
        .catch(() => {
          setActivePdfUrl(viewingPdfDoc.pdf_file_url || null);
          setIsLoadingPdf(false);
        });
    } else {
      setActivePdfUrl(null);
    }
  }, [viewingPdfDoc]);

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

  // =========================================================================
  // HANDLERS
  // =========================================================================

  // Create new working document draft with native source file
  const handleCreateWorkingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkingDoc.doc_number || !newWorkingDoc.title) return;

    setIsCreatingDraft(true);
    try {
      const docNum = newWorkingDoc.doc_number;
      const targetRev = newWorkingDoc.target_revision || 'Rev A';

      let sourceFileName = newWorkingDoc.source_file_name || `${docNum}_Master.docx`;
      let sourceFileType = sourceFileName.split('.').pop() || 'docx';
      let sourceFileSize = 0;
      let sourceStoragePath: string | null = null;
      let sourceFileUrl: string | null = null;

      // 1. Upload native source file if selected from computer
      if (workingDocSourceFile) {
        sourceFileName = workingDocSourceFile.name;
        sourceFileType = workingDocSourceFile.name.split('.').pop() || 'docx';
        sourceFileSize = workingDocSourceFile.size;
        const uploadRes = await uploadWorkingFile(docNum, targetRev, workingDocSourceFile);
        sourceStoragePath = uploadRes.path;
        sourceFileUrl = uploadRes.url;
      } else if (useVaultBaseline && selectedRepoDocId) {
        // Find existing vault master item to link
        const vaultMatch = vaultItems.find((v) => v.doc_number === docNum);
        if (vaultMatch) {
          sourceFileName = vaultMatch.file_name;
          sourceFileType = vaultMatch.file_type;
          sourceFileSize = vaultMatch.file_size_bytes;
          sourceStoragePath = vaultMatch.storage_path || null;
          sourceFileUrl = vaultMatch.file_url || null;
        }
      }

      // 2. Upload draft PDF if selected
      let draftPdfName: string | null = null;
      let draftPdfPath: string | null = null;
      let draftPdfUrl: string | null = null;
      let draftPdfSize: number | undefined = undefined;

      if (workingDocDraftPdfFile) {
        draftPdfName = workingDocDraftPdfFile.name;
        draftPdfSize = workingDocDraftPdfFile.size;
        const pdfRes = await uploadWorkingFile(docNum, targetRev, workingDocDraftPdfFile);
        draftPdfPath = pdfRes.path;
        draftPdfUrl = pdfRes.url;
      }

      const doc: WorkingDocument = {
        id: `work-${Date.now()}`,
        doc_number: docNum,
        title: newWorkingDoc.title || '',
        target_revision: targetRev,
        category: newWorkingDoc.category || 'SOP',
        department: newWorkingDoc.department || 'Quality Assurance',
        author: newWorkingDoc.author || currentAuthorName,
        stage: 'DRAFT',
        source_file_name: sourceFileName,
        source_file_type: sourceFileType,
        source_file_size_bytes: sourceFileSize,
        source_file_url: sourceFileUrl,
        source_storage_path: sourceStoragePath,
        draft_pdf_name: draftPdfName,
        draft_pdf_storage_path: draftPdfPath,
        draft_pdf_url: draftPdfUrl,
        draft_pdf_size_bytes: draftPdfSize,
        change_summary: newWorkingDoc.change_summary || 'Working draft created in repository.',
        created_at: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString().slice(0, 10),
      };

      setWorkingDocs((prev) => [doc, ...prev]);
      setIsAddWorkingDocModalOpen(false);
      setWorkingDocSourceFile(null);
      setWorkingDocDraftPdfFile(null);
      setActiveTier('WORKING_DOCS');
    } catch (err) {
      console.error('Error creating working document:', err);
      alert('Failed to upload draft source file. Please try again.');
    } finally {
      setIsCreatingDraft(false);
    }
  };

  // Handler to compile and preview Master PDF directly from Tier 3 Working Document
  const handlePreviewWorkingDocPdf = (doc: WorkingDocument) => {
    setIsCompilingPreview(true);
    try {
      const previewBlob = generateControlledPdfBlob({
        docNumber: doc.doc_number,
        title: doc.title,
        revision: doc.target_revision,
        department: doc.department,
        category: doc.category,
        author: doc.author,
        approverName: approverName,
        approvalNotes: `Preliminary audit preview for ${doc.target_revision} promotion.`,
        changeSummary: doc.change_summary,
        sourceFileName: doc.source_file_name,
      });

      const blobUrl = URL.createObjectURL(previewBlob);
      setActivePdfUrl(blobUrl);
      setViewingPdfDoc({
        id: doc.id,
        doc_number: doc.doc_number,
        title: doc.title,
        category: doc.category,
        department: doc.department,
        current_revision: doc.target_revision,
        status: 'IN_REVIEW',
        owner: doc.author,
        effective_date: new Date().toISOString().slice(0, 10),
        description: doc.change_summary,
        pdf_file_name: `${doc.doc_number}_${doc.target_revision.replace(/\s+/g, '')}_CONTROLLED_PREVIEW.pdf`,
        pdf_file_url: blobUrl,
        source_file_name: doc.source_file_name,
        source_file_type: doc.source_file_type,
      } as ControlledDocument);
    } catch (err) {
      console.error('Failed to preview draft PDF:', err);
      alert('Failed to compile draft PDF preview.');
    } finally {
      setIsCompilingPreview(false);
    }
  };

  // Promotion handler (Tier 3 Working Doc -> Tier 1 Controlled PDF + Tier 2 Vault)
  const handlePromoteWorkingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingDoc) return;

    setIsPromoting(true);
    try {
      const docNum = promotingDoc.doc_number;
      const targetRev = promotingDoc.target_revision;

      // 1. Determine or automatically compile final Master PDF
      let finalPdfName = promotingDoc.draft_pdf_name || `${docNum}_${targetRev.replace(/\s+/g, '')}_CONTROLLED.pdf`;
      let finalPdfUrl = promotingDoc.draft_pdf_url || null;
      let finalPdfPath = promotingDoc.draft_pdf_storage_path || null;
      let finalPdfSize = promotingDoc.draft_pdf_size_bytes || 250000;

      if (promotionMethod === 'CUSTOM_UPLOAD' && promotionPdfFile) {
        finalPdfName = promotionPdfFile.name;
        finalPdfSize = promotionPdfFile.size;
        const uploadPdfRes = await uploadControlledPdfFile(docNum, targetRev, promotionPdfFile);
        finalPdfPath = uploadPdfRes.path;
        finalPdfUrl = uploadPdfRes.url;
      } else {
        // AUTOMATIC COMPILATION OF LEGALLY AUDITABLE ISO 9001:2015 MASTER PDF
        const compiled = await compileControlledMasterPdf({
          docNumber: docNum,
          title: promotingDoc.title,
          revision: targetRev,
          department: promotingDoc.department,
          category: promotingDoc.category,
          author: promotingDoc.author,
          approverName: approverName,
          approvalNotes: approvalNotes,
          changeSummary: promotingDoc.change_summary,
          sourceFileName: promotingDoc.source_file_name,
        });
        finalPdfName = compiled.fileName;
        finalPdfSize = compiled.size;
        finalPdfPath = compiled.path;
        finalPdfUrl = compiled.url;
      }

      // 2. Deposit master source file into Tier 2 Source Vault
      const vaultId = `vault-${Date.now()}`;
      const vaultEntry: SourceVaultItem = {
        id: vaultId,
        document_id: promotingDoc.id,
        doc_number: docNum,
        title: promotingDoc.title,
        revision: targetRev,
        file_name: promotingDoc.source_file_name || `${docNum}_Master.docx`,
        file_type: promotingDoc.source_file_type || 'docx',
        file_size_bytes: promotingDoc.source_file_size_bytes || 1500000,
        file_url: promotingDoc.source_file_url || null,
        storage_path: promotingDoc.source_storage_path || null,
        uploaded_by: promotingDoc.author,
        uploaded_at: new Date().toISOString().slice(0, 10),
        is_checked_out: false,
        checked_out_by: null,
        notes: `Master native source vaulted upon promotion to ${targetRev} by ${approverName}. Note: ${approvalNotes}`,
      };

      setVaultItems((prev) => {
        const filtered = prev.filter((v) => v.doc_number.toUpperCase() !== docNum.toUpperCase());
        return [vaultEntry, ...filtered];
      });

      // 3. Promote to Controlled Documents (Tier 1)
      const controlledDocData: Partial<ControlledDocument> = {
        doc_number: docNum,
        title: promotingDoc.title,
        category: promotingDoc.category,
        department: promotingDoc.department,
        current_revision: targetRev,
        status: 'APPROVED',
        owner: promotingDoc.author,
        effective_date: new Date().toISOString().slice(0, 10),
        next_review_date: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
        description: promotingDoc.change_summary,
        pdf_file_name: finalPdfName,
        pdf_file_url: finalPdfUrl,
        pdf_file_size_bytes: finalPdfSize,
        storage_path: finalPdfPath,
        source_vault_id: vaultId,
        source_file_name: vaultEntry.file_name,
        source_file_type: vaultEntry.file_type,
        approved_by: approverName,
        approved_at: new Date().toISOString().slice(0, 10),
      };

      await onAddDocument(controlledDocData);

      // 4. Remove from Working Documents
      setWorkingDocs((prev) => prev.filter((w) => w.id !== promotingDoc.id));
      setPromotingDoc(null);
      setPromotionPdfFile(null);
      setActiveTier('CONTROLLED_PDFS');

      // 5. Celebration & immediate PDF review modal
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // optional confetti
      }

      setViewingPdfDoc({
        id: `doc-${Date.now()}`,
        ...controlledDocData,
      } as ControlledDocument);

      setVaultNotification({
        message: `✓ Document ${docNum} successfully promoted to ${targetRev}! Master PDF compiled and released to shopfloor controlled register.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Promotion error:', err);
      alert('Failed to promote document to controlled register.');
    } finally {
      setIsPromoting(false);
    }
  };

  // Check-out source file from vault (locks file, downloads master native file, and stages draft in Tier 3)
  const handleToggleVaultCheckout = async (item: SourceVaultItem) => {
    if (!item.is_checked_out) {
      // 1. Calculate next target revision
      let targetRev = 'Rev B';
      if (item.revision.startsWith('Rev ')) {
        const letter = item.revision.replace('Rev ', '').trim();
        if (letter.length === 1 && letter >= 'A' && letter < 'Z') {
          targetRev = `Rev ${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
        } else {
          targetRev = `${item.revision}-Next`;
        }
      } else if (!isNaN(Number(item.revision))) {
        targetRev = String(Number(item.revision) + 1).padStart(2, '0');
      }

      // 2. Lock file in vaultItems
      const updatedVaultItem: SourceVaultItem = {
        ...item,
        is_checked_out: true,
        checked_out_by: currentAuthorName,
        notes: `Checked out by ${currentAuthorName} for ${targetRev} drafting on ${new Date().toISOString().slice(0, 10)}.`,
      };

      setVaultItems((prev) => {
        const exists = prev.some((v) => v.doc_number.toUpperCase() === item.doc_number.toUpperCase());
        if (exists) {
          return prev.map((v) => (v.doc_number.toUpperCase() === item.doc_number.toUpperCase() ? updatedVaultItem : v));
        }
        return [updatedVaultItem, ...prev];
      });

      // 3. Automatically stage a working document draft in Tier 3
      const existingDraft = workingDocs.find(
        (w) => w.doc_number.toUpperCase() === item.doc_number.toUpperCase() && w.stage === 'DRAFT'
      );
      if (!existingDraft) {
        const docMatch = documents.find((d) => d.doc_number.toUpperCase() === item.doc_number.toUpperCase());
        const newDraft: WorkingDocument = {
          id: `work-co-${Date.now()}`,
          doc_number: item.doc_number,
          title: item.title,
          target_revision: targetRev,
          category: docMatch ? docMatch.category : (item.file_type === 'xlsx' ? 'Work Instruction' : 'SOP'),
          department: docMatch ? docMatch.department : 'Quality Assurance',
          author: currentAuthorName,
          stage: 'DRAFT',
          source_file_name: item.file_name,
          source_file_type: item.file_type,
          source_file_size_bytes: item.file_size_bytes,
          source_file_url: item.file_url,
          source_storage_path: item.storage_path,
          source_vault_ref: item.id,
          change_summary: `Revision ${targetRev} initiated via vault check-out from ${item.revision} by ${currentAuthorName}.`,
          created_at: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString().slice(0, 10),
        };
        setWorkingDocs((wPrev) => [newDraft, ...wPrev]);
      }

      // 4. Download genuine native document file (.docx / .xlsx) to disk
      await downloadDocumentFile(item.storage_path || '', item.file_name, item.file_url, {
        docNumber: item.doc_number,
        title: item.title,
        revision: item.revision,
        owner: currentAuthorName,
      });

      // 5. Toast notification
      setVaultNotification({
        message: `✓ Checked out ${item.doc_number}! Master file (${item.file_name}) downloaded to your computer. Working draft ${targetRev} active in Tier 3.`,
        type: 'success',
        actionLabel: 'Go to Tier 3 Working Draft',
        actionTier: 'WORKING_DOCS',
      });
    } else {
      // Prompt for check-in modal to upload updated file and record revision change summary
      setCheckingInVaultItem(item);
      let nextRev = 'Rev B';
      if (item.revision.startsWith('Rev ')) {
        const letter = item.revision.replace('Rev ', '').trim();
        if (letter.length === 1 && letter >= 'A' && letter < 'Z') {
          nextRev = `Rev ${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
        } else {
          nextRev = `${item.revision}-Next`;
        }
      } else if (!isNaN(Number(item.revision))) {
        nextRev = String(Number(item.revision) + 1).padStart(2, '0');
      }
      setCheckInNewRev(nextRev);
      setCheckInChangeSummary('');
      setCheckInRevisedFile(null);
    }
  };

  // Cancel / Release vault check-out lock
  const handleCancelVaultCheckout = (item: SourceVaultItem) => {
    const updatedVaultItem: SourceVaultItem = {
      ...item,
      is_checked_out: false,
      checked_out_by: null,
      notes: `Check-out lock cancelled / released on ${new Date().toISOString().slice(0, 10)}.`,
    };

    setVaultItems((prev) => {
      const exists = prev.some((v) => v.doc_number.toUpperCase() === item.doc_number.toUpperCase());
      if (exists) {
        return prev.map((v) => (v.doc_number.toUpperCase() === item.doc_number.toUpperCase() ? updatedVaultItem : v));
      }
      return [updatedVaultItem, ...prev];
    });

    setVaultNotification({
      message: `Check-out lock for ${item.doc_number} was successfully released. Document is unlocked in vault.`,
      type: 'info',
    });
  };

  // Submit check-in modal
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkingInVaultItem) return;

    setIsProcessingCheckIn(true);
    try {
      const item = checkingInVaultItem;
      let newFileName = item.file_name;
      let newFilePath = item.storage_path;
      let newFileUrl = item.file_url;
      let newFileSize = item.file_size_bytes;
      let newFileType = item.file_type;

      if (checkInRevisedFile) {
        newFileName = checkInRevisedFile.name;
        newFileSize = checkInRevisedFile.size;
        newFileType = checkInRevisedFile.name.split('.').pop() || 'docx';

        let fileOrBlobToUpload: File | Blob = checkInRevisedFile;
        if (newFileType.toLowerCase() === 'docx' || newFileType.toLowerCase() === 'doc') {
          try {
            const syncResult = await syncDocxRevisionAndExtractContent(checkInRevisedFile, {
              targetRev: checkInNewRev,
              author: currentAuthorName,
              changeSummary: checkInChangeSummary,
              docNumber: item.doc_number,
              title: item.title,
            });
            fileOrBlobToUpload = syncResult.updatedBlob;
            newFileSize = syncResult.updatedBlob.size;
          } catch (syncErr) {
            console.warn('Docx revision sync warning:', syncErr);
          }
        }

        const uploadRes = await uploadWorkingFile(item.doc_number, checkInNewRev, fileOrBlobToUpload, newFileName);
        newFilePath = uploadRes.path;
        newFileUrl = uploadRes.url;
      }

      // 1. Release check-out lock in vault with updated revision
      const updatedVault: SourceVaultItem = {
        ...item,
        revision: checkInNewRev,
        file_name: newFileName,
        file_type: newFileType,
        file_size_bytes: newFileSize,
        file_url: newFileUrl,
        storage_path: newFilePath,
        is_checked_out: false,
        checked_out_by: null,
        uploaded_by: currentAuthorName,
        uploaded_at: new Date().toISOString().slice(0, 10),
        notes: `Checked in at ${checkInNewRev} by ${currentAuthorName}: ${checkInChangeSummary}`,
      };

      setVaultItems((prev) => {
        const filtered = prev.filter((v) => v.doc_number.toUpperCase() !== item.doc_number.toUpperCase());
        return [updatedVault, ...filtered];
      });

      // 2. Update or spawn working draft in Tier 3
      const existingDraftIndex = workingDocs.findIndex(
        (w) => w.doc_number.toUpperCase() === item.doc_number.toUpperCase() && w.stage === 'DRAFT'
      );

      if (existingDraftIndex >= 0) {
        setWorkingDocs((prev) =>
          prev.map((w, idx) =>
            idx === existingDraftIndex
              ? {
                  ...w,
                  target_revision: checkInNewRev,
                  source_file_name: newFileName,
                  source_file_type: newFileType,
                  source_file_size_bytes: newFileSize,
                  source_file_url: newFileUrl,
                  source_storage_path: newFilePath,
                  change_summary: checkInChangeSummary,
                  updated_at: new Date().toISOString().slice(0, 10),
                }
              : w
          )
        );
      } else {
        const docMatch = documents.find((d) => d.doc_number.toUpperCase() === item.doc_number.toUpperCase());
        const newDraft: WorkingDocument = {
          id: `work-${Date.now()}`,
          doc_number: item.doc_number,
          title: item.title,
          target_revision: checkInNewRev,
          category: docMatch ? docMatch.category : 'SOP',
          department: docMatch ? docMatch.department : 'Quality Assurance',
          author: currentAuthorName,
          stage: 'DRAFT',
          source_file_name: newFileName,
          source_file_type: newFileType,
          source_file_size_bytes: newFileSize,
          source_file_url: newFileUrl,
          source_storage_path: newFilePath,
          source_vault_ref: item.id,
          change_summary: checkInChangeSummary || 'Engineering revision checked in from vault.',
          created_at: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString().slice(0, 10),
        };
        setWorkingDocs((prev) => [newDraft, ...prev]);
      }

      setCheckingInVaultItem(null);
      setCheckInRevisedFile(null);
      setVaultNotification({
        message: `✓ Successfully checked in ${item.doc_number} (${checkInNewRev}). Lock released. Draft updated in Tier 3 ready for master PDF promotion.`,
        type: 'success',
        actionLabel: 'Go to Tier 3 to Promote PDF',
        actionTier: 'WORKING_DOCS',
      });
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Failed to check in file.');
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  // Direct deposit into Tier 2 Source Vault
  const handleDepositVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositDocNumber || !depositTitle || !depositFile) return;

    setIsDepositing(true);
    try {
      const uploadRes = await uploadVaultFile(depositDocNumber, depositRev, depositFile);

      const vaultEntry: SourceVaultItem = {
        id: `vault-${Date.now()}`,
        document_id: `doc-${depositDocNumber}`,
        doc_number: depositDocNumber,
        title: depositTitle,
        revision: depositRev,
        file_name: depositFile.name,
        file_type: depositFile.name.split('.').pop() || 'docx',
        file_size_bytes: depositFile.size,
        file_url: uploadRes.url,
        storage_path: uploadRes.path,
        uploaded_by: currentAuthorName,
        uploaded_at: new Date().toISOString().slice(0, 10),
        is_checked_out: false,
        notes: depositNotes || 'Direct vault deposit.',
      };

      setVaultItems((prev) => [vaultEntry, ...prev]);
      setIsDepositVaultModalOpen(false);
      setDepositFile(null);
      setDepositDocNumber('');
      setDepositTitle('');
    } catch (err) {
      console.error('Deposit error:', err);
      alert('Failed to deposit file into vault.');
    } finally {
      setIsDepositing(false);
    }
  };

  // Direct Controlled PDF Registration (Tier 1)
  const handleDirectPdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formEl = e.currentTarget as HTMLFormElement;
    const formData = new FormData(formEl);

    setIsRegisteringDirectPdf(true);
    try {
      const docNum = formData.get('doc_number') as string;
      const rev = formData.get('current_revision') as string;
      const title = formData.get('title') as string;

      let pdfName = `${docNum}_CONTROLLED.pdf`;
      let pdfUrl: string | null = null;
      let pdfPath: string | null = null;
      let pdfSize = 250000;

      if (directPdfFile) {
        pdfName = directPdfFile.name;
        pdfSize = directPdfFile.size;
        const uploadRes = await uploadControlledPdfFile(docNum, rev, directPdfFile);
        pdfPath = uploadRes.path;
        pdfUrl = uploadRes.url;
      }

      // Optional native source file deposit into vault simultaneously
      let sourceVaultId: string | null = null;
      let sourceFileName: string | null = null;
      let sourceFileType: string | null = null;

      if (directSourceFile) {
        const sourceRes = await uploadVaultFile(docNum, rev, directSourceFile);
        sourceVaultId = `vault-${Date.now()}`;
        sourceFileName = directSourceFile.name;
        sourceFileType = directSourceFile.name.split('.').pop() || 'docx';

        const vaultEntry: SourceVaultItem = {
          id: sourceVaultId,
          document_id: `doc-${docNum}`,
          doc_number: docNum,
          title,
          revision: rev,
          file_name: directSourceFile.name,
          file_type: sourceFileType,
          file_size_bytes: directSourceFile.size,
          file_url: sourceRes.url,
          storage_path: sourceRes.path,
          uploaded_by: (formData.get('owner') as string) || currentAuthorName,
          uploaded_at: new Date().toISOString().slice(0, 10),
          is_checked_out: false,
          notes: 'Master source deposited during direct controlled PDF registration.',
        };
        setVaultItems((prev) => [vaultEntry, ...prev]);
      }

      await onAddDocument({
        doc_number: docNum,
        title,
        category: formData.get('category') as DocumentCategory,
        department: formData.get('department') as string,
        current_revision: rev,
        status: 'APPROVED',
        owner: formData.get('owner') as string,
        effective_date: formData.get('effective_date') as string,
        next_review_date: formData.get('next_review_date') as string,
        description: formData.get('description') as string,
        pdf_file_name: pdfName,
        pdf_file_url: pdfUrl,
        pdf_file_size_bytes: pdfSize,
        storage_path: pdfPath,
        source_vault_id: sourceVaultId,
        source_file_name: sourceFileName,
        source_file_type: sourceFileType,
        approved_by: formData.get('owner') as string,
        approved_at: new Date().toISOString().slice(0, 10),
      });

      setIsAddDocModalOpen(false);
      setDirectPdfFile(null);
      setDirectSourceFile(null);
    } catch (err) {
      console.error('Direct register error:', err);
      alert('Failed to register controlled PDF.');
    } finally {
      setIsRegisteringDirectPdf(false);
    }
  };

  const getFileTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('doc')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (t.includes('xls') || t.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (t.includes('dwg') || t.includes('dxf')) return <FileCode className="w-4 h-4 text-purple-400" />;
    if (t.includes('pdf')) return <FileCheck className="w-4 h-4 text-red-400" />;
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
          {activeTier === 'WORKING_DOCS' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => quickDropFileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow"
              >
                <Upload className="w-4 h-4 text-purple-400" /> Drop / Upload Document
              </button>
              <button
                onClick={handleOpenWorkingDraftModal}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Start Working Draft
              </button>
            </div>
          )}

          {activeTier === 'SOURCE_VAULT' && (
            <button
              onClick={() => setIsDepositVaultModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" /> Deposit Native Master
            </button>
          )}

          {activeTier === 'CONTROLLED_PDFS' && (
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
              {documents.filter((d) => d.status === 'APPROVED').length}
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
            Tier 2: Source File Vault (Native Masters Repository)
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-950 font-mono font-bold text-amber-400">
              {effectiveVaultItems.length}
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

      {/* Toast Notification Banner for Vault Events */}
      {vaultNotification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-lg transition-all ${
            vaultNotification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{vaultNotification.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {vaultNotification.actionTier && vaultNotification.actionLabel && (
              <button
                onClick={() => {
                  if (vaultNotification.actionTier) {
                    setActiveTier(vaultNotification.actionTier);
                  }
                  setVaultNotification(null);
                }}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded border border-white/20 transition-colors whitespace-nowrap"
              >
                {vaultNotification.actionLabel} →
              </button>
            )}
            <button
              onClick={() => setVaultNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
                    <th className="py-3 px-4">Master PDF Asset</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                        No approved controlled documents matching criteria. Click &quot;Register Controlled PDF&quot; to add your first master document.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => {
                      const vaultMatch = effectiveVaultItems.find((v) => v.doc_number.toUpperCase() === doc.doc_number.toUpperCase());

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
                            <div className="flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-mono text-[10px] text-slate-200 block truncate max-w-[150px]">
                                  {doc.pdf_file_name || `${doc.doc_number}_CONTROLLED.pdf`}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-mono block">
                                  {doc.pdf_file_size_bytes ? `${(doc.pdf_file_size_bytes / 1024).toFixed(0)} KB` : 'Verified PDF Master'}
                                </span>
                              </div>
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
                                onClick={() =>
                                  downloadDocumentFile(
                                    doc.storage_path || '',
                                    doc.pdf_file_name || `${doc.doc_number}_CONTROLLED.pdf`,
                                    doc.pdf_file_url,
                                    {
                                      docNumber: doc.doc_number,
                                      title: doc.title,
                                      revision: doc.current_revision,
                                      owner: doc.owner,
                                    }
                                  )
                                }
                                title="Download controlled master PDF"
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {vaultMatch && (
                                <button
                                  onClick={() => handleToggleVaultCheckout(vaultMatch)}
                                  title={
                                    vaultMatch.is_checked_out
                                      ? `Checked out by ${vaultMatch.checked_out_by}. Click to manage check-in.`
                                      : `Check-out native master (${vaultMatch.file_name}) and start drafting in Tier 3`
                                  }
                                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow ${
                                    vaultMatch.is_checked_out
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                                  }`}
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  {vaultMatch.is_checked_out ? 'Checked Out' : 'Check-Out'}
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
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Author Check-in / Check-out Concurrency Locks
              </span>
              <button
                onClick={() => setIsDepositVaultModalOpen(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Deposit Master File
              </button>
            </div>
          </div>

          {/* Tier 2 Search & Summary Filter */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Total Master Records: {effectiveVaultItems.length}
              </span>
              <span className="font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Locked (Ready): {effectiveVaultItems.filter((i) => !i.is_checked_out).length}
              </span>
              <span className="font-mono px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                Checked Out: {effectiveVaultItems.filter((i) => i.is_checked_out).length}
              </span>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vault #, file name, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
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
                  {filteredVaultItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">
                        No native source files matching criteria. Check in editable .docx, .xlsx, or .dwg files using &quot;Deposit Master File&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredVaultItems.map((item) => (
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                              <Lock className="w-3 h-3 text-rose-400" />
                              Checked Out ({item.checked_out_by || 'Author'})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
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
                            {item.is_checked_out ? (
                              <>
                                <button
                                  onClick={() => handleToggleVaultCheckout(item)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow"
                                >
                                  <Upload className="w-3.5 h-3.5" /> Check-in Source
                                </button>
                                <button
                                  onClick={() => setActiveTier('WORKING_DOCS')}
                                  title="View corresponding draft in Tier 3"
                                  className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded text-xs font-medium flex items-center gap-1"
                                >
                                  <Clock className="w-3.5 h-3.5 text-purple-400" /> View Draft
                                </button>
                                <button
                                  onClick={() =>
                                    downloadDocumentFile(
                                      item.storage_path || '',
                                      item.file_name,
                                      item.file_url,
                                      {
                                        docNumber: item.doc_number,
                                        title: item.title,
                                        revision: item.revision,
                                        owner: item.uploaded_by,
                                      }
                                    )
                                  }
                                  title={`Download native file: ${item.file_name}`}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCancelVaultCheckout(item)}
                                  title="Cancel check-out and release lock"
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded border border-slate-700 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleVaultCheckout(item)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Check-out & Download
                                </button>

                                <button
                                  onClick={() =>
                                    downloadDocumentFile(
                                      item.storage_path || '',
                                      item.file_name,
                                      item.file_url,
                                      {
                                        docNumber: item.doc_number,
                                        title: item.title,
                                        revision: item.revision,
                                        owner: item.uploaded_by,
                                      }
                                    )
                                  }
                                  title={`Download native file: ${item.file_name}`}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 3: WORKING DOCUMENTS (DRAFTS IN PROGRESS)
          ========================================================================= */}
      {activeTier === 'WORKING_DOCS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              onClick={handleOpenWorkingDraftModal}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Draft
            </button>
          </div>

          {/* Direct Drag & Drop Document Intake Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnWorkingDocs}
            className={`border-2 border-dashed rounded-xl p-6 transition-all text-center relative overflow-hidden ${
              isDraggingOverWorkingDocs
                ? 'border-purple-400 bg-purple-950/40 ring-4 ring-purple-500/20 scale-[1.005]'
                : 'border-slate-700/80 hover:border-purple-500/60 bg-slate-900/60 hover:bg-slate-900/90'
            }`}
          >
            <input
              ref={quickDropFileInputRef}
              type="file"
              accept=".docx,.xlsx,.dwg,.pptx,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleProcessIntakeFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div
                className={`p-3 rounded-full transition-transform ${
                  isDraggingOverWorkingDocs
                    ? 'bg-purple-600 text-white scale-110 shadow-lg shadow-purple-500/30'
                    : 'bg-purple-500/10 text-purple-400'
                }`}
              >
                <Upload className={`w-6 h-6 ${isDraggingOverWorkingDocs ? 'animate-bounce' : ''}`} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  {isDraggingOverWorkingDocs
                    ? 'Release file to start draft & log into repository...'
                    : 'Drag & Drop MS Word (.docx) or Excel (.xlsx) Here to Start Working Draft'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-lg mx-auto">
                  Drop native procedure files directly into this zone to automatically parse document numbers, initialize change control, and stage in the Tier 3 sandbox.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => quickDropFileInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5"
                >
                  <FolderOpen className="w-4 h-4" /> Browse Files (.docx, .xlsx, .dwg)
                </button>
                <span className="text-slate-500 text-xs">or drag and drop a file anywhere into this box</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Doc # / Target Rev</th>
                    <th className="py-3 px-4">Draft Title & Scope</th>
                    <th className="py-3 px-4">Native Working File</th>
                    <th className="py-3 px-4">Master PDF Status</th>
                    <th className="py-3 px-4">Author / Department</th>
                    <th className="py-3 px-4">Change Summary</th>
                    <th className="py-3 px-4 text-right">Promotion Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {workingDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10">
                        <div className="max-w-md mx-auto space-y-2 text-slate-400">
                          <FileText className="w-8 h-8 text-purple-400/60 mx-auto" />
                          <div className="font-semibold text-white text-xs">No active working drafts in progress</div>
                          <p className="text-[11px] text-slate-400">
                            Drag and drop a Word or Excel document into the dropzone above, or click &quot;Create Draft&quot; to revise an existing procedure from the catalog.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    workingDocs.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <span className="text-purple-400 block">{w.doc_number}</span>
                          <span className="text-[10px] text-slate-400">{w.target_revision}</span>
                          {w.source_vault_ref && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 mt-1 w-fit">
                              <Lock className="w-2.5 h-2.5 text-amber-400" /> From Vault
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <span className="font-semibold text-white block truncate">{w.title}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">{w.category}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {getFileTypeIcon(w.source_file_type || 'docx')}
                            <div>
                              <span className="font-mono text-slate-200 block truncate max-w-[140px] text-[11px]">
                                {w.source_file_name || 'No file attached'}
                              </span>
                              {w.source_file_size_bytes ? (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {(w.source_file_size_bytes / 1024).toFixed(0)} KB
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {w.draft_pdf_name ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <FileCheck className="w-3 h-3 text-emerald-400" />
                              PDF Attached
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              Ready to Auto-Compile
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-200 font-medium block">{w.author}</span>
                          <span className="text-[10px] text-slate-500">{w.department}</span>
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px] text-slate-300 text-[11px] truncate">
                          {w.change_summary}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                downloadDocumentFile(
                                  w.source_storage_path || '',
                                  w.source_file_name || `${w.doc_number}_Draft.${w.source_file_type || 'docx'}`,
                                  w.source_file_url,
                                  {
                                    docNumber: w.doc_number,
                                    title: w.title,
                                    revision: w.target_revision,
                                    owner: w.author,
                                  }
                                )
                              }
                              title={`Download working draft: ${w.source_file_name || `${w.doc_number}_Draft.docx`}`}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handlePreviewWorkingDocPdf(w)}
                              title="Compile and preview Master PDF"
                              disabled={isCompilingPreview}
                              className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-400" /> Compile & Preview
                            </button>

                            <button
                              onClick={() => {
                                setPromotingDoc(w);
                                setPromotionMethod('AUTO_COMPILE');
                                setPromotionPdfFile(null);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Promote to Controlled PDF
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Discard working draft ${w.doc_number} (${w.target_revision})?`)) {
                                  setWorkingDocs((prev) => prev.filter((item) => item.id !== w.id));
                                  if (w.source_vault_ref) {
                                    setVaultItems((vPrev) =>
                                      vPrev.map((v) =>
                                        v.id === w.source_vault_ref || v.doc_number.toUpperCase() === w.doc_number.toUpperCase()
                                          ? { ...v, is_checked_out: false, checked_out_by: null }
                                          : v
                                      )
                                    );
                                  }
                                }
                              }}
                              title="Discard working draft"
                              className="p-1 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded border border-slate-700 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* Modal: PDF Viewer with Interactive Master PDF and ISO 9001 Header */}
      {viewingPdfDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {viewingPdfDoc.doc_number}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{viewingPdfDoc.current_revision}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {viewingPdfDoc.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{viewingPdfDoc.title}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
                  <button
                    onClick={() => setPdfViewerTab('PDF_VIEW')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${
                      pdfViewerTab === 'PDF_VIEW'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Master PDF Viewer
                  </button>
                  <button
                    onClick={() => setPdfViewerTab('CONTROL_SHEET')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${
                      pdfViewerTab === 'CONTROL_SHEET'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Control Sheet & Stamp
                  </button>
                </div>

                <button onClick={() => setViewingPdfDoc(null)} className="text-slate-400 hover:text-white ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {pdfViewerTab === 'PDF_VIEW' ? (
              <div className="flex-1 min-h-[550px] overflow-hidden bg-slate-950 rounded-xl border border-slate-800 relative flex flex-col items-center justify-center">
                {isLoadingPdf ? (
                  <div className="text-center space-y-2 font-mono text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                    <span>Loading Controlled Master PDF from repository...</span>
                  </div>
                ) : activePdfUrl ? (
                  <object
                    data={activePdfUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[550px] rounded-xl"
                  >
                    <iframe 
                      src={activePdfUrl} 
                      title="Controlled Document PDF Viewer"
                      className="w-full h-full min-h-[550px]"
                    >
                      <div className="p-8 text-center text-xs text-slate-300">
                        <p>Your browser does not support inline PDF viewing.</p>
                        <a 
                          href={activePdfUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Master PDF in new tab
                        </a>
                      </div>
                    </iframe>
                  </object>
                ) : (
                  <div className="text-center p-8 space-y-3 font-mono text-xs text-slate-400">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-slate-300 font-sans text-sm font-semibold">
                      Master PDF binary has not yet been deposited in storage for {viewingPdfDoc.doc_number}.
                    </p>
                    <p className="max-w-md mx-auto text-slate-500">
                      You can promote a working draft with an attached PDF or register an existing PDF master.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Control Sheet & Stamp View */
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

                {/* Body Details */}
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
                      3. Master Source File Traceability
                    </h4>
                    <p className="mt-1 text-slate-300 font-mono text-[11px]">
                      Master native file ({viewingPdfDoc.source_file_name || `${viewingPdfDoc.doc_number}_Master.docx`}) is securely retained in the Tier 2 Source File Vault.
                    </p>
                  </div>
                </div>

                {/* Footer Notice */}
                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 gap-2">
                  <span>UNCONTROLLED IF PRINTED OR DOWNLOADED • VERIFY CURRENT REVISION IN DCS</span>
                  <span>ISO 9001:2015 COMPLIANT</span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                Status: <strong className="text-emerald-400">Approved & Released Master</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingPdfDoc(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadDocumentFile(viewingPdfDoc.storage_path || '', viewingPdfDoc.pdf_file_name || `${viewingPdfDoc.doc_number}_CONTROLLED.pdf`, viewingPdfDoc.pdf_file_url)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" /> Download Master PDF
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
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-400">{promotingDoc.doc_number}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{promotingDoc.target_revision}</span>
                </div>
                <h4 className="font-bold text-white text-xs">{promotingDoc.title}</h4>
                <div className="text-[11px] text-slate-400 pt-1">
                  Native Master: <strong className="text-slate-200 font-mono">{promotingDoc.source_file_name}</strong>
                </div>
              </div>

              {/* Compilation Method Selector */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromotionMethod('AUTO_COMPILE')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    promotionMethod === 'AUTO_COMPILE'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> Auto-Compile Master PDF (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setPromotionMethod('CUSTOM_UPLOAD')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    promotionMethod === 'CUSTOM_UPLOAD'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Custom PDF
                </button>
              </div>

              {/* Mode 1: Auto-Compile Master PDF */}
              {promotionMethod === 'AUTO_COMPILE' && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-emerald-400 font-bold block text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Clean 1-Click Master PDF Generation
                      </span>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Quality Compass will automatically generate and digitally stamp the official ISO 9001:2015 Clause 7.5 Controlled Master PDF for <strong className="text-white font-mono">{promotingDoc.doc_number} ({promotingDoc.target_revision})</strong> with the official header box, approval authority block, watermark, and revision traceability table.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Master source: {promotingDoc.source_file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePreviewWorkingDocPdf(promotingDoc)}
                      disabled={isCompilingPreview}
                      className="px-3 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-400" /> Preview Generated PDF
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 2: Custom Upload */}
              {promotionMethod === 'CUSTOM_UPLOAD' && (
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    Upload Pre-Compiled Master PDF (.pdf) <span className="text-rose-400">*</span>
                  </label>
                  <div className="border border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-3 bg-slate-950/60 text-center transition-colors">
                    <input
                      ref={promotionPdfInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setPromotionPdfFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => promotionPdfInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto shadow"
                      >
                        <Upload className="w-4 h-4" /> Browse Master PDF (.pdf)
                      </button>
                      <span className="text-blue-400 font-semibold block">
                        {promotionPdfFile 
                          ? promotionPdfFile.name 
                          : promotingDoc.draft_pdf_name 
                          ? `Using attached PDF: ${promotingDoc.draft_pdf_name}` 
                          : 'Select signed PDF exported from Word or Excel'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {promotionPdfFile 
                          ? `${(promotionPdfFile.size / 1024).toFixed(0)} KB ready to release` 
                          : 'Upload approved read-only PDF'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                <div>✓ Generates & publishes approved {promotingDoc.target_revision} Master PDF into Tier 1 Controlled Documents register.</div>
                <div>✓ Archives native source file (`{promotingDoc.source_file_name}`) into Tier 2 Source Vault at {promotingDoc.target_revision}.</div>
                <div>✓ Removes active draft from Tier 3 Working Documents.</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromotingDoc(null)}
                  disabled={isPromoting}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPromoting || (promotionMethod === 'CUSTOM_UPLOAD' && !promotionPdfFile && !promotingDoc.draft_pdf_name)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPromoting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Compiling & Releasing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Authorize & Release {promotingDoc.target_revision} Master PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Check-In Revised Source File from Vault */}
      {checkingInVaultItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                Check-In Revised Native Source File
              </h3>
              <button onClick={() => setCheckingInVaultItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-mono text-xs font-bold text-amber-400">{checkingInVaultItem.doc_number}</span>
                <h4 className="font-bold text-white text-xs">{checkingInVaultItem.title}</h4>
                <div className="text-[11px] text-slate-400">
                  Current Master: <span className="font-mono text-slate-200">{checkingInVaultItem.file_name}</span> ({checkingInVaultItem.revision})
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Incremented Revision Code</label>
                <input
                  type="text"
                  value={checkInNewRev}
                  onChange={(e) => setCheckInNewRev(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Upload Revised File (.docx, .xlsx, .dwg)
                </label>
                <div className="border border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-3 bg-slate-950/60 text-center transition-colors">
                  <input
                    ref={checkInFileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.dwg,.pptx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCheckInRevisedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => checkInFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto shadow"
                    >
                      <Upload className="w-4 h-4" /> Browse Revised File (.docx, .xlsx)
                    </button>
                    <span className="text-amber-300 font-semibold block">
                      {checkInRevisedFile ? checkInRevisedFile.name : 'Choose updated Word or Excel file'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {checkInRevisedFile 
                        ? `${(checkInRevisedFile.size / 1024).toFixed(0)} KB ready to check in` 
                        : 'Select edited file from your machine'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Mandatory Change Summary</label>
                <textarea
                  rows={2}
                  value={checkInChangeSummary}
                  onChange={(e) => setCheckInChangeSummary(e.target.value)}
                  placeholder="Outline what changed in this revision..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckingInVaultItem(null)}
                  disabled={isProcessingCheckIn}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingCheckIn}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  {isProcessingCheckIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Checking in...
                    </>
                  ) : (
                    'Check-In & Create Draft'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Deposit Master Source File into Vault */}
      {isDepositVaultModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                Deposit Native Master File into Vault
              </h3>
              <button onClick={() => setIsDepositVaultModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositVaultSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Select from Repository (or enter custom #)</label>
                <select
                  onChange={(e) => {
                    const match = repositoryCatalog.find((r) => r.doc_number === e.target.value);
                    if (match) {
                      setDepositDocNumber(match.doc_number);
                      setDepositTitle(match.title);
                      setDepositRev(match.current_revision);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs mb-2"
                >
                  <option value="">-- Choose Existing Procedure in Repository --</option>
                  {repositoryCatalog.map((item) => (
                    <option key={item.id} value={item.doc_number}>
                      {item.doc_number} — {item.title} ({item.current_revision})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Document #</label>
                  <input
                    type="text"
                    placeholder="e.g. SOP-QA-001"
                    value={depositDocNumber}
                    onChange={(e) => setDepositDocNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Revision</label>
                  <input
                    type="text"
                    value={depositRev}
                    onChange={(e) => setDepositRev(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Optical Comparator Measurement Protocol"
                  value={depositTitle}
                  onChange={(e) => setDepositTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Native Source File (.docx, .xlsx, .dwg) <span className="text-rose-400">*</span>
                </label>
                <div className="border border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-3 bg-slate-950/60 text-center transition-colors">
                  <input
                    ref={depositFileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.dwg,.pptx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setDepositFile(file);
                        if (!depositTitle) {
                          setDepositTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => depositFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto shadow"
                    >
                      <Upload className="w-4 h-4" /> Browse Word / Excel Master File
                    </button>
                    <span className="text-amber-300 font-semibold block">
                      {depositFile ? depositFile.name : 'Choose master Word or Excel file'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {depositFile ? `${(depositFile.size / 1024).toFixed(0)} KB ready to vault` : 'Select file from disk'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Vault Notes / Context</label>
                <textarea
                  rows={2}
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Master native source file deposited into repository..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDepositVaultModalOpen(false)}
                  disabled={isDepositing}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDepositing || !depositFile}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  {isDepositing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Depositing...
                    </>
                  ) : (
                    'Deposit to Vault'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Start Working Draft (Tier 3 Sandbox) */}
      {isAddWorkingDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Start Working Draft
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tier 3 isolated drafting workspace for MS Word (.docx) & Excel (.xlsx) native files.
                </p>
              </div>
              <button 
                onClick={() => setIsAddWorkingDocModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={handleSwitchToSelectRepoMode}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  workingDocMode === 'SELECT_REPO'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Select from Repository Catalog
              </button>
              <button
                type="button"
                onClick={handleSwitchToNewDocMode}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  workingDocMode === 'NEW_DOC'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" /> Create Brand-New Document
              </button>
            </div>

            <form onSubmit={handleCreateWorkingDoc} className="space-y-4 text-xs">
              {/* Mode 1: Select from Repository */}
              {workingDocMode === 'SELECT_REPO' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">
                      Select Master Procedure or Form from Repository <span className="text-purple-400">*</span>
                    </label>
                    <select
                      value={selectedRepoDocId}
                      onChange={(e) => handleSelectRepositoryDoc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                      required
                    >
                      {repositoryCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.doc_number} — {item.title} ({item.current_revision}) {item.has_vault_master ? '• [In Vault]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Item Info Card */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-400">{newWorkingDoc.doc_number}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Target Revision:</span>
                        <input
                          type="text"
                          value={newWorkingDoc.target_revision || ''}
                          onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, target_revision: e.target.value }))}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-xs w-20 text-center"
                          required
                        />
                      </div>
                    </div>
                    <div className="font-semibold text-white text-xs">{newWorkingDoc.title}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-800 rounded">{newWorkingDoc.category}</span>
                      <span>Department: {newWorkingDoc.department}</span>
                    </div>

                    {/* Master Native Source Vault Status */}
                    <div className="pt-2 border-t border-slate-800/80">
                      {repositoryCatalog.find((r) => r.id === selectedRepoDocId)?.has_vault_master ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Master source exists in Tier 2 Vault:</span>
                            <span className="font-mono text-slate-200">
                              {repositoryCatalog.find((r) => r.id === selectedRepoDocId)?.source_file_name}
                            </span>
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={useVaultBaseline}
                              onChange={(e) => setUseVaultBaseline(e.target.checked)}
                              className="rounded border-slate-700 text-purple-600 focus:ring-0"
                            />
                            <span>Branch revision from this existing vault master (or upload an updated file below)</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Standard enterprise baseline. Upload your native authoring file (.docx, .xlsx) below.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Brand-New Document */}
              {workingDocMode === 'NEW_DOC' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">
                        Document # <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SOP-QUA-015"
                        value={newWorkingDoc.doc_number || ''}
                        onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, doc_number: e.target.value.toUpperCase() }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">
                        Initial Revision <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={newWorkingDoc.target_revision || 'Rev A'}
                        onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, target_revision: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">
                      Document Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CNC Optical Coordinate Measuring Inspection Procedure"
                      value={newWorkingDoc.title || ''}
                      onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">Category</label>
                      <select
                        value={newWorkingDoc.category || 'SOP'}
                        onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, category: e.target.value as DocumentCategory }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">Department</label>
                      <select
                        value={newWorkingDoc.department || 'Quality Assurance'}
                        onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, department: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        {DEPARTMENTS.filter((d) => d !== 'All Departments').map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Native Authoring File (.docx, .xlsx, .dwg) */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Native Working File (.docx, .xlsx, .dwg)
                  {workingDocMode === 'NEW_DOC' && <span className="text-slate-500 font-normal"> (recommended)</span>}
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingInModal(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDraggingInModal(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingInModal(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      setWorkingDocSourceFile(file);
                      if (workingDocMode === 'NEW_DOC' && !newWorkingDoc.title) {
                        setNewWorkingDoc((prev) => ({
                          ...prev,
                          title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                        }));
                      }
                    }
                  }}
                  className={`border border-dashed rounded-lg p-3 text-center transition-all ${
                    isDraggingInModal
                      ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-500/30'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={workingSourceFileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.dwg,.pptx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setWorkingDocSourceFile(file);
                        if (workingDocMode === 'NEW_DOC' && !newWorkingDoc.title) {
                          setNewWorkingDoc((prev) => ({
                            ...prev,
                            title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                          }));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => workingSourceFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto shadow"
                    >
                      <Upload className="w-4 h-4" /> Browse Files (.docx, .xlsx, .dwg)
                    </button>
                    <span className="text-purple-300 font-semibold block">
                      {workingDocSourceFile 
                        ? workingDocSourceFile.name 
                        : (useVaultBaseline && workingDocMode === 'SELECT_REPO' && repositoryCatalog.find((r) => r.id === selectedRepoDocId)?.has_vault_master)
                        ? `Using existing vault file: ${newWorkingDoc.source_file_name}`
                        : 'Choose MS Word (.docx) or Excel (.xlsx) file to upload'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {workingDocSourceFile
                        ? `${(workingDocSourceFile.size / 1024).toFixed(0)} KB ready to upload to repository`
                        : 'Uploaded directly into storage/working/'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional: Draft Master PDF Upload */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Optional: Draft Master PDF (.pdf) for Preview
                </label>
                <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-2.5 bg-slate-950/40 text-center transition-colors">
                  <input
                    ref={workingDraftPdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setWorkingDocDraftPdfFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => workingDraftPdfInputRef.current?.click()}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 mx-auto flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Attach Draft PDF (.pdf)
                    </button>
                    <span className="text-slate-300 font-medium block">
                      {workingDocDraftPdfFile ? workingDocDraftPdfFile.name : 'Attach compiled draft PDF if available'}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {workingDocDraftPdfFile ? `${(workingDocDraftPdfFile.size / 1024).toFixed(0)} KB attached` : 'Enables inline PDF verification in draft stage'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Author & Change Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Author / Drafter</label>
                  <input
                    type="text"
                    value={newWorkingDoc.author || currentAuthorName}
                    onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, author: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Repository Storage Target</label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-purple-300 truncate">
                    qms-documents/working/{newWorkingDoc.doc_number || 'DOC'}/{newWorkingDoc.target_revision || 'REV'}/
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Change Summary / Purpose of Revision <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newWorkingDoc.change_summary || ''}
                  onChange={(e) => setNewWorkingDoc((prev) => ({ ...prev, change_summary: e.target.value }))}
                  placeholder="Outline the reason for creating or revising this document..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              {/* Lifecycle Info Banner */}
              <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-[11px] text-slate-300 space-y-0.5">
                <span className="text-purple-400 font-semibold block">Tier 3 Sandbox Governance:</span>
                <p className="text-[10px] text-slate-400">
                  This working document is completely isolated from shopfloor controlled documents. It will remain in Tier 3 until promoted and released with an authorized master PDF.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddWorkingDocModalOpen(false)}
                  disabled={isCreatingDraft}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDraft || !newWorkingDoc.doc_number || !newWorkingDoc.title}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingDraft ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading & Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Create Working Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Controlled PDF Creation (Tier 1) */}
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

            <form onSubmit={handleDirectPdfSubmit} className="space-y-4 text-xs">
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
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department</label>
                  <select name="department" defaultValue="Quality Assurance" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {DEPARTMENTS.filter((d) => d !== 'All Departments').map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
              </div>

              {/* Master PDF Upload */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Approved Master PDF (.pdf) <span className="text-rose-400">*</span>
                </label>
                <div className="border border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-3 bg-slate-950/60 text-center transition-colors">
                  <input
                    ref={directPdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setDirectPdfFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => directPdfInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto shadow"
                    >
                      <Upload className="w-4 h-4" /> Browse Master PDF (.pdf)
                    </button>
                    <span className="text-blue-400 font-semibold block">
                      {directPdfFile ? directPdfFile.name : 'Choose finalized controlled PDF'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {directPdfFile ? `${(directPdfFile.size / 1024).toFixed(0)} KB ready to register` : 'Signed and released master PDF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Matching Native Source File Upload */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Optional: Matching Native Source File (.docx, .xlsx, .dwg)
                </label>
                <div className="border border-dashed border-slate-800 hover:border-slate-600 rounded-lg p-2.5 bg-slate-950/40 text-center transition-colors">
                  <input
                    ref={directSourceInputRef}
                    type="file"
                    accept=".docx,.xlsx,.dwg,.pptx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setDirectSourceFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => directSourceInputRef.current?.click()}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 mx-auto flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Select Native Word / Excel File
                    </button>
                    <span className="text-slate-300 font-medium block">
                      {directSourceFile ? directSourceFile.name : 'Attach native authoring file to deposit into Vault'}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {directSourceFile ? `${(directSourceFile.size / 1024).toFixed(0)} KB` : 'Links Tier 1 PDF directly to Tier 2 master'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Approving Owner</label>
                  <input
                    name="owner"
                    type="text"
                    defaultValue={currentAuthorName}
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
                  disabled={isRegisteringDirectPdf}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringDirectPdf}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-semibold shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                >
                  {isRegisteringDirectPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    'Release to Controlled Register'
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
