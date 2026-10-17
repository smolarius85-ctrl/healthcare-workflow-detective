import { useGame } from '../state/GameContext';
import { buildFindings } from '../engine/exporter';

export function Report() {
  const { c, rubric, state, go } = useGame();
  const f = buildFindings(state, c, rubric);
  const r = f.recommendation;
  const evTitle = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;
  const ids = (list: string[]) => (list.length ? list.map((id) => `${id} (${evTitle(id)})`).join('; ') : '—');
  const para = (t: string) => (t.trim() ? <p style={{ whiteSpace: 'pre-wrap' }}>{t}</p> : <p className="muted">Not written yet.</p>);

  return (
    <>
      <div className="row no-print" style={{ marginBottom: '1rem' }}>
        <button className="btn secondary" onClick={() => go('debrief')}>← Back</button>
        <span className="spacer" />
        <button className="btn" onClick={() => window.print()}>🖨 Print / save as PDF</button>
      </div>
      <article className="report">
        <p className="fiction">{f.label}</p>
        <h1>{f.case.title}</h1>
        <p className="muted">Investigation report · {f.case.organization} (fictional) · Notebook: {f.notebook} · {new Date(f.exportedAt).toLocaleString()}</p>

        <h2>Process map summary</h2>
        <h3>Observed workflow</h3>
        <pre>{f.processMaps.observedSummary.join('\n')}</pre>
        <h3>Documented workflow (per SOP)</h3>
        <pre>{f.processMaps.documentedSummary.join('\n')}</pre>

        <h2>Evidence-linked hypotheses</h2>
        {f.hypotheses.map((h) => (
          <div key={h.id} style={{ marginBottom: '0.8rem' }}>
            <h3 style={{ marginBottom: '0.2rem' }}>{h.text}</h3>
            <div className="small"><strong>Status:</strong> {h.status}{h.confidence ? ` · confidence ${h.confidence}/5` : ''}</div>
            <div className="small"><strong>Supporting:</strong> {ids(h.supporting)}</div>
            <div className="small"><strong>Contradicting:</strong> {ids(h.contradicting)}</div>
            <div className="small"><strong>Still need to know:</strong> {h.needs.trim() || '—'}</div>
          </div>
        ))}

        <h2>Recommendation</h2>
        {!r ? <p className="muted">No recommendation drafted yet.</p> : (
          <>
            <p className="small">{r.submittedAt ? `Submitted ${r.submittedAt}` : 'Draft — not yet submitted'}</p>
            <p><strong>Actions:</strong> {r.actions.join('; ') || '—'}</p>
            <h3>Problem statement</h3>{para(r.problemStatement)}
            <h3>Supporting evidence</h3><p>{ids(r.supportingEvidence)}</p>
            <h3>Proposed change</h3>{para(r.proposedChange)}
            <h3>Expected benefit — a prediction, not a result</h3>{para(r.expectedBenefitPrediction)}
            <h3>Risks and tradeoffs</h3>{para(r.risksAndTradeoffs)}
            <h3>Pilot scope</h3>{para(r.pilotScope)}
            <h3>Affected people and training</h3>{para(r.affectedPeopleAndTraining)}
            <h3>Proposed measures</h3>
            {r.measures.length ? <ul>{r.measures.map((m) => <li key={m.id}><strong>{m.label}</strong> ({m.kind}) — baseline: {m.baseline}</li>)}</ul> : <p>—</p>}
            {r.measuresNote.trim() && para(r.measuresNote)}
            <h3>Open questions</h3>{para(r.unresolvedQuestions)}
          </>
        )}

        <h2>Pinned evidence and notes</h2>
        <ul>
          {f.evidence.filter((e) => e.pinned || e.note.trim() || e.tags.length).map((e) => (
            <li key={e.id}><strong>{e.id} — {e.title}</strong>{e.tags.length ? ` [${e.tags.join(', ')}]` : ''}{e.note.trim() ? `: ${e.note.trim()}` : ''}</li>
          ))}
        </ul>
        {f.notebookNotes.trim() && (<><h3>Notebook notes</h3>{para(f.notebookNotes)}</>)}
        <p className="fiction" style={{ marginTop: '2rem' }}>{f.label}</p>
      </article>
    </>
  );
}
