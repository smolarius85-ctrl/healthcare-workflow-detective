import { useEffect, useState } from 'react';
import { useGame } from '../state/GameContext';
import { RUBRIC_LIMITS, scoreInvestigation } from '../engine/scoring';
import { EvidenceLink } from '../components/Evidence';
import { ConfirmDialog } from '../components/Modal';
import { buildFindings, downloadText, findingsToMarkdown } from '../engine/exporter';
import { DIMENSION_MODULE, moduleById } from '../content/curriculum';
import { visitStep } from '../engine/learning';

const SCREEN_LABEL: Record<string, string> = {
  map: 'Organization Map', evidence: 'Evidence Board', mapper: 'Process Mapper', timelines: 'Referral Timelines', hypotheses: 'Hypothesis Desk', recommend: 'Recommendation Workshop',
};

export function Debrief() {
  const { c, rubric, state, update, go } = useGame();
  const [confirmReveal, setConfirmReveal] = useState(false);
  const submitted = Boolean(state.submittedProposal);

  useEffect(() => {
    if (submitted && !state.debriefViewed) update((s) => ({ ...s, debriefViewed: true }));
  }, [submitted, state.debriefViewed, update]);

  if (!submitted) {
    return (
      <>
        <div className="page-head"><div><div className="eyebrow">Reflect</div><h1>Debrief</h1></div></div>
        <div className="card empty">
          <p style={{ fontSize: '2rem', margin: 0 }} aria-hidden="true">🗂️</p>
          <p><strong>Feedback appears after you submit a recommendation.</strong></p>
          <p className="small">Keep investigating as long as you like — there’s no timer. The case explanation stays sealed until you choose to finish.</p>
          <button className="btn" onClick={() => go('recommend')}>Go to the Recommendation Workshop</button>
        </div>
      </>
    );
  }

  const dims = scoreInvestigation(state, c, rubric);
  const ex = c.explanation;
  const findings = () => buildFindings(state, c, rubric);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1>Debrief</h1>
          <p>Feedback on five separate skills, based on what you did and submitted ({state.submittedAt}). Nothing here is a grade on you as a professional — it’s a mirror for your investigation habits.</p>
        </div>
      </div>

      <details className="card" style={{ marginBottom: '1.2rem' }}>
        <summary>What this feedback can and can’t judge</summary>
        <ul className="small">{RUBRIC_LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="small" style={{ margin: 0 }}>A simulated recommendation does not produce real operational savings. Any effects you predicted remain hypotheses until measured in a real pilot.</p>
      </details>

      <div className="grid-2">
        {dims.map((d) => (
          <section key={d.id} className="card dim-card" aria-labelledby={`dim-${d.id}`}>
            <div className="row">
              <h2 id={`dim-${d.id}`} style={{ margin: 0 }}>{d.title}</h2>
              <span className="spacer" />
              <span className={`chip ${d.level >= 2 ? 'ok' : 'gold'}`}>{d.levelLabel}</span>
            </div>
            <div className="meter" role="img" aria-label={`Level ${d.level + 1} of 4: ${d.levelLabel}`}>
              {[0, 1, 2, 3].map((i) => <span key={i} className={i <= d.level ? 'on' : ''} />)}
            </div>
            {(() => {
              const m = moduleById(DIMENSION_MODULE[d.id]);
              return m && (
                <button className="linklike small" style={{ marginBottom: '0.6rem' }}
                  onClick={() => { update((s) => visitStep(s, m.id, 2)); go('learn'); }}>
                  🎓 Strengthen this skill: Module {m.number} — {m.title}
                </button>
              );
            })()}
            {d.celebrations.length > 0 && (
              <div className="celebrate small">{d.celebrations.map((t) => <div key={t}>🌟 {t}</div>)}</div>
            )}
            <ul className="crit">
              {d.criteria.map((cr) => (
                <li key={cr.id} className={cr.met ? 'met' : 'unmet'}>
                  <span className="mark" aria-hidden="true">{cr.met ? '✓' : '○'}</span>
                  <div>
                    <div>{cr.label}<span className="sr-only">{cr.met ? ' — met' : ' — not yet'}</span></div>
                    {!cr.met && cr.suggestion && (
                      <div className="small muted" style={{ marginTop: '0.2rem' }}>
                        {cr.suggestion}
                        {cr.evidence && cr.evidence.length > 0 && <> {' '}Related: {cr.evidence.map((id) => <EvidenceLink key={id} id={id} />)}</>}
                        {cr.screen && <> {' '}<button className="linklike" onClick={() => go(cr.screen!)}>Go to {SCREEN_LABEL[cr.screen] ?? cr.screen}</button></>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="card" style={{ marginTop: '1.4rem' }}>
        <h2>Revise or finish</h2>
        <p>You can reopen the investigation and resubmit as many times as you like{state.revealed ? ', even after reading the explanation' : ''}.</p>
        <div className="row">
          <button className="btn secondary" onClick={() => go('recommend')}>Revise proposal</button>
          <button className="btn secondary" onClick={() => go('map')}>Reopen investigation</button>
          <button className="btn secondary" onClick={() => downloadText('investigation-report.md', findingsToMarkdown(findings()), 'text/markdown')}>Export report (Markdown)</button>
          <button className="btn secondary" onClick={() => go('report')}>Print-friendly report</button>
          {!state.revealed && <button className="btn coral" onClick={() => setConfirmReveal(true)}>Finish & reveal the case explanation</button>}
        </div>
      </section>

      {state.revealed && (
        <section className="card reveal" style={{ marginTop: '1.4rem' }} aria-labelledby="explanation">
          <div className="eyebrow">Case file — authored explanation</div>
          <h2 id="explanation">What was happening at Juniper</h2>
          <p style={{ fontSize: '1.08rem' }}>{ex.summary}</p>
          <h3>Interacting contributors</h3>
          <div className="grid-2">
            {ex.contributors.map((x) => (
              <div key={x.title} className="card flat" style={{ background: 'var(--cream-100)' }}>
                <h4>{x.title}</h4>
                <p className="small">{x.text}</p>
                <div className="row" style={{ gap: '0.3rem' }}>{x.evidence.map((id) => <EvidenceLink key={id} id={id} />)}</div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: '1.2rem' }}>Alternative explanations, examined</h3>
          <div className="grid-3">
            {ex.alternatives.map((x) => (
              <div key={x.title} className="card flat" style={{ background: 'var(--gold-100)' }}>
                <h4>{x.title}</h4>
                <p className="small">{x.text}</p>
                <div className="row" style={{ gap: '0.3rem' }}>{x.evidence.map((id) => <EvidenceLink key={id} id={id} />)}</div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: '1.2rem' }}>Genuinely unresolved</h3>
          <ul>{ex.unresolved.map((u) => <li key={u}>{u}</li>)}</ul>
          <p className="small muted">Evidence IDs you did not discover are shown but cannot be opened — you can reopen the investigation to find them.</p>
        </section>
      )}

      {confirmReveal && (
        <ConfirmDialog
          title="Reveal the case explanation?"
          confirmLabel="Reveal"
          message={<p>You’ll see the authored explanation of the case. You can still reopen the investigation and revise your proposal afterwards.</p>}
          onCancel={() => setConfirmReveal(false)}
          onConfirm={() => { setConfirmReveal(false); update((s) => ({ ...s, revealed: true })); }}
        />
      )}
    </>
  );
}
