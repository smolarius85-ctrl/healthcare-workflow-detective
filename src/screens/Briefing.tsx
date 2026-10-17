import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { Avatar } from '../components/Avatar';
import { Term } from '../components/Chrome';

export function Briefing() {
  const { c, state, update, go } = useGame();
  const [name, setName] = useState(state.notebookName);
  const director = c.characters.find((x) => x.id === c.briefing.directorId)!;
  const start = (screen: 'learn' | 'map') => {
    update((s) => ({ ...s, notebookName: name.trim() || 'Case Notebook', started: true, screen, learning: { ...s.learning, activeModule: null } }));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="briefing">
      <section className="letter" aria-labelledby="brief-title">
        <div className="eyebrow">Case briefing · {c.orgName}</div>
        <h1 id="brief-title">{c.title}</h1>
        <p className="muted">{c.orgBlurb}</p>
        <blockquote>“{c.briefing.directorMessage}”</blockquote>
        <div className="signature">
          <Avatar spec={director.avatar} name={director.name} size={64} />
          <div>
            <strong>{director.name}</strong>
            <div className="muted small">{director.role}</div>
          </div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '1.4rem 0' }} />
        <h2>Your assignment, Workflow Detective</h2>
        <ul>
          {c.briefing.boundary.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <div className="callout" style={{ marginTop: '1rem' }}>
          <strong>The target:</strong> {c.briefing.target} <Term id="business-day">What counts as a business day?</Term>
        </div>
      </section>

      <aside className="stack">
        <div className="card">
          <svg className="hero-illustration" viewBox="0 0 400 190" aria-hidden="true">
            <rect width="400" height="190" rx="16" fill="#dcefeb" />
            <rect x="24" y="30" width="110" height="130" rx="8" fill="#fffdf8" transform="rotate(-4 79 95)" />
            <rect x="150" y="22" width="110" height="130" rx="8" fill="#fff7d9" transform="rotate(3 205 87)" />
            <rect x="272" y="36" width="104" height="124" rx="8" fill="#fffdf8" transform="rotate(-2 324 98)" />
            <circle cx="79" cy="36" r="7" fill="#e07a5f" /><circle cx="205" cy="26" r="7" fill="#d9a441" /><circle cx="324" cy="40" r="7" fill="#e07a5f" />
            <path d="M79 40 C130 120 160 40 205 30" stroke="#e07a5f" strokeWidth="3" fill="none" strokeDasharray="6 5" />
            <path d="M205 30 C260 110 290 50 324 44" stroke="#2a7f7a" strokeWidth="3" fill="none" />
            {[60, 76, 92, 108].map((y) => <rect key={y} x="44" y={y} width="70" height="6" rx="3" fill="#eadbb8" transform="rotate(-4 79 95)" />)}
            {[52, 68, 84].map((y) => <rect key={y} x="168" y={y} width="72" height="6" rx="3" fill="#ead49a" transform="rotate(3 205 87)" />)}
            <circle cx="320" cy="104" r="26" fill="none" stroke="#14524f" strokeWidth="7" />
            <path d="M339 123 l22 22" stroke="#14524f" strokeWidth="9" strokeLinecap="round" />
          </svg>
          {state.started ? (
            <>
              <h2 style={{ marginTop: '0.8rem' }}>Welcome back</h2>
              <p>Your notebook <strong>{state.notebookName}</strong> is saved on this device.</p>
              <div className="row">
                <button className="btn" onClick={() => go('map')}>Continue investigating →</button>
                <button className="btn secondary" onClick={() => go('learn')}>🎓 Learning path</button>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); start('learn'); }}>
              <h2 style={{ marginTop: '0.8rem' }}>Open your notebook</h2>
              <label className="field" htmlFor="nb-name">Notebook name <span className="hint">(optional)</span></label>
              <input id="nb-name" type="text" value={name} maxLength={60} placeholder="e.g. Referral Case Notes" onChange={(e) => setName(e.target.value)} />
              <p className="small muted" style={{ marginTop: '0.5rem' }}>No account needed. Progress saves automatically in this browser.</p>
              <button type="submit" className="btn coral" style={{ width: '100%' }}>🎓 Start with the fundamentals (recommended)</button>
              <p className="small muted" style={{ margin: '0.5rem 0' }}>Begins with the big picture, then each skill from high level to detail, with practice missions in this case.</p>
              <button type="button" className="btn secondary" style={{ width: '100%' }} onClick={() => start('map')}>Jump straight into the case →</button>
            </form>
          )}
        </div>
        <details className="card">
          <summary>How to investigate (optional, 1 minute)</summary>
          <p className="small muted">There is no timer and no fixed order. Revisit anything, change your mind freely, and use the nudge button whenever you like.</p>
          <div className="how-list">
            {c.briefing.howToInvestigate.map((h, i) => (
              <div className="how-item" key={h.title}>
                <strong>{i + 1}. {h.title}</strong>
                <div className="small">{h.text}</div>
              </div>
            ))}
          </div>
          <p className="small" style={{ marginTop: '0.8rem' }}>
            Tip: what people tell you is a <em>reported statement</em>. It is valuable evidence, but not automatically an established fact. System records show what was recorded — not why.
          </p>
        </details>
      </aside>
    </div>
  );
}
