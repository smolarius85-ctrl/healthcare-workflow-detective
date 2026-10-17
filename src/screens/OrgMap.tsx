import { useGame } from '../state/GameContext';
import { interviewedCharacters, visitLocation } from '../state/gameState';
import { Avatar } from '../components/Avatar';
import { KIND_ICON, NatureChip } from '../components/Evidence';
import type { Evidence } from '../case/types';

const ROOMS: Record<string, { x: number; y: number; w: number; h: number }> = {
  frontdesk: { x: 60, y: 60, w: 560, h: 420 },
  hub: { x: 680, y: 60, w: 860, h: 420 },
  manager: { x: 60, y: 560, w: 440, h: 480 },
  systems: { x: 560, y: 560, w: 480, h: 480 },
  patientexp: { x: 1100, y: 560, w: 440, h: 480 },
};
const VW = 1600;
const VH = 1100;

function Desk({ x, y, w = 150, monitor = true }: { x: number; y: number; w?: number; monitor?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={70} rx="8" fill="#c79f6b" />
      <rect x={x} y={y + 60} width={w} height={10} rx="4" fill="#a8824f" />
      {monitor && <><rect x={x + w / 2 - 34} y={y - 44} width="68" height="46" rx="5" fill="#24413f" /><rect x={x + w / 2 - 28} y={y - 39} width="56" height="34" rx="3" fill="#7fc3bb" /></>}
      <circle cx={x + w / 2} cy={y + 110} r="22" fill="#2a7f7a" opacity="0.85" />
    </g>
  );
}
function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 16} y={y} width="32" height="30" rx="5" fill="#c8664b" />
      <circle cx={x} cy={y - 14} r="22" fill="#4f9a6a" /><circle cx={x - 16} cy={y - 4} r="14" fill="#5fae78" /><circle cx={x + 16} cy={y - 4} r="14" fill="#3f8a5b" />
    </g>
  );
}
function Cabinet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="70" height="110" rx="6" fill="#9fb7c9" />
      {[0, 1, 2].map((i) => <rect key={i} x={x + 8} y={y + 10 + i * 33} width="54" height="26" rx="3" fill="#bccfdc" />)}
    </g>
  );
}

function FloorPlan() {
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true" preserveAspectRatio="none">
      <rect width={VW} height={VH} fill="#e9dcc0" />
      <rect x="0" y="480" width={VW} height="80" fill="#d8c8a4" />
      <text x="800" y="530" textAnchor="middle" fontSize="28" fill="#8a7650" fontFamily="Fraunces, serif" letterSpacing="6">MAIN CORRIDOR</text>
      {Object.entries(ROOMS).map(([id, r]) => (
        <g key={id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill={id === 'hub' ? '#dcefeb' : id === 'patientexp' ? '#fae3db' : id === 'systems' ? '#e3e8f1' : '#fbf6ea'} stroke="#b9a67c" strokeWidth="6" />
          <rect x={r.x + r.w / 2 - 50} y={id === 'frontdesk' || id === 'hub' ? r.y + r.h - 6 : r.y - 2} width="100" height="10" fill="#d8c8a4" />
        </g>
      ))}
      {/* Front desk: counter, fax, waiting chairs */}
      <rect x="110" y="170" width="380" height="60" rx="12" fill="#c79f6b" />
      <rect x="430" y="125" width="70" height="48" rx="6" fill="#5b6b8c" /><rect x="440" y="115" width="50" height="14" rx="3" fill="#fffdf8" />
      <rect x="170" y="130" width="64" height="42" rx="5" fill="#24413f" /><rect x="176" y="135" width="52" height="30" rx="3" fill="#7fc3bb" />
      {[130, 210, 290, 370].map((x) => <rect key={x} x={x} y="330" width="60" height="56" rx="12" fill="#e07a5f" opacity="0.8" />)}
      <Plant x={540} y={360} />
      {/* Hub: four desks, shared folder board */}
      <Desk x={760} y={170} /><Desk x={960} y={170} /><Desk x={1160} y={170} />
      <rect x="1360" y="110" width="140" height="170" rx="10" fill="#fff7d9" stroke="#d9a441" strokeWidth="4" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={1378} y={130 + i * 36} width="104" height="24" rx="4" fill={i === 1 ? '#e07a5f' : '#ead49a'} />)}
      <text x="1430" y="310" textAnchor="middle" fontSize="22" fill="#5e440f" fontFamily="Source Sans 3, sans-serif" fontWeight="700">EXCEPTIONS</text>
      <Plant x={720} y={420} />
      {/* Manager */}
      <Desk x={150} y={720} w={200} />
      <Cabinet x={400} y={640} />
      <rect x="110" y="610" width="200" height="70" rx="6" fill="#fffdf8" stroke="#b9a67c" strokeWidth="3" />
      <path d="M125 660 L160 640 L195 652 L230 628 L265 640 L295 622" stroke="#2a7f7a" strokeWidth="5" fill="none" />
      <Plant x={440} y={960} />
      {/* Systems */}
      <Desk x={660} y={740} w={260} />
      <rect x="610" y="610" width="90" height="110" rx="8" fill="#24413f" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={630 + (i % 2) * 40} cy={636 + Math.floor(i / 2) * 40} r="7" fill={i === 2 ? '#e07a5f' : '#7fc3bb'} />)}
      <Cabinet x={930} y={620} />
      {/* Patient experience */}
      <Desk x={1180} y={720} w={180} />
      <path d="M1400 690 q30 -30 60 0 v30 h-60 z" fill="#14524f" />
      <rect x="1150" y="920" width="300" height="70" rx="14" fill="#e07a5f" opacity="0.55" />
      <Plant x={1480} y={960} />
    </svg>
  );
}

export function OrgMap() {
  const { c, state, update, go, reveal, openEvidence } = useGame();
  const talked = interviewedCharacters(state, c);
  const isUnlocked = (e: Evidence) => !e.unlockedBy || state.askedQuestions.includes(e.unlockedBy);
  const pending = (locId: string) =>
    c.evidence.filter((e) => e.locationId === locId && isUnlocked(e) && !state.discoveredEvidence.includes(e.id)).length
    + c.characters.filter((ch) => ch.locationId === locId && !talked.includes(ch.id)).length;
  const loc = c.locations.find((l) => l.id === state.currentLocation);

  const examine = (e: Evidence) => {
    reveal([e.id]);
    openEvidence(e.id);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Observe</div>
          <h1>Juniper Community Health</h1>
          <p>Choose a location to see who works there and what you can examine. Gold badges count things you haven’t looked at yet.</p>
        </div>
      </div>
      <div className="org-layout">
        <div className="floorplan">
          <FloorPlan />
          {c.locations.map((l) => {
            const r = ROOMS[l.id];
            const n = pending(l.id);
            const visited = state.visitedLocations.includes(l.id);
            return (
              <button
                key={l.id}
                className="room-btn"
                style={{ left: `${(r.x / VW) * 100}%`, top: `${(r.y / VH) * 100}%`, width: `${(r.w / VW) * 100}%`, height: `${(r.h / VH) * 100}%` }}
                aria-pressed={state.currentLocation === l.id}
                aria-label={`${l.name}${n ? `, ${n} things not yet explored` : visited ? ', explored' : ''}`}
                onClick={() => update((s) => visitLocation(s, l.id))}
              >
                {n > 0 ? <span className="room-badge" aria-hidden="true">{n}</span> : visited ? <span className="room-badge visited" aria-hidden="true">✓</span> : null}
                <span className="room-label">{l.name}</span>
              </button>
            );
          })}
        </div>

        <section className="card location-panel" aria-live="polite">
          {!loc ? (
            <div className="empty">
              <p style={{ fontSize: '2rem', margin: 0 }} aria-hidden="true">🗺️</p>
              <p><strong>Select a location on the map.</strong></p>
              <p className="small">Referrals start at a Clinic Front Desk and pass through the Referral Coordination Hub — but every location holds part of the story.</p>
            </div>
          ) : (
            <div className="stack">
              <div>
                <div className="eyebrow">Location</div>
                <h2>{loc.name}</h2>
                <p className="muted">{loc.blurb}</p>
              </div>
              <div>
                <h3>People</h3>
                <div className="stack" style={{ gap: '0.5rem' }}>
                  {c.characters.filter((ch) => ch.locationId === loc.id).map((ch) => (
                    <div key={ch.id} className="person-card">
                      <Avatar spec={ch.avatar} name={ch.name} size={58} />
                      <div className="who">
                        <strong>{ch.name}</strong>
                        <span className="small muted">{ch.role}</span>
                      </div>
                      <button className="btn small" onClick={() => { update((s) => ({ ...s, activeCharacter: ch.id })); go('interview'); }}>
                        {talked.includes(ch.id) ? 'Continue talking' : 'Interview'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Things to examine</h3>
                <div className="stack" style={{ gap: '0.5rem' }}>
                  {c.evidence.filter((e) => e.locationId === loc.id && isUnlocked(e)).map((e) => {
                    const found = state.discoveredEvidence.includes(e.id);
                    return (
                      <div key={e.id} className={`artifact-row${found ? ' found' : ''}`}>
                        <span className="icon" aria-hidden="true">{KIND_ICON[e.kind]}</span>
                        <div className="info">
                          <div><strong>{found ? `${e.id} · ${e.title}` : 'Something worth a look'}</strong></div>
                          <div className="small muted">{e.preview}</div>
                          {found && <NatureChip e={e} />}
                        </div>
                        <button className={`btn small${found ? ' secondary' : ''}`} onClick={() => (found ? openEvidence(e.id) : examine(e))}>
                          {found ? 'Inspect' : 'Examine'}
                        </button>
                      </div>
                    );
                  })}
                  {c.evidence.some((e) => e.locationId === loc.id && !isUnlocked(e)) && (
                    <p className="small muted" style={{ margin: 0 }}>💬 Someone here may be able to show you more if you ask the right question.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
