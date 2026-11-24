import { useMemo, useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import {
  HybridIndex,
  tokenize,
  type RetrievalConfig,
  type RetrievalHit,
} from '../engine';

interface SemanticSearchProps {
  index: HybridIndex;
  retrievalConfig: RetrievalConfig;
  activeChunkId: string | null;
  onInspectHit: (hit: RetrievalHit) => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightPassage(text: string, rawQuery: string) {
  const terms = Array.from(
    new Set(
      rawQuery
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g) ?? []
    )
  );
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const segments = text.split(pattern);

  return segments.map((seg, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-hit-mark">
        {seg}
      </mark>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

export function SemanticSearch({
  index,
  retrievalConfig,
  activeChunkId,
  onInspectHit,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('encryption AWS ap-southeast-2 sovereignty');

  const hits = useMemo(() => {
    if (!query.trim()) return [];
    return index.search(query, { ...retrievalConfig, topK: Math.max(8, retrievalConfig.topK) });
  }, [index, query, retrievalConfig]);

  const maxBm25 = useMemo(
    () => Math.max(0.001, ...hits.map((h) => h.bm25Score)),
    [hits]
  );
  const maxRrf = useMemo(
    () => Math.max(0.0001, ...hits.map((h) => h.rrfScore)),
    [hits]
  );

  const queryTerms = useMemo(() => tokenize(query), [query]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="p-4 border-b space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--ink-muted)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Instant ranked passage search across active documents..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-md border text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-strong)',
              color: 'var(--ink-primary)',
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono-code" style={{ color: 'var(--ink-muted)' }}>
          <span>
            {hits.length} ranked passage{hits.length === 1 ? '' : 's'} · α ={' '}
            {retrievalConfig.hybridAlpha.toFixed(2)}
          </span>
          {queryTerms.length > 0 && (
            <span className="truncate max-w-[60%]">
              Normalized terms: {queryTerms.join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hits.length === 0 ? (
          <div
            className="rounded-lg border p-8 text-center text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-muted)',
            }}
          >
            Enter search terms to inspect live BM25, TF-IDF cosine, and RRF passage scores.
          </div>
        ) : (
          hits.map((hit, idx) => {
            const isSelected = activeChunkId === hit.chunk.id;
            const bm25Pct = Math.round((hit.bm25Score / maxBm25) * 100);
            const cosinePct = Math.round(hit.cosineScore * 100);
            const rrfPct = Math.round((hit.rrfScore / maxRrf) * 100);

            return (
              <article
                key={hit.chunk.id}
                onClick={() => onInspectHit(hit)}
                className="rounded-lg border p-4 transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  borderColor: isSelected ? 'var(--accent-indigo)' : 'var(--border-hairline)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="citation-badge">#{idx + 1}</span>
                      <h3 className="text-xs font-semibold truncate">
                        {hit.chunk.documentTitle}
                      </h3>
                    </div>
                    <div
                      className="text-[11px] font-mono-code mt-0.5"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      {hit.chunk.sectionHeading} · chunk #{hit.chunk.chunkIndex} · offsets{' '}
                      {hit.chunk.startOffset}–{hit.chunk.endOffset}
                    </div>
                  </div>
                  <ExternalLink
                    className="w-3.5 h-3.5 shrink-0 mt-0.5"
                    style={{ color: 'var(--ink-muted)' }}
                  />
                </div>

                <p
                  className="text-[13px] leading-relaxed mb-3"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {highlightPassage(hit.chunk.text, query)}
                </p>

                {/* Score breakdown bars */}
                <div
                  className="grid grid-cols-3 gap-3 pt-2.5 border-t text-[11px] font-mono-code"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <div>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: 'var(--ink-muted)' }}>BM25</span>
                      <span>{hit.bm25Score.toFixed(2)}</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${bm25Pct}%`,
                          backgroundColor: 'var(--accent-amber)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: 'var(--ink-muted)' }}>Cosine</span>
                      <span>{hit.cosineScore.toFixed(3)}</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cosinePct}%`,
                          backgroundColor: 'var(--accent-indigo)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: 'var(--ink-muted)' }}>RRF</span>
                      <span>{hit.rrfScore.toFixed(4)}</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${rrfPct}%`,
                          backgroundColor: 'var(--ink-primary)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
