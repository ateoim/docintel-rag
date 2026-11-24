import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  DollarSign,
  GitCompare,
  ExternalLink,
} from 'lucide-react';
import type { InsightsReport, RiskLevel } from '../engine';

interface ExecutiveInsightsProps {
  report: InsightsReport;
  onInspectSpan: (span: {
    documentId: string;
    startOffset: number;
    endOffset: number;
    sectionHeading: string;
    label: string;
  }) => void;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; fg: string; border: string }> = {
  High: {
    bg: 'var(--risk-high-bg)',
    fg: 'var(--risk-high-fg)',
    border: 'var(--risk-high-border)',
  },
  Medium: {
    bg: 'var(--risk-med-bg)',
    fg: 'var(--risk-med-fg)',
    border: 'var(--risk-med-border)',
  },
  Low: {
    bg: 'var(--risk-low-bg)',
    fg: 'var(--risk-low-fg)',
    border: 'var(--risk-low-border)',
  },
};

export function ExecutiveInsights({ report, onInspectSpan }: ExecutiveInsightsProps) {
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');

  const filteredRisks =
    riskFilter === 'All'
      ? report.riskFlags
      : report.riskFlags.filter((r) => r.level === riskFilter);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            High Risks
          </div>
          <div
            className="text-2xl font-serif-editorial font-semibold mt-1"
            style={{ color: 'var(--risk-high-fg)' }}
          >
            {report.summaryStats.highRisks}
          </div>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Medium Risks
          </div>
          <div
            className="text-2xl font-serif-editorial font-semibold mt-1"
            style={{ color: 'var(--risk-med-fg)' }}
          >
            {report.summaryStats.mediumRisks}
          </div>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Obligations
          </div>
          <div
            className="text-2xl font-serif-editorial font-semibold mt-1"
            style={{ color: 'var(--accent-indigo)' }}
          >
            {report.obligations.length}
          </div>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Figures &amp; KPIs
          </div>
          <div className="text-2xl font-serif-editorial font-semibold mt-1">
            {report.financialMetrics.length}
          </div>
        </div>
      </div>

      {/* Risk Flags */}
      <section
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Automated Risk Flags ({filteredRisks.length})
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {(['All', 'High', 'Medium', 'Low'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className="px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer"
                style={{
                  backgroundColor:
                    riskFilter === lvl ? 'var(--accent-indigo)' : 'var(--bg-surface)',
                  color: riskFilter === lvl ? '#FFFFFF' : 'var(--ink-secondary)',
                  borderColor:
                    riskFilter === lvl ? 'var(--accent-indigo)' : 'var(--border-hairline)',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
          {filteredRisks.slice(0, 12).map((flag) => {
            const st = RISK_STYLES[flag.level];
            return (
              <div
                key={flag.id}
                onClick={() =>
                  onInspectSpan({
                    documentId: flag.documentId,
                    startOffset: flag.startOffset,
                    endOffset: flag.endOffset,
                    sectionHeading: flag.sectionHeading,
                    label: `${flag.level} Risk: ${flag.category}`,
                  })
                }
                className="p-3.5 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0"
                      style={{
                        backgroundColor: st.bg,
                        color: st.fg,
                        borderColor: st.border,
                      }}
                    >
                      {flag.level}
                    </span>
                    <span className="text-xs font-semibold truncate">{flag.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: 'var(--ink-muted)' }}>
                    <span className="truncate max-w-[160px]">{flag.documentTitle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                  {flag.excerpt}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                  {flag.rationale}
                </p>
              </div>
            );
          })}
          {filteredRisks.length === 0 && (
            <div className="p-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
              No risk flags match the selected severity filter.
            </div>
          )}
        </div>
      </section>

      {/* Key Obligations */}
      <section
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center gap-2"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <ClipboardCheck className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Key Compliance Obligations ({report.obligations.length})
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
          {report.obligations.slice(0, 10).map((obl) => (
            <div
              key={obl.id}
              onClick={() =>
                onInspectSpan({
                  documentId: obl.documentId,
                  startOffset: obl.startOffset,
                  endOffset: obl.endOffset,
                  sectionHeading: obl.sectionHeading,
                  label: `Obligation (${obl.actor})`,
                })
              }
              className="p-3.5 cursor-pointer hover:opacity-90"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--accent-indigo-soft)',
                      color: 'var(--accent-indigo)',
                    }}
                  >
                    {obl.actor}
                  </span>
                  {obl.deadline && (
                    <span
                      className="text-[11px] font-mono-code px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--accent-amber-soft)',
                        color: 'var(--accent-amber)',
                      }}
                    >
                      {obl.deadline}
                    </span>
                  )}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  {obl.documentTitle}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                {obl.requirement}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Entities & Financial Figures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center gap-2"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            <Building2 className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Named Entities &amp; Standards
            </h3>
          </div>
          <div className="p-3.5 flex flex-wrap gap-2">
            {report.entities.map((ent) => (
              <div
                key={ent.name}
                className="px-2.5 py-1 rounded-md border text-xs flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <span className="font-medium">{ent.name}</span>
                <span
                  className="text-[10px] font-mono-code px-1 rounded"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  {ent.type} · {ent.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center gap-2"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            <DollarSign className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Financial &amp; Quantitative Figures
            </h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border-hairline)' }}>
            {report.financialMetrics.slice(0, 12).map((fig) => (
              <div
                key={fig.id}
                onClick={() =>
                  onInspectSpan({
                    documentId: fig.documentId,
                    startOffset: fig.startOffset,
                    endOffset: fig.endOffset,
                    sectionHeading: fig.documentTitle,
                    label: `Figure: ${fig.value}`,
                  })
                }
                className="p-3 cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span
                    className="font-mono-code text-xs font-semibold"
                    style={{ color: 'var(--accent-indigo)' }}
                  >
                    {fig.value}
                  </span>
                  <span className="text-[10px] truncate max-w-[160px]" style={{ color: 'var(--ink-muted)' }}>
                    {fig.documentTitle}
                  </span>
                </div>
                <p className="text-[11px] line-clamp-2" style={{ color: 'var(--ink-secondary)' }}>
                  {fig.context}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Cross-Document Comparison Matrix */}
      {report.crossDocMatrix.length > 0 && (
        <section
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center gap-2"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            <GitCompare className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Cross-Document Overlap Matrix
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className="border-b text-left text-[11px] font-mono-code"
                  style={{
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--ink-muted)',
                    backgroundColor: 'var(--bg-canvas)',
                  }}
                >
                  <th className="py-2 px-3">Document Pair</th>
                  <th className="py-2 px-3 w-36">Cosine Overlap</th>
                  <th className="py-2 px-3">Shared Domain Terms</th>
                </tr>
              </thead>
              <tbody>
                {report.crossDocMatrix.map((pair) => {
                  const pct = Math.round(pair.similarity * 100);
                  return (
                    <tr
                      key={`${pair.docAId}-${pair.docBId}`}
                      className="border-b"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium">{pair.docATitle}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                          ↔ {pair.docBTitle}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-code">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-subtle)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: 'var(--accent-indigo)',
                              }}
                            />
                          </div>
                          <span>{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {pair.sharedTerms.map((term) => (
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
          </div>
        </section>
      )}
    </div>
  );
}
