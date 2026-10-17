import { describe, expect, it } from 'vitest';
import { vanishingReferral as c } from '../src/case/vanishing-referral';
import { rubricKey } from '../src/case/vanishing-referral/rubric';
import { askQuestion, initialState, linkEvidence, updateNote, visitLocation, type GameState } from '../src/state/gameState';
import { clearState, loadPrefs, loadState, memoryKV, savePrefs, saveState, stateKey } from '../src/state/storage';
import { evaluateProposalText, scoreInvestigation } from '../src/engine/scoring';
import { evaluateMap } from '../src/engine/mapEval';
import { buildFindings, findingsToMarkdown } from '../src/engine/exporter';
import { nextHint } from '../src/engine/guidance';
import type { ProcessMap } from '../src/case/types';

const crit = (s: GameState, dim: string, id: string) =>
  scoreInvestigation(s, c, rubricKey).find((d) => d.id === dim)!.criteria.find((x) => x.id === id)!;

/** A reasonably thorough player state used across tests. */
function thoroughState(): GameState {
  let s = initialState(c);
  s = { ...s, started: true, notebookName: 'Test notebook' };
  for (const l of c.locations) s = visitLocation(s, l.id);
  for (const q of c.questions.filter((q) => q.style !== 'leading')) s = askQuestion(s, c, q.id).state;
  s = { ...s, discoveredEvidence: c.evidence.map((e) => e.id) };
  s = updateNote(s, 'E-14', { tags: ['reported'], pinned: true });
  s = updateNote(s, 'E-08', { tags: ['observation'] });
  s = updateNote(s, 'E-05', { tags: ['reported'] });
  s = linkEvidence(s, 'H-ownership', 'E-08', 'supporting');
  s = linkEvidence(s, 'H-ownership', 'A-01', 'supporting');
  s = linkEvidence(s, 'H-staffing', 'E-09', 'supporting');
  s = linkEvidence(s, 'H-staffing', 'A-05', 'contradicting');
  s = {
    ...s,
    hypotheses: s.hypotheses.map((h) =>
      h.id === 'H-ownership' ? { ...h, status: 'supported', confidence: 4, needs: 'Whether ownership alone would fix returns' }
        : h.id === 'H-staffing' ? { ...h, status: 'unresolved', confidence: 2 } : h),
    timeline: { viewed: ['RF-2401', 'RF-2412', 'RF-2415', 'RF-2416', 'RF-2405'], comparisons: ['completeness', 'week'], metricsExplained: ['median', 'touch'] },
  };
  const proposal = {
    actions: ['exception-ownership', 'separate-statuses', 'pilot-one-clinic'],
    problem: 'Incomplete referrals wait in an unowned exceptions folder while showing as Received.',
    evidence: ['E-08', 'A-01', 'E-06'],
    change: 'Name a daily exception owner and add an Incomplete status visible to clinics.',
    benefit: 'We predict the share meeting target rises from the 60% baseline, mostly for incomplete referrals.',
    risks: 'Owner workload rises; clinics may feel blamed; status changes need system configuration time.',
    pilotClinic: 'RB',
    pilotScope: 'Riverbend for six weeks; expand if exception days fall.',
    people: 'Coordinators, Riverbend front desk, Patient Experience; job aid and a short walkthrough.',
    measures: ['m-target-rate', 'm-touch-time', 'm-owner-assigned'],
    measuresNote: 'Weekly review against baseline.',
    unresolved: 'Whether the hub can look up coverage itself; true touch time.',
  };
  return { ...s, proposal, submittedProposal: proposal, submittedAt: 'now' };
}

describe('process map concept evaluation', () => {
  it('starter observed map lacks the key concepts', () => {
    const m = evaluateMap(c.starterMaps.observed, c.starterMaps.observed);
    expect(m.readinessDecision).toBe(false);
    expect(m.exceptionPath).toBe(false);
    expect(m.ownershipGap).toBe(false);
    expect(m.differsFromStarter).toBe(false);
  });

  it('recognizes concepts regardless of wording or position', () => {
    const map: ProcessMap = {
      nodes: [
        { id: 'a', label: 'Fax form', lane: 'clinic', col: 0, kind: 'step', workType: 'work', owner: 'Front desk', evidence: ['E-02'] },
        { id: 'b', label: 'Is it ready to go?', lane: 'coordination', col: 3, kind: 'decision', workType: 'work', owner: 'Coordinator', evidence: ['E-07'] },
        { id: 'c', label: 'Sits in the exceptions folder', lane: 'coordination', col: 4, kind: 'queue', workType: 'wait', owner: 'unknown', evidence: ['E-08'] },
        { id: 'd', label: 'Clinic sends fix', lane: 'clinic', col: 5, kind: 'handoff', workType: 'work', owner: 'Front desk', evidence: [] },
      ],
      edges: [
        { id: '1', from: 'a', to: 'b', label: '' },
        { id: '2', from: 'b', to: 'c', label: 'No' },
        { id: '3', from: 'c', to: 'd', label: '' },
        { id: '4', from: 'd', to: 'b', label: '' },
      ],
    };
    const m = evaluateMap(map, c.starterMaps.observed);
    expect(m).toMatchObject({ readinessDecision: true, exceptionPath: true, ownershipGap: true, waitOnException: true, reworkLoop: true, evidenceAttached: true, differsFromStarter: true });
  });
});

describe('feedback rules', () => {
  it('a thorough, evidence-based investigation scores well on evidence discipline', () => {
    const d = scoreInvestigation(thoroughState(), c, rubricKey).find((x) => x.id === 'evidence')!;
    expect(d.level).toBeGreaterThanOrEqual(2);
  });

  it('flags tagging a reported statement as an observation', () => {
    const s = updateNote(thoroughState(), 'E-14', { tags: ['observation'] });
    const cr = crit(s, 'evidence', 'e-reported');
    expect(cr.met).toBe(false);
    expect(cr.evidence).toContain('E-14');
  });

  it('flags over-claiming on an overly simple hypothesis and cites challenging evidence', () => {
    let s = thoroughState();
    s = { ...s, hypotheses: s.hypotheses.map((h) => (h.id === 'H-automation' ? { ...h, status: 'supported', confidence: 5, supporting: ['E-07'] } : h)) };
    const cr = crit(s, 'evidence', 'e-overclaim');
    expect(cr.met).toBe(false);
    expect(cr.evidence).toEqual(expect.arrayContaining(['E-03', 'E-05']));
  });

  it('does not penalize hints', () => {
    const a = thoroughState();
    const b = { ...a, hints: { used: 25, levels: { start: 2, map: 2 } } };
    expect(JSON.stringify(scoreInvestigation(a, c, rubricKey))).toBe(JSON.stringify(scoreInvestigation(b, c, rubricKey)));
  });

  it('treats expected benefit as a prediction', () => {
    expect(evaluateProposalText({ ...thoroughState().proposal, benefit: 'We expect fewer delays.' }).hedged).toBe(true);
    expect(evaluateProposalText({ ...thoroughState().proposal, benefit: 'This will eliminate all delays.' }).hedged).toBe(false);
  });

  it('automation without validation is flagged; with a pilot and focused change it is not', () => {
    const base = thoroughState();
    const bad = { ...base, submittedProposal: { ...base.submittedProposal!, actions: ['automate-stable-step'] } };
    expect(crit(bad, 'practicality', 'p-caution').met).toBe(false);
    const ok = { ...base, submittedProposal: { ...base.submittedProposal!, actions: ['automate-stable-step', 'exception-ownership', 'pilot-one-clinic'] } };
    expect(crit(ok, 'practicality', 'p-caution').met).toBe(true);
  });

  it('every evidence ID cited in feedback exists', () => {
    for (const d of scoreInvestigation(initialState(c), c, rubricKey)) {
      for (const cr of d.criteria) for (const id of cr.evidence ?? []) expect(c.evidence.some((e) => e.id === id), id).toBe(true);
    }
  });

  it('hints progress from gentle to specific without changing score', () => {
    let s = initialState(c);
    const h1 = nextHint(s, c); s = h1.state;
    const h2 = nextHint(s, c); s = h2.state;
    const h3 = nextHint(s, c); s = h3.state;
    const h4 = nextHint(s, c);
    expect([h1.level, h2.level, h3.level, h4.level]).toEqual([0, 1, 2, 2]);
    expect(h3.text).toMatch(/Referral Coordination Hub/);
    expect(s.hints.used).toBe(3);
  });
});

describe('save, restore, restart', () => {
  it('round-trips progress through storage', () => {
    const kv = memoryKV();
    const s = thoroughState();
    saveState(kv, s);
    expect(loadState(kv, c)).toEqual(s);
  });

  it('falls back to a fresh state on corrupt or foreign data', () => {
    const kv = memoryKV();
    kv.setItem(stateKey(c.id), '{not json');
    expect(loadState(kv, c)).toEqual(initialState(c));
    kv.setItem(stateKey(c.id), JSON.stringify({ version: 99, caseId: c.id }));
    expect(loadState(kv, c)).toEqual(initialState(c));
  });

  it('fills fields missing from older saves', () => {
    const kv = memoryKV();
    const { timeline: _t, hints: _h, ...partial } = thoroughState();
    kv.setItem(stateKey(c.id), JSON.stringify(partial));
    const loaded = loadState(kv, c);
    expect(loaded.timeline).toEqual(initialState(c).timeline);
    expect(loaded.notebookName).toBe('Test notebook');
  });

  it('restart clears case progress but keeps preferences', () => {
    const kv = memoryKV();
    saveState(kv, thoroughState());
    savePrefs(kv, { soundOn: true });
    clearState(kv, c.id);
    expect(kv.getItem(stateKey(c.id))).toBeNull();
    expect(loadState(kv, c)).toEqual(initialState(c));
    expect(loadPrefs(kv).soundOn).toBe(true);
  });

  it('sound is off by default', () => {
    expect(loadPrefs(memoryKV()).soundOn).toBe(false);
  });
});

describe('exports', () => {
  it('markdown contains the player’s actual findings and fiction label', () => {
    const s = thoroughState();
    const md = findingsToMarkdown(buildFindings(s, c, rubricKey, new Date('2026-10-15T12:00:00Z')));
    expect(md).toMatch(/FICTIONAL PRACTICE WORK/);
    expect(md).toContain('Name a daily exception owner');
    expect(md).toContain('We predict the share meeting target');
    expect(md).toContain('Missing information creates a queue nobody consistently owns.');
    expect(md).toContain('E-08, A-01');
    expect(md).toContain('Riverbend Clinic');
    expect(md).toMatch(/Share of referrals with first outreach within 3 business days.*baseline from sample: 12 of 20/);
    expect(md).toContain('Observed workflow');
    expect(md).toContain('Whether the hub can look up coverage itself');
  });

  it('JSON findings are structured and labeled', () => {
    const f = buildFindings(thoroughState(), c, rubricKey);
    const parsed = JSON.parse(JSON.stringify(f));
    expect(parsed.label).toMatch(/FICTIONAL/);
    expect(parsed.recommendation.measures[0].baseline).toBeTruthy();
    expect(parsed.processMaps.observed.nodes.length).toBeGreaterThan(0);
    expect(parsed.debrief).toHaveLength(5);
  });

  it('exports work before a recommendation exists', () => {
    const md = findingsToMarkdown(buildFindings(initialState(c), c, rubricKey));
    expect(md).toContain('No recommendation drafted yet');
  });
});
