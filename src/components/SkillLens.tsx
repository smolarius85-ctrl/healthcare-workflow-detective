import { useGame } from '../state/GameContext';
import { moduleById, SCREEN_MODULE } from '../content/curriculum';
import { criterionMet, visitStep } from '../engine/learning';

/** Slim banner on case screens: which skill you're practicing, mission progress, and a way back to the lesson. */
export function SkillLens() {
  const { c, state, update, go } = useGame();
  const m = moduleById(SCREEN_MODULE[state.screen] ?? '');
  if (!m) return null;
  const done = m.mission.criteria.filter((cr) => criterionMet(cr, state, c));
  const openLesson = (step: number) => {
    update((s) => visitStep(s, m.id, step));
    go('learn');
  };
  return (
    <details className="skill-lens no-print">
      <summary>
        <span aria-hidden="true">{m.icon}</span>
        <span><strong>Skill in practice:</strong> {m.skill}</span>
        <span className="chip" style={{ marginLeft: 'auto' }}>🎯 Mission {done.length}/{m.mission.criteria.length}</span>
      </summary>
      <div className="skill-lens-body">
        <p style={{ marginBottom: '0.5rem' }}><em>{m.oneLiner}</em></p>
        <p className="small" style={{ marginBottom: '0.3rem' }}><strong>{m.mission.title}:</strong> {m.mission.brief}</p>
        <ul className="checklist small">
          {m.mission.criteria.map((cr) => {
            const ok = done.includes(cr);
            return <li key={cr.label} className={ok ? 'ok' : ''}><span className="tick" aria-hidden="true">{ok ? '✓' : ''}</span>{cr.label}</li>;
          })}
        </ul>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button className="btn small secondary" onClick={() => openLesson(2)}>Review key concepts</button>
          <button className="btn small secondary" onClick={() => openLesson(6)}>Open mission & reflection</button>
        </div>
      </div>
    </details>
  );
}
