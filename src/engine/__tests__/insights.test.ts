import { describe, expect, it } from 'vitest';
import { SAMPLE_DOCUMENTS, analyzeCorpus, chunkCorpus } from '../index';

describe('insights analyzer', () => {
  const chunks = chunkCorpus(SAMPLE_DOCUMENTS);
  const report = analyzeCorpus(SAMPLE_DOCUMENTS, chunks);

  it('extracts risk flags sorted by severity with valid document character offsets', () => {
    expect(report.riskFlags.length).toBeGreaterThan(5);
    expect(report.summaryStats.highRisks).toBeGreaterThan(0);
    expect(report.summaryStats.mediumRisks).toBeGreaterThan(0);

    const severityOrder = { High: 0, Medium: 1, Low: 2 };
    for (let i = 1; i < report.riskFlags.length; i++) {
      expect(severityOrder[report.riskFlags[i].level]).toBeGreaterThanOrEqual(
        severityOrder[report.riskFlags[i - 1].level]
      );
    }

    for (const flag of report.riskFlags) {
      const doc = SAMPLE_DOCUMENTS.find((d) => d.id === flag.documentId);
      expect(doc).toBeDefined();
      expect(flag.endOffset).toBeGreaterThan(flag.startOffset);
      expect(flag.endOffset).toBeLessThanOrEqual(doc!.content.length);
    }
  });

  it('extracts compliance obligations with actors and statutory deadlines', () => {
    expect(report.obligations.length).toBeGreaterThan(8);
    const has72HourObligation = report.obligations.some(
      (o) => o.deadline?.toLowerCase().includes('72 hours')
    );
    expect(has72HourObligation).toBe(true);
  });

  it('extracts AUD financial figures and SLA percentages across documents', () => {
    const currencyValues = report.financialMetrics
      .filter((m) => m.kind === 'Currency')
      .map((m) => m.value);
    const pctValues = report.financialMetrics
      .filter((m) => m.kind === 'Percentage')
      .map((m) => m.value);

    expect(currencyValues.some((v) => v.includes('42.8'))).toBe(true);
    expect(currencyValues.some((v) => v.includes('480,000'))).toBe(true);
    expect(pctValues).toContain('99.95%');
  });

  it('detects enterprise regulators/standards and computes pairwise cross-document overlap', () => {
    const entityNames = report.entities.map((e) => e.name);
    expect(entityNames).toContain('APRA');
    expect(entityNames).toContain('CPS 234');
    expect(entityNames).toContain('ISO 27001');
    expect(entityNames).toContain('OAIC');

    // 4 documents -> 4*3/2 = 6 unique pairs
    expect(report.crossDocMatrix.length).toBe(6);
    for (const pair of report.crossDocMatrix) {
      expect(pair.similarity).toBeGreaterThan(0);
      expect(pair.similarity).toBeLessThanOrEqual(1);
      expect(pair.sharedTerms.length).toBeGreaterThan(0);
    }
  });
});
