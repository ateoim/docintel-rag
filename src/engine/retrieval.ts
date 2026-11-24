import type { RetrievalConfig, RetrievalHit, TextChunk } from './types';

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 5,
  hybridAlpha: 0.5,
  rrfK: 60,
  bm25K1: 1.5,
  bm25B: 0.75,
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'by', 'for', 'from',
  'has', 'have', 'had', 'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'of', 'on', 'or', 'our', 'she', 'that', 'the', 'their', 'them', 'there',
  'these', 'they', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'will', 'with', 'would', 'you', 'your', 'can', 'could', 'should',
  'about', 'above', 'after', 'all', 'also', 'any', 'but', 'do', 'does', 'did',
  'each', 'how', 'may', 'more', 'most', 'not', 'only', 'other', 'over', 'some',
  'such', 'than', 'then', 'under', 'up', 'very', 'via', 'per',
]);

/**
 * Lightweight suffix normalizer tailored to enterprise/legal English prose.
 * Keeps acronyms (e.g. APRA, CPS, SLA, AI) and numbers intact.
 */
export function normalizeTerm(raw: string): string {
  const term = raw.toLowerCase();
  if (term.length <= 3 || /^\d+$/.test(term)) return term;

  if (term.endsWith('ies') && term.length > 5) {
    return term.slice(0, -3) + 'y';
  }
  if (term.endsWith('ing') && term.length > 6) {
    return term.slice(0, -3);
  }
  if (term.endsWith('ed') && term.length > 5) {
    return term.slice(0, -2);
  }
  if (term.endsWith('es') && term.length > 5 && /(s|x|z|ch|sh)es$/.test(term)) {
    return term.slice(0, -2);
  }
  if (term.endsWith('s') && !term.endsWith('ss') && term.length > 4) {
    return term.slice(0, -1);
  }
  return term;
}

export function tokenize(text: string): string[] {
  const rawTokens = text.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) ?? [];
  const result: string[] = [];
  for (const token of rawTokens) {
    if (token.length < 2) continue;
    if (STOPWORDS.has(token)) continue;
    result.push(normalizeTerm(token));
  }
  return result;
}

interface IndexedChunk {
  chunk: TextChunk;
  length: number;
  termFreqs: Map<string, number>;
  tfidfVector: Map<string, number>;
  tfidfNorm: number;
}

/**
 * In-memory hybrid lexical + vector index supporting Okapi BM25,
 * L2-normalized TF-IDF cosine similarity, and weighted Reciprocal Rank Fusion (RRF).
 */
export class HybridIndex {
  private readonly docs: IndexedChunk[];
  private readonly docFreq: Map<string, number>;
  private readonly avgDocLength: number;
  private readonly totalDocs: number;

  constructor(chunks: TextChunk[]) {
    this.totalDocs = chunks.length;
    this.docFreq = new Map<string, number>();

    const rawIndexed: Array<{
      chunk: TextChunk;
      length: number;
      termFreqs: Map<string, number>;
    }> = [];

    let totalLength = 0;

    for (const chunk of chunks) {
      // Include section heading tokens with light boost for better section targeting
      const tokens = tokenize(`${chunk.sectionHeading} ${chunk.text}`);
      const termFreqs = new Map<string, number>();

      for (const token of tokens) {
        termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
      }

      for (const term of termFreqs.keys()) {
        this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
      }

      totalLength += tokens.length;
      rawIndexed.push({ chunk, length: tokens.length, termFreqs });
    }

    this.avgDocLength = this.totalDocs > 0 ? totalLength / this.totalDocs : 1;

    // Precompute sublinear TF-IDF vectors with L2 normalization
    this.docs = rawIndexed.map((item) => {
      const tfidfVector = new Map<string, number>();
      let normSq = 0;

      for (const [term, tf] of item.termFreqs.entries()) {
        const idf = this.tfidfIdf(term);
        const weight = (1 + Math.log(tf)) * idf;
        tfidfVector.set(term, weight);
        normSq += weight * weight;
      }

      return {
        chunk: item.chunk,
        length: item.length,
        termFreqs: item.termFreqs,
        tfidfVector,
        tfidfNorm: Math.sqrt(normSq),
      };
    });
  }

  get size(): number {
    return this.totalDocs;
  }

  private bm25Idf(term: string): number {
    const df = this.docFreq.get(term) ?? 0;
    if (df === 0) return 0;
    return Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));
  }

  private tfidfIdf(term: string): number {
    const df = this.docFreq.get(term) ?? 0;
    return Math.log((this.totalDocs + 1) / (df + 1)) + 1;
  }

  /**
   * Computes Okapi BM25 score for a single indexed chunk against query terms.
   */
  private scoreBm25(
    doc: IndexedChunk,
    queryTerms: string[],
    k1: number,
    b: number
  ): number {
    if (doc.length === 0 || queryTerms.length === 0) return 0;

    let score = 0;
    const seen = new Set<string>();

    for (const term of queryTerms) {
      if (seen.has(term)) continue;
      seen.add(term);

      const tf = doc.termFreqs.get(term) ?? 0;
      if (tf === 0) continue;

      const idf = this.bm25Idf(term);
      const denom = tf + k1 * (1 - b + b * (doc.length / this.avgDocLength));
      score += idf * ((tf * (k1 + 1)) / denom);
    }

    return score;
  }

  /**
   * Computes TF-IDF cosine similarity in [0, 1] between query vector and chunk vector.
   */
  private scoreCosine(
    doc: IndexedChunk,
    queryVec: Map<string, number>,
    queryNorm: number
  ): number {
    if (queryNorm === 0 || doc.tfidfNorm === 0) return 0;

    let dot = 0;
    for (const [term, qWeight] of queryVec.entries()) {
      const dWeight = doc.tfidfVector.get(term);
      if (dWeight !== undefined) {
        dot += qWeight * dWeight;
      }
    }

    return Math.min(1, Math.max(0, dot / (queryNorm * doc.tfidfNorm)));
  }

  search(
    query: string,
    config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
  ): RetrievalHit[] {
    if (this.totalDocs === 0) return [];

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const k1 = config.bm25K1 ?? 1.5;
    const b = config.bm25B ?? 0.75;
    const rrfK = config.rrfK ?? 60;
    const alpha = Math.max(0, Math.min(1, config.hybridAlpha));
    const topK = Math.max(1, Math.round(config.topK));

    // Build L2-normalized query TF-IDF vector
    const queryTf = new Map<string, number>();
    for (const t of queryTerms) {
      queryTf.set(t, (queryTf.get(t) ?? 0) + 1);
    }

    const queryVec = new Map<string, number>();
    let queryNormSq = 0;
    for (const [term, tf] of queryTf.entries()) {
      const weight = (1 + Math.log(tf)) * this.tfidfIdf(term);
      queryVec.set(term, weight);
      queryNormSq += weight * weight;
    }
    const queryNorm = Math.sqrt(queryNormSq);

    // Score every chunk on both lexical BM25 and TF-IDF cosine similarity
    const scored = this.docs
      .map((doc) => {
        const bm25Score = this.scoreBm25(doc, queryTerms, k1, b);
        const cosineScore = this.scoreCosine(doc, queryVec, queryNorm);
        const matchedTerms: string[] = [];

        for (const term of queryTf.keys()) {
          if (doc.termFreqs.has(term)) {
            matchedTerms.push(term);
          }
        }

        return {
          chunk: doc.chunk,
          bm25Score,
          cosineScore,
          matchedTerms,
          bm25Rank: 0,
          cosineRank: 0,
          rrfScore: 0,
        };
      })
      .filter((item) => item.bm25Score > 0 || item.cosineScore > 0);

    if (scored.length === 0) return [];

    // Rank by BM25 descending
    const byBm25 = [...scored].sort((a, b) => b.bm25Score - a.bm25Score);
    byBm25.forEach((item, idx) => {
      item.bm25Rank = idx + 1;
    });

    // Rank by Cosine similarity descending
    const byCosine = [...scored].sort((a, b) => b.cosineScore - a.cosineScore);
    byCosine.forEach((item, idx) => {
      item.cosineRank = idx + 1;
    });

    // Weighted Reciprocal Rank Fusion
    for (const item of scored) {
      const bm25Component = (1 - alpha) * (1 / (rrfK + item.bm25Rank));
      const cosineComponent = alpha * (1 / (rrfK + item.cosineRank));
      item.rrfScore = bm25Component + cosineComponent;
    }

    scored.sort((a, b) => {
      if (Math.abs(b.rrfScore - a.rrfScore) > 1e-9) {
        return b.rrfScore - a.rrfScore;
      }
      return b.bm25Score + b.cosineScore - (a.bm25Score + a.cosineScore);
    });

    return scored.slice(0, topK);
  }
}

/**
 * Helper to compute document-level TF-IDF cosine similarity and shared domain terms
 * between two raw document texts.
 */
export function computeDocumentSimilarity(
  textA: string,
  textB: string
): { similarity: number; sharedTerms: string[] } {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) {
    return { similarity: 0, sharedTerms: [] };
  }

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) ?? 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) ?? 0) + 1);

  let dot = 0;
  let normA = 0;
  let normB = 0;
  const shared: Array<{ term: string; score: number }> = [];

  for (const [term, countA] of freqA.entries()) {
    const wA = 1 + Math.log(countA);
    normA += wA * wA;
    const countB = freqB.get(term);
    if (countB !== undefined) {
      const wB = 1 + Math.log(countB);
      dot += wA * wB;
      shared.push({ term, score: wA * wB });
    }
  }

  for (const countB of freqB.values()) {
    const wB = 1 + Math.log(countB);
    normB += wB * wB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  const similarity = denom > 0 ? Math.min(1, dot / denom) : 0;

  shared.sort((a, b) => b.score - a.score);
  return {
    similarity,
    sharedTerms: shared.slice(0, 6).map((s) => s.term),
  };
}
