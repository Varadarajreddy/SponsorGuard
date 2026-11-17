import type {
  AlertStage,
  AuditLogEntry,
  ExtractedEvisaFields,
  KpiStats,
  SalaryChangeContext,
  SmsChangeType,
  SmsDutyEvaluation,
  StatusFilter,
  VisaRoute,
  Worker,
} from '../types/compliance';

const MS_PER_DAY = 86_400_000;

export const VISA_ROUTES: VisaRoute[] = [
  'Skilled Worker',
  'Graduate Visa',
  'Health & Care Worker',
  'Student Visa',
  'Global Talent',
];

export const ALERT_STAGES: AlertStage[] = [
  'Expired',
  '14-Day Urgent',
  '30-Day Warning',
  '60-Day Warning',
  '90-Day Notice',
  'Compliant',
];

export function toIsoDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDateUtcMs(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return Number.NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return Date.UTC(year, month, day);
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const baseMs = parseIsoDateUtcMs(isoDate);
  if (Number.isNaN(baseMs)) {
    return isoDate;
  }
  const target = new Date(baseMs + days * MS_PER_DAY);
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, '0');
  const day = String(target.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addWorkingDaysToIsoDate(isoDate: string, workingDays: number): string {
  const baseMs = parseIsoDateUtcMs(isoDate);
  if (Number.isNaN(baseMs)) {
    return isoDate;
  }
  let cursorMs = baseMs;
  let added = 0;
  while (added < workingDays) {
    cursorMs += MS_PER_DAY;
    const dayOfWeek = new Date(cursorMs).getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added += 1;
    }
  }
  const target = new Date(cursorMs);
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, '0');
  const day = String(target.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysRemaining(
  expiryDate: string,
  referenceDate: string = toIsoDateString(new Date()),
): number {
  const expiryMs = parseIsoDateUtcMs(expiryDate);
  const refMs = parseIsoDateUtcMs(referenceDate);
  if (Number.isNaN(expiryMs) || Number.isNaN(refMs)) {
    return 0;
  }
  return Math.round((expiryMs - refMs) / MS_PER_DAY);
}

export function formatCountdownLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)}d overdue`;
  }
  if (daysRemaining === 0) {
    return 'Expires today';
  }
  if (daysRemaining === 1) {
    return '1 day';
  }
  return `${daysRemaining} days`;
}

export function getAlertStage(daysRemaining: number): AlertStage {
  if (daysRemaining < 0) {
    return 'Expired';
  }
  if (daysRemaining <= 14) {
    return '14-Day Urgent';
  }
  if (daysRemaining <= 30) {
    return '30-Day Warning';
  }
  if (daysRemaining <= 60) {
    return '60-Day Warning';
  }
  if (daysRemaining <= 90) {
    return '90-Day Notice';
  }
  return 'Compliant';
}

export function isUrgentStage(stage: AlertStage): boolean {
  return stage === 'Expired' || stage === '14-Day Urgent';
}

export function isRenewalWindowStage(stage: AlertStage): boolean {
  return (
    stage === '30-Day Warning' ||
    stage === '60-Day Warning' ||
    stage === '90-Day Notice'
  );
}

export function computeKpiStats(
  workers: Worker[],
  referenceDate: string = toIsoDateString(new Date()),
): KpiStats {
  let urgent = 0;
  let renewalWindow = 0;
  let compliant = 0;

  for (const worker of workers) {
    const days = getDaysRemaining(worker.expiryDate, referenceDate);
    const stage = getAlertStage(days);
    if (isUrgentStage(stage)) {
      urgent += 1;
    } else if (isRenewalWindowStage(stage)) {
      renewalWindow += 1;
    } else {
      compliant += 1;
    }
  }

  return {
    total: workers.length,
    urgent,
    renewalWindow,
    compliant,
  };
}

export function sortWorkersBySoonestExpiry(
  workers: Worker[],
  referenceDate: string = toIsoDateString(new Date()),
): Worker[] {
  return [...workers].sort((a, b) => {
    const daysA = getDaysRemaining(a.expiryDate, referenceDate);
    const daysB = getDaysRemaining(b.expiryDate, referenceDate);
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

export function filterWorkers(
  workers: Worker[],
  searchQuery: string,
  statusFilter: StatusFilter,
  referenceDate: string = toIsoDateString(new Date()),
): Worker[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return sortWorkersBySoonestExpiry(workers, referenceDate).filter((worker) => {
    const days = getDaysRemaining(worker.expiryDate, referenceDate);
    const stage = getAlertStage(days);

    if (statusFilter === 'Action Needed') {
      if (days > 90) {
        return false;
      }
    } else if (statusFilter !== 'All' && stage !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      worker.fullName,
      worker.jobTitle,
      worker.visaRoute,
      worker.shareCode,
      worker.workRestrictions,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function normalizeShareCode(rawCode: string): string {
  return rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 9);
}

export function formatShareCodeDisplay(code: string): string {
  const clean = normalizeShareCode(code);
  if (clean.length !== 9) {
    return clean;
  }
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
}

export function generateAppendixDRef(prefix: string, seedIndex?: number): string {
  const rand = seedIndex !== undefined
    ? String(1000 + seedIndex).slice(-4)
    : String(Math.floor(1000 + Math.random() * 9000));
  return `APP-D-${prefix}-${rand}`;
}

export interface ComplianceSweepResult {
  updatedWorkers: Worker[];
  newAuditEntries: AuditLogEntry[];
  triggeredCount: number;
  scannedInWindowCount: number;
}

export function runComplianceSweep(
  workers: Worker[],
  actor: string = 'Automated 08:30 Compliance Sweep',
  referenceDate: string = toIsoDateString(new Date()),
  nowIso: string = new Date().toISOString(),
): ComplianceSweepResult {
  const newAuditEntries: AuditLogEntry[] = [];
  let scannedInWindowCount = 0;

  const updatedWorkers = workers.map((worker) => {
    const days = getDaysRemaining(worker.expiryDate, referenceDate);
    const stage = getAlertStage(days);

    if (days > 90) {
      return worker;
    }

    scannedInWindowCount += 1;

    if (worker.alertsSent.includes(stage)) {
      return worker;
    }

    const updatedAlerts: AlertStage[] = [...worker.alertsSent, stage];
    const countdownText = formatCountdownLabel(days);

    newAuditEntries.push({
      id: `audit-sweep-${worker.id}-${Date.now()}-${newAuditEntries.length}`,
      timestamp: nowIso,
      eventType: 'EXPIRY_ALERT',
      workerId: worker.id,
      workerName: worker.fullName,
      shareCode: worker.shareCode,
      actor,
      summary: `${stage} alert dispatched (${countdownText})`,
      details: `08:30 daily compliance sweep triggered ${stage} escalation for ${worker.fullName} (${worker.visaRoute}, expiry ${worker.expiryDate}).`,
      appendixDRef: generateAppendixDRef('SWP', newAuditEntries.length + 1),
    });

    return {
      ...worker,
      alertsSent: updatedAlerts,
      lastAlertSentAt: nowIso,
    };
  });

  return {
    updatedWorkers,
    newAuditEntries,
    triggeredCount: newAuditEntries.length,
    scannedInWindowCount,
  };
}

export interface ChecklistItem {
  title: string;
  guidance: string;
  critical?: boolean;
}

export function getRouteChecklist(visaRoute: VisaRoute, workerName: string): ChecklistItem[] {
  switch (visaRoute) {
    case 'Skilled Worker':
      return [
        {
          title: 'Confirm Defined/Undefined CoS Allocation & SOC 2020 Code',
          guidance: `Verify remaining Certificate of Sponsorship balance in SMS and validate ${workerName}'s current SOC 2020 occupation code before issuing an extension CoS.`,
        },
        {
          title: 'Audit Salary Threshold & Going-Rate Compliance',
          guidance: 'Check base gross salary against current Skilled Worker general threshold (£38,700 or transitional/new-entrant rate) and SOC hourly going rate.',
          critical: true,
        },
        {
          title: 'Schedule Follow-Up eVisa RTW Check Before Expiry',
          guidance: 'Obtain a fresh 9-character UKVI share code (W-prefix) prior to visa expiry or capture in-time Home Office submission proof (Section 3C leave).',
        },
      ];
    case 'Graduate Visa':
      return [
        {
          title: 'No Direct Extension Permitted — Switch Route Required',
          guidance: `Warning: Graduate Visas cannot be extended directly. ${workerName} must switch to a Skilled Worker (or other sponsored/eligible) route before the expiry date to retain Right to Work.`,
          critical: true,
        },
        {
          title: 'Assess Skilled Worker New-Entrant Discount Eligibility',
          guidance: 'Switching directly from a Graduate Visa qualifies for the 4-year Skilled Worker New-Entrant salary discount (subject to minimum floor and SOC rules).',
        },
        {
          title: 'Assign Sponsorship CoS & Capture New Share Code',
          guidance: 'Assign an Undefined CoS via Home Office SMS at least 21 days before expiry and verify the resulting eVisa share code in Appendix D.',
        },
      ];
    case 'Health & Care Worker':
      return [
        {
          title: 'Verify CQC-Regulated Activity & Eligible SOC Occupation',
          guidance: `Confirm ${workerName}'s role remains within an eligible Health & Care SOC 2020 code and CQC-registered service delivery.`,
          critical: true,
        },
        {
          title: 'Confirm Reduced CoS Fee & IHS Exemption Status',
          guidance: 'Ensure Health & Care Worker CoS endorsement flags IHS exemption and applies the reduced visa fee schedule during renewal.',
        },
        {
          title: 'Log Updated eVisa Check & DBS/Professional Registration',
          guidance: 'Record renewed UKVI RTW share code alongside active NMC/GMC/HCPC registration in the Appendix D personnel file.',
        },
      ];
    case 'Student Visa':
      return [
        {
          title: 'Enforce 20-Hour Term-Time Cap & No Permanent Full-Time Breach',
          guidance: `Warning: Student Visa holders cannot fill a permanent full-time vacancy or exceed 20 hrs/week during term time. Audit ${workerName}'s timesheets immediately.`,
          critical: true,
        },
        {
          title: 'Verify Course Completion Date for Route Switching',
          guidance: 'Before assigning a Skilled Worker CoS or awaiting Graduate transition, obtain written university confirmation of course completion.',
        },
        {
          title: 'Obtain Updated Share Code Before Current Leave Expires',
          guidance: 'Student visas cannot be extended for employment; capture a valid Graduate or Skilled Worker application/eVisa share code before expiry.',
        },
      ];
    case 'Global Talent':
      return [
        {
          title: 'Confirm Endorsement Validity & Extension / ILR Pathway',
          guidance: `Check whether ${workerName} is eligible for Indefinite Leave to Remain (3 or 5 years depending on endorsing body) or requires a Global Talent extension.`,
        },
        {
          title: 'Verify Unbroken Compliance Under Unrestricted Work Rules',
          guidance: 'Global Talent permits unrestricted employment and self-employment, but continuous Right-to-Work re-verification is still mandatory before expiry.',
        },
        {
          title: 'Record Fresh 9-Character UKVI Share Code in Appendix D',
          guidance: 'Request a new Right-to-Work share code once extension or settlement is granted and archive dated PDF/check confirmation.',
          critical: true,
        },
      ];
  }
}

export function buildReminderEmail(
  worker: Worker,
  daysRemaining: number,
): { subject: string; body: string } {
  const urgencyPrefix =
    daysRemaining < 0
      ? 'URGENT ACTION REQUIRED (Leave Expired)'
      : daysRemaining <= 14
        ? 'URGENT (Expires in <=14 Days)'
        : 'Right-to-Work Renewal Reminder';

  const expiryPhrase =
    daysRemaining < 0
      ? `expired on ${worker.expiryDate} (${Math.abs(daysRemaining)} days ago)`
      : daysRemaining === 0
        ? `expires today (${worker.expiryDate})`
        : `is scheduled to expire on ${worker.expiryDate} (${daysRemaining} days remaining)`;

  const routeNote =
    worker.visaRoute === 'Graduate Visa'
      ? 'As a Graduate Visa cannot be extended directly, please confirm immediately whether you are switching to a Skilled Worker route with our Sponsorship team or another eligible visa category.'
      : worker.visaRoute === 'Student Visa'
        ? 'Please confirm your upcoming course completion status and whether you intend to transition to a Graduate Visa or Skilled Worker sponsorship before your current permission ends.'
        : 'Please confirm your renewal timeline with People Operations so we can align any Certificate of Sponsorship (CoS) or immigration support required.';

  const subject = `${urgencyPrefix}: UK Right-to-Work Renewal & Share Code Request — ${worker.fullName}`;

  const body = [
    `Dear ${worker.fullName},`,
    '',
    `As part of our Home Office Appendix D Sponsor Licence compliance obligations, we are writing regarding your current ${worker.visaRoute} permission (${worker.jobTitle}), which ${expiryPhrase}.`,
    '',
    routeNote,
    '',
    'To maintain uninterrupted Right to Work, please reply to this message within 3 working days with:',
    '1. Confirmation of your visa renewal or route-switch submission status (including your UKVI Unique Application Number if submitted).',
    '2. An updated 9-character UKVI Right-to-Work Share Code generated from the GOV.UK "Prove your right to work" service (along with your date of birth for verification).',
    '',
    'Please note that if valid Right-to-Work evidence or an in-time pending application check (Employer Checking Service Positive Verification Notice) is not on file prior to expiry, we are legally required to pause work duties until verification is complete.',
    '',
    'Kind regards,',
    `${worker.hrApprover}`,
    'People Operations & Sponsor Compliance Team',
  ].join('\n');

  return { subject, body };
}

export function evaluateSmsDuty(
  worker: Worker,
  changeType: SmsChangeType,
  effectiveDate: string,
  changeDetails: string,
  salaryContext: SalaryChangeContext = 'REDUCTION_OR_VARIATION',
): SmsDutyEvaluation {
  const cleanDetails = changeDetails.trim() || 'Contractual employment record update.';
  const cosRef = worker.cosNumber ? `CoS ${worker.cosNumber}` : 'Active Sponsorship Record';

  switch (changeType) {
    case 'UNAUTHORISED_ABSENCE': {
      const deadlineDays = 10 as const;
      return {
        changeType,
        changeLabel: '10+ Days Unauthorised Absence',
        deadlineDays,
        deadlineBadge: 'Mandatory 10-Working-Day SMS Report',
        statutoryBasis:
          'Home Office Sponsor Guidance Part 3 (C1.7): Must report within 10 working days of the 10th consecutive working day of unauthorised absence without permission.',
        actionRequired:
          'Submit a "Report migrant activity" notice on Home Office SMS within 10 working days and confirm whether sponsorship continues or is withdrawn.',
        reportDueBy: addWorkingDaysToIsoDate(effectiveDate, deadlineDays),
        draftedWording: `Worker: ${worker.fullName} (${cosRef}, Route: ${worker.visaRoute}, Share Code: ${worker.shareCode}). Sponsor reports 10+ consecutive working days of unauthorised absence commencing prior to ${effectiveDate}. Details: ${cleanDetails}. HR attendance escalation completed; sponsorship status update enclosed.`,
      };
    }
    case 'WORK_LOCATION_CHANGE': {
      const deadlineDays = 10 as const;
      return {
        changeType,
        changeLabel: 'Work Location Change',
        deadlineDays,
        deadlineBadge: 'Mandatory 10-Working-Day SMS Report',
        statutoryBasis:
          'Home Office Sponsor Guidance Part 3 (C1.7): Any change to normal work location, regular hybrid/remote arrangement, or third-party client site must be reported within 10 working days.',
        actionRequired:
          'Log a "Change in migrant circumstances" update in Home Office SMS within 10 working days specifying the new primary UK workplace address.',
        reportDueBy: addWorkingDaysToIsoDate(effectiveDate, deadlineDays),
        draftedWording: `Worker: ${worker.fullName} (${cosRef}, Role: ${worker.jobTitle}). Effective ${effectiveDate}, the worker's normal UK work location / hybrid arrangement has changed. Details: ${cleanDetails}. Duties, line management, and SOC 2020 occupation code remain unchanged.`,
      };
    }
    case 'ROLE_SOC_CHANGE': {
      const deadlineDays = 10 as const;
      return {
        changeType,
        changeLabel: 'Job Title / SOC Code Change',
        deadlineDays,
        deadlineBadge: 'Mandatory 10-Working-Day SMS Report',
        statutoryBasis:
          'Home Office Sponsor Guidance Part 3 (C1.7 & Change of Employment): Job title or core duty updates within the same SOC 2020 code require a 10-working-day SMS report. If the SOC 2020 code changes, a new Change of Employment CoS and visa grant are mandatory BEFORE starting the new role.',
        actionRequired:
          'Confirm SOC 2020 code equivalence; if unchanged, file SMS report within 10 working days. If SOC code changes, halt transition until Change of Employment permission is granted.',
        reportDueBy: addWorkingDaysToIsoDate(effectiveDate, deadlineDays),
        draftedWording: `Worker: ${worker.fullName} (${cosRef}). Effective ${effectiveDate}, the sponsor notifies a change in job title / role responsibilities from ${worker.jobTitle}. Details: ${cleanDetails}. SOC 2020 alignment and salary threshold compliance verified against current Skilled Worker rules.`,
      };
    }
    case 'SALARY_CHANGE': {
      const isOrganisational =
        salaryContext === 'ORGANISATIONAL_OR_ANNUAL_UPLIFT' ||
        /\b(tupe|merger|acquisition|company-wide|annual pay|uplift)\b/i.test(cleanDetails);
      const deadlineDays: 10 | 20 = isOrganisational ? 20 : 10;
      const statutoryBasis =
        deadlineDays === 20
          ? 'Home Office Sponsor Guidance Part 3 (C2.3): Organisational pay-band adjustments, TUPE transfers, or structural entity changes affecting sponsored salary records must be reported via SMS within 20 working days.'
          : 'Home Office Sponsor Guidance Part 3 (C1.7): Any salary reduction or contractual pay variation not covered by a statutory exemption must be reported on SMS within 10 working days and must remain above the applicable Skilled Worker threshold & going rate.';

      return {
        changeType,
        changeLabel: 'Salary Change',
        deadlineDays,
        deadlineBadge:
          deadlineDays === 20
            ? 'Mandatory 20-Working-Day SMS Report'
            : 'Mandatory 10-Working-Day SMS Report',
        statutoryBasis,
        actionRequired:
          deadlineDays === 20
            ? 'File an organisational / pay-band SMS notification within 20 working days and archive updated employment contract addendum in Appendix D.'
            : 'Report the salary change on Home Office SMS within 10 working days and verify the revised gross salary meets the Skilled Worker general threshold and SOC going rate.',
        reportDueBy: addWorkingDaysToIsoDate(effectiveDate, deadlineDays),
        draftedWording: `Worker: ${worker.fullName} (${cosRef}, Role: ${worker.jobTitle}). Effective ${effectiveDate}, the worker's gross annual remuneration has been updated. Classification: ${deadlineDays}-working-day reporting duty. Details: ${cleanDetails}. Confirmed compliant with applicable UKVI salary threshold requirements.`,
      };
    }
  }
}

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

function parseFlexibleDateToIso(rawDate: string): string {
  const trimmed = rawDate.trim();
  const isoMatch = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/.exec(trimmed);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    return `${slashMatch[3]}-${month}-${day}`;
  }

  const wordMatch = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/.exec(trimmed);
  if (wordMatch) {
    const day = wordMatch[1].padStart(2, '0');
    const monthKey = wordMatch[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      return `${wordMatch[3]}-${month}-${day}`;
    }
  }

  return '';
}

function detectVisaRoute(text: string): VisaRoute {
  const lower = text.toLowerCase();
  if (lower.includes('health and care') || lower.includes('health & care')) {
    return 'Health & Care Worker';
  }
  if (lower.includes('graduate')) {
    return 'Graduate Visa';
  }
  if (lower.includes('student')) {
    return 'Student Visa';
  }
  if (lower.includes('global talent')) {
    return 'Global Talent';
  }
  return 'Skilled Worker';
}

export function parseUkviEvisaText(rawText: string): ExtractedEvisaFields {
  const text = rawText.trim();

  // Name extraction
  const nameMatch =
    /(?:Name|Full Name|Worker Name|Employee)\s*[:\-]\s*([^\n\r]+)/i.exec(text);
  const fullName = nameMatch ? nameMatch[1].trim() : '';

  // Job Title extraction if present
  const jobMatch =
    /(?:Job Title|Role|Occupation|Position)\s*[:\-]\s*([^\n\r]+)/i.exec(text);
  const jobTitle = jobMatch ? jobMatch[1].trim() : '';

  // Share Code extraction (9 alphanumeric chars, optionally grouped 3-3-3)
  const shareLabelMatch =
    /(?:Share Code|Right to Work Code)\s*[:\-]\s*([A-Z0-9]{3}[\s\-]?[A-Z0-9]{3}[\s\-]?[A-Z0-9]{3})/i.exec(
      text,
    );
  const genericShareMatch = /\b([A-Z0-9]{3}[\s\-]?[A-Z0-9]{3}[\s\-]?[A-Z0-9]{3})\b/.exec(
    text.toUpperCase(),
  );
  const rawShare = shareLabelMatch?.[1] ?? genericShareMatch?.[1] ?? '';
  const shareCode = normalizeShareCode(rawShare);

  // Expiry Date extraction
  const expiryLineMatch =
    /(?:Expiry Date|Valid Until|Permission Expires|Visa Expiry|End Date|Expires On)\s*[:\-]\s*([^\n\r]+)/i.exec(
      text,
    );
  const expiryDate = expiryLineMatch
    ? parseFlexibleDateToIso(expiryLineMatch[1])
    : parseFlexibleDateToIso(text);

  // Visa Route
  const routeLineMatch =
    /(?:Visa Route|Immigration Status|Status|Permission Type|Route)\s*[:\-]\s*([^\n\r]+)/i.exec(
      text,
    );
  const visaRoute = detectVisaRoute(routeLineMatch ? routeLineMatch[1] : text);

  // Work Restrictions
  const restrictionsMatch =
    /(?:Work Restrictions|Conditions|Work Conditions|Restrictions)\s*[:\-]\s*([^\n\r]+)/i.exec(
      text,
    );
  let workRestrictions = restrictionsMatch ? restrictionsMatch[1].trim() : '';
  if (!workRestrictions) {
    if (visaRoute === 'Student Visa') {
      workRestrictions = 'Max 20 hrs/week term-time; full-time outside term';
    } else if (visaRoute === 'Graduate Visa' || visaRoute === 'Global Talent') {
      workRestrictions = 'Unrestricted work permitted (excluding sportsperson)';
    } else {
      workRestrictions = 'Sponsored employment only; max 20 hrs supplementary work';
    }
  }

  return {
    fullName,
    jobTitle,
    visaRoute,
    expiryDate,
    shareCode,
    workRestrictions,
    sourceEngine: 'deterministic',
  };
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatAuditLogCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'Audit ID',
    'Timestamp (UTC)',
    'Appendix D Ref',
    'Event Type',
    'Worker Name',
    'UKVI Share Code',
    'Actor / HR Approver',
    'Summary',
    'Compliance Details',
  ];

  const rows = logs.map((entry) =>
    [
      entry.id,
      entry.timestamp,
      entry.appendixDRef,
      entry.eventType,
      entry.workerName,
      entry.shareCode,
      entry.actor,
      entry.summary,
      entry.details,
    ]
      .map(escapeCsvCell)
      .join(','),
  );

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}
