import type { MapNode, ProcessMap } from '../case/types';

/**
 * Concept-based evaluation of a process map. We look for ideas (a readiness
 * decision, an exception path, an ownership gap) rather than exact positions
 * or wording, using lenient keyword matching on card labels.
 */

const EXCEPTION_RE = /(exception|missing|incomplete|return|chase|info|hold|pending|stuck|gap|fix|correct|request)/i;
const READINESS_RE = /(complete|ready|readiness|missing|incomplete|info|valid|check)/i;
const DUPLICATE_RE = /(duplicate|resubmit|re-?send|re-?fax|second submission)/i;

export interface MapConcepts {
  readinessDecision: boolean;
  exceptionPath: boolean;
  ownershipGap: boolean;
  waitOnException: boolean;
  reworkLoop: boolean;
  evidenceAttached: boolean;
  duplicatePath: boolean;
  differsFromStarter: boolean;
}

const isExceptionNode = (n: MapNode) => EXCEPTION_RE.test(n.label);

export function evaluateMap(map: ProcessMap, starter?: ProcessMap): MapConcepts {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const decisions = map.nodes.filter((n) => n.kind === 'decision' && READINESS_RE.test(n.label));
  const readinessDecision = decisions.length > 0;

  // Exception path: an edge leaving a readiness decision toward an exception-like node or the clinic lane.
  const exceptionTargets = new Set<string>();
  for (const e of map.edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) continue;
    if (from.kind === 'decision' && READINESS_RE.test(from.label) && (isExceptionNode(to) || to.lane === 'clinic' || /no|incomplete|missing/i.test(e.label))) {
      exceptionTargets.add(to.id);
    }
  }
  const exceptionNodes = map.nodes.filter((n) => n.kind !== 'decision' && (isExceptionNode(n) || exceptionTargets.has(n.id)));
  const exceptionPath = exceptionTargets.size > 0 || (readinessDecision && exceptionNodes.length > 0 && map.edges.some((e) => decisions.some((d) => d.id === e.from)));

  const ownershipGap = exceptionNodes.some((n) => n.owner.trim().toLowerCase() === 'unknown')
    || map.nodes.some((n) => n.kind === 'queue' && n.owner.trim().toLowerCase() === 'unknown');

  const waitOnException = exceptionNodes.some((n) => n.workType === 'wait');

  const reworkLoop = map.edges.some((e) => {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    return Boolean(from && to && from.lane !== 'clinic' && to.lane === 'clinic')
      && map.edges.some((e2) => {
        const f2 = byId.get(e2.from);
        const t2 = byId.get(e2.to);
        return Boolean(f2 && t2 && f2.lane === 'clinic' && t2.lane !== 'clinic' && f2.col >= 1);
      });
  });

  const evidenceAttached = map.nodes.filter((n) => n.evidence.length > 0).length >= 3;
  const duplicatePath = map.nodes.some((n) => DUPLICATE_RE.test(n.label));

  let differsFromStarter = true;
  if (starter) {
    const sig = (m: ProcessMap) => JSON.stringify({
      n: m.nodes.map((n) => [n.label, n.lane, n.kind, n.workType, n.owner]).sort(),
      e: m.edges.map((e) => [e.from, e.to, e.label]).sort(),
    });
    differsFromStarter = sig(map) !== sig(starter);
  }

  return { readinessDecision, exceptionPath, ownershipGap, waitOnException, reworkLoop, evidenceAttached, duplicatePath, differsFromStarter };
}

export function summarizeMap(map: ProcessMap, laneNames: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const lane of Object.keys(laneNames)) {
    const nodes = map.nodes.filter((n) => n.lane === lane).sort((a, b) => a.col - b.col);
    if (!nodes.length) continue;
    lines.push(`${laneNames[lane]}:`);
    for (const n of nodes) {
      const owner = n.owner ? (n.owner.toLowerCase() === 'unknown' ? 'owner unknown' : `owner: ${n.owner}`) : 'owner not set';
      const ev = n.evidence.length ? `; evidence ${n.evidence.join(', ')}` : '';
      lines.push(`  - [${n.kind}] ${n.label} (${n.workType}; ${owner}${ev})`);
    }
  }
  const label = (id: string) => map.nodes.find((n) => n.id === id)?.label ?? id;
  if (map.edges.length) {
    lines.push('Connections:');
    for (const e of map.edges) lines.push(`  - ${label(e.from)} → ${label(e.to)}${e.label ? ` (${e.label})` : ''}`);
  }
  return lines;
}
