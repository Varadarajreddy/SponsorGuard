import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
} from 'lucide-react';
import type {
  SalaryChangeContext,
  SmsChangeType,
  SmsReportRecord,
  Worker,
} from '../types/compliance';
import { evaluateSmsDuty } from '../utils/compliance';

interface SmsReportingTabProps {
  workers: Worker[];
  smsReports: SmsReportRecord[];
  referenceDate: string;
  onMarkSmsReported: (record: {
    worker: Worker;
    changeType: SmsChangeType;
    changeLabel: string;
    deadlineDays: 10 | 20;
    effectiveDate: string;
    reportDueBy: string;
    notes: string;
    draftedWording: string;
    reportedBy: string;
    smsSubmissionRef: string;
  }) => void;
}

const CHANGE_OPTIONS: { value: SmsChangeType; label: string }[] = [
  { value: 'SALARY_CHANGE', label: 'Salary Change' },
  { value: 'ROLE_SOC_CHANGE', label: 'Job Title / SOC Code Change' },
  { value: 'WORK_LOCATION_CHANGE', label: 'Work Location Change' },
  { value: 'UNAUTHORISED_ABSENCE', label: '10+ Days Unauthorised Absence' },
];

const DEFAULT_NOTES_BY_CHANGE: Record<SmsChangeType, string> = {
  SALARY_CHANGE: 'Updated gross annual salary following contractual remuneration review.',
  ROLE_SOC_CHANGE: 'Job title updated within existing SOC 2020 code; core duties remain aligned.',
  WORK_LOCATION_CHANGE:
    'Employee transitioning from London HQ to hybrid 2-day Manchester Hub schedule.',
  UNAUTHORISED_ABSENCE:
    'Employee absent for 10 consecutive working days without approved leave or contact.',
};

export function SmsReportingTab({
  workers,
  smsReports,
  referenceDate,
  onMarkSmsReported,
}: SmsReportingTabProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState(workers[0]?.id ?? '');
  const [changeType, setChangeType] = useState<SmsChangeType>('WORK_LOCATION_CHANGE');
  const [salaryContext, setSalaryContext] = useState<SalaryChangeContext>(
    'REDUCTION_OR_VARIATION',
  );
  const [effectiveDate, setEffectiveDate] = useState(referenceDate);
  const [changeNotes, setChangeNotes] = useState(
    DEFAULT_NOTES_BY_CHANGE.WORK_LOCATION_CHANGE,
  );
  const [isNotesEdited, setIsNotesEdited] = useState(false);
  const [reportedBy, setReportedBy] = useState('Claire Bennett (Level 1 User)');
  const [smsSubmissionRef, setSmsSubmissionRef] = useState('');
  const [copiedWording, setCopiedWording] = useState(false);

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) ?? workers[0],
    [workers, selectedWorkerId],
  );

  const evaluation = useMemo(() => {
    if (!selectedWorker) {
      return null;
    }
    return evaluateSmsDuty(
      selectedWorker,
      changeType,
      effectiveDate || referenceDate,
      changeNotes,
      salaryContext,
    );
  }, [selectedWorker, changeType, effectiveDate, referenceDate, changeNotes, salaryContext]);

  const [editableWording, setEditableWording] = useState(evaluation?.draftedWording ?? '');

  useEffect(() => {
    if (evaluation) {
      setEditableWording(evaluation.draftedWording);
    }
  }, [evaluation]);

  const handleCopyWording = async () => {
    if (!editableWording) return;
    try {
      await navigator.clipboard.writeText(editableWording);
      setCopiedWording(true);
      setTimeout(() => setCopiedWording(false), 2000);
    } catch {
      setCopiedWording(false);
    }
  };

  const handleLogReported = () => {
    if (!selectedWorker || !evaluation) return;
    const generatedRef =
      smsSubmissionRef.trim() ||
      `SMS-${referenceDate.slice(0, 4)}-${String(Math.floor(10000 + Math.random() * 90000))}`;

    onMarkSmsReported({
      worker: selectedWorker,
      changeType,
      changeLabel: evaluation.changeLabel,
      deadlineDays: evaluation.deadlineDays,
      effectiveDate: effectiveDate || referenceDate,
      reportDueBy: evaluation.reportDueBy,
      notes: changeNotes.trim() || evaluation.changeLabel,
      draftedWording: editableWording.trim() || evaluation.draftedWording,
      reportedBy: reportedBy.trim() || 'HR Level 1 User',
      smsSubmissionRef: generatedRef,
    });
    setSmsSubmissionRef('');
  };

  if (!selectedWorker || !evaluation) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Add or verify a sponsored worker before logging Home Office SMS reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Change Input Form */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Log Employee Circumstance Change
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Evaluate mandatory UKVI Sponsor Licence SMS reporting deadlines under Appendix D.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="sms-worker" className="block text-xs font-medium text-slate-700">
                Sponsored Worker
              </label>
              <select
                id="sms-worker"
                value={selectedWorker.id}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.visaRoute})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sms-changetype" className="block text-xs font-medium text-slate-700">
                Change Category
              </label>
              <select
                id="sms-changetype"
                value={changeType}
                onChange={(e) => {
                  const nextType = e.target.value as SmsChangeType;
                  setChangeType(nextType);
                  if (!isNotesEdited) {
                    setChangeNotes(DEFAULT_NOTES_BY_CHANGE[nextType]);
                  }
                }}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {CHANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {changeType === 'SALARY_CHANGE' && (
              <div>
                <label htmlFor="sms-salary-ctx" className="block text-xs font-medium text-slate-700">
                  Salary Change Classification
                </label>
                <select
                  id="sms-salary-ctx"
                  value={salaryContext}
                  onChange={(e) => setSalaryContext(e.target.value as SalaryChangeContext)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="REDUCTION_OR_VARIATION">
                    Individual Salary Reduction / Variation (10-Working-Day Rule)
                  </option>
                  <option value="ORGANISATIONAL_OR_ANNUAL_UPLIFT">
                    Organisational Pay-Band / TUPE Uplift (20-Working-Day Rule)
                  </option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sms-effective-date" className="block text-xs font-medium text-slate-700">
                  Effective / Trigger Date
                </label>
                <input
                  id="sms-effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label htmlFor="sms-reporter" className="block text-xs font-medium text-slate-700">
                  SMS Level 1 User
                </label>
                <input
                  id="sms-reporter"
                  type="text"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sms-notes" className="block text-xs font-medium text-slate-700">
                Change Details &amp; Supporting Context
              </label>
              <textarea
                id="sms-notes"
                rows={3}
                value={changeNotes}
                onChange={(e) => {
                  setIsNotesEdited(true);
                  setChangeNotes(e.target.value);
                }}
                placeholder="Describe salary figures, new SOC 2020 code, office address, or absence dates..."
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </section>

        {/* Right: Evaluation & Drafted SMS Wording */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Home Office SMS Duty Assessment
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Statutory deadline due by{' '}
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {evaluation.reportDueBy}
                </span>
              </p>
            </div>

            <span
              data-testid="sms-deadline-badge"
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                evaluation.deadlineDays === 10
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {evaluation.deadlineDays === 10 ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{evaluation.deadlineBadge}</span>
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
            <p>
              <strong className="font-semibold text-slate-800">Statutory Basis:</strong>{' '}
              {evaluation.statutoryBasis}
            </p>
            <p>
              <strong className="font-semibold text-slate-800">Required Action:</strong>{' '}
              {evaluation.actionRequired}
            </p>
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="sms-draft-wording" className="text-xs font-medium text-slate-700">
                Drafted Home Office SMS Report Wording (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyWording}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {copiedWording ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy SMS Wording</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="sms-draft-wording"
              rows={5}
              value={editableWording}
              onChange={(e) => setEditableWording(e.target.value)}
              className="mt-1.5 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 sm:max-w-xs">
              <label htmlFor="sms-ref-input" className="sr-only">
                SMS Submission Reference (optional)
              </label>
              <input
                id="sms-ref-input"
                type="text"
                value={smsSubmissionRef}
                onChange={(e) => setSmsSubmissionRef(e.target.value)}
                placeholder="Optional SMS ref (auto-generated if blank)"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleLogReported}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCheck2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Mark as Reported &amp; Log to Appendix D</span>
            </button>
          </div>
        </section>
      </div>

      {/* Logged SMS Reports History */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Submitted SMS Duty Reports ({smsReports.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th scope="col" className="px-4 py-2.5">SMS Ref</th>
                <th scope="col" className="px-4 py-2.5">Worker</th>
                <th scope="col" className="px-4 py-2.5">Change Type</th>
                <th scope="col" className="px-4 py-2.5">Rule Window</th>
                <th scope="col" className="px-4 py-2.5">Effective Date</th>
                <th scope="col" className="px-4 py-2.5">Reported By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {smsReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {report.smsSubmissionRef}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{report.workerName}</td>
                  <td className="px-4 py-3 text-slate-700">{report.changeLabel}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {report.deadlineDays} working days
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {report.effectiveDate}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{report.reportedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
