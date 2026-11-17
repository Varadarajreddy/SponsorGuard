import { CheckCircle2, Plus, RotateCcw, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  onVerifyClick: () => void;
  onResetDemoData: () => void;
}

export function TopBar({ onVerifyClick, onResetDemoData }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap sm:text-lg">
            SponsorGuard UK
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Appendix D Ready</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onResetDemoData}
            aria-label="Reset Demo Data"
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Reset Demo Data</span>
            <span className="sm:hidden">Reset</span>
          </button>

          <button
            type="button"
            onClick={onVerifyClick}
            aria-label="Verify eVisa / Share Code"
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 sm:px-3.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Verify eVisa / Share Code</span>
            <span className="sm:hidden">Verify eVisa</span>
          </button>
        </div>
      </div>
    </header>
  );
}
