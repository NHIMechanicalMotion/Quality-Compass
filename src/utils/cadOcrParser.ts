import type { InspectionBalloon, DimensionType, CharacteristicClassification } from '../types/balloon';
import type { PartFamilyProfile } from '../types/templates';
import { recommendInspectionTool } from './toolRecommender';

export interface RawTextToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface DetectedDimension {
  id: string;
  itemNumber: number;
  rawCallout: string;
  dimensionName: string;
  dimensionNameZh: string;
  nominal: number;
  upperTol: number;
  lowerTol: number;
  minLimit: number;
  maxLimit: number;
  type: DimensionType;
  classification: CharacteristicClassification;
  unit: 'mm' | 'inch';
  canvasX: number;
  canvasY: number;
  targetX: number;
  targetY: number;
  drawingZone: string;
  source: 'VECTOR_PDF' | 'TESSERACT_OCR' | 'VECTOR_DXF';
  confidence: number;
  selected: boolean;
  recommendedToolId: string;
  recommendedToolEn: string;
  recommendedToolZh: string;
  isNoteLine?: boolean;
  templateFeatureId?: string;
}

/**
 * Maps image/page pixel coordinates into Quality Compass SVG viewBox (1050 x 680)
 * matching <image x="25" y="25" width="1000" height="630" preserveAspectRatio="xMidYMid meet" />
 */
export function mapImageToSvgCoordinates(
  px: number,
  py: number,
  imgWidth: number,
  imgHeight: number
): { svgX: number; svgY: number } {
  const boxX = 25;
  const boxY = 25;
  const boxW = 1000;
  const boxH = 630;

  const imgAspect = imgWidth / imgHeight;
  const boxAspect = boxW / boxH;

  let renderW: number;
  let renderH: number;
  let offsetX: number;
  let offsetY: number;

  if (imgAspect > boxAspect) {
    renderW = boxW;
    renderH = boxW / imgAspect;
    offsetX = boxX;
    offsetY = boxY + (boxH - renderH) / 2;
  } else {
    renderH = boxH;
    renderW = boxH * imgAspect;
    offsetX = boxX + (boxW - renderW) / 2;
    offsetY = boxY;
  }

  const svgX = Math.round(offsetX + (px / imgWidth) * renderW);
  const svgY = Math.round(offsetY + (py / imgHeight) * renderH);

  return {
    svgX: Math.max(35, Math.min(1015, svgX)),
    svgY: Math.max(35, Math.min(645, svgY)),
  };
}

/**
 * Splits multi-line tokens and concatenated numbered note blocks into individual line tokens
 */
export function splitMultiLineAndNoteTokens(tokens: RawTextToken[]): RawTextToken[] {
  const result: RawTextToken[] = [];

  for (const t of tokens) {
    let lines: string[] = [];
    if (t.text.includes('\n') || t.text.includes('\r')) {
      lines = t.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    } else if (/(?:^|\s)[1-9]\)\s+[A-Z]/.test(t.text) && (t.text.match(/[1-9]\)\s+[A-Z]/g) || []).length > 1) {
      // Split concatenated notes e.g. "1) RADIAL RUNOUT... 2) AXIAL RUNOUT..."
      lines = t.text.split(/(?=[1-9]\)\s+)/).map(l => l.trim()).filter(Boolean);
    } else {
      lines = [t.text];
    }

    if (lines.length <= 1) {
      result.push(t);
    } else {
      const lineH = Math.max(t.height / lines.length, 12);
      lines.forEach((line, idx) => {
        result.push({
          text: line,
          x: t.x,
          y: t.y + idx * lineH,
          width: t.width,
          height: lineH,
          confidence: t.confidence,
        });
      });
    }
  }

  return result;
}

/**
 * Clusters adjacent text items on the same horizontal line (e.g. if "Ø 50.00" and "±0.05" are separated in the PDF stream)
 * and vertically stacked number pairs (limit dimensions like "4.370" over "4.400" or "Ø 4.435" over "4.375")
 */
export function clusterAdjacentTokens(tokens: RawTextToken[]): RawTextToken[] {
  const normalized = splitMultiLineAndNoteTokens(tokens);
  if (normalized.length <= 1) return normalized;

  // 1. Sort by Y (approx line bucket) then X
  const sorted = [...normalized].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 8) return a.y - b.y;
    return a.x - b.x;
  });

  const horizontallyMerged: RawTextToken[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const sameLine = Math.abs(current.y - next.y) <= 10;
    const horizontalGap = next.x - (current.x + current.width);

    // If on same line and gap is small (-10 to 45px), merge into single token
    if (sameLine && horizontalGap >= -10 && horizontalGap <= 45) {
      current = {
        text: `${current.text} ${next.text}`.replace(/\s+/g, ' ').trim(),
        x: current.x,
        y: Math.min(current.y, next.y),
        width: next.x + next.width - current.x,
        height: Math.max(current.height, next.height),
        confidence: Math.min(current.confidence || 100, next.confidence || 100),
      };
    } else {
      horizontallyMerged.push(current);
      current = next;
    }
  }
  horizontallyMerged.push(current);

  // 2. Vertical/Stacked Clustering for limit dimensions (e.g. "4.400" stacked over "4.370" or "Ø 4.435" over "4.375")
  const finalTokens: RawTextToken[] = [];
  const used = new Set<number>();

  for (let i = 0; i < horizontallyMerged.length; i++) {
    if (used.has(i)) continue;
    const t1 = horizontallyMerged[i];

    let mergedStacked = false;
    for (let j = i + 1; j < Math.min(i + 8, horizontallyMerged.length); j++) {
      if (used.has(j)) continue;
      const t2 = horizontallyMerged[j];

      const xDiff = Math.abs(t1.x - t2.x);
      const yDiff = t2.y - t1.y;

      const looksLikeNumber1 = /(?:^|\s)(?:Ø|Φ|DIA|\u2300)?\s*(?:\d*\.\d+|\d+)(?:°|deg)?(?:\s*MAX|\s*MIN)?$/i.test(t1.text.trim());
      const looksLikeNumber2 = /(?:^|\s)(?:Ø|Φ|DIA|\u2300)?\s*(?:\d*\.\d+|\d+)(?:°|deg)?(?:\s*MAX|\s*MIN)?$/i.test(t2.text.trim());

      // If vertically aligned within 25px, distance between 7px and 35px, and both look like numbers without existing slashes
      if (xDiff <= 25 && yDiff >= 7 && yDiff <= 35 && looksLikeNumber1 && looksLikeNumber2 && !t1.text.includes('/') && !t2.text.includes('/')) {
        finalTokens.push({
          text: `${t1.text} / ${t2.text}`,
          x: Math.min(t1.x, t2.x),
          y: t1.y,
          width: Math.max(t1.width, t2.width),
          height: (t2.y + t2.height) - t1.y,
          confidence: Math.min(t1.confidence || 100, t2.confidence || 100),
        });
        used.add(i);
        used.add(j);
        mergedStacked = true;
        break;
      }
    }

    if (!mergedStacked) {
      finalTokens.push(t1);
      used.add(i);
    }
  }

  return finalTokens;
}

/**
 * Extracts vector text tokens directly from PDF via pdfjs-dist
 * Handles both raw PDFDocumentProxy and Quality Compass PdfDocumentInfo wrapper
 */
export async function extractPdfTextTokens(
  pdfDocOrInfo: any,
  pageNumber: number,
  scale: number = 2.5
): Promise<{ tokens: RawTextToken[]; width: number; height: number }> {
  let page: any;

  if (pdfDocOrInfo?.getRawPage && typeof pdfDocOrInfo.getRawPage === 'function') {
    page = await pdfDocOrInfo.getRawPage(pageNumber);
  } else if (pdfDocOrInfo?.pdfDoc?.getPage && typeof pdfDocOrInfo.pdfDoc.getPage === 'function') {
    page = await pdfDocOrInfo.pdfDoc.getPage(pageNumber);
  } else if (pdfDocOrInfo?.getPage && typeof pdfDocOrInfo.getPage === 'function') {
    const res = await pdfDocOrInfo.getPage(pageNumber);
    if (res && typeof res.getViewport === 'function') {
      page = res;
    } else if (pdfDocOrInfo.pdfDoc?.getPage) {
      page = await pdfDocOrInfo.pdfDoc.getPage(pageNumber);
    }
  }

  if (!page || typeof page.getViewport !== 'function') {
    throw new Error('Could not access raw PDF page proxy for vector text extraction.');
  }

  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();

  const rawTokens: RawTextToken[] = [];

  for (const item of textContent.items as any[]) {
    if (!item.str || !item.str.trim()) continue;

    const tx = item.transform[4];
    const ty = item.transform[5];
    const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
    const itemWidth = (item.width || 0) * scale;
    const itemHeight = (item.height || Math.hypot(item.transform[0], item.transform[1])) * scale;

    rawTokens.push({
      text: item.str.trim(),
      x: vx,
      y: vy - itemHeight,
      width: Math.max(itemWidth, 10),
      height: Math.max(itemHeight, 8),
      confidence: 100,
    });
  }

  const clustered = clusterAdjacentTokens(rawTokens);

  return {
    tokens: clustered,
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Runs Tesseract.js OCR on an image data URL or canvas
 */
export async function runTesseractOcr(
  imageSource: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ tokens: RawTextToken[]; width: number; height: number }> {
  // 1. Get image natural dimensions
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSource;
  });
  const width = img.naturalWidth || 2000;
  const height = img.naturalHeight || 1400;

  onProgress?.(15, 'Loading Tesseract.js OCR engine...');

  // Lazy import createWorker
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(20 + (m.progress || 0) * 70);
        onProgress?.(pct, `Scanning drawing text & dimensions (${Math.round((m.progress || 0) * 100)}%)...`);
      }
    },
  });

  onProgress?.(30, 'Performing character recognition on blueprint...');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();

  onProgress?.(95, 'Parsing recognized text blocks...');
  const rawTokens: RawTextToken[] = [];
  const lines: any[] = [];
  if (ret.data.blocks) {
    for (const block of ret.data.blocks) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          lines.push(line);
        }
      }
    }
  } else if ((ret.data as any).lines) {
    lines.push(...(ret.data as any).lines);
  }

  for (const line of lines) {
    const text = line.text?.trim();
    if (!text || text.length < 2) continue;
    const bbox = line.bbox;
    rawTokens.push({
      text,
      x: bbox.x0,
      y: bbox.y0,
      width: bbox.x1 - bbox.x0,
      height: bbox.y1 - bbox.y0,
      confidence: Math.round(line.confidence || 75),
    });
  }

  return { tokens: rawTokens, width, height };
}

/**
 * Infers default tolerance when not explicitly specified on the drawing callout
 * Follows ASME Y14.5 title block decimal place standards for inches and ISO 2768 for mm
 */
export function inferDefaultTolerance(nominal: number, unit: 'mm' | 'inch' = 'inch'): number {
  const str = nominal.toString();
  const decParts = str.split('.');
  const decimals = decParts.length > 1 ? decParts[1].length : 0;

  if (unit === 'inch') {
    if (decimals >= 4) return 0.0005; // .XXXX ±.0005
    if (decimals === 3) return 0.005;  // .XXX ±.005
    if (decimals === 2) return 0.010;  // .XX ±.010
    return 0.020;
  } else {
    // Metric mm
    if (decimals >= 3) return 0.01;
    if (decimals === 2) return 0.05;
    if (decimals === 1) return 0.1;
    return 0.2;
  }
}

/**
 * Auto-detects whether the drawing is Imperial (inches) or Metric (mm)
 */
export function detectDrawingUnit(tokens: RawTextToken[], fallback: 'mm' | 'inch' = 'inch'): 'mm' | 'inch' {
  let imperialScore = 0;
  let metricScore = 0;

  for (const token of tokens) {
    const txt = token.text.toUpperCase();
    if (/\b(?:INCH|INCHES|IN\.)\b/.test(txt)) imperialScore += 5;
    if (/\b(?:MM|MILLIMETER|METRIC)\b/.test(txt)) metricScore += 5;
    // Decimals without leading zero: e.g. .156, .030, .5625, .XXXX
    if (/(?:^|\s)\.\d{2,4}\b/.test(token.text)) imperialScore += 2;
    if (/\.XXXX\s*±|\.XXX\s*±/.test(token.text)) imperialScore += 5;
  }

  if (imperialScore > metricScore) return 'inch';
  if (metricScore > imperialScore) return 'mm';
  return fallback;
}

/**
 * Filters out common blueprint boilerplate to isolate actual dimension callouts
 */
function isBoilerplateOrNoise(text: string): boolean {
  const clean = text.trim().toUpperCase();

  // Single characters or tiny noise
  if (clean.length <= 1) return true;

  // Standalone header alone (e.g. "NOTES:")
  if (/^NOTES?:?$/i.test(clean)) return true;

  // General title block tolerance headers (filter before protect list)
  if (clean.includes('UNLESS OTHERWISE SPECIFIED') || clean.includes('TOLERANCES ARE')) {
    return true;
  }
  if (/^\.X+\s*±/i.test(clean)) {
    return true;
  }

  // Protect engineering callouts, notes, stamping, and material specs from being discarded
  if (
    clean.includes('MATERIAL') ||
    clean.includes('RUNOUT') ||
    clean.includes('MAX') ||
    clean.includes('MIN') ||
    clean.includes('DIA') ||
    clean.includes('Ø') ||
    clean.includes('RAD') ||
    clean.includes('SPHC') ||
    clean.includes('±') ||
    clean.includes('°') ||
    clean.includes('FINISH') ||
    clean.includes('STAMP') ||
    clean.includes('CHINA') ||
    clean.includes('NHI') ||
    clean.includes('NOTE') ||
    /^[0-9]+[).]\s*/.test(clean)
  ) {
    return false;
  }

  // Dates: e.g. 03/23/11, 11/02/11, 2026-08-20
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(clean)) return true;
  if (/^20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}$/.test(clean)) return true;

  // Drawing scale: e.g. 1:1, 2:1, 1:2, SCALE 1:1, DO NOT SCALE DRAWING
  if (/^(?:SCALE\s*)?[0-9]+:[0-9]+$/i.test(clean)) return true;
  if (clean.includes('DO NOT SCALE')) return false; // Preserve as a note!

  // Sheet counts: e.g. SHEET 1 OF 2
  if (/^SHEET\s*\d+\s*(?:OF|\/)\s*\d+$/i.test(clean)) return true;

  // Title block disclaimer
  if (clean.includes('UNCONTROLLED IF PRINTED')) return true;
  if (clean.includes('ALL RIGHTS RESERVED')) return true;
  if (clean.includes('CONFIDENTIAL')) return true;

  // Section labels: e.g. "SECTION A-A", "DETAIL B"
  if (/^(?:SECTION|DETAIL)\s+[A-Z]-[A-Z]$/i.test(clean) || /^(?:SECTION|DETAIL)\s+[A-Z]$/i.test(clean)) {
    return true;
  }

  // Common title block words without numbers
  if (/^(?:DWG\s*NO|TITLE|REV|DATE|DRAWN|CHECKED|APPROVED|UNITS|THIRD ANGLE|FIRST ANGLE|PROJECTION|ENGINEERING|PRECISION|COMPANY|CLIENT|SIZE|WEIGHT|PAGE|STATUS|CAD\s+ENGINEER|QC\s+REVIEWER)$/i.test(clean)) {
    return true;
  }

  // Pure alphabetic sentences or headers
  if (/^[A-Z\s]{4,}$/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Parses raw text tokens into structured CAD dimensions and balloons
 */
export function parseDetectedCadDimensions(
  tokens: RawTextToken[],
  imgWidth: number,
  imgHeight: number,
  defaultUnit: 'mm' | 'inch' = 'inch',
  sourceType: 'VECTOR_PDF' | 'TESSERACT_OCR' | 'VECTOR_DXF' = 'VECTOR_PDF',
  startIndex: number = 1,
  profile?: PartFamilyProfile
): DetectedDimension[] {
  const results: DetectedDimension[] = [];
  let itemNum = startIndex;

  // Auto-detect unit if not explicitly specified
  const effectiveUnit = detectDrawingUnit(tokens, defaultUnit);

  // Reusable number pattern supporting ASME imperial decimals without leading zeroes: e.g. .156, .030, .5625, 1.120
  const numPat = '(?:\\d*\\.\\d+|\\d+)';

  // Specific engineering regex patterns
  const runoutPattern = new RegExp(`(?:(?:[1-9]\\)\\s*)?(RADIAL|AXIAL)\\s+RUNOUT\\s+(\\.?${numPat})\\s*(?:MAX)?\\.?)`, 'i');
  const materialNotePattern = /\bMATERIAL\s*[:=]\s*([A-Z0-9\s\-/]+)/i;
  const limitPattern = new RegExp(`^(?:(?:Ø|Φ|DIA|Dia|\\u2300)\\s*)?(\\.?${numPat})\\s*(?:°|deg)?\\s*[\\/–-]\\s*(\\.?${numPat})\\s*(?:°|deg)?$`, 'i');
  const multiHolePattern = new RegExp(`(\\d+)[xX]\\s*(?:(?:Ø|Φ|DIA|\\u2300)\\s*)?(\\.?${numPat})(?:\\s*(?:±|\\+\\/-|\\+-)\\s*(\\.?${numPat}))?`, 'i');
  const referencePattern = new RegExp(`^\\(\\s*(\\.?${numPat})\\s*\\)$`);
  const maxLimitPattern = new RegExp(`^(\\.?${numPat})\\s*(MAX|MIN)\\b`, 'i');
  const bilateralTolPattern = new RegExp(`(?:(?:Ø|Φ|DIA|Dia|\\u2300)\\s*)?(\\.?${numPat})\\s*(?:±|\\+\\/-|\\+-)\\s*(\\.?${numPat})`, 'i');
  const asymmetricTolPattern = new RegExp(`(?:(?:Ø|Φ|DIA|Dia|\\u2300)\\s*)?(\\.?${numPat})\\s*\\+\\s*(\\.?${numPat})\\s*(?:[\\/–\\s-]+)\\s*-?\\s*(\\.?${numPat})`, 'i');
  const diameterPattern = new RegExp(`(?:Ø|Φ|DIA|Dia|\\u2300)\\s*(\\.?${numPat})(?:\\s*(?:±|\\+\\/-|\\+-)\\s*(\\.?${numPat}))?`, 'i');
  const radiusPattern = new RegExp(`\\b(?:R|RAD|Rad)\\s*(\\.?${numPat})(?:\\s*(?:±|\\+\\/-|\\+-)\\s*(\\.?${numPat}))?`, 'i');
  const anglePattern = new RegExp(`(\\.?${numPat})\\s*(?:°|deg)(?:\\s*(?:±|\\+\\/-|\\+-)\\s*(\\.?${numPat}))?`, 'i');
  const chamferPattern = new RegExp(`(\\.?${numPat})\\s*[xX]\\s*(\\.?${numPat})\\s*(?:°|deg)|C\\s*(\\.?${numPat})`, 'i');
  const surfaceFinishPattern = new RegExp(`\\bRa\\s*(\\.?${numPat})\\b`, 'i');
  const standaloneDecimalPattern = new RegExp(`^\\.?(${numPat})$`);

  const seenLocations = new Set<string>();

  for (const token of tokens) {
    const raw = token.text.trim();
    if (!raw || isBoilerplateOrNoise(raw)) continue;

    let matched = false;
    let dimName = `Dimension ${itemNum}`;
    let dimNameZh = `尺寸项 ${itemNum}`;
    let type: DimensionType = 'LINEAR';
    let classification: CharacteristicClassification = 'MAJOR';
    let nominal = 0;
    let upperTol = 0.005;
    let lowerTol = -0.005;
    let minLimit = 0;
    let maxLimit = 0;
    let cleanCallout = raw;

    // 1. GD&T Runout Notes (e.g. "1) RADIAL RUNOUT .010 MAX", "AXIAL RUNOUT .015 MAX")
    const runoutMatch = raw.match(runoutPattern);
    if (runoutMatch) {
      const isRadial = runoutMatch[1].toUpperCase() === 'RADIAL';
      const tolVal = parseFloat(runoutMatch[2]);
      nominal = 0;
      upperTol = tolVal;
      lowerTol = 0;
      minLimit = 0;
      maxLimit = tolVal;
      type = 'GDT';
      classification = 'CRITICAL';
      dimName = `${isRadial ? 'Radial' : 'Axial'} Runout ≤ ${tolVal} MAX`;
      dimNameZh = `${isRadial ? '径向' : '轴向'}跳动度 ≤ ${tolVal} MAX`;
      cleanCallout = `${runoutMatch[1].toUpperCase()} RUNOUT ${tolVal} MAX`;
      matched = true;
    }
    // 2. Material Note Callout (e.g. "MATERIAL = SPHC", "MATERIAL: SPHC")
    else if (materialNotePattern.test(raw)) {
      const matMatch = raw.match(materialNotePattern);
      const spec = matMatch ? matMatch[1].trim() : 'SPEC';
      type = 'NOTE';
      classification = 'CRITICAL';
      nominal = 0;
      upperTol = 0;
      lowerTol = 0;
      minLimit = 0;
      maxLimit = 0;
      dimName = `Material: ${spec}`;
      dimNameZh = `材质要求 (${spec})`;
      cleanCallout = `MATERIAL = ${spec}`;
      matched = true;
    }
    // 2.5 Numbered Notes (e.g. "3) ALL DIMENSIONS APPLY AFTER FINISH", "4) STAMP 'NHI' AND 'MADE IN CHINA' AS SHOWN")
    else if (/^(?:([1-9])\)\s*|NOTE\s*([1-9])[:\s]+)(.+)/i.test(raw)) {
      const noteMatch = raw.match(/^(?:([1-9])\)\s*|NOTE\s*([1-9])[:\s]+)(.+)/i);
      if (noteMatch) {
        const noteNum = noteMatch[1] || noteMatch[2];
        const noteBody = noteMatch[3].trim();
        const isFinish = /FINISH|COATING|PLATING/i.test(noteBody);
        const isStamping = /STAMP|MARK|CHINA|NHI/i.test(noteBody);

        type = 'NOTE';
        classification = isFinish || isStamping ? 'MAJOR' : 'MINOR';
        nominal = 0;
        upperTol = 0;
        lowerTol = 0;
        minLimit = 0;
        maxLimit = 0;
        dimName = isFinish 
          ? `Note ${noteNum}: Post-Finish Condition` 
          : isStamping 
          ? `Note ${noteNum}: Marking & Stamping Requirement` 
          : `Note ${noteNum}: ${noteBody}`;
        dimNameZh = isFinish 
          ? `附注 ${noteNum}: 表面处理后尺寸生效要求` 
          : isStamping 
          ? `附注 ${noteNum}: 零件钢印及产地标识 (NHI / CHINA)` 
          : `图纸附注要求 ${noteNum}`;
        cleanCallout = `${noteNum}) ${noteBody}`;
        matched = true;
      }
    }
    // 2.6 General Notes: e.g. "ALL DIMENSIONS APPLY...", "DO NOT SCALE DRAWING", "STAMP..."
    else if (/^(?:ALL DIMENSIONS APPLY|STAMP|DO NOT SCALE DRAWING)/i.test(raw)) {
      type = 'NOTE';
      classification = 'MINOR';
      nominal = 0;
      upperTol = 0;
      lowerTol = 0;
      minLimit = 0;
      maxLimit = 0;
      dimName = raw.includes('SCALE') ? 'Drawing Scale Notice' : (raw.includes('STAMP') ? 'Marking & Stamping' : 'General Engineering Note');
      dimNameZh = raw.includes('SCALE') ? '严禁按比例量取图纸说明' : (raw.includes('STAMP') ? '钢印标识要求' : '通用技术说明');
      cleanCallout = raw;
      matched = true;
    }
    // 3. Limit Dimensions (e.g. "4.370 / 4.400", "Ø 4.435 / 4.375", "Ø 1.251 / 1.250", "53° / 47°")
    else if (limitPattern.test(raw)) {
      const limMatch = raw.match(limitPattern);
      if (limMatch) {
        const valA = parseFloat(limMatch[1]);
        const valB = parseFloat(limMatch[2]);
        const high = Math.max(valA, valB);
        const low = Math.min(valA, valB);
        nominal = Math.round(((high + low) / 2) * 10000) / 10000;
        upperTol = Math.round((high - nominal) * 10000) / 10000;
        lowerTol = Math.round((low - nominal) * 10000) / 10000;
        minLimit = low;
        maxLimit = high;

        const isDia = raw.includes('Ø') || raw.includes('Φ') || /dia/i.test(raw);
        const isAng = raw.includes('°') || /deg/i.test(raw);

        if (isDia) {
          type = 'DIAMETER';
          classification = 'CRITICAL';
          dimName = `Diameter Limit Ø${low} / Ø${high}`;
          dimNameZh = `外径/内径极限 Ø${low} / Ø${high}`;
          cleanCallout = `Ø ${low} / ${high}`;
        } else if (isAng) {
          type = 'CHAMFER';
          classification = 'MAJOR';
          dimName = `Angle Limit ${low}° / ${high}°`;
          dimNameZh = `角度极限 ${low}° / ${high}°`;
          cleanCallout = `${high}° / ${low}°`;
        } else {
          type = 'LINEAR';
          classification = 'CRITICAL';
          dimName = `Limit Dimension ${low} / ${high}`;
          dimNameZh = `极限尺寸 ${low} / ${high}`;
          cleanCallout = `${low} / ${high}`;
        }
        matched = true;
      }
    }
    // 4. Multi-hole Diameter (e.g. 4X Ø .250 ±.005, 2X Ø .5625)
    else if (multiHolePattern.test(raw)) {
      const multiMatch = raw.match(multiHolePattern);
      if (multiMatch) {
        const count = multiMatch[1];
        nominal = parseFloat(multiMatch[2]);
        upperTol = multiMatch[3] ? parseFloat(multiMatch[3]) : inferDefaultTolerance(nominal, effectiveUnit);
        lowerTol = -upperTol;
        minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
        maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
        type = 'DIAMETER';
        classification = 'CRITICAL';
        dimName = `${count}X Hole Diameter Ø${nominal}`;
        dimNameZh = `${count}孔阵直径 Ø${nominal}`;
        cleanCallout = `${count}X Ø ${nominal} ±${upperTol}`;
        matched = true;
      }
    }
    // 5. Reference Dimension in Parentheses (e.g. "(.755)", "(1.250)")
    else if (referencePattern.test(raw)) {
      const refMatch = raw.match(referencePattern);
      if (refMatch) {
        nominal = parseFloat(refMatch[1]);
        upperTol = 0;
        lowerTol = 0;
        minLimit = nominal;
        maxLimit = nominal;
        type = 'LINEAR';
        classification = 'REFERENCE';
        dimName = `Reference Dimension (${nominal})`;
        dimNameZh = `参考尺寸 (${nominal}) REF`;
        cleanCallout = `(${nominal}) REF`;
        matched = true;
      }
    }
    // 6. Bilateral Tolerance (e.g. "1.120 ± .030", ".156 ± .008", "100.0 ±0.2")
    else if (bilateralTolPattern.test(raw)) {
      const bilMatch = raw.match(bilateralTolPattern);
      if (bilMatch) {
        const isDia = raw.includes('Ø') || raw.includes('Φ') || /dia/i.test(raw);
        nominal = parseFloat(bilMatch[1]);
        upperTol = parseFloat(bilMatch[2]);
        lowerTol = -upperTol;
        minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
        maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
        type = isDia ? 'DIAMETER' : 'LINEAR';
        classification = Math.abs(upperTol) <= 0.01 ? 'CRITICAL' : 'MAJOR';
        dimName = `${isDia ? 'Diameter Ø' : 'Linear Dimension '}${nominal}`;
        dimNameZh = `${isDia ? '外径/内径 Ø' : '线性尺寸 '}${nominal}`;
        cleanCallout = `${isDia ? 'Ø ' : ''}${nominal} ±${upperTol}`;
        matched = true;
      }
    }
    // 7. Asymmetric Tolerance (e.g. "1.250 +.005 / -.002")
    else if (asymmetricTolPattern.test(raw)) {
      const asymMatch = raw.match(asymmetricTolPattern);
      if (asymMatch) {
        const isDia = raw.includes('Ø') || raw.includes('Φ') || /dia/i.test(raw);
        nominal = parseFloat(asymMatch[1]);
        upperTol = parseFloat(asymMatch[2]);
        lowerTol = -parseFloat(asymMatch[3]);
        minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
        maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
        type = isDia ? 'DIAMETER' : 'LINEAR';
        classification = 'CRITICAL';
        dimName = `${isDia ? 'Diameter Ø' : 'Toleranced Dim '}${nominal}`;
        dimNameZh = `${isDia ? '外径/内径 Ø' : '公差尺寸 '}${nominal}`;
        cleanCallout = `${isDia ? 'Ø ' : ''}${nominal} +${upperTol} / ${lowerTol}`;
        matched = true;
      }
    }
    // 8. Max or Min Callout (e.g. "2.645 MAX", "1.500 MIN")
    else if (maxLimitPattern.test(raw)) {
      const maxMatch = raw.match(maxLimitPattern);
      if (maxMatch) {
        nominal = parseFloat(maxMatch[1]);
        const isMax = maxMatch[2].toUpperCase() === 'MAX';
        upperTol = 0;
        lowerTol = 0;
        minLimit = isMax ? 0 : nominal;
        maxLimit = isMax ? nominal : 9999;
        type = 'LINEAR';
        classification = 'MAJOR';
        dimName = `${isMax ? 'Maximum' : 'Minimum'} Limit ${nominal} ${maxMatch[2]}`;
        dimNameZh = `${isMax ? '最大' : '最小'}极限尺寸 ${nominal} ${maxMatch[2]}`;
        cleanCallout = `${nominal} ${maxMatch[2]}`;
        matched = true;
      }
    }
    // 9. Standard Diameter (e.g. "Ø .5625", "DIA .500")
    else if (raw.includes('Ø') || raw.includes('Φ') || /dia/i.test(raw) || diameterPattern.test(raw)) {
      const diaMatch = raw.match(diameterPattern);
      if (diaMatch && diaMatch[1]) {
        nominal = parseFloat(diaMatch[1]);
        upperTol = diaMatch[2] ? parseFloat(diaMatch[2]) : inferDefaultTolerance(nominal, effectiveUnit);
        lowerTol = -upperTol;
        minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
        maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
        type = 'DIAMETER';
        classification = 'CRITICAL';
        dimName = `Diameter Ø${nominal}`;
        dimNameZh = `外径/内径 Ø${nominal}`;
        cleanCallout = diaMatch[2] ? `Ø ${nominal} ±${upperTol}` : `Ø ${nominal}`;
        matched = true;
      }
    }
    // 10. Radius (e.g. "R .030", "R.125", "R 2.5")
    else if (radiusPattern.test(raw)) {
      const rMatch = raw.match(radiusPattern);
      if (rMatch) {
        nominal = parseFloat(rMatch[1]);
        upperTol = rMatch[2] ? parseFloat(rMatch[2]) : inferDefaultTolerance(nominal, effectiveUnit);
        lowerTol = -upperTol;
        minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
        maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
        type = 'RADIUS';
        classification = 'MAJOR';
        dimName = `Radius R${nominal}`;
        dimNameZh = `圆角/外圆弧 R${nominal}`;
        cleanCallout = rMatch[2] ? `R ${nominal} ±${upperTol}` : `R ${nominal}`;
        matched = true;
      }
    }
    // 11. Chamfer or Angle (e.g. "32°", "53°", "45°")
    else if (anglePattern.test(raw) || chamferPattern.test(raw)) {
      type = 'CHAMFER';
      classification = 'MINOR';
      const aMatch = raw.match(anglePattern) || raw.match(chamferPattern);
      nominal = aMatch ? parseFloat(aMatch[1] || '45') : 45;
      upperTol = 2; // ±2° default angle tolerance
      lowerTol = -2;
      minLimit = nominal + lowerTol;
      maxLimit = nominal + upperTol;
      dimName = `Angle ${nominal}°`;
      dimNameZh = `角度特征 ${nominal}°`;
      cleanCallout = `${nominal}°`;
      matched = true;
    }
    // 12. Surface Finish (e.g. "Ra 1.6", "Ra 3.2")
    else if (surfaceFinishPattern.test(raw)) {
      const raMatch = raw.match(surfaceFinishPattern);
      nominal = raMatch ? parseFloat(raMatch[1]) : 1.6;
      upperTol = 0;
      lowerTol = 0;
      minLimit = 0;
      maxLimit = nominal;
      type = 'SURFACE_FINISH';
      classification = 'MAJOR';
      dimName = `Surface Roughness Ra ${nominal}`;
      dimNameZh = `表面粗糙度要求 Ra ${nominal}`;
      cleanCallout = `Ra ${nominal}`;
      matched = true;
    }
    // 13. Standalone Decimal Dimension (e.g. ".156", "1.120", "4.370", "25.4")
    else if (standaloneDecimalPattern.test(raw)) {
      const decMatch = raw.match(standaloneDecimalPattern);
      if (decMatch) {
        nominal = parseFloat(decMatch[1]);
        if (nominal > 0 && nominal < 5000) {
          upperTol = inferDefaultTolerance(nominal, effectiveUnit);
          lowerTol = -upperTol;
          minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
          maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;
          type = 'LINEAR';
          classification = 'MAJOR';
          dimName = `Feature Dimension ${nominal}`;
          dimNameZh = `基本尺寸 ${nominal}`;
          cleanCallout = `${nominal}`;
          matched = true;
        }
      }
    }

    if (!matched) continue;

    // Convert pixel position to SVG coordinates
    const centerPx = token.x + token.width / 2;
    const centerPy = token.y + token.height / 2;
    const { svgX, svgY } = mapImageToSvgCoordinates(centerPx, centerPy, imgWidth, imgHeight);

    // De-duplicate if an identical coordinate is already detected within 25px
    const locKey = `${Math.round(svgX / 25)}_${Math.round(svgY / 25)}`;
    if (seenLocations.has(locKey)) continue;
    seenLocations.add(locKey);

    // Calculate leader arrow target and balloon circle coordinates
    const targetX = svgX;
    const targetY = svgY;

    // Balloon circle position offset away from borders
    let balloonX = targetX > 780 ? targetX - 55 : targetX + 50;
    let balloonY = targetY > 560 ? targetY - 40 : (targetY < 90 ? targetY + 40 : targetY - 35);
    balloonX = Math.max(35, Math.min(1015, balloonX));
    balloonY = Math.max(35, Math.min(645, balloonY));

    // Calculate drawing zone (A-D, 1-4)
    const zoneCol = targetX < 250 ? '1' : targetX < 500 ? '2' : targetX < 750 ? '3' : '4';
    const zoneRow = targetY < 160 ? 'A' : targetY < 320 ? 'B' : targetY < 480 ? 'C' : 'D';
    const drawingZone = `${zoneRow}-${zoneCol}`;

    // Recommend inspection tool
    const tolSpread = Math.abs(upperTol - lowerTol);
    const recTool = recommendInspectionTool(type, nominal, tolSpread, cleanCallout);

    results.push({
      id: `detected-${Date.now()}-${itemNum}`,
      itemNumber: itemNum,
      rawCallout: cleanCallout,
      dimensionName: dimName,
      dimensionNameZh: dimNameZh,
      nominal,
      upperTol,
      lowerTol,
      minLimit,
      maxLimit,
      type,
      classification,
      unit: effectiveUnit,
      canvasX: balloonX,
      canvasY: balloonY,
      targetX,
      targetY,
      drawingZone,
      source: sourceType,
      confidence: token.confidence || (sourceType === 'VECTOR_PDF' || sourceType === 'VECTOR_DXF' ? 100 : 85),
      selected: true,
      recommendedToolId: recTool.id,
      recommendedToolEn: recTool.nameEn,
      recommendedToolZh: recTool.nameZh,
      isNoteLine: type === 'NOTE' || type === 'GDT' || /^[1-9]\)/.test(cleanCallout) || cleanCallout.includes('MATERIAL') || cleanCallout.includes('RUNOUT'),
    });

    itemNum++;
  }

  const mapped = profile ? applyPartFamilySemanticNames(results, profile) : results;
  return mapped;
}

/**
 * Maps detected dimensions and notes to standardized engineering feature names based on the active part family profile
 */
export function applyPartFamilySemanticNames(
  detected: DetectedDimension[],
  profile?: PartFamilyProfile
): DetectedDimension[] {
  if (!profile || profile.category !== 'PULLEY') return detected;

  return detected.map(dim => {
    const raw = dim.rawCallout.toUpperCase();
    const isNote = dim.type === 'NOTE' || !!dim.isNoteLine;
    const isGdt = dim.type === 'GDT';

    // 0. Notes, Runouts, Stamping & Material Specifications
    if (isNote || isGdt) {
      if (raw.includes('RADIAL') && raw.includes('RUNOUT')) {
        return {
          ...dim,
          dimensionName: 'Radial Runout Control',
          dimensionNameZh: `径向跳动技术要求 (${dim.rawCallout})`,
          templateFeatureId: 'RADIAL_RUNOUT',
          classification: 'CRITICAL',
        };
      }
      if (raw.includes('AXIAL') && raw.includes('RUNOUT')) {
        return {
          ...dim,
          dimensionName: 'Axial Runout Control',
          dimensionNameZh: `轴向跳动技术要求 (${dim.rawCallout})`,
          templateFeatureId: 'AXIAL_RUNOUT',
          classification: 'CRITICAL',
        };
      }
      if (raw.includes('MATERIAL')) {
        return {
          ...dim,
          dimensionName: 'Material Specification (SPHC)',
          dimensionNameZh: `原材料材质要求 (${dim.rawCallout})`,
          templateFeatureId: 'MATERIAL_SPEC',
          classification: 'CRITICAL',
        };
      }
      if (raw.includes('STAMP') || raw.includes('CHINA') || raw.includes('NHI')) {
        return {
          ...dim,
          dimensionName: 'Part Marking & Stamping',
          dimensionNameZh: `钢印及产地标识 (NHI / CHINA)`,
          templateFeatureId: 'MARKING_STAMP',
          classification: 'MAJOR',
        };
      }
      if (raw.includes('FINISH') || raw.includes('AFTER FINISH')) {
        return {
          ...dim,
          dimensionName: 'Post-Finish Condition',
          dimensionNameZh: `表面处理后尺寸要求`,
          templateFeatureId: 'FINISH_SPEC',
          classification: 'MAJOR',
        };
      }
      return dim;
    }

    const isDia = dim.type === 'DIAMETER' || raw.includes('Ø') || raw.includes('Φ') || /\b(?:DIA|DIAMETER)\b/i.test(raw);
    const isAngle = dim.type === 'CHAMFER' || raw.includes('°');
    const isRadius = dim.type === 'RADIUS' || raw.startsWith('R');
    const isLimit = raw.includes('/');
    const nominal = dim.nominal;

    // 1. Pulley Angle: e.g. 32°, 34°, 36°, 38°, 53° / 47°
    if (isAngle || (nominal >= 25 && nominal <= 55)) {
      return {
        ...dim,
        dimensionName: 'Pulley Angle',
        dimensionNameZh: `皮带槽夹角 (${dim.rawCallout})`,
        templateFeatureId: 'PULLEY_ANGLE',
        classification: 'CRITICAL',
      };
    }

    // 2. Outside Diameter (Major rim OD): e.g. 4.520 / 4.400 or nominal > 4.45
    if (isDia && (nominal > 4.45 || raw.includes('4.520') || raw.includes('4.400') || (isLimit && nominal > 4.0))) {
      if (raw.includes('OVER PIN') || raw.includes('PIN') || raw.includes('4.435') || (nominal >= 4.35 && nominal <= 4.45)) {
        return {
          ...dim,
          dimensionName: 'Over Pin Dimension',
          dimensionNameZh: `跨销测量尺寸 (Over Pin ${dim.rawCallout})`,
          templateFeatureId: 'OVER_PIN_DIMENSION',
          classification: 'CRITICAL',
        };
      }
      return {
        ...dim,
        dimensionName: 'Outside Diameter',
        dimensionNameZh: `皮带轮外径 (OD ${dim.rawCallout})`,
        templateFeatureId: 'OUTSIDE_DIAMETER',
        classification: 'CRITICAL',
      };
    }

    // 3. Over Pin Dimension: e.g. Ø 4.435 / 4.375
    if (isDia && (raw.includes('4.435') || raw.includes('4.375') || (nominal >= 4.35 && nominal <= 4.45))) {
      return {
        ...dim,
        dimensionName: 'Over Pin Dimension',
        dimensionNameZh: `跨销测量尺寸 (Over Pin ${dim.rawCallout})`,
        templateFeatureId: 'OVER_PIN_DIMENSION',
        classification: 'CRITICAL',
      };
    }

    // 4. Pulley Bore: e.g. Ø 1.251 / 1.250 (central bore)
    if (isDia && (nominal >= 0.75 && nominal <= 2.5 && (isLimit || Math.abs(dim.upperTol - dim.lowerTol) <= 0.005))) {
      return {
        ...dim,
        dimensionName: 'Pulley Bore',
        dimensionNameZh: `中心轴孔内径 (Bore ${dim.rawCallout})`,
        templateFeatureId: 'PULLEY_BORE',
        classification: 'CRITICAL',
      };
    }

    // 5. Bore Step / Counterbore: e.g. Ø .5625
    if (isDia && nominal < 0.75 && nominal > 0.01) {
      return {
        ...dim,
        dimensionName: 'Bore Step / Counterbore',
        dimensionNameZh: `沉孔/过渡台阶直径 (${dim.rawCallout})`,
        templateFeatureId: 'BORE_STEP_DIA',
        classification: 'MAJOR',
      };
    }

    // 6. Pulley Width: e.g. 1.120 ± .050, 1.120 ± .030
    if (dim.type === 'LINEAR' && nominal >= 0.75 && nominal <= 3.0 && !isLimit && !raw.includes('MAX') && !raw.includes('(')) {
      return {
        ...dim,
        dimensionName: 'Pulley Width',
        dimensionNameZh: `皮带轮总宽 (Width ${dim.rawCallout})`,
        templateFeatureId: 'PULLEY_WIDTH',
        classification: 'CRITICAL',
      };
    }

    // 7. Flange / Web Thickness: e.g. .138 ± .008, .156 ± .008
    if (dim.type === 'LINEAR' && nominal < 0.35 && !raw.includes('RUNOUT')) {
      return {
        ...dim,
        dimensionName: 'Flange / Web Thickness',
        dimensionNameZh: `轮缘/腹板壁厚 (${dim.rawCallout})`,
        templateFeatureId: 'FLANGE_THICKNESS',
        classification: 'MAJOR',
      };
    }

    // 8. Groove / Flange Radius: e.g. R .53 / .47
    if (isRadius || raw.includes('R.') || raw.includes('R .')) {
      return {
        ...dim,
        dimensionName: 'Groove / Flange Radius',
        dimensionNameZh: `槽底/轮缘圆角 (${dim.rawCallout})`,
        templateFeatureId: 'GROOVE_RADIUS',
        classification: 'MAJOR',
      };
    }

    // 9. Inner Hub Clearance: e.g. 2.645 MAX
    if (raw.includes('MAX') && nominal >= 1.5 && nominal <= 4.0) {
      return {
        ...dim,
        dimensionName: 'Inner Hub Clearance',
        dimensionNameZh: `内毂避空孔径 (${dim.rawCallout})`,
        templateFeatureId: 'INNER_HUB_CLEARANCE',
        classification: 'MAJOR',
      };
    }

    // 10. Reference Depth / Offset: e.g. (.785) REF
    if (dim.classification === 'REFERENCE' || raw.includes('(')) {
      return {
        ...dim,
        dimensionName: 'Belt Groove Offset (REF)',
        dimensionNameZh: `带槽中心线偏移深度 (参考 ${dim.rawCallout})`,
        templateFeatureId: 'BELT_OFFSET_REF',
      };
    }

    return dim;
  });
}

/**
 * Converts a DetectedDimension item into an InspectionBalloon
 */
export function convertDetectedToBalloon(
  item: DetectedDimension,
  colorOverride?: string
): InspectionBalloon {
  const color = item.classification === 'CRITICAL' ? '#dc2626' : (colorOverride || '#2563eb');

  return {
    id: `balloon-ocr-${Date.now()}-${item.itemNumber}`,
    itemNumber: item.itemNumber,
    dimensionName: item.dimensionName,
    dimensionNameZh: item.dimensionNameZh,
    type: item.type,
    classification: item.classification,
    nominal: item.nominal,
    upperTol: item.upperTol,
    lowerTol: item.lowerTol,
    minLimit: item.minLimit,
    maxLimit: item.maxLimit,
    unit: item.unit,
    rawCallout: item.rawCallout,
    x: item.canvasX,
    y: item.canvasY,
    leaderTargetX: item.targetX,
    leaderTargetY: item.targetY,
    sheet: 1,
    drawingZone: item.drawingZone,
    balloonColor: color,
  };
}
