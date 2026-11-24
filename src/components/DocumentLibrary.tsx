import { useRef, useState } from 'react';
import {
  CheckSquare,
  Eye,
  FileText,
  Square,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { estimateTokens, parseUploadedFile, type DocumentSource } from '../engine';

interface DocumentLibraryProps {
  documents: DocumentSource[];
  chunkCountsByDoc: Record<string, number>;
  selectedDocId: string | null;
  onToggleActive: (docId: string) => void;
  onSetAllActive: (active: boolean) => void;
  onSelectForView: (docId: string) => void;
  onAddDocument: (doc: DocumentSource) => void;
  onDeleteDocument: (docId: string) => void;
}

const CATEGORY_COLORS: Record<DocumentSource['category'], { bg: string; fg: string }> = {
  Regulatory: { bg: 'var(--accent-indigo-soft)', fg: 'var(--accent-indigo)' },
  Financial: { bg: 'var(--risk-low-bg)', fg: 'var(--risk-low-fg)' },
  Governance: { bg: 'var(--accent-amber-soft)', fg: 'var(--accent-amber)' },
  Legal: { bg: 'var(--risk-high-bg)', fg: 'var(--risk-high-fg)' },
  Uploaded: { bg: 'var(--bg-subtle)', fg: 'var(--ink-secondary)' },
};

export function DocumentLibrary({
  documents,
  chunkCountsByDoc,
  selectedDocId,
  onToggleActive,
  onSetAllActive,
  onSelectForView,
  onAddDocument,
  onDeleteDocument,
}: DocumentLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);
    setUploadError(null);
    setUploadNotice(null);

    try {
      let addedCount = 0;
      for (const file of Array.from(files)) {
        const parsed = await parseUploadedFile(file);
        const newDoc: DocumentSource = {
          id: `doc-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: parsed.title,
          filename: file.name,
          category: 'Uploaded',
          content: parsed.content,
          uploadedAt: new Date().toISOString().slice(0, 10),
          active: true,
          isSample: false,
          metadata: {
            author: 'Uploaded File',
            version: parsed.parserUsed.toUpperCase(),
          },
        };
        onAddDocument(newDoc);
        onSelectForView(newDoc.id);
        addedCount++;
      }
      if (addedCount > 0) {
        setUploadNotice(`Indexed ${addedCount} document${addedCount > 1 ? 's' : ''} into active corpus.`);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse uploaded file.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const allActive = documents.length > 0 && documents.every((d) => d.active);

  return (
    <aside
      className="h-full flex flex-col border-r overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>
            Document Library
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            Toggle sources for retrieval scope
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSetAllActive(!allActive)}
          className="text-[11px] font-medium px-2 py-1 rounded border transition-colors cursor-pointer"
          style={{
            borderColor: 'var(--border-hairline)',
            color: 'var(--ink-secondary)',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          {allActive ? 'Clear All' : 'Select All'}
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={isParsing}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-md border border-dashed flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          style={{
            borderColor: 'var(--border-strong)',
            backgroundColor: 'var(--bg-canvas)',
            color: 'var(--ink-primary)',
          }}
        >
          <Upload className="w-3.5 h-3.5" style={{ color: 'var(--accent-indigo)' }} />
          <span>{isParsing ? 'Extracting & chunking...' : 'Upload .pdf, .md, .txt, .csv'}</span>
        </button>

        {uploadError && (
          <div
            className="mt-2 p-2 rounded text-[11px] flex items-start gap-1.5 border"
            style={{
              backgroundColor: 'var(--risk-high-bg)',
              color: 'var(--risk-high-fg)',
              borderColor: 'var(--risk-high-border)',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadNotice && !uploadError && (
          <div
            className="mt-2 px-2 py-1.5 rounded text-[11px]"
            style={{
              backgroundColor: 'var(--accent-indigo-soft)',
              color: 'var(--accent-indigo)',
            }}
          >
            {uploadNotice}
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {documents.map((doc) => {
          const tokens = estimateTokens(doc.content);
          const chunks = chunkCountsByDoc[doc.id] ?? 0;
          const isSelected = selectedDocId === doc.id;
          const badgeStyle = CATEGORY_COLORS[doc.category];

          return (
            <div
              key={doc.id}
              className="rounded-md border p-3 transition-all"
              style={{
                backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                borderColor: isSelected ? 'var(--accent-indigo)' : 'var(--border-hairline)',
                opacity: doc.active ? 1 : 0.62,
              }}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleActive(doc.id)}
                  aria-label={`Toggle ${doc.title} in retrieval scope`}
                  className="mt-0.5 shrink-0 cursor-pointer"
                  style={{ color: doc.active ? 'var(--accent-indigo)' : 'var(--ink-muted)' }}
                >
                  {doc.active ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.fg }}
                    >
                      {doc.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectForView(doc.id)}
                        className="p-1 rounded hover:opacity-80 cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                        title="Open in Source Viewer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!doc.isSample && (
                        <button
                          type="button"
                          onClick={() => onDeleteDocument(doc.id)}
                          className="p-1 rounded hover:opacity-80 cursor-pointer"
                          style={{ color: 'var(--risk-high-fg)' }}
                          title="Remove uploaded document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectForView(doc.id)}
                    className="text-left w-full cursor-pointer"
                  >
                    <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 hover:underline">
                      {doc.title}
                    </h3>
                  </button>

                  <div
                    className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono-code truncate"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">{doc.filename}</span>
                  </div>

                  <div
                    className="mt-2 pt-2 border-t flex items-center justify-between text-[11px] font-mono-code"
                    style={{
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    <span>{doc.active ? `${chunks} chunks` : 'Excluded'}</span>
                    <span>~{tokens.toLocaleString()} tok</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
