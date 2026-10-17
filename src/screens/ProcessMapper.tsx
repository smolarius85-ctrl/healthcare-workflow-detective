import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useGame } from '../state/GameContext';
import type { LaneId, MapNode, NodeKind, ProcessMap, WorkType } from '../case/types';
import { ConfirmDialog } from '../components/Modal';
import { Term } from '../components/Chrome';
import { LANE_NAMES } from '../engine/exporter';

const LANES: LaneId[] = ['clinic', 'coordination', 'outreach'];
const KINDS: { id: NodeKind; label: string }[] = [
  { id: 'step', label: 'Step' }, { id: 'decision', label: 'Decision' }, { id: 'queue', label: 'Queue' }, { id: 'handoff', label: 'Handoff' },
];
const LABEL_W = 100;
const COL_W = 158;
const NODE_W = 136;
const ROW_H = 96;
const PAD = 18;

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

interface Layout {
  pos: Map<string, { x: number; y: number }>;
  laneTop: Record<LaneId, number>;
  laneH: Record<LaneId, number>;
  width: number;
  height: number;
}

function layout(map: ProcessMap): Layout {
  const pos = new Map<string, { x: number; y: number }>();
  const laneTop = {} as Record<LaneId, number>;
  const laneH = {} as Record<LaneId, number>;
  let y = 0;
  const maxCol = Math.max(5, ...map.nodes.map((n) => n.col));
  for (const lane of LANES) {
    const nodes = map.nodes.filter((n) => n.lane === lane);
    const stack = new Map<number, number>();
    let maxStack = 1;
    for (const n of nodes) {
      const k = stack.get(n.col) ?? 0;
      pos.set(n.id, { x: LABEL_W + PAD + n.col * COL_W, y: y + PAD + k * ROW_H });
      stack.set(n.col, k + 1);
      maxStack = Math.max(maxStack, k + 1);
    }
    laneTop[lane] = y;
    laneH[lane] = Math.max(140, PAD * 2 + maxStack * ROW_H - 14);
    y += laneH[lane];
  }
  return { pos, laneTop, laneH, width: LABEL_W + PAD * 2 + (maxCol + 1) * COL_W + NODE_W, height: y };
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const h = 84;
  if (b.x > a.x + 10) {
    const x1 = a.x + NODE_W, y1 = a.y + h / 2, x2 = b.x - 4, y2 = b.y + h / 2;
    const mx = (x1 + x2) / 2;
    return { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, lx: mx, ly: (y1 + y2) / 2 - 6, back: false };
  }
  if (Math.abs(b.x - a.x) <= 10) {
    const down = b.y > a.y;
    const x = a.x + NODE_W / 2;
    const y1 = down ? a.y + h + 6 : a.y - 2;
    const y2 = down ? b.y - 4 : b.y + h + 8;
    return { d: `M${x},${y1} L${x},${y2}`, lx: x + 8, ly: (y1 + y2) / 2, back: !down };
  }
  // backwards: loop underneath
  const x1 = a.x + NODE_W / 2, y1 = a.y + h + 6, x2 = b.x + NODE_W / 2, y2 = b.y + h + 8;
  const dip = Math.max(y1, y2) + 34;
  return { d: `M${x1},${y1} C${x1},${dip} ${x2},${dip} ${x2},${y2}`, lx: (x1 + x2) / 2, ly: dip - 8, back: true };
}

export function ProcessMapper() {
  const { c, state, update } = useGame();
  const [which, setWhich] = useState<'observed' | 'documented'>('observed');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [connectTo, setConnectTo] = useState('');
  const [connectLabel, setConnectLabel] = useState('');
  const [newKind, setNewKind] = useState<NodeKind>('step');
  const [newLane, setNewLane] = useState<LaneId>('coordination');
  const dragStart = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const map = state.maps[which];
  const L = layout(map);
  const sel = map.nodes.find((n) => n.id === selected) ?? null;
  const evidenceFound = c.evidence.filter((e) => state.discoveredEvidence.includes(e.id));

  const setMap = (fn: (m: ProcessMap) => ProcessMap) => update((s) => ({ ...s, maps: { ...s.maps, [which]: fn(s.maps[which]) } }));
  const patchNode = (id: string, patch: Partial<MapNode>) => setMap((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const move = (id: string, dCol: number, dLane: number) => {
    const n = map.nodes.find((x) => x.id === id);
    if (!n) return;
    const li = Math.min(LANES.length - 1, Math.max(0, LANES.indexOf(n.lane) + dLane));
    patchNode(id, { col: Math.max(0, Math.min(20, n.col + dCol)), lane: LANES[li] });
  };
  const addNode = (kind: NodeKind, lane: LaneId, col?: number, connectFrom?: string) => {
    const id = uid('n');
    const nextCol = col ?? Math.max(-1, ...map.nodes.filter((n) => n.lane === lane).map((n) => n.col)) + 1;
    const label = kind === 'decision' ? 'Complete?' : kind === 'queue' ? 'New queue' : kind === 'handoff' ? 'New handoff' : 'New step';
    setMap((m) => ({
      nodes: [...m.nodes, { id, label, lane, col: nextCol, kind, workType: kind === 'queue' ? 'wait' : 'work', owner: '', evidence: [] }],
      edges: connectFrom ? [...m.edges, { id: uid('e'), from: connectFrom, to: id, label: '' }] : m.edges,
    }));
    setSelected(id);
    window.setTimeout(() => document.getElementById(`label-${id}`)?.focus(), 30);
  };
  const deleteNode = (id: string) => {
    setMap((m) => ({ nodes: m.nodes.filter((n) => n.id !== id), edges: m.edges.filter((e) => e.from !== id && e.to !== id) }));
    setSelected(null);
  };
  const addEdge = () => {
    if (!sel || !connectTo || connectTo === sel.id) return;
    setMap((m) => ({ ...m, edges: [...m.edges, { id: uid('e'), from: sel.id, to: connectTo, label: connectLabel.trim() }] }));
    setConnectTo('');
    setConnectLabel('');
  };

  /* ---- pointer dragging ---- */
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, moved: false };
    setDrag({ id, dx: 0, dy: 0 });
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragStart.current.moved = true;
    setDrag({ ...drag, dx, dy });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const start = dragStart.current;
    const p = L.pos.get(drag.id);
    if (start?.moved && p) {
      const cx = p.x + drag.dx + NODE_W / 2;
      const cy = p.y + drag.dy + 35;
      const col = Math.max(0, Math.min(20, Math.round((cx - LABEL_W - PAD - NODE_W / 2) / COL_W)));
      const lane = LANES.find((ln) => cy >= L.laneTop[ln] && cy < L.laneTop[ln] + L.laneH[ln]) ?? (cy < 0 ? 'clinic' : 'outreach');
      patchNode(drag.id, { col, lane });
    }
    setSelected(drag.id);
    setDrag(null);
    dragStart.current = null;
  };
  const onNodeKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      setSelected(id);
      move(id, ...moves[e.key]);
      window.setTimeout(() => document.getElementById(`node-${id}`)?.focus(), 0);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      deleteNode(id);
    }
  };

  const label = (id: string) => map.nodes.find((n) => n.id === id)?.label ?? '?';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Map</div>
          <h1>Process Mapper</h1>
          <p>
            Sketch the referral journey across three swimlanes. Keep the <strong>documented</strong> workflow (what the SOP says) separate from the <strong>observed</strong> one (what you find actually happens — the <Term id="current-state">current state</Term>).
            Drag cards, or select a card and use the arrow keys or the editor panel.
          </p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: '0.8rem' }}>
        <div className="seg" role="group" aria-label="Which map">
          <button aria-pressed={which === 'observed'} onClick={() => { setWhich('observed'); setSelected(null); }}>Observed workflow</button>
          <button aria-pressed={which === 'documented'} onClick={() => { setWhich('documented'); setSelected(null); }}>Documented (SOP)</button>
        </div>
        <span className="spacer" />
        <button className="btn small danger" onClick={() => setConfirmReset(true)}>Reset this map</button>
      </div>

      <div className="mapper-layout">
        <div>
          <div className="canvas-wrap" ref={canvasRef}>
            <div className="canvas" style={{ width: L.width, height: L.height }}>
              {LANES.map((ln) => (
                <div key={ln} className="lane" style={{ top: L.laneTop[ln], height: L.laneH[ln] }}>
                  <div className="lane-label">{LANE_NAMES[ln]}</div>
                </div>
              ))}
              <svg className="edges" width={L.width} height={L.height} aria-hidden="true">
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#14524f" /></marker>
                  <marker id="arr-back" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#e07a5f" /></marker>
                </defs>
                {map.edges.map((e) => {
                  const a = L.pos.get(e.from);
                  const b = L.pos.get(e.to);
                  if (!a || !b) return null;
                  const da = drag?.id === e.from ? { x: a.x + drag.dx, y: a.y + drag.dy } : a;
                  const db = drag?.id === e.to ? { x: b.x + drag.dx, y: b.y + drag.dy } : b;
                  const p = edgePath(da, db);
                  return (
                    <g key={e.id}>
                      <path d={p.d} className={p.back ? 'back' : ''} markerEnd={`url(#${p.back ? 'arr-back' : 'arr'})`} />
                      {e.label && <text x={p.lx} y={p.ly} textAnchor="middle">{e.label}</text>}
                    </g>
                  );
                })}
              </svg>
              {map.nodes.map((n) => {
                const p = L.pos.get(n.id)!;
                const isDrag = drag?.id === n.id;
                const owner = n.owner.trim();
                return (
                  <button
                    key={n.id}
                    id={`node-${n.id}`}
                    className={`node k-${n.kind}${n.workType === 'wait' ? ' wait' : ''}${selected === n.id ? ' selected' : ''}${isDrag ? ' dragging' : ''}`}
                    style={{ left: p.x + (isDrag ? drag.dx : 0), top: p.y + (isDrag ? drag.dy : 0) }}
                    onPointerDown={(e) => onPointerDown(e, n.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onKeyDown={(e) => onNodeKey(e, n.id)}
                    onClick={() => setSelected(n.id)}
                    aria-pressed={selected === n.id}
                    aria-label={`${n.kind}: ${n.label}. Lane ${LANE_NAMES[n.lane]}, column ${n.col + 1}. ${n.workType}. ${owner ? (owner.toLowerCase() === 'unknown' ? 'Owner unknown' : `Owner ${owner}`) : 'Owner not set'}. Arrow keys move.`}
                  >
                    <span className="kind"><span>{n.kind}</span><span>{n.workType === 'wait' ? '⏳ wait' : n.workType === 'unknown' ? '? type' : '⚙ work'}</span></span>
                    <span className="label" title={n.label}>{n.label}</span>
                    <span className={`owner${owner.toLowerCase() === 'unknown' ? ' unknown' : ''}`} style={{ display: 'block' }}>
                      {owner ? (owner.toLowerCase() === 'unknown' ? '⚠ owner unknown' : `👤 ${owner}`) : '👤 —'}
                      {n.evidence.length > 0 && ` · 📎${n.evidence.length}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="legend">
            <span><i className="swatch" /> work</span>
            <span><i className="swatch wait" /> waiting</span>
            <span>◆ decision</span>
            <span style={{ color: 'var(--coral-700)' }}>– – ➜ return / loop back</span>
            <span><Term id="handoff">handoff</Term> · <Term id="queue">queue</Term> · <Term id="rework">rework</Term></span>
          </div>
          <details className="card" style={{ marginTop: '1rem' }}>
            <summary>Mapping tips</summary>
            <ul className="small">
              <li>Map what actually happens for <em>typical and atypical</em> referrals — not only the happy path.</li>
              <li>Use a <strong>decision</strong> card where the path splits, and label the arrows (e.g. “Yes” / “No”).</li>
              <li>Mark steps where work sits and waits as <strong>waiting</strong>. Waiting is often invisible in documents.</li>
              <li>If nobody clearly owns a step, tick <strong>Ownership unknown</strong> rather than guessing.</li>
              <li>Attach evidence IDs so every part of your map is traceable.</li>
            </ul>
          </details>
        </div>

        <aside className="card editor sticky" aria-label="Card editor">
          <fieldset>
            <legend>Add a card</legend>
            <div className="row" style={{ gap: '0.4rem' }}>
              <div style={{ flex: 1, minWidth: 110 }}>
                <label className="sr-only" htmlFor="new-kind">Card type</label>
                <select id="new-kind" value={newKind} onChange={(e) => setNewKind(e.target.value as NodeKind)}>
                  {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="sr-only" htmlFor="new-lane">Lane</label>
                <select id="new-lane" value={newLane} onChange={(e) => setNewLane(e.target.value as LaneId)}>
                  {LANES.map((l) => <option key={l} value={l}>{LANE_NAMES[l]}</option>)}
                </select>
              </div>
            </div>
            <button className="btn small" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => addNode(newKind, newLane)}>＋ Add card</button>
          </fieldset>

          {!sel ? (
            <p className="muted small">Select a card on the canvas to edit it. Keyboard: Tab to a card, then use arrow keys to move it between columns and lanes.</p>
          ) : (
            <div key={sel.id}>
              <h3 style={{ marginBottom: '0.6rem' }}>Edit card</h3>
              <label className="field" htmlFor={`label-${sel.id}`}>Name</label>
              <input id={`label-${sel.id}`} type="text" value={sel.label} onChange={(e) => patchNode(sel.id, { label: e.target.value })} />
              <div className="row" style={{ marginTop: '0.6rem', gap: '0.4rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="field small" htmlFor={`kind-${sel.id}`}>Type</label>
                  <select id={`kind-${sel.id}`} value={sel.kind} onChange={(e) => patchNode(sel.id, { kind: e.target.value as NodeKind })}>
                    {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1.3 }}>
                  <label className="field small" htmlFor={`lane-${sel.id}`}>Lane</label>
                  <select id={`lane-${sel.id}`} value={sel.lane} onChange={(e) => patchNode(sel.id, { lane: e.target.value as LaneId })}>
                    {LANES.map((l) => <option key={l} value={l}>{LANE_NAMES[l]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <span className="field small">Position (column {sel.col + 1})</span>
                <div className="row-btns">
                  <button className="btn small secondary" onClick={() => move(sel.id, -1, 0)} aria-label="Move left">←</button>
                  <button className="btn small secondary" onClick={() => move(sel.id, 1, 0)} aria-label="Move right">→</button>
                  <button className="btn small secondary" onClick={() => move(sel.id, 0, -1)} aria-label="Move up a lane">↑</button>
                  <button className="btn small secondary" onClick={() => move(sel.id, 0, 1)} aria-label="Move down a lane">↓</button>
                </div>
              </div>
              <fieldset style={{ marginTop: '0.6rem' }}>
                <legend>Work or waiting?</legend>
                <div className="row" style={{ gap: '0.8rem' }}>
                  {(['work', 'wait', 'unknown'] as WorkType[]).map((w) => (
                    <label key={w} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input type="radio" name={`wt-${sel.id}`} checked={sel.workType === w} onChange={() => patchNode(sel.id, { workType: w })} />
                      {w === 'work' ? 'Work' : w === 'wait' ? 'Waiting' : 'Not sure'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Owner</legend>
                <label className="sr-only" htmlFor={`owner-${sel.id}`}>Owner</label>
                <input id={`owner-${sel.id}`} type="text" placeholder="Role responsible" disabled={sel.owner.toLowerCase() === 'unknown'}
                  value={sel.owner.toLowerCase() === 'unknown' ? '' : sel.owner} onChange={(e) => patchNode(sel.id, { owner: e.target.value })} />
                <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                  <input type="checkbox" checked={sel.owner.toLowerCase() === 'unknown'} onChange={(e) => patchNode(sel.id, { owner: e.target.checked ? 'unknown' : '' })} />
                  Ownership unknown / unclear
                </label>
              </fieldset>
              <fieldset>
                <legend>Attached evidence ({sel.evidence.length})</legend>
                {evidenceFound.length === 0 ? <p className="small muted" style={{ margin: 0 }}>Discover evidence first.</p> : (
                  <div className="check-list">
                    {evidenceFound.map((e) => (
                      <label key={e.id}>
                        <input type="checkbox" checked={sel.evidence.includes(e.id)}
                          onChange={(ev) => patchNode(sel.id, { evidence: ev.target.checked ? [...sel.evidence, e.id] : sel.evidence.filter((x) => x !== e.id) })} />
                        <span><strong>{e.id}</strong> {e.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend>Arrows</legend>
                {map.edges.filter((e) => e.from === sel.id || e.to === sel.id).map((e) => (
                  <div key={e.id} className="row" style={{ gap: '0.3rem', marginBottom: '0.35rem' }}>
                    <span className="small" style={{ flex: '1 1 100%' }}>{e.from === sel.id ? `→ to “${label(e.to)}”` : `← from “${label(e.from)}”`}</span>
                    <label className="sr-only" htmlFor={`el-${e.id}`}>Arrow label</label>
                    <input id={`el-${e.id}`} type="text" placeholder="Label (e.g. No)" value={e.label} style={{ flex: 1, minHeight: 36 }}
                      onChange={(ev) => setMap((m) => ({ ...m, edges: m.edges.map((x) => (x.id === e.id ? { ...x, label: ev.target.value } : x)) }))} />
                    <button className="btn small danger" onClick={() => setMap((m) => ({ ...m, edges: m.edges.filter((x) => x.id !== e.id) }))} aria-label="Remove arrow">✕</button>
                  </div>
                ))}
                <label className="field small" htmlFor={`conn-${sel.id}`} style={{ marginTop: '0.4rem' }}>Connect this card to…</label>
                <select id={`conn-${sel.id}`} value={connectTo} onChange={(e) => setConnectTo(e.target.value)}>
                  <option value="">Choose a card…</option>
                  {map.nodes.filter((n) => n.id !== sel.id).map((n) => <option key={n.id} value={n.id}>{n.label} ({LANE_NAMES[n.lane]})</option>)}
                </select>
                <div className="row" style={{ gap: '0.3rem', marginTop: '0.35rem' }}>
                  <label className="sr-only" htmlFor={`conn-label-${sel.id}`}>New arrow label</label>
                  <input id={`conn-label-${sel.id}`} type="text" placeholder="Label (optional)" value={connectLabel} style={{ flex: 1 }} onChange={(e) => setConnectLabel(e.target.value)} />
                  <button className="btn small" disabled={!connectTo} onClick={addEdge}>Add arrow</button>
                </div>
              </fieldset>
              <div className="row" style={{ gap: '0.4rem' }}>
                <button className="btn small secondary" onClick={() => addNode('decision', sel.lane, sel.col + 1, sel.id)}>＋ Decision after this</button>
                <button className="btn small secondary" onClick={() => addNode('step', sel.lane, sel.col + 1, sel.id)}>＋ Step after this</button>
                <button className="btn small danger" onClick={() => deleteNode(sel.id)}>Delete card</button>
              </div>
            </div>
          )}
        </aside>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title={`Reset the ${which} map?`}
          danger
          confirmLabel="Reset map"
          message={<p>This replaces your {which} map with the starter version. The other map is not affected.</p>}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            setSelected(null);
            update((s) => ({ ...s, maps: { ...s.maps, [which]: JSON.parse(JSON.stringify(c.starterMaps[which])) } }));
          }}
        />
      )}
    </>
  );
}
