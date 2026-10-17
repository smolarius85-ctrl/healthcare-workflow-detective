import { useMemo, type ReactNode } from 'react';
import { useGame } from '../state/GameContext';
import type { Proposal } from '../state/gameState';
import { computeBaselines } from '../engine/baselines';
import { Term } from '../components/Chrome';

type TextKey = 'problem' | 'change' | 'benefit' | 'risks' | 'pilotScope' | 'people' | 'measuresNote' | 'unresolved';

export function proposalChecklist(p: Proposal) {
  const t = (s: string, n: number) => s.trim().length >= n;
  return [
    { id: 'actions', label: 'At least one action chosen', ok: p.actions.length > 0 },
    { id: 'problem', label: 'Problem statement', ok: t(p.problem, 20) },
    { id: 'evidence', label: 'Supporting evidence cited', ok: p.evidence.length > 0 },
    { id: 'change', label: 'Proposed change', ok: t(p.change, 20) },
    { id: 'benefit', label: 'Expected benefit (as a prediction)', ok: t(p.benefit, 20) },
    { id: 'risks', label: 'Risks and tradeoffs', ok: t(p.risks, 20) },
    { id: 'pilot', label: 'Pilot scope', ok: Boolean(p.pilotClinic) || t(p.pilotScope, 10) },
    { id: 'people', label: 'Affected people & training', ok: t(p.people, 20) },
    { id: 'measures', label: 'Measures of success', ok: p.measures.length > 0 },
    { id: 'unresolved', label: 'Unresolved questions', ok: t(p.unresolved, 15) },
  ];
}

export function Recommendation() {
  const { c, state, update, go } = useGame();
  const p = state.proposal;
  const baselines = useMemo(() => computeBaselines(c), [c]);
  const found = c.evidence.filter((e) => state.discoveredEvidence.includes(e.id));
  const checks = proposalChecklist(p);
  const ready = checks.every((x) => x.ok);
  const changedSinceSubmit = state.submittedProposal && JSON.stringify(state.submittedProposal) !== JSON.stringify(p);

  const set = (patch: Partial<Proposal>) => update((s) => ({ ...s, proposal: { ...s.proposal, ...patch } }));
  const toggle = (key: 'actions' | 'evidence' | 'measures', id: string) =>
    set({ [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] } as Partial<Proposal>);
  const submit = () => {
    update((s) => ({ ...s, submittedProposal: JSON.parse(JSON.stringify(s.proposal)), submittedAt: new Date().toLocaleString(), screen: 'debrief' }));
    window.scrollTo({ top: 0 });
  };

  const text = (key: TextKey, label: ReactNode, hint: string, rows = 4) => (
    <div>
      <label className="field" htmlFor={`p-${key}`}>{label} <span className="hint">— {hint}</span></label>
      <textarea id={`p-${key}`} rows={rows} value={p[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<Proposal>)} />
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Recommend</div>
          <h1>Recommendation Workshop</h1>
          <p>Assemble a proposal Celeste could act on. There is no single correct redesign — strong proposals are grounded in evidence, small enough to pilot, measurable, and honest about tradeoffs.</p>
        </div>
      </div>
      <div className="rec-layout">
        <div className="stack">
          <section className="card">
            <h2>1. What would you change?</h2>
            <p className="small muted">Pick a focused set. You can explain and combine them in your own words below.</p>
            <div className="option-grid">
              {c.recommendationOptions.map((o) => (
                <label key={o.id} className="option">
                  <input type="checkbox" checked={p.actions.includes(o.id)} onChange={() => toggle('actions', o.id)} />
                  <span><strong>{o.label}</strong><span className="small muted">{o.description}</span></span>
                </label>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2>2. Make the case</h2>
            {text('problem', 'Problem statement', 'what is happening, where, and for whom (not the solution)')}
            <div>
              <span className="field" id="ev-cite">Supporting evidence <span className="hint">— cite by ID</span></span>
              {found.length === 0 ? <p className="small muted">You haven’t collected any evidence yet.</p> : (
                <div className="row" style={{ gap: '0.35rem' }} role="group" aria-labelledby="ev-cite">
                  {found.map((e) => (
                    <button key={e.id} type="button" className="chip" aria-pressed={p.evidence.includes(e.id)} title={e.title} onClick={() => toggle('evidence', e.id)}>{e.id}</button>
                  ))}
                </div>
              )}
            </div>
            {text('change', 'Proposed change', 'what would be different, concretely')}
            {text('benefit', <>Expected benefit <span className="prediction-label">PREDICTION</span></>, 'what you expect to improve, and by roughly how much; this is a hypothesis until measured')}
            {text('risks', 'Risks and tradeoffs', 'who does more work, what could go wrong, what you give up')}
          </section>

          <section className="card stack">
            <h2>3. Plan the <Term id="pilot">pilot</Term></h2>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 220 }}>
                <label className="field" htmlFor="p-clinic">Pilot site</label>
                <select id="p-clinic" value={p.pilotClinic} onChange={(e) => set({ pilotClinic: e.target.value })}>
                  <option value="">Choose…</option>
                  {c.clinics.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                  <option value="ALL">All clinics at once</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>{text('pilotScope', 'Scope & duration', 'what is included, for how long, and what would make you stop or expand', 3)}</div>
            </div>
            {text('people', 'Affected people and training needs', 'who does something differently, and what they need (job aid, walkthrough, UAT)')}
          </section>

          <section className="card stack">
            <h2>4. Measures of success</h2>
            <p className="small muted">Baselines below are calculated from the sample data. Consider pairing an outcome measure with a <Term id="balancing-measure">balancing</Term> and an <Term id="adoption-measure">adoption</Term> measure.</p>
            <div className="option-grid">
              {c.measureOptions.map((m) => (
                <label key={m.id} className="option">
                  <input type="checkbox" checked={p.measures.includes(m.id)} onChange={() => toggle('measures', m.id)} />
                  <span>
                    <strong>{m.label}</strong>
                    <span className="chip" style={{ margin: '0.2rem 0' }}>{m.kind}</span>
                    <span className="small muted" style={{ display: 'block' }}>{m.description}</span>
                    <span className="small" style={{ display: 'block' }}><Term id="baseline">Baseline</Term>: {baselines[m.id]}</span>
                  </span>
                </label>
              ))}
            </div>
            {text('measuresNote', 'Notes on measurement', 'targets, how often you would check, data caveats', 3)}
          </section>

          <section className="card">
            <h2>5. What remains unresolved?</h2>
            {text('unresolved', 'Unresolved questions', 'what you could not confirm, and how you would find out')}
          </section>
        </div>

        <aside className="card sticky" aria-label="Proposal readiness">
          <h3>Proposal checklist</h3>
          <ul className="checklist">
            {checks.map((x) => (
              <li key={x.id} className={x.ok ? 'ok' : ''}><span className="tick" aria-hidden="true">{x.ok ? '✓' : ''}</span>{x.label}<span className="sr-only">{x.ok ? ' — complete' : ' — not yet'}</span></li>
            ))}
          </ul>
          <button className="btn coral" style={{ width: '100%', marginTop: '1rem' }} disabled={!ready} onClick={submit}>
            {state.submittedProposal ? 'Resubmit for feedback' : 'Submit for feedback'}
          </button>
          {!ready && <p className="small muted" style={{ marginTop: '0.5rem' }}>Complete each part to submit. Short answers are fine.</p>}
          {state.submittedProposal && (
            <p className="small" style={{ marginTop: '0.6rem' }}>
              Submitted {state.submittedAt}.{changedSinceSubmit ? ' You have unsubmitted edits.' : ''}{' '}
              <button className="linklike" onClick={() => go('debrief')}>View debrief</button>
            </p>
          )}
          <p className="small muted" style={{ marginTop: '0.8rem' }}>Your draft saves automatically. Feedback is rule-based and explains what it can and can’t judge.</p>
        </aside>
      </div>
    </>
  );
}
