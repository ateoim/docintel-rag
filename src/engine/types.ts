export type DocumentCategory =
  | 'Regulatory'
  | 'Financial'
  | 'Governance'
  | 'Legal'
  | 'Uploaded';

export interface DocumentMetadata {
  author?: string;
  jurisdiction?: string;
  effectiveDate?: string;
  version?: string;
}

export interface DocumentSource {
  id: string;
  title: string;
  filename: string;
  category: DocumentCategory;
  content: string;
  uploadedAt: string;
  active: boolean;
  isSample: boolean;
  metadata?: DocumentMetadata;
}

export interface TextChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string;
  tokenEstimate: number;
}

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface RetrievalConfig {
  topK: number;
  /** 0.0 = pure BM25 lexical, 1.0 = pure TF-IDF cosine, 0.5 = balanced RRF */
  hybridAlpha: number;
  rrfK?: number;
  bm25K1?: number;
  bm25B?: number;
}

export interface RetrievalHit {
  chunk: TextChunk;
  bm25Score: number;
  bm25Rank: number;
  cosineScore: number;
  cosineRank: number;
  rrfScore: number;
  matchedTerms: string[];
}

export interface Citation {
  index: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionHeading: string;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  rrfScore: number;
  bm25Score: number;
  cosineScore: number;
}

export interface LLMConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface LLMProvider {
  generate(
    userPrompt: string,
    systemPrompt: string,
    config: LLMConfig
  ): Promise<string>;
}

export interface SynthesisResult {
  query: string;
  answer: string;
  citations: Citation[];
  hits: RetrievalHit[];
  mode: 'extractive' | 'llm';
  modelLabel: string;
  latencyMs: number;
  queryTerms: string[];
  warning?: string;
}

export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface RiskFlag {
  id: string;
  documentId: string;
  documentTitle: string;
  level: RiskLevel;
  category: string;
  excerpt: string;
  rationale: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string;
}

export interface ObligationItem {
  id: string;
  documentId: string;
  documentTitle: string;
  actor: string;
  requirement: string;
  deadline?: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string;
}

export interface FinancialMetric {
  id: string;
  documentId: string;
  documentTitle: string;
  value: string;
  kind: 'Currency' | 'Percentage' | 'Timeframe';
  context: string;
  startOffset: number;
  endOffset: number;
}

export interface NamedEntity {
  name: string;
  type: 'Regulator' | 'Standard' | 'Organization' | 'Jurisdiction';
  count: number;
  documentIds: string[];
}

export interface CrossDocOverlap {
  docAId: string;
  docATitle: string;
  docBId: string;
  docBTitle: string;
  similarity: number;
  sharedTerms: string[];
}

export interface InsightsReport {
  obligations: ObligationItem[];
  riskFlags: RiskFlag[];
  financialMetrics: FinancialMetric[];
  entities: NamedEntity[];
  crossDocMatrix: CrossDocOverlap[];
  summaryStats: {
    totalDocuments: number;
    totalChunks: number;
    totalTokens: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
}
