import type {
  AuditLogEntry,
  SmsReportRecord,
  Worker,
} from '../types/compliance';
import { addDaysToIsoDate, toIsoDateString } from '../utils/compliance';

export function createInitialDemoWorkers(
  referenceDate: string = toIsoDateString(new Date()),
): Worker[] {
  return [
    {
      id: 'wrk-amara-01',
      fullName: 'Amara Okafor',
      jobTitle: 'Senior Data Scientist',
      visaRoute: 'Skilled Worker',
      expiryDate: addDaysToIsoDate(referenceDate, -3),
      shareCode: 'W4R9K2M7P',
      workRestrictions: 'Sponsored employment only (SOC 2433); max 20 hrs supplementary work',
      alertsSent: ['90-Day Notice', '60-Day Warning', '30-Day Warning', '14-Day Urgent'],
      lastAlertSentAt: `${addDaysToIsoDate(referenceDate, -5)}T08:30:00.000Z`,
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -180)}T10:15:00.000Z`,
      hrApprover: 'Claire Bennett',
      cosNumber: 'C2G8841209F',
    },
    {
      id: 'wrk-mateusz-02',
      fullName: 'Mateusz Kowalski',
      jobTitle: 'Clinical Systems Analyst',
      visaRoute: 'Health & Care Worker',
      expiryDate: addDaysToIsoDate(referenceDate, 11),
      shareCode: 'H7T2N8Q5X',
      workRestrictions: 'Sponsored NHS/care role only; CQC regulated activity',
      alertsSent: ['90-Day Notice', '60-Day Warning', '30-Day Warning'],
      lastAlertSentAt: `${addDaysToIsoDate(referenceDate, -19)}T08:30:00.000Z`,
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -140)}T14:20:00.000Z`,
      hrApprover: 'Claire Bennett',
      cosNumber: 'C2G7710394M',
    },
    {
      id: 'wrk-priya-03',
      fullName: 'Priya Nair',
      jobTitle: 'Junior Product Designer',
      visaRoute: 'Graduate Visa',
      expiryDate: addDaysToIsoDate(referenceDate, 24),
      shareCode: 'G3M8V6L1Z',
      workRestrictions: 'Unrestricted work permitted; cannot be extended directly',
      alertsSent: ['90-Day Notice', '60-Day Warning'],
      lastAlertSentAt: `${addDaysToIsoDate(referenceDate, -36)}T08:30:00.000Z`,
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -95)}T11:05:00.000Z`,
      hrApprover: 'David Thorne',
    },
    {
      id: 'wrk-yusuf-04',
      fullName: 'Yusuf Al-Mansoor',
      jobTitle: 'Software Engineering Intern',
      visaRoute: 'Student Visa',
      expiryDate: addDaysToIsoDate(referenceDate, 48),
      shareCode: 'S9C5B4J8D',
      workRestrictions: 'Max 20 hrs/week term-time; full-time outside term',
      alertsSent: ['90-Day Notice'],
      lastAlertSentAt: `${addDaysToIsoDate(referenceDate, -42)}T08:30:00.000Z`,
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -60)}T09:40:00.000Z`,
      hrApprover: 'David Thorne',
    },
    {
      id: 'wrk-sofia-05',
      fullName: 'Sofia Lindqvist',
      jobTitle: 'Principal ML Architect',
      visaRoute: 'Global Talent',
      expiryDate: addDaysToIsoDate(referenceDate, 76),
      shareCode: 'T6P1X3W9F',
      workRestrictions: 'Unrestricted work & self-employment permitted',
      alertsSent: [],
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -110)}T16:00:00.000Z`,
      hrApprover: 'Claire Bennett',
    },
    {
      id: 'wrk-daniela-06',
      fullName: 'Daniela Morales',
      jobTitle: 'DevOps Infrastructure Lead',
      visaRoute: 'Skilled Worker',
      expiryDate: addDaysToIsoDate(referenceDate, 215),
      shareCode: 'K2N7R5Y4H',
      workRestrictions: 'Sponsored employment only (SOC 2134); max 20 hrs supplementary work',
      alertsSent: [],
      lastRtwCheckAt: `${addDaysToIsoDate(referenceDate, -30)}T13:10:00.000Z`,
      hrApprover: 'Claire Bennett',
      cosNumber: 'C2G9912481B',
    },
  ];
}

export function createInitialAuditLogs(
  referenceDate: string = toIsoDateString(new Date()),
): AuditLogEntry[] {
  return [
    {
      id: 'audit-init-01',
      timestamp: `${addDaysToIsoDate(referenceDate, -5)}T08:30:00.000Z`,
      eventType: 'EXPIRY_ALERT',
      workerId: 'wrk-amara-01',
      workerName: 'Amara Okafor',
      shareCode: 'W4R9K2M7P',
      actor: 'Automated 08:30 Compliance Sweep',
      summary: '14-Day Urgent alert dispatched (2 days remaining at check)',
      details: 'Escalated Skilled Worker visa renewal warning to HR Authorising Officer & employee.',
      appendixDRef: 'APP-D-SWP-4012',
    },
    {
      id: 'audit-init-02',
      timestamp: `${addDaysToIsoDate(referenceDate, -12)}T11:20:00.000Z`,
      eventType: 'SMS_DUTY_REPORT',
      workerId: 'wrk-daniela-06',
      workerName: 'Daniela Morales',
      shareCode: 'K2N7R5Y4H',
      actor: 'Claire Bennett (Level 1 User)',
      summary: '10-Working-Day SMS Report: Work Location Change',
      details: 'Reported hybrid London/Manchester office split on Home Office SMS (Ref SMS-2026-88412).',
      appendixDRef: 'APP-D-SMS-8841',
    },
    {
      id: 'audit-init-03',
      timestamp: `${addDaysToIsoDate(referenceDate, -19)}T08:30:00.000Z`,
      eventType: 'EXPIRY_ALERT',
      workerId: 'wrk-mateusz-02',
      workerName: 'Mateusz Kowalski',
      shareCode: 'H7T2N8Q5X',
      actor: 'Automated 08:30 Compliance Sweep',
      summary: '30-Day Warning alert dispatched (30 days remaining at check)',
      details: 'CQC-regulated Health & Care Worker renewal check initiated.',
      appendixDRef: 'APP-D-SWP-3890',
    },
    {
      id: 'audit-init-04',
      timestamp: `${addDaysToIsoDate(referenceDate, -30)}T13:10:00.000Z`,
      eventType: 'HITL_VERIFICATION',
      workerId: 'wrk-daniela-06',
      workerName: 'Daniela Morales',
      shareCode: 'K2N7R5Y4H',
      actor: 'Claire Bennett',
      summary: 'eVisa RTW check verified & signed off',
      details: 'UKVI online check matched passport identity and Skilled Worker CoS C2G9912481B.',
      appendixDRef: 'APP-D-HITL-2044',
    },
    {
      id: 'audit-init-05',
      timestamp: `${addDaysToIsoDate(referenceDate, -60)}T09:40:00.000Z`,
      eventType: 'RTW_CHECK',
      workerId: 'wrk-yusuf-04',
      workerName: 'Yusuf Al-Mansoor',
      shareCode: 'S9C5B4J8D',
      actor: 'David Thorne',
      summary: 'Student Visa term-time 20h restriction verified',
      details: 'Academic term dates and university enrolment letter archived alongside UKVI share code.',
      appendixDRef: 'APP-D-RTW-1187',
    },
  ];
}

export function createInitialSmsReports(
  referenceDate: string = toIsoDateString(new Date()),
): SmsReportRecord[] {
  return [
    {
      id: 'sms-init-01',
      workerId: 'wrk-daniela-06',
      workerName: 'Daniela Morales',
      shareCode: 'K2N7R5Y4H',
      changeType: 'WORK_LOCATION_CHANGE',
      changeLabel: 'Work Location Change',
      deadlineDays: 10,
      effectiveDate: addDaysToIsoDate(referenceDate, -14),
      reportDueBy: addDaysToIsoDate(referenceDate, -2),
      notes: 'Moved to hybrid schedule: 3 days London HQ (EC2A), 2 days Manchester Tech Hub.',
      draftedWording:
        'Worker: Daniela Morales (CoS C2G9912481B, Role: DevOps Infrastructure Lead). Worker transitioned to hybrid London HQ / Manchester Tech Hub pattern. Duties and SOC 2134 remain unchanged.',
      reportedAt: `${addDaysToIsoDate(referenceDate, -12)}T11:20:00.000Z`,
      reportedBy: 'Claire Bennett (Level 1 User)',
      smsSubmissionRef: 'SMS-2026-88412',
    },
  ];
}

export function getSampleEvisaText(
  referenceDate: string = toIsoDateString(new Date()),
): string {
  const futureExpiry = addDaysToIsoDate(referenceDate, 145);
  return [
    'GOV.UK — View and prove your immigration status (eVisa Right to Work Check)',
    'Share Code: W8K 4P9 2MN',
    'Full Name: Arjun Venkatesh',
    'Job Title: Lead Cloud Security Engineer',
    'Visa Route: Skilled Worker',
    `Expiry Date: ${futureExpiry}`,
    'Work Restrictions: Sponsored employment only (SOC 2133); max 20 hrs/week supplementary work permitted in eligible roles',
    'Status: Valid permission to work in the United Kingdom verified online.',
  ].join('\n');
}
