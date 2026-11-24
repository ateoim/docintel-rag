import { estimateTokens } from './chunker';
import { computeDocumentSimilarity } from './retrieval';
import type {
  CrossDocOverlap,
  DocumentSource,
  FinancialMetric,
  InsightsReport,
  NamedEntity,
  ObligationItem,
  RiskFlag,
  RiskLevel,
  TextChunk,
} from './types';

interface SentenceSpan {
  text: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string;
}

function extractDocumentSentences(doc: DocumentSource): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const lines = doc.content.split('\n');
  let cursor = 0;
  let currentHeading = doc.title;

  for (const line of lines) {
    const trimmed = line.trim();
    const mdMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (mdMatch) {
      currentHeading = mdMatch[1].trim();
      cursor += line.length + 1;
      continue;
    }

    if (trimmed.length >= 24) {
      // Split line into sentences without breaking on decimal numbers (e.g. 42.8, 99.95%)
      const sentenceRegex = /(?:[^.!?]|[.!?](?!\s|$))+[.!?]*(?=\s|$)/g;
      let match: RegExpExecArray | null;
      while ((match = sentenceRegex.exec(line)) !== null) {
        const raw = match[0];
        const leadingWs = raw.length - raw.trimStart().length;
        const cleaned = raw.trim().replace(/^[-*•]\s+/, '');
        if (cleaned.length >= 28) {
          const startOffset = cursor + match.index + leadingWs;
          const endOffset = cursor + match.index + raw.trimEnd().length;
          spans.push({
            text: cleaned,
            startOffset,
            endOffset,
            sectionHeading: currentHeading,
          });
        }
      }
    }

    cursor += line.length + 1;
  }

  return spans;
}

interface RiskRule {
  level: RiskLevel;
  category: string;
  pattern: RegExp;
  rationale: string;
}

const RISK_RULES: RiskRule[] = [
  {
    level: 'High',
    category: 'Regulatory Breach & Reporting',
    pattern: /\b(72 hours|10 business days|material information security incident|notifiable data breach|regulatory sanction|penalt(?:y|ies)|non-compliance)\b/i,
    rationale: 'Strict statutory notification window or regulatory enforcement exposure.',
  },
  {
    level: 'High',
    category: 'Liability & Indemnification',
    pattern: /\b(uncapped liability|indemnif(?:y|ication)|consequential loss|breach of confidentiality|intellectual property infringement|gross negligence)\b/i,
    rationale: 'Elevated contractual liability or uncapped indemnity exposure.',
  },
  {
    level: 'High',
    category: 'Data Sovereignty & AI Shadow Risk',
    pattern: /\b(prohibited|unauthorized|public generative ai|offshore transfer|unapproved third-party|data exfiltration|model hallucination)\b/i,
    rationale: 'Controls against unapproved data egress, offshore residency breach, or unvalidated AI outputs.',
  },
  {
    level: 'Medium',
    category: 'Third-Party & Supply Chain Control',
    pattern: /\b(third-party|subprocessor|vendor|outsourc(?:ed|ing)|audit right|penetration test|vulnerability)\b/i,
    rationale: 'Requires ongoing vendor assurance, testing, or contractual audit oversight.',
  },
  {
    level: 'Medium',
    category: 'Service Availability & Financial Exposure',
    pattern: /\b(service credit|uptime|99\.\d+%|cost overrun|churn|net revenue retention|margin compression|burn rate)\b/i,
    rationale: 'Operational SLA or financial performance variance requiring quarterly monitoring.',
  },
  {
    level: 'Medium',
    category: 'Security Architecture & Governance',
    pattern: /\b(encryption|key management|zero trust|privileged access|role-based|model drift|human-in-the-loop)\b/i,
    rationale: 'Technical safeguard or governance control requiring verification during internal audit.',
  },
  {
    level: 'Low',
    category: 'Review Cadence & Notice',
    pattern: /\b(annual review|quarterly|30 days'? written notice|policy review|board reporting|steering committee)\b/i,
    rationale: 'Routine governance cadence or standard administrative notice obligation.',
  },
];

const ENTITY_CATALOG: Array<{
  name: string;
  type: NamedEntity['type'];
  pattern: RegExp;
}> = [
  { name: 'APRA', type: 'Regulator', pattern: /\bAPRA\b/g },
  { name: 'ASIC', type: 'Regulator', pattern: /\bASIC\b/g },
  { name: 'OAIC', type: 'Regulator', pattern: /\bOAIC\b/g },
  { name: 'ACSC', type: 'Regulator', pattern: /\bACSC\b/g },
  { name: 'RBA', type: 'Regulator', pattern: /\bRBA\b/g },
  { name: 'CPS 234', type: 'Standard', pattern: /\bCPS\s*234\b/gi },
  { name: 'CPS 230', type: 'Standard', pattern: /\bCPS\s*230\b/gi },
  { name: 'ISO 27001', type: 'Standard', pattern: /\bISO(?:\/IEC)?\s*27001\b/gi },
  { name: 'SOC 2 Type II', type: 'Standard', pattern: /\bSOC\s*2\s*Type\s*II\b/gi },
  { name: 'Privacy Act 1988', type: 'Standard', pattern: /\bPrivacy Act 1988\b/gi },
  { name: 'Essential Eight', type: 'Standard', pattern: /\bEssential Eight\b/gi },
  { name: 'NIST AI RMF', type: 'Standard', pattern: /\bNIST AI RMF\b/gi },
  { name: 'Australia', type: 'Jurisdiction', pattern: /\bAustralia(?:n)?\b/g },
  { name: 'Victoria', type: 'Jurisdiction', pattern: /\bVictoria\b/g },
  { name: 'Melbourne', type: 'Jurisdiction', pattern: /\bMelbourne\b/g },
  { name: 'Sydney', type: 'Jurisdiction', pattern: /\bSydney\b/g },
  { name: 'Southern Cross FinTech', type: 'Organization', pattern: /\bSouthern Cross FinTech(?:\s+Pty\s+Ltd)?\b/g },
  { name: 'Aurelia Cloud Systems', type: 'Organization', pattern: /\bAurelia Cloud Systems(?:\s+Pty\s+Ltd)?\b/g },
  { name: 'AWS ap-southeast-2', type: 'Organization', pattern: /\b(?:AWS\s+)?ap-southeast-2\b/gi },
];

function extractActor(sentence: string): string {
  const actorMatch = sentence.match(
    /\b(The Board|Board of Directors|APRA-regulated entities|The Entity|The Vendor|The Customer|Engineering teams|Security Operations|CISO|Chief Risk Officer|Internal Audit|Platform Engineering|All personnel|Third-party providers)\b/i
  );
  return actorMatch ? actorMatch[1] : 'Organization / Party';
}

function extractDeadline(sentence: string): string | undefined {
  const match = sentence.match(
    /\b(?:within|no later than|at least|every)\s+(\d+\s+(?:hours?|business days?|calendar days?|days?|months?|quarters?|years?)|annually|quarterly)\b/i
  );
  return match ? match[0] : undefined;
}

/**
 * Deterministically analyzes active documents to extract compliance obligations,
 * tiered risk flags, financial figures, named entities, and cross-document similarity.
 */
export function analyzeCorpus(
  documents: DocumentSource[],
  chunks: TextChunk[]
): InsightsReport {
  const activeDocs = documents.filter((d) => d.active);
  const obligations: ObligationItem[] = [];
  const riskFlags: RiskFlag[] = [];
  const financialMetrics: FinancialMetric[] = [];
  const entityCounts = new Map<
    string,
    { name: string; type: NamedEntity['type']; count: number; docIds: Set<string> }
  >();

  for (const doc of activeDocs) {
    const sentences = extractDocumentSentences(doc);

    // 1. Named entities
    for (const def of ENTITY_CATALOG) {
      const matches = doc.content.match(def.pattern);
      if (matches && matches.length > 0) {
        const existing = entityCounts.get(def.name) ?? {
          name: def.name,
          type: def.type,
          count: 0,
          docIds: new Set<string>(),
        };
        existing.count += matches.length;
        existing.docIds.add(doc.id);
        entityCounts.set(def.name, existing);
      }
    }

    // 2. Obligations, Risk Flags, Financial Metrics
    let docRiskCount = 0;
    let docObligationCount = 0;

    for (const s of sentences) {
      // Obligations
      if (
        docObligationCount < 10 &&
        /\b(must|shall|is required to|are required to|mandated to|obligated to)\b/i.test(
          s.text
        )
      ) {
        obligations.push({
          id: `${doc.id}::obl-${obligations.length}`,
          documentId: doc.id,
          documentTitle: doc.title,
          actor: extractActor(s.text),
          requirement: s.text,
          deadline: extractDeadline(s.text),
          startOffset: s.startOffset,
          endOffset: s.endOffset,
          sectionHeading: s.sectionHeading,
        });
        docObligationCount++;
      }

      // Risk flags (pick highest-severity matching rule per sentence)
      if (docRiskCount < 8) {
        for (const rule of RISK_RULES) {
          if (rule.pattern.test(s.text)) {
            riskFlags.push({
              id: `${doc.id}::risk-${riskFlags.length}`,
              documentId: doc.id,
              documentTitle: doc.title,
              level: rule.level,
              category: rule.category,
              excerpt: s.text,
              rationale: rule.rationale,
              startOffset: s.startOffset,
              endOffset: s.endOffset,
              sectionHeading: s.sectionHeading,
            });
            docRiskCount++;
            break;
          }
        }
      }

      // Financial & quantitative figures
      const currencyMatches = [
        ...s.text.matchAll(
          /(?:AUD|USD|A\$|\$)\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:million|billion|thousand|M|B|K))?/gi
        ),
      ];
      for (const m of currencyMatches) {
        if (financialMetrics.length < 36) {
          financialMetrics.push({
            id: `${doc.id}::fin-${financialMetrics.length}`,
            documentId: doc.id,
            documentTitle: doc.title,
            value: m[0].trim(),
            kind: 'Currency',
            context: s.text,
            startOffset: s.startOffset,
            endOffset: s.endOffset,
          });
        }
      }

      const pctMatches = [...s.text.matchAll(/\b\d+(?:\.\d+)?%/g)];
      for (const m of pctMatches) {
        if (financialMetrics.length < 36) {
          financialMetrics.push({
            id: `${doc.id}::pct-${financialMetrics.length}`,
            documentId: doc.id,
            documentTitle: doc.title,
            value: m[0],
            kind: 'Percentage',
            context: s.text,
            startOffset: s.startOffset,
            endOffset: s.endOffset,
          });
        }
      }
    }
  }

  // Sort risk flags High -> Medium -> Low
  const riskOrder: Record<RiskLevel, number> = { High: 0, Medium: 1, Low: 2 };
  riskFlags.sort((a, b) => riskOrder[a.level] - riskOrder[b.level]);

  // 3. Cross-document similarity matrix
  const crossDocMatrix: CrossDocOverlap[] = [];
  for (let i = 0; i < activeDocs.length; i++) {
    for (let j = i + 1; j < activeDocs.length; j++) {
      const { similarity, sharedTerms } = computeDocumentSimilarity(
        activeDocs[i].content,
        activeDocs[j].content
      );
      crossDocMatrix.push({
        docAId: activeDocs[i].id,
        docATitle: activeDocs[i].title,
        docBId: activeDocs[j].id,
        docBTitle: activeDocs[j].title,
        similarity,
        sharedTerms,
      });
    }
  }
  crossDocMatrix.sort((a, b) => b.similarity - a.similarity);

  const entities: NamedEntity[] = Array.from(entityCounts.values())
    .map((e) => ({
      name: e.name,
      type: e.type,
      count: e.count,
      documentIds: Array.from(e.docIds),
    }))
    .sort((a, b) => b.count - a.count);

  const totalTokens = activeDocs.reduce(
    (sum, doc) => sum + estimateTokens(doc.content),
    0
  );

  return {
    obligations,
    riskFlags,
    financialMetrics,
    entities,
    crossDocMatrix,
    summaryStats: {
      totalDocuments: activeDocs.length,
      totalChunks: chunks.length,
      totalTokens,
      highRisks: riskFlags.filter((r) => r.level === 'High').length,
      mediumRisks: riskFlags.filter((r) => r.level === 'Medium').length,
      lowRisks: riskFlags.filter((r) => r.level === 'Low').length,
    },
  };
}
