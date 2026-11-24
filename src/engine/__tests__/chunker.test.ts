import { describe, expect, it } from 'vitest';
import {
  SAMPLE_DOCUMENTS,
  chunkCorpus,
  chunkDocument,
  estimateTokens,
  type DocumentSource,
} from '../index';

describe('chunker', () => {
  it('preserves exact character offsets into source content across all sample documents', () => {
    for (const doc of SAMPLE_DOCUMENTS) {
      const chunks = chunkDocument(doc, { chunkSize: 560, chunkOverlap: 100 });
      expect(chunks.length).toBeGreaterThan(2);

      for (const chunk of chunks) {
        expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
        expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
        expect(doc.content.slice(chunk.startOffset, chunk.endOffset)).toBe(
          chunk.text
        );
      }
    }
  });

  it('tracks markdown section headings accurately across chunks', () => {
    const apraDoc = SAMPLE_DOCUMENTS[0];
    const chunks = chunkDocument(apraDoc, { chunkSize: 500, chunkOverlap: 80 });

    const notificationChunk = chunks.find((c) =>
      c.text.includes('no later than 72 hours')
    );
    expect(notificationChunk).toBeDefined();
    expect(notificationChunk?.sectionHeading).toContain(
      'Mandatory APRA Incident Notification Windows'
    );
  });

  it('guarantees forward progress and overlap consistency even with large overlap settings', () => {
    const doc = SAMPLE_DOCUMENTS[1];
    const chunks = chunkDocument(doc, { chunkSize: 400, chunkOverlap: 350 });
    expect(chunks.length).toBeGreaterThan(3);

    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeGreaterThan(chunks[i - 1].startOffset);
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it('splits oversized single-paragraph text along sentence boundaries', () => {
    const sentence =
      'The Board of Directors must review quarterly information security metrics and verify third-party controls. ';
    const oversizedDoc: DocumentSource = {
      id: 'oversized-test',
      title: 'Oversized Policy',
      filename: 'oversized.txt',
      category: 'Governance',
      content: sentence.repeat(12).trim(),
      uploadedAt: '2026-10-01',
      active: true,
      isSample: false,
    };

    const chunks = chunkDocument(oversizedDoc, { chunkSize: 320, chunkOverlap: 60 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const chunk of chunks) {
      expect(oversizedDoc.content.slice(chunk.startOffset, chunk.endOffset)).toBe(
        chunk.text
      );
      expect(chunk.text.length).toBeLessThanOrEqual(360);
    }
  });

  it('excludes inactive documents in chunkCorpus and estimates tokens positively', () => {
    const toggled = SAMPLE_DOCUMENTS.map((d, idx) => ({
      ...d,
      active: idx === 0,
    }));
    const chunks = chunkCorpus(toggled, { chunkSize: 600, chunkOverlap: 100 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.documentId === SAMPLE_DOCUMENTS[0].id)).toBe(true);
    expect(estimateTokens('APRA CPS 234 compliance framework')).toBeGreaterThan(4);
    expect(estimateTokens('   ')).toBe(0);
  });
});
