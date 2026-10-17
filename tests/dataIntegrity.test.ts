import { describe, expect, it } from 'vitest';
import { vanishingReferral as c } from '../src/case/vanishing-referral';
import { isWithinBusinessHours, toMinutes } from '../src/engine/time';
import { currentHintTopic } from '../src/engine/guidance';
import { initialState } from '../src/state/gameState';

const evidenceIds = new Set(c.evidence.map((e) => e.id));
const referralIds = new Set(c.referrals.map((r) => r.id));

describe('case data integrity', () => {
  it('has unique, stable evidence IDs and at least 12 artifacts', () => {
    expect(evidenceIds.size).toBe(c.evidence.length);
    expect(c.evidence.filter((e) => e.kind !== 'analysis').length).toBeGreaterThanOrEqual(12);
    for (const e of c.evidence) expect(e.id).toMatch(/^(E|A)-\d{2}$/);
  });

  it('every evidence ID referenced anywhere exists', () => {
    const refs: string[] = [];
    c.questions.forEach((q) => refs.push(...(q.unlocksEvidence ?? [])));
    c.explanation.contributors.forEach((x) => refs.push(...x.evidence));
    c.explanation.alternatives.forEach((x) => refs.push(...x.evidence));
    const text = JSON.stringify([c.hintTopics, c.explanation]);
    refs.push(...(text.match(/\b[EA]-\d{2}\b/g) ?? []));
    for (const id of refs) expect(evidenceIds.has(id), id).toBe(true);
  });

  it('every referral ID mentioned in content exists', () => {
    const text = JSON.stringify([c.evidence, c.questions, c.explanation, c.hintTopics]);
    for (const id of text.match(/RF-\d{4}/g) ?? []) expect(referralIds.has(id), id).toBe(true);
  });

  it('unlock conditions point at real questions or comparisons', () => {
    const comparisons = ['completeness', 'clinic', 'duplicates', 'stages', 'week'];
    for (const e of c.evidence) {
      if (!e.unlockedBy) continue;
      const ok = c.questions.some((q) => q.id === e.unlockedBy && q.unlocksEvidence?.includes(e.id)) || comparisons.includes(e.unlockedBy);
      expect(ok, `${e.id} unlockedBy ${e.unlockedBy}`).toBe(true);
    }
    for (const q of c.questions) {
      for (const r of q.requires ?? []) expect(c.questions.some((x) => x.id === r), r).toBe(true);
      expect(c.characters.some((ch) => ch.id === q.characterId)).toBe(true);
    }
  });

  it('has about 24 referrals across three clinics with synthetic IDs', () => {
    expect(c.referrals.length).toBe(24);
    expect(new Set(c.referrals.map((r) => r.clinicId)).size).toBe(3);
    for (const r of c.referrals) expect(r.id).toMatch(/^RF-\d{4}$/);
  });

  it('event histories are chronologically consistent', () => {
    for (const r of c.referrals) {
      const ev = r.events;
      expect(ev[0].type, r.id).toBe('submitted');
      ev.forEach((e, i) => {
        expect(e.seq).toBe(i + 1);
        if (i > 0) expect(toMinutes(e.at), `${r.id} #${e.seq}`).toBeGreaterThanOrEqual(toMinutes(ev[i - 1].at));
      });
      const idx = (t: string) => ev.findIndex((e) => e.type === t);
      expect(idx('received'), r.id).toBeGreaterThan(0);
      if (idx('missing_info_flagged') >= 0) expect(idx('missing_info_flagged')).toBeGreaterThan(idx('received'));
      if (idx('copied_to_outreach') >= 0) expect(idx('copied_to_outreach')).toBeGreaterThan(idx('received'));
      if (idx('outreach_attempt') >= 0) expect(idx('outreach_attempt')).toBeGreaterThan(idx('copied_to_outreach'));
      if (idx('info_received') >= 0) expect(idx('info_received')).toBeGreaterThan(idx('returned_to_clinic'));
      if (r.duplicateOf) {
        expect(referralIds.has(r.duplicateOf)).toBe(true);
        expect(idx('merged')).toBeGreaterThan(idx('duplicate_flagged'));
        expect(idx('outreach_attempt')).toBe(-1);
      }
      expect(r.missingFields.length > 0 || r.duplicateOf !== undefined || idx('missing_info_flagged') === -1).toBe(true);
      if (!r.duplicateOf) expect(r.missingFields.length > 0).toBe(idx('missing_info_flagged') >= 0);
    }
  });

  it('work sessions are explicit, paired, inside business hours, and never overlap per actor', () => {
    const sessions: { actor: string; s: number; e: number; id: string }[] = [];
    for (const r of c.referrals) {
      const starts = r.events.filter((e) => e.type === 'work_start');
      const ends = r.events.filter((e) => e.type === 'work_end');
      expect(starts.length).toBe(ends.length);
      for (const st of starts) {
        const en = ends.find((x) => x.sessionId === st.sessionId)!;
        expect(en, st.sessionId).toBeDefined();
        expect(en.actor).toBe(st.actor);
        expect(toMinutes(en.at)).toBeGreaterThan(toMinutes(st.at));
        expect(isWithinBusinessHours(st.at, c.calendar), st.sessionId).toBe(true);
        expect(isWithinBusinessHours(en.at, c.calendar), st.sessionId).toBe(true);
        sessions.push({ actor: st.actor, s: toMinutes(st.at), e: toMinutes(en.at), id: st.sessionId! });
      }
    }
    for (const a of sessions) for (const b of sessions) {
      if (a === b || a.actor !== b.actor) continue;
      expect(a.e <= b.s || b.e <= a.s, `${a.id} overlaps ${b.id}`).toBe(true);
    }
  });

  it('respects the staffing schedule: RC-3 has no work the week of Sep 28', () => {
    for (const r of c.referrals) for (const e of r.events) {
      if (e.actor === 'RC-3' && e.at >= '2026-09-28' && e.at < '2026-10-03') throw new Error(`${r.id} RC-3 during leave`);
    }
  });

  it('all events fall inside the sample window and before the data cutoff', () => {
    for (const r of c.referrals) for (const e of r.events) {
      expect(e.at >= c.calendar.sampleStart).toBe(true);
      expect(toMinutes(e.at)).toBeLessThanOrEqual(toMinutes(c.calendar.dataCutoff));
    }
  });

  it('the case explanation is not referenced by in-game hints or coaching text', () => {
    const summary = c.explanation.summary.slice(0, 40);
    const text = JSON.stringify([c.hintTopics, c.questions.map((q) => q.coaching)]);
    expect(text.includes(summary)).toBe(false);
  });

  it('a fresh state starts with a hint that points to the map', () => {
    expect(currentHintTopic(initialState(c), c)).toBe('start');
  });
});
