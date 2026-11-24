import { describe, expect, it } from 'vitest';
import {
  HybridIndex,
  SAMPLE_DOCUMENTS,
  chunkCorpus,
  computeDocumentSimilarity,
} from '../index';

describe('HybridIndex retrieval (BM25 + TF-IDF Cosine + RRF)', () => {
  const chunks = chunkCorpus(SAMPLE_DOCUMENTS, {
    chunkSize: 600,
    chunkOverlap: 100,
  });
  const index = new HybridIndex(chunks);

  it('ranks the APRA CPS 234 notification passage first for breach deadline queries', () => {
    const hits = index.search(
      'APRA CPS 234 72 hours material information security incident notification',
      { topK: 5, hybridAlpha: 0.5 }
    );

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.documentId).toBe('doc-apra-cps234');
    expect(hits[0].chunk.text).toContain('72 hours');
    expect(hits[0].matchedTerms.length).toBeGreaterThanOrEqual(3);
  });

  it('produces valid positive BM25 scores and bounded [0, 1] cosine similarity scores', () => {
    const hits = index.search('uncapped liability confidentiality indemnity', {
      topK: 5,
      hybridAlpha: 0.5,
    });

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.documentId).toBe('doc-master-saas-agreement');

    for (const hit of hits) {
      expect(hit.bm25Score).toBeGreaterThanOrEqual(0);
      expect(hit.cosineScore).toBeGreaterThanOrEqual(0);
      expect(hit.cosineScore).toBeLessThanOrEqual(1);
      expect(hit.rrfScore).toBeGreaterThan(0);
    }
  });

  it('computes exact weighted Reciprocal Rank Fusion scores matching the mathematical formula', () => {
    const alpha = 0.35;
    const rrfK = 60;
    const hits = index.search('AWS ap-southeast-2 encryption sovereignty', {
      topK: 5,
      hybridAlpha: alpha,
      rrfK,
    });

    expect(hits.length).toBeGreaterThan(1);
    for (const hit of hits) {
      const expected =
        (1 - alpha) * (1 / (rrfK + hit.bm25Rank)) +
        alpha * (1 / (rrfK + hit.cosineRank));
      expect(hit.rrfScore).toBeCloseTo(expected, 10);
    }
  });

  it('respects hybridAlpha extremes (pure BM25 at alpha=0 vs pure cosine at alpha=1)', () => {
    const query = 'ARR gross margin burn rate Q3 2026';
    const bm25Only = index.search(query, { topK: 5, hybridAlpha: 0, rrfK: 60 });
    const cosineOnly = index.search(query, { topK: 5, hybridAlpha: 1, rrfK: 60 });

    expect(bm25Only[0].bm25Rank).toBe(1);
    expect(bm25Only[0].rrfScore).toBeCloseTo(1 / 61, 10);

    expect(cosineOnly[0].cosineRank).toBe(1);
    expect(cosineOnly[0].rrfScore).toBeCloseTo(1 / 61, 10);
  });

  it('returns an empty array for stopword-only or unmatched queries', () => {
    expect(index.search('the and of to for', { topK: 5, hybridAlpha: 0.5 })).toEqual(
      []
    );
    expect(
      index.search('xylophonequantumunmatchedtoken', { topK: 5, hybridAlpha: 0.5 })
    ).toEqual([]);
  });

  it('computes symmetric document similarity and shared domain terms', () => {
    const simAB = computeDocumentSimilarity(
      SAMPLE_DOCUMENTS[0].content,
      SAMPLE_DOCUMENTS[2].content
    );
    const simBA = computeDocumentSimilarity(
      SAMPLE_DOCUMENTS[2].content,
      SAMPLE_DOCUMENTS[0].content
    );

    expect(simAB.similarity).toBeCloseTo(simBA.similarity, 10);
    expect(simAB.similarity).toBeGreaterThan(0.1);
    expect(simAB.similarity).toBeLessThanOrEqual(1);
    expect(simAB.sharedTerms.length).toBeGreaterThan(0);
  });
});
