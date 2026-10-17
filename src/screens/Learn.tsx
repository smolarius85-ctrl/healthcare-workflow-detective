import { useEffect, useState } from 'react';
import { useGame } from '../state/GameContext';
import { BIG_PICTURE, modules, moduleById, STEPS, type LearnModule } from '../content/curriculum';
import { checkIsCorrect, criterionMet, moduleProgress, suggestedModule, visitStep } from '../engine/learning';
import { Term } from '../components/Chrome';

const SCREEN_LABEL: Record<string, string> = {
  map: 'Organization Map', interview: 'Interviews', evidence: 'Evidence Board', mapper: 'Process Mapper', timelines: 'Referral Timelines', hypotheses: 'Hypothesis Desk', recommend: 'Recommendation Workshop',
};

/** The improvement loop, with each stage tied to the module that teaches it. */
const LOOP = [
  { label: 'Observe', module: 'm1' }, { label: 'Ask', module: 'm1' }, { label: 'Collect', module: 'm2' }, { label: 'Map', module: 'm3' },
  { label: 'Hypothesize', module: 'm2' }, { label: 'Test', module: 'm4' }, { label: 'Recommend', module: 'm5' }, { label: 'Reflect', module: 'm0' },
];
const MODULE_COLOR: Record<string, string> = { m0: '#0f3b39', m1: '#2a7f7a', m2: '#b8892d', m3: '#5b6b8c', m4: '#c8664b', m5: '#7a3b52' };

export function ProgressRing({ share, size = 44, color = '#2a7f7a' }: { share: number; size?: number; color?: string }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eadbb8" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${circ * share} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={size / 3.6} fontWeight="700" fill="#0f3b39">{Math.round(share * 100)}%</text>
    </svg>
  );
}

function LoopDiagram({ onOpen }: { onOpen: (id: string) => void }) {
  const W = 460;
  const cx = W / 2;
  const cy = 210;
  const R = 150;
  return (
    <svg viewBox={`0 0 ${W} 420`} className="loop-svg" role="img" aria-label="The improvement loop: Observe, Ask, Collect, Map, Hypothesize, Test, Recommend, Reflect, then back to Observe.">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#b9dbd6" strokeWidth="14" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2a7f7a" strokeWidth="3" strokeDasharray="4 10" className="loop-spin" />
      <text x={cx} y={cy - 12} textAnchor="middle" fontFamily="Fraunces, serif" fontSize="24" fontWeight="650" fill="#0f3b39">The Improvement</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="Fraunces, serif" fontSize="24" fontWeight="650" fill="#0f3b39">Loop</text>
      <text x={cx} y={cy + 44} textAnchor="middle" fontSize="13" fill="#4b5957">click a stage to learn it</text>
      {LOOP.map((st, i) => {
        const a = (i / LOOP.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        return (
          <g key={st.label} className="loop-node" onClick={() => onOpen(st.module)}>
            <circle cx={x} cy={y} r="38" fill={MODULE_COLOR[st.module]} stroke="#fffdf8" strokeWidth="4" />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={st.label.length > 9 ? 11 : 13} fontWeight="700" fill="#fffdf8">{st.label}</text>
            <title>{`${st.label} — Module ${moduleById(st.module)!.number}: ${moduleById(st.module)!.title}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function Overview() {
  const { c, state, update } = useGame();
  const open = (id: string) => {
    const step = state.learning.step[id] ?? 0;
    update((s) => visitStep(s, id, step));
    window.scrollTo({ top: 0 });
  };
  const next = suggestedModule(state, c);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Learn</div>
          <h1>Your learning path</h1>
          <p>Start from the big picture and zoom in. Each module goes from a one-sentence idea down to the details, then sends you into the Juniper case to practice it for real.</p>
        </div>
      </div>

      <ol className="zoom-ladder" aria-label="How the learning path is organized">
        {BIG_PICTURE.zoomLevels.map((z, i) => (
          <li key={z.level}>
            <span className="zoom-num">{i + 1}</span>
            <div><strong>{z.level}</strong><div className="small muted">{z.text}</div></div>
          </li>
        ))}
      </ol>

      {next && (
        <div className="card next-card">
          <div>
            <div className="eyebrow">Suggested next</div>
            <h2 style={{ margin: 0 }}>{next.icon} Module {next.number}: {next.title}</h2>
            <p className="muted" style={{ margin: '0.3rem 0 0' }}>{next.oneLiner}</p>
          </div>
          <button className="btn coral" onClick={() => open(next.id)}>{state.learning.visited.some((v) => v.startsWith(next.id + ':')) ? 'Continue' : 'Start'} →</button>
        </div>
      )}

      <section className="grid-2" style={{ marginTop: '1.4rem', alignItems: 'center' }} aria-labelledby="bp-title">
        <div className="card">
          <div className="eyebrow">Level 1 · Big picture</div>
          <h2 id="bp-title">{BIG_PICTURE.title}</h2>
          <p>{BIG_PICTURE.summary}</p>
          <h3>Four closely related practices</h3>
          <div className="grid-2" style={{ gap: '0.6rem' }}>
            {BIG_PICTURE.roles.map((r) => (
              <div key={r.title} className="how-item"><strong>{r.title}</strong><div className="small">{r.text}</div></div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: '0.8rem' }}>All four rely on the same core skills — which is what the modules teach.</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <LoopDiagram onOpen={open} />
        </div>
      </section>

      <section style={{ marginTop: '1.6rem' }} aria-labelledby="skills-title">
        <div className="eyebrow">Level 2 · Skills</div>
        <h2 id="skills-title">Six modules, top to bottom</h2>
        <div className="module-path">
          {modules.map((m) => {
            const p = moduleProgress(m, state, c);
            return (
              <button key={m.id} className={`module-card${p.complete ? ' done' : ''}${next?.id === m.id ? ' next' : ''}`} onClick={() => open(m.id)}
                style={{ borderTopColor: MODULE_COLOR[m.id] }} aria-label={`Module ${m.number}: ${m.title}. ${Math.round(p.share * 100)}% complete.`}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="module-icon" aria-hidden="true">{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div className="small muted">Module {m.number} · {m.skill}</div>
                    <strong className="module-title">{m.title}</strong>
                  </div>
                  <ProgressRing share={p.share} color={MODULE_COLOR[m.id]} />
                </div>
                <p className="small" style={{ margin: '0.5rem 0' }}>{m.oneLiner}</p>
                <div className="row small muted" style={{ gap: '0.8rem' }}>
                  <span>📖 {p.stepsVisited}/{p.stepsTotal} steps</span>
                  <span>✅ {p.checksCorrect}/{p.checksTotal} checks</span>
                  <span>🎯 {p.missionDone}/{p.missionTotal} mission</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function StepContent({ m, stepId }: { m: LearnModule; stepId: string }) {
  const { c, state, update, go } = useGame();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  switch (stepId) {
    case 'idea':
      return (
        <div className="stack">
          <p className="big-idea">{m.oneLiner}</p>
          <div>
            <h3>This module helps you answer</h3>
            <ul className="answer-list">{m.answers.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
          {m.dimension && <p className="small muted">In the case debrief, this skill appears as <strong>{m.skill}</strong>.</p>}
        </div>
      );
    case 'why':
      return <div className="stack">{m.whyItMatters.map((p, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{p}</p>)}</div>;
    case 'concepts':
      return (
        <div className="stack">
          <p className="muted">Read the headline of each concept first. Open “Go deeper” only when you want the detail.</p>
          {m.concepts.map((k, i) => (
            <article key={k.id} className="concept-card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="concept-num">{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.2rem' }}>{k.title}</h3>
                  <p style={{ margin: 0 }}>{k.summary}</p>
                </div>
              </div>
              <button className="linklike small" aria-expanded={Boolean(open[k.id])} onClick={() => setOpen((o) => ({ ...o, [k.id]: !o[k.id] }))} style={{ marginTop: '0.5rem' }}>
                {open[k.id] ? 'Show less ▴' : 'Go deeper ▾'}
              </button>
              {open[k.id] && (
                <div className="concept-detail reveal">
                  <ul>{k.detail.map((d) => <li key={d}>{d}</li>)}</ul>
                  {k.glossary && <p className="small" style={{ margin: 0 }}>Glossary: <Term id={k.glossary}>look up the term</Term></p>}
                </div>
              )}
            </article>
          ))}
        </div>
      );
    case 'example':
      return (
        <div className="stack">
          <div className="callout teal small">Worked example from a <strong>different</strong> fictional clinic, so the lesson doesn’t give away the Juniper case.</div>
          <h3>{m.example.title}</h3>
          <p>{m.example.intro}</p>
          <ol className="story">
            {m.example.beats.map((b, i) => {
              const k = m.concepts.find((x) => x.id === b.concept);
              return (
                <li key={i}>
                  <p style={{ margin: 0 }}>{b.text}</p>
                  {k && <span className="chip gold" style={{ marginTop: '0.35rem' }}>Concept: {k.title}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      );
    case 'traps':
      return (
        <div className="stack">
          {m.traps.map((t) => (
            <div key={t.trap} className="trap-row">
              <div className="trap"><span className="small" style={{ fontWeight: 700 }}>⚠ Trap</span><p style={{ margin: 0 }}>{t.trap}</p></div>
              <div className="instead"><span className="small" style={{ fontWeight: 700 }}>✓ Instead</span><p style={{ margin: 0 }}>{t.instead}</p></div>
            </div>
          ))}
        </div>
      );
    case 'check':
      return (
        <div className="stack">
          <p className="muted">Quick self-checks. They’re for you only — nothing here affects your case feedback, and you can try again as often as you like.</p>
          {m.checks.map((q, qi) => {
            const chosen = state.learning.checks[q.id];
            const correct = checkIsCorrect(m, q.id, state);
            return (
              <fieldset key={q.id} className="check-card">
                <legend><span className="concept-num">{qi + 1}</span> {q.prompt}</legend>
                <div className="stack" style={{ gap: '0.4rem' }}>
                  {q.options.map((o, oi) => {
                    const picked = chosen === oi;
                    return (
                      <button key={oi} className={`check-option${picked ? (o.correct ? ' right' : ' wrong') : ''}`} aria-pressed={picked}
                        onClick={() => update((s) => ({ ...s, learning: { ...s.learning, checks: { ...s.learning.checks, [q.id]: oi } } }))}>
                        {o.text}
                      </button>
                    );
                  })}
                </div>
                {chosen !== undefined && (
                  <p className={`check-feedback ${correct ? 'right' : 'wrong'}`} role="status">
                    <strong>{correct ? '✓ ' : 'Not quite. '}</strong>{q.options[chosen].feedback}{!correct && ' Try another option.'}
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>
      );
    case 'practice': {
      const p = moduleProgress(m, state, c);
      return (
        <div className="stack">
          <div className="mission">
            <div className="eyebrow">Mission in the Juniper case</div>
            <h3>🎯 {m.mission.title}</h3>
            <p>{m.mission.brief}</p>
            <ul className="checklist">
              {m.mission.criteria.map((cr) => {
                const ok = criterionMet(cr, state, c);
                return <li key={cr.label} className={ok ? 'ok' : ''}><span className="tick" aria-hidden="true">{ok ? '✓' : ''}</span>{cr.label}<span className="sr-only">{ok ? ' — done' : ' — not yet'}</span></li>;
              })}
            </ul>
            <p className="small muted">These tick themselves as you work in the case.</p>
            <button className="btn" onClick={() => { if (!state.started) update((s) => ({ ...s, started: true, notebookName: s.notebookName || 'Case Notebook' })); go(m.mission.screen); }}>
              Go to {SCREEN_LABEL[m.mission.screen]} →
            </button>
          </div>
          <div>
            <label className="field" htmlFor={`journal-${m.id}`}>Reflection <span className="hint">— {m.mission.reflection}</span></label>
            <textarea id={`journal-${m.id}`} value={state.learning.journal[m.id] ?? ''} placeholder="A few sentences is plenty. This goes in your learning journal and your exported report."
              onChange={(e) => { const v = e.target.value; update((s) => ({ ...s, learning: { ...s.learning, journal: { ...s.learning.journal, [m.id]: v } } })); }} />
          </div>
          {p.complete && <div className="celebrate">🌟 Module complete: you read every layer, answered the checks, and practiced the skill in the case.</div>}
        </div>
      );
    }
  }
  return null;
}

function ModuleView({ m }: { m: LearnModule }) {
  const { c, state, update } = useGame();
  const step = state.learning.step[m.id] ?? 0;
  const p = moduleProgress(m, state, c);
  const idx = modules.findIndex((x) => x.id === m.id);
  const nextModule = modules[idx + 1];
  const goStep = (i: number) => { update((s) => visitStep(s, m.id, i)); window.scrollTo({ top: 0 }); };
  const back = () => update((s) => ({ ...s, learning: { ...s.learning, activeModule: null } }));

  useEffect(() => {
    // Make sure the step being shown is recorded as visited (e.g. after a refresh).
    if (!state.learning.visited.includes(`${m.id}:${STEPS[step].id}`)) update((s) => visitStep(s, m.id, step));
  }, [m.id, step, state.learning.visited, update]);

  return (
    <>
      <nav className="row small" aria-label="Breadcrumb" style={{ marginBottom: '0.8rem' }}>
        <button className="linklike" onClick={back}>Learning path</button>
        <span aria-hidden="true">›</span>
        <span>Module {m.number}: {m.title}</span>
      </nav>
      <div className="page-head">
        <div style={{ flex: 1 }}>
          <div className="eyebrow">Module {m.number} · {m.skill}</div>
          <h1>{m.icon} {m.title}</h1>
        </div>
        <ProgressRing share={p.share} size={64} color={MODULE_COLOR[m.id]} />
      </div>
      <div className="learn-layout">
        <aside className="card step-rail" aria-label="Module steps">
          <div className="small muted" style={{ marginBottom: '0.4rem' }}>High level → detail</div>
          <ol>
            {STEPS.map((st, i) => {
              const seen = state.learning.visited.includes(`${m.id}:${st.id}`);
              return (
                <li key={st.id}>
                  <button className={`step-btn${i === step ? ' current' : ''}${seen ? ' seen' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => goStep(i)}>
                    <span className="step-dot" aria-hidden="true">{seen && i !== step ? '✓' : i + 1}</span>{st.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <section className="card learn-main" aria-labelledby="step-title">
          <div className="eyebrow">Step {step + 1} of {STEPS.length}</div>
          <h2 id="step-title">{STEPS[step].label}</h2>
          <StepContent m={m} stepId={STEPS[step].id} />
          <div className="row" style={{ marginTop: '1.6rem', borderTop: '1px dashed var(--line)', paddingTop: '1rem' }}>
            {step > 0 && <button className="btn secondary" onClick={() => goStep(step - 1)}>← {STEPS[step - 1].label}</button>}
            <span className="spacer" />
            {step < STEPS.length - 1 ? (
              <button className="btn" onClick={() => goStep(step + 1)}>Next: {STEPS[step + 1].label} →</button>
            ) : nextModule ? (
              <button className="btn coral" onClick={() => { update((s) => visitStep(s, nextModule.id, s.learning.step[nextModule.id] ?? 0)); window.scrollTo({ top: 0 }); }}>
                Next module: {nextModule.title} →
              </button>
            ) : (
              <button className="btn coral" onClick={back}>Back to the learning path</button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export function Learn() {
  const { state } = useGame();
  const m = state.learning.activeModule ? moduleById(state.learning.activeModule) : null;
  return m ? <ModuleView m={m} /> : <Overview />;
}
