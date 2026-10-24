import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

export interface ParsedDocSection {
  num?: string;
  title: string;
  content: string;
}

export interface ParsedDocResult {
  title?: string;
  rawText: string;
  markdown?: string;
  sections: ParsedDocSection[];
  wordCount: number;
  charCount: number;
}

/**
 * Extracts raw text, headings, and structured sections from an uploaded Word (.docx, .doc),
 * Excel (.xlsx, .xls), CSV, or text document.
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  // If user uploaded an actual PDF, do not attempt text extraction / binary parsing
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return {
      rawText: '',
      markdown: '',
      sections: [],
      wordCount: 0,
      charCount: 0,
    };
  }

  try {
    if (ext === 'docx') {
      return await parseDocxFile(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return await parseExcelFile(file);
    } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      return await parseTextFile(file);
    } else if (ext === 'doc') {
      return await parseLegacyDocFile(file);
    } else {
      // Attempt binary text extraction for any other format
      return await parseLegacyDocFile(file);
    }
  } catch (err) {
    console.warn(`Primary parser failed for ${file.name}, trying binary fallback:`, err);
    try {
      return await parseLegacyDocFile(file);
    } catch (fallbackErr) {
      console.error(`All parsers failed for ${file.name}:`, fallbackErr);
      return {
        rawText: '',
        sections: [],
        wordCount: 0,
        charCount: 0,
      };
    }
  }
}

/**
 * Parses modern Word .docx documents via mammoth with clean text extraction.
 */
async function parseDocxFile(file: File): Promise<ParsedDocResult> {
  const arrayBuffer = await file.arrayBuffer();

  let rawText = '';
  let markdown = '';

  try {
    const [textResult, mdResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToMarkdown({ arrayBuffer }).catch(() => ({ value: '' })),
    ]);
    rawText = textResult.value || '';
    markdown = mdResult.value || '';
  } catch (mammothErr) {
    console.warn('Mammoth extraction failed, falling back to binary scan:', mammothErr);
    rawText = extractRawTextFromBinary(arrayBuffer);
    markdown = rawText;
  }

  // If rawText is still empty, try binary scan
  if (!rawText.trim()) {
    rawText = extractRawTextFromBinary(arrayBuffer);
    markdown = rawText;
  }

  // Strip all markdown backslash escaping (\-, \., \(, \)) so text is completely natural
  const cleanRaw = rawText.replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1');
  const cleanMd = markdown
    .replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');

  const sections = extractSectionsFromText(cleanRaw, cleanMd);
  const wordCount = cleanRaw.trim() ? cleanRaw.trim().split(/\s+/).length : 0;

  return {
    rawText: cleanRaw,
    markdown: cleanMd,
    sections,
    wordCount,
    charCount: cleanRaw.length,
  };
}

/**
 * Parses Excel spreadsheets (.xlsx, .xls) into structured sections per worksheet.
 */
async function parseExcelFile(file: File): Promise<ParsedDocResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sections: ParsedDocSection[] = [];
  const textParts: string[] = [];

  workbook.worksheets.forEach((sheet, sheetIdx) => {
    const sheetName = sheet.name || `Sheet ${sheetIdx + 1}`;
    const rowLines: string[] = [];

    sheet.eachRow({ includeEmpty: false }, (row) => {
      // Row values is 1-indexed array in ExcelJS
      const vals = Array.isArray(row.values)
        ? row.values.slice(1).map((v: any) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'object' && v.text) return String(v.text).trim();
            if (typeof v === 'object' && v.result !== undefined) return String(v.result).trim();
            return String(v).trim();
          })
        : [];

      const cleanRow = vals.filter(Boolean);
      if (cleanRow.length > 0) {
        rowLines.push(cleanRow.join(' | '));
      }
    });

    if (rowLines.length > 0) {
      const sectionContent = rowLines.join('\n');
      sections.push({
        num: `${sheetIdx + 1}.0`,
        title: `WORKSHEET: ${sheetName.toUpperCase()}`,
        content: sectionContent,
      });
      textParts.push(`--- ${sheetName} ---\n` + sectionContent);
    }
  });

  const rawText = textParts.join('\n\n');
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  return {
    title: workbook.title || file.name.replace(/\.[^/.]+$/, ''),
    rawText,
    markdown: rawText,
    sections,
    wordCount,
    charCount: rawText.length,
  };
}

/**
 * Parses plain text, markdown, or CSV documents.
 */
async function parseTextFile(file: File): Promise<ParsedDocResult> {
  const text = await file.text();
  const sections = extractSectionsFromText(text, text);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    rawText: text,
    markdown: text,
    sections,
    wordCount,
    charCount: text.length,
  };
}

/**
 * Parses legacy Word .doc or binary files by scanning for readable text runs.
 */
async function parseLegacyDocFile(file: File): Promise<ParsedDocResult> {
  const arrayBuffer = await file.arrayBuffer();
  const rawText = extractRawTextFromBinary(arrayBuffer);
  const sections = extractSectionsFromText(rawText, rawText);
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  return {
    rawText,
    markdown: rawText,
    sections,
    wordCount,
    charCount: rawText.length,
  };
}

/**
 * Robust binary scan for readable ASCII and UTF-16LE text sequences from proprietary formats.
 */
function extractRawTextFromBinary(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);

  // If file begins with %PDF-, it is an existing PDF binary — do not extract raw PostScript bytecode as text!
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D) {
    return '';
  }

  const runs: string[] = [];
  let currentRun = '';

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Printable ASCII or newline / tab
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      if (b === 10 || b === 13) {
        if (currentRun.trim().length >= 3) {
          runs.push(currentRun.trim());
        }
        currentRun = '';
      } else {
        currentRun += String.fromCharCode(b);
      }
    } else {
      if (currentRun.trim().length >= 3) {
        runs.push(currentRun.trim());
      }
      currentRun = '';
    }
  }

  if (currentRun.trim().length >= 3) {
    runs.push(currentRun.trim());
  }

  // Filter out binary garbage / internal XML tags
  const filtered = runs.filter(
    (line) =>
      !line.startsWith('<?xml') &&
      !line.startsWith('<w:') &&
      !line.startsWith('xmlns:') &&
      !line.includes('CompObj') &&
      !line.includes('Microsoft Word') &&
      !line.includes('WordDocument') &&
      !/^[0-9a-fA-F]{16,}$/.test(line)
  );

  return filtered.join('\n\n');
}

/**
 * Heuristically parses text/markdown into structured sections based on headings and paragraph blocks.
 * Recognizes standard corporate SOP / WI numbering (e.g. 1.0, 1., Section 1:, 1.1, roman numerals, and bold caps).
 */
export function extractSectionsFromText(rawText: string, markdown: string): ParsedDocSection[] {
  const sections: ParsedDocSection[] = [];
  const source = markdown && markdown.trim().length > 0 ? markdown : rawText;
  const cleanSource = source
    .replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
  const lines = cleanSource.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentTitle = 'PURPOSE & OVERVIEW';
  let currentNum: string | undefined = undefined;
  let currentContent: string[] = [];

  // Patterns for corporate SOP / WI headings:
  // 1. "1.0 SCOPE", "1. SCOPE", "1.2.3 SUBSECTION"
  // 2. "SECTION 1: PURPOSE", "SECTION 1 - PURPOSE"
  // 3. "ARTICLE 1: SCOPE", "CLAUSE 1.0"
  // 4. "I. PURPOSE", "II. SCOPE", "IV. PROCEDURE"
  // 5. Markdown "# Heading", "## Heading"
  // 6. Standalone uppercase titles: "PURPOSE & APPLICABILITY", "ROLES & RESPONSIBILITIES"
  const numberedHeadingRegex = /^(\d+(\.\d+)*)\.?\s*[:\-–]?\s*([A-Za-z].*)$/;
  const sectionPrefixRegex = /^(SECTION|ARTICLE|CLAUSE|STEP)\s*(\d+(\.\d+)*|[A-Z])\.?\s*[:\-–]?\s*(.*)$/i;
  const romanNumeralRegex = /^([IVXLCDM]+)\.\s*([A-Za-z].*)$/i;
  const mdHeadingRegex = /^#{1,4}\s*(.*)$/;
  const knownSopTitles = /^(PURPOSE|SCOPE|RESPONSIBILITIES|ROLES|DEFINITIONS|PROCEDURE|WORK INSTRUCTION|INSPECTION CRITERIA|EQUIPMENT|SAFETY|REFERENCES|DOCUMENT REVISION HISTORY|ACCEPTANCE CRITERIA|RECORDS|APPROVAL)\b/i;

  const pushCurrentSection = () => {
    if (currentContent.length > 0) {
      sections.push({
        num: currentNum,
        title: currentTitle,
        content: currentContent.join('\n\n'),
      });
      currentContent = [];
    }
  };

  for (const line of lines) {
    const mdMatch = line.match(mdHeadingRegex);
    const numMatch = line.match(numberedHeadingRegex);
    const secPrefixMatch = line.match(sectionPrefixRegex);
    const romanMatch = line.match(romanNumeralRegex);
    const isStandaloneTitle = knownSopTitles.test(line) && line.length < 80;

    if (mdMatch || numMatch || secPrefixMatch || romanMatch || isStandaloneTitle) {
      pushCurrentSection();

      if (mdMatch) {
        const titleText = mdMatch[1].trim();
        const innerNum = titleText.match(numberedHeadingRegex);
        if (innerNum) {
          currentNum = innerNum[1];
          currentTitle = innerNum[3].trim().toUpperCase();
        } else {
          currentNum = undefined;
          currentTitle = titleText.toUpperCase();
        }
      } else if (secPrefixMatch) {
        currentNum = secPrefixMatch[2];
        currentTitle = (secPrefixMatch[4] ? `${secPrefixMatch[1]} ${secPrefixMatch[2]}: ${secPrefixMatch[4]}` : `${secPrefixMatch[1]} ${secPrefixMatch[2]}`).toUpperCase();
      } else if (numMatch) {
        currentNum = numMatch[1];
        currentTitle = numMatch[3].trim().toUpperCase();
      } else if (romanMatch) {
        currentNum = romanMatch[1].toUpperCase();
        currentTitle = romanMatch[2].trim().toUpperCase();
      } else if (isStandaloneTitle) {
        currentNum = undefined;
        currentTitle = line.replace(/[:\-–]+$/, '').trim().toUpperCase();
      }
    } else {
      currentContent.push(line);
    }
  }

  pushCurrentSection();

  // If no sections were separated, treat all text as the main content
  if (sections.length === 0 && rawText.trim().length > 0) {
    sections.push({
      num: '1.0',
      title: 'DOCUMENT CONTENT',
      content: rawText.trim(),
    });
  }

  return sections;
}
