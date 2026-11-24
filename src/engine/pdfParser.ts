/**
 * Client-side document text extraction for .txt, .md, .csv, and .pdf files.
 * Uses pdfjs-dist for PDF parsing with a deterministic raw-stream fallback.
 */

export interface ParsedFileResult {
  title: string;
  content: string;
  parserUsed: 'text' | 'csv' | 'pdfjs' | 'pdf-fallback';
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatCsvAsProse(rawCsv: string, title: string): string {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line, idx) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const pairs = headers
      .map((h, i) => `${h}: ${cells[i] ?? ''}`)
      .filter((p) => !p.endsWith(': '));
    return `Row ${idx + 1} — ${pairs.join('; ')}.`;
  });

  return `# ${title}\n\n## Tabular Dataset Summary\nColumns: ${headers.join(', ')}.\n\n${rows.join('\n\n')}`;
}

/**
 * Fallback ASCII/UTF-8 text extractor for simple uncompressed PDF streams when the
 * PDF.js worker cannot be initialized in a restricted browser environment.
 */
function fallbackExtractPdfText(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(buffer);
  const chunks: string[] = [];
  const literalRegex = /\(([^()\\]{4,300})\)/g;
  let match: RegExpExecArray | null;

  while ((match = literalRegex.exec(raw)) !== null) {
    const candidate = match[1].replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    if (candidate.length >= 4 && /[a-zA-Z]{2,}/.test(candidate)) {
      chunks.push(candidate);
    }
  }

  return chunks.join(' ').trim();
}

async function parsePdfFile(file: File): Promise<{ content: string; parserUsed: 'pdfjs' | 'pdf-fallback' }> {
  const buffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await import('pdfjs-dist');
    const workerUrl = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((s) => s.trim().length > 0);
      if (strings.length > 0) {
        pages.push(`## Page ${pageNum}\n${strings.join(' ').replace(/\s+/g, ' ').trim()}`);
      }
    }

    const joined = pages.join('\n\n').trim();
    if (joined.length > 0) {
      return { content: joined, parserUsed: 'pdfjs' };
    }
  } catch {
    // Fall through to deterministic stream parser
  }

  const fallbackText = fallbackExtractPdfText(buffer);
  if (!fallbackText) {
    throw new Error(
      'Could not extract text from this PDF. It may be scanned/image-only or encrypted.'
    );
  }

  return {
    content: `# ${titleFromFilename(file.name)}\n\n${fallbackText}`,
    parserUsed: 'pdf-fallback',
  };
}

export async function parseUploadedFile(file: File): Promise<ParsedFileResult> {
  const lower = file.name.toLowerCase();
  const title = titleFromFilename(file.name);

  if (lower.endsWith('.pdf')) {
    const { content, parserUsed } = await parsePdfFile(file);
    return { title, content, parserUsed };
  }

  const text = await file.text();
  if (!text.trim()) {
    throw new Error('The selected file is empty.');
  }

  if (lower.endsWith('.csv')) {
    return {
      title,
      content: formatCsvAsProse(text, title),
      parserUsed: 'csv',
    };
  }

  return {
    title,
    content: text.trim(),
    parserUsed: 'text',
  };
}
