import type { CaseDefinition } from '../case/types';
import { modules, STEPS, type LearnModule, type MissionCriterion } from '../content/curriculum';
import { interviewedCharacters, type GameState } from '../state/gameState';
import { evaluateMap } from './mapEval';

/** Evaluate one mission criterion against the investigation state. */
export function criterionMet(cr: MissionCriterion, s: GameState, c: CaseDefinition): boolean {
  const asked = s.askedQuestions.map((id) => c.questions.find((q) => q.id === id)).filter(Boolean);
  const notes = Object.values(s.evidenceNotes);
  switch (cr.type) {
    case 'visited': return s.visitedLocations.length >= cr.min;
    case 'interviewed': return interviewedCharacters(s, c).length >= cr.min;
    case 'questionStyle': return asked.filter((q) => q!.style === cr.style).length >= cr.min;
    case 'evidenceFound': return s.discoveredEvidence.length >= cr.min;
    case 'tagged': return notes.filter((n) => n.tags.length > 0).length >= cr.min;
    case 'taggedReported': return notes.some((n) => n.tags.includes('reported'));
    case 'mapConcept': return evaluateMap(s.maps.observed, c.starterMaps.observed)[cr.concept];
    case 'hypothesesLinked': return s.hypotheses.filter((h) => h.supporting.length + h.contradicting.length > 0).length >= cr.min;
    case 'contradicting': return s.hypotheses.reduce((a, h) => a + h.contradicting.length, 0) >= cr.min;
    case 'analysis': return s.discoveredEvidence.includes(cr.id);
    case 'journeysViewed': return s.timeline.viewed.length >= cr.min;
    case 'metricsExplained': return s.timeline.metricsExplained.length >= cr.min;
    case 'proposalSubmitted': return Boolean(s.submittedProposal);
    case 'measureKinds': {
      const p = s.submittedProposal ?? s.proposal;
      const kinds = new Set(p.measures.map((id) => c.measureOptions.find((m) => m.id === id)?.kind));
      return cr.kinds.every((k) => kinds.has(k as never));
    }
  }
}

export interface ModuleProgress {
  stepsVisited: number;
  stepsTotal: number;
  checksCorrect: number;
  checksTotal: number;
  missionDone: number;
  missionTotal: number;
  /** 0..1 overall */
  share: number;
  complete: boolean;
}

export function checkIsCorrect(m: LearnModule, qid: string, s: GameState): boolean {
  const q = m.checks.find((x) => x.id === qid);
  const chosen = s.learning.checks[qid];
  return Boolean(q && chosen !== undefined && q.options[chosen]?.correct);
}

export function moduleProgress(m: LearnModule, s: GameState, c: CaseDefinition): ModuleProgress {
  const stepsVisited = STEPS.filter((st) => s.learning.visited.includes(`${m.id}:${st.id}`)).length;
  const checksCorrect = m.checks.filter((q) => checkIsCorrect(m, q.id, s)).length;
  const missionDone = m.mission.criteria.filter((cr) => criterionMet(cr, s, c)).length;
  const total = STEPS.length + m.checks.length + m.mission.criteria.length;
  const done = stepsVisited + checksCorrect + missionDone;
  return {
    stepsVisited, stepsTotal: STEPS.length,
    checksCorrect, checksTotal: m.checks.length,
    missionDone, missionTotal: m.mission.criteria.length,
    share: done / total,
    complete: done === total,
  };
}

/** Next module the learner should open: the first one not complete, in curriculum order. */
export function suggestedModule(s: GameState, c: CaseDefinition): LearnModule | null {
  return modules.find((m) => !moduleProgress(m, s, c).complete) ?? null;
}

export function visitStep(s: GameState, moduleId: string, stepIndex: number): GameState {
  const key = `${moduleId}:${STEPS[stepIndex].id}`;
  return {
    ...s,
    learning: {
      ...s.learning,
      activeModule: moduleId,
      step: { ...s.learning.step, [moduleId]: stepIndex },
      visited: s.learning.visited.includes(key) ? s.learning.visited : [...s.learning.visited, key],
    },
  };
}
