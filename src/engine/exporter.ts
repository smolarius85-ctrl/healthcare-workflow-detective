import type { CaseDefinition, ProcessMap } from '../case/types';
import type { RubricKey } from '../case/vanishing-referral/rubric';
import { getNote, interviewedCharacters, type GameState } from '../state/gameState';
import { computeBaselines } from './baselines';
import { summarizeMap } from './mapEval';
import { scoreInvestigation } from './scoring';
import { modules } from '../content/curriculum';
import { moduleProgress } from './learning';

export const LANE_NAMES: Record<string, string> = {
  clinic: 'Clinic / front desk',
  coordination: 'Referral coordination',
  outreach: 'Patient outreach',
};

const FICTION = 'FICTIONAL PRACTICE WORK — produced in the Healthcare Workflow Detective training simulation. All organizations, people and records are invented.';

export interface Findings {
  label: string;
  case: { id: string; title: string; organization: string };
  notebook: string;
  exportedAt: string;
  progress: { locationsVisited: string[]; peopleInterviewed: string[]; questionsAsked: number; evidenceFound: string[]; hintsUsed: number };
  evidence: { id: string; title: string; source: string; pinned: boolean; tags: string[]; note: string }[];
  notebookNotes: string;
  processMaps: { documented: ProcessMap; observed: ProcessMap; documentedSummary: string[]; observedSummary: string[] };
  hypotheses: { id: string; text: string; status: string; confidence: number; supporting: string[]; contradicting: string[]; needs: string }[];
  recommendation: null | {
    submittedAt: string | null;
    actions: string[];
    problemStatement: string;
    supportingEvidence: string[];
    proposedChange: string;
    expectedBenefitPrediction: string;
    risksAndTradeoffs: string;
    pilotScope: string;
    affectedPeopleAndTraining: string;
    measures: { id: string; label: string; kind: string; baseline: string }[];
    measuresNote: string;
    unresolvedQuestions: string;
  };
  debrief: null | { dimension: string; level: string; met: string[]; notMet: string[] }[];
  learning: { module: string; percentComplete: number; reflection: string }[];
}

export function buildFindings(s: GameState, c: CaseDefinition, key: RubricKey, now = new Date()): Findings {
  const baselines = computeBaselines(c);
  const p = s.submittedProposal ?? s.proposal;
  const hasProposal = Boolean(s.submittedProposal) || p.problem.trim().length > 0 || p.actions.length > 0;
  const evidenceIds = [...new Set([...s.discoveredEvidence])];
  return {
    label: FICTION,
    case: { id: c.id, title: c.title, organization: c.orgName },
    notebook: s.notebookName || 'Untitled notebook',
    exportedAt: now.toISOString(),
    progress: {
      locationsVisited: s.visitedLocations.map((id) => c.locations.find((l) => l.id === id)?.name ?? id),
      peopleInterviewed: interviewedCharacters(s, c).map((id) => c.characters.find((x) => x.id === id)?.name ?? id),
      questionsAsked: s.askedQuestions.length,
      evidenceFound: evidenceIds,
      hintsUsed: s.hints.used,
    },
    evidence: evidenceIds.map((id) => {
      const e = c.evidence.find((x) => x.id === id)!;
      const n = getNote(s, id);
      return { id, title: e.title, source: e.source, pinned: n.pinned, tags: n.tags, note: n.note };
    }),
    notebookNotes: s.notebook,
    processMaps: {
      documented: s.maps.documented,
      observed: s.maps.observed,
      documentedSummary: summarizeMap(s.maps.documented, LANE_NAMES),
      observedSummary: summarizeMap(s.maps.observed, LANE_NAMES),
    },
    hypotheses: s.hypotheses.map((h) => ({ id: h.id, text: h.text, status: h.status, confidence: h.confidence, supporting: h.supporting, contradicting: h.contradicting, needs: h.needs })),
    recommendation: hasProposal
      ? {
        submittedAt: s.submittedAt,
        actions: p.actions.map((id) => c.recommendationOptions.find((o) => o.id === id)?.label ?? id),
        problemStatement: p.problem,
        supportingEvidence: p.evidence,
        proposedChange: p.change,
        expectedBenefitPrediction: p.benefit,
        risksAndTradeoffs: p.risks,
        pilotScope: [p.pilotClinic && `Pilot site: ${p.pilotClinic === 'ALL' ? 'All clinics at once' : c.clinics.find((x) => x.id === p.pilotClinic)?.name ?? p.pilotClinic}`, p.pilotScope].filter(Boolean).join(' — '),
        affectedPeopleAndTraining: p.people,
        measures: p.measures.map((id) => {
          const m = c.measureOptions.find((x) => x.id === id)!;
          return { id, label: m.label, kind: m.kind, baseline: baselines[id] ?? '' };
        }),
        measuresNote: p.measuresNote,
        unresolvedQuestions: p.unresolved,
      }
      : null,
    debrief: s.submittedProposal
      ? scoreInvestigation(s, c, key).map((d) => ({
        dimension: d.title,
        level: d.levelLabel,
        met: d.criteria.filter((x) => x.met).map((x) => x.label),
        notMet: d.criteria.filter((x) => !x.met).map((x) => x.label),
      }))
      : null,
    learning: modules.map((m) => ({
      module: `Module ${m.number}: ${m.title}`,
      percentComplete: Math.round(moduleProgress(m, s, c).share * 100),
      reflection: s.learning.journal[m.id] ?? '',
    })),
  };
}

const block = (text: string) => (text.trim() ? text.trim() : '_(not written yet)_');

export function findingsToMarkdown(f: Findings): string {
  const L: string[] = [];
  L.push(`# ${f.case.title} — Investigation Report`, '');
  L.push(`> **${f.label}**`, '');
  L.push(`- **Organization:** ${f.case.organization} (fictional)`);
  L.push(`- **Notebook:** ${f.notebook}`);
  L.push(`- **Exported:** ${f.exportedAt}`);
  L.push(`- **Locations visited:** ${f.progress.locationsVisited.join(', ') || 'none'}`);
  L.push(`- **People interviewed:** ${f.progress.peopleInterviewed.join(', ') || 'none'} (${f.progress.questionsAsked} questions)`);
  L.push(`- **Hints used:** ${f.progress.hintsUsed} (never scored)`, '');

  L.push('## Process map summary', '', '### Observed workflow', '', '```', ...f.processMaps.observedSummary, '```', '');
  L.push('### Documented workflow (per SOP)', '', '```', ...f.processMaps.documentedSummary, '```', '');

  L.push('## Hypotheses', '');
  for (const h of f.hypotheses) {
    L.push(`### ${h.text}`, '');
    L.push(`- **Status:** ${h.status}${h.confidence ? ` · confidence ${h.confidence}/5` : ''}`);
    L.push(`- **Supporting evidence:** ${h.supporting.join(', ') || '—'}`);
    L.push(`- **Contradicting evidence:** ${h.contradicting.join(', ') || '—'}`);
    L.push(`- **Still need to know:** ${h.needs.trim() || '—'}`, '');
  }

  L.push('## Recommendation', '');
  const r = f.recommendation;
  if (!r) L.push('_No recommendation drafted yet._', '');
  else {
    L.push(r.submittedAt ? `_Submitted ${r.submittedAt}_` : '_Draft — not yet submitted_', '');
    L.push(`**Actions:** ${r.actions.join('; ') || '—'}`, '');
    L.push('### Problem statement', '', block(r.problemStatement), '');
    L.push('### Supporting evidence', '', r.supportingEvidence.length ? r.supportingEvidence.join(', ') : '—', '');
    L.push('### Proposed change', '', block(r.proposedChange), '');
    L.push('### Expected benefit (prediction, not a result)', '', block(r.expectedBenefitPrediction), '');
    L.push('### Risks and tradeoffs', '', block(r.risksAndTradeoffs), '');
    L.push('### Pilot scope', '', block(r.pilotScope), '');
    L.push('### Affected people and training needs', '', block(r.affectedPeopleAndTraining), '');
    L.push('### Measures of success', '');
    if (r.measures.length) for (const m of r.measures) L.push(`- **${m.label}** (${m.kind}) — baseline from sample: ${m.baseline}`);
    else L.push('—');
    if (r.measuresNote.trim()) L.push('', r.measuresNote.trim());
    L.push('', '### Open questions', '', block(r.unresolvedQuestions), '');
  }

  L.push('## Evidence notebook', '');
  for (const e of f.evidence) {
    L.push(`- **${e.id} — ${e.title}** (${e.source})${e.pinned ? ' 📌' : ''}${e.tags.length ? ` · tags: ${e.tags.join(', ')}` : ''}`);
    if (e.note.trim()) L.push(`  - Note: ${e.note.trim()}`);
  }
  if (f.notebookNotes.trim()) L.push('', '### Notebook notes', '', f.notebookNotes.trim());
  L.push('');

  if (f.debrief) {
    L.push('## Debrief (rule-based feedback)', '');
    for (const d of f.debrief) {
      L.push(`### ${d.dimension}: ${d.level}`, '');
      for (const m of d.met) L.push(`- ✓ ${m}`);
      for (const m of d.notMet) L.push(`- ○ ${m}`);
      L.push('');
    }
  }
  L.push('## Learning journal', '');
  for (const l of f.learning) {
    L.push(`### ${l.module} — ${l.percentComplete}% complete`, '', l.reflection.trim() || '_No reflection yet._', '');
  }
  L.push('---', '', `_${f.label}_`, '');
  return L.join('\n');
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
