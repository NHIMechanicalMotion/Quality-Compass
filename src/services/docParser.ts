import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

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
 * Converts HTML from mammoth into structured markdown with table support.
 * Turns <table> into standard markdown tables (| Col 1 | Col 2 |) so
 * that table headers and cells are never collapsed into unaligned vertical runs.
 */
function convertHtmlToStructuredMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  // 1. Process <table> elements into markdown tables
  const tableProcessed = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[][] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cleanCell = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/[\r\n]+/g, ' ')
          .replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1')
          .trim();
        cells.push(cleanCell);
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return '';

    // Normalize column count
    const maxCols = Math.max(...rows.map((r) => r.length));
    const mdLines: string[] = [];

    rows.forEach((r, idx) => {
      while (r.length < maxCols) r.push('');
      const sanitizedCells = r.map((c) => c.replace(/\|/g, '-'));
      mdLines.push(`| ${sanitizedCells.join(' | ')} |`);
      if (idx === 0) {
        mdLines.push(`| ${new Array(maxCols).fill('---').join(' | ')} |`);
      }
    });

    return `\n\n${mdLines.join('\n')}\n\n`;
  });

  // 2. Headings
  let processed = tableProcessed
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');

  // 3. Lists
  processed = processed
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n');

  // 4. Paragraphs and line breaks
  processed = processed
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // 5. Strip remaining HTML tags
  processed = processed.replace(/<[^>]+>/g, '');

  // 6. Decode common HTML entities
  processed = processed
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // 7. Strip markdown escapes & bold formatting
  processed = processed
    .replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');

  // 8. Normalize whitespace
  return processed
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts text from Word text boxes (<w:txbxContent>) and drawing shapes (<a:t>)
 * that are otherwise omitted by default by Mammoth.
 */
async function extractTextBoxesFromDocx(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return [];
    const xml = await docXmlFile.async('text');

    const textBoxTexts: string[] = [];

    // 1. Text boxes (<w:txbxContent>...</w:txbxContent>)
    const txbxMatches = xml.match(/<w:txbxContent[^>]*>([\s\S]*?)<\/w:txbxContent>/gi) || [];
    for (const txbx of txbxMatches) {
      const textMatches = txbx.match(/<w:t[^>]*>([^<]+)<\/w:t>/gi) || [];
      const boxText = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ').trim();
      if (boxText && !textBoxTexts.includes(boxText)) {
        textBoxTexts.push(boxText);
      }
    }

    // 2. DrawingML text shapes (<a:t>...</a:t>)
    const drawingTextMatches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/gi) || [];
    for (const dt of drawingTextMatches) {
      const cleanDt = dt.replace(/<[^>]+>/g, '').trim();
      if (cleanDt && !textBoxTexts.includes(cleanDt)) {
        textBoxTexts.push(cleanDt);
      }
    }

    return textBoxTexts;
  } catch {
    return [];
  }
}

/**
 * Parses modern Word .docx documents via mammoth with clean text extraction and HTML table support.
 */
async function parseDocxFile(file: File): Promise<ParsedDocResult> {
  const arrayBuffer = await file.arrayBuffer();

  let rawText = '';
  let markdown = '';
  let html = '';

  try {
    const [textResult, mdResult, htmlResult, textBoxes] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToMarkdown({ arrayBuffer }).catch(() => ({ value: '' })),
      mammoth.convertToHtml({ arrayBuffer }).catch(() => ({ value: '' })),
      extractTextBoxesFromDocx(arrayBuffer),
    ]);
    rawText = textResult.value || '';
    markdown = mdResult.value || '';
    html = htmlResult.value || '';

    // If text boxes or drawing text were found that were missed by mammoth, append them
    if (textBoxes.length > 0) {
      const missingBoxes = textBoxes.filter((b) => !rawText.includes(b));
      if (missingBoxes.length > 0) {
        rawText += '\n\n' + missingBoxes.join('\n\n');
        if (markdown) markdown += '\n\n' + missingBoxes.join('\n\n');
        if (html) html += '\n\n' + missingBoxes.map((b) => `<p>${b}</p>`).join('\n');
      }
    }
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

  // Always prefer convertHtmlToStructuredMarkdown if HTML exists
  const structuredMd = html ? convertHtmlToStructuredMarkdown(html) : '';

  // Strip all markdown backslash escaping (\-, \., \(, \)) so text is completely natural
  const cleanRaw = rawText.replace(/\\([.\-()_#*+!~`[\]{}<>])/g, '$1');
  const cleanMd = (structuredMd || markdown || cleanRaw)
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
  const knownSopTitles = /^(PURPOSE|SCOPE|RESPONSIBILITIES|ROLES|DEFINITIONS|PROCEDURE|WORK INSTRUCTION|INSPECTION CRITERIA|EQUIPMENT|SAFETY|REFERENCES|DOCUMENT REVISION HISTORY|REVISION HISTORY|REVISIONS|ACCEPTANCE CRITERIA|RECORDS|APPROVAL)\b/i;

  const joinContentLines = (linesToJoin: string[], title: string): string => {
    // If this is the initial document overview block, filter out redundant metadata fields that already exist in the official header
    const isOverview = title === 'PURPOSE & OVERVIEW' || title === 'DOCUMENT OVERVIEW';
    const filteredLines = linesToJoin.filter((line) => {
      if (!isOverview) return true;
      const clean = line.replace(/^[|#*_\-\s]+|[|#*_\-\s]+$/g, '').trim();
      return !/^(Document\s*Number|Doc\s*No|Doc\s*Number|Revision\s*Level|Revision|Effective\s*Date|Document\s*Owner|Document\s*Title|Doc\s*Title)[\s:|-]/i.test(clean);
    });

    const blocks: string[] = [];
    let currentTableLines: string[] = [];

    for (const line of filteredLines) {
      if (line.startsWith('|')) {
        currentTableLines.push(line);
      } else {
        if (currentTableLines.length > 0) {
          blocks.push(currentTableLines.join('\n'));
          currentTableLines = [];
        }
        blocks.push(line);
      }
    }
    if (currentTableLines.length > 0) {
      blocks.push(currentTableLines.join('\n'));
    }

    return blocks.join('\n\n');
  };

  let lastRootNum = 0;

  const pushCurrentSection = () => {
    if (currentContent.length > 0 || (currentNum !== undefined && currentTitle !== 'PURPOSE & OVERVIEW')) {
      const content = joinContentLines(currentContent, currentTitle);
      sections.push({
        num: currentNum,
        title: currentTitle,
        content: content.trim() || 'Refer to operational procedure sequence and attached specifications.',
      });
      currentContent = [];
    }
  };

  for (const line of lines) {
    const mdMatch = line.match(/^#{1,3}\s+(.*)$/);
    const romanMatch = line.match(/^([IVXLCDM]+)\.\s*([A-Za-z\s&/,\-–]+)$/i);
    const secPrefixMatch = line.match(/^(SECTION|ARTICLE|CLAUSE)\s*(\d{1,2})\.?\s*[:\-–]?\s*(.*)$/i);
    const numMatch = line.match(/^(\d{1,2})(\.0?)?\s*[:\-–]?\s*([A-Za-z].*)$/);

    let isHeading = false;
    let newNum: string | undefined = undefined;
    let newTitle = '';

    if (mdMatch) {
      const titleText = mdMatch[1].trim();
      const innerNum = titleText.match(/^(\d{1,2})(\.0?)?\s*[:\-–]?\s*(.*)$/);
      if (innerNum) {
        newNum = innerNum[1];
        newTitle = innerNum[3].trim().toUpperCase();
      } else {
        newNum = undefined;
        newTitle = titleText.toUpperCase();
      }
      isHeading = true;
    } else if (secPrefixMatch) {
      newNum = secPrefixMatch[2];
      newTitle = (secPrefixMatch[3] ? `${secPrefixMatch[1]} ${secPrefixMatch[2]}: ${secPrefixMatch[3]}` : `${secPrefixMatch[1]} ${secPrefixMatch[2]}`).toUpperCase();
      isHeading = true;
    } else if (romanMatch && romanMatch[2].length < 60 && !/[.?!]$/.test(line)) {
      newNum = romanMatch[1].toUpperCase();
      newTitle = romanMatch[2].trim().toUpperCase();
      isHeading = true;
    } else if (numMatch && line.length < 65 && !/[.?!]$/.test(line)) {
      const numVal = parseInt(numMatch[1], 10);
      const titleCandidate = numMatch[3].trim();
      const isKnown = knownSopTitles.test(titleCandidate);
      const isSequential = numVal === lastRootNum + 1;

      // Only treat as root section heading if it is a known SOP title or strictly in forward sequence
      // This prevents numbered procedure steps (e.g. "1. Verify packing slip...") from deleting Section 5!
      if (isKnown || isSequential) {
        newNum = String(numVal);
        newTitle = titleCandidate.toUpperCase();
        isHeading = true;
      }
    } else if (knownSopTitles.test(line) && line.length < 60 && !/[.?!]$/.test(line)) {
      newNum = undefined;
      newTitle = line.replace(/[:\-–]+$/, '').trim().toUpperCase();
      isHeading = true;
    }

    if (isHeading) {
      pushCurrentSection();
      currentNum = newNum;
      currentTitle = newTitle;
      if (newNum && !isNaN(parseInt(newNum, 10))) {
        lastRootNum = parseInt(newNum, 10);
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
