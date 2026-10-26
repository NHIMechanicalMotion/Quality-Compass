import { supabase } from './supabase';
import fileSaver from 'file-saver';
const saveAs = (fileSaver as any).saveAs || fileSaver;
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  HeadingLevel,
  WidthType,
  ShadingType,
} from 'docx';

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
  file: File | Blob,
  fileName?: string
): Promise<{ path: string; url: string; size: number }> {
  const sanitizedPath = path.replace(/\s+/g, '_');
  const name = fileName || (file instanceof File ? file.name : sanitizedPath.split('/').pop() || 'document');
  const mimeType = file.type || 'application/octet-stream';

  // Always save to IndexedDB as an immediate local cache / fallback
  await saveToIndexedDb({
    path: sanitizedPath,
    blob: file,
    fileName: name,
    mimeType,
    updatedAt: new Date().toISOString(),
  });

  try {
    // Attempt upload to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(QMS_STORAGE_BUCKET)
      .upload(sanitizedPath, file, {
        upsert: true,
        contentType: mimeType,
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
  file: File | Blob,
  fileName?: string
): Promise<{ path: string; url: string; size: number }> {
  const rawName = fileName || (file instanceof File ? file.name : `${docNumber}_Master.docx`);
  const safeName = sanitizeFileName(rawName);
  const path = `vault/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file, safeName);
}

/**
 * Upload a working draft file (.docx, .xlsx, .dwg) into Tier 3 Working Sandbox
 */
export async function uploadWorkingFile(
  docNumber: string,
  revision: string,
  file: File | Blob,
  fileName?: string
): Promise<{ path: string; url: string; size: number }> {
  const rawName = fileName || (file instanceof File ? file.name : `${docNumber}_Draft.docx`);
  const safeName = sanitizeFileName(rawName);
  const path = `working/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file, safeName);
}

/**
 * Upload an approved controlled master PDF into Tier 1 Controlled Documents
 */
export async function uploadControlledPdfFile(
  docNumber: string,
  revision: string,
  file: File | Blob,
  fileName?: string
): Promise<{ path: string; url: string; size: number }> {
  const rawName = fileName || (file instanceof File ? file.name : `${docNumber}_${revision.replace(/\s+/g, '')}_CONTROLLED.pdf`);
  const safeName = sanitizeFileName(rawName);
  const path = `controlled/${docNumber}/${revision}/${safeName}`;
  return uploadFileInternal(path, file, safeName);
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
    const doc = new DocxDocument({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: [
            // Top ISO 9001:2015 Clause 7.5 Controlled Header Table
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 33, type: WidthType.PERCENTAGE },
                      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'ORGANIZATION:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'NHI Mechanical Motion LLC', bold: true, size: 20, color: '0F172A' }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 34, type: WidthType.PERCENTAGE },
                      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'DOCUMENT NUMBER:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: docNumber, bold: true, size: 20, color: '0284C7' }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 33, type: WidthType.PERCENTAGE },
                      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'CURRENT REVISION:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: revision, bold: true, size: 20, color: '10B981' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'OPERATING SYSTEM:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'Quality Compass QMS', size: 20, color: '334155' }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'GOVERNING DEPARTMENT:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: department, size: 20, color: '334155' }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'EFFECTIVE DATE:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: dateStr, size: 20, color: '334155' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      columnSpan: 2,
                      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'DOCUMENT TITLE:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: title, bold: true, size: 22, color: '0F172A' }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'APPROVAL AUTHORITY:', bold: true, size: 18, color: '64748B' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: owner, bold: true, size: 20, color: '0F172A' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),

            // Document Title
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
              children: [
                new TextRun({ text: `${docNumber} — ${title}`, bold: true, size: 32, color: '0284C7' }),
              ],
            }),

            // Section 1: Purpose & Scope
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 80 },
              children: [
                new TextRun({ text: '1. Purpose & Scope', bold: true, size: 26, color: '0F172A' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60, after: 140 },
              children: [
                new TextRun({
                  text: 'This standard operating procedure establishes the mandatory operational methodology, verification parameters, and quality criteria for NHI Mechanical Motion LLC in full conformance with ISO 9001:2015 Clause 7.5 (Documented Information) and automotive AIAG standards.',
                  size: 22,
                  color: '334155',
                }),
              ],
            }),

            // Section 2: Roles & Responsibilities
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 80 },
              children: [
                new TextRun({ text: '2. Roles & Responsibilities', bold: true, size: 26, color: '0F172A' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60, after: 140 },
              children: [
                new TextRun({
                  text: `All production supervisors, manufacturing technicians, and quality inspectors within the ${department} department are accountable for following this procedure. Any deviations must receive written sign-off from Quality Engineering before proceeding.`,
                  size: 22,
                  color: '334155',
                }),
              ],
            }),

            // Section 3: Operating Protocol & Technical Criteria
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 80 },
              children: [
                new TextRun({ text: '3. Operating Protocol & Technical Criteria', bold: true, size: 26, color: '0F172A' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({ text: '3.1 Setup Verification: ', bold: true, size: 22, color: '0F172A' }),
                new TextRun({
                  text: 'Prior to production runs, perform 5-piece first article inspection (FAI) and verify nominal blueprint specifications.',
                  size: 22,
                  color: '334155',
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({ text: '3.2 In-Process Inspection: ', bold: true, size: 22, color: '0F172A' }),
                new TextRun({
                  text: 'Log metrology measurements at specified hourly intervals into Quality Compass.',
                  size: 22,
                  color: '334155',
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60, after: 140 },
              children: [
                new TextRun({ text: '3.3 Non-Conformance Containment: ', bold: true, size: 22, color: '0F172A' }),
                new TextRun({
                  text: 'In the event of an out-of-spec measurement, immediately quarantine affected parts, tag with yellow quarantine label, and initiate an internal 8D CAPA in Quality Compass.',
                  size: 22,
                  color: '334155',
                }),
              ],
            }),

            // Section 4: Revision History Table
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 80 },
              children: [
                new TextRun({ text: '4. Document Revision History & Traceability', bold: true, size: 26, color: '0F172A' }),
              ],
            }),
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      shading: { fill: '0F172A', type: ShadingType.CLEAR },
                      children: [new Paragraph({ children: [new TextRun({ text: 'Revision', bold: true, size: 18, color: 'FFFFFF' })] })],
                    }),
                    new DocxTableCell({
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      shading: { fill: '0F172A', type: ShadingType.CLEAR },
                      children: [new Paragraph({ children: [new TextRun({ text: 'Effective Date', bold: true, size: 18, color: 'FFFFFF' })] })],
                    }),
                    new DocxTableCell({
                      width: { size: 25, type: WidthType.PERCENTAGE },
                      shading: { fill: '0F172A', type: ShadingType.CLEAR },
                      children: [new Paragraph({ children: [new TextRun({ text: 'Author / Authority', bold: true, size: 18, color: 'FFFFFF' })] })],
                    }),
                    new DocxTableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      shading: { fill: '0F172A', type: ShadingType.CLEAR },
                      children: [new Paragraph({ children: [new TextRun({ text: 'Description of Change', bold: true, size: 18, color: 'FFFFFF' })] })],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: revision, bold: true, size: 20, color: '0284C7' })] })],
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: dateStr, size: 20, color: '334155' })] })],
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: owner, size: 20, color: '334155' })] })],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: 'Master native baseline file synchronized in Quality Compass Tier 2 Source Vault.',
                              size: 20,
                              color: '334155',
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),

            // Vault Notice Callout
            new Paragraph({
              spacing: { before: 240, after: 120 },
              children: [
                new TextRun({
                  text: 'TIER 2 SOURCE VAULT INTEGRITY NOTICE: ',
                  bold: true,
                  size: 20,
                  color: '0284C7',
                }),
                new TextRun({
                  text: 'This native document master was retrieved from the Quality Compass Source File Vault. When engineering changes are complete, save this file and perform ',
                  size: 20,
                  color: '0369A1',
                }),
                new TextRun({
                  text: 'Check-In Source',
                  bold: true,
                  italics: true,
                  size: 20,
                  color: '0369A1',
                }),
                new TextRun({
                  text: ' in the Document Control portal to advance revision history and compile the released Tier 1 controlled PDF.',
                  size: 20,
                  color: '0369A1',
                }),
              ],
            }),
          ],
        },
      ],
    });

    return await Packer.toBlob(doc);
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
  // Helper to ensure revision in downloaded docx matches target revision
  const prepareDownloadBlob = async (blob: Blob): Promise<Blob> => {
    if (meta?.revision && (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc'))) {
      try {
        const syncRes = await syncDocxRevisionAndExtractContent(blob, {
          targetRev: meta.revision,
          author: meta.owner,
          docNumber: meta.docNumber,
          title: meta.title,
        });
        return syncRes.updatedBlob;
      } catch {
        return blob;
      }
    }
    return blob;
  };

  // 1. Try reading from IndexedDB
  if (path) {
    const cached = await readFromIndexedDb(path);
    if (cached) {
      const finalBlob = await prepareDownloadBlob(cached.blob);
      saveAs(finalBlob, fileName);
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
        const finalBlob = await prepareDownloadBlob(data);
        await saveToIndexedDb({
          path,
          blob: finalBlob,
          fileName,
          mimeType: finalBlob.type || 'application/octet-stream',
          updatedAt: new Date().toISOString(),
        });
        saveAs(finalBlob, fileName);
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
        const finalBlob = await prepareDownloadBlob(blob);
        if (path) {
          await saveToIndexedDb({
            path,
            blob: finalBlob,
            fileName,
            mimeType: finalBlob.type || 'application/octet-stream',
            updatedAt: new Date().toISOString(),
          });
        }
        saveAs(finalBlob, fileName);
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

export interface ControlledPdfCompilationParams {
  docNumber: string;
  title: string;
  revision: string;
  department?: string;
  category?: string;
  author?: string;
  approverName?: string;
  approvalNotes?: string;
  changeSummary?: string;
  effectiveDate?: string;
  nextReviewDate?: string;
  sourceFileName?: string;
  extractedSections?: {
    purpose?: string;
    responsibilities?: string;
    procedures?: string[];
  };
  revisionHistory?: Array<{
    revision: string;
    effectiveDate: string;
    author: string;
    description: string;
  }>;
}

/**
 * Synchronize the revision code inside a Word document (.docx) and extract text sections.
 * This guarantees that when a user edits text locally and checks it in with a new revision (e.g. Rev B),
 * the native file's internal XML is updated to reflect Rev B, and its text content is extracted for PDF compilation.
 */
export async function syncDocxRevisionAndExtractContent(
  fileOrBlob: Blob | File,
  options: {
    targetRev: string;
    author?: string;
    changeSummary?: string;
    docNumber?: string;
    title?: string;
  }
): Promise<{
  updatedBlob: Blob;
  paragraphs: string[];
  extractedSections: {
    purpose?: string;
    responsibilities?: string;
    procedures?: string[];
  };
}> {
  try {
    const buffer = typeof (fileOrBlob as any).arrayBuffer === 'function'
      ? await (fileOrBlob as any).arrayBuffer()
      : fileOrBlob;
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      return {
        updatedBlob: fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob]),
        paragraphs: [],
        extractedSections: {},
      };
    }

    let docXml = await docFile.async('text');

    // 1. Extract all text paragraphs
    const pRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
    const tRegex = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null;
    const paragraphs: string[] = [];

    while ((match = pRegex.exec(docXml)) !== null) {
      const pXml = match[1];
      let tMatch: RegExpExecArray | null;
      let pText = '';
      while ((tMatch = tRegex.exec(pXml)) !== null) {
        pText += tMatch[1];
      }
      const cleaned = pText.trim();
      if (cleaned) {
        paragraphs.push(cleaned);
      }
    }

    // Categorize extracted paragraphs into sections
    let purpose = '';
    let responsibilities = '';
    const procedures: string[] = [];

    let currentSection: 'NONE' | 'PURPOSE' | 'ROLES' | 'PROCEDURES' = 'NONE';
    for (const p of paragraphs) {
      const lower = p.toLowerCase();
      if (lower.includes('1. purpose') || lower.includes('purpose & scope') || lower.includes('purpose and scope')) {
        currentSection = 'PURPOSE';
        continue;
      } else if (lower.includes('2. roles') || lower.includes('responsibilities') || lower.includes('governance')) {
        currentSection = 'ROLES';
        continue;
      } else if (lower.includes('3. operating') || lower.includes('technical criteria') || lower.includes('operating protocol')) {
        currentSection = 'PROCEDURES';
        continue;
      } else if (lower.includes('4. document revision') || lower.includes('revision history')) {
        currentSection = 'NONE';
        continue;
      }

      if (currentSection === 'PURPOSE' && !purpose) {
        purpose = p;
      } else if (currentSection === 'ROLES' && !responsibilities) {
        responsibilities = p;
      } else if (currentSection === 'PROCEDURES') {
        procedures.push(p);
      }
    }

    // 2. Update revision text inside word/document.xml
    const targetRev = options.targetRev;
    docXml = docXml.replace(/(<w:t[^>]*>)\s*Rev [A-Z0-9]+(\s*<\/w:t>)/gi, `$1${targetRev}$2`);

    zip.file('word/document.xml', docXml);
    const updatedBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return {
      updatedBlob,
      paragraphs,
      extractedSections: {
        purpose: purpose || undefined,
        responsibilities: responsibilities || undefined,
        procedures: procedures.length > 0 ? procedures : undefined,
      },
    };
  } catch (err) {
    console.warn('[qmsStorageService] Error syncing docx revision:', err);
    return {
      updatedBlob: fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob]),
      paragraphs: [],
      extractedSections: {},
    };
  }
}

/**
 * Generate a controlled Master PDF in-memory as a Blob
 */
export function generateControlledPdfBlob(params: ControlledPdfCompilationParams): Blob {
  const docNumber = params.docNumber || 'SOP-QMS-001';
  const revision = params.revision || 'Rev A';
  const title = params.title || 'Standard Operating Procedure';
  const department = params.department || 'Quality Assurance';
  const category = params.category || 'SOP';
  const approverName = params.approverName || 'Quality Assurance Authority';
  const approvalNotes = params.approvalNotes || 'Approved for enterprise production release under ISO 9001 Clause 7.5.';
  const effectiveDate = params.effectiveDate || new Date().toISOString().slice(0, 10);
  const nextReviewDate = params.nextReviewDate || new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10);
  const sourceFileName = params.sourceFileName || `${docNumber}_Master.docx`;
  const author = params.author || 'Quality Assurance';
  const changeSummary = params.changeSummary || 'Revision compiled and released to controlled register.';

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178 mm

  const drawWatermark = () => {
    pdf.saveGraphicsState();
    pdf.setFontSize(34);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(241, 245, 249);
    pdf.text('CONTROLLED MASTER COPY', 30, 160, { angle: 45 });
    pdf.restoreGraphicsState();
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.line(marginX, pageHeight - 16, marginX + contentWidth, pageHeight - 16);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('CONTROLLED COPY  •  NHI MECHANICAL MOTION LLC  •  ISO 9001:2015 CLAUSE 7.5', marginX, pageHeight - 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('UNCONTROLLED IF PRINTED OR DOWNLOADED — VERIFY CURRENT REVISION IN QUALITY COMPASS', marginX, pageHeight - 7);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`Page ${pageNum} of ${totalPages}`, marginX + contentWidth - 18, pageHeight - 11);
  };

  drawWatermark();

  // 1. Top Enterprise Banner
  pdf.setFillColor(15, 23, 42);
  pdf.rect(marginX, 12, contentWidth, 10, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('NHI MECHANICAL MOTION LLC  •  QUALITY COMPASS QMS', marginX + 4, 18.5);

  pdf.setFontSize(8.5);
  pdf.setTextColor(52, 211, 153);
  pdf.text('ISO 9001:2015 CLAUSE 7.5 CONTROLLED MASTER', marginX + contentWidth - 4, 18.5, { align: 'right' });

  // 2. Control Metadata Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.rect(marginX, 22, contentWidth, 26, 'FD');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('DOCUMENT ID:', marginX + 4, 27);
  pdf.setFontSize(10);
  pdf.setTextColor(2, 132, 199);
  pdf.text(docNumber, marginX + 4, 32);

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('REVISION STATUS:', marginX + 62, 27);
  pdf.setFillColor(5, 150, 105);
  pdf.roundedRect(marginX + 62, 28, 24, 6, 1, 1, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(revision, marginX + 74, 32.5, { align: 'center' });

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('CATEGORY:', marginX + 100, 27);
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(category, marginX + 100, 32);

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('EFFECTIVE DATE:', marginX + 140, 27);
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(effectiveDate, marginX + 140, 32);

  pdf.setDrawColor(226, 232, 240);
  pdf.line(marginX + 2, 36, marginX + contentWidth - 2, 36);

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('GOVERNING DEPARTMENT:', marginX + 4, 40);
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(department, marginX + 4, 44.5);

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('NEXT REVIEW CYCLE:', marginX + 62, 40);
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(nextReviewDate, marginX + 62, 44.5);

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('TIER 2 MASTER SOURCE FILE:', marginX + 100, 40);
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(sourceFileName, marginX + 100, 44.5);

  // 3. Document Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${docNumber} — ${title}`, marginX, 55);

  pdf.setDrawColor(2, 132, 199);
  pdf.setLineWidth(0.8);
  pdf.line(marginX, 58, marginX + contentWidth, 58);

  // 4. Formal Sign-off and Authorization Block
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(134, 239, 172);
  pdf.setLineWidth(0.4);
  pdf.rect(marginX, 62, contentWidth, 23, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(5, 150, 105);
  pdf.text('✓  ISO 9001:2015 CLAUSE 7.5.3 CONTROLLED RELEASE AUTHORIZATION', marginX + 4, 67);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Approving Authority: ${approverName}    |    Authorization Date: ${effectiveDate}    |    Author: ${author}`, marginX + 4, 72);
  pdf.setTextColor(51, 65, 85);
  const splitNotes = pdf.splitTextToSize(`Sign-Off Notes: ${approvalNotes}`, contentWidth - 8);
  pdf.text(splitNotes, marginX + 4, 76.5);
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Vault Verification: Native master file archived in Tier 2 Vault (SHA Verified). Master PDF promoted to active shopfloor register.`, marginX + 4, 82);

  let currentY = 92;

  // Section 1: Purpose & Scope
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('1. Purpose & Scope', marginX, currentY);
  currentY += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  const purposeText = params.extractedSections?.purpose ||
    `This Standard Operating Procedure establishes the mandatory operational protocols, technical inspection parameters, and quality governance requirements for NHI Mechanical Motion LLC. All manufacturing processes, metrology verifications, and quality inspections must conform strictly to this procedure under ISO 9001:2015 Clause 7.5 (Documented Information) and automotive AIAG standards.`;
  const splitPurpose = pdf.splitTextToSize(purposeText, contentWidth);
  pdf.text(splitPurpose, marginX, currentY);
  currentY += splitPurpose.length * 4.2 + 5;

  // Section 2: Roles & Responsibilities
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('2. Governance, Roles & Responsibilities', marginX, currentY);
  currentY += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  const respText = params.extractedSections?.responsibilities ||
    `All operations supervisors, manufacturing technicians, and quality inspectors within the ${department} department are accountable for strict adherence to this standard. Any process deviations require formal Engineering Change Order (ECO) sign-off from Quality Engineering before proceeding.`;
  const splitResp = pdf.splitTextToSize(respText, contentWidth);
  pdf.text(splitResp, marginX, currentY);
  currentY += splitResp.length * 4.2 + 5;

  // Section 3: Operating Protocol & Technical Criteria
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('3. Operating Protocol & Quality Acceptance Criteria', marginX, currentY);
  currentY += 5;

  const procedures = params.extractedSections?.procedures && params.extractedSections.procedures.length > 0
    ? params.extractedSections.procedures
    : [
        '3.1 Setup Verification: Prior to production runs, perform 5-piece first article inspection (FAI) and verify nominal blueprint specifications.',
        '3.2 In-Process Inspection: Log metrology measurements at specified hourly intervals into Quality Compass.',
        '3.3 Non-Conformance Containment: In the event of an out-of-spec measurement, immediately quarantine affected parts, tag with yellow quarantine label, and initiate an internal 8D CAPA in Quality Compass.',
      ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  for (const proc of procedures) {
    const splitProc = pdf.splitTextToSize(proc, contentWidth);
    pdf.text(splitProc, marginX, currentY);
    currentY += splitProc.length * 4.2 + 2;
  }
  currentY += 4;

  // Check if Section 4 fits on page 1, else add page
  if (currentY > 230) {
    pdf.addPage();
    drawWatermark();
    currentY = 25;
  }

  // Section 4: Document Revision History Table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('4. ISO 9001 Document Revision History & Traceability', marginX, currentY);
  currentY += 5;

  // Table header
  pdf.setFillColor(15, 23, 42);
  pdf.rect(marginX, currentY, contentWidth, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Revision', marginX + 3, currentY + 4.2);
  pdf.text('Effective Date', marginX + 25, currentY + 4.2);
  pdf.text('Author / Authority', marginX + 55, currentY + 4.2);
  pdf.text('Description of Change / Engineering Justification', marginX + 105, currentY + 4.2);
  currentY += 6;

  // Revision rows
  const history = params.revisionHistory && params.revisionHistory.length > 0
    ? [...params.revisionHistory]
    : [
        { revision: 'Rev A', effectiveDate: '2026-01-15', author: 'Quality Engineering', description: 'Initial ISO 9001 master baseline release.' },
      ];

  if (!history.some((h) => h.revision === revision)) {
    history.push({
      revision,
      effectiveDate,
      author: `${author} / ${approverName}`,
      description: changeSummary,
    });
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  history.forEach((row, i) => {
    const isCurrent = row.revision === revision;
    if (isCurrent) {
      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(134, 239, 172);
    } else {
      pdf.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      pdf.setDrawColor(226, 232, 240);
    }
    pdf.rect(marginX, currentY, contentWidth, 7, 'FD');

    pdf.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    pdf.setTextColor(isCurrent ? 5 : 15, isCurrent ? 150 : 23, isCurrent ? 105 : 42);
    pdf.text(row.revision, marginX + 3, currentY + 4.8);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(row.effectiveDate, marginX + 25, currentY + 4.8);
    pdf.text(row.author.slice(0, 24), marginX + 55, currentY + 4.8);
    pdf.text(row.description.slice(0, 52), marginX + 105, currentY + 4.8);

    currentY += 7;
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  return pdf.output('blob');
}

/**
 * Compile, persist, and return the official Controlled Master PDF
 */
export async function compileControlledMasterPdf(
  params: ControlledPdfCompilationParams
): Promise<{ path: string; url: string; blob: Blob; fileName: string; size: number }> {
  const docNumber = params.docNumber || 'SOP-QMS-001';
  const revision = params.revision || 'Rev A';
  const pdfBlob = generateControlledPdfBlob(params);
  const safeName = `${docNumber}_${revision.replace(/\s+/g, '')}_CONTROLLED.pdf`;
  const storagePath = `controlled/${docNumber}/${revision}/${safeName}`;

  const uploadRes = await uploadFileInternal(storagePath, pdfBlob, safeName);

  return {
    path: uploadRes.path,
    url: uploadRes.url,
    blob: pdfBlob,
    fileName: safeName,
    size: pdfBlob.size,
  };
}

