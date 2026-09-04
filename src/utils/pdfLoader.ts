import * as pdfjsLib from 'pdfjs-dist';

// Setup worker for PDF.js
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Could not set workerSrc via import.meta.url, falling back to CDN worker', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  dataUrl: string;
  width: number;
  height: number;
  pageNumber: number;
  totalPages: number;
}

export interface PdfDocumentInfo {
  numPages: number;
  pdfDoc: any;
  getPage: (pageNumber: number, scale?: number) => Promise<RenderedPdfPage>;
  getRawPage: (pageNumber: number) => Promise<any>;
}

/**
 * Loads a PDF from a File, Blob, or ArrayBuffer and returns a handle to render pages at high DPI
 */
export async function loadPdfDocument(source: File | Blob | ArrayBuffer): Promise<PdfDocumentInfo> {
  const arrayBuffer = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const getPage = async (pageNumber: number, scale = 2.0): Promise<RenderedPdfPage> => {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create offscreen canvas for crisp rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to create canvas 2D context for PDF rendering');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background for engineering prints
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvas,
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    const dataUrl = canvas.toDataURL('image/png', 0.95);

    return {
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      pageNumber,
      totalPages: numPages,
    };
  };

  return {
    numPages,
    pdfDoc,
    getPage,
    getRawPage: (pageNumber: number) => pdfDoc.getPage(pageNumber),
  };
}

/**
 * Loads image files (PNG, JPG, SVG, WebP) directly into an image Data URL
 */
export function loadImageFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
