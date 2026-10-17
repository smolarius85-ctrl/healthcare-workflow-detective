import type { CaseCalendar, Referral, ReferralEvent } from '../case/types';
import { businessDaysBetween, businessMinutesBetween, toMinutes } from './time';

/**
 * Metric calculations. Everything shown in the timeline explorer is derived here
 * from the event records — nothing is hardcoded.
 *
 * Measured journey: from the `submitted` event to the FIRST `outreach_attempt`.
 * Events after that endpoint are ignored, so later activity cannot leak into
 * the measures. Referrals with no outreach yet are measured up to the data cutoff.
 * Duplicate records end at their `merged` event and are excluded from target measures.
 */

export interface StageBreakdown {
  /** Submitted → ReferralTrack record exists. */
  transmission: number;
  /** Received → copied to outreach, excluding time on the exception path. */
  intake: number;
  /** Missing-info flag → copied to outreach (or endpoint if still open). */
  exception: number;
  /** Copied to outreach → first outreach attempt. */
  outreachQueue: number;
}

export interface ReferralMetrics {
  id: string;
  clinicId: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  hadDuplicate: boolean;
  incomplete: boolean;
  submittedAt: string;
  firstOutreachAt: string | null;
  endpointAt: string;
  reachedOutreach: boolean;
  businessDays: number;
  /** true = met, false = missed, null = still open and not yet past target. */
  metTarget: boolean | null;
  elapsedBusinessMin: number;
  touchMin: number;
  waitingMin: number;
  returns: number;
  patientInquiries: number;
  stages: StageBreakdown;
  /** Events considered in the calculation (up to and including the endpoint). */
  measuredEvents: ReferralEvent[];
}

export function endpointIndex(r: Referral, cutoff: string): number {
  if (r.duplicateOf) {
    const i = r.events.findIndex((e) => e.type === 'merged');
    if (i >= 0) return i;
  } else {
    const i = r.events.findIndex((e) => e.type === 'outreach_attempt');
    if (i >= 0) return i;
  }
  // Still open: everything up to the cutoff.
  const cut = toMinutes(cutoff);
  let last = -1;
  r.events.forEach((e, idx) => {
    if (toMinutes(e.at) <= cut) last = idx;
  });
  return last;
}

/** Sum of work-session minutes inside [from, to], counting only explicit start/end pairs. */
export function touchMinutes(events: ReferralEvent[], from: string, to: string): number {
  const lo = toMinutes(from);
  const hi = toMinutes(to);
  const starts = new Map<string, number>();
  let total = 0;
  for (const ev of events) {
    if (ev.type === 'work_start' && ev.sessionId) starts.set(ev.sessionId, toMinutes(ev.at));
    if (ev.type === 'work_end' && ev.sessionId && starts.has(ev.sessionId)) {
      const s = Math.max(starts.get(ev.sessionId)!, lo);
      const e = Math.min(toMinutes(ev.at), hi);
      if (e > s) total += e - s;
      starts.delete(ev.sessionId);
    }
  }
  return total;
}

export function computeReferralMetrics(r: Referral, all: Referral[], cal: CaseCalendar): ReferralMetrics {
  const endIdx = endpointIndex(r, cal.dataCutoff);
  const measured = r.events.slice(0, endIdx + 1);
  const submitted = measured.find((e) => e.type === 'submitted');
  if (!submitted) throw new Error(`${r.id} has no submitted event`);
  const outreach = !r.duplicateOf ? measured.find((e) => e.type === 'outreach_attempt') ?? null : null;
  const endpointAt = r.duplicateOf
    ? measured[measured.length - 1].at
    : outreach
      ? outreach.at
      : cal.dataCutoff;

  const elapsed = businessMinutesBetween(submitted.at, endpointAt, cal);
  const touch = touchMinutes(measured, submitted.at, endpointAt);
  const businessDays = businessDaysBetween(submitted.at, endpointAt, cal);
  const flagged = measured.find((e) => e.type === 'missing_info_flagged');
  const received = measured.find((e) => e.type === 'received');
  const copied = measured.find((e) => e.type === 'copied_to_outreach');

  const stages: StageBreakdown = { transmission: 0, intake: 0, exception: 0, outreachQueue: 0 };
  if (received) {
    stages.transmission = businessMinutesBetween(submitted.at, received.at, cal);
    const intakeEnd = copied ? copied.at : endpointAt;
    const intakeTotal = businessMinutesBetween(received.at, intakeEnd, cal);
    stages.exception = flagged ? businessMinutesBetween(flagged.at, intakeEnd, cal) : 0;
    stages.intake = intakeTotal - stages.exception;
    if (copied && outreach) stages.outreachQueue = businessMinutesBetween(copied.at, outreach.at, cal);
  } else {
    stages.transmission = elapsed;
  }

  let metTarget: boolean | null;
  if (r.duplicateOf) metTarget = null;
  else if (outreach) metTarget = businessDays <= cal.targetBusinessDays;
  else metTarget = businessDays > cal.targetBusinessDays ? false : null;

  return {
    id: r.id,
    clinicId: r.clinicId,
    isDuplicate: Boolean(r.duplicateOf),
    duplicateOf: r.duplicateOf,
    hadDuplicate: all.some((x) => x.duplicateOf === r.id),
    incomplete: Boolean(flagged),
    submittedAt: submitted.at,
    firstOutreachAt: outreach ? outreach.at : null,
    endpointAt,
    reachedOutreach: Boolean(outreach),
    businessDays,
    metTarget,
    elapsedBusinessMin: elapsed,
    touchMin: touch,
    waitingMin: elapsed - touch,
    returns: measured.filter((e) => e.type === 'returned_to_clinic').length,
    patientInquiries: measured.filter((e) => e.type === 'patient_inquiry').length,
    stages,
    measuredEvents: measured,
  };
}

export interface GroupSummary {
  label: string;
  referrals: number;
  reachedOutreach: number;
  stillOpen: number;
  metTarget: number;
  evaluable: number;
  /** Share of evaluable referrals meeting target, 0..1, or null if none evaluable. */
  targetRate: number | null;
  medianBusinessDays: number | null;
  meanWaitingHours: number | null;
  meanTouchMin: number | null;
  /** Share of elapsed business time that was waiting, 0..1. */
  waitingShare: number | null;
  incomplete: number;
  incompleteRate: number | null;
  returns: number;
  patientInquiries: number;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Summarize ORIGINAL referrals only (duplicates are passed in but ignored). */
export function summarize(label: string, ms: ReferralMetrics[]): GroupSummary {
  const originals = ms.filter((m) => !m.isDuplicate);
  const evaluable = originals.filter((m) => m.metTarget !== null);
  const reached = originals.filter((m) => m.reachedOutreach);
  const totalElapsed = originals.reduce((a, m) => a + m.elapsedBusinessMin, 0);
  const totalWaiting = originals.reduce((a, m) => a + m.waitingMin, 0);
  const incomplete = originals.filter((m) => m.incomplete).length;
  return {
    label,
    referrals: originals.length,
    reachedOutreach: reached.length,
    stillOpen: originals.length - reached.length,
    metTarget: evaluable.filter((m) => m.metTarget).length,
    evaluable: evaluable.length,
    targetRate: evaluable.length ? evaluable.filter((m) => m.metTarget).length / evaluable.length : null,
    medianBusinessDays: median(reached.map((m) => m.businessDays)),
    meanWaitingHours: originals.length ? mean(originals.map((m) => m.waitingMin / 60)) : null,
    meanTouchMin: mean(originals.map((m) => m.touchMin)),
    waitingShare: totalElapsed ? totalWaiting / totalElapsed : null,
    incomplete,
    incompleteRate: originals.length ? incomplete / originals.length : null,
    returns: originals.reduce((a, m) => a + m.returns, 0),
    patientInquiries: originals.reduce((a, m) => a + m.patientInquiries, 0),
  };
}

export interface DuplicateSummary {
  duplicates: number;
  duplicateTouchMin: number;
  originalsWithDuplicate: number;
  inquiriesBeforeDuplicate: number;
}

export function summarizeDuplicates(ms: ReferralMetrics[], all: Referral[]): DuplicateSummary {
  const dups = ms.filter((m) => m.isDuplicate);
  let inquiriesBefore = 0;
  for (const d of dups) {
    const orig = all.find((r) => r.id === d.duplicateOf);
    if (orig?.events.some((e) => e.type === 'patient_inquiry' && toMinutes(e.at) <= toMinutes(d.submittedAt))) inquiriesBefore++;
  }
  return {
    duplicates: dups.length,
    duplicateTouchMin: dups.reduce((a, m) => a + m.touchMin, 0),
    originalsWithDuplicate: new Set(dups.map((d) => d.duplicateOf)).size,
    inquiriesBeforeDuplicate: inquiriesBefore,
  };
}

export function computeAll(referrals: Referral[], cal: CaseCalendar): ReferralMetrics[] {
  return referrals.map((r) => computeReferralMetrics(r, referrals, cal));
}

export interface ExceptionQueueItem {
  id: string;
  clinicId: string;
  flaggedAt: string;
  missing: string[];
  lastAction: string;
  lastActionType: ReferralEvent['type'];
  lastActionAt: string;
  businessDaysInQueue: number;
}

/** What the Intake Exceptions folder contained at a given moment, reconstructed from events. */
export function exceptionQueueAt(referrals: Referral[], ts: string, cal: CaseCalendar): ExceptionQueueItem[] {
  const t = toMinutes(ts);
  const items: ExceptionQueueItem[] = [];
  for (const r of referrals) {
    if (r.duplicateOf) continue;
    const upTo = r.events.filter((e) => toMinutes(e.at) <= t);
    const flagged = upTo.find((e) => e.type === 'missing_info_flagged');
    if (!flagged || upTo.some((e) => e.type === 'copied_to_outreach')) continue;
    const actions = upTo.filter((e) => e.type !== 'work_start' && e.type !== 'work_end');
    const last = actions[actions.length - 1];
    items.push({
      id: r.id,
      clinicId: r.clinicId,
      flaggedAt: flagged.at,
      missing: r.missingFields,
      lastAction: last.detail,
      lastActionType: last.type,
      lastActionAt: last.at,
      businessDaysInQueue: businessDaysBetween(flagged.at, ts, cal),
    });
  }
  return items;
}
