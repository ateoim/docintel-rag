import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type {
  ChunkingConfig,
  Citation,
  RetrievalConfig,
  SynthesisResult,
} from '../engine';

interface RagWorkspaceProps {
  chunkConfig: ChunkingConfig;
  retrievalConfig: RetrievalConfig;
  onChangeChunkConfig: (next: ChunkingConfig) => void;
  onChangeRetrievalConfig: (next: RetrievalConfig) => void;
  result: SynthesisResult | null;
  isRunning: boolean;
  activeCitationId: string | null;
  onRunQuery: (query: string) => void;
  onInspectCitation: (citation: Citation) => void;
  activeDocCount: number;
}

const PRESET_QUERIES = [
  'What are the APRA CPS 234 incident and control weakness notification deadlines?',
  'When does uncapped liability apply under the Master SaaS Vendor Agreement?',
  'Summarize Q3 2026 ARR, cash runway, burn rate, and cloud cost variances.',
  'What are the Australian data sovereignty and RAG grounding requirements?',
];

export function RagWorkspace({
  chunkConfig,
  retrievalConfig,
  onChangeChunkConfig,
  onChangeRetrievalConfig,
  result,
  isRunning,
  activeCitationId,
  onRunQuery,
  onInspectCitation,
  activeDocCount,
}: RagWorkspaceProps) {
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [showParams, setShowParams] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onRunQuery(trimmed);
  };

  const renderInlineTokens = (line: string, citations: Citation[]): ReactNode[] => {
    // Parse **bold** and [n] citations cleanly
    const parts = line.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
    return parts.map((part, idx) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={idx} className="font-semibold" style={{ color: 'var(--ink-primary)' }}>
            {boldMatch[1]}
          </strong>
        );
      }

      const citeMatch = part.match(/^\[(\d+)\]$/);
      if (citeMatch) {
        const citeNum = Number(citeMatch[1]);
        const citation = citations.find((c) => c.index === citeNum);
        if (citation) {
          const isActive = activeCitationId === citation.chunkId;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onInspectCitation(citation)}
              className={`citation-badge ${isActive ? 'active' : ''}`}
              title={`${citation.documentTitle} — ${citation.sectionHeading}`}
            >
              [{citeNum}]
            </button>
          );
        }
      }

      return <span key={idx}>{part}</span>;
    });
  };

  const renderAnswerBody = (answer: string, citations: Citation[]) => {
    const lines = answer.split('\n');
    return (
      <div className="space-y-2.5 text-[14px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-1" />;

          if (trimmed.startsWith('- ')) {
            return (
              <div key={i} className="flex items-start gap-2.5 pl-1">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{ backgroundColor: 'var(--accent-indigo)' }}
                />
                <p className="m-0">{renderInlineTokens(trimmed.slice(2), citations)}</p>
              </div>
            );
          }

          return (
            <p key={i} className="m-0">
              {renderInlineTokens(trimmed, citations)}
            </p>
          );
        })}
      </div>
    );
  };

  const alphaLabel =
    retrievalConfig.hybridAlpha <= 0.15
      ? 'BM25 Lexical Heavy'
      : retrievalConfig.hybridAlpha >= 0.85
        ? 'TF-IDF Vector Heavy'
        : 'Balanced Hybrid RRF';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Query Bar & Controls */}
      <div
        className="p-4 border-b space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question across the active enterprise corpus..."
            className="flex-1 px-3.5 py-2.5 rounded-md border text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-strong)',
              color: 'var(--ink-primary)',
            }}
          />
          <button
            type="submit"
            disabled={isRunning || activeDocCount === 0}
            className="px-4 py-2.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-indigo)',
              color: '#FFFFFF',
            }}
          >
            <span>{isRunning ? 'Synthesizing...' : 'Synthesize'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Preset questions & RAG params toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(preset);
                  onRunQuery(preset);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer truncate max-w-[260px]"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--ink-secondary)',
                }}
                title={preset}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowParams((v) => !v)}
            className="text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded border cursor-pointer shrink-0"
            style={{
              backgroundColor: showParams ? 'var(--accent-indigo-soft)' : 'var(--bg-canvas)',
              borderColor: showParams ? 'var(--accent-indigo-border)' : 'var(--border-hairline)',
              color: showParams ? 'var(--accent-indigo)' : 'var(--ink-secondary)',
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>RAG Parameters</span>
          </button>
        </div>

        {/* Adjustable RAG Parameters */}
        {showParams && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-md border text-xs"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <label className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: 'var(--ink-secondary)' }}>Chunk Size</span>
                <span className="font-mono-code font-medium">{chunkConfig.chunkSize} chars</span>
              </div>
              <input
                type="range"
                min={300}
                max={1200}
                step={40}
                value={chunkConfig.chunkSize}
                onChange={(e) =>
                  onChangeChunkConfig({
                    ...chunkConfig,
                    chunkSize: Number(e.target.value),
                  })
                }
                className="w-full accent-indigo-700"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: 'var(--ink-secondary)' }}>Chunk Overlap</span>
                <span className="font-mono-code font-medium">{chunkConfig.chunkOverlap} chars</span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={20}
                value={chunkConfig.chunkOverlap}
                onChange={(e) =>
                  onChangeChunkConfig({
                    ...chunkConfig,
                    chunkOverlap: Number(e.target.value),
                  })
                }
                className="w-full accent-indigo-700"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: 'var(--ink-secondary)' }}>Top-K Passages</span>
                <span className="font-mono-code font-medium">K = {retrievalConfig.topK}</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={retrievalConfig.topK}
                onChange={(e) =>
                  onChangeRetrievalConfig({
                    ...retrievalConfig,
                    topK: Number(e.target.value),
                  })
                }
                className="w-full accent-indigo-700"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: 'var(--ink-secondary)' }}>Hybrid Alpha (α)</span>
                <span className="font-mono-code font-medium">
                  {retrievalConfig.hybridAlpha.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={retrievalConfig.hybridAlpha}
                onChange={(e) =>
                  onChangeRetrievalConfig({
                    ...retrievalConfig,
                    hybridAlpha: Number(e.target.value),
                  })
                }
                className="w-full accent-indigo-700"
              />
              <div className="text-[10px] font-mono-code" style={{ color: 'var(--ink-muted)' }}>
                {alphaLabel}
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!result ? (
          <div
            className="rounded-lg border p-8 text-center"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <Sparkles
              className="w-6 h-6 mx-auto mb-3"
              style={{ color: 'var(--accent-indigo)' }}
            />
            <h3 className="font-serif-editorial text-base font-semibold">
              Ask a Question Across Your Document Corpus
            </h3>
            <p className="text-xs mt-1.5 max-w-md mx-auto" style={{ color: 'var(--ink-muted)' }}>
              Queries execute hybrid BM25 + TF-IDF cosine retrieval fused via Reciprocal Rank
              Fusion, binding every statement to inspectable source spans.
            </p>
          </div>
        ) : (
          <>
            {result.warning && (
              <div
                className="p-3 rounded-md border text-xs flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--risk-med-bg)',
                  borderColor: 'var(--risk-med-border)',
                  color: 'var(--risk-med-fg)',
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{result.warning}</span>
              </div>
            )}

            {/* Answer Card */}
            <article
              className="rounded-lg border p-5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--accent-indigo)' }}
                  >
                    Grounded Response
                  </span>
                  <h3 className="font-serif-editorial text-base font-semibold mt-0.5">
                    {result.query}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono-code">
                  <span
                    className="px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    {result.modelLabel}
                  </span>
                  <span style={{ color: 'var(--ink-muted)' }}>{result.latencyMs}ms</span>
                </div>
              </div>

              {renderAnswerBody(result.answer, result.citations)}

              {/* Citation Source Strip */}
              {result.citations.length > 0 && (
                <div
                  className="mt-5 pt-4 border-t"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    Cited Sources ({result.citations.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.citations.map((c) => {
                      const isActive = activeCitationId === c.chunkId;
                      return (
                        <button
                          key={c.chunkId}
                          type="button"
                          onClick={() => onInspectCitation(c)}
                          className="text-left p-2.5 rounded-md border transition-colors cursor-pointer flex items-start gap-2"
                          style={{
                            backgroundColor: isActive
                              ? 'var(--accent-indigo-soft)'
                              : 'var(--bg-canvas)',
                            borderColor: isActive
                              ? 'var(--accent-indigo)'
                              : 'var(--border-hairline)',
                          }}
                        >
                          <span className={`citation-badge shrink-0 mt-0.5 ${isActive ? 'active' : ''}`}>
                            [{c.index}]
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">
                              {c.documentTitle}
                            </div>
                            <div
                              className="text-[11px] truncate"
                              style={{ color: 'var(--ink-muted)' }}
                            >
                              {c.sectionHeading} · offsets {c.startOffset}–{c.endOffset}
                            </div>
                          </div>
                          <ExternalLink
                            className="w-3.5 h-3.5 shrink-0 mt-0.5"
                            style={{ color: 'var(--ink-muted)' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Retrieval Diagnostics Drawer */}
            <section
              className="rounded-lg border overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              <button
                type="button"
                onClick={() => setShowDiagnostics((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Retrieval Diagnostics
                  </span>
                  <span
                    className="ml-2 text-[11px] font-mono-code"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    BM25 + TF-IDF Cosine → RRF (α = {retrievalConfig.hybridAlpha.toFixed(2)}, k = 60)
                  </span>
                </div>
                {showDiagnostics ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDiagnostics && (
                <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  {result.hits.length === 0 ? (
                    <div className="p-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
                      No chunks matched the tokenized query terms.
                    </div>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr
                          className="border-b text-left font-mono-code text-[11px]"
                          style={{
                            borderColor: 'var(--border-hairline)',
                            color: 'var(--ink-muted)',
                            backgroundColor: 'var(--bg-canvas)',
                          }}
                        >
                          <th className="py-2 px-3">Cite</th>
                          <th className="py-2 px-3">Source &amp; Section</th>
                          <th className="py-2 px-3 text-right">BM25</th>
                          <th className="py-2 px-3 text-right">TF-IDF Cos</th>
                          <th className="py-2 px-3 text-right">RRF Score</th>
                          <th className="py-2 px-3">Matched Terms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.hits.map((hit, idx) => {
                          const citation = result.citations[idx];
                          return (
                            <tr
                              key={hit.chunk.id}
                              onClick={() => citation && onInspectCitation(citation)}
                              className="border-b cursor-pointer transition-colors hover:opacity-90"
                              style={{
                                borderColor: 'var(--border-hairline)',
                                backgroundColor:
                                  activeCitationId === hit.chunk.id
                                    ? 'var(--accent-indigo-soft)'
                                    : 'transparent',
                              }}
                            >
                              <td className="py-2.5 px-3 font-mono-code font-semibold">
                                <span className="citation-badge">[{idx + 1}]</span>
                              </td>
                              <td className="py-2.5 px-3 max-w-[220px]">
                                <div className="font-medium truncate">{hit.chunk.documentTitle}</div>
                                <div
                                  className="text-[11px] truncate"
                                  style={{ color: 'var(--ink-muted)' }}
                                >
                                  {hit.chunk.sectionHeading} · #{hit.chunk.chunkIndex}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-code">
                                <div>{hit.bm25Score.toFixed(3)}</div>
                                <div className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                  rank #{hit.bm25Rank}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-code">
                                <div>{hit.cosineScore.toFixed(3)}</div>
                                <div className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                  rank #{hit.cosineRank}
                                </div>
                              </td>
                              <td
                                className="py-2.5 px-3 text-right font-mono-code font-semibold"
                                style={{ color: 'var(--accent-indigo)' }}
                              >
                                {hit.rrfScore.toFixed(5)}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {hit.matchedTerms.slice(0, 5).map((term) => (
                                    <span
                                      key={term}
                                      className="px-1.5 py-0.5 rounded font-mono-code text-[10px]"
                                      style={{
                                        backgroundColor: 'var(--bg-subtle)',
                                        color: 'var(--ink-secondary)',
                                      }}
                                    >
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
