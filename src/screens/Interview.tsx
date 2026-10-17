import { useEffect, useRef } from 'react';
import { useGame } from '../state/GameContext';
import { interviewedCharacters } from '../state/gameState';
import { Avatar } from '../components/Avatar';
import { EvidenceLink } from '../components/Evidence';
import type { Question, QuestionStyle } from '../case/types';

const STYLE_LABEL: Record<QuestionStyle, string> = { open: 'Open', probing: 'Probing', verifying: 'Verifying', leading: 'Leading' };

/** Neutral labels for leads — describe what could be checked, not what is true. */
const LEAD_LABELS: Record<string, string> = {
  exceptionOwnership: 'Who acts on referrals with missing information',
  statusAmbiguity: 'What the "Received" status means in the system vs. to people',
  formVariation: 'Whether intake formats differ in what they require',
  doubleEntry: 'How information moves between the two systems',
  duplicates: 'Whether resubmissions show up as duplicate records',
  workarounds: 'What private tracking people use and why',
  staffing: 'Whether delays line up with staffing levels',
  handoff: 'Where responsibility passes between teams',
  testIncomplete: 'How complete and incomplete referrals compare in the records',
  automation: 'Which steps a tool would and would not change',
  measurement: 'How reliable and complete the available measures are',
  documentedVsObserved: 'Differences between the SOP and current practice',
  pilot: 'How a change could be tested and measured',
};

export function Interview() {
  const { c, state, update, reveal, go } = useGame();
  const talked = interviewedCharacters(state, c);
  const ch = c.characters.find((x) => x.id === state.activeCharacter);
  const endRef = useRef<HTMLDivElement>(null);
  const askedHere = state.askedQuestions.map((id) => c.questions.find((q) => q.id === id)!).filter((q) => q && q.characterId === ch?.id);
  const lastCount = useRef(askedHere.length);

  useEffect(() => {
    if (askedHere.length > lastCount.current) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    lastCount.current = askedHere.length;
  }, [askedHere.length]);

  const available = (q: Question) => !state.askedQuestions.includes(q.id) && (q.requires ?? []).every((r) => state.askedQuestions.includes(r));
  const ask = (q: Question) => {
    update((s) => ({ ...s, askedQuestions: [...s.askedQuestions, q.id] }));
    if (q.unlocksEvidence?.length) reveal(q.unlocksEvidence);
  };
  const metAt = (locId: string) => state.visitedLocations.includes(locId);

  const cast = (
    <div className="cast" role="group" aria-label="People you can interview">
      {c.characters.map((x) => {
        const loc = c.locations.find((l) => l.id === x.locationId)!;
        const can = metAt(x.locationId);
        return (
          <button key={x.id} aria-pressed={ch?.id === x.id} disabled={!can} title={can ? x.role : `Visit the ${loc.name} to meet ${x.name}`}
            onClick={() => update((s) => ({ ...s, activeCharacter: x.id }))}>
            <Avatar spec={x.avatar} name={x.name} size={36} />
            {x.name.split(' ')[0]}{talked.includes(x.id) ? ' ✓' : ''}
          </button>
        );
      })}
    </div>
  );

  if (!ch || !metAt(ch.locationId)) {
    return (
      <>
        <div className="page-head"><div><div className="eyebrow">Ask</div><h1>Interviews</h1><p>Visit a location on the map to meet the people who work there. Greyed-out names are in places you haven’t visited yet.</p></div></div>
        {cast}
        <button className="btn" onClick={() => go('map')}>Go to the Organization Map</button>
      </>
    );
  }

  const qs = c.questions.filter((q) => q.characterId === ch.id);
  const open = qs.filter(available);
  const styleCounts = askedHere.reduce<Record<string, number>>((a, q) => ({ ...a, [q.style]: (a[q.style] ?? 0) + 1 }), {});
  const leads = [...new Set(askedHere.flatMap((q) => q.leads ?? []))];
  const loc = c.locations.find((l) => l.id === ch.locationId)!;

  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Ask · {loc.name}</div><h1>Interview: {ch.name}</h1></div></div>
      {cast}
      <div className="interview">
        <aside className="card portrait-card">
          <div className="portrait-frame"><Avatar spec={ch.avatar} name={ch.name} size={180} /></div>
          <div>
            <h2 style={{ marginBottom: '0.1rem' }}>{ch.name}</h2>
            <div className="muted small" style={{ marginBottom: '0.6rem' }}>{ch.role}</div>
            <p className="small">{ch.intro}</p>
            <p className="small"><strong>Vantage point:</strong> {ch.perspective}</p>
          </div>
        </aside>

        <section>
          <div className="callout teal small" style={{ marginBottom: '1rem' }}>
            Everything said here is a <strong>reported statement</strong> — a sincere account from one vantage point. Useful evidence, but check it against records before treating it as established fact.
          </div>
          <div className="transcript" aria-live="polite">
            {askedHere.length === 0 && <p className="muted">{ch.name.split(' ')[0]} is ready to talk. Choose a question below.</p>}
            {askedHere.map((q) => (
              <div key={q.id} style={{ display: 'contents' }}>
                <div className="bubble-q">{q.text}</div>
                <div className="bubble-a">
                  <div className="meta">
                    <Avatar spec={ch.avatar} name={ch.name} size={28} />
                    <strong>{ch.name.split(' ')[0]}</strong>
                    <span className="chip reported">Reported statement</span>
                    <span className="chip">{STYLE_LABEL[q.style]} question</span>
                  </div>
                  {q.answer.map((p, i) => <p key={i} style={{ marginBottom: i === q.answer.length - 1 ? 0 : undefined }}>{p}</p>)}
                  {q.unlocksEvidence?.length ? (
                    <p className="small" style={{ margin: '0.5rem 0 0' }}>Shared with you: {q.unlocksEvidence.map((id) => <EvidenceLink key={id} id={id} />)}</p>
                  ) : null}
                  <details style={{ marginTop: '0.4rem' }}>
                    <summary className="small">💡 Coaching on this question</summary>
                    <div className="coach">{q.coaching}</div>
                  </details>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="card">
            {open.length > 0 ? (
              <>
                <h3>Ask {ch.name.split(' ')[0]}…</h3>
                <div className="question-list">
                  {open.map((q) => (
                    <button key={q.id} className={`question-btn${q.requires ? ' followup' : ''}`} onClick={() => ask(q)}>
                      {q.requires && <span className="chip gold" style={{ marginRight: '0.4rem' }}>Follow-up</span>}
                      {q.text}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ margin: 0 }}><strong>You’ve asked {ch.name.split(' ')[0]} everything available.</strong> Try someone with a different vantage point.</p>
            )}
          </div>

          {askedHere.length > 0 && (
            <details className="card" style={{ marginTop: '1rem' }}>
              <summary>Interview wrap-up (optional coaching)</summary>
              <p className="small">
                Question mix so far: {(['open', 'probing', 'verifying', 'leading'] as QuestionStyle[]).filter((s) => styleCounts[s]).map((s) => `${styleCounts[s]} ${STYLE_LABEL[s].toLowerCase()}`).join(', ')}.
                {' '}Open and verifying questions usually reveal the most; leading questions tend to get agreement or polite pushback.
              </p>
              {leads.length > 0 && (
                <>
                  <p className="small" style={{ marginBottom: '0.3rem' }}><strong>Still unverified — things this conversation suggests you could check:</strong></p>
                  <ul className="small">{leads.map((l) => <li key={l}>{LEAD_LABELS[l] ?? l}</li>)}</ul>
                </>
              )}
              <div className="row">
                <button className="btn small secondary" onClick={() => go('evidence')}>Open Evidence Board</button>
                <button className="btn small secondary" onClick={() => go('map')}>Back to the map</button>
              </div>
            </details>
          )}
        </section>
      </div>
    </>
  );
}
