import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { ExtractedEvisaFields, VisaRoute } from '../types/compliance';
import {
  normalizeShareCode,
  parseUkviEvisaText,
  VISA_ROUTES,
} from '../utils/compliance';
import { getSampleEvisaText } from '../data/demoData';

interface EvisaExtractorTabProps {
  referenceDate: string;
  onSaveVerifiedWorker: (payload: {
    fullName: string;
    jobTitle: string;
    visaRoute: VisaRoute;
    expiryDate: string;
    shareCode: string;
    workRestrictions: string;
    hrApprover: string;
  }) => void;
}

interface FormErrors {
  fullName?: string;
  jobTitle?: string;
  expiryDate?: string;
  shareCode?: string;
  workRestrictions?: string;
  hrApprover?: string;
}

export function EvisaExtractorTab({
  referenceDate,
  onSaveVerifiedWorker,
}: EvisaExtractorTabProps) {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showLocalParserOption, setShowLocalParserOption] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);

  // HITL Form state
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [visaRoute, setVisaRoute] = useState<VisaRoute>('Skilled Worker');
  const [expiryDate, setExpiryDate] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [workRestrictions, setWorkRestrictions] = useState('');
  const [hrApprover, setHrApprover] = useState('Claire Bennett');
  const [errors, setErrors] = useState<FormErrors>({});

  const applyExtractedFields = (fields: ExtractedEvisaFields, sourceNote: string) => {
    setFullName(fields.fullName);
    if (fields.jobTitle) {
      setJobTitle(fields.jobTitle);
    }
    setVisaRoute(fields.visaRoute);
    setExpiryDate(fields.expiryDate);
    setShareCode(fields.shareCode);
    setWorkRestrictions(fields.workRestrictions);
    setErrors({});
    setExtractionStatus(sourceNote);
    setExtractError(null);
    setShowLocalParserOption(false);
  };

  const handleLoadSample = () => {
    setRawText(getSampleEvisaText(referenceDate));
    setExtractError(null);
    setShowLocalParserOption(false);
    setExtractionStatus(null);
  };

  const handleExtractWithAi = async () => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setExtractError('Paste UKVI eVisa portal output or click "Load Sample eVisa" first.');
      setShowLocalParserOption(false);
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setShowLocalParserOption(false);
    setExtractionStatus(null);

    try {
      const response = await fetch('/api/extract-evisa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503 || data?.code === 'MISSING_API_KEY') {
          setExtractError(
            'Live Gemini AI extraction is unavailable because GEMINI_API_KEY is not configured in this environment. You can run the deterministic UKVI structured parser instead.',
          );
          setShowLocalParserOption(true);
          return;
        }
        setExtractError(data?.error || 'Extraction request failed.');
        setShowLocalParserOption(true);
        return;
      }

      applyExtractedFields(
        data as ExtractedEvisaFields,
        'Extracted via Gemini AI — review all fields below before Appendix D sign-off.',
      );
    } catch {
      setExtractError(
        'Could not reach the AI extraction service. You can run the deterministic UKVI structured parser instead.',
      );
      setShowLocalParserOption(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRunLocalParser = () => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setExtractError('Paste UKVI eVisa portal output first.');
      return;
    }
    const parsed = parseUkviEvisaText(trimmed);
    applyExtractedFields(
      parsed,
      'Parsed via Deterministic UKVI Extractor — verify every field prior to sign-off.',
    );
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!jobTitle.trim()) {
      nextErrors.jobTitle = 'Job title is required.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      nextErrors.expiryDate = 'Valid expiry date (YYYY-MM-DD) is required.';
    }
    const normalizedCode = normalizeShareCode(shareCode);
    if (normalizedCode.length !== 9) {
      nextErrors.shareCode = 'UKVI Share Code must be exactly 9 alphanumeric characters.';
    }
    if (!workRestrictions.trim()) {
      nextErrors.workRestrictions = 'Work restrictions summary is required for Appendix D.';
    }
    if (!hrApprover.trim()) {
      nextErrors.hrApprover = 'HR Approver name is required for sign-off.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    onSaveVerifiedWorker({
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim(),
      visaRoute,
      expiryDate: expiryDate.trim(),
      shareCode: normalizeShareCode(shareCode),
      workRestrictions: workRestrictions.trim(),
      hrApprover: hrApprover.trim(),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
      {/* Left Panel: Raw UKVI Portal Output */}
      <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              1. UKVI eVisa / Share Code Portal Output
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste raw text copied from GOV.UK &ldquo;View a job applicant&apos;s right to work&rdquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Load Sample eVisa</span>
          </button>
        </div>

        <div className="mt-4 flex flex-1 flex-col">
          <label htmlFor="evisa-raw-text" className="text-xs font-medium text-slate-700">
            Raw UKVI Verification Output
          </label>
          <textarea
            id="evisa-raw-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            placeholder="Paste GOV.UK eVisa Right-to-Work text here (name, visa route, expiry date, 9-character share code, work conditions)..."
            className="mt-1.5 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {extractError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="space-y-2">
                <p>{extractError}</p>
                {showLocalParserOption && (
                  <button
                    type="button"
                    onClick={handleRunLocalParser}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    <span>Parse Structured UKVI Fields Locally</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {extractionStatus && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{extractionStatus}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            Appendix D requires human HR verification before committing.
          </span>
          <button
            type="button"
            onClick={handleExtractWithAi}
            disabled={isExtracting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap cursor-pointer"
          >
            {isExtracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{isExtracting ? 'Extracting Details...' : 'Extract Visa Details with AI'}</span>
          </button>
        </div>
      </section>

      {/* Right Panel: Human-in-the-Loop Verification Form */}
      <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            2. Human-in-the-Loop (HITL) Verification &amp; Sign-Off
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Confirm extracted UKVI fields against physical/video identity check before recording.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hitl-fullname" className="block text-xs font-medium text-slate-700">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                id="hitl-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Venkatesh"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="hitl-jobtitle" className="block text-xs font-medium text-slate-700">
                Job Title <span className="text-red-600">*</span>
              </label>
              <input
                id="hitl-jobtitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Lead Cloud Security Engineer"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.jobTitle && (
                <p className="mt-1 text-xs text-red-600">{errors.jobTitle}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="hitl-route" className="block text-xs font-medium text-slate-700">
                Visa Route <span className="text-red-600">*</span>
              </label>
              <select
                id="hitl-route"
                value={visaRoute}
                onChange={(e) => setVisaRoute(e.target.value as VisaRoute)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {VISA_ROUTES.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hitl-expiry" className="block text-xs font-medium text-slate-700">
                Expiry Date <span className="text-red-600">*</span>
              </label>
              <input
                id="hitl-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.expiryDate && (
                <p className="mt-1 text-xs text-red-600">{errors.expiryDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="hitl-sharecode" className="block text-xs font-medium text-slate-700">
                UKVI Share Code (9 chars) <span className="text-red-600">*</span>
              </label>
              <input
                id="hitl-sharecode"
                type="text"
                maxLength={11}
                value={shareCode}
                onChange={(e) => setShareCode(normalizeShareCode(e.target.value))}
                placeholder="W8K4P92MN"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm uppercase tracking-wider text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.shareCode && (
                <p className="mt-1 text-xs text-red-600">{errors.shareCode}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="hitl-restrictions" className="block text-xs font-medium text-slate-700">
              Work Restrictions &amp; Conditions <span className="text-red-600">*</span>
            </label>
            <textarea
              id="hitl-restrictions"
              rows={3}
              value={workRestrictions}
              onChange={(e) => setWorkRestrictions(e.target.value)}
              placeholder="e.g. Sponsored employment only; max 20 hrs/week supplementary work"
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {errors.workRestrictions && (
              <p className="mt-1 text-xs text-red-600">{errors.workRestrictions}</p>
            )}
          </div>

          <div>
            <label htmlFor="hitl-approver" className="block text-xs font-medium text-slate-700">
              HR Approver Name (Sign-Off) <span className="text-red-600">*</span>
            </label>
            <input
              id="hitl-approver"
              type="text"
              value={hrApprover}
              onChange={(e) => setHrApprover(e.target.value)}
              placeholder="e.g. Claire Bennett"
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {errors.hrApprover && (
              <p className="mt-1 text-xs text-red-600">{errors.hrApprover}</p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Approve &amp; Save to Tracker</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
