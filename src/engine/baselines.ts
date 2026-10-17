import type { CaseDefinition } from '../case/types';
import { computeAll, exceptionQueueAt, median, summarize, summarizeDuplicates } from './metrics';
import { businessDaysBetween } from './time';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

/** Baseline values for each measure option, calculated from the sample data. */
export function computeBaselines(c: CaseDefinition): Record<string, string> {
  const ms = computeAll(c.referrals, c.calendar);
  const originals = ms.filter((m) => !m.isDuplicate);
  const all = summarize('All', originals);
  const dups = summarizeDuplicates(ms, c.referrals);

  const exceptionDays: number[] = [];
  for (const m of originals) {
    if (!m.incomplete || !m.reachedOutreach) continue;
    const flag = m.measuredEvents.find((e) => e.type === 'missing_info_flagged')!;
    const copied = m.measuredEvents.find((e) => e.type === 'copied_to_outreach')!;
    exceptionDays.push(businessDaysBetween(flag.at, copied.at, c.calendar));
  }
  const snapshot = exceptionQueueAt(c.referrals, '2026-10-02 17:00', c.calendar);
  const byClinic = c.clinics
    .map((cl) => {
      const s = summarize(cl.short, originals.filter((m) => m.clinicId === cl.id));
      return `${cl.short} ${pct(s.incompleteRate)}`;
    })
    .join(', ');
  const calls = c.referrals.flatMap((r) => r.events).filter((e) => e.type === 'patient_inquiry').length;

  return {
    'm-target-rate': `${all.metTarget} of ${all.evaluable} (${pct(all.targetRate)})`,
    'm-median-days': `${all.medianBusinessDays ?? '—'} business days (referrals reaching outreach)`,
    'm-exception-days': `median ${median(exceptionDays) ?? '—'} business days (${exceptionDays.length} completed exception paths)`,
    'm-owner-assigned': `0 of ${snapshot.length} in the Oct 2 snapshot had an assignee`,
    'm-incomplete-rate': byClinic,
    'm-duplicates': `${dups.duplicates} in 4 weeks`,
    'm-patient-calls': `${calls} in 4 weeks`,
    'm-touch-time': `${Math.round(all.meanTouchMin ?? 0)} min average logged (likely a floor)`,
    'm-frontdesk-time': 'Not measured today',
    'm-status-use': 'No such statuses exist yet',
  };
}
