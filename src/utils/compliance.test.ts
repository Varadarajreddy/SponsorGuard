import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIsoDate,
  buildReminderEmail,
  computeKpiStats,
  evaluateSmsDuty,
  filterWorkers,
  formatAuditLogCsv,
  formatCountdownLabel,
  getAlertStage,
  getDaysRemaining,
  getRouteChecklist,
  parseUkviEvisaText,
  runComplianceSweep,
} from './compliance';
import { createInitialDemoWorkers, getSampleEvisaText } from '../data/demoData';

const REF_DATE = '2026-11-16';

test('getDaysRemaining and getAlertStage classify all 6 compliance buckets accurately', () => {
  assert.equal(getDaysRemaining('2026-11-13', REF_DATE), -3);
  assert.equal(getAlertStage(-3), 'Expired');
  assert.equal(formatCountdownLabel(-3), '3d overdue');

  assert.equal(getDaysRemaining('2026-11-16', REF_DATE), 0);
  assert.equal(getAlertStage(0), '14-Day Urgent');
  assert.equal(formatCountdownLabel(0), 'Expires today');

  assert.equal(getAlertStage(14), '14-Day Urgent');
  assert.equal(getAlertStage(15), '30-Day Warning');
  assert.equal(getAlertStage(30), '30-Day Warning');
  assert.equal(getAlertStage(31), '60-Day Warning');
  assert.equal(getAlertStage(60), '60-Day Warning');
  assert.equal(getAlertStage(61), '90-Day Notice');
  assert.equal(getAlertStage(90), '90-Day Notice');
  assert.equal(getAlertStage(91), 'Compliant');
});

test('computeKpiStats summarizes demo workers accurately', () => {
  const workers = createInitialDemoWorkers(REF_DATE);
  const stats = computeKpiStats(workers, REF_DATE);
  assert.equal(stats.total, 6);
  assert.equal(stats.urgent, 2); // Expired (-3d) + 14-Day Urgent (11d)
  assert.equal(stats.renewalWindow, 3); // 24d + 48d + 76d
  assert.equal(stats.compliant, 1); // 215d
});

test('filterWorkers filters by search query and status stage and sorts soonest first', () => {
  const workers = createInitialDemoWorkers(REF_DATE);
  const actionNeeded = filterWorkers(workers, '', 'Action Needed', REF_DATE);
  assert.equal(actionNeeded.length, 5);
  assert.equal(actionNeeded[0].fullName, 'Amara Okafor');

  const byShareCode = filterWorkers(workers, 'G3M8V6L1Z', 'All', REF_DATE);
  assert.equal(byShareCode.length, 1);
  assert.equal(byShareCode[0].fullName, 'Priya Nair');
});

test('runComplianceSweep triggers unsent alerts in <=90d buckets and creates Appendix D entries', () => {
  const workers = createInitialDemoWorkers(REF_DATE);
  const sweep1 = runComplianceSweep(
    workers,
    'Automated 08:30 Compliance Sweep',
    REF_DATE,
    '2026-11-16T08:30:00.000Z',
  );
  // All 5 <=90d workers had not yet been sent their current stage alert in demoData!
  assert.equal(sweep1.scannedInWindowCount, 5);
  assert.equal(sweep1.triggeredCount, 5);
  assert.equal(sweep1.newAuditEntries.length, 5);

  // Running a second sweep on the same day should trigger 0 duplicate alerts
  const sweep2 = runComplianceSweep(
    sweep1.updatedWorkers,
    'Automated 08:30 Compliance Sweep',
    REF_DATE,
    '2026-11-16T08:31:00.000Z',
  );
  assert.equal(sweep2.triggeredCount, 0);
});

test('parseUkviEvisaText extracts structured fields from sample UKVI eVisa text', () => {
  const sample = getSampleEvisaText(REF_DATE);
  const parsed = parseUkviEvisaText(sample);
  assert.equal(parsed.fullName, 'Arjun Venkatesh');
  assert.equal(parsed.jobTitle, 'Lead Cloud Security Engineer');
  assert.equal(parsed.visaRoute, 'Skilled Worker');
  assert.equal(parsed.expiryDate, addDaysToIsoDate(REF_DATE, 145));
  assert.equal(parsed.shareCode, 'W8K4P92MN');
  assert.match(parsed.workRestrictions, /SOC 2133/);
});

test('evaluateSmsDuty classifies 10-working-day and 20-working-day Home Office SMS duties', () => {
  const worker = createInitialDemoWorkers(REF_DATE)[5];
  const absenceEval = evaluateSmsDuty(
    worker,
    'UNAUTHORISED_ABSENCE',
    '2026-11-16',
    'Employee absent 10 consecutive working days without leave.',
  );
  assert.equal(absenceEval.deadlineDays, 10);
  assert.equal(absenceEval.reportDueBy, '2026-11-30');

  const orgSalaryEval = evaluateSmsDuty(
    worker,
    'SALARY_CHANGE',
    '2026-11-16',
    'Annual pay band uplift following company-wide review.',
    'ORGANISATIONAL_OR_ANNUAL_UPLIFT',
  );
  assert.equal(orgSalaryEval.deadlineDays, 20);
});

test('getRouteChecklist and buildReminderEmail generate route-specific guidance', () => {
  const graduateChecklist = getRouteChecklist('Graduate Visa', 'Priya Nair');
  assert.equal(graduateChecklist.length, 3);
  assert.match(graduateChecklist[0].title, /No Direct Extension Permitted/i);

  const worker = createInitialDemoWorkers(REF_DATE)[2];
  const email = buildReminderEmail(worker, 24);
  assert.match(email.subject, /Priya Nair/);
  assert.match(email.body, /Graduate Visa cannot be extended directly/i);
});

test('formatAuditLogCsv escapes commas and quotes cleanly', () => {
  const csv = formatAuditLogCsv([
    {
      id: 'a1',
      timestamp: '2026-11-16T08:30:00.000Z',
      eventType: 'RTW_CHECK',
      workerId: 'w1',
      workerName: 'Okafor, Amara',
      shareCode: 'W4R9K2M7P',
      actor: 'Claire Bennett',
      summary: 'Checked "eVisa" status',
      details: 'Verified online',
      appendixDRef: 'APP-D-1001',
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /"Okafor, Amara"/);
  assert.match(lines[1], /"Checked ""eVisa"" status"/);
});
