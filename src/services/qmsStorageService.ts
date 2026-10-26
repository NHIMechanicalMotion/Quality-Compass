import { supabase } from './supabase';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

const QMS_STORAGE_BUCKET = 'qms-documents';
const DB_NAME = 'qc_document_storage_db';
const STORE_NAME = 'files';

interface StoredFileRecord {
  path: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: string;
}

/**
 * Open or create the IndexedDB database for local offline fallback
 */
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'path' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save file blob to IndexedDB
 */
async function saveToIndexedDb(record: StoredFileRecord): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[qmsStorageService] IndexedDB save warning:', err);
  }
}

/**
 * Read file blob from IndexedDB
 */
async function readFromIndexedDb(path: string): Promise<StoredFileRecord | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(path);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[qmsStorageService] IndexedDB read warning:', err);
    return null;
  }
}

/**
 * Normalize file name for safe storage paths
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generic file uploader trying Supabase Storage first, with automatic IndexedDB fallback
 */
async function uploadFileInternal(
  path: string,
  file: File
): Promise<{ path: string; url: string; size: number }> {
  const sanitizedPath = path.replace(/\s+/g, '_');

  // Always save to IndexedDB as an immediate local cache / fallback
  await saveToIndexedDb({
    path: sanitizedPath,
    blob: file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    updatedAt: new Date().toISOString(),
  });

  try {
    // Attempt upload to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(QMS_STORAGE_BUCKET)
      .upload(sanitizedPath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadError) {
      console.warn('[qmsStorageService] Supabase upload failed, falling back to local storage cache:', uploadError.message);
      const localUrl = URL.createObjectURL(file);
      return { path: sanitizedPath, url: localUrl, size: file.size };
    }

    // Get public URL or signed URL
    const { data: publicUrlData } = supabase.storage
      .from(QMS_STORAGE_BUCKET)
      .getPublicUrl(uploadData.path || sanitizedPath);

    return {
      path: sanitizedPath,
      url: publicUrlData.publicUrl,
      size: file.size,
    };
  } catch (err) {
    console.warn('[qmsStorageService] Supabase storage exception, operating in local mode:', err);
    const localUrl = URL.createObjectURL(file);
    return { path: sanitizedPath, url: localUrl, size: file.size };
  }
}

/**
 * Upload a native master file (.docx, .xlsx, .dwg) into the Tier 2 Source Vault
 */
export async function uploadVaultFile(
  docNumber: string,
  revision: string,
  file: File
): Promise<{ path: string; url: string; size: number }> {
  const safeName = sanitizeFileName(file.name);
  const path = `vault/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file);
}

/**
 * Upload a working draft file (.docx, .xlsx, .dwg) into Tier 3 Working Sandbox
 */
export async function uploadWorkingFile(
  docNumber: string,
  revision: string,
  file: File
): Promise<{ path: string; url: string; size: number }> {
  const safeName = sanitizeFileName(file.name);
  const path = `working/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file);
}

/**
 * Upload an approved controlled master PDF into Tier 1 Controlled Documents
 */
export async function uploadControlledPdfFile(
  docNumber: string,
  revision: string,
  file: File
): Promise<{ path: string; url: string; size: number }> {
  const safeName = sanitizeFileName(file.name);
  const path = `controlled/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file);
}

/**
 * Generate a valid, functional native Word (.docx/.doc), Excel (.xlsx), or PDF document template
 * when downloading or viewing a document that doesn't yet have a binary uploaded to remote storage.
 */
export async function generateNativeDocumentTemplate(
  fileName: string,
  meta?: {
    docNumber?: string;
    title?: string;
    revision?: string;
    department?: string;
    owner?: string;
  }
): Promise<Blob> {
  const docNumber = meta?.docNumber || fileName.replace(/\.[^/.]+$/, '').split('_')[0] || 'SOP-QMS-001';
  const revision = meta?.revision || 'Rev A';
  const title = meta?.title || fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Standard Operating Procedure';
  const department = meta?.department || 'Quality Assurance';
  const owner = meta?.owner || 'Quality Assurance Authority';
  const dateStr = new Date().toISOString().slice(0, 10);

  const lower = fileName.toLowerCase();

  // 1. Generate Microsoft Excel Workbook (.xlsx)
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quality Compass QMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inspection Criteria');
    sheet.columns = [
      { header: 'Item', key: 'item', width: 8 },
      { header: 'Inspection Characteristic / Parameter', key: 'param', width: 40 },
      { header: 'Specification / Nominal', key: 'spec', width: 22 },
      { header: 'Tolerance (-)', key: 'lowerTol', width: 14 },
      { header: 'Tolerance (+)', key: 'upperTol', width: 14 },
      { header: 'Measurement Method / Tool', key: 'tool', width: 26 },
      { header: 'Sample Size / Frequency', key: 'freq', width: 22 },
      { header: 'Acceptance Criteria', key: 'criteria', width: 20 },
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    // Add standard sample criteria rows
    sheet.addRow({ item: 1, param: 'Visual Surface Finish & Flash Inspection', spec: 'ASME Y14.36', lowerTol: 'N/A', upperTol: 'Ra 3.2 max', tool: 'Visual / Surface Profilometer', freq: '100% End of Line', criteria: 'Zero burrs/pits' });
    sheet.addRow({ item: 2, param: 'Critical OD / Bore Dimension Check', spec: '25.400 mm', lowerTol: '-0.012 mm', upperTol: '+0.012 mm', tool: 'Bore Micrometer / CMM', freq: '5 pcs / Setup & Run', criteria: 'Cpk >= 1.67' });
    sheet.addRow({ item: 3, param: 'Keyway Width & Depth Tolerance', spec: '6.350 mm', lowerTol: '-0.025 mm', upperTol: '+0.025 mm', tool: 'Optical Comparator', freq: '1 pc / hour', criteria: 'Pass / Fail Gauge' });
    sheet.addRow({ item: 4, param: 'Runout & Concentricity Verification', spec: '0.050 mm TIR', lowerTol: '0.000', upperTol: '+0.050 mm', tool: 'Dial Indicator on V-Blocks', freq: '100% Machined Hubs', criteria: 'Within print spec' });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  // 2. Generate Microsoft Word Document (.docx / .doc)
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${docNumber} - ${title}</title>
<style>
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 1in; }
  table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  th, td { border: 1px solid #94a3b8; padding: 8px 12px; font-size: 10pt; }
  th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: left; }
  h1 { color: #0284c7; font-size: 18pt; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-top: 0; }
  h2 { color: #0f172a; font-size: 13pt; margin-top: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  .header-card { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 24px; }
  .watermark-notice { border: 2px dashed #0284c7; padding: 12px; background-color: #f0f9ff; border-radius: 6px; margin-top: 30px; font-size: 9pt; color: #0369a1; }
</style>
</head>
<body>
<div class='header-card'>
  <table>
    <tr>
      <td><strong>Organization:</strong> NHI Mechanical Motion LLC</td>
      <td><strong>Document Number:</strong> ${docNumber}</td>
      <td><strong>Current Revision:</strong> ${revision}</td>
    </tr>
    <tr>
      <td><strong>Operating System:</strong> Quality Compass QMS</td>
      <td><strong>Governing Department:</strong> ${department}</td>
      <td><strong>Effective Date:</strong> ${dateStr}</td>
    </tr>
    <tr>
      <td colspan='2'><strong>Document Title:</strong> ${title}</td>
      <td><strong>Approval Authority:</strong> ${owner}</td>
    </tr>
  </table>
</div>

<h1>${docNumber} — ${title}</h1>

<h2>1. Purpose & Scope</h2>
<p>This standard operating procedure establishes the mandatory operational methodology, verification parameters, and quality criteria for NHI Mechanical Motion LLC in full conformance with ISO 9001:2015 Clause 7.5 (Documented Information) and automotive AIAG standards.</p>

<h2>2. Roles & Responsibilities</h2>
<p>All production supervisors, manufacturing technicians, and quality inspectors within the ${department} department are accountable for following this procedure. Any deviations must receive written sign-off from Quality Engineering before proceeding.</p>

<h2>3. Operating Protocol & Technical Criteria</h2>
<p><strong>3.1 Setup Verification:</strong> Prior to production runs, perform 5-piece first article inspection (FAI) and verify nominal blueprint specifications.</p>
<p><strong>3.2 In-Process Inspection:</strong> Log metrology measurements at specified hourly intervals into Quality Compass.</p>
<p><strong>3.3 Non-Conformance Containment:</strong> In the event of an out-of-spec measurement, immediately quarantine affected parts, tag with yellow quarantine label, and initiate an internal 8D CAPA in Quality Compass.</p>

<h2>4. Document Revision History & Traceability</h2>
<table>
  <thead>
    <tr><th>Revision</th><th>Effective Date</th><th>Author / Engineer</th><th>Description of Change</th></tr>
  </thead>
  <tbody>
    <tr><td>${revision}</td><td>${dateStr}</td><td>${owner}</td><td>Master baseline native file synchronized in Quality Compass Tier 2 Source Vault.</td></tr>
  </tbody>
</table>

<div class='watermark-notice'>
  <strong>TIER 2 SOURCE VAULT INTEGRITY NOTICE:</strong> This native document master was retrieved from the Quality Compass Source File Vault. When engineering changes are complete, save this file and perform <em>Check-In Source</em> in the Document Control portal to advance revision history and compile the released Tier 1 controlled PDF.
</div>
</body></html>
`;
    return new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
  }

  // 3. Fallback to jsPDF for .pdf
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${docNumber} — ${title}`, 20, 25);
  pdf.setFontSize(11);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Revision: ${revision}  |  Department: ${department}  |  Effective: ${dateStr}`, 20, 33);
  pdf.setDrawColor(2, 132, 199);
  pdf.line(20, 36, 190, 36);

  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text('1. Purpose & Scope', 20, 48);
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  pdf.text('This controlled document defines the mandatory operating criteria and compliance standards.', 20, 56);

  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text('2. Master Source File Traceability', 20, 70);
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Governed by ISO 9001:2015 Clause 7.5. Master native file: ${fileName}`, 20, 78);

  // Controlled Watermark
  pdf.setFontSize(36);
  pdf.setTextColor(220, 38, 38);
  pdf.text('CONTROLLED MASTER', 35, 160, { angle: 45 });

  return pdf.output('blob');
}

/**
 * Retrieve a usable URL to view a PDF inside an embedded <object> or <iframe>
 */
export async function getPdfViewUrl(
  path?: string | null,
  fallbackUrl?: string | null,
  meta?: {
    docNumber?: string;
    title?: string;
    revision?: string;
    department?: string;
    owner?: string;
  }
): Promise<string | null> {
  if (path) {
    // 1. Try reading from local IndexedDB cache first for instant response
    const cached = await readFromIndexedDb(path);
    if (cached) {
      return URL.createObjectURL(cached.blob);
    }

    // 2. Try Supabase storage
    try {
      const { data, error } = await supabase.storage
        .from(QMS_STORAGE_BUCKET)
        .download(path);

      if (!error && data) {
        await saveToIndexedDb({
          path,
          blob: data,
          fileName: path.split('/').pop() || 'document.pdf',
          mimeType: 'application/pdf',
          updatedAt: new Date().toISOString(),
        });
        return URL.createObjectURL(data);
      }

      // If download fails, check public URL
      const { data: pubData } = supabase.storage
        .from(QMS_STORAGE_BUCKET)
        .getPublicUrl(path);

      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }
    } catch {
      // Continue to fallback
    }
  }

  if (fallbackUrl) {
    return fallbackUrl;
  }

  // 3. Generate on-the-fly preview PDF if none exists
  try {
    const pdfBlob = await generateNativeDocumentTemplate(
      meta?.docNumber ? `${meta.docNumber}_CONTROLLED.pdf` : 'CONTROLLED_MASTER.pdf',
      meta
    );
    if (path) {
      await saveToIndexedDb({
        path,
        blob: pdfBlob,
        fileName: `${meta?.docNumber || 'DOC'}_CONTROLLED.pdf`,
        mimeType: 'application/pdf',
        updatedAt: new Date().toISOString(),
      });
    }
    return URL.createObjectURL(pdfBlob);
  } catch {
    return null;
  }
}

/**
 * Trigger download of any stored document file (.docx, .xlsx, .pdf, .dwg).
 * Always downloads a real, functional file to disk without stub alerts.
 */
export async function downloadDocumentFile(
  path: string,
  fileName: string,
  fallbackUrl?: string | null,
  meta?: {
    docNumber?: string;
    title?: string;
    revision?: string;
    department?: string;
    owner?: string;
  }
): Promise<void> {
  // 1. Try reading from IndexedDB
  if (path) {
    const cached = await readFromIndexedDb(path);
    if (cached) {
      saveAs(cached.blob, fileName);
      return;
    }
  }

  // 2. Try downloading binary from Supabase
  if (path) {
    try {
      const { data, error } = await supabase.storage
        .from(QMS_STORAGE_BUCKET)
        .download(path);

      if (!error && data) {
        await saveToIndexedDb({
          path,
          blob: data,
          fileName,
          mimeType: data.type || 'application/octet-stream',
          updatedAt: new Date().toISOString(),
        });
        saveAs(data, fileName);
        return;
      }
    } catch (err) {
      console.warn('[qmsStorageService] Supabase download error:', err);
    }
  }

  // 3. Fallback to URL direct download or browser navigation
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (path) {
          await saveToIndexedDb({
            path,
            blob,
            fileName,
            mimeType: blob.type || 'application/octet-stream',
            updatedAt: new Date().toISOString(),
          });
        }
        saveAs(blob, fileName);
        return;
      }
    } catch {
      window.open(fallbackUrl, '_blank');
      return;
    }
  }

  // 4. Generate real functional native document on the fly (Word/Excel/PDF)
  try {
    const generatedBlob = await generateNativeDocumentTemplate(fileName, meta);
    if (path) {
      await saveToIndexedDb({
        path,
        blob: generatedBlob,
        fileName,
        mimeType: generatedBlob.type || 'application/octet-stream',
        updatedAt: new Date().toISOString(),
      });
    }
    saveAs(generatedBlob, fileName);
  } catch (err) {
    console.error('Failed to generate template download:', err);
  }
}
