import mammoth from 'mammoth';

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
}

/**
 * Extracts raw text, headings, and structured sections from an uploaded Word (.docx) or text document.
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'docx') {
    return parseDocxFile(file);
  } else if (ext === 'txt' || ext === 'md') {
    return parseTextFile(file);
  }

  // Fallback for other formats
  return {
    rawText: '',
    sections: [],
  };
}

async function parseDocxFile(file: File): Promise<ParsedDocResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Extract raw text and markdown via mammoth
  const [textResult, mdResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToMarkdown({ arrayBuffer }).catch(() => ({ value: '' })),
  ]);

  const rawText = textResult.value || '';
  const markdown = mdResult.value || '';

  const sections = extractSectionsFromText(rawText, markdown);

  return {
    rawText,
    markdown,
    sections,
  };
}

async function parseTextFile(file: File): Promise<ParsedDocResult> {
  const text = await file.text();
  const sections = extractSectionsFromText(text, text);
  return {
    rawText: text,
    markdown: text,
    sections,
  };
}

/**
 * Heuristically parses text/markdown into structured sections based on headings and paragraph blocks.
 */
function extractSectionsFromText(rawText: string, markdown: string): ParsedDocSection[] {
  const sections: ParsedDocSection[] = [];
  const lines = (markdown || rawText).split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentTitle = 'GENERAL';
  let currentNum: string | undefined = undefined;
  let currentContent: string[] = [];

  const headingRegex = /^(\d+(\.\d+)*)\s*([A-Za-z].*)$/;
  const mdHeadingRegex = /^#{1,4}\s*(.*)$/;

  for (const line of lines) {
    const mdMatch = line.match(mdHeadingRegex);
    const numMatch = line.match(headingRegex);

    if (mdMatch || numMatch) {
      if (currentContent.length > 0) {
        sections.push({
          num: currentNum,
          title: currentTitle,
          content: currentContent.join('\n\n'),
        });
        currentContent = [];
      }

      if (mdMatch) {
        const titleText = mdMatch[1].trim();
        const innerNum = titleText.match(headingRegex);
        if (innerNum) {
          currentNum = innerNum[1];
          currentTitle = innerNum[3].trim().toUpperCase();
        } else {
          currentNum = undefined;
          currentTitle = titleText.toUpperCase();
        }
      } else if (numMatch) {
        currentNum = numMatch[1];
        currentTitle = numMatch[3].trim().toUpperCase();
      }
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      num: currentNum,
      title: currentTitle,
      content: currentContent.join('\n\n'),
    });
  }

  // If no sections were separated, treat all text as the main content
  if (sections.length === 0 && rawText.trim().length > 0) {
    sections.push({
      title: 'DOCUMENT CONTENT',
      content: rawText.trim(),
    });
  }

  return sections;
}
