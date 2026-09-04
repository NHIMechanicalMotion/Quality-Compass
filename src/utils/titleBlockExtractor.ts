import type { TitleBlockMetadata } from '../types/cad';
import type { RawTextToken } from './cadOcrParser';

export interface ExtractedTitleBlockMetadata {
  drawingNumber?: string;
  partName?: string;
  revision?: string;
  organization?: string;
  drawnBy?: string;
  approvedBy?: string;
  date?: string;
  drawnDate?: string;
  approvedDate?: string;
  material?: string;
  finish?: string;
  generalToleranceNote?: string;
  units?: 'mm' | 'inch';
}

/**
 * Intelligently scans CAD text tokens to extract Title Block and Tolerance Block information:
 * - Approved By (e.g. JSM, MOB, PMK)
 * - Drawn By (e.g. CGC, PMK)
 * - Dates (e.g. 5/26/2015, 11/21/11)
 * - Drawing Number & Revision (e.g. SDV-100-4L-25 REV B, SDV-71-B-1-GS REV -)
 * - Part Name (e.g. ASSEMBLY, PULLEY)
 * - Material Specification (e.g. STEEL PER MS-100 / STEEL PER MS-102, SPHC)
 * - General Tolerances Note (e.g. .XXXX ±.0005, .XXX ±.005, .XX ±.010, ANGLES ±1°)
 * - Organization (e.g. NEW HAMPSHIRE INDUSTRIES, NHI)
 */
export function extractTitleBlockMetadata(
  tokens: RawTextToken[],
  isDxfCartesian: boolean = false
): ExtractedTitleBlockMetadata {
  const result: ExtractedTitleBlockMetadata = {};

  if (!tokens || tokens.length === 0) return result;

  const minY = Math.min(...tokens.map(t => t.y));
  const maxY = Math.max(...tokens.map(t => t.y));
  const heightSpan = Math.max(maxY - minY, 1);

  const minX = Math.min(...tokens.map(t => t.x));
  const maxX = Math.max(...tokens.map(t => t.x));
  const widthSpan = Math.max(maxX - minX, 1);

  // Title Block is traditionally in the bottom 35% of the blueprint
  // In DXF (Cartesian): Y=0 is bottom, so title block is in y <= minY + heightSpan * 0.35
  // In Canvas/PDF (raster): Y=0 is top, so title block is in y >= maxY - heightSpan * 0.35
  const tbTokens = tokens.filter(t => {
    if (isDxfCartesian) {
      return t.y <= minY + heightSpan * 0.35;
    } else {
      return t.y >= maxY - heightSpan * 0.35;
    }
  });

  // Helper to find a token adjacent to a label horizontally to the right (within the same title block cell)
  const findAdjacentRight = (labelToken: RawTextToken, maxDistFraction: number = 0.25): RawTextToken | undefined => {
    const maxDist = widthSpan * maxDistFraction;
    const maxVerticalDiff = isDxfCartesian ? 0.35 : Math.max(labelToken.height * 2.5, 40);

    const candidates = tbTokens.filter(c =>
      c !== labelToken &&
      Math.abs(c.y - labelToken.y) < maxVerticalDiff &&
      c.x > labelToken.x && c.x < labelToken.x + maxDist
    );

    candidates.sort((a, b) => a.x - b.x);
    return candidates[0];
  };

  // 1. APPROVED BY (e.g. "APPROVED: JSM", "APPROVED: MOB", or "APPROVED:" with adjacent "JSM")
  for (const t of tbTokens) {
    const txt = t.text.trim().toUpperCase();

    // Combined in single token: e.g. "APPROVED: JSM" or "APPROVED BY: JSM"
    const inToken = t.text.match(/\b(?:APPROVED|APPV'?D|APP'?D|APPROVED\s*BY|CHKD|CHECKED)\s*[:=]?\s*([A-Za-z]{2,5})\b/i);
    if (inToken && inToken[1] && !/^(?:DATE|SIZE|BY|FOR|REV|NONE|NONE|ASME|ISO)$/i.test(inToken[1])) {
      result.approvedBy = inToken[1].toUpperCase();
      break;
    }

    // Separate tokens: Token is "APPROVED:" or "APPROVED"
    if (/^(?:APPROVED|APPV'?D|APP'?D|APPROVED\s*BY):?$/i.test(txt)) {
      const adj = findAdjacentRight(t);
      if (adj && /^[A-Za-z]{2,5}$/.test(adj.text.trim()) && !/^(?:DATE|SIZE|BY|FOR|REV|NONE|DWG|NONE)$/i.test(adj.text.trim())) {
        result.approvedBy = adj.text.trim().toUpperCase();
        break;
      }
    }
  }

  // 2. DRAWN BY (e.g. "DRAWN: CGC", "DRAWN: PMK")
  for (const t of tbTokens) {
    const txt = t.text.trim().toUpperCase();

    const inToken = t.text.match(/\b(?:DRAWN|DRAWN\s*BY|DESIGNED|DSGN)\s*[:=]?\s*([A-Za-z]{2,5})\b/i);
    if (inToken && inToken[1] && !/^(?:DATE|SIZE|BY|FOR|REV|NONE)$/i.test(inToken[1])) {
      result.drawnBy = inToken[1].toUpperCase();
      break;
    }

    if (/^(?:DRAWN|DRAWN\s*BY|DESIGNED):?$/i.test(txt)) {
      const adj = findAdjacentRight(t);
      if (adj && /^[A-Za-z]{2,5}$/.test(adj.text.trim()) && !/^(?:DATE|SIZE|BY|FOR|REV|NONE|DWG)$/i.test(adj.text.trim())) {
        result.drawnBy = adj.text.trim().toUpperCase();
        break;
      }
    }
  }

  // 3. DATES (Approval Date & Drawn Date)
  for (const t of tbTokens) {
    const txt = t.text.trim().toUpperCase();

    if (/^DATE:?$/i.test(txt)) {
      const adj = findAdjacentRight(t);
      if (adj) {
        const m = adj.text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
        if (m) {
          // If this DATE is horizontally near/after the APPROVED column, it's approval date!
          if (t.x > minX + widthSpan * 0.45) {
            result.approvedDate = m[1];
          } else {
            result.drawnDate = m[1];
          }
        }
      }
    } else {
      const standaloneDate = t.text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      if (standaloneDate && !result.date) {
        result.date = standaloneDate[1];
      }
    }
  }
  result.date = result.approvedDate || result.date || result.drawnDate;

  // 4. DRAWING NUMBER & REVISION (e.g. "SDV-100-4L-25 REV B", "SDV-71-B-1-GS REV -")
  for (const t of tbTokens) {
    const txt = t.text.trim();

    // Combined drawing number + revision: e.g. "SDV-100-4L-25 REV B"
    const comb = txt.match(/\b([A-Z0-9]{2,4}-[A-Z0-9\-_]{4,})\s+REV\s*([A-Z0-9\-]+)\b/i);
    if (comb) {
      result.drawingNumber = comb[1].toUpperCase();
      result.revision = comb[2].toUpperCase();
      break;
    }

    // Standard drawing number pattern: e.g. SDV-100-4L-25, SDV-71-B-1-GS
    const dwgOnly = txt.match(/\b([A-Z0-9]{2,4}-[A-Z0-9\-_]{4,})\b/);
    if (dwgOnly && !result.drawingNumber && !dwgOnly[1].includes('UNLESS') && !dwgOnly[1].includes('ANSI')) {
      result.drawingNumber = dwgOnly[1].toUpperCase();
    }

    const revOnly = txt.match(/\bREV(?:ISION)?\s*[:=]?\s*([A-Z0-9\-]+)\b/i);
    if (revOnly && !result.revision) {
      result.revision = revOnly[1].toUpperCase();
    }
  }

  // 5. PART NAME / TITLE (e.g. "ASSEMBLY", "PULLEY", "ADAPTER FLANGE")
  for (const t of tbTokens) {
    const txt = t.text.trim().toUpperCase();
    if (txt === 'ASSEMBLY' || txt === 'PULLEY' || txt === 'IDLER' || txt === 'SHAFT' || txt === 'FLANGE' || txt === 'HUB') {
      result.partName = txt;
      break;
    }
    const partMatch = t.text.match(/\b(?:PART|TITLE|DESCRIPTION)\s*[:=]\s*([A-Za-z0-9\s\-_]{3,})/i);
    if (partMatch && partMatch[1]) {
      result.partName = partMatch[1].trim().toUpperCase();
      break;
    }
  }

  // 6. MATERIAL SPECIFICATION
  const materialTokens = tokens.filter(t => /MATERIAL/i.test(t.text));
  for (const t of materialTokens) {
    const matMatch = t.text.match(/\b(?:MATERIAL|MAT'?L)\s*[:=]\s*([A-Za-z0-9\s\-/]+)/i);
    if (matMatch && matMatch[1]) {
      const cleanM = matMatch[1].trim();
      if (cleanM.length > 1 && !/^(?:SEE|AS|PER\s*$)/i.test(cleanM)) {
        result.material = cleanM;
        break;
      }
    }
  }
  // Check for multi-specification steel callouts: e.g. "STEEL PER MS-100", "STEEL PER MS-102"
  const steelTokens = tokens.filter(t => /STEEL\s+PER\s+MS-\d+/i.test(t.text));
  if (steelTokens.length > 0) {
    result.material = steelTokens.map(t => t.text.trim()).join(' / ');
  }

  // 7. GENERAL TOLERANCES NOTE (e.g. ".XXXX ±.0005  .XXX ±.005  .XX ±.010  ANGLES ±1°")
  for (const t of tbTokens) {
    if (
      t.text.includes('.XXXX') ||
      (t.text.includes('±') && t.text.includes('.XX')) ||
      (t.text.includes('ANGLES') && t.text.includes('±'))
    ) {
      result.generalToleranceNote = t.text.trim();
      break;
    }
  }

  // 8. ORGANIZATION / COMPANY NAME
  for (const t of tokens) {
    if (/NEW HAMPSHIRE INDUSTRIES/i.test(t.text) || /\bNHI\b/.test(t.text)) {
      result.organization = 'NEW HAMPSHIRE INDUSTRIES';
      break;
    }
  }

  return result;
}

/**
 * Merges extracted title block data into an existing TitleBlockMetadata object
 */
export function applyExtractedTitleBlock(
  existingMeta: TitleBlockMetadata,
  extracted: ExtractedTitleBlockMetadata
): TitleBlockMetadata {
  return {
    ...existingMeta,
    drawingNumber: extracted.drawingNumber || existingMeta.drawingNumber,
    partName: extracted.partName || existingMeta.partName,
    revision: extracted.revision || existingMeta.revision,
    organization: extracted.organization || existingMeta.organization,
    drawnBy: extracted.drawnBy || existingMeta.drawnBy,
    approvedBy: extracted.approvedBy || existingMeta.approvedBy,
    date: extracted.date || existingMeta.date,
    material: extracted.material || existingMeta.material,
    finish: extracted.finish || existingMeta.finish,
    generalToleranceNote: extracted.generalToleranceNote || existingMeta.generalToleranceNote,
    units: extracted.units || existingMeta.units,
  };
}
