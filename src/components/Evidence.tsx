import { useState, type CSSProperties } from 'react';
import type { Block, Evidence, EvidenceTag } from '../case/types';
import { useGame } from '../state/GameContext';
import { getNote, linkEvidence, updateNote } from '../state/gameState';
import { Modal } from './Modal';

export const TAG_LABELS: Record<EvidenceTag, string> = {
  observation: 'Observation',
  reported: 'Reported statement',
  hypothesis: 'Hypothesis',
  question: 'Open question',
};

export const KIND_ICON: Record<Evidence['kind'], string> = {
  document: '📄', form: '📝', message: '💬', system: '🖥️', spreadsheet: '📊', report: '📋', analysis: '🔎',
};

export function NatureChip({ e }: { e: Evidence }) {
  return e.nature === 'reported'
    ? <span className="chip reported" title="What someone says or believes — useful, but not automatically a fact">Reported / interpretive</span>
    : <span className="chip record" title="A document, form or system record">Record</span>;
}

export function BlockView({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'p': return <p key={i}>{b.text}</p>;
          case 'h': return <h4 key={i}>{b.text}</h4>;
          case 'callout': return <p key={i} className="callout teal small">{b.text}</p>;
          case 'list': return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
          case 'fields': return (
            <dl key={i} className="fields">
              {b.items.map((f, j) => (
                <div key={j} style={{ display: 'contents' }}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}{f.note && <span className="muted small"> — {f.note}</span>}</dd>
                </div>
              ))}
            </dl>
          );
          case 'messages': return (
            <div key={i}>
              {b.items.map((m, j) => (
                <div key={j} className="msg">
                  <div><span className="from">{m.from}</span> <span className="muted small">· {m.at}</span></div>
                  <div>{m.text}</div>
                </div>
              ))}
            </div>
          );
          case 'table': return (
            <div key={i} style={{ overflowX: 'auto' }}>
              <table>
                {b.caption && <caption>{b.caption}</caption>}
                <thead><tr>{b.headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((cell, k) => <td key={k}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
      })}
    </>
  );
}

/** Small clickable reference to an evidence item by ID. */
export function EvidenceLink({ id }: { id: string }) {
  const { c, state, openEvidence } = useGame();
  const e = c.evidence.find((x) => x.id === id);
  const found = state.discoveredEvidence.includes(id);
  if (!e) return <span className="mono">{id}</span>;
  return (
    <button className="evid-link" onClick={() => found && openEvidence(id)} title={found ? e.title : 'Not yet discovered'} aria-label={`${id}: ${found ? e.title : 'not yet discovered'}`} disabled={!found}>
      {id}
    </button>
  );
}

const tilt = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 7) - 3) * 0.45;
};

export function EvidenceCard({ e }: { e: Evidence }) {
  const { state, update, openEvidence } = useGame();
  const note = getNote(state, e.id);
  return (
    <article className={`ev-card kind-${e.kind}${note.pinned ? ' pinned' : ''}`} style={{ '--tilt': `${tilt(e.id)}deg` } as CSSProperties} aria-label={`${e.id} ${e.title}`}>
      <span className="pin" aria-hidden="true" />
      <div className="row" style={{ gap: '0.4rem' }}>
        <span className="ev-id">{e.id}</span>
        <span aria-hidden="true">{KIND_ICON[e.kind]}</span>
        <span className="spacer" />
        <NatureChip e={e} />
      </div>
      <h3>{e.title}</h3>
      <div className="source">{e.source}</div>
      <p className="preview">{e.preview}</p>
      {(note.tags.length > 0 || note.note) && (
        <div className="row" style={{ gap: '0.3rem' }}>
          {note.tags.map((t) => <span key={t} className="chip gold">{TAG_LABELS[t]}</span>)}
          {note.note && <span className="chip" title={note.note}>✎ note</span>}
        </div>
      )}
      <div className="actions">
        <button className="btn small" onClick={() => openEvidence(e.id)}>Inspect</button>
        <button className="btn small secondary" aria-pressed={note.pinned} onClick={() => update((s) => updateNote(s, e.id, { pinned: !note.pinned }))}>
          {note.pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    </article>
  );
}

export function EvidenceInspector() {
  const { c, state, update, inspecting, openEvidence, notify } = useGame();
  const [hyp, setHyp] = useState('');
  const e = c.evidence.find((x) => x.id === inspecting);
  if (!e) return null;
  const note = getNote(state, e.id);
  const toggleTag = (t: EvidenceTag) =>
    update((s) => updateNote(s, e.id, { tags: note.tags.includes(t) ? note.tags.filter((x) => x !== t) : [...note.tags, t] }));
  const link = (side: 'supporting' | 'contradicting') => {
    if (!hyp) return;
    update((s) => linkEvidence(s, hyp, e.id, side));
    const h = state.hypotheses.find((x) => x.id === hyp);
    notify(`Linked ${e.id}`, `${side === 'supporting' ? 'Supports' : 'Contradicts'}: “${h?.text}”`);
  };
  const linkedTo = state.hypotheses.filter((h) => h.supporting.includes(e.id) || h.contradicting.includes(e.id));

  return (
    <Modal title={`${e.id} ${e.title}`} onClose={() => openEvidence(null)}>
      <div className="row" style={{ gap: '0.5rem', marginBottom: '0.3rem' }}>
        <span className="ev-id">{e.id}</span>
        <NatureChip e={e} />
        <span className="muted small">{e.source}</span>
      </div>
      <h2 style={{ paddingRight: '2.5rem' }}>{e.title}</h2>
      <div className="inspector">
        <div>
          <div className="doc"><BlockView blocks={e.body} /></div>
          <p className="small muted" style={{ marginTop: '0.6rem' }}><strong>About this source:</strong> {e.reliability}</p>
        </div>
        <div className="stack">
          <button className="btn secondary" aria-pressed={note.pinned} onClick={() => update((s) => updateNote(s, e.id, { pinned: !note.pinned }))}>
            {note.pinned ? '📌 Pinned — unpin' : '📌 Pin to board'}
          </button>
          <div>
            <div className="field" id={`tags-${e.id}`} style={{ fontWeight: 700, color: 'var(--teal-900)' }}>How would you classify it?</div>
            <div className="tag-toggles" role="group" aria-labelledby={`tags-${e.id}`}>
              {(Object.keys(TAG_LABELS) as EvidenceTag[]).map((t) => (
                <button key={t} className="chip" aria-pressed={note.tags.includes(t)} onClick={() => toggleTag(t)}>{TAG_LABELS[t]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="field" htmlFor={`note-${e.id}`}>Your notes</label>
            <textarea id={`note-${e.id}`} value={note.note} placeholder="What does this show? What doesn't it show?"
              onChange={(ev) => { const v = ev.target.value; update((s) => updateNote(s, e.id, { note: v })); }} />
          </div>
          <div>
            <label className="field" htmlFor={`hyp-${e.id}`}>Link to a hypothesis</label>
            <select id={`hyp-${e.id}`} value={hyp} onChange={(ev) => setHyp(ev.target.value)}>
              <option value="">Choose a hypothesis…</option>
              {state.hypotheses.map((h) => <option key={h.id} value={h.id}>{h.text}</option>)}
            </select>
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <button className="btn small" disabled={!hyp} onClick={() => link('supporting')}>Supports</button>
              <button className="btn small coral" disabled={!hyp} onClick={() => link('contradicting')}>Contradicts</button>
            </div>
            {linkedTo.length > 0 && (
              <ul className="small" style={{ paddingLeft: '1.1rem', marginTop: '0.6rem' }}>
                {linkedTo.map((h) => <li key={h.id}>{h.supporting.includes(e.id) ? 'Supports' : 'Contradicts'}: {h.text}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
