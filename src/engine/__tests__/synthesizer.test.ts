import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLM_CONFIG,
  HybridIndex,
  SAMPLE_DOCUMENTS,
  chunkCorpus,
  synthesizeAnswer,
  type LLMProvider,
} from '../index';

describe('synthesizer', () => {
  const chunks = chunkCorpus(SAMPLE_DOCUMENTS, {
    chunkSize: 600,
    chunkOverlap: 120,
  });
  const index = new HybridIndex(chunks);

  it('generates grounded offline answers with valid inline citations bound to chunk offsets', async () => {
    const query = 'What are the APRA CPS 234 incident notification deadlines?';
    const hits = index.search(query, { topK: 4, hybridAlpha: 0.5 });
    const result = await synthesizeAnswer(query, hits, DEFAULT_LLM_CONFIG);

    expect(result.mode).toBe('extractive');
    expect(result.citations.length).toBe(hits.length);
    expect(result.answer).toMatch(/\[1\]/);

    // Every inline citation index referenced in the answer must exist in citations
    const citedIndices = [...result.answer.matchAll(/\[(\d+)\]/g)].map((m) =>
      Number(m[1])
    );
    expect(citedIndices.length).toBeGreaterThan(0);
    for (const idx of citedIndices) {
      const bound = result.citations.find((c) => c.index === idx);
      expect(bound).toBeDefined();
      expect(bound!.endOffset).toBeGreaterThan(bound!.startOffset);
    }
  });

  it('handles empty retrieval hits gracefully without throwing', async () => {
    const result = await synthesizeAnswer(
      'nonexistent topic',
      [],
      DEFAULT_LLM_CONFIG
    );
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain('No matching passages');
  });

  it('delegates to the injected LLMProvider when BYOK config is enabled', async () => {
    const query = 'Summarize Q3 2026 ARR and cash runway.';
    const hits = index.search(query, { topK: 3, hybridAlpha: 0.5 });

    let receivedPrompt = '';
    const mockProvider: LLMProvider = {
      async generate(userPrompt) {
        receivedPrompt = userPrompt;
        return 'Southern Cross FinTech closed Q3 2026 with AUD 42.8 million ARR and 26 months runway [1].';
      },
    };

    const result = await synthesizeAnswer(
      query,
      hits,
      {
        enabled: true,
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test-session-key',
        model: 'test-model-1',
        temperature: 0.1,
      },
      mockProvider
    );

    expect(result.mode).toBe('llm');
    expect(result.modelLabel).toBe('test-model-1');
    expect(result.answer).toContain('AUD 42.8 million');
    expect(receivedPrompt).toContain('[1] Document:');
  });

  it('falls back cleanly to extractive synthesis with a warning when BYOK provider fails', async () => {
    const query = 'What is the SLA uptime percentage?';
    const hits = index.search(query, { topK: 3, hybridAlpha: 0.5 });

    const failingProvider: LLMProvider = {
      async generate() {
        throw new Error('Simulated 401 Unauthorized');
      },
    };

    const result = await synthesizeAnswer(
      query,
      hits,
      {
        enabled: true,
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-invalid',
        model: 'gpt-4o-mini',
        temperature: 0.1,
      },
      failingProvider
    );

    expect(result.mode).toBe('extractive');
    expect(result.warning).toContain('Simulated 401 Unauthorized');
    expect(result.answer).toMatch(/\[1\]/);
  });
});
