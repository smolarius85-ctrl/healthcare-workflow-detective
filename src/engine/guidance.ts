import type { CaseDefinition } from '../case/types';
import { interviewedCharacters, leadsFound, type GameState, type ScreenId } from '../state/gameState';
import { evaluateMap } from './mapEval';

/* ---------------- Hints ---------------- */

/** Picks the most useful hint topic for the current state. Hints never affect scoring. */
export function currentHintTopic(s: GameState, c: CaseDefinition): string {
  const leads = leadsFound(s, c);
  const map = evaluateMap(s.maps.observed);
  const has = (id: string) => s.discoveredEvidence.includes(id);
  if (s.visitedLocations.length === 0) return 'start';
  if (interviewedCharacters(s, c).length < 2) return 'more-voices';
  if (!leads.has('exceptionOwnership') && !has('E-08')) return 'exceptions';
  if (!leads.has('statusAmbiguity') && !has('E-06')) return 'status';
  if (!c.evidence.some((e) => e.kind === 'analysis' && has(e.id))) return 'timeline';
  if (!map.readinessDecision || !map.exceptionPath) return 'map';
  if (!s.hypotheses.some((h) => h.supporting.length + h.contradicting.length >= 2)) return 'link-evidence';
  if (!s.hypotheses.some((h) => h.contradicting.length > 0)) return 'contradict';
  if (!s.submittedProposal) return 'recommend';
  return 'reflect';
}

export function nextHint(s: GameState, c: CaseDefinition): { state: GameState; topic: string; level: number; text: string } {
  const topic = currentHintTopic(s, c);
  const def = c.hintTopics.find((h) => h.id === topic)!;
  const prior = s.hints.levels[topic];
  const level = prior === undefined ? 0 : Math.min(prior + 1, 2);
  return {
    topic,
    level,
    text: def.levels[level],
    state: { ...s, hints: { used: s.hints.used + 1, levels: { ...s.hints.levels, [topic]: level } } },
  };
}

/* ---------------- Progress trail ---------------- */

export interface TrailStep {
  id: string;
  label: string;
  done: boolean;
  screen: ScreenId;
  suggestion: string;
}

export function progressTrail(s: GameState, c: CaseDefinition): TrailStep[] {
  const pinned = Object.values(s.evidenceNotes).filter((n) => n.pinned).length;
  const map = evaluateMap(s.maps.observed, c.starterMaps.observed);
  return [
    { id: 'observe', label: 'Observe', done: s.visitedLocations.length >= 2, screen: 'map', suggestion: 'Visit a couple of locations on the map.' },
    { id: 'ask', label: 'Ask', done: interviewedCharacters(s, c).length >= 2, screen: 'map', suggestion: 'Interview at least two people in different roles.' },
    { id: 'collect', label: 'Collect', done: s.discoveredEvidence.length >= 6 && pinned >= 1, screen: 'evidence', suggestion: 'Inspect evidence and pin what matters.' },
    { id: 'map', label: 'Map', done: map.differsFromStarter, screen: 'mapper', suggestion: 'Edit the observed workflow map.' },
    { id: 'hypothesize', label: 'Hypothesize', done: s.hypotheses.filter((h) => h.supporting.length + h.contradicting.length > 0).length >= 2, screen: 'hypotheses', suggestion: 'Link evidence to at least two hypotheses.' },
    { id: 'test', label: 'Test', done: c.evidence.some((e) => e.kind === 'analysis' && s.discoveredEvidence.includes(e.id)), screen: 'timelines', suggestion: 'Run a comparison in Referral Timelines.' },
    { id: 'recommend', label: 'Recommend', done: Boolean(s.submittedProposal), screen: 'recommend', suggestion: 'Assemble and submit a proposal.' },
    { id: 'reflect', label: 'Reflect', done: s.debriefViewed, screen: 'debrief', suggestion: 'Review your debrief feedback.' },
  ];
}
