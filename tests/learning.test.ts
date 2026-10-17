import { describe, expect, it } from 'vitest';
import { vanishingReferral as c } from '../src/case/vanishing-referral';
import { rubricKey } from '../src/case/vanishing-referral/rubric';
import { DIMENSION_MODULE, modules, SCREEN_MODULE, STEPS } from '../src/content/curriculum';
import { glossary } from '../src/content/glossary';
import { criterionMet, moduleProgress, suggestedModule, visitStep } from '../src/engine/learning';
import { askQuestion, initialState, visitLocation } from '../src/state/gameState';
import { loadState, memoryKV, saveState, stateKey } from '../src/state/storage';
import { buildFindings, findingsToMarkdown } from '../src/engine/exporter';
import { scoreInvestigation } from '../src/engine/scoring';

describe('curriculum integrity', () => {
  it('modules are ordered top-down starting with the big picture', () => {
    expect(modules.map((m) => m.number)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(modules[0].dimension).toBeNull();
  });

  it('every check question has exactly one correct option and feedback for each option', () => {
    for (const m of modules) for (const q of m.checks) {
      expect(q.options.filter((o) => o.correct).length, q.id).toBe(1);
      for (const o of q.options) expect(o.feedback.length).toBeGreaterThan(10);
    }
  });

  it('check question ids are unique', () => {
    const ids = modules.flatMap((m) => m.checks.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('worked-example beats point at concepts in the same module', () => {
    for (const m of modules) for (const b of m.example.beats) expect(m.concepts.some((k) => k.id === b.concept), `${m.id} ${b.concept}`).toBe(true);
  });

  it('every glossary reference exists', () => {
    for (const m of modules) for (const k of m.concepts) if (k.glossary) expect(glossary.some((g) => g.id === k.glossary), k.glossary).toBe(true);
  });

  it('every debrief dimension maps to a module that builds it', () => {
    for (const d of scoreInvestigation(initialState(c), c, rubricKey)) {
      const m = modules.find((x) => x.id === DIMENSION_MODULE[d.id]);
      expect(m?.dimension).toBe(d.id);
    }
    for (const id of Object.values(SCREEN_MODULE)) expect(modules.some((m) => m.id === id)).toBe(true);
  });

  it('mission analyses refer to real evidence', () => {
    for (const m of modules) for (const cr of m.mission.criteria) if (cr.type === 'analysis') expect(c.evidence.some((e) => e.id === cr.id)).toBe(true);
  });

  it('lessons do not reveal the case explanation', () => {
    const text = JSON.stringify(modules);
    expect(text).not.toContain(c.explanation.summary.slice(0, 40));
    for (const x of c.explanation.contributors) expect(text).not.toContain(x.text.slice(0, 40));
  });
});

describe('learning progress', () => {
  it('starts at module 0 and records visited steps', () => {
    let s = initialState(c);
    expect(suggestedModule(s, c)?.id).toBe('m0');
    s = visitStep(s, 'm0', 0);
    s = visitStep(s, 'm0', 3);
    expect(s.learning.activeModule).toBe('m0');
    expect(s.learning.step.m0).toBe(3);
    expect(moduleProgress(modules[0], s, c).stepsVisited).toBe(2);
  });

  it('missions tick from real case actions', () => {
    let s = initialState(c);
    const m0 = modules[0];
    expect(m0.mission.criteria.every((cr) => criterionMet(cr, s, c))).toBe(false);
    s = visitLocation(visitLocation(s, 'hub'), 'frontdesk');
    s = askQuestion(s, c, 'dev-walk').state;
    expect(m0.mission.criteria.every((cr) => criterionMet(cr, s, c))).toBe(true);
  });

  it('a module is complete only when steps, checks and mission are all done', () => {
    let s = initialState(c);
    const m0 = modules[0];
    STEPS.forEach((_, i) => (s = visitStep(s, 'm0', i)));
    const answers = Object.fromEntries(m0.checks.map((q) => [q.id, q.options.findIndex((o) => o.correct)]));
    s = { ...s, learning: { ...s.learning, checks: answers } };
    expect(moduleProgress(m0, s, c).complete).toBe(false);
    s = askQuestion(visitLocation(visitLocation(s, 'hub'), 'frontdesk'), c, 'dev-walk').state;
    expect(moduleProgress(m0, s, c).complete).toBe(true);
    expect(suggestedModule(s, c)?.id).toBe('m1');
  });

  it('a wrong answer does not count, and can be changed', () => {
    const m1 = modules[1];
    const q = m1.checks[0];
    const wrong = q.options.findIndex((o) => !o.correct);
    let s = initialState(c);
    s = { ...s, learning: { ...s.learning, checks: { [q.id]: wrong } } };
    expect(moduleProgress(m1, s, c).checksCorrect).toBe(0);
    s = { ...s, learning: { ...s.learning, checks: { [q.id]: q.options.findIndex((o) => o.correct) } } };
    expect(moduleProgress(m1, s, c).checksCorrect).toBe(1);
  });

  it('learning progress persists, and old saves without it load safely', () => {
    const kv = memoryKV();
    let s = visitStep(initialState(c), 'm2', 4);
    s = { ...s, learning: { ...s.learning, journal: { m2: 'I tend to trust written documents too much.' } } };
    saveState(kv, s);
    expect(loadState(kv, c).learning).toEqual(s.learning);
    const { learning: _l, ...old } = s;
    kv.setItem(stateKey(c.id), JSON.stringify(old));
    expect(loadState(kv, c).learning).toEqual(initialState(c).learning);
  });

  it('reflections appear in the exported report', () => {
    let s = initialState(c);
    s = { ...s, learning: { ...s.learning, journal: { m3: 'The exception path was missing from my first map.' } } };
    const md = findingsToMarkdown(buildFindings(s, c, rubricKey));
    expect(md).toContain('## Learning journal');
    expect(md).toContain('The exception path was missing from my first map.');
  });
});
