import { useEffect, useRef, useState } from 'react';
import { useGame } from './state/GameContext';
import type { ScreenId } from './state/gameState';
import { ConfirmDialog } from './components/Modal';
import { EvidenceInspector } from './components/Evidence';
import { GlossaryDrawer, NudgeButton, ProgressTrail, Toasts } from './components/Chrome';
import { buildFindings, downloadText, findingsToMarkdown } from './engine/exporter';
import { Briefing } from './screens/Briefing';
import { OrgMap } from './screens/OrgMap';
import { Interview } from './screens/Interview';
import { EvidenceBoard } from './screens/EvidenceBoard';
import { ProcessMapper } from './screens/ProcessMapper';
import { Timelines } from './screens/Timelines';
import { HypothesisDesk } from './screens/HypothesisDesk';
import { Recommendation } from './screens/Recommendation';
import { Debrief } from './screens/Debrief';
import { Report } from './screens/Report';
import { Learn } from './screens/Learn';
import { SkillLens } from './components/SkillLens';

const TABS: { id: ScreenId; label: string }[] = [
  { id: 'learn', label: '🎓 Learn' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'map', label: 'Organization Map' },
  { id: 'interview', label: 'Interviews' },
  { id: 'evidence', label: 'Evidence Board' },
  { id: 'mapper', label: 'Process Mapper' },
  { id: 'timelines', label: 'Referral Timelines' },
  { id: 'hypotheses', label: 'Hypothesis Desk' },
  { id: 'recommend', label: 'Recommendation' },
  { id: 'debrief', label: 'Debrief' },
];

function Menu() {
  const { c, state, rubric, go, restart, prefs, setSound } = useGame();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const slug = (state.notebookName || 'investigation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'investigation';
  const act = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div className="menu" ref={ref}>
      <button className="btn ghost small" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>☰ Case file</button>
      {open && (
        <div className="menu-panel" role="menu">
          <button role="menuitem" onClick={act(() => downloadText(`${slug}-report.md`, findingsToMarkdown(buildFindings(state, c, rubric)), 'text/markdown'))}>⬇ Export report (Markdown)</button>
          <button role="menuitem" onClick={act(() => downloadText(`${slug}-findings.json`, JSON.stringify(buildFindings(state, c, rubric), null, 2), 'application/json'))}>⬇ Download findings (JSON)</button>
          <button role="menuitem" onClick={act(() => go('report'))}>🖨 Print-friendly report</button>
          <hr />
          <button role="menuitem" onClick={act(() => setSound(!prefs.soundOn))}>{prefs.soundOn ? '🔔 Sound: on (turn off)' : '🔕 Sound: off (turn on)'}</button>
          <hr />
          <button role="menuitem" style={{ color: 'var(--coral-700)' }} onClick={act(() => setConfirm(true))}>↺ Restart case…</button>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title="Restart the case?"
          danger
          confirmLabel="Yes, erase and restart"
          message={<p>This erases your saved investigation on this device: interviews, evidence notes, maps, hypotheses and your proposal. Consider exporting first. Your learning path progress, reflections and sound preference are kept.</p>}
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); restart(); }}
        />
      )}
    </div>
  );
}

export function App() {
  const { c, state, go, openGlossary, inspecting } = useGame();
  const screen = state.started ? state.screen : 'briefing';
  const newEvidence = state.discoveredEvidence.filter((id) => !state.inspectedEvidence.includes(id)).length;

  useEffect(() => {
    const label = TABS.find((t) => t.id === screen)?.label ?? 'Report';
    document.title = `${label} · Healthcare Workflow Detective`;
  }, [screen]);

  return (
    <>
      <a href="#main" className="sr-only">Skip to content</a>
      <div className="fiction-strip">{c.fictionNotice}</div>
      <header className="topbar">
        <div className="brand">
          <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#14524f" /><circle cx="28" cy="28" r="13" fill="none" stroke="#f6eedd" strokeWidth="5" /><path d="M38 38l12 12" stroke="#e07a5f" strokeWidth="6" strokeLinecap="round" /><circle cx="28" cy="28" r="4" fill="#d9a441" /></svg>
          <div>
            <div className="brand-title">Healthcare Workflow Detective</div>
            <div className="brand-sub">{c.title} · {c.orgName}</div>
          </div>
        </div>
        <span className="spacer" />
        {state.started && <span className="notebook-tag" title="Your notebook">📓 {state.notebookName || 'Untitled notebook'}</span>}
        <button className="btn ghost small" onClick={() => openGlossary()}>📖 Glossary</button>
        <Menu />
      </header>
      {state.started && (
        <>
          <div className="navbar no-print">
            <nav className="tabs" aria-label="Investigation areas">
              {TABS.map((t) => (
                <button key={t.id} className="tab" aria-current={screen === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                  {t.label}
                  {t.id === 'evidence' && newEvidence > 0 && <span className="dot" aria-label={`${newEvidence} not yet inspected`} />}
                </button>
              ))}
            </nav>
          </div>
          {screen !== 'learn' && <ProgressTrail />}
        </>
      )}
      <main id="main" className="content" tabIndex={-1}>
        {state.started && <SkillLens />}
        {screen === 'learn' && <Learn />}
        {screen === 'briefing' && <Briefing />}
        {screen === 'map' && <OrgMap />}
        {screen === 'interview' && <Interview />}
        {screen === 'evidence' && <EvidenceBoard />}
        {screen === 'mapper' && <ProcessMapper />}
        {screen === 'timelines' && <Timelines />}
        {screen === 'hypotheses' && <HypothesisDesk />}
        {screen === 'recommend' && <Recommendation />}
        {screen === 'debrief' && <Debrief />}
        {screen === 'report' && <Report />}
      </main>
      {inspecting && <EvidenceInspector />}
      <GlossaryDrawer />
      <NudgeButton />
      <Toasts />
    </>
  );
}
