import { useMemo, useState } from 'react';
import { useGame } from '../state/GameContext';
import { computeAll, summarize, summarizeDuplicates, type ReferralMetrics, type GroupSummary } from '../engine/metrics';
import { formatDuration, formatTs, toMinutes } from '../engine/time';
import { eventTypeLabels } from '../case/vanishing-referral/referrals';
import { BlockView } from '../components/Evidence';
import { Term } from '../components/Chrome';
import { fmtNum, fmtPct } from '../case/vanishing-referral/evidence';

const STAGES = [
  { id: 'transmission', label: 'Transmission' },
  { id: 'intake', label: 'Intake (normal path)' },
  { id: 'exception', label: 'Exception path' },
  { id: 'outreachQueue', label: 'Outreach worklist' },
] as const;

const COMPARISONS = [
  { id: 'completeness', label: 'Complete vs. incomplete', evidence: 'A-01', question: 'Do referrals missing information take longer?' },
  { id: 'clinic', label: 'By clinic', evidence: 'A-02', question: 'Does intake format or clinic matter?' },
  { id: 'duplicates', label: 'Duplicates vs. originals', evidence: 'A-03', question: 'When and why do duplicates appear?' },
  { id: 'stages', label: 'Where the time goes', evidence: 'A-04', question: 'Which stage holds the most elapsed time — and is it work or waiting?' },
  { id: 'week', label: 'By week (staffing)', evidence: 'A-05', question: 'Was the short-staffed week different?' },
] as const;

const METRIC_DEFS: Record<string, string> = {
  median: 'Business days from submission to the first outreach attempt, for referrals that reached outreach. The count starts from the submission’s business day (after-hours or weekend submissions start from the next business day). The median is the middle value, so a few extreme cases don’t dominate.',
  target: 'Share of original referrals whose first outreach attempt came within 3 business days (Juniper’s internal target). Referrals still open at the data cutoff count as missed once they pass 3 business days. Duplicates are excluded.',
  waiting: 'Elapsed business time (08:00–17:00, Mon–Fri) from submission to first outreach, minus logged touch time, averaged across referrals. It is time when nobody was recorded working on the referral — not necessarily idle staff.',
  touch: 'Sum of explicit work sessions (start/end pairs) before first outreach, averaged. Gaps between unrelated events are never counted as work. Treat as a floor: Systems notes that staff sometimes skip the session timer.',
  incomplete: 'Share of original referrals that received a missing-info flag before first outreach.',
  rework: 'Count of “returned to clinic” events (requests for missing or corrected information) before first outreach, plus duplicate records created by resubmission.',
};

function JourneyBar({ m, max }: { m: ReferralMetrics; max: number }) {
  const width = Math.max(4, (m.elapsedBusinessMin / max) * 100);
  if (m.isDuplicate) return <div className="journey-bar" title="Duplicate record" style={{ width: `${width}%`, background: '#cbbf9f' }} />;
  return (
    <div className="journey-bar" style={{ width: `${width}%` }} role="img"
      aria-label={STAGES.map((s) => `${s.label} ${formatDuration(m.stages[s.id])}`).join(', ')}>
      {STAGES.map((s) => m.stages[s.id] > 0 && <span key={s.id} className={`st-${s.id}`} style={{ width: `${(m.stages[s.id] / m.elapsedBusinessMin) * 100}%` }} />)}
    </div>
  );
}

function BarChart({ groups, title }: { groups: GroupSummary[]; title: string }) {
  const max = Math.max(4, ...groups.map((g) => g.medianBusinessDays ?? 0)) + 1;
  const rowH = 46;
  const W = 640;
  const left = 230;
  const sx = (v: number) => left + (v / max) * (W - left - 70);
  const H = groups.length * rowH + 50;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${groups.map((g) => `${g.label} ${fmtNum(g.medianBusinessDays)} days`).join('; ')}`}>
        <text x={0} y={16} fontSize="14" fontWeight="700" fill="#0f3b39">{title}</text>
        {groups.map((g, i) => {
          const y = 34 + i * rowH;
          const v = g.medianBusinessDays ?? 0;
          return (
            <g key={g.label}>
              <text x={0} y={y + 18} fontSize="13" fill="#1d2827">{g.label.length > 32 ? g.label.slice(0, 31) + '…' : g.label}</text>
              <rect x={left} y={y + 4} width={Math.max(2, sx(v) - left)} height={22} rx={5} fill={v > 3 ? '#e07a5f' : '#2a7f7a'}>
                <animate attributeName="width" from="0" to={Math.max(2, sx(v) - left)} dur="0.6s" fill="freeze" />
              </rect>
              <text x={sx(v) + 6} y={y + 20} fontSize="13" fontWeight="700" fill="#1d2827">{fmtNum(g.medianBusinessDays)} d · {fmtPct(g.targetRate)} met</text>
            </g>
          );
        })}
        <line x1={sx(3)} x2={sx(3)} y1={28} y2={H - 14} stroke="#d9a441" strokeWidth={2} strokeDasharray="5 4" />
        <text x={sx(3)} y={H - 2} fontSize="12" textAnchor="middle" fill="#8a6418">3-day target</text>
      </svg>
    </div>
  );
}

export function Timelines() {
  const { c, state, update, reveal } = useGame();
  const all = useMemo(() => computeAll(c.referrals, c.calendar), [c]);
  const [clinic, setClinic] = useState('all');
  const [completeness, setCompleteness] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [showDup, setShowDup] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [explain, setExplain] = useState<Record<string, boolean>>({});

  const filtered = all.filter((m) => (clinic === 'all' || m.clinicId === clinic)
    && (completeness === 'all' || (completeness === 'incomplete') === m.incomplete)
    && (showDup || !m.isDuplicate));
  const sum = summarize('Filtered', filtered);
  const dup = summarizeDuplicates(filtered, c.referrals);
  const max = Math.max(...all.map((m) => m.elapsedBusinessMin));
  const sel = all.find((m) => m.id === selected);
  const selRef = c.referrals.find((r) => r.id === selected);

  const openReferral = (id: string) => {
    setSelected(id);
    update((s) => (s.timeline.viewed.includes(id) ? s : { ...s, timeline: { ...s.timeline, viewed: [...s.timeline.viewed, id] } }));
    window.setTimeout(() => document.getElementById('journey-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  const toggleExplain = (id: string) => {
    setExplain((e) => ({ ...e, [id]: !e[id] }));
    update((s) => (s.timeline.metricsExplained.includes(id) ? s : { ...s, timeline: { ...s.timeline, metricsExplained: [...s.timeline.metricsExplained, id] } }));
  };
  const runComparison = (id: string) => {
    setComparison(id);
    const cmp = COMPARISONS.find((x) => x.id === id)!;
    update((s) => (s.timeline.comparisons.includes(id) ? s : { ...s, timeline: { ...s.timeline, comparisons: [...s.timeline.comparisons, id] } }));
    reveal([cmp.evidence]);
  };

  const originals = all.filter((m) => !m.isDuplicate);
  const groupsFor = (id: string): GroupSummary[] => {
    switch (id) {
      case 'completeness': return [summarize('Complete at submission', originals.filter((m) => !m.incomplete)), summarize('Incomplete (flagged)', originals.filter((m) => m.incomplete))];
      case 'clinic': return c.clinics.map((cl) => summarize(cl.short, originals.filter((m) => m.clinicId === cl.id)));
      case 'duplicates': return [summarize('Originals with a duplicate', originals.filter((m) => m.hadDuplicate)), summarize('Originals without', originals.filter((m) => !m.hadDuplicate))];
      case 'week': {
        const wk = (m: ReferralMetrics) => { const d = toMinutes(m.submittedAt); const day = new Date(d * 60000).getUTCDay(); return Math.floor((d - ((day + 6) % 7) * 1440) / 1440); };
        const weeks = [...new Set(originals.map(wk))].sort();
        return weeks.map((w, i) => summarize(`Week ${i + 1}${i === 2 ? ' (coordinator on leave)' : ''}`, originals.filter((m) => wk(m) === w)));
      }
      default: return [];
    }
  };
  const cmp = COMPARISONS.find((x) => x.id === comparison);
  const cmpEvidence = cmp && c.evidence.find((e) => e.id === cmp.evidence);

  const metric = (id: string, label: string, value: string, sub?: string) => (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="small muted">{sub}</div>}
      <button className="linklike small" aria-expanded={Boolean(explain[id])} onClick={() => toggleExplain(id)}>What does this measure mean?</button>
      {explain[id] && <div className="explain">{METRIC_DEFS[id]}</div>}
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Test</div>
          <h1>Referral Timelines</h1>
          <p>Event histories for {c.referrals.length} synthetic referral records ({originals.length} originals, {all.length - originals.length} duplicates). Every number on this page is calculated from these events. Records show <em>what</em> happened and when — not <em>why</em>.</p>
        </div>
      </div>

      <details className="card" style={{ marginBottom: '1rem' }}>
        <summary>How time is measured</summary>
        <div className="defs-bar" style={{ marginTop: '0.4rem' }}>
          <span><strong>Timezone:</strong> {c.calendar.timezoneLabel}</span>
          <span><strong><Term id="business-day">Business days</Term>:</strong> Mon–Fri, 08:00–17:00. No holidays fall in the sample.</span>
          <span><strong>Sample:</strong> submissions {c.calendar.sampleStart} to {c.calendar.sampleEnd}; data cutoff {formatTs(c.calendar.dataCutoff)}.</span>
        </div>
        <ul className="small" style={{ marginTop: '0.6rem' }}>
          <li>The measured journey runs from <strong>Submitted</strong> to the <strong>first outreach attempt</strong>. Events after that are shown greyed and never used in calculations.</li>
          <li>Weekends and time outside 08:00–17:00 are excluded from elapsed business time. A submission after 17:00 or on a weekend starts its business-day count the next business day.</li>
          <li><Term id="touch-time">Touch time</Term> counts only explicit work-session start/end pairs. Waiting time = elapsed business time − touch time.</li>
          <li>Referrals with no outreach by the cutoff are measured up to the cutoff and marked “open.”</li>
        </ul>
      </details>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <label className="field small" htmlFor="f-clinic">Clinic</label>
            <select id="f-clinic" value={clinic} onChange={(e) => setClinic(e.target.value)}>
              <option value="all">All clinics</option>
              {c.clinics.map((cl) => <option key={cl.id} value={cl.id}>{cl.name} — {cl.intakeFormat}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="field small" htmlFor="f-comp">Completeness</label>
            <select id="f-comp" value={completeness} onChange={(e) => setCompleteness(e.target.value as typeof completeness)}>
              <option value="all">All referrals</option>
              <option value="complete">Complete at submission</option>
              <option value="incomplete">Incomplete (missing-info flag)</option>
            </select>
          </div>
          <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', minHeight: 44 }}>
            <input type="checkbox" checked={showDup} onChange={(e) => setShowDup(e.target.checked)} /> Show duplicate records in list
          </label>
        </div>
      </div>

      <section aria-label="Metrics for the current filter" className="metric-grid" style={{ marginBottom: '1.4rem' }}>
        {metric('median', 'Median business days to first outreach', fmtNum(sum.medianBusinessDays), `${sum.reachedOutreach} reached outreach · ${sum.stillOpen} still open`)}
        {metric('target', 'Met the 3-business-day target', `${sum.metTarget} of ${sum.evaluable}`, fmtPct(sum.targetRate))}
        {metric('waiting', 'Average waiting time', `${fmtNum(sum.meanWaitingHours)} h`, `business hours · ${fmtPct(sum.waitingShare)} of elapsed time`)}
        {metric('touch', 'Average logged touch time', `${fmtNum(sum.meanTouchMin, 0)} min`, 'explicit work sessions only')}
        {metric('incomplete', 'Incomplete referral rate', fmtPct(sum.incompleteRate), `${sum.incomplete} of ${sum.referrals} originals`)}
        {metric('rework', 'Rework / return events', String(sum.returns + dup.duplicates), `${sum.returns} returns to clinic · ${dup.duplicates} duplicates`)}
      </section>

      <section className="card" style={{ marginBottom: '1.4rem' }}>
        <h2>Compare groups</h2>
        <p className="small muted">Each comparison answers one investigation question and is saved to your Evidence Board as an analysis you can cite.</p>
        <div className="compare-btns">
          {COMPARISONS.map((x) => (
            <button key={x.id} className="chip" aria-pressed={comparison === x.id} onClick={() => runComparison(x.id)}>
              {x.label}{state.timeline.comparisons.includes(x.id) ? ' ✓' : ''}
            </button>
          ))}
        </div>
        {cmp && cmpEvidence && (
          <div style={{ marginTop: '1rem' }} className="reveal">
            <h3>{cmp.question}</h3>
            {cmp.id === 'stages' ? (
              <StageChart metrics={originals} />
            ) : (
              <BarChart groups={groupsFor(cmp.id)} title="Median business days to first outreach (bar) · share meeting target" />
            )}
            <div className="doc" style={{ maxHeight: 'none', marginTop: '0.8rem' }}><BlockView blocks={cmpEvidence.body} /></div>
            <p className="small muted" style={{ marginTop: '0.5rem' }}>Saved as <strong>{cmpEvidence.id}</strong>. These are observations; deciding what <em>caused</em> them is up to you.</p>
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: '1.4rem' }}>
        <h2>Referral journeys</h2>
        <div className="legend" style={{ marginTop: 0, marginBottom: '0.6rem' }}>
          {STAGES.map((s) => <span key={s.id}><i className={`swatch st-${s.id}`} style={{ border: 'none' }} /> {s.label}</span>)}
          <span>Bar length = elapsed business time</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ref-table">
            <thead>
              <tr><th scope="col">Referral</th><th scope="col">Clinic</th><th scope="col">Flags</th><th scope="col" style={{ width: '32%' }}>Journey</th><th scope="col">Business days</th><th scope="col">Target</th><th scope="col"><span className="sr-only">Open</span></th></tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className={selected === m.id ? 'sel' : ''}>
                  <td className="mono"><strong>{m.id}</strong></td>
                  <td>{c.clinics.find((x) => x.id === m.clinicId)?.short}</td>
                  <td>
                    <div className="row" style={{ gap: '0.25rem' }}>
                      {m.isDuplicate && <span className="chip gold">Duplicate of {m.duplicateOf}</span>}
                      {!m.isDuplicate && m.incomplete && <span className="chip bad">Incomplete</span>}
                      {m.hadDuplicate && <span className="chip gold">Had duplicate</span>}
                      {!m.isDuplicate && !m.reachedOutreach && <span className="chip">Open at cutoff</span>}
                      {state.timeline.viewed.includes(m.id) && <span className="chip record" title="You inspected this journey">viewed</span>}
                    </div>
                  </td>
                  <td><JourneyBar m={m} max={max} /></td>
                  <td>{m.isDuplicate ? '—' : m.businessDays}</td>
                  <td>{m.metTarget === null ? '—' : m.metTarget ? <span className="chip ok">Met</span> : <span className="chip bad">Missed</span>}</td>
                  <td><button className="btn small secondary" onClick={() => openReferral(m.id)} aria-label={`Inspect journey ${m.id}`}>Inspect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sel && selRef && (
        <section id="journey-detail" className="card reveal" aria-label={`Journey ${sel.id}`}>
          <div className="row">
            <div>
              <div className="eyebrow">Journey</div>
              <h2 style={{ marginBottom: 0 }}>{sel.id} · {c.clinics.find((x) => x.id === sel.clinicId)?.name}</h2>
              <div className="muted small">{selRef.intakeFormat} · {selRef.service} · {selRef.missingFields.length ? `Missing at submission: ${selRef.missingFields.join(', ')}` : 'Complete at submission'}</div>
            </div>
            <span className="spacer" />
            <button className="btn small ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div>
              <h3>Events</h3>
              <ol className="event-list">
                {selRef.events.map((e) => {
                  const after = !sel.measuredEvents.includes(e);
                  const isEnd = sel.measuredEvents[sel.measuredEvents.length - 1] === e && !sel.isDuplicate && sel.reachedOutreach;
                  return (
                    <li key={e.seq} className={`t-${e.type}${after ? ' after' : ''}`}>
                      <div className="small muted">{formatTs(e.at)} · {e.system} · {e.actor}</div>
                      <div><strong title={eventTypeLabels[e.type].meaning}>{eventTypeLabels[e.type].label}</strong>{e.status ? ` → status “${e.status}”` : ''}</div>
                      {e.type !== 'work_start' && e.type !== 'work_end' && <div className="small">{e.detail}</div>}
                      {e.type === 'work_start' && <div className="small">{e.activity}</div>}
                      {isEnd && <div className="endline">◆ First outreach attempt — measured journey ends here</div>}
                    </li>
                  );
                })}
                {!sel.reachedOutreach && !sel.isDuplicate && <li className="endline">◆ Data cutoff ({formatTs(c.calendar.dataCutoff)}) — no outreach yet</li>}
              </ol>
            </div>
            <div className="stack">
              <h3>Calculated from these events</h3>
              <dl className="doc" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.3rem 1rem', margin: 0 }}>
                <dt><strong>Submitted</strong></dt><dd style={{ margin: 0 }}>{formatTs(sel.submittedAt)}</dd>
                <dt><strong>{sel.isDuplicate ? 'Closed as duplicate' : sel.reachedOutreach ? 'First outreach' : 'Measured to'}</strong></dt><dd style={{ margin: 0 }}>{formatTs(sel.endpointAt)}</dd>
                <dt><strong>Business days</strong></dt><dd style={{ margin: 0 }}>{sel.businessDays}{!sel.isDuplicate && ` (target ≤ ${c.calendar.targetBusinessDays})`}</dd>
                <dt><strong>Elapsed business time</strong></dt><dd style={{ margin: 0 }}>{formatDuration(sel.elapsedBusinessMin)}</dd>
                <dt><strong>Logged touch time</strong></dt><dd style={{ margin: 0 }}>{formatDuration(sel.touchMin)}</dd>
                <dt><strong>Waiting time</strong></dt><dd style={{ margin: 0 }}>{formatDuration(sel.waitingMin)} ({fmtPct(sel.elapsedBusinessMin ? sel.waitingMin / sel.elapsedBusinessMin : null)})</dd>
                <dt><strong>Returns to clinic</strong></dt><dd style={{ margin: 0 }}>{sel.returns}</dd>
                <dt><strong>Patient calls</strong></dt><dd style={{ margin: 0 }}>{sel.patientInquiries}</dd>
                {!sel.isDuplicate && STAGES.map((s) => (
                  <div key={s.id} style={{ display: 'contents' }}><dt>{s.label}</dt><dd style={{ margin: 0 }}>{formatDuration(sel.stages[s.id])}</dd></div>
                ))}
              </dl>
              <div className="callout teal small">
                <strong>Observed facts:</strong> the timestamps, statuses and work sessions above. <br />
                <strong>Not in the record:</strong> why time passed between events. Any explanation is a hypothesis to test against other evidence.
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function StageChart({ metrics }: { metrics: ReferralMetrics[] }) {
  const tot = STAGES.map((s) => ({ ...s, v: metrics.reduce((a, m) => a + m.stages[s.id], 0) }));
  const total = tot.reduce((a, s) => a + s.v, 0);
  const touch = metrics.reduce((a, m) => a + m.touchMin, 0);
  const W = 640;
  let x = 0;
  const colors: Record<string, string> = { transmission: '#9fb7c9', intake: '#2a7f7a', exception: '#e07a5f', outreachQueue: '#d9a441' };
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} 150`} role="img" aria-label={tot.map((s) => `${s.label} ${fmtPct(s.v / total)}`).join(', ')}>
        <text x={0} y={16} fontSize="14" fontWeight="700" fill="#0f3b39">Share of all elapsed business time, by stage</text>
        {tot.map((s) => {
          const w = (s.v / total) * W;
          const el = (
            <g key={s.id}>
              <rect x={x} y={28} width={w} height={34} fill={colors[s.id]} />
              {w > 60 && <text x={x + 6} y={50} fontSize="13" fontWeight="700" fill="#10201f">{fmtPct(s.v / total)}</text>}
            </g>
          );
          x += w;
          return el;
        })}
        <text x={0} y={92} fontSize="14" fontWeight="700" fill="#0f3b39">Work vs. waiting (all stages)</text>
        <rect x={0} y={102} width={W} height={26} fill="#eadbb8" />
        <rect x={0} y={102} width={Math.max(3, (touch / total) * W)} height={26} fill="#14524f" />
        <text x={Math.max(3, (touch / total) * W) + 8} y={120} fontSize="13" fill="#1d2827">logged work {fmtPct(touch / total)} · waiting {fmtPct(1 - touch / total)}</text>
      </svg>
    </div>
  );
}
