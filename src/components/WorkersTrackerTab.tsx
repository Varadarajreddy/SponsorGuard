import { useMemo, useState } from 'react';
import { BellRing, Mail, Search, ShieldCheck, X } from 'lucide-react';
import type { StatusFilter, Worker } from '../types/compliance';
import {
  filterWorkers,
  formatCountdownLabel,
  formatShareCodeDisplay,
  getAlertStage,
  getDaysRemaining,
} from '../utils/compliance';
import { StatusBadge } from './StatusBadge';

interface WorkersTrackerTabProps {
  workers: Worker[];
  referenceDate: string;
  onRunSweep: () => void;
  onOpenActionModal: (worker: Worker) => void;
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'All', label: 'All Workers' },
  { value: 'Action Needed', label: 'Action Needed (<=90d)' },
  { value: 'Expired', label: 'Expired' },
  { value: '14-Day Urgent', label: '14-Day Urgent' },
  { value: '30-Day Warning', label: '30-Day Warning' },
  { value: '60-Day Warning', label: '60-Day Warning' },
  { value: '90-Day Notice', label: '90-Day Notice' },
  { value: 'Compliant', label: 'Compliant' },
];

export function WorkersTrackerTab({
  workers,
  referenceDate,
  onRunSweep,
  onOpenActionModal,
}: WorkersTrackerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const filteredWorkers = useMemo(
    () => filterWorkers(workers, searchQuery, statusFilter, referenceDate),
    [workers, searchQuery, statusFilter, referenceDate],
  );

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'All';

  const getCountdownClass = (days: number): string => {
    if (days <= 14) {
      return 'text-red-700 font-semibold';
    }
    if (days <= 60) {
      return 'text-amber-700 font-semibold';
    }
    if (days <= 90) {
      return 'text-indigo-700 font-medium';
    }
    return 'text-emerald-700 font-medium';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="worker-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, role, route, or share code..."
              aria-label="Search sponsored workers"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Stage:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
            Showing {filteredWorkers.length} of {workers.length}
          </span>
          <button
            type="button"
            onClick={onRunSweep}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Run Daily 08:30 Compliance Sweep</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No matching sponsored workers
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {hasActiveFilters
                ? 'Adjust your search term or status filter to view other Right-to-Work records.'
                : 'Verify a worker eVisa share code to populate your Appendix D compliance tracker.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th scope="col" className="px-4 py-3">Worker &amp; Job Title</th>
                  <th scope="col" className="px-4 py-3">Visa Route &amp; Work Restrictions</th>
                  <th scope="col" className="px-4 py-3">Expiry Date</th>
                  <th scope="col" className="px-4 py-3">Countdown</th>
                  <th scope="col" className="px-4 py-3">Alert Stage</th>
                  <th scope="col" className="px-4 py-3">UKVI Share Code</th>
                  <th scope="col" className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm" data-testid="workers-table-body">
                {filteredWorkers.map((worker) => {
                  const daysRemaining = getDaysRemaining(worker.expiryDate, referenceDate);
                  const stage = getAlertStage(daysRemaining);
                  const stageAlreadySent = worker.alertsSent.includes(stage);

                  return (
                    <tr
                      key={worker.id}
                      className="transition-colors hover:bg-slate-50/70"
                      data-testid={`worker-row-${worker.id}`}
                    >
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-slate-900">{worker.fullName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {worker.jobTitle}
                          {worker.cosNumber ? ` · CoS ${worker.cosNumber}` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top max-w-xs">
                        <div className="font-medium text-slate-800">{worker.visaRoute}</div>
                        <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                          {worker.workRestrictions}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {worker.expiryDate}
                      </td>

                      <td className="px-4 py-3.5 align-top font-mono text-xs tabular-nums whitespace-nowrap">
                        <span className={getCountdownClass(daysRemaining)}>
                          {formatCountdownLabel(daysRemaining)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge stage={stage} />
                          {stage !== 'Compliant' && (
                            <span className="text-[11px] text-slate-500">
                              {stageAlreadySent ? 'Alert logged' : 'Alert pending'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <code className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium tracking-wider text-slate-800 whitespace-nowrap">
                          {formatShareCodeDisplay(worker.shareCode)}
                        </code>
                      </td>

                      <td className="px-4 py-3.5 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onOpenActionModal(worker)}
                          aria-label={`Draft Action & Email for ${worker.fullName}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Draft Action &amp; Email</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
