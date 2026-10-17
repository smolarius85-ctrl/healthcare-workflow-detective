import { useEffect, useRef, useState, type ReactNode } from 'react';
import { glossary } from '../content/glossary';
import { useGame } from '../state/GameContext';
import { nextHint, progressTrail } from '../engine/guidance';

/* ---------------- Glossary ---------------- */

export function Term({ id, children }: { id: string; children: ReactNode }) {
  const { openGlossary } = useGame();
  return <button type="button" className="term" onClick={() => openGlossary(id)} title="Open in glossary">{children}</button>;
}

export function GlossaryDrawer() {
  const { glossary: g, closeGlossary } = useGame();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!g.open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input')?.focus();
    if (g.focus) document.getElementById(`gloss-${g.focus}`)?.scrollIntoView({ block: 'center' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeGlossary();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [g.open, g.focus, closeGlossary]);
  if (!g.open) return null;
  const items = glossary.filter((x) => !q || `${x.term} ${x.plain}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className="drawer" ref={ref} role="dialog" aria-modal="false" aria-label="Glossary">
      <div className="row">
        <h2 style={{ margin: 0 }}>Glossary</h2>
        <span className="spacer" />
        <button className="btn ghost small" onClick={closeGlossary} aria-label="Close glossary">✕</button>
      </div>
      <p className="muted small">Plain-language definitions. Open any time — it never affects your feedback.</p>
      <label className="sr-only" htmlFor="gloss-search">Search glossary</label>
      <input id="gloss-search" type="text" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} />
      {items.map((x) => (
        <div key={x.id} id={`gloss-${x.id}`} className={`gloss-entry${g.focus === x.id ? ' active' : ''}`}>
          <h3 style={{ marginBottom: '0.2rem' }}>{x.term}</h3>
          <p style={{ marginBottom: '0.3rem' }}>{x.plain}</p>
          <p className="small muted" style={{ margin: 0 }}><em>In this case:</em> {x.example}</p>
        </div>
      ))}
    </aside>
  );
}

/* ---------------- Nudge ---------------- */

export function NudgeButton() {
  const { c, state, update } = useGame();
  const [hint, setHint] = useState<{ text: string; level: number } | null>(null);
  useEffect(() => setHint(null), [state.screen]);
  const ask = () => {
    const h = nextHint(state, c);
    update(() => h.state);
    setHint({ text: h.text, level: h.level });
  };
  if (!state.started || state.screen === 'report' || state.screen === 'learn') return null;
  return (
    <div className="nudge no-print">
      {hint && (
        <div className="nudge-panel" role="status" aria-live="polite">
          <div className="row" style={{ marginBottom: '0.3rem' }}>
            <div className="nudge-level" aria-label={`Hint level ${hint.level + 1} of 3`}>
              {[0, 1, 2].map((i) => <span key={i} className={i <= hint.level ? 'on' : ''} />)}
            </div>
            <span className="spacer" />
            <button className="btn ghost small" onClick={() => setHint(null)} aria-label="Dismiss hint">✕</button>
          </div>
          <p style={{ marginBottom: '0.5rem' }}>{hint.text}</p>
          <p className="small muted" style={{ margin: 0 }}>
            {hint.level < 2 ? 'Ask again for a more specific lead.' : 'That’s the most specific lead for this step.'} Hints never affect your feedback.
          </p>
        </div>
      )}
      <button className="btn coral" onClick={ask}>🧭 I’m stuck. Give me a nudge.</button>
    </div>
  );
}

/* ---------------- Progress trail ---------------- */

export function ProgressTrail() {
  const { c, state, go } = useGame();
  const steps = progressTrail(state, c);
  const next = steps.find((s) => !s.done);
  return (
    <nav className="trail no-print" aria-label="Investigation progress">
      {steps.map((s, i) => (
        <span key={s.id} style={{ display: 'contents' }}>
          {i > 0 && <span className="trail-sep" aria-hidden="true" />}
          <button className={`trail-step${s.done ? ' done' : ''}${next?.id === s.id ? ' next' : ''}`} onClick={() => go(s.screen)}
            aria-label={`${s.label}: ${s.done ? 'done' : 'not yet'}${next?.id === s.id ? ' (suggested next)' : ''}`}>
            <span className="bead" aria-hidden="true">{s.done ? '✓' : ''}</span>
            {s.label}
          </button>
        </span>
      ))}
      {next && <span className="trail-suggest small">Suggested next: <strong>{next.suggestion}</strong></span>}
    </nav>
  );
}

/* ---------------- Toasts ---------------- */

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="spark" aria-hidden="true">✦</span>
          <div><strong>{t.title}</strong>{t.body && <div className="small">{t.body}</div>}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Connection strings (hypothesis ↔ evidence) ---------------- */

export function ConnectionBoard() {
  const { c, state, openEvidence } = useGame();
  const hyps = state.hypotheses.filter((h) => h.supporting.length + h.contradicting.length > 0);
  if (!hyps.length) {
    return <p className="muted">No connections yet. Link evidence to a hypothesis (from an evidence card or the Hypothesis Desk) and the strings will appear here.</p>;
  }
  const evIds = [...new Set(hyps.flatMap((h) => [...h.supporting, ...h.contradicting]))].sort();
  const W = 1000;
  const hW = Math.min(220, (W - 40) / hyps.length - 16);
  const hx = (i: number) => 20 + i * ((W - 40) / hyps.length) + ((W - 40) / hyps.length - hW) / 2;
  const eW = Math.min(90, (W - 40) / evIds.length - 8);
  const ex = (i: number) => 20 + i * ((W - 40) / evIds.length) + ((W - 40) / evIds.length - eW) / 2;
  const H = 300;
  const wrap = (t: string) => {
    const words = t.split(' ');
    const lines: string[] = [];
    let cur = '';
    const max = Math.max(14, Math.floor(hW / 7.4));
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.slice(0, 4);
  };
  return (
    <div className="strings">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Connection board: ${hyps.length} hypotheses linked to ${evIds.length} evidence items`}>
        {hyps.map((h, i) =>
          [...h.supporting.map((id) => ({ id, sup: true })), ...h.contradicting.map((id) => ({ id, sup: false }))].map(({ id, sup }) => {
            const x1 = hx(i) + hW / 2;
            const j = evIds.indexOf(id);
            const x2 = ex(j) + eW / 2;
            return <path key={`${h.id}-${id}`} className={`string-line ${sup ? 'sup' : 'con'}`} pathLength={sup ? 1 : undefined} d={`M${x1},96 C${x1},170 ${x2},150 ${x2},226`} />;
          }),
        )}
        {hyps.map((h, i) => (
          <g key={h.id}>
            <rect className="h-box" x={hx(i)} y={14} width={hW} height={82} rx={10} />
            {wrap(h.text).map((line, k) => <text key={k} x={hx(i) + 10} y={36 + k * 17} fontSize="14" fill="#0f3b39" fontWeight="600">{line}</text>)}
            <circle cx={hx(i) + hW / 2} cy={96} r={5} fill="#d9a441" />
          </g>
        ))}
        {evIds.map((id, j) => {
          const e = c.evidence.find((x) => x.id === id);
          return (
            <g key={id} style={{ cursor: 'pointer' }} onClick={() => openEvidence(id)}>
              <circle cx={ex(j) + eW / 2} cy={226} r={6} fill="#e07a5f" />
              <rect x={ex(j)} y={236} width={eW} height={34} rx={6} fill="#fff7d9" stroke="#d9a441" />
              <text x={ex(j) + eW / 2} y={258} textAnchor="middle" fontSize="14" fontWeight="800" fill="#a4462d">{id}</text>
              <title>{e?.title}</title>
            </g>
          );
        })}
        <g fontSize="13" fill="#4b5957">
          <line x1={20} y1={290} x2={50} y2={290} stroke="#2a7f7a" strokeWidth={3} />
          <text x={56} y={294}>supports</text>
          <line x1={140} y1={290} x2={170} y2={290} stroke="#e07a5f" strokeWidth={3} strokeDasharray="8 6" />
          <text x={176} y={294}>contradicts</text>
        </g>
      </svg>
    </div>
  );
}
