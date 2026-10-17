import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { getNote } from '../state/gameState';
import { EvidenceCard } from '../components/Evidence';
import { ConnectionBoard } from '../components/Chrome';
import type { Evidence } from '../case/types';

type Filter = 'all' | 'pinned' | 'record' | 'reported' | 'analysis' | 'untagged';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: '📌 Pinned' },
  { id: 'record', label: 'Records' },
  { id: 'reported', label: 'Reported / interpretive' },
  { id: 'analysis', label: 'My analyses' },
  { id: 'untagged', label: 'Not yet tagged' },
];

export function EvidenceBoard() {
  const { c, state, update, go } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const found = c.evidence.filter((e) => state.discoveredEvidence.includes(e.id));
  const match = (e: Evidence) => {
    const n = getNote(state, e.id);
    switch (filter) {
      case 'pinned': return n.pinned;
      case 'record': return e.nature === 'observation' && e.kind !== 'analysis';
      case 'reported': return e.nature === 'reported';
      case 'analysis': return e.kind === 'analysis';
      case 'untagged': return n.tags.length === 0;
      default: return true;
    }
  };
  const shown = found.filter(match).sort((a, b) => Number(getNote(state, b.id).pinned) - Number(getNote(state, a.id).pinned) || a.id.localeCompare(b.id));
  const artifacts = c.evidence.filter((e) => e.kind !== 'analysis');
  const analyses = c.evidence.filter((e) => e.kind === 'analysis');
  const asked = state.askedQuestions.map((id) => c.questions.find((q) => q.id === id)!).filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Collect</div>
          <h1>Evidence Board</h1>
          <p>
            {found.filter((e) => e.kind !== 'analysis').length} of {artifacts.length} artifacts found · {found.filter((e) => e.kind === 'analysis').length} of {analyses.length} analyses run.
            Inspect cards to read them in full, pin what matters, tag what kind of evidence it is, and link it to hypotheses.
          </p>
        </div>
      </div>

      <div className="filters" role="group" aria-label="Filter evidence">
        {FILTERS.map((f) => (
          <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div className="board">
        {found.length === 0 ? (
          <div className="empty">
            <p><strong>Your board is empty.</strong> Evidence appears here as you examine locations, interview staff, and run analyses.</p>
            <button className="btn" onClick={() => go('map')}>Go to the Organization Map</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty"><p>No evidence matches this filter.</p></div>
        ) : (
          <div className="cards">{shown.map((e) => <EvidenceCard key={e.id} e={e} />)}</div>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: '1.4rem' }}>
        <section className="card">
          <h2>Connections</h2>
          <p className="small muted">Strings between your hypotheses and the evidence you linked to them.</p>
          <ConnectionBoard />
        </section>
        <section className="card">
          <h2>Notebook</h2>
          <label className="field" htmlFor="notebook">Free notes <span className="hint">— patterns, hunches, questions to chase</span></label>
          <textarea id="notebook" value={state.notebook} style={{ minHeight: 140 }} onChange={(e) => { const v = e.target.value; update((s) => ({ ...s, notebook: v })); }} />
          <details style={{ marginTop: '0.8rem' }}>
            <summary>Interview log ({asked.length} reported statements)</summary>
            {asked.length === 0 ? <p className="small muted">No interviews yet.</p> : (
              <ul className="small" style={{ paddingLeft: '1.1rem' }}>
                {asked.map((q) => {
                  const ch = c.characters.find((x) => x.id === q.characterId)!;
                  return <li key={q.id} style={{ marginBottom: '0.4rem' }}><strong>{ch.name}</strong> — <em>{q.text}</em><br />{q.answer.join(' ')}</li>;
                })}
              </ul>
            )}
          </details>
        </section>
      </div>
    </>
  );
}
