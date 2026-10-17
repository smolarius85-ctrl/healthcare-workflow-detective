import type { CaseDefinition, EvidenceTag, ProcessMap } from '../case/types';

export type ScreenId =
  | 'learn' | 'briefing' | 'map' | 'interview' | 'evidence' | 'mapper' | 'timelines' | 'hypotheses' | 'recommend' | 'debrief' | 'report';

export type HypothesisStatus = 'untested' | 'supported' | 'weakened' | 'unresolved';

export interface HypothesisState {
  id: string;
  text: string;
  custom: boolean;
  status: HypothesisStatus;
  /** 0 = not rated, 1..5 */
  confidence: number;
  supporting: string[];
  contradicting: string[];
  needs: string;
}

export interface EvidenceNote {
  pinned: boolean;
  note: string;
  tags: EvidenceTag[];
}

export interface Proposal {
  actions: string[];
  problem: string;
  evidence: string[];
  change: string;
  benefit: string;
  risks: string;
  pilotClinic: string;
  pilotScope: string;
  people: string;
  measures: string[];
  measuresNote: string;
  unresolved: string;
}

export interface GameState {
  version: 1;
  caseId: string;
  notebookName: string;
  started: boolean;
  screen: ScreenId;
  visitedLocations: string[];
  currentLocation: string | null;
  activeCharacter: string | null;
  askedQuestions: string[];
  discoveredEvidence: string[];
  inspectedEvidence: string[];
  evidenceNotes: Record<string, EvidenceNote>;
  notebook: string;
  hypotheses: HypothesisState[];
  maps: { documented: ProcessMap; observed: ProcessMap };
  timeline: { viewed: string[]; comparisons: string[]; metricsExplained: string[] };
  proposal: Proposal;
  submittedProposal: Proposal | null;
  submittedAt: string | null;
  debriefViewed: boolean;
  revealed: boolean;
  hints: { used: number; levels: Record<string, number> };
  learning: LearningState;
}

export interface LearningState {
  /** Module currently open on the Learn screen, or null for the big-picture overview. */
  activeModule: string | null;
  /** Current step index per module. */
  step: Record<string, number>;
  /** "moduleId:stepId" for every step the learner has reached. */
  visited: string[];
  /** Chosen option index per check question (latest attempt). */
  checks: Record<string, number>;
  /** Reflection notes per module. */
  journal: Record<string, string>;
}

export const emptyLearning = (): LearningState => ({ activeModule: null, step: {}, visited: [], checks: {}, journal: {} });

export const emptyProposal = (): Proposal => ({
  actions: [], problem: '', evidence: [], change: '', benefit: '', risks: '', pilotClinic: '', pilotScope: '', people: '', measures: [], measuresNote: '', unresolved: '',
});

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function initialState(c: CaseDefinition): GameState {
  return {
    version: 1,
    caseId: c.id,
    notebookName: '',
    started: false,
    screen: 'briefing',
    visitedLocations: [],
    currentLocation: null,
    activeCharacter: null,
    askedQuestions: [],
    discoveredEvidence: [],
    inspectedEvidence: [],
    evidenceNotes: {},
    notebook: '',
    hypotheses: c.hypothesisSeeds.map((h) => ({
      id: h.id, text: h.text, custom: false, status: 'untested', confidence: 0, supporting: [], contradicting: [], needs: '',
    })),
    maps: clone(c.starterMaps),
    timeline: { viewed: [], comparisons: [], metricsExplained: [] },
    proposal: emptyProposal(),
    submittedProposal: null,
    submittedAt: null,
    debriefViewed: false,
    revealed: false,
    hints: { used: 0, levels: {} },
    learning: emptyLearning(),
  };
}

/* ---------- pure state transitions used by the UI and tests ---------- */

const addUnique = (list: string[], ids: string[]) => {
  const out = [...list];
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out;
};

/** Returns the new state and the ids that were newly discovered. */
export function discover(s: GameState, ids: string[]): { state: GameState; added: string[] } {
  const added = ids.filter((id) => !s.discoveredEvidence.includes(id));
  if (!added.length) return { state: s, added };
  return { state: { ...s, discoveredEvidence: addUnique(s.discoveredEvidence, added) }, added };
}

export function askQuestion(s: GameState, c: CaseDefinition, questionId: string): { state: GameState; added: string[] } {
  const q = c.questions.find((x) => x.id === questionId);
  if (!q) return { state: s, added: [] };
  const next: GameState = { ...s, askedQuestions: addUnique(s.askedQuestions, [questionId]) };
  return discover(next, q.unlocksEvidence ?? []);
}

export function visitLocation(s: GameState, locationId: string): GameState {
  return { ...s, currentLocation: locationId, visitedLocations: addUnique(s.visitedLocations, [locationId]) };
}

export function getNote(s: GameState, id: string): EvidenceNote {
  return s.evidenceNotes[id] ?? { pinned: false, note: '', tags: [] };
}

export function updateNote(s: GameState, id: string, patch: Partial<EvidenceNote>): GameState {
  return { ...s, evidenceNotes: { ...s.evidenceNotes, [id]: { ...getNote(s, id), ...patch } } };
}

export function linkEvidence(s: GameState, hypothesisId: string, evidenceId: string, side: 'supporting' | 'contradicting'): GameState {
  return {
    ...s,
    hypotheses: s.hypotheses.map((h) => {
      if (h.id !== hypothesisId) return h;
      const other = side === 'supporting' ? 'contradicting' : 'supporting';
      return { ...h, [side]: addUnique(h[side], [evidenceId]), [other]: h[other].filter((x) => x !== evidenceId) };
    }),
  };
}

export function unlinkEvidence(s: GameState, hypothesisId: string, evidenceId: string): GameState {
  return {
    ...s,
    hypotheses: s.hypotheses.map((h) =>
      h.id === hypothesisId ? { ...h, supporting: h.supporting.filter((x) => x !== evidenceId), contradicting: h.contradicting.filter((x) => x !== evidenceId) } : h,
    ),
  };
}

export function interviewedCharacters(s: GameState, c: CaseDefinition): string[] {
  const ids = new Set<string>();
  for (const qid of s.askedQuestions) {
    const q = c.questions.find((x) => x.id === qid);
    if (q) ids.add(q.characterId);
  }
  return [...ids];
}

export function leadsFound(s: GameState, c: CaseDefinition): Set<string> {
  const leads = new Set<string>();
  for (const qid of s.askedQuestions) c.questions.find((x) => x.id === qid)?.leads?.forEach((l) => leads.add(l));
  return leads;
}
