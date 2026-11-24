import { BookOpen, Cpu, Moon, Settings2, Sun } from 'lucide-react';
import type { LLMConfig } from '../engine';

interface HeaderProps {
  activeDocCount: number;
  totalDocCount: number;
  chunkCount: number;
  tokenCount: number;
  llmConfig: LLMConfig;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
}

export function Header({
  activeDocCount,
  totalDocCount,
  chunkCount,
  tokenCount,
  llmConfig,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
}: HeaderProps) {
  const byokActive = llmConfig.enabled && llmConfig.apiKey.trim().length > 0;

  return (
    <header
      className="h-14 shrink-0 border-b px-4 flex items-center justify-between gap-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            backgroundColor: 'var(--accent-indigo)',
            color: '#FFFFFF',
          }}
        >
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif-editorial text-lg font-semibold tracking-tight leading-none truncate">
              DocIntel
            </h1>
            <span
              className="hidden sm:inline text-xs font-medium tracking-wide uppercase"
              style={{ color: 'var(--ink-muted)' }}
            >
              Document Intelligence &amp; Hybrid RAG
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="hidden lg:flex items-center gap-3 text-xs font-mono-code px-3 py-1.5 rounded-md border"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--ink-secondary)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--ink-primary)' }}>{activeDocCount}</strong>/{totalDocCount} docs
          </span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>
            <strong style={{ color: 'var(--ink-primary)' }}>{chunkCount}</strong> chunks
          </span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>
            <strong style={{ color: 'var(--ink-primary)' }}>{tokenCount.toLocaleString()}</strong> est. tokens
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: byokActive ? 'var(--accent-indigo-soft)' : 'var(--bg-canvas)',
            borderColor: byokActive ? 'var(--accent-indigo-border)' : 'var(--border-hairline)',
            color: byokActive ? 'var(--accent-indigo)' : 'var(--ink-secondary)',
          }}
          title="Configure optional OpenAI-compatible BYOK synthesis endpoint"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {byokActive ? `BYOK: ${llmConfig.model}` : 'Offline Extractive'}
          </span>
          <Settings2 className="w-3.5 h-3.5 opacity-75" />
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label="Toggle color theme"
          className="w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--ink-secondary)',
          }}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
