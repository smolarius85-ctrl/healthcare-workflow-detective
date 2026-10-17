import { describe, expect, it } from 'vitest';
import { vanishingReferral as c } from '../src/case/vanishing-referral';
import { businessDaysBetween, businessMinutesBetween, effectiveBusinessDate, fromMinutes } from '../src/engine/time';
import { computeAll, computeReferralMetrics, exceptionQueueAt, summarize, touchMinutes } from '../src/engine/metrics';
import type { Referral } from '../src/case/types';

const cal = c.calendar;
const ref = (id: string) => c.referrals.find((r) => r.id === id)!;
const m = (id: string) => computeReferralMetrics(ref(id), c.referrals, cal);

describe('business time', () => {
  it('counts only business hours', () => {
    // Mon 09:10 → Tue 09:20 = 470 + 80
    expect(businessMinutesBetween('2026-09-14 09:10', '2026-09-15 09:20', cal)).toBe(550);
    // Fri 16:00 → Mon 09:00 = 60 + 60, weekend excluded
    expect(businessMinutesBetween('2026-09-18 16:00', '2026-09-21 09:00', cal)).toBe(120);
    // Entirely outside hours
    expect(businessMinutesBetween('2026-09-19 10:00', '2026-09-20 10:00', cal)).toBe(0);
  });

  it('starts the business-day count from the next business day after close or on weekends', () => {
    expect(fromMinutes(effectiveBusinessDate('2026-09-18 16:40', cal)).slice(0, 10)).toBe('2026-09-18');
    expect(fromMinutes(effectiveBusinessDate('2026-09-18 17:30', cal)).slice(0, 10)).toBe('2026-09-21');
    expect(fromMinutes(effectiveBusinessDate('2026-09-19 10:00', cal)).slice(0, 10)).toBe('2026-09-21');
  });

  it('counts business days, skipping weekends', () => {
    expect(businessDaysBetween('2026-09-14 09:00', '2026-09-14 15:00', cal)).toBe(0);
    expect(businessDaysBetween('2026-09-18 10:00', '2026-09-21 10:00', cal)).toBe(1);
    expect(businessDaysBetween('2026-09-15 10:15', '2026-09-24 11:00', cal)).toBe(7);
  });
});

describe('referral metrics (hand-checked)', () => {
  it('RF-2401: complete Northside referral', () => {
    const x = m('RF-2401');
    expect(x.firstOutreachAt).toBe('2026-09-15 09:20');
    expect(x.businessDays).toBe(1);
    expect(x.metTarget).toBe(true);
    expect(x.elapsedBusinessMin).toBe(550);
    expect(x.touchMin).toBe(25);
    expect(x.waitingMin).toBe(525);
    expect(x.incomplete).toBe(false);
  });

  it('RF-2412: incomplete Riverbend referral with a duplicate', () => {
    const x = m('RF-2412');
    expect(x.incomplete).toBe(true);
    expect(x.hadDuplicate).toBe(true);
    expect(x.businessDays).toBe(7);
    expect(x.metTarget).toBe(false);
    expect(x.touchMin).toBe(20 + 15 + 15 + 12);
    expect(x.returns).toBe(1);
    expect(x.patientInquiries).toBe(1);
    // Stages add up to elapsed time
    const s = x.stages;
    expect(s.transmission + s.intake + s.exception + s.outreachQueue).toBe(x.elapsedBusinessMin);
    // transmission: Tue 10:15 → 15:00 = 285 min
    expect(s.transmission).toBe(285);
    // outreach queue: Thu 09:47 → 11:00 = 73 min
    expect(s.outreachQueue).toBe(73);
  });

  it('RF-2415: two returns (rework)', () => {
    expect(m('RF-2415').returns).toBe(2);
  });

  it('still-open referrals are measured to the cutoff and count as missed once past target', () => {
    const x = m('RF-2416');
    expect(x.reachedOutreach).toBe(false);
    expect(x.endpointAt).toBe(cal.dataCutoff);
    expect(x.metTarget).toBe(false);
  });

  it('duplicates are excluded from target measures', () => {
    const x = m('RF-2413');
    expect(x.isDuplicate).toBe(true);
    expect(x.metTarget).toBeNull();
  });

  it('stage breakdown always sums to elapsed time and waiting is never negative', () => {
    for (const x of computeAll(c.referrals, cal)) {
      if (x.isDuplicate) continue;
      const s = x.stages;
      expect(s.transmission + s.intake + s.exception + s.outreachQueue, x.id).toBe(x.elapsedBusinessMin);
      expect(x.waitingMin).toBeGreaterThanOrEqual(0);
      expect(x.touchMin).toBeLessThanOrEqual(x.elapsedBusinessMin);
    }
  });
});

describe('no leakage past first outreach', () => {
  it('ignores events after the first outreach attempt', () => {
    const base = ref('RF-2401');
    const before = computeReferralMetrics(base, c.referrals, cal);
    const extra: Referral = {
      ...base,
      events: [
        ...base.events,
        { seq: 99, at: '2026-09-16 11:00', type: 'work_start', actor: 'OS-1', system: 'OutreachBoard', detail: 'later', sessionId: 'X' },
        { seq: 100, at: '2026-09-16 13:00', type: 'work_end', actor: 'OS-1', system: 'OutreachBoard', detail: 'later', sessionId: 'X' },
        { seq: 101, at: '2026-09-17 09:00', type: 'returned_to_clinic', actor: 'RC-1', system: 'Fax/Scan', detail: 'later' },
        { seq: 102, at: '2026-09-17 10:00', type: 'patient_inquiry', actor: 'PX desk', system: 'Phone log', detail: 'later' },
      ],
    };
    const after = computeReferralMetrics(extra, c.referrals, cal);
    expect(after.touchMin).toBe(before.touchMin);
    expect(after.returns).toBe(before.returns);
    expect(after.patientInquiries).toBe(before.patientInquiries);
    expect(after.elapsedBusinessMin).toBe(before.elapsedBusinessMin);
    expect(after.measuredEvents.every((e) => e.at <= before.endpointAt)).toBe(true);
  });

  it('RF-2414 post-outreach correction note is excluded from measured events', () => {
    const x = m('RF-2414');
    expect(x.measuredEvents.some((e) => e.type === 'note')).toBe(false);
  });

  it('touch time clips work sessions to the measured window', () => {
    const ev = ref('RF-2401').events;
    expect(touchMinutes(ev, '2026-09-14 10:35', '2026-09-14 13:05')).toBe(10 + 5);
  });
});

describe('summaries match the records', () => {
  const all = computeAll(c.referrals, cal);
  const s = summarize('All', all);

  it('counts originals only', () => {
    expect(s.referrals).toBe(c.referrals.filter((r) => !r.duplicateOf).length);
  });

  it('target rate is recomputable from raw events', () => {
    let met = 0;
    let evaluable = 0;
    for (const r of c.referrals.filter((x) => !x.duplicateOf)) {
      const sub = r.events.find((e) => e.type === 'submitted')!.at;
      const out = r.events.find((e) => e.type === 'outreach_attempt');
      const end = out ? out.at : cal.dataCutoff;
      const days = businessDaysBetween(sub, end, cal);
      if (out) { evaluable++; if (days <= 3) met++; } else if (days > 3) evaluable++;
    }
    expect(s.metTarget).toBe(met);
    expect(s.evaluable).toBe(evaluable);
  });

  it('incomplete rate equals the share of originals with a missing-info flag', () => {
    const flagged = c.referrals.filter((r) => !r.duplicateOf && r.events.some((e) => e.type === 'missing_info_flagged')).length;
    expect(s.incomplete).toBe(flagged);
  });

  it('complete referrals meet the target more often than incomplete ones', () => {
    const complete = summarize('c', all.filter((x) => !x.incomplete));
    const incomplete = summarize('i', all.filter((x) => x.incomplete));
    expect(complete.targetRate!).toBeGreaterThan(incomplete.targetRate!);
  });

  it('exception queue snapshot is reconstructed from events', () => {
    const items = exceptionQueueAt(c.referrals, '2026-10-02 17:00', cal).map((i) => i.id).sort();
    expect(items).toEqual(['RF-2416', 'RF-2425', 'RF-2427']);
  });
});
