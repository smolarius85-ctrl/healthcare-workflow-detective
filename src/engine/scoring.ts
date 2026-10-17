import type { CaseDefinition } from '../case/types';
import type { RubricKey } from '../case/vanishing-referral/rubric';
import { interviewedCharacters, type GameState, type Proposal, type ScreenId } from '../state/gameState';
import { evaluateMap } from './mapEval';

/**
 * Transparent, rule-based debrief. Each dimension is a list of observable criteria.
 * The rules can check what you did and what you wrote *about* (presence, length,
 * citations, a few keywords) — they cannot judge the quality of your reasoning.
 */

export interface Criterion {
  id: string;
  label: string;
  met: boolean;
  /** Suggestion shown when not met. */
  suggestion: string;
  evidence?: string[];
  screen?: ScreenId;
}

export interface DimensionResult {
  id: 'discovery' | 'evidence' | 'workflow' | 'measurement' | 'practicality';
  title: string;
  level: 0 | 1 | 2 | 3;
  levelLabel: string;
  criteria: Criterion[];
  celebrations: string[];
}

export const LEVELS = ['Emerging', 'Developing', 'Proficient', 'Strong'] as const;

function level(criteria: Criterion[]): 0 | 1 | 2 | 3 {
  const share = criteria.filter((c) => c.met).length / criteria.length;
  if (share >= 0.85) return 3;
  if (share >= 0.6) return 2;
  if (share >= 0.35) return 1;
  return 0;
}

function dim(id: DimensionResult['id'], title: string, criteria: Criterion[], celebrations: string[]): DimensionResult {
  const l = level(criteria);
  return { id, title, level: l, levelLabel: LEVELS[l], criteria, celebrations };
}

const HEDGE_RE = /\b(expect|predict|may|might|could|estimate|hypothes|likely|should|aim|anticipate|if)\w*/i;
const OVERCLAIM_RE = /\b(guarantee\w*|will (eliminate|solve|fix|end)|definitely|certainly|100%)/i;
const BASELINE_RE = /(baseline|\d+\s?%|\d+ of \d+|median)/i;

export function evaluateProposalText(p: Proposal) {
  return {
    hedged: HEDGE_RE.test(p.benefit) && !OVERCLAIM_RE.test(p.benefit),
    overclaims: OVERCLAIM_RE.test(p.benefit),
    mentionsBaseline: BASELINE_RE.test(`${p.benefit} ${p.measuresNote}`),
  };
}

export function scoreInvestigation(s: GameState, c: CaseDefinition, key: RubricKey): DimensionResult[] {
  const p = s.submittedProposal ?? s.proposal;
  const asked = s.askedQuestions.map((id) => c.questions.find((q) => q.id === id)).filter(Boolean) as CaseDefinition['questions'];
  const people = interviewedCharacters(s, c);
  const artifacts = c.evidence.filter((e) => e.kind !== 'analysis');
  const foundArtifacts = artifacts.filter((e) => s.discoveredEvidence.includes(e.id));
  const verifying = asked.filter((q) => q.style === 'verifying');
  const leading = asked.filter((q) => q.style === 'leading');
  const evidenceById = (id: string) => c.evidence.find((e) => e.id === id);

  /* ---------------- Discovery ---------------- */
  const discovery = dim('discovery', 'Discovery quality', [
    { id: 'd-people', label: `Interviewed at least 4 of ${c.characters.length} people (you: ${people.length})`, met: people.length >= 4, suggestion: 'Different roles see different slices of the workflow. Try the people you have not met yet.', screen: 'map' },
    { id: 'd-verify', label: `Asked at least 3 verifying questions — examples or "what would I need to check" (you: ${verifying.length})`, met: verifying.length >= 3, suggestion: 'Ask "Can you show me an example?" and "What would I need to check before concluding that?" to move from opinion toward evidence.', screen: 'map' },
    { id: 'd-owner', label: 'Asked about ownership of the next step', met: asked.some((q) => q.id.endsWith('-owner')), suggestion: 'Ask "How do you know who owns the next step?" — handoffs often hide where work waits.', evidence: ['E-05'], screen: 'map' },
    { id: 'd-locations', label: `Visited all ${c.locations.length} locations (you: ${s.visitedLocations.length})`, met: s.visitedLocations.length >= c.locations.length, suggestion: 'Each location holds different artifacts. Visit the ones you skipped.', screen: 'map' },
    { id: 'd-artifacts', label: `Found at least 12 of ${artifacts.length} artifacts (you: ${foundArtifacts.length})`, met: foundArtifacts.length >= 12, suggestion: 'Some artifacts only appear when you ask the right follow-up question.', screen: 'map' },
    { id: 'd-exceptions', label: 'Found evidence about the exceptions folder from both a record and a person', met: s.discoveredEvidence.includes('E-08') && (s.discoveredEvidence.includes('E-05') || s.discoveredEvidence.includes('E-11')), suggestion: 'Look for the exceptions snapshot at the hub, and ask a coordinator how exceptions are tracked.', evidence: ['E-08', 'E-05', 'E-11'], screen: 'map' },
  ], [
    ...(verifying.length >= 3 ? [`You asked ${verifying.length} verifying questions — the habit that turns stories into checkable claims.`] : []),
    ...(people.length >= 5 ? [`You heard from ${people.length} different roles before concluding.`] : []),
    ...(leading.length ? [`You asked ${leading.length} leading question${leading.length > 1 ? 's' : ''}. Staff pushed back usefully; open versions would likely have drawn out more.`] : ['You avoided leading questions entirely.']),
  ]);

  /* ---------------- Evidence discipline ---------------- */
  const tagged = Object.entries(s.evidenceNotes).filter(([, n]) => n.tags.length > 0);
  const reportedIds = c.evidence.filter((e) => e.nature === 'reported').map((e) => e.id);
  const mislabeled = tagged.filter(([id, n]) => reportedIds.includes(id) && n.tags.includes('observation') && !n.tags.includes('reported')).map(([id]) => id);
  const taggedReported = tagged.some(([, n]) => n.tags.includes('reported'));
  const rated = s.hypotheses.filter((h) => h.status !== 'untested');
  const ratedWithEvidence = rated.filter((h) => h.supporting.length + h.contradicting.length > 0);
  const anyContradicting = s.hypotheses.some((h) => h.contradicting.length > 0);
  const overclaimed = s.hypotheses.filter((h) => key.overSimple.includes(h.id) && h.status === 'supported' && h.confidence >= 4);
  const strongSupported = s.hypotheses.filter((h) => key.wellSupported.includes(h.id) && h.status === 'supported'
    && h.supporting.filter((id) => evidenceById(id)?.nature === 'observation').length >= 1 && h.supporting.length >= 2);
  const openQuestions = s.hypotheses.filter((h) => h.needs.trim().length >= 15).length + (p.unresolved.trim().length >= 30 ? 1 : 0);
  const cited = p.evidence.filter((id) => evidenceById(id));
  const citedRecords = cited.filter((id) => evidenceById(id)?.nature === 'observation' && ['system', 'analysis'].includes(evidenceById(id)!.kind));

  const evidence = dim('evidence', 'Evidence discipline', [
    { id: 'e-tags', label: `Tagged at least 3 pieces of evidence (you: ${tagged.length})`, met: tagged.length >= 3, suggestion: 'Tag evidence as observation, reported statement, hypothesis or open question so you can see what kind of support you have.', screen: 'evidence' },
    { id: 'e-reported', label: 'Kept reported statements separate from observations', met: taggedReported && mislabeled.length === 0, suggestion: mislabeled.length ? `Some sources are people’s accounts or interpretations but were tagged as observations: ${mislabeled.join(', ')}. Sincere reports are valuable; they are just a different kind of evidence.` : 'Tag at least one source as a "reported statement" — for example the manager’s weekly summary or the message thread.', evidence: mislabeled.length ? mislabeled : ['E-14', 'E-05'], screen: 'evidence' },
    { id: 'e-linked', label: 'Every hypothesis you rated has linked evidence', met: rated.length > 0 && ratedWithEvidence.length === rated.length, suggestion: 'Before marking a hypothesis supported or weakened, link the evidence that moved you.', screen: 'hypotheses' },
    { id: 'e-contra', label: 'Linked at least one piece of contradicting evidence', met: anyContradicting, suggestion: 'Look for evidence that cuts against an explanation — especially one you find appealing.', evidence: Object.values(key.challengers).flat().filter((v, i, a) => a.indexOf(v) === i), screen: 'hypotheses' },
    { id: 'e-overclaim', label: 'Did not mark an overly simple explanation as strongly supported', met: overclaimed.length === 0, suggestion: overclaimed.length ? `You marked ${overclaimed.map((h) => `"${h.text}"`).join(' and ')} as supported with high confidence. Check it against ${overclaimed.flatMap((h) => key.challengers[h.id] ?? []).join(', ')}.` : '', evidence: overclaimed.flatMap((h) => key.challengers[h.id] ?? []), screen: 'hypotheses' },
    { id: 'e-supported', label: 'Supported a well-evidenced explanation with at least one record-based source', met: strongSupported.length > 0, suggestion: 'Which explanation do system records (not only interviews) support? Link at least two sources, including a record.', evidence: [...key.exceptionEvidence, ...key.statusEvidence], screen: 'hypotheses' },
    { id: 'e-open', label: 'Recorded what you still need to know', met: openQuestions >= 1, suggestion: 'Add "what I would need to check" notes to hypotheses, or list unresolved questions in your proposal.', screen: 'hypotheses' },
    { id: 'e-cite', label: `Proposal cites at least 3 evidence IDs including a system record or analysis (you: ${cited.length})`, met: cited.length >= 3 && citedRecords.length >= 1, suggestion: 'Cite specific evidence IDs in your proposal, including at least one system record or analysis.', screen: 'recommend' },
  ], [
    ...(anyContradicting ? ['You linked contradicting evidence — a sign of testing ideas rather than defending them.'] : []),
    ...(s.hypotheses.some((h) => h.status === 'unresolved') ? ['You were willing to leave a hypothesis unresolved where evidence was mixed.'] : []),
    ...(mislabeled.length === 0 && taggedReported ? ['You distinguished people’s reports from recorded observations.'] : []),
  ]);

  /* ---------------- Workflow understanding ---------------- */
  const mc = evaluateMap(s.maps.observed, c.starterMaps.observed);
  const workflow = dim('workflow', 'Workflow understanding', [
    { id: 'w-decision', label: 'Observed map includes a readiness decision (e.g. "Complete?")', met: mc.readinessDecision, suggestion: 'Add a decision card where a coordinator decides whether a referral is complete enough to move on.', evidence: ['E-01', 'E-07'], screen: 'mapper' },
    { id: 'w-exception', label: 'Observed map shows the exception path', met: mc.exceptionPath, suggestion: 'Connect the decision to what happens when information is missing — a queue, a return to the clinic, or both.', evidence: ['E-08', 'E-07'], screen: 'mapper' },
    { id: 'w-owner', label: 'Map marks an ownership gap (owner unknown)', met: mc.ownershipGap, suggestion: 'If evidence suggests nobody clearly owns a step or queue, mark its owner as unknown rather than guessing.', evidence: ['E-05', 'E-09'], screen: 'mapper' },
    { id: 'w-wait', label: 'Exception path is marked as waiting', met: mc.waitOnException, suggestion: 'Mark which steps are waiting rather than work. It changes where you look for improvement.', evidence: ['A-04'], screen: 'mapper' },
    { id: 'w-loop', label: 'Map shows the return-to-clinic loop (rework)', met: mc.reworkLoop, suggestion: 'Show the referral going back to the clinic and returning to the hub — that loop is rework.', evidence: ['E-07'], screen: 'mapper' },
    { id: 'w-evidence', label: 'Attached evidence to at least 3 map cards', met: mc.evidenceAttached, suggestion: 'Attach evidence IDs to map cards so each part of the map is traceable.', screen: 'mapper' },
    { id: 'w-diff', label: 'Kept the observed workflow distinct from the documented one', met: mc.differsFromStarter, suggestion: 'Edit the observed map to reflect what you found; leave the documented map as the SOP describes.', evidence: ['E-01'], screen: 'mapper' },
  ], [
    ...(mc.ownershipGap ? ['Your map names an ownership gap instead of assigning it to whoever seems closest — honest and useful.'] : []),
    ...(mc.duplicatePath ? ['You captured the duplicate-submission path, which most maps miss.'] : []),
  ]);

  /* ---------------- Measurement reasoning ---------------- */
  const text = evaluateProposalText(p);
  const measureKinds = new Set(p.measures.map((id) => c.measureOptions.find((m) => m.id === id)?.kind));
  const testedAlt = key.alternativeTests.some((id) => s.discoveredEvidence.includes(id));
  const measurement = dim('measurement', 'Measurement reasoning', [
    { id: 'm-journeys', label: `Inspected at least 5 individual referral journeys (you: ${s.timeline.viewed.length})`, met: s.timeline.viewed.length >= 5, suggestion: 'Open several individual timelines — compare a smooth one with a slow one.', screen: 'timelines' },
    { id: 'm-compare', label: 'Compared complete and incomplete referrals', met: s.discoveredEvidence.includes('A-01'), suggestion: 'Use the "Complete vs. incomplete" comparison in Referral Timelines.', evidence: ['A-01'], screen: 'timelines' },
    { id: 'm-alt', label: 'Tested an alternative explanation with data', met: testedAlt, suggestion: 'Check the staffing explanation with the comparison by week (A-05), or the outreach explanation with where time goes (A-04).', evidence: key.alternativeTests, screen: 'timelines' },
    { id: 'm-defs', label: `Read at least 2 metric definitions (you: ${s.timeline.metricsExplained.length})`, met: s.timeline.metricsExplained.length >= 2, suggestion: 'Open "What does this measure mean?" — definitions decide what a number can tell you.', screen: 'timelines' },
    { id: 'm-outcome-balance', label: 'Chose an outcome measure and a balancing measure', met: measureKinds.has('outcome') && measureKinds.has('balancing'), suggestion: 'Pair an outcome measure with a balancing measure so you notice if the change creates work elsewhere.', screen: 'recommend' },
    { id: 'm-adoption', label: 'Included an adoption or process measure', met: measureKinds.has('adoption') || measureKinds.has('process'), suggestion: 'Add a measure that tells you whether people are actually using the new process.', screen: 'recommend' },
    { id: 'm-prediction', label: 'Framed expected benefit as a prediction, not a promise', met: text.hedged, suggestion: text.overclaims ? 'Your expected-benefit text reads as a certainty. Phrase it as a prediction you will test.' : 'Use language like "we expect" or "we predict" — benefits are hypotheses until measured.', screen: 'recommend' },
    { id: 'm-baseline', label: 'Referred to a baseline', met: text.mentionsBaseline, suggestion: 'Mention the current baseline (the workshop shows baselines calculated from the sample).', screen: 'recommend' },
  ], [
    ...(testedAlt ? ['You tested a competing explanation with data instead of dismissing it.'] : []),
    ...(measureKinds.has('balancing') ? ['You included a balancing measure — a mark of practical improvement thinking.'] : []),
  ]);

  /* ---------------- Practicality & adoption ---------------- */
  const focused = p.actions.filter((a) => key.focusedActions.includes(a));
  const caution = p.actions.filter((a) => key.cautionActions.includes(a));
  const safeguarded = p.actions.some((a) => key.safeguardActions.includes(a));
  const practicality = dim('practicality', 'Practicality & adoption planning', [
    { id: 'p-pilot', label: 'Defined a pilot scope', met: Boolean(p.pilotClinic) && p.pilotScope.trim().length >= 20, suggestion: 'Choose where and for how long you would pilot, and what would make you stop or expand.', screen: 'recommend' },
    { id: 'p-people', label: 'Described affected people and training needs', met: p.people.trim().length >= 40, suggestion: 'Name who would do something differently and what they need to learn.', screen: 'recommend' },
    { id: 'p-risks', label: 'Described risks and tradeoffs', met: p.risks.trim().length >= 40, suggestion: 'Every change costs something. Who does more work? What could go wrong?', screen: 'recommend' },
    { id: 'p-focused', label: 'Included a focused process change', met: focused.length > 0, suggestion: 'Consider a change aimed at where the evidence shows waiting — ownership, status design, or required fields.', evidence: [...key.exceptionEvidence, ...key.statusEvidence], screen: 'recommend' },
    { id: 'p-caution', label: 'Paired staffing or automation with validation', met: caution.length === 0 || (safeguarded && focused.length > 0), suggestion: 'Adding staff or automation can help, but pair it with a pilot or more evidence, and a process change it depends on.', evidence: ['A-05', 'E-03'], screen: 'recommend' },
    { id: 'p-size', label: `Kept the proposal manageable (5 or fewer actions; you: ${p.actions.length})`, met: p.actions.length > 0 && p.actions.length <= 5, suggestion: 'Too many simultaneous changes make it hard to learn what worked. Prioritize.', screen: 'recommend' },
    { id: 'p-unresolved', label: 'Listed unresolved questions', met: p.unresolved.trim().length >= 30, suggestion: 'Say what you still do not know. It builds trust and shapes the pilot.', screen: 'recommend' },
  ], [
    ...(p.actions.includes('pilot-one-clinic') ? ['You chose to pilot before scaling.'] : []),
    ...(focused.length ? ['Your proposal targets the parts of the process where evidence shows waiting.'] : []),
  ]);

  return [discovery, evidence, workflow, measurement, practicality];
}

export const RUBRIC_LIMITS = [
  'These rules check observable actions (questions asked, evidence linked, map concepts present, fields completed) and a few keywords.',
  'They cannot judge whether your writing is persuasive, accurate, or wise. A long answer is not necessarily a good one.',
  'Map checks look for concepts using keywords in card labels — unusual wording might be missed.',
  'There is no single correct redesign. Several different proposals can earn strong feedback if supported by evidence and tradeoffs.',
  'Hints are never counted against you.',
];
