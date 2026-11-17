export type VisaRoute =
  | 'Skilled Worker'
  | 'Graduate Visa'
  | 'Health & Care Worker'
  | 'Student Visa'
  | 'Global Talent';

export type AlertStage =
  | 'Expired'
  | '14-Day Urgent'
  | '30-Day Warning'
  | '60-Day Warning'
  | '90-Day Notice'
  | 'Compliant';

export type StatusFilter =
  | 'All'
  | 'Action Needed'
  | AlertStage;

export interface Worker {
  id: string;
  fullName: string;
  jobTitle: string;
  visaRoute: VisaRoute;
  expiryDate: string; // YYYY-MM-DD
  shareCode: string; // 9-character alphanumeric UKVI share code
  workRestrictions: string;
  alertsSent: AlertStage[];
  lastAlertSentAt?: string;
  lastRtwCheckAt: string;
  hrApprover: string;
  cosNumber?: string;
}

export type AuditEventType =
  | 'RTW_CHECK'
  | 'HITL_VERIFICATION'
  | 'EXPIRY_ALERT'
  | 'COMPLIANCE_SWEEP'
  | 'SMS_DUTY_REPORT'
  | 'REMINDER_EMAIL';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  eventType: AuditEventType;
  workerId: string;
  workerName: string;
  shareCode: string;
  actor: string;
  summary: string;
  details: string;
  appendixDRef: string;
}

export type SmsChangeType =
  | 'SALARY_CHANGE'
  | 'ROLE_SOC_CHANGE'
  | 'WORK_LOCATION_CHANGE'
  | 'UNAUTHORISED_ABSENCE';

export type SalaryChangeContext =
  | 'REDUCTION_OR_VARIATION'
  | 'ORGANISATIONAL_OR_ANNUAL_UPLIFT';

export interface SmsDutyEvaluation {
  changeType: SmsChangeType;
  changeLabel: string;
  deadlineDays: 10 | 20;
  deadlineBadge: string;
  statutoryBasis: string;
  actionRequired: string;
  draftedWording: string;
  reportDueBy: string; // YYYY-MM-DD
}

export interface SmsReportRecord {
  id: string;
  workerId: string;
  workerName: string;
  shareCode: string;
  changeType: SmsChangeType;
  changeLabel: string;
  deadlineDays: 10 | 20;
  effectiveDate: string;
  reportDueBy: string;
  notes: string;
  draftedWording: string;
  reportedAt: string;
  reportedBy: string;
  smsSubmissionRef: string;
}

export interface KpiStats {
  total: number;
  urgent: number;
  renewalWindow: number;
  compliant: number;
}

export interface ExtractedEvisaFields {
  fullName: string;
  jobTitle: string;
  visaRoute: VisaRoute;
  expiryDate: string;
  shareCode: string;
  workRestrictions: string;
  sourceEngine?: 'gemini' | 'deterministic';
}
