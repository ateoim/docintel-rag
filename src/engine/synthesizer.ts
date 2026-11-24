import { tokenize } from './retrieval';
import type {
  Citation,
  LLMConfig,
  LLMProvider,
  RetrievalHit,
  SynthesisResult,
} from './types';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.1,
};

/**
 * Standard OpenAI-compatible Chat Completions provider (BYOK).
 * API keys are passed transiently per call and never persisted to disk.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  async generate(
    userPrompt: string,
    systemPrompt: string,
    config: LLMConfig
  ): Promise<string> {
    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.model.trim() || 'gpt-4o-mini',
          temperature: config.temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `LLM endpoint returned HTTP ${response.status}${errorText ? `: ${errorText.slice(0, 180)}` : ''}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('LLM endpoint returned an empty response body.');
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildCitations(hits: RetrievalHit[]): Citation[] {
  return hits.map((hit, idx) => ({
    index: idx + 1,
    chunkId: hit.chunk.id,
    documentId: hit.chunk.documentId,
    documentTitle: hit.chunk.documentTitle,
    sectionHeading: hit.chunk.sectionHeading,
    startOffset: hit.chunk.startOffset,
    endOffset: hit.chunk.endOffset,
    excerpt:
      hit.chunk.text.length > 260
        ? hit.chunk.text.slice(0, 257).trimEnd() + '...'
        : hit.chunk.text,
    rrfScore: hit.rrfScore,
    bm25Score: hit.bm25Score,
    cosineScore: hit.cosineScore,
  }));
}

interface CandidateSentence {
  text: string;
  citationIndex: number;
  documentTitle: string;
  sectionHeading: string;
  score: number;
}

function splitSentences(text: string): string[] {
  // Strip markdown heading lines so we extract factual prose sentences
  const cleaned = text
    .split('\n')
    .filter((line) => !/^#{1,4}\s+/.test(line.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const parts = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9$])/);
  return parts
    .map((s) => s.replace(/^[-*•]\s+/, '').trim())
    .filter((s) => s.length >= 28);
}

function normalizeForDedup(sentence: string): string {
  return sentence.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
}

/**
 * Deterministic extractive + template-grounded synthesizer.
 * Selects the highest-signal non-redundant sentences across retrieved chunks
 * and binds every statement to verifiable inline [n] citations.
 */
function buildExtractiveAnswer(
  query: string,
  hits: RetrievalHit[],
  queryTerms: string[]
): string {
  if (hits.length === 0) {
    return `No matching passages were found in the active document corpus for "${query}". Try enabling additional documents in the Document Library or broadening your query terms.`;
  }

  const queryTermSet = new Set(queryTerms);
  const candidates: CandidateSentence[] = [];
  const seenKeys = new Set<string>();

  hits.forEach((hit, idx) => {
    const citationIndex = idx + 1;
    const sentences = splitSentences(hit.chunk.text);

    for (const sentence of sentences) {
      const dedupKey = normalizeForDedup(sentence);
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);

      const sTokens = tokenize(sentence);
      if (sTokens.length === 0) continue;

      let overlap = 0;
      for (const token of new Set(sTokens)) {
        if (queryTermSet.has(token)) overlap++;
      }

      const coverage = queryTermSet.size > 0 ? overlap / queryTermSet.size : 0;
      const hasQuantitativeSignal =
        /(?:\$\d|\d+%|\d+\s*(?:hours?|days?|months?|years?|million|billion|AUD|USD))/i.test(
          sentence
        )
          ? 0.14
          : 0;
      const hasObligationSignal =
        /\b(must|shall|required|mandatory|notify|within|liability|cap|board|apra)\b/i.test(
          sentence
        )
          ? 0.1
          : 0;

      // Combine sentence-level query overlap with chunk-level RRF rank signal
      const score =
        coverage * 0.55 +
        hit.rrfScore * 20 +
        hasQuantitativeSignal +
        hasObligationSignal;

      candidates.push({
        text: sentence,
        citationIndex,
        documentTitle: hit.chunk.documentTitle,
        sectionHeading: hit.chunk.sectionHeading,
        score,
      });
    }
  });

  candidates.sort((a, b) => b.score - a.score);

  const selected: CandidateSentence[] = [];
  const usedCitations = new Set<number>();

  // First pass: take top-scoring sentences while encouraging coverage across top hits
  for (const cand of candidates) {
    if (selected.length >= 5) break;
    const sameCitationCount = selected.filter(
      (s) => s.citationIndex === cand.citationIndex
    ).length;
    if (sameCitationCount >= 2 && selected.length < 3) continue;

    selected.push(cand);
    usedCitations.add(cand.citationIndex);
  }

  if (selected.length === 0) {
    const fallback = hits[0];
    return `Based on **${fallback.chunk.documentTitle}** (${fallback.chunk.sectionHeading}), the closest passage states: "${fallback.chunk.text.slice(0, 260).trim()}" [1].`;
  }

  const lead = selected[0];
  const supporting = selected.slice(1);
  const uniqueDocs = Array.from(new Set(hits.map((h) => h.chunk.documentTitle)));

  const lines: string[] = [];
  lines.push(`**Executive Synthesis**`);
  lines.push(
    `${lead.text.replace(/\.$/, '')} [${lead.citationIndex}].`
  );

  if (supporting.length > 0) {
    lines.push('');
    lines.push('**Supporting Evidence**');
    for (const item of supporting) {
      const cleanText = item.text.replace(/\.$/, '');
      lines.push(
        `- **${item.sectionHeading}**: ${cleanText} [${item.citationIndex}].`
      );
    }
  }

  if (uniqueDocs.length > 1) {
    lines.push('');
    lines.push(
      `**Corpus Coverage**: Evidence synthesized across ${uniqueDocs.length} documents (${uniqueDocs.join('; ')}). Select any citation badge to inspect the exact source span.`
    );
  }

  return lines.join('\n');
}

function buildLlmPrompts(query: string, citations: Citation[], hits: RetrievalHit[]) {
  const systemPrompt = [
    'You are an enterprise document intelligence analyst.',
    'Answer the user question strictly using the provided source excerpts.',
    'Cite every factual claim inline using bracketed numbers like [1] or [2] corresponding to the source index.',
    'If the sources do not contain enough information, state that explicitly.',
    'Keep the response concise, structured, and executive-ready.',
  ].join(' ');

  const contextBlocks = hits
    .map((hit, i) => {
      const c = citations[i];
      return `[${c.index}] Document: ${c.documentTitle} | Section: ${c.sectionHeading}\n${hit.chunk.text}`;
    })
    .join('\n\n---\n\n');

  const userPrompt = `Question: ${query}\n\nRetrieved Sources:\n${contextBlocks}`;
  return { systemPrompt, userPrompt };
}

/**
 * Generates a citation-backed answer either deterministically offline or via
 * an optional BYOK OpenAI-compatible LLM provider.
 */
export async function synthesizeAnswer(
  query: string,
  hits: RetrievalHit[],
  llmConfig?: LLMConfig,
  provider: LLMProvider = new OpenAICompatibleProvider()
): Promise<SynthesisResult> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const queryTerms = tokenize(query);
  const citations = buildCitations(hits);

  if (llmConfig?.enabled && llmConfig.apiKey.trim().length > 0 && hits.length > 0) {
    try {
      const { systemPrompt, userPrompt } = buildLlmPrompts(query, citations, hits);
      const llmAnswer = await provider.generate(userPrompt, systemPrompt, llmConfig);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

      return {
        query,
        answer: llmAnswer,
        citations,
        hits,
        mode: 'llm',
        modelLabel: llmConfig.model.trim() || 'OpenAI-Compatible',
        latencyMs: Math.max(1, Math.round(endedAt - startedAt)),
        queryTerms,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown LLM provider error';
      const extractive = buildExtractiveAnswer(query, hits, queryTerms);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

      return {
        query,
        answer: extractive,
        citations,
        hits,
        mode: 'extractive',
        modelLabel: 'Offline Extractive Grounding (Fallback)',
        latencyMs: Math.max(1, Math.round(endedAt - startedAt)),
        queryTerms,
        warning: `BYOK LLM request failed (${message}). Rendered deterministic extractive synthesis instead.`,
      };
    }
  }

  const answer = buildExtractiveAnswer(query, hits, queryTerms);
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    query,
    answer,
    citations,
    hits,
    mode: 'extractive',
    modelLabel: 'Offline Extractive Grounding',
    latencyMs: Math.max(1, Math.round(endedAt - startedAt)),
    queryTerms,
  };
}
