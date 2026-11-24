import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { LLMConfig } from '../engine';

interface SettingsModalProps {
  isOpen: boolean;
  config: LLMConfig;
  onSave: (next: LLMConfig) => void;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  config,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<LLMConfig>(config);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 17, 21, 0.55)' }}
    >
      <div
        className="w-full max-w-md rounded-lg border shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <h2 className="font-serif-editorial text-base font-semibold">
            Synthesis Engine Configuration (BYOK)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded cursor-pointer"
            style={{ color: 'var(--ink-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div
            className="p-3 rounded-md border flex items-start gap-2.5"
            style={{
              backgroundColor: 'var(--accent-indigo-soft)',
              borderColor: 'var(--accent-indigo-border)',
              color: 'var(--ink-primary)',
            }}
          >
            <ShieldCheck
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--accent-indigo)' }}
            />
            <p className="m-0 leading-relaxed">
              By default, DocIntel runs 100% offline with deterministic extractive grounding.
              Optionally configure an OpenAI-compatible API endpoint below. Keys are kept strictly
              in React session memory and are never persisted to storage.
            </p>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium text-sm">Enable External LLM Synthesis</span>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-700"
            />
          </label>

          <div className="space-y-3" style={{ opacity: draft.enabled ? 1 : 0.55 }}>
            <label className="block space-y-1">
              <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                API Base URL
              </span>
              <input
                type="url"
                disabled={!draft.enabled}
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 rounded-md border font-mono-code text-xs"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--ink-primary)',
                }}
              />
            </label>

            <label className="block space-y-1">
              <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                Model Identifier
              </span>
              <input
                type="text"
                disabled={!draft.enabled}
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder="gpt-4o-mini"
                className="w-full px-3 py-2 rounded-md border font-mono-code text-xs"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--ink-primary)',
                }}
              />
            </label>

            <label className="block space-y-1">
              <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                API Key (Session Memory Only)
              </span>
              <input
                type="password"
                disabled={!draft.enabled}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="sk-..."
                autoComplete="off"
                className="w-full px-3 py-2 rounded-md border font-mono-code text-xs"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--ink-primary)',
                }}
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between">
                <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                  Temperature
                </span>
                <span className="font-mono-code">{draft.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                disabled={!draft.enabled}
                min={0}
                max={0.7}
                step={0.05}
                value={draft.temperature}
                onChange={(e) =>
                  setDraft({ ...draft, temperature: Number(e.target.value) })
                }
                className="w-full accent-indigo-700"
              />
            </label>
          </div>

          <div
            className="pt-3 border-t flex items-center justify-end gap-2"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border font-medium cursor-pointer"
              style={{
                borderColor: 'var(--border-strong)',
                color: 'var(--ink-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-indigo)',
                color: '#FFFFFF',
              }}
            >
              Save Session Config
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
