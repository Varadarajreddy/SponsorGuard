import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Send,
  X,
} from 'lucide-react';
import type { Worker } from '../types/compliance';
import {
  buildReminderEmail,
  formatCountdownLabel,
  formatShareCodeDisplay,
  getAlertStage,
  getDaysRemaining,
  getRouteChecklist,
} from '../utils/compliance';
import { StatusBadge } from './StatusBadge';

interface ActionEmailModalProps {
  worker: Worker | null;
  referenceDate: string;
  onClose: () => void;
  onSendReminderAndLog: (payload: {
    worker: Worker;
    subject: string;
    body: string;
  }) => void;
}

export function ActionEmailModal({
  worker,
  referenceDate,
  onClose,
  onSendReminderAndLog,
}: ActionEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!worker) return;
    const days = getDaysRemaining(worker.expiryDate, referenceDate);
    const drafted = buildReminderEmail(worker, days);
    setSubject(drafted.subject);
    setBody(drafted.body);
    setCopied(false);
  }, [worker, referenceDate]);

  useEffect(() => {
    if (!worker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [worker, onClose]);

  if (!worker) {
    return null;
  }

  const daysRemaining = getDaysRemaining(worker.expiryDate, referenceDate);
  const stage = getAlertStage(daysRemaining);
  const checklist = getRouteChecklist(worker.visaRoute, worker.fullName);

  const handleCopyEmail = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="action-modal-title" className="font-display text-lg font-semibold text-slate-900">
                {worker.fullName}
              </h2>
              <StatusBadge stage={stage} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {worker.jobTitle} · {worker.visaRoute} · Expiry{' '}
              <span className="font-mono text-slate-700 tabular-nums">{worker.expiryDate}</span> (
              <span className="font-mono font-medium text-slate-800 tabular-nums">
                {formatCountdownLabel(daysRemaining)}
              </span>
              ) · Share Code{' '}
              <span className="font-mono text-slate-800">
                {formatShareCodeDisplay(worker.shareCode)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close action modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 1. 3-Point Route-Specific Checklist */}
          <section>
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mandatory HR Sponsor Checklist ({worker.visaRoute})
            </h3>
            <ol className="mt-3 space-y-2.5">
              {checklist.map((item, idx) => (
                <li
                  key={item.title}
                  className={`rounded-lg border p-3.5 ${
                    item.critical
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {item.critical ? (
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {idx + 1}. {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {item.guidance}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 2. Editable Polite Reminder Email */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
              Employee Renewal &amp; Share Code Reminder Email
            </h3>

            <div>
              <label htmlFor="modal-email-subject" className="block text-xs font-medium text-slate-700">
                Subject Line
              </label>
              <input
                id="modal-email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="modal-email-body" className="block text-xs font-medium text-slate-700">
                Message Body
              </label>
              <textarea
                id="modal-email-body"
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied Email</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Email</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSendReminderAndLog({ worker, subject, body })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Send Reminder &amp; Log to Appendix D</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
