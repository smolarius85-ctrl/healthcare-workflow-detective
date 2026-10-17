import type {
  Briefing, CaseExplanation, HintTopic, HypothesisSeed, MeasureOption, ProcessMap, RecommendationOption,
} from '../types';

export const briefing: Briefing = {
  directorId: 'celeste',
  directorMessage:
    "Patients keep calling because they haven't heard about their referrals. Our teams are working hard, but nobody agrees on where things are getting stuck. Before we buy another tool or add another approval, help us understand what is happening.",
  boundary: [
    'Investigate the administrative journey from referral submission to the first patient outreach attempt.',
    'Out of scope: clinical decisions, diagnosis, treatment, and medical urgency. You will not judge whether any referral was clinically appropriate.',
    'All people, records, systems and policies are invented for training.',
  ],
  target:
    'Juniper aims to make the first outreach attempt within 3 business days of submission. This is an invented internal target — not a healthcare standard or legal requirement.',
  howToInvestigate: [
    { title: 'Observe', text: 'Visit locations on the map. Look at forms, documents and system records.' },
    { title: 'Ask', text: 'Interview staff. Open questions and "how would we check that?" questions tend to reveal the most.' },
    { title: 'Collect', text: 'Pin evidence, tag it, and write notes. Keep what people say separate from what records show.' },
    { title: 'Map', text: 'Sketch the documented and the observed workflow. Mark waits, handoffs and owners.' },
    { title: 'Hypothesize & test', text: 'Link evidence for and against each explanation. Use the referral timelines to test claims.' },
    { title: 'Recommend & reflect', text: 'Propose a change you can pilot and measure — and say what is still unknown.' },
  ],
};

export const hypothesisSeeds: HypothesisSeed[] = [
  { id: 'H-staffing', text: 'There are not enough coordinators.' },
  { id: 'H-ownership', text: 'Missing information creates a queue nobody consistently owns.' },
  { id: 'H-status', text: 'The status field hides which referrals are ready.' },
  { id: 'H-automation', text: 'A new automation would solve the problem.' },
  { id: 'H-outreach', text: 'Outreach staff take too long to make the first call.' },
];

export const recommendationOptions: RecommendationOption[] = [
  { id: 'standardize-fields', label: 'Standardize required administrative fields', description: 'One set of required fields across portal, fax and email intake.' },
  { id: 'exception-ownership', label: 'Define exception ownership', description: 'Name who owns a referral while information is missing, and by when they act.' },
  { id: 'separate-statuses', label: 'Separate received, incomplete, ready and outreach-attempted statuses', description: 'Make readiness visible to clinics, patient experience, and outreach.' },
  { id: 'exception-routine', label: 'Establish an exception review routine', description: 'A regular, visible sweep of the exceptions queue.' },
  { id: 'reduce-double-entry', label: 'Reduce duplicate entry', description: 'Cut down re-keying between ReferralTrack and OutreachBoard.' },
  { id: 'pilot-one-clinic', label: 'Pilot a change at one clinic', description: 'Try the change on a small scope before spreading it.' },
  { id: 'job-aid', label: 'Create a staff job aid', description: 'Updated checklist or quick guide for intake and exceptions.' },
  { id: 'add-staffing', label: 'Add staffing', description: 'Add coordinator capacity or fill a vacant role.' },
  { id: 'automate-stable-step', label: 'Automate a stable step after validation', description: 'Automate only a step that is already well defined and working.' },
  { id: 'gather-evidence', label: 'Gather additional evidence', description: 'Collect more data before or alongside the change.' },
];

export const measureOptions: MeasureOption[] = [
  { id: 'm-target-rate', label: 'Share of referrals with first outreach within 3 business days', kind: 'outcome', description: 'The internal target, measured from submission to first outreach attempt.' },
  { id: 'm-median-days', label: 'Median business days from submission to first outreach', kind: 'outcome', description: 'Typical journey length; less distorted by a few extreme cases than an average.' },
  { id: 'm-exception-days', label: 'Business days on the exception path', kind: 'process', description: 'Time from missing-info flag to ready-for-outreach.' },
  { id: 'm-owner-assigned', label: 'Exceptions with a named owner within 1 business day', kind: 'adoption', description: 'Whether the new ownership rule is actually being used.' },
  { id: 'm-incomplete-rate', label: 'Incomplete referral rate by clinic', kind: 'process', description: 'Share of referrals arriving without required administrative fields.' },
  { id: 'm-duplicates', label: 'Duplicate submissions per four weeks', kind: 'process', description: 'Resubmissions that create extra records to reconcile.' },
  { id: 'm-patient-calls', label: 'Patient referral-status calls', kind: 'outcome', description: 'Calls to Patient Experience asking about referral progress. Only captures patients who call.' },
  { id: 'm-touch-time', label: 'Coordinator touch time per referral', kind: 'balancing', description: 'Checks that the change does not quietly add work. Logged sessions may undercount.' },
  { id: 'm-frontdesk-time', label: 'Front desk time per referral submission', kind: 'balancing', description: 'Checks that stricter intake does not shift burden onto clinics. Not measured today.' },
  { id: 'm-status-use', label: 'Referrals moved to the correct new status within 1 business day', kind: 'adoption', description: 'Whether staff are using new statuses as intended.' },
];

export const hintTopics: HintTopic[] = [
  {
    id: 'start',
    levels: [
      'Where would a referral first become visible to someone at Juniper?',
      'The people who send and receive referrals are a natural starting point.',
      'Open the Organization Map and visit the Referral Coordination Hub. Ask Dev Okafor to walk you through the last referral he handled.',
    ],
  },
  {
    id: 'more-voices',
    levels: [
      'Whose view of the referral journey have you not heard yet?',
      'Each role sees a different slice: sending, reviewing, measuring, and hearing from patients.',
      'Visit the Clinic Front Desk (Marisol Reyes) and the Systems and Reporting Desk (Tomás Lindqvist). Compare how each describes the same steps.',
    ],
  },
  {
    id: 'exceptions',
    levels: [
      'What happens to a referral that cannot move forward yet?',
      'Ask someone what happens when required information is missing — and who acts next.',
      'Ask Dev Okafor "What happens when information is missing?" and "How do you know who owns the next step?" Then inspect the exceptions snapshot (E-08) at the hub.',
    ],
  },
  {
    id: 'status',
    levels: [
      'Do different teams mean the same thing when they use the same word?',
      'Compare how the front desk describes a status with how the system defines it.',
      'Ask Marisol Reyes "What does this status mean to your team?", then read the status glossary (E-06) at the Systems and Reporting Desk.',
    ],
  },
  {
    id: 'timeline',
    levels: [
      'People have offered different explanations. What could check them?',
      'The referral records let you compare groups of referrals rather than relying on impressions.',
      'Open Referral Timelines and compare complete vs. incomplete referrals. Then try the comparison by week to test the staffing explanation.',
    ],
  },
  {
    id: 'map',
    levels: [
      'Does your observed map show what happens when a referral is not ready?',
      'Real workflows usually have a decision point and a path for exceptions — and someone (or no one) who owns that path.',
      'In the Process Mapper, add a decision such as "Complete?", a queue for referrals waiting on information, and mark that queue’s owner as unknown if the evidence suggests it.',
    ],
  },
  {
    id: 'link-evidence',
    levels: [
      'Which pieces of evidence bear on each explanation?',
      'A hypothesis gets stronger or weaker as you connect specific evidence to it.',
      'Open the Hypothesis Desk and attach at least two pieces of evidence to a hypothesis, choosing whether each supports or contradicts it.',
    ],
  },
  {
    id: 'contradict',
    levels: [
      'Is there anything that cuts against your favorite explanation?',
      'Strong reasoning considers evidence on both sides — including for explanations you suspect are wrong.',
      'For the staffing hypothesis, compare the week one coordinator was on leave with the other weeks (A-05). For the outreach hypothesis, look at how long referrals waited on the outreach worklist (A-04, E-15).',
    ],
  },
  {
    id: 'recommend',
    levels: [
      'If you could change one thing first, what would you want to learn from it?',
      'A good proposal is small enough to pilot, measured against a baseline, and honest about tradeoffs.',
      'Open the Recommendation Workshop. Pick a focused change, cite evidence IDs, choose at least one outcome and one balancing measure, and list what you still don’t know.',
    ],
  },
  {
    id: 'reflect',
    levels: [
      'What would you do differently on the next case?',
      'The debrief separates five skills; each one has specific suggestions.',
      'Open the Debrief, read the feedback for each dimension, and decide whether to reveal the case explanation or revise first.',
    ],
  },
];

export const explanation: CaseExplanation = {
  summary:
    'Referrals were not vanishing. Complete referrals mostly moved through intake and outreach within the target. Most of the delay sat in waiting — especially on the exception path, where referrals missing administrative information entered a shared folder that no role clearly owned, while the status shown to everyone else still said "Received." People compensated with private lists, reminders and resubmissions, which added work without restoring visibility. No single employee explains the pattern.',
  contributors: [
    { title: 'Inconsistent intake formats', text: 'Three clinics use three formats with different required fields. The fax form marks coverage as optional; the portal accepts any text; the email template has no validation. Riverbend and Eastgate referrals arrived incomplete more often in this sample.', evidence: ['E-02', 'E-03', 'E-04', 'E-12', 'A-02'] },
    { title: 'Exception queue with unclear ownership', text: 'Flagged referrals waited in the Intake Exceptions folder with no assignee. The SOP names an Intake Lead, a role that was vacant. Chasing depended on whoever noticed — often only after a patient call or a duplicate.', evidence: ['E-01', 'E-05', 'E-08', 'E-09', 'E-11', 'A-01', 'A-04'] },
    { title: 'A status that hides readiness', text: '"Received" is set automatically when a record exists and stays unchanged when the missing-info flag is set. Clinics and Patient Experience read it as "moving." The SOP\'s "Ready" status was never built.', evidence: ['E-06', 'E-10', 'E-01', 'E-13'] },
    { title: 'Two systems, re-keyed by hand', text: 'Every referral is re-typed from ReferralTrack into OutreachBoard. Outreach cannot see the exceptions folder at all. Re-keying is quick but adds a transcription risk (see the corrected number on RF-2414).', evidence: ['E-07', 'E-15', 'A-04'] },
    { title: 'Duplicates and private workarounds', text: 'Every duplicate in the sample was a resubmission of an incomplete original, and each one followed a patient call about that original. Personal spreadsheets and reminders kept some items moving but are invisible to others.', evidence: ['E-13', 'A-03', 'E-11', 'E-05'] },
  ],
  alternatives: [
    { title: 'Staffing', text: 'The week one coordinator was on leave did slow intake, and one complete referral missed the target that week. But incomplete referrals waited in every week, including fully staffed ones. Staffing contributes; it does not explain most of the delay. Whether filling the vacant intake lead role would fix ownership is unresolved.', evidence: ['E-09', 'E-14', 'A-05', 'A-01'] },
    { title: 'Slow outreach', text: 'Once referrals reached OutreachBoard, first attempts usually happened within hours. The outreach worklist stayed short. Outreach staff cannot act on referrals they cannot see.', evidence: ['E-15', 'A-04'] },
    { title: 'Automation as the fix', text: 'Automation could remove re-keying, but Northside’s portal still let incomplete data through, and a tool cannot decide who owns exceptions. Automating a stable step after the ownership and status design is settled is more defensible.', evidence: ['E-03', 'E-05', 'A-04'] },
  ],
  unresolved: [
    'Twenty original referrals over four weeks is a small sample; seasonal or monthly patterns are unknown.',
    'Logged touch time is likely a floor — staff sometimes skip the session timer.',
    'Why some exceptions were chased the same day (RF-2419) and others waited a week is not recorded.',
    'Whether the hub can look up coverage information itself, as the Riverbend checklist suggests, was never confirmed.',
    'Front desk time spent on referrals is not measured, so the burden of stricter intake on clinics is unknown.',
    'What happens after first outreach (scheduling, no-shows) is outside this investigation.',
  ],
};

const node = (id: string, label: string, lane: ProcessMap['nodes'][number]['lane'], col: number, kind: ProcessMap['nodes'][number]['kind'], workType: ProcessMap['nodes'][number]['workType'], owner: string) => ({
  id, label, lane, col, kind, workType, owner, evidence: [] as string[],
});

export const starterMaps: { documented: ProcessMap; observed: ProcessMap } = {
  documented: {
    nodes: [
      node('d1', 'Complete standard referral form', 'clinic', 0, 'step', 'work', 'Clinic front desk'),
      node('d2', 'Send form to hub', 'clinic', 1, 'handoff', 'work', 'Clinic front desk'),
      node('d3', 'Review within 1 business day', 'coordination', 2, 'step', 'work', 'Referral coordinator'),
      node('d4', 'Complete?', 'coordination', 3, 'decision', 'work', 'Referral coordinator'),
      node('d5', 'Set status: Ready', 'coordination', 4, 'step', 'work', 'Referral coordinator'),
      node('d6', 'Return to clinic', 'clinic', 4, 'handoff', 'wait', 'Intake lead'),
      node('d7', 'First outreach within 2 business days', 'outreach', 5, 'step', 'work', 'Outreach specialist'),
    ],
    edges: [
      { id: 'de1', from: 'd1', to: 'd2', label: '' },
      { id: 'de2', from: 'd2', to: 'd3', label: '' },
      { id: 'de3', from: 'd3', to: 'd4', label: '' },
      { id: 'de4', from: 'd4', to: 'd5', label: 'Yes' },
      { id: 'de5', from: 'd4', to: 'd6', label: 'No' },
      { id: 'de6', from: 'd5', to: 'd7', label: '' },
      { id: 'de7', from: 'd6', to: 'd1', label: 'Resubmit' },
    ],
  },
  observed: {
    nodes: [
      node('o1', 'Clinic submits referral', 'clinic', 0, 'step', 'work', 'Clinic front desk'),
      node('o2', 'Record shows "Received"', 'coordination', 1, 'queue', 'wait', ''),
      node('o3', 'Coordinator intake review', 'coordination', 2, 'step', 'work', 'Referral coordinator'),
      node('o4', 'Re-key into OutreachBoard', 'coordination', 3, 'step', 'work', 'Referral coordinator'),
      node('o5', 'Outreach worklist', 'outreach', 4, 'queue', 'wait', ''),
      node('o6', 'First outreach attempt', 'outreach', 5, 'step', 'work', 'Outreach specialist'),
    ],
    edges: [
      { id: 'oe1', from: 'o1', to: 'o2', label: '' },
      { id: 'oe2', from: 'o2', to: 'o3', label: '' },
      { id: 'oe3', from: 'o3', to: 'o4', label: '' },
      { id: 'oe4', from: 'o4', to: 'o5', label: '' },
      { id: 'oe5', from: 'o5', to: 'o6', label: '' },
    ],
  },
};
