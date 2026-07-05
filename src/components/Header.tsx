import { UpdateProgress } from '../hooks/useFunds';
import { CASUpload } from './CASUpload';
import { CASData } from '../types/holding';

interface HeaderProps {
  progress: UpdateProgress;
  totalFunds: number;
  filteredCount: number;
  onUpdate: () => void;
  onCASParsed: (data: CASData) => void;
  hasCAS: boolean;
  onClearCAS: () => void;
}

export function Header({ progress, totalFunds, filteredCount, onUpdate, onCASParsed, hasCAS, onClearCAS }: HeaderProps) {
  const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-surface-border px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 flex-wrap">
        {/* Logo + Title */}
        <div className="flex items-center gap-3 mr-auto">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm select-none">
            MF
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-white">MF Screener</h1>
            <p className="text-xs text-muted leading-tight">India · AMFI via mfapi.in</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted">
          <span>
            <span className="text-white font-medium">{filteredCount.toLocaleString()}</span>
            {filteredCount !== totalFunds && (
              <span className="ml-1">of {totalFunds.toLocaleString()}</span>
            )}
            <span className="ml-1">funds</span>
          </span>
        </div>

        {/* Progress bar (visible during update) */}
        {progress.active && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-32 h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted tabular-nums">
              {progress.loaded.toLocaleString()} / {progress.total.toLocaleString()}
            </span>
          </div>
        )}

        {/* CAS Upload */}
        <CASUpload onParsed={onCASParsed} hasCAS={hasCAS} onClear={onClearCAS} />

        {/* Update button */}
        <button
          onClick={onUpdate}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            progress.active
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          {progress.active ? (
            <>
              <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              Stop
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Now
            </>
          )}
        </button>
      </div>
    </header>
  );
}
