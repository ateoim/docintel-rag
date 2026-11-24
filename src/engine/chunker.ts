import type { ChunkingConfig, DocumentSource, TextChunk } from './types';

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 640,
  chunkOverlap: 120,
};

/**
 * Rough token count approximation calibrated to English enterprise prose (~4 chars/token).
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const wordCount = trimmed.split(/\s+/).length;
  const charEstimate = Math.ceil(trimmed.length / 4);
  return Math.max(wordCount, Math.round((wordCount * 1.3 + charEstimate) / 2));
}

interface HeadingMarker {
  offset: number;
  heading: string;
}

/**
 * Extracts Markdown or numbered section headings along with their exact character offsets.
 */
function extractHeadings(content: string): HeadingMarker[] {
  const markers: HeadingMarker[] = [];
  const lines = content.split('\n');
  let cursor = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const mdMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    const numberedMatch = trimmed.match(/^(?:Section\s+\d+[:.\s]+|\d+\.\d*\s+)([A-Z][^\n]{2,80})$/);

    if (mdMatch) {
      markers.push({ offset: cursor, heading: mdMatch[1].trim() });
    } else if (numberedMatch && trimmed.length <= 90 && !trimmed.endsWith('.')) {
      markers.push({ offset: cursor, heading: trimmed });
    }

    cursor += line.length + 1;
  }

  return markers;
}

function findHeadingAtOffset(markers: HeadingMarker[], offset: number, fallback: string): string {
  let active = fallback;
  for (const marker of markers) {
    if (marker.offset <= offset) {
      active = marker.heading;
    } else {
      break;
    }
  }
  return active;
}

interface SegmentSpan {
  start: number;
  end: number;
}

/**
 * Splits text into paragraph spans preserving exact character offsets into the source string.
 */
function splitParagraphSpans(content: string): SegmentSpan[] {
  const spans: SegmentSpan[] = [];
  const regex = /\n\s*\n+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const start = lastIndex;
    const end = match.index;
    if (end > start && content.slice(start, end).trim().length > 0) {
      spans.push(trimSpan(content, start, end));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length && content.slice(lastIndex).trim().length > 0) {
    spans.push(trimSpan(content, lastIndex, content.length));
  }

  return spans;
}

function trimSpan(content: string, start: number, end: number): SegmentSpan {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(content[s])) s++;
  while (e > s && /\s/.test(content[e - 1])) e--;
  return { start: s, end: e };
}

/**
 * Splits an oversized paragraph into sentence-aligned spans under maxLen.
 */
function splitOversizedSpan(content: string, span: SegmentSpan, maxLen: number): SegmentSpan[] {
  if (span.end - span.start <= maxLen) {
    return [span];
  }

  const results: SegmentSpan[] = [];
  let cursor = span.start;

  while (cursor < span.end) {
    const targetEnd = Math.min(cursor + maxLen, span.end);
    if (targetEnd === span.end) {
      results.push(trimSpan(content, cursor, span.end));
      break;
    }

    const windowText = content.slice(cursor, targetEnd);
    // Prefer sentence boundary, then newline, then whitespace
    let cutRel = -1;
    const sentenceMatches = [...windowText.matchAll(/[.!?]\s+/g)];
    if (sentenceMatches.length > 0) {
      const last = sentenceMatches[sentenceMatches.length - 1];
      if (last.index !== undefined && last.index > maxLen * 0.35) {
        cutRel = last.index + 1;
      }
    }

    if (cutRel === -1) {
      const lastNewline = windowText.lastIndexOf('\n');
      if (lastNewline > maxLen * 0.35) {
        cutRel = lastNewline;
      }
    }

    if (cutRel === -1) {
      const lastSpace = windowText.lastIndexOf(' ');
      if (lastSpace > maxLen * 0.35) {
        cutRel = lastSpace;
      }
    }

    if (cutRel === -1) {
      cutRel = targetEnd - cursor;
    }

    const nextEnd = cursor + cutRel;
    results.push(trimSpan(content, cursor, nextEnd));
    cursor = nextEnd;
    while (cursor < span.end && /\s/.test(content[cursor])) {
      cursor++;
    }
  }

  return results.filter((s) => s.end > s.start);
}

/**
 * Sliding-window chunker that respects paragraph and heading boundaries while preserving
 * exact character offsets (`content.slice(chunk.startOffset, chunk.endOffset) === chunk.text`).
 */
export function chunkDocument(
  doc: DocumentSource,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): TextChunk[] {
  const content = doc.content;
  if (!content.trim()) return [];

  const chunkSize = Math.max(160, Math.min(4000, Math.round(config.chunkSize)));
  const chunkOverlap = Math.max(0, Math.min(Math.floor(chunkSize * 0.6), Math.round(config.chunkOverlap)));

  const headings = extractHeadings(content);
  const rawParagraphs = splitParagraphSpans(content);
  const atomicSpans: SegmentSpan[] = [];

  for (const para of rawParagraphs) {
    atomicSpans.push(...splitOversizedSpan(content, para, chunkSize));
  }

  if (atomicSpans.length === 0) return [];

  const chunks: TextChunk[] = [];
  let i = 0;

  while (i < atomicSpans.length) {
    const startIdx = i;
    const chunkStart = atomicSpans[startIdx].start;
    let chunkEnd = atomicSpans[startIdx].end;
    let j = startIdx + 1;

    while (j < atomicSpans.length) {
      const candidateEnd = atomicSpans[j].end;
      if (candidateEnd - chunkStart <= chunkSize) {
        chunkEnd = candidateEnd;
        j++;
      } else {
        break;
      }
    }

    // If the chunk is a standalone heading and there is a following span, attach it
    // unless doing so would exceed 1.35x chunkSize
    if (
      j === startIdx + 1 &&
      j < atomicSpans.length &&
      /^#{1,4}\s+/.test(content.slice(chunkStart, chunkEnd)) &&
      atomicSpans[j].end - chunkStart <= chunkSize * 1.35
    ) {
      chunkEnd = atomicSpans[j].end;
      j++;
    }

    const text = content.slice(chunkStart, chunkEnd);
    const sectionHeading = findHeadingAtOffset(headings, chunkStart, doc.title);

    chunks.push({
      id: `${doc.id}::chunk-${chunks.length}`,
      documentId: doc.id,
      documentTitle: doc.title,
      chunkIndex: chunks.length,
      text,
      startOffset: chunkStart,
      endOffset: chunkEnd,
      sectionHeading,
      tokenEstimate: estimateTokens(text),
    });

    if (j >= atomicSpans.length) {
      break;
    }

    // Rewind for sliding overlap while guaranteeing forward progress
    if (chunkOverlap > 0) {
      const overlapFloor = chunkEnd - chunkOverlap;
      let nextStart = j;
      while (nextStart > startIdx + 1 && atomicSpans[nextStart - 1].start >= overlapFloor) {
        nextStart--;
      }
      i = nextStart;
    } else {
      i = j;
    }
  }

  return chunks;
}

export function chunkCorpus(
  documents: DocumentSource[],
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): TextChunk[] {
  const allChunks: TextChunk[] = [];
  for (const doc of documents) {
    if (!doc.active) continue;
    allChunks.push(...chunkDocument(doc, config));
  }
  return allChunks;
}
