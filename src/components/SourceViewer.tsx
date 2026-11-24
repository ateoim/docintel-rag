import { useEffect, useRef } from 'react';
import { BookMarked, FileCode2, MapPin, X } from 'lucide-react';
import type { DocumentSource } from '../engine';

export interface ActiveSourceHighlight {
  documentId: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string;
  chunkIndex?: number;
  chunkId?: string;
  label?: string;
}

interface SourceViewerProps {
  documents: DocumentSource[];
  selectedDocId: string | null;
  highlight: ActiveSourceHighlight | null;
  onSelectDocument: (docId: string) => void;
  onClearHighlight: () => void;
}

export function SourceViewer({
  documents,
  selectedDocId,
  highlight,
  onSelectDocument,
  onClearHighlight,
}: SourceViewerProps) {
  const markRef = useRef<HTMLElement>(null);
  const doc = documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  const activeHighlight =
    doc && highlight && highlight.documentId === doc.id ? highlight : null;

  useEffect(() => {
    if (activeHighlight && markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlight]);

  if (!doc) {
    return (
      <section
        className="h-full flex items-center justify-center p-6 border-l text-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--ink-muted)',
        }}
      >
        Select a document or citation to inspect the original source text.
      </section>
    );
  }

  const renderContentWithHighlight = () => {
    const content = doc.content;
    if (
      !activeHighlight ||
      activeHighlight.startOffset < 0 ||
      activeHighlight.endOffset <= activeHighlight.startOffset ||
      activeHighlight.startOffset >= content.length
    ) {
      return (
        <div className="whitespace-pre-wrap text-[13px] leading-relaxed font-normal" style={{ color: 'var(--ink-secondary)' }}>
          {content}
        </div>
      );
    }

    const safeStart = Math.max(0, Math.min(content.length, activeHighlight.startOffset));
    const safeEnd = Math.max(safeStart, Math.min(content.length, activeHighlight.endOffset));

    const before = content.slice(0, safeStart);
    const target = content.slice(safeStart, safeEnd);
    const after = content.slice(safeEnd);

    return (
      <div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
        {before}
        <mark ref={markRef} className="source-highlight" style={{ color: 'var(--ink-primary)' }}>
          {target}
        </mark>
        {after}
      </div>
    );
  };

  return (
    <section
      className="h-full flex flex-col border-l overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b space-y-2"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookMarked className="w-3.5 h-3.5" style={{ color: 'var(--accent-indigo)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>
              Source Document Viewer
            </h2>
          </div>
          <span
            className="text-[10px] font-mono-code px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--ink-muted)',
            }}
          >
            {doc.content.length.toLocaleString()} chars
          </span>
        </div>

        <select
          value={doc.id}
          onChange={(e) => onSelectDocument(e.target.value)}
          aria-label="Select source document to inspect"
          className="w-full px-2.5 py-1.5 rounded-md border text-xs font-medium focus:outline-none"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-strong)',
            color: 'var(--ink-primary)',
          }}
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        {doc.metadata && (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-code"
            style={{ color: 'var(--ink-muted)' }}
          >
            {doc.metadata.jurisdiction && <span>{doc.metadata.jurisdiction}</span>}
            {doc.metadata.version && <span>· {doc.metadata.version}</span>}
            {doc.metadata.effectiveDate && <span>· Eff. {doc.metadata.effectiveDate}</span>}
          </div>
        )}
      </div>

      {/* Active Cited Span Metadata Banner */}
      {activeHighlight && (
        <div
          className="px-4 py-2.5 border-b flex items-start justify-between gap-2"
          style={{
            backgroundColor: 'var(--accent-amber-soft)',
            borderColor: 'var(--accent-amber-border)',
          }}
        >
          <div className="min-w-0">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--accent-amber)' }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {activeHighlight.label ?? 'Highlighted Citation Span'}
              </span>
            </div>
            <div
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono-code"
              style={{ color: 'var(--ink-primary)' }}
            >
              <span>Section: {activeHighlight.sectionHeading}</span>
              {activeHighlight.chunkIndex !== undefined && (
                <span>· Chunk #{activeHighlight.chunkIndex}</span>
              )}
              <span>
                · Offsets {activeHighlight.startOffset}–{activeHighlight.endOffset}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearHighlight}
            aria-label="Clear highlight"
            className="p-1 rounded hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--ink-primary)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Document Body */}
      <div className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: 'var(--bg-canvas)' }}>
        <div
          className="rounded-lg border p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono-code pb-3 mb-4 border-b"
            style={{
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-muted)',
            }}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{doc.filename}</span>
          </div>
          {renderContentWithHighlight()}
        </div>
      </div>
    </section>
  );
}
