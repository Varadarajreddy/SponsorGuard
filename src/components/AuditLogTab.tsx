import { useMemo, useState } from 'react';
import { Download, Lock } from 'lucide-react';
import type { AuditEventType, AuditLogEntry } from '../types/compliance';
import { formatAuditLogCsv, toIsoDateString } from '../utils/compliance';

interface AuditLogTabProps {
  auditLogs: AuditLogEntry[];
}

const EVENT_FILTERS: { value: 'ALL' | AuditEventType; label: string }[] = [
  { value: 'ALL', label: 'All Audit Events' },
  { value: 'HITL_VERIFICATION', label: 'HITL Verifications' },
  { value: 'RTW_CHECK', label: 'RTW Checks' },
  { value: 'EXPIRY_ALERT', label: 'Expiry Alerts' },
  { value: 'REMINDER_EMAIL', label: 'Reminder Emails' },
  { value: 'SMS_DUTY_REPORT', label: 'SMS Duty Reports' },
];

const EVENT_LABELS: Record<AuditEventType, string> = {
  RTW_CHECK: 'RTW Check',
  HITL_VERIFICATION: 'HITL Sign-Off',
  EXPIRY_ALERT: 'Expiry Alert',
  COMPLIANCE_SWEEP: 'Compliance Sweep',
  SMS_DUTY_REPORT: 'SMS Duty Report',
  REMINDER_EMAIL: 'Reminder Sent',
};

export function AuditLogTab({ auditLogs }: AuditLogTabProps) {
  const [eventFilter, setEventFilter] = useState<'ALL' | AuditEventType>('ALL');

  const filteredLogs = useMemo(() => {
    if (eventFilter === 'ALL') {
      return auditLogs;
    }
    return auditLogs.filter((entry) => entry.eventType === eventFilter);
  }, [auditLogs, eventFilter]);

  const handleExportCsv = () => {
    const csvContent = formatAuditLogCsv(filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sponsorguard-appendix-d-audit-${toIsoDateString(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (iso: string) => {
    return iso.replace('T', ' ').slice(0, 19) + ' UTC';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Immutable Appendix D Compliance Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Timestamped evidence trail for Home Office UKVI sponsor inspections.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="audit-event-filter" className="sr-only">
            Filter audit log by event type
          </label>
          <select
            id="audit-event-filter"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as 'ALL' | AuditEventType)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {EVENT_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th scope="col" className="px-4 py-3">Timestamp</th>
                <th scope="col" className="px-4 py-3">Appendix D Ref</th>
                <th scope="col" className="px-4 py-3">Event</th>
                <th scope="col" className="px-4 py-3">Worker &amp; Share Code</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">Summary &amp; Compliance Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs" data-testid="audit-table-body">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 align-top font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono font-medium text-slate-800 whitespace-nowrap">
                    {entry.appendixDRef}
                  </td>
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
                      {EVENT_LABELS[entry.eventType]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-medium text-slate-900">{entry.workerName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {entry.shareCode}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top text-slate-700">{entry.actor}</td>
                  <td className="px-4 py-3.5 align-top max-w-md">
                    <div className="font-medium text-slate-900">{entry.summary}</div>
                    <div className="mt-0.5 text-slate-500 leading-relaxed">{entry.details}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
