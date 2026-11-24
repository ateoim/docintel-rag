import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, MessageSquareText, Search } from 'lucide-react';
import {
  DEFAULT_CHUNKING_CONFIG,
  DEFAULT_LLM_CONFIG,
  DEFAULT_RETRIEVAL_CONFIG,
  HybridIndex,
  SAMPLE_DOCUMENTS,
  analyzeCorpus,
  chunkCorpus,
  estimateTokens,
  synthesizeAnswer,
  type ChunkingConfig,
  type Citation,
  type DocumentSource,
  type LLMConfig,
  type RetrievalConfig,
  type RetrievalHit,
  type SynthesisResult,
} from './engine';
import { Header } from './components/Header';
import { DocumentLibrary } from './components/DocumentLibrary';
import { RagWorkspace } from './components/RagWorkspace';
import { SemanticSearch } from './components/SemanticSearch';
import { ExecutiveInsights } from './components/ExecutiveInsights';
import {
  SourceViewer,
  type ActiveSourceHighlight,
} from './components/SourceViewer';
import { SettingsModal } from './components/SettingsModal';

type WorkspaceTab = 'rag' | 'search' | 'insights';
type MobilePane = 'library' | 'workspace' | 'source';

export function App() {
  const [documents, setDocuments] = useState<DocumentSource[]>(SAMPLE_DOCUMENTS);
  const [chunkConfig, setChunkConfig] = useState<ChunkingConfig>(DEFAULT_CHUNKING_CONFIG);
  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig>(
    DEFAULT_RETRIEVAL_CONFIG
  );
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('rag');
  const [mobilePane, setMobilePane] = useState<MobilePane>('workspace');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    SAMPLE_DOCUMENTS[0]?.id ?? null
  );
  const [highlight, setHighlight] = useState<ActiveSourceHighlight | null>(null);
  const [ragResult, setRagResult] = useState<SynthesisResult | null>(null);
  const [isRunningRag, setIsRunningRag] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const chunks = useMemo(
    () => chunkCorpus(documents, chunkConfig),
    [documents, chunkConfig]
  );

  const chunkCountsByDoc = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chunk of chunks) {
      counts[chunk.documentId] = (counts[chunk.documentId] ?? 0) + 1;
    }
    return counts;
  }, [chunks]);

  const hybridIndex = useMemo(() => new HybridIndex(chunks), [chunks]);

  const insightsReport = useMemo(
    () => analyzeCorpus(documents, chunks),
    [documents, chunks]
  );

  const activeDocs = useMemo(
    () => documents.filter((d) => d.active),
    [documents]
  );

  const totalTokens = useMemo(
    () => activeDocs.reduce((acc, doc) => acc + estimateTokens(doc.content), 0),
    [activeDocs]
  );

  const runRagQuery = useCallback(
    async (query: string) => {
      setIsRunningRag(true);
      try {
        const hits = hybridIndex.search(query, retrievalConfig);
        const synthesis = await synthesizeAnswer(query, hits, llmConfig);
        setRagResult(synthesis);
        if (synthesis.citations.length > 0) {
          const top = synthesis.citations[0];
          setSelectedDocId(top.documentId);
          setHighlight({
            documentId: top.documentId,
            startOffset: top.startOffset,
            endOffset: top.endOffset,
            sectionHeading: top.sectionHeading,
            chunkId: top.chunkId,
            chunkIndex: hits[0]?.chunk.chunkIndex,
            label: `Citation [${top.index}]`,
          });
        }
      } finally {
        setIsRunningRag(false);
      }
    },
    [hybridIndex, retrievalConfig, llmConfig]
  );

  // Run an initial demonstration query once on first mount
  useEffect(() => {
    void runRagQuery(
      'What are the APRA CPS 234 incident and control weakness notification deadlines?'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, active: !doc.active } : doc))
    );
  };

  const handleSetAllActive = (active: boolean) => {
    setDocuments((prev) => prev.map((doc) => ({ ...doc, active })));
  };

  const handleAddDocument = (doc: DocumentSource) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (selectedDocId === docId) {
      setSelectedDocId(documents.find((d) => d.id !== docId)?.id ?? null);
      setHighlight(null);
    }
  };

  const handleInspectCitation = (citation: Citation) => {
    const matchingHit = ragResult?.hits.find((h) => h.chunk.id === citation.chunkId);
    setSelectedDocId(citation.documentId);
    setHighlight({
      documentId: citation.documentId,
      startOffset: citation.startOffset,
      endOffset: citation.endOffset,
      sectionHeading: citation.sectionHeading,
      chunkId: citation.chunkId,
      chunkIndex: matchingHit?.chunk.chunkIndex,
      label: `Citation [${citation.index}]`,
    });
  };

  const handleInspectHit = (hit: RetrievalHit) => {
    setSelectedDocId(hit.chunk.documentId);
    setHighlight({
      documentId: hit.chunk.documentId,
      startOffset: hit.chunk.startOffset,
      endOffset: hit.chunk.endOffset,
      sectionHeading: hit.chunk.sectionHeading,
      chunkId: hit.chunk.id,
      chunkIndex: hit.chunk.chunkIndex,
      label: `Search Match · RRF ${hit.rrfScore.toFixed(4)}`,
    });
  };

  const handleInspectSpan = (span: {
    documentId: string;
    startOffset: number;
    endOffset: number;
    sectionHeading: string;
    label: string;
  }) => {
    setSelectedDocId(span.documentId);
    setHighlight({
      documentId: span.documentId,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      sectionHeading: span.sectionHeading,
      label: span.label,
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        activeDocCount={activeDocs.length}
        totalDocCount={documents.length}
        chunkCount={chunks.length}
        tokenCount={totalTokens}
        llmConfig={llmConfig}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Mobile / Tablet Pane Switcher */}
      <div
        className="lg:hidden grid grid-cols-3 border-b text-xs font-medium shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        {(
          [
            { id: 'library', label: `Library (${activeDocs.length})` },
            { id: 'workspace', label: 'Workbench' },
            { id: 'source', label: 'Source Viewer' },
          ] as const
        ).map((pane) => (
          <button
            key={pane.id}
            type="button"
            onClick={() => setMobilePane(pane.id)}
            className="py-2.5 text-center border-b-2 cursor-pointer"
            style={{
              borderColor: mobilePane === pane.id ? 'var(--accent-indigo)' : 'transparent',
              color: mobilePane === pane.id ? 'var(--accent-indigo)' : 'var(--ink-muted)',
            }}
          >
            {pane.label}
          </button>
        ))}
      </div>

      {/* 3-Pane Responsive Workbench */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_380px] xl:grid-cols-[300px_minmax(0,1fr)_440px]">
        {/* Left Sidebar: Document Library */}
        <div
          className={`min-h-0 overflow-hidden ${
            mobilePane === 'library' ? 'block' : 'hidden'
          } lg:block`}
        >
          <DocumentLibrary
            documents={documents}
            chunkCountsByDoc={chunkCountsByDoc}
            selectedDocId={selectedDocId}
            onToggleActive={handleToggleActive}
            onSetAllActive={handleSetAllActive}
            onSelectForView={(docId) => {
              setSelectedDocId(docId);
              setHighlight(null);
              setMobilePane('source');
            }}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        </div>

        {/* Center Pane: Tabbed Workspace */}
        <section
          className={`min-h-0 flex-col overflow-hidden ${
            mobilePane === 'workspace' ? 'flex' : 'hidden'
          } lg:flex`}
        >
          <nav
            className="px-4 border-b flex items-center gap-1 shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            {(
              [
                { id: 'rag', label: 'RAG Q&A & Synthesis', icon: MessageSquareText },
                { id: 'search', label: 'Semantic Search', icon: Search },
                { id: 'insights', label: 'Executive Insights', icon: BarChart3 },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="px-3 py-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer"
                  style={{
                    borderColor: isActive ? 'var(--accent-indigo)' : 'transparent',
                    color: isActive ? 'var(--accent-indigo)' : 'var(--ink-muted)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'rag' && (
              <RagWorkspace
                chunkConfig={chunkConfig}
                retrievalConfig={retrievalConfig}
                onChangeChunkConfig={setChunkConfig}
                onChangeRetrievalConfig={setRetrievalConfig}
                result={ragResult}
                isRunning={isRunningRag}
                activeCitationId={highlight?.chunkId ?? null}
                onRunQuery={runRagQuery}
                onInspectCitation={handleInspectCitation}
                activeDocCount={activeDocs.length}
              />
            )}

            {activeTab === 'search' && (
              <SemanticSearch
                index={hybridIndex}
                retrievalConfig={retrievalConfig}
                activeChunkId={highlight?.chunkId ?? null}
                onInspectHit={handleInspectHit}
              />
            )}

            {activeTab === 'insights' && (
              <ExecutiveInsights
                report={insightsReport}
                onInspectSpan={handleInspectSpan}
              />
            )}
          </div>
        </section>

        {/* Right Pane: Source Document Viewer */}
        <div
          className={`min-h-0 overflow-hidden ${
            mobilePane === 'source' ? 'block' : 'hidden'
          } lg:block`}
        >
          <SourceViewer
            documents={documents}
            selectedDocId={selectedDocId}
            highlight={highlight}
            onSelectDocument={(docId) => {
              setSelectedDocId(docId);
              setHighlight(null);
            }}
            onClearHighlight={() => setHighlight(null)}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        config={llmConfig}
        onSave={setLlmConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
