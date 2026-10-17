import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { linkEvidence, unlinkEvidence, type HypothesisState, type HypothesisStatus } from '../state/gameState';
import { ConnectionBoard } from '../components/Chrome';
import { ConfirmDialog } from '../components/Modal';

const STATUSES: { id: HypothesisStatus; label: string }[] = [
  { id: 'untested', label: 'Not yet tested' },
  { id: 'supported', label: 'Supported' },
  { id: 'weakened', label: 'Weakened' },
  { id: 'unresolved', label: 'Unresolved' },
];

function HypothesisCard({ h }: { h: HypothesisState }) {
  const { c, state, update, openEvidence } = useGame();
  const [pick, setPick] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const found = c.evidence.filter((e) => state.discoveredEvidence.includes(e.id));
  const patch = (p: Partial<HypothesisState>) => update((s) => ({ ...s, hypotheses: s.hypotheses.map((x) => (x.id === h.id ? { ...x, ...p } : x)) }));
  const title = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;

  const list = (ids: string[], side: string) => (
    <div className="ev-chiplist">
      {ids.length === 0 && <span className="small muted">None yet</span>}
      {ids.map((id) => (
        <span key={id} className="ev-chip">
          <button onClick={() => openEvidence(id)} title={title(id)}><strong>{id}</strong></button>
          <button className="x" aria-label={`Remove ${id} from ${side}`} onClick={() => update((s) => unlinkEvidence(s, h.id, id))}>✕</button>
        </span>
      ))}
    </div>
  );

  return (
    <article className={`card hyp-card s-${h.status}`}>
      <label className="sr-only" htmlFor={`ht-${h.id}`}>Hypothesis</label>
      <textarea id={`ht-${h.id}`} value={h.text} rows={2} style={{ minHeight: 56, fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--teal-900)' }}
        onChange={(e) => patch({ text: e.target.value })} />
      <div className="row" style={{ marginTop: '0.7rem' }}>
        <div className="seg" role="group" aria-label="Status">
          {STATUSES.map((s) => <button key={s.id} aria-pressed={h.status === s.id} onClick={() => patch({ status: s.id })}>{s.label}</button>)}
        </div>
        <span className="spacer" />
        <div className="row" style={{ gap: '0.4rem' }}>
          <span className="small" id={`conf-${h.id}`}>Confidence</span>
          <div className="conf" role="group" aria-labelledby={`conf-${h.id}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} aria-pressed={h.confidence === n} aria-label={`Confidence ${n} of 5`} onClick={() => patch({ confidence: h.confidence === n ? 0 : n })}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="ev-cols" style={{ marginTop: '0.9rem' }}>
        <div className="ev-col"><h4><span style={{ color: 'var(--teal-500)' }}>●</span> Supporting evidence</h4>{list(h.supporting, 'supporting')}</div>
        <div className="ev-col"><h4><span style={{ color: 'var(--coral-500)' }}>●</span> Contradicting evidence</h4>{list(h.contradicting, 'contradicting')}</div>
      </div>
      <div className="row" style={{ marginTop: '0.7rem', gap: '0.4rem' }}>
        <div style={{ flex: '1 1 260px' }}>
          <label className="sr-only" htmlFor={`pick-${h.id}`}>Evidence to link</label>
          <select id={`pick-${h.id}`} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{found.length ? 'Choose evidence to link…' : 'Discover evidence first'}</option>
            {found.map((e) => <option key={e.id} value={e.id}>{e.id} — {e.title}</option>)}
          </select>
        </div>
        <button className="btn small" disabled={!pick} onClick={() => { update((s) => linkEvidence(s, h.id, pick, 'supporting')); setPick(''); }}>Supports</button>
        <button className="btn small coral" disabled={!pick} onClick={() => { update((s) => linkEvidence(s, h.id, pick, 'contradicting')); setPick(''); }}>Contradicts</button>
      </div>
      <div style={{ marginTop: '0.8rem' }}>
        <label className="field small" htmlFor={`needs-${h.id}`}>What would I still need to know or check?</label>
        <textarea id={`needs-${h.id}`} value={h.needs} style={{ minHeight: 64 }} placeholder="Missing data, someone to ask, a comparison to run…" onChange={(e) => patch({ needs: e.target.value })} />
      </div>
      {h.custom && (
        <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
          <button className="btn small danger" onClick={() => setConfirmDelete(true)}>Delete hypothesis</button>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete this hypothesis?" danger confirmLabel="Delete" message={<p>“{h.text}” and its evidence links will be removed.</p>}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => update((s) => ({ ...s, hypotheses: s.hypotheses.filter((x) => x.id !== h.id) }))} />
      )}
    </article>
  );
}

export function HypothesisDesk() {
  const { state, update } = useGame();
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    const id = `H-custom-${Date.now().toString(36)}`;
    update((s) => ({ ...s, hypotheses: [...s.hypotheses, { id, text: draft.trim(), custom: true, status: 'untested', confidence: 0, supporting: [], contradicting: [], needs: '' }] }));
    setDraft('');
  };
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Hypothesize & test</div>
          <h1>Hypothesis Desk</h1>
          <p>Each hypothesis is a possible explanation, not a verdict. Link evidence for and against it, rate your confidence, and note what you’d still need to check. Changing your mind is part of the work.</p>
        </div>
      </div>
      <div className="stack">
        {state.hypotheses.map((h) => <HypothesisCard key={h.id} h={h} />)}
        <form className="card flat" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label className="field" htmlFor="new-h">Add your own hypothesis</label>
          <div className="row">
            <input id="new-h" type="text" style={{ flex: 1 }} value={draft} placeholder="e.g. Fax scan batches delay Riverbend referrals" onChange={(e) => setDraft(e.target.value)} />
            <button className="btn" type="submit" disabled={!draft.trim()}>Add</button>
          </div>
        </form>
        <section className="card">
          <h2>Connection board</h2>
          <ConnectionBoard />
        </section>
      </div>
    </>
  );
}
