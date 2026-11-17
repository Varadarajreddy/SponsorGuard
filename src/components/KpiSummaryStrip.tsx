import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import type { KpiStats } from '../types/compliance';

interface KpiSummaryStripProps {
  stats: KpiStats;
}

export function KpiSummaryStrip({ stats }: KpiSummaryStripProps) {
  return (
    <section aria-label="Compliance summary metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Total Sponsored / Visa Staff</p>
          <Users className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 tabular-nums" data-testid="kpi-total">
          {stats.total}
        </p>
        <p className="mt-1 text-xs text-slate-500">Active monitored RTW records</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Urgent (&le; 14 Days or Expired)</p>
          <AlertCircle
            className={`h-4 w-4 shrink-0 ${stats.urgent > 0 ? 'text-red-600' : 'text-slate-400'}`}
            aria-hidden="true"
          />
        </div>
        <p
          className={`mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums ${
            stats.urgent > 0 ? 'text-red-700' : 'text-slate-900'
          }`}
          data-testid="kpi-urgent"
        >
          {stats.urgent}
        </p>
        <p className="mt-1 text-xs text-slate-500">Immediate Right-to-Work escalation</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">90-Day Renewal Window</p>
          <Clock
            className={`h-4 w-4 shrink-0 ${stats.renewalWindow > 0 ? 'text-amber-600' : 'text-slate-400'}`}
            aria-hidden="true"
          />
        </div>
        <p
          className={`mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums ${
            stats.renewalWindow > 0 ? 'text-amber-700' : 'text-slate-900'
          }`}
          data-testid="kpi-window"
        >
          {stats.renewalWindow}
        </p>
        <p className="mt-1 text-xs text-slate-500">15 to 90 days until visa expiry</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Compliant (&gt; 90 Days)</p>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-emerald-700 tabular-nums" data-testid="kpi-compliant">
          {stats.compliant}
        </p>
        <p className="mt-1 text-xs text-slate-500">Valid leave beyond 90-day horizon</p>
      </div>
    </section>
  );
}
