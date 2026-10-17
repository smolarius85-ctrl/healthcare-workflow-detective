# Healthcare Workflow Detective

A fictional training simulation for practicing workflow discovery, process mapping, evidence evaluation, operational measurement and practical recommendations.

**Live site:** https://smolarius85-ctrl.github.io/healthcare-workflow-detective/

All organizations, people, records and policies are invented. No real patient data is used.

## Run it

```bash
npm install
npm run dev        # http://localhost:5178
npm test           # metric, data-integrity, feedback-rule, save/restore and export tests
npm run build      # type-check + production build into dist/
```

## Learning path (top-down)

The **🎓 Learn** tab teaches the fundamentals from the big picture down to detail:

1. **Big picture:** what healthcare process improvement is, and the improvement loop.
2. **Skills:** six modules (the improvement loop, discovery, evidence, workflow mapping, measurement, improvement & adoption).
3. **Concepts:** inside each module, seven steps: big idea → why it matters → key concepts (with “Go deeper”) → worked example → common traps → self-check → practice.
4. **Practice:** each module ends with a mission in the Juniper case. Its checklist ticks itself as you work, and a “skill in practice” banner on each case screen links back to the lesson.

Worked examples use a separate fictional clinic (Cedar Valley), so lessons never give away the Juniper case. Self-checks are never scored. Learning progress and reflections survive a case restart and appear in exports. Curriculum content lives in `src/content/curriculum.ts`; progress logic is in `src/engine/learning.ts`.

## Structure

| Path | What lives there |
| --- | --- |
| `src/case/types.ts` | Case content types (a case is pure data) |
| `src/case/vanishing-referral/` | Case 1: referral events, people, dialogue, evidence, workshop options, hints, explanation, rubric key |
| `src/engine/time.ts` | Timezone-independent business-hour and business-day arithmetic |
| `src/engine/metrics.ts` | All timeline metrics, measured from submission to first outreach attempt |
| `src/engine/mapEval.ts` | Concept-based process map evaluation |
| `src/engine/scoring.ts` | Transparent rule-based debrief |
| `src/engine/guidance.ts` | Progressive hints and the progress trail |
| `src/engine/exporter.ts` | Markdown / JSON findings |
| `src/state/` | Game state, pure transitions, localStorage persistence |
| `src/screens/`, `src/components/` | UI |

To add a case, author another `CaseDefinition` plus a `RubricKey` and pass it to `GameProvider` in `src/main.tsx`.

## Measurement conventions (case 1)

- One timezone: Juniper local time (UTC−05:00 throughout the sample period).
- Business days are Mon–Fri, 08:00–17:00. The sample contains no holidays.
- Business days are counted from the submission's business date. A submission after 17:00 or on a weekend counts from the next business day.
- Touch time only counts explicit work-session start/end pairs. Waiting time = elapsed business time − touch time.
- Events after the first outreach attempt are never used in calculations.
