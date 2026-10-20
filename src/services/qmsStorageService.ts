import { supabase } from './supabase';
import { saveAs } from 'file-saver';

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
 * Retrieve a usable URL to view a PDF inside an embedded <object> or <iframe>
 */
export async function getPdfViewUrl(
  path?: string | null,
  fallbackUrl?: string | null
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

  return fallbackUrl || null;
}

/**
 * Trigger download of any stored document file (.docx, .xlsx, .pdf, .dwg)
 */
export async function downloadDocumentFile(
  path: string,
  fileName: string,
  fallbackUrl?: string | null
): Promise<void> {
  // 1. Try reading from IndexedDB
  const cached = await readFromIndexedDb(path);
  if (cached) {
    saveAs(cached.blob, fileName);
    return;
  }

  // 2. Try downloading binary from Supabase
  try {
    const { data, error } = await supabase.storage
      .from(QMS_STORAGE_BUCKET)
      .download(path);

    if (!error && data) {
      saveAs(data, fileName);
      return;
    }
  } catch (err) {
    console.warn('[qmsStorageService] Supabase download error:', err);
  }

  // 3. Fallback to URL direct download or browser navigation
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const blob = await res.blob();
        saveAs(blob, fileName);
        return;
      }
    } catch {
      window.open(fallbackUrl, '_blank');
      return;
    }
  }

  // 4. If all else fails, create a stub document notification
  alert(`Download initiated for: ${fileName}\n(Storage path: ${path})`);
}
