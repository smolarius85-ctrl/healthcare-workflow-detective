import type { Block, Evidence, Referral } from '../types';
import { calendar, clinics, eventTypeLabels, referrals } from './referrals';
import {
  computeAll, exceptionQueueAt, median, summarize, summarizeDuplicates, type GroupSummary, type ReferralMetrics,
} from '../../engine/metrics';
import { businessDaysBetween, formatTs, fromMinutes, isBusinessDay, toMinutes } from '../../engine/time';

/**
 * Evidence artifacts. Artifacts that describe system data (event log, exception
 * snapshot, call summary, duplicate sample, queue counts, analyses) are built
 * from the referral records so they cannot contradict them.
 */

const byId = (id: string): Referral => {
  const r = referrals.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown referral ${id}`);
  return r;
};
const clinicName = (id: string) => clinics.find((c) => c.id === id)?.short ?? id;

export const fmtPct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
export const fmtNum = (v: number | null, digits = 1) => (v === null ? '—' : v.toFixed(digits).replace(/\.0$/, ''));

const metrics = computeAll(referrals, calendar);

function summaryTable(groups: GroupSummary[], caption: string): Block {
  return {
    type: 'table',
    caption,
    headers: ['Group', 'Referrals', 'Met 3-day target', 'Median business days', 'Avg waiting (business h)', 'Avg touch (min)', 'Share of time waiting', 'Return events'],
    rows: groups.map((g) => [
      g.label,
      String(g.referrals),
      `${g.metTarget} of ${g.evaluable} (${fmtPct(g.targetRate)})`,
      fmtNum(g.medianBusinessDays),
      fmtNum(g.meanWaitingHours),
      fmtNum(g.meanTouchMin, 0),
      fmtPct(g.waitingShare),
      String(g.returns),
    ]),
  };
}

const originals = metrics.filter((m) => !m.isDuplicate);
const sampleNote: Block = {
  type: 'callout',
  text: `Calculated from ${originals.length} original referrals (duplicates excluded) submitted ${calendar.sampleStart} to ${calendar.sampleEnd}. Small sample: treat differences as signals to investigate, not proof.`,
};

/* ---------- builders for data-derived artifacts ---------- */

function eventLogBlocks(id: string): Block[] {
  const r = byId(id);
  return [
    { type: 'p', text: `ReferralTrack + OutreachBoard event export for ${r.id} (${clinicName(r.clinicId)}, ${r.intakeFormat}). Actors are role codes, not names.` },
    {
      type: 'table',
      headers: ['#', 'Time', 'Event', 'Actor', 'System', 'Detail'],
      rows: r.events.map((e) => [String(e.seq), formatTs(e.at), eventTypeLabels[e.type].label + (e.status ? ` → ${e.status}` : ''), e.actor, e.system, e.detail]),
    },
    { type: 'p', text: 'Full histories for every referral in the sample are in the Referral Timelines explorer.' },
  ];
}

const SNAPSHOT_AT = '2026-10-02 17:00';
function exceptionSnapshotBlocks(): Block[] {
  const items = exceptionQueueAt(referrals, SNAPSHOT_AT, calendar);
  return [
    { type: 'p', text: `Contents of the shared "Intake Exceptions" folder in ReferralTrack as of ${formatTs(SNAPSHOT_AT)}, exported by Systems & Reporting.` },
    {
      type: 'table',
      headers: ['Referral', 'Clinic', 'Flagged', 'Missing', 'Business days in folder', 'Last recorded action', 'Assigned to'],
      rows: items.map((i) => [i.id, clinicName(i.clinicId), formatTs(i.flaggedAt), i.missing.join(', '), String(i.businessDaysInQueue), `${eventTypeLabels[i.lastActionType].label} (${formatTs(i.lastActionAt)})`, '(blank)']),
    },
    { type: 'p', text: 'Status shown in the clinic view for every item above: Received.' },
  ];
}

function callSummaryBlocks(): Block[] {
  const calls: { at: string; r: Referral }[] = [];
  for (const r of referrals) for (const e of r.events) if (e.type === 'patient_inquiry') calls.push({ at: e.at, r });
  calls.sort((a, b) => toMinutes(a.at) - toMinutes(b.at));
  return [
    { type: 'p', text: `Referral-status calls logged by Patient Experience, ${calendar.sampleStart} to ${calendar.sampleEnd}. Patients are not identified; calls are linked by referral ID.` },
    {
      type: 'table',
      headers: ['Call time', 'Referral', 'Clinic', 'Business days since submission', 'Status shown to rep', 'Follow-up'],
      rows: calls.map(({ at, r }) => {
        const sub = r.events.find((e) => e.type === 'submitted')!;
        return [formatTs(at), r.id, clinicName(r.clinicId), String(businessDaysBetween(sub.at, at, calendar)), 'Received', 'Note sent to clinic front desk'];
      }),
    },
    { type: 'p', text: `Total referral-status calls: ${calls.length}. The log records only patients who called.` },
  ];
}

function duplicateSampleBlocks(): Block[] {
  const orig = byId('RF-2412');
  const dup = byId('RF-2413');
  const sub = (r: Referral) => r.events.find((e) => e.type === 'submitted')!.at;
  const inquiry = orig.events.find((e) => e.type === 'patient_inquiry')!;
  const statusAt = (r: Referral, ts: string) => {
    const s = r.events.filter((e) => e.status && toMinutes(e.at) <= toMinutes(ts));
    return s.length ? s[s.length - 1].status! : '—';
  };
  return [
    { type: 'p', text: 'Two ReferralTrack records matched on clinic record token and service.' },
    {
      type: 'table',
      headers: ['Field', orig.id + ' (original)', dup.id + ' (duplicate)'],
      rows: [
        ['Clinic / format', `${clinicName(orig.clinicId)} / ${orig.intakeFormat}`, `${clinicName(dup.clinicId)} / ${dup.intakeFormat}`],
        ['Submitted', formatTs(sub(orig)), formatTs(sub(dup))],
        ['Service', orig.service, dup.service],
        ['Missing at submission', orig.missingFields.join(', '), dup.missingFields.join(', ')],
        ['Status shown on ' + formatTs(sub(dup)), statusAt(orig, sub(dup)), '(new record)'],
      ],
    },
    { type: 'h', text: 'Between the two submissions' },
    { type: 'list', items: [`${formatTs(inquiry.at)} — ${inquiry.detail}`] },
    { type: 'p', text: 'Full histories for both records are in the Referral Timelines explorer.' },
  ];
}

function queueCountBlocks(): Block[] {
  const rows: string[][] = [];
  const start = toMinutes(`${calendar.sampleStart} 12:00`);
  const end = toMinutes(`${calendar.sampleEnd} 12:00`);
  for (let t = start; t <= end; t += 24 * 60) {
    if (!isBusinessDay(t, calendar)) continue;
    const ts = fromMinutes(t);
    let worklist = 0;
    for (const r of referrals) {
      if (r.duplicateOf) continue;
      const upTo = r.events.filter((e) => toMinutes(e.at) <= t);
      if (upTo.some((e) => e.type === 'copied_to_outreach') && !upTo.some((e) => e.type === 'outreach_attempt')) worklist++;
    }
    const exceptions = exceptionQueueAt(referrals, ts, calendar).length;
    rows.push([formatTs(ts).replace(', 12:00', ''), String(worklist), String(exceptions)]);
  }
  return [
    { type: 'p', text: 'Reconstructed from event logs: how many original referrals were waiting at 12:00 each business day.' },
    { type: 'table', headers: ['Business day (12:00)', 'OutreachBoard worklist (copied, not yet contacted)', 'Intake Exceptions folder (flagged, not yet copied)'], rows },
    { type: 'p', text: 'OutreachBoard cannot display the Intake Exceptions folder; outreach staff only see the first column.' },
  ];
}

/* ---------- analyses (unlocked from the timeline explorer) ---------- */

const complete = originals.filter((m) => !m.incomplete);
const incomplete = originals.filter((m) => m.incomplete);

function weekOf(m: ReferralMetrics): string {
  const d = toMinutes(m.submittedAt);
  const day = new Date(d * 60000).getUTCDay();
  const monday = d - ((day + 6) % 7) * 24 * 60;
  return fromMinutes(monday).slice(0, 10);
}
const weeks = [...new Set(originals.map(weekOf))].sort();
const staffingWeek = '2026-09-28';

function stageBlocks(): Block[] {
  const tot = originals.reduce(
    (a, m) => ({
      transmission: a.transmission + m.stages.transmission,
      intake: a.intake + m.stages.intake,
      exception: a.exception + m.stages.exception,
      outreachQueue: a.outreachQueue + m.stages.outreachQueue,
      touch: a.touch + m.touchMin,
      elapsed: a.elapsed + m.elapsedBusinessMin,
    }),
    { transmission: 0, intake: 0, exception: 0, outreachQueue: 0, touch: 0, elapsed: 0 },
  );
  const row = (label: string, v: number) => [label, fmtNum(v / 60), fmtPct(v / tot.elapsed)];
  return [
    { type: 'p', text: 'Total elapsed business hours across all original referrals, split by stage of the journey (submission → first outreach, or data cutoff if still open).' },
    {
      type: 'table',
      headers: ['Stage', 'Business hours', 'Share of elapsed time'],
      rows: [
        row('Transmission (submitted → record exists)', tot.transmission),
        row('Intake, normal path (record → copied to outreach)', tot.intake),
        row('Exception path (missing-info flag → copied to outreach)', tot.exception),
        row('Outreach worklist (copied → first attempt)', tot.outreachQueue),
      ],
    },
    {
      type: 'fields',
      items: [
        { label: 'Logged touch time (all stages)', value: `${fmtNum(tot.touch / 60)} business h (${fmtPct(tot.touch / tot.elapsed)})`, note: 'Only explicit work sessions count. Systems notes that sessions may be under-recorded.' },
        { label: 'Waiting time (elapsed − touch)', value: `${fmtNum((tot.elapsed - tot.touch) / 60)} business h (${fmtPct((tot.elapsed - tot.touch) / tot.elapsed)})` },
      ],
    },
    sampleNote,
  ];
}

function duplicateAnalysisBlocks(): Block[] {
  const d = summarizeDuplicates(metrics, referrals);
  const withDup = originals.filter((m) => m.hadDuplicate);
  const withoutDup = originals.filter((m) => !m.hadDuplicate);
  return [
    {
      type: 'fields',
      items: [
        { label: 'Duplicate records', value: String(d.duplicates) },
        { label: 'Originals that received a duplicate', value: String(d.originalsWithDuplicate) },
        { label: 'Duplicates preceded by a patient call about the original', value: `${d.inquiriesBeforeDuplicate} of ${d.duplicates}` },
        { label: 'Logged coordinator time spent on duplicate records', value: `${d.duplicateTouchMin} min` },
        { label: 'Originals with a duplicate that were incomplete', value: `${withDup.filter((m) => m.incomplete).length} of ${withDup.length}` },
      ],
    },
    summaryTable([summarize('Originals with a duplicate', withDup), summarize('Originals without a duplicate', withoutDup)], 'Originals compared'),
    sampleNote,
  ];
}

export const analysisBuilders = {
  completeness: (): Block[] => [summaryTable([summarize('Complete at submission', complete), summarize('Incomplete (missing-info flag)', incomplete)], 'Complete vs. incomplete referrals'), sampleNote],
  clinic: (): Block[] => [
    summaryTable(clinics.map((c) => summarize(c.short, originals.filter((m) => m.clinicId === c.id))), 'By clinic'),
    {
      type: 'table',
      caption: 'Incomplete referral rate by clinic',
      headers: ['Clinic', 'Intake format', 'Incomplete', 'Rate'],
      rows: clinics.map((c) => {
        const s = summarize(c.short, originals.filter((m) => m.clinicId === c.id));
        return [c.short, c.intakeFormat, `${s.incomplete} of ${s.referrals}`, fmtPct(s.incompleteRate)];
      }),
    },
    sampleNote,
  ],
  duplicates: duplicateAnalysisBlocks,
  stages: stageBlocks,
  week: (): Block[] => [
    summaryTable(
      weeks.map((wk) => summarize(`Week of ${formatTs(`${wk} 00:00`).replace(', 00:00', '')}${wk === staffingWeek ? ' (one coordinator on leave)' : ''}`, originals.filter((m) => weekOf(m) === wk))),
      'By week of submission',
    ),
    {
      type: 'table',
      caption: 'Complete referrals only, by week',
      headers: ['Week of', 'Complete referrals', 'Met target', 'Median business days'],
      rows: weeks.map((wk) => {
        const g = complete.filter((m) => weekOf(m) === wk);
        return [wk, String(g.length), `${g.filter((m) => m.metTarget).length} of ${g.filter((m) => m.metTarget !== null).length}`, fmtNum(median(g.filter((m) => m.reachedOutreach).map((m) => m.businessDays)))];
      }),
    },
    sampleNote,
  ],
};

/* ---------- the evidence catalogue ---------- */

export const evidence: Evidence[] = [
  {
    id: 'E-01', title: 'Referral Intake & Outreach SOP v3.2', source: 'Juniper policy binder · Official process document', kind: 'document', nature: 'observation',
    locationId: 'manager',
    preview: 'The documented process: standard form, one-day review, a "Ready" status, returns to clinic.',
    reliability: 'An official document shows the intended process. It may not match current practice.',
    body: [
      { type: 'fields', items: [{ label: 'Approved', value: 'March 2023' }, { label: 'Owner', value: 'Director of Operations' }, { label: 'Next review', value: 'March 2025' }] },
      { type: 'h', text: 'Procedure' },
      {
        type: 'list', items: [
          '1. Clinic completes the Juniper Standard Referral Form. Required administrative fields: service requested, ordering clinician, callback number, coverage plan ID.',
          '2. Clinic sends the form to the Referral Coordination Hub.',
          '3. A referral coordinator reviews the referral within 1 business day.',
          '4. If complete, the coordinator sets the status to Ready. The outreach team makes a first outreach attempt within 2 business days of Ready.',
          '5. If incomplete, the referral is returned to the submitting clinic. The Intake Lead monitors returned referrals.',
        ],
      },
      { type: 'h', text: 'Target' },
      { type: 'p', text: 'First outreach attempt within 3 business days of submission. (Internal Juniper target.)' },
    ],
  },
  {
    id: 'E-02', title: 'Riverbend intake form RB-2', source: 'Riverbend front desk · Paper form (faxed)', kind: 'form', nature: 'observation',
    locationId: 'frontdesk',
    preview: 'A paper form with a short callback line and a coverage line marked optional.',
    reliability: 'The blank form shows what the clinic is asked to collect, not what is actually filled in.',
    body: [
      { type: 'fields', items: [
        { label: 'Form revision', value: 'RB-2 (2019)' },
        { label: 'Patient record token', value: '__________' },
        { label: 'Service requested', value: '__________' },
        { label: 'Ordering clinician signature', value: '__________', note: 'No printed name line' },
        { label: 'Callback number', value: '______', note: '"if different from chart"' },
        { label: 'Coverage plan', value: '__________', note: 'Printed label: "(optional)"' },
        { label: 'Send to', value: 'Hub fax line' },
      ] },
    ],
  },
  {
    id: 'E-03', title: 'Northside portal e-form NS-E', source: 'Northside clinic portal · Screen capture', kind: 'form', nature: 'observation',
    locationId: 'frontdesk',
    preview: 'An electronic form with required-field markers and some validation.',
    reliability: 'Shows what the portal enforces. Validation rules are as configured at the time of capture.',
    body: [
      { type: 'fields', items: [
        { label: 'Service requested *', value: 'Drop-down list' },
        { label: 'Ordering clinician *', value: 'Auto-filled from login' },
        { label: 'Callback number *', value: 'Validated: 10 digits' },
        { label: 'Coverage plan ID *', value: 'Free text (any value accepted)' },
        { label: 'Submit', value: 'Creates a ReferralTrack record immediately' },
      ] },
      { type: 'p', text: '* = required before the form can be submitted.' },
    ],
  },
  {
    id: 'E-04', title: 'Eastgate email referral template EG-T', source: 'Eastgate front desk · Email template', kind: 'form', nature: 'observation',
    locationId: 'frontdesk',
    preview: 'A plain email template sent to the hub inbox. No required fields.',
    reliability: 'Shows the template; individual emails may differ from it.',
    body: [
      { type: 'fields', items: [
        { label: 'To', value: 'Hub shared inbox' },
        { label: 'Subject', value: 'Referral – [service]' },
        { label: 'Body', value: 'Record token: / Service: / Ordering clinician: / Contact: / Coverage: / Notes:' },
        { label: 'Validation', value: 'None' },
      ] },
      { type: 'p', text: 'Hub coordinators create the ReferralTrack record by hand from each email.' },
    ],
  },
  {
    id: 'E-05', title: 'Message thread: "Intake Exceptions — who\'s on it?"', source: 'Juniper internal chat · Message thread', kind: 'message', nature: 'reported',
    locationId: 'hub', unlockedBy: 'dev-owner',
    preview: 'Several people ask who sweeps the exceptions folder. No decision is recorded.',
    reliability: 'Messages capture what people said at the time. They show beliefs and concerns, not verified facts.',
    body: [
      { type: 'messages', items: [
        { from: 'Dev Okafor (Coordinator)', at: 'Tue Sep 8, 09:12', text: "With the intake lead role open, who's sweeping the Intake Exceptions folder? I'm working the ones I flag but I can't see who's covering the rest." },
        { from: 'Coordinator (RC-3)', at: 'Tue Sep 8, 09:40', text: 'I grab Riverbend ones when I notice them. Not sure about Eastgate.' },
        { from: 'Priya Natarajan (Clinic Manager)', at: 'Wed Sep 9, 14:05', text: 'Could someone at the hub own returns for my clinics? Front desk says they often never hear back.' },
        { from: 'Celeste Moreau (Director)', at: 'Wed Sep 9, 16:30', text: "Let's put it on the ops meeting agenda." },
        { from: 'Dev Okafor (Coordinator)', at: 'Wed Sep 23, 14:30', text: 'Two duplicates this week, both for referrals sitting in Exceptions. I think the clinics cannot tell when something is stuck.' },
        { from: 'Marisol Reyes (Front Desk)', at: 'Wed Sep 23, 15:02', text: 'From our side it just says Received. We assumed that meant it was moving.' },
      ] },
      { type: 'p', text: 'No further messages in the thread.' },
    ],
  },
  {
    id: 'E-06', title: 'ReferralTrack status glossary', source: 'Systems & Reporting · System documentation', kind: 'system', nature: 'observation',
    locationId: 'systems',
    preview: 'Official definitions of the three statuses and the missing-info flag.',
    reliability: 'Describes how the system is configured. Does not show how people interpret the statuses.',
    body: [
      { type: 'table', headers: ['Status', 'Set by', 'Definition', 'Clinic view color'], rows: [
        ['Received', 'System (automatic)', 'A referral record has been created.', 'Green'],
        ['In Review', 'Coordinator (manual)', 'A coordinator is reviewing the referral.', 'Blue'],
        ['Closed', 'Coordinator (manual)', 'Referral completed, cancelled, or closed as duplicate.', 'Gray'],
      ] },
      { type: 'fields', items: [
        { label: 'Missing-info flag', value: 'Checkbox. Does not change status. Not displayed in the clinic view.' },
        { label: 'Assigned to', value: 'Optional free-text field.' },
        { label: 'Glossary version', value: '2021' },
      ] },
    ],
  },
  {
    id: 'E-07', title: 'Referral event log: RF-2412', source: 'ReferralTrack / OutreachBoard export · System record', kind: 'system', nature: 'observation',
    locationId: 'systems',
    preview: 'Timestamped events for one Riverbend referral, from fax to first outreach.',
    reliability: 'System events show what was recorded and when. They do not record why something waited.',
    body: eventLogBlocks('RF-2412'),
  },
  {
    id: 'E-08', title: 'Intake Exceptions folder snapshot', source: 'ReferralTrack export · System record', kind: 'system', nature: 'observation',
    locationId: 'hub',
    preview: `What was sitting in the exceptions folder at ${formatTs(SNAPSHOT_AT)}.`,
    reliability: 'A point-in-time snapshot. Other days may look different.',
    body: exceptionSnapshotBlocks(),
  },
  {
    id: 'E-09', title: 'Hub staffing schedule', source: 'Hub roster · Schedule', kind: 'document', nature: 'observation',
    locationId: 'hub',
    preview: 'Who was scheduled each week of the sample, by role code.',
    reliability: 'Shows scheduled availability, not how time was actually spent.',
    body: [
      { type: 'table', headers: ['Role', 'Week of Sep 14', 'Week of Sep 21', 'Week of Sep 28', 'Week of Oct 5'], rows: [
        ['Referral coordinator RC-1', 'On', 'On', 'On', 'On'],
        ['Referral coordinator RC-2', 'On', 'On', 'On', 'On'],
        ['Referral coordinator RC-3', 'On', 'On', 'Leave (all week)', 'On'],
        ['Outreach specialist OS-1', 'On', 'On', 'On', 'On'],
        ['Outreach specialist OS-2', 'On', 'On', 'On', 'On'],
        ['Intake lead', 'Vacant', 'Vacant', 'Vacant', 'Vacant'],
      ] },
      { type: 'p', text: 'Coordinators also cover the hub inbox and phone line. The schedule does not show how their hours were divided.' },
    ],
  },
  {
    id: 'E-10', title: 'Patient Experience call summary', source: 'Patient Experience phone log · Call summary', kind: 'report', nature: 'observation',
    locationId: 'patientexp',
    preview: 'Every referral-status call logged during the sample, linked by referral ID.',
    reliability: 'Records calls that happened. Patients who did not call are not represented.',
    body: callSummaryBlocks(),
  },
  {
    id: 'E-11', title: 'Personal chase list (unofficial spreadsheet)', source: "Dev Okafor's drive · Unofficial spreadsheet", kind: 'spreadsheet', nature: 'reported',
    locationId: 'hub', unlockedBy: 'dev-example',
    preview: 'One coordinator’s private tracker for exceptions they are following up.',
    reliability: 'A personal workaround. Covers only what one person chose to track.',
    body: [
      { type: 'table', headers: ['Referral', 'Added', 'Missing', 'Chased on', 'Clinic replied', 'Note'], rows: [
        ['RF-2422', 'Sep 17', 'Callback number', 'Sep 23', 'Sep 24', 'Clinic re-sent it as a new email first'],
        ['RF-2404', 'Sep 22', 'Coverage plan ID', 'Sep 24', 'Sep 25', 'Portal let "N/A" through'],
        ['RF-2425', 'Sep 28', 'Coverage plan ID', 'Oct 1', 'Oct 2', 'Short week'],
        ['RF-2427', 'Oct 2', 'Callback number', '', '', 'TODO'],
      ] },
      { type: 'p', text: 'Sheet note: "Riverbend items — RC-1 keeps a separate list, I think."' },
    ],
  },
  {
    id: 'E-12', title: 'Front desk checklist: "Before you send a referral"', source: 'Riverbend front desk · Handoff checklist', kind: 'document', nature: 'observation',
    locationId: 'frontdesk', unlockedBy: 'marisol-example',
    preview: 'A laminated checklist taped next to the fax machine.',
    reliability: 'Shows what front desk staff are told to check. Its age and source matter.',
    body: [
      { type: 'list', items: [
        '☐ Patient record token',
        '☐ Service requested',
        '☐ Ordering clinician signature',
        '☐ Callback number (if different from chart)',
        '☐ Coverage plan (optional — hub can look it up)',
        '☐ Fax to hub and keep the confirmation',
      ] },
      { type: 'fields', items: [{ label: 'Last revised', value: 'March 2022' }, { label: 'Prepared by', value: 'Riverbend front desk team' }] },
    ],
  },
  {
    id: 'E-13', title: 'Sample duplicate referral: RF-2412 / RF-2413', source: 'ReferralTrack · System records', kind: 'system', nature: 'observation',
    locationId: 'systems', unlockedBy: 'tomas-example',
    preview: 'An original and its resubmission, side by side.',
    reliability: 'Records show what was submitted and when, not the reason for resubmitting.',
    body: duplicateSampleBlocks(),
  },
  {
    id: 'E-14', title: "Manager's weekly summary (week of Sep 21)", source: 'Priya Natarajan · Weekly summary to Operations', kind: 'report', nature: 'reported',
    locationId: 'manager',
    preview: '"The hub is understaffed." A manager’s view of the week.',
    reliability: 'A sincere interpretation by an experienced manager. Its conclusions are not themselves measurements.',
    body: [
      { type: 'fields', items: [
        { label: 'Patient calls about referral status (all clinics, from PX log)', value: '3 (RF-2412, RF-2422, RF-2404)' },
        { label: 'Front desk report', value: 'Riverbend staff re-faxing referrals when they cannot tell what is happening.' },
      ] },
      { type: 'p', text: '"My read: the hub is understaffed, especially with the intake lead role still open. I recommend a temporary additional coordinator until volumes settle."' },
      { type: 'p', text: '"Riverbend\'s fax form is overdue for an update, but that is a separate project."' },
    ],
  },
  {
    id: 'E-15', title: 'Daily queue counts: worklist vs. exceptions', source: 'Systems & Reporting · Report built from event logs', kind: 'system', nature: 'observation',
    locationId: 'systems', unlockedBy: 'tomas-check',
    preview: 'How many referrals waited on the outreach worklist vs. in the exceptions folder at noon each day.',
    reliability: 'Reconstructed from event timestamps. Daily snapshots can miss short-lived items.',
    body: queueCountBlocks(),
  },

  /* Analyses: observations calculated from event data, unlocked in the Referral Timelines. */
  {
    id: 'A-01', title: 'Analysis: complete vs. incomplete referrals', source: 'Referral Timelines · Your analysis of event data', kind: 'analysis', nature: 'observation',
    locationId: null, unlockedBy: 'completeness',
    preview: 'Target performance, waiting and touch time for complete vs. incomplete referrals.',
    reliability: 'Calculated from event records. Small sample; work sessions may be under-recorded.',
    body: analysisBuilders.completeness(),
  },
  {
    id: 'A-02', title: 'Analysis: comparison by clinic', source: 'Referral Timelines · Your analysis of event data', kind: 'analysis', nature: 'observation',
    locationId: null, unlockedBy: 'clinic',
    preview: 'Timing and incomplete-referral rates for Northside, Riverbend and Eastgate.',
    reliability: 'Calculated from event records. Six to seven referrals per clinic is a very small sample.',
    body: analysisBuilders.clinic(),
  },
  {
    id: 'A-03', title: 'Analysis: duplicates vs. originals', source: 'Referral Timelines · Your analysis of event data', kind: 'analysis', nature: 'observation',
    locationId: null, unlockedBy: 'duplicates',
    preview: 'How often duplicates appear, what preceded them, and the work they create.',
    reliability: 'Calculated from event records. The records do not capture why staff resubmitted.',
    body: analysisBuilders.duplicates(),
  },
  {
    id: 'A-04', title: 'Analysis: where the time goes', source: 'Referral Timelines · Your analysis of event data', kind: 'analysis', nature: 'observation',
    locationId: null, unlockedBy: 'stages',
    preview: 'Elapsed business time split by journey stage, and work vs. waiting.',
    reliability: 'Calculated from event records. Touch time is a floor because sessions may be under-recorded.',
    body: analysisBuilders.stages(),
  },
  {
    id: 'A-05', title: 'Analysis: comparison by week', source: 'Referral Timelines · Your analysis of event data', kind: 'analysis', nature: 'observation',
    locationId: null, unlockedBy: 'week',
    preview: 'Did the short-staffed week look different from the others?',
    reliability: 'Calculated from event records. Weekly groups contain only a handful of referrals.',
    body: analysisBuilders.week(),
  },
];

export const evidenceById = (id: string) => evidence.find((e) => e.id === id);
