import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileScan,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import type {
  AuditLogEntry,
  SmsChangeType,
  SmsReportRecord,
  VisaRoute,
  Worker,
} from './types/compliance';
import {
  computeKpiStats,
  generateAppendixDRef,
  getAlertStage,
  getDaysRemaining,
  runComplianceSweep,
  toIsoDateString,
} from './utils/compliance';
import {
  createInitialAuditLogs,
  createInitialDemoWorkers,
  createInitialSmsReports,
} from './data/demoData';
import { TopBar } from './components/TopBar';
import { KpiSummaryStrip } from './components/KpiSummaryStrip';
import { WorkersTrackerTab } from './components/WorkersTrackerTab';
import { EvisaExtractorTab } from './components/EvisaExtractorTab';
import { SmsReportingTab } from './components/SmsReportingTab';
import { AuditLogTab } from './components/AuditLogTab';
import { ActionEmailModal } from './components/ActionEmailModal';

type TabId = 'tracker' | 'extractor' | 'sms' | 'audit';

const STORAGE_KEYS = {
  workers: 'sponsorguard_workers_v1',
  auditLogs: 'sponsorguard_audit_v1',
  smsReports: 'sponsorguard_sms_v1',
};

function readStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as T;
    }
    return fallback();
  } catch {
    return fallback();
  }
}

export default function App() {
  const referenceDate = toIsoDateString(new Date());

  const [workers, setWorkers] = useState<Worker[]>(() =>
    readStorage(STORAGE_KEYS.workers, () => createInitialDemoWorkers(referenceDate)),
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    readStorage(STORAGE_KEYS.auditLogs, () => createInitialAuditLogs(referenceDate)),
  );
  const [smsReports, setSmsReports] = useState<SmsReportRecord[]>(() =>
    readStorage(STORAGE_KEYS.smsReports, () => createInitialSmsReports(referenceDate)),
  );

  const [activeTab, setActiveTab] = useState<TabId>('tracker');
  const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<Worker | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const handleOpenVerifyEvisa = () => {
    setActiveTab('extractor');
    window.requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        document.getElementById('evisa-raw-text')?.focus({ preventScroll: true });
      }, 150);
    });
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(workers));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [workers]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(auditLogs));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.smsReports, JSON.stringify(smsReports));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [smsReports]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const kpiStats = useMemo(
    () => computeKpiStats(workers, referenceDate),
    [workers, referenceDate],
  );

  const handleResetDemoData = () => {
    const today = toIsoDateString(new Date());
    setWorkers(createInitialDemoWorkers(today));
    setAuditLogs(createInitialAuditLogs(today));
    setSmsReports(createInitialSmsReports(today));
    setSelectedWorkerForModal(null);
    setActiveTab('tracker');
    setToastMessage('Demo data restored: 6 UK sponsored workers and Appendix D baseline loaded.');
  };

  const handleRunSweep = () => {
    const nowIso = new Date().toISOString();
    const result = runComplianceSweep(
      workers,
      'Automated 08:30 Compliance Sweep',
      referenceDate,
      nowIso,
    );

    if (result.triggeredCount === 0) {
      const summaryEntry: AuditLogEntry = {
        id: `audit-sweep-clean-${Date.now()}`,
        timestamp: nowIso,
        eventType: 'COMPLIANCE_SWEEP',
        workerId: 'SYSTEM',
        workerName: 'All Monitored Staff',
        shareCode: '—',
        actor: 'Automated 08:30 Compliance Sweep',
        summary: `08:30 compliance sweep completed (${result.scannedInWindowCount} in <=90d window, 0 new alerts)`,
        details: 'All workers within the 90-day renewal window already have current stage alerts logged in Appendix D.',
        appendixDRef: generateAppendixDRef('SWP'),
      };
      setAuditLogs((prev) => [summaryEntry, ...prev]);
      setToastMessage(
        `08:30 Compliance Sweep complete: scanned ${result.scannedInWindowCount} workers in <=90d window (all stage alerts already logged).`,
      );
      return;
    }

    setWorkers(result.updatedWorkers);
    setAuditLogs((prev) => [...result.newAuditEntries, ...prev]);
    setToastMessage(
      `08:30 Compliance Sweep complete: dispatched ${result.triggeredCount} stage alert${result.triggeredCount === 1 ? '' : 's'} and logged to Appendix D.`,
    );
  };

  const handleSaveVerifiedWorker = (payload: {
    fullName: string;
    jobTitle: string;
    visaRoute: VisaRoute;
    expiryDate: string;
    shareCode: string;
    workRestrictions: string;
    hrApprover: string;
  }) => {
    const nowIso = new Date().toISOString();
    const existingIndex = workers.findIndex(
      (w) =>
        w.shareCode.toUpperCase() === payload.shareCode.toUpperCase() ||
        w.fullName.toLowerCase() === payload.fullName.toLowerCase(),
    );

    let targetWorkerId: string;
    if (existingIndex >= 0) {
      const existing = workers[existingIndex];
      targetWorkerId = existing.id;
      const updatedWorker: Worker = {
        ...existing,
        fullName: payload.fullName,
        jobTitle: payload.jobTitle,
        visaRoute: payload.visaRoute,
        expiryDate: payload.expiryDate,
        shareCode: payload.shareCode,
        workRestrictions: payload.workRestrictions,
        hrApprover: payload.hrApprover,
        lastRtwCheckAt: nowIso,
        alertsSent: [],
      };
      setWorkers((prev) =>
        prev.map((w, idx) => (idx === existingIndex ? updatedWorker : w)),
      );
    } else {
      targetWorkerId = `wrk-${Date.now()}`;
      const newWorker: Worker = {
        id: targetWorkerId,
        fullName: payload.fullName,
        jobTitle: payload.jobTitle,
        visaRoute: payload.visaRoute,
        expiryDate: payload.expiryDate,
        shareCode: payload.shareCode,
        workRestrictions: payload.workRestrictions,
        hrApprover: payload.hrApprover,
        lastRtwCheckAt: nowIso,
        alertsSent: [],
      };
      setWorkers((prev) => [newWorker, ...prev]);
    }

    const auditEntry: AuditLogEntry = {
      id: `audit-hitl-${Date.now()}`,
      timestamp: nowIso,
      eventType: 'HITL_VERIFICATION',
      workerId: targetWorkerId,
      workerName: payload.fullName,
      shareCode: payload.shareCode,
      actor: payload.hrApprover,
      summary: `HITL eVisa RTW verification signed off (${payload.visaRoute})`,
      details: `Verified UKVI share code ${payload.shareCode} for ${payload.jobTitle}; expiry ${payload.expiryDate}; restrictions: ${payload.workRestrictions}.`,
      appendixDRef: generateAppendixDRef('HITL'),
    };

    setAuditLogs((prev) => [auditEntry, ...prev]);
    setActiveTab('tracker');
    setToastMessage(
      `Verified & saved ${payload.fullName} (${payload.visaRoute}) to Appendix D tracker.`,
    );
  };

  const handleSendReminderAndLog = (payload: {
    worker: Worker;
    subject: string;
    body: string;
  }) => {
    const nowIso = new Date().toISOString();
    const days = getDaysRemaining(payload.worker.expiryDate, referenceDate);
    const stage = getAlertStage(days);

    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== payload.worker.id) return w;
        const alertsSent = w.alertsSent.includes(stage)
          ? w.alertsSent
          : [...w.alertsSent, stage];
        return {
          ...w,
          alertsSent,
          lastAlertSentAt: nowIso,
        };
      }),
    );

    const entry: AuditLogEntry = {
      id: `audit-email-${Date.now()}`,
      timestamp: nowIso,
      eventType: 'REMINDER_EMAIL',
      workerId: payload.worker.id,
      workerName: payload.worker.fullName,
      shareCode: payload.worker.shareCode,
      actor: payload.worker.hrApprover,
      summary: `Renewal reminder dispatched (${stage})`,
      details: `Subject: "${payload.subject}" — HR checklist reviewed and reminder logged to Appendix D.`,
      appendixDRef: generateAppendixDRef('EML'),
    };

    setAuditLogs((prev) => [entry, ...prev]);
    setSelectedWorkerForModal(null);
    setToastMessage(
      `Reminder sent to ${payload.worker.fullName} and logged to Appendix D Audit Log.`,
    );
  };

  const handleMarkSmsReported = (payload: {
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
  }) => {
    const nowIso = new Date().toISOString();
    const smsRecord: SmsReportRecord = {
      id: `sms-${Date.now()}`,
      workerId: payload.worker.id,
      workerName: payload.worker.fullName,
      shareCode: payload.worker.shareCode,
      changeType: payload.changeType,
      changeLabel: payload.changeLabel,
      deadlineDays: payload.deadlineDays,
      effectiveDate: payload.effectiveDate,
      reportDueBy: payload.reportDueBy,
      notes: payload.notes,
      draftedWording: payload.draftedWording,
      reportedAt: nowIso,
      reportedBy: payload.reportedBy,
      smsSubmissionRef: payload.smsSubmissionRef,
    };

    const auditEntry: AuditLogEntry = {
      id: `audit-sms-${Date.now()}`,
      timestamp: nowIso,
      eventType: 'SMS_DUTY_REPORT',
      workerId: payload.worker.id,
      workerName: payload.worker.fullName,
      shareCode: payload.worker.shareCode,
      actor: payload.reportedBy,
      summary: `${payload.deadlineDays}-Working-Day SMS Report: ${payload.changeLabel}`,
      details: `Filed on Home Office SMS (${payload.smsSubmissionRef}, due ${payload.reportDueBy}). ${payload.notes}`,
      appendixDRef: generateAppendixDRef('SMS'),
    };

    setSmsReports((prev) => [smsRecord, ...prev]);
    setAuditLogs((prev) => [auditEntry, ...prev]);
    setToastMessage(
      `SMS duty report (${payload.smsSubmissionRef}) logged to Appendix D for ${payload.worker.fullName}.`,
    );
  };

  const tabs: { id: TabId; label: string; icon: typeof Users; badge?: number }[] = [
    {
      id: 'tracker',
      label: 'Sponsored Workers & Expiry Tracker',
      icon: Users,
      badge: workers.length,
    },
    {
      id: 'extractor',
      label: 'AI Document Extractor & HITL Sign-Off',
      icon: FileScan,
    },
    {
      id: 'sms',
      label: 'Sponsor Licence Duty & SMS Reporting',
      icon: ShieldAlert,
      badge: smsReports.length,
    },
    {
      id: 'audit',
      label: 'Immutable Appendix D Audit Log',
      icon: ClipboardList,
      badge: auditLogs.length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        onVerifyClick={handleOpenVerifyEvisa}
        onResetDemoData={handleResetDemoData}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Heading + Today context */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              UK Sponsor Licence &amp; Right-to-Work Command
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Continuous eVisa expiry tracking, Home Office SMS reporting, and Appendix D audit readiness.
            </p>
          </div>
          <p className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
            Reference date: {referenceDate}
          </p>
        </div>

        {/* 4-Card KPI Summary Strip */}
        <KpiSummaryStrip stats={kpiStats} />

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            data-testid="toast-notification"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div ref={workspaceRef} className="scroll-mt-20 border-b border-slate-200">
          <nav
            role="tablist"
            aria-label="Compliance workspace sections"
            className="-mb-px flex gap-2 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Tab Viewport */}
        <div>
          {activeTab === 'tracker' && (
            <WorkersTrackerTab
              workers={workers}
              referenceDate={referenceDate}
              onRunSweep={handleRunSweep}
              onOpenActionModal={(worker) => setSelectedWorkerForModal(worker)}
            />
          )}

          {activeTab === 'extractor' && (
            <EvisaExtractorTab
              referenceDate={referenceDate}
              onSaveVerifiedWorker={handleSaveVerifiedWorker}
            />
          )}

          {activeTab === 'sms' && (
            <SmsReportingTab
              workers={workers}
              smsReports={smsReports}
              referenceDate={referenceDate}
              onMarkSmsReported={handleMarkSmsReported}
            />
          )}

          {activeTab === 'audit' && <AuditLogTab auditLogs={auditLogs} />}
        </div>
      </main>

      <ActionEmailModal
        worker={selectedWorkerForModal}
        referenceDate={referenceDate}
        onClose={() => setSelectedWorkerForModal(null)}
        onSendReminderAndLog={handleSendReminderAndLog}
      />
    </div>
  );
}
