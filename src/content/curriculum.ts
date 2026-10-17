/**
 * Top-down learning path. Content moves from the big picture to detail:
 *   Big idea → Why it matters → Key concepts → Go deeper → In action → Traps → Check → Practice.
 *
 * Worked examples use a separate fictional clinic (Cedar Valley Family Practice) so the
 * lessons teach transferable concepts without revealing the Juniper case explanation.
 */

export type MissionCriterion =
  | { type: 'visited'; min: number; label: string }
  | { type: 'interviewed'; min: number; label: string }
  | { type: 'questionStyle'; style: 'open' | 'probing' | 'verifying' | 'leading'; min: number; label: string }
  | { type: 'evidenceFound'; min: number; label: string }
  | { type: 'tagged'; min: number; label: string }
  | { type: 'taggedReported'; label: string }
  | { type: 'mapConcept'; concept: 'readinessDecision' | 'exceptionPath' | 'ownershipGap' | 'waitOnException' | 'reworkLoop' | 'evidenceAttached' | 'differsFromStarter'; label: string }
  | { type: 'hypothesesLinked'; min: number; label: string }
  | { type: 'contradicting'; min: number; label: string }
  | { type: 'analysis'; id: string; label: string }
  | { type: 'journeysViewed'; min: number; label: string }
  | { type: 'metricsExplained'; min: number; label: string }
  | { type: 'proposalSubmitted'; label: string }
  | { type: 'measureKinds'; kinds: string[]; label: string };

export interface Concept {
  id: string;
  title: string;
  summary: string;
  detail: string[];
  glossary?: string;
}

export interface CheckQuestion {
  id: string;
  prompt: string;
  options: { text: string; correct?: boolean; feedback: string }[];
}

export interface LearnModule {
  id: string;
  number: number;
  title: string;
  skill: string;
  icon: string;
  /** Debrief dimension this module builds. */
  dimension: 'discovery' | 'evidence' | 'workflow' | 'measurement' | 'practicality' | null;
  oneLiner: string;
  answers: string[];
  whyItMatters: string[];
  concepts: Concept[];
  example: { title: string; intro: string; beats: { text: string; concept: string }[] };
  traps: { trap: string; instead: string }[];
  checks: CheckQuestion[];
  mission: { screen: 'map' | 'interview' | 'evidence' | 'mapper' | 'timelines' | 'hypotheses' | 'recommend'; title: string; brief: string; criteria: MissionCriterion[]; reflection: string };
}

export const STEPS = [
  { id: 'idea', label: 'The big idea' },
  { id: 'why', label: 'Why it matters' },
  { id: 'concepts', label: 'Key concepts' },
  { id: 'example', label: 'See it in action' },
  { id: 'traps', label: 'Common traps' },
  { id: 'check', label: 'Check yourself' },
  { id: 'practice', label: 'Practice in the case' },
] as const;

export const BIG_PICTURE = {
  title: 'What is healthcare process improvement?',
  summary:
    'Healthcare organizations run on workflows — chains of steps, people, systems and handoffs that turn a request into a result. Process improvement is the discipline of understanding how that work really flows, finding where and why it gets stuck, and testing changes that make it better without making something else worse.',
  roles: [
    { title: 'Process improvement', text: 'Understand current performance, find causes, test changes, measure results.' },
    { title: 'Service design', text: 'See the whole experience — patients and staff — across every touchpoint and team.' },
    { title: 'Implementation', text: 'Turn a good idea into everyday practice: training, roles, pilots, adoption.' },
    { title: 'Workflow automation', text: 'Let systems do stable, well-defined steps so people can focus on judgment and exceptions.' },
  ],
  zoomLevels: [
    { level: 'Big picture', text: 'The improvement loop and the mindset behind it.' },
    { level: 'Skills', text: 'Five skills that move you around the loop.' },
    { level: 'Concepts', text: 'The vocabulary and tools inside each skill.' },
    { level: 'Practice', text: 'Missions in the Juniper case that use each skill for real.' },
  ],
};

const CV = 'Cedar Valley';

export const modules: LearnModule[] = [
  /* ===================================================================== */
  {
    id: 'm0', number: 0, title: 'The Improvement Loop', skill: 'Seeing the whole', icon: '🧭', dimension: null,
    oneLiner: 'Improvement is a loop — understand the current state, find causes, test a change, measure, and learn — not a single leap from problem to solution.',
    answers: [
      'Where do I start when someone says “things are slow”?',
      'How do the skills in this app fit together?',
      'What mindset separates improvement work from firefighting?',
    ],
    whyItMatters: [
      'Most failed improvement efforts skip straight from a complaint to a solution: buy a tool, add a step, hire someone. When the real cause is somewhere else, the problem returns — now with more cost and complexity.',
      'A loop protects you from that. Each pass builds understanding, and every change is treated as a hypothesis that has to earn its place with evidence.',
      'Leaders hire improvement specialists for exactly this: to replace “nobody agrees where it’s stuck” with a shared, evidence-based picture.',
    ],
    concepts: [
      {
        id: 'loop', title: 'The loop: Observe → Ask → Collect → Map → Hypothesize → Test → Recommend → Reflect',
        summary: 'Each stage feeds the next, and you can circle back any time new evidence appears.',
        detail: [
          'Observe and Ask build an initial picture from places, documents and people.',
          'Collect and Map turn that picture into something concrete: evidence you can cite and a map you can point at.',
          'Hypothesize and Test turn opinions into claims you can check against records.',
          'Recommend and Reflect produce a change you can pilot — and lessons for the next loop.',
          'Many organizations use a similar cycle called Plan–Do–Study–Act (PDSA). The names differ; the idea of small, measured learning cycles is the same.',
        ],
        glossary: 'pdsa',
      },
      {
        id: 'states', title: 'Current state vs. future state',
        summary: 'First describe how work happens today, honestly. Only then design how it should happen.',
        detail: [
          'The current state is what really happens — including workarounds, waiting and exceptions. It often differs from the official procedure.',
          'The future state is a proposal. It should be traceable to problems you saw in the current state.',
          'Jumping to the future state before understanding the current state is the most common improvement mistake.',
        ],
        glossary: 'current-state',
      },
      {
        id: 'systems', title: 'Systems, not individuals',
        summary: 'Most delays come from how work is designed — handoffs, rules, tools — not from someone working badly.',
        detail: [
          'When capable people get poor results, look at the system they work in: unclear ownership, confusing tools, missing information.',
          'Blaming individuals makes people defensive and hides the information you need.',
          'Workarounds (private lists, reminders, resubmitting) are signals that the system is not meeting people’s needs.',
        ],
      },
      {
        id: 'waiting', title: 'Waiting is the hidden cost',
        summary: 'In most administrative workflows, items spend far more time waiting than being worked on.',
        detail: [
          'Touch time is when someone actively works on an item. Elapsed time is start to finish. The gap is waiting.',
          'Making people work faster rarely helps if 95% of the time is waiting in queues or between handoffs.',
          'So improvement work often focuses on where items wait and why — not on speeding up the work itself.',
        ],
        glossary: 'touch-time',
      },
      {
        id: 'small-tests', title: 'Small tests before big changes',
        summary: 'A predicted benefit is a hypothesis. Pilot it small, measure it, then decide.',
        detail: [
          'Small tests are cheaper to undo and teach you faster.',
          'Define in advance what you will measure and what would make you stop or expand.',
          'Even a well-supported change can have side effects — measure those too.',
        ],
        glossary: 'pilot',
      },
    ],
    example: {
      title: `${CV} Family Practice: the slow records requests`,
      intro: `${CV} (fictional) aims to send patients copies of their medical records within 5 business days. Complaints are rising. The manager believes the records clerk is slow and has been offered a document-scanning tool. Here is the whole loop at a glance — later modules zoom into each part.`,
      beats: [
        { text: 'Observe & Ask: the investigator visits the front desk and records office and talks with the clerk, the manager and a front desk colleague. Everyone has a different explanation.', concept: 'loop' },
        { text: 'Map: requests arrive by portal, mail and walk-in form. About a third arrive without the required signed authorization and are mailed back — then wait for the patient to return them.', concept: 'states' },
        { text: 'Test: the request log shows actual processing takes about 20 minutes per request, but the median request takes 8 business days. Most of that time is waiting — including for a weekly Thursday processing batch, because the clerk covers the front desk Monday to Wednesday.', concept: 'waiting' },
        { text: 'Recommend: instead of blaming the clerk or buying a scanner, the investigator proposes an e-signature on the portal form and a short daily processing block — piloted for portal requests first.', concept: 'systems' },
        { text: 'Reflect: the predicted benefit is stated as a prediction, with measures and a list of open questions (mail requests are still unsolved).', concept: 'small-tests' },
      ],
    },
    traps: [
      { trap: 'Starting with the solution someone already wants (“we need the new tool”).', instead: 'Treat proposed solutions as hypotheses. Ask what problem they would solve and check whether that problem is the main one.' },
      { trap: 'Looking only at the official procedure.', instead: 'Map what actually happens, then compare it with the procedure. The gaps are often where the trouble lives.' },
      { trap: 'Concluding that someone is slow.', instead: 'Ask where work waits and why. Look for design causes before people causes.' },
    ],
    checks: [
      {
        id: 'm0-q1',
        prompt: 'A director says, “Referrals are slow; let’s buy an automation tool.” What is the best first move for an improvement specialist?',
        options: [
          { text: 'Start evaluating vendors so the tool is ready sooner.', feedback: 'This skips understanding. If the delay comes from something a tool doesn’t touch, the money is wasted.' },
          { text: 'Understand the current state and where time is going, then judge whether the tool addresses it.', correct: true, feedback: 'Yes. The tool becomes one hypothesis among several, tested against evidence.' },
          { text: 'Ask staff to work faster until the tool arrives.', feedback: 'If most time is waiting, working faster changes little — and it signals blame.' },
        ],
      },
      {
        id: 'm0-q2',
        prompt: 'A request has 25 minutes of touch time and 6 business days of elapsed time. What does that suggest?',
        options: [
          { text: 'Staff need to work faster on each request.', feedback: '25 minutes is a tiny share of 6 days. Speeding up the work barely changes the total.' },
          { text: 'Most of the time is waiting, so look at queues and handoffs.', correct: true, feedback: 'Right. The biggest opportunity is usually in reducing waiting.' },
          { text: 'The data must be wrong.', feedback: 'This pattern is very common in administrative workflows. Check data quality, but don’t dismiss it.' },
        ],
      },
    ],
    mission: {
      screen: 'map', title: 'Get your bearings at Juniper',
      brief: 'Re-read the briefing, then visit at least two locations and talk to one person. Don’t try to solve anything yet — just notice who touches a referral and where it might wait.',
      criteria: [
        { type: 'visited', min: 2, label: 'Visit at least two locations' },
        { type: 'interviewed', min: 1, label: 'Talk to at least one person' },
      ],
      reflection: 'In your own words: what is Juniper asking you to understand, and what is out of scope?',
    },
  },

  /* ===================================================================== */
  {
    id: 'm1', number: 1, title: 'Discovery: Asking Good Questions', skill: 'Discovery', icon: '🔍', dimension: 'discovery',
    oneLiner: 'Discovery is the skill of learning how work really happens — by going to where the work is, hearing several perspectives, and asking questions that invite detail and verification.',
    answers: [
      'Who should I talk to, and in what order?',
      'Which questions produce useful information — and which don’t?',
      'How do I get from someone’s story to something I can check?',
    ],
    whyItMatters: [
      'Every later step depends on discovery. A map, a metric or a recommendation built on a partial picture will be confidently wrong.',
      'Each person sees only part of a workflow. The front desk sees the start, a coordinator sees the middle, patient experience hears the end. The full picture only appears when you combine them.',
      'Good questions also build trust: people share more when they feel their expertise is respected and nobody is hunting for a culprit.',
    ],
    concepts: [
      {
        id: 'gemba', title: 'Go where the work happens',
        summary: 'Visit the places, look at the real forms and screens, and watch actual examples — not just meeting-room summaries.',
        detail: [
          'Lean practitioners call this “going to the gemba” — the place where value is created.',
          'Artifacts on desks (checklists, sticky notes, spreadsheets) often reveal more than anything people volunteer.',
          'Ask to see a specific recent example. Real cases expose details that general descriptions smooth over.',
        ],
      },
      {
        id: 'vantage', title: 'Every role has a vantage point',
        summary: 'People are reliable about what they directly see, and less reliable about other teams’ work.',
        detail: [
          'Map who touches the work: who sends it, who receives it, who measures it, who hears complaints about it, who decides on changes.',
          'When accounts conflict, that’s information — often a sign of a handoff where meaning changes.',
          'Leaders know the intent; frontline staff know the reality. You need both.',
        ],
      },
      {
        id: 'question-types', title: 'Four kinds of questions',
        summary: 'Open questions invite stories, probing questions follow a thread, verifying questions test claims, leading questions suggest an answer.',
        detail: [
          'Open: “Walk me through the last one you handled.” Best for starting a conversation and hearing the real sequence.',
          'Probing: “How do you know who owns the next step?” Best for digging into handoffs, definitions and exceptions.',
          'Verifying: “Can you show me an example?” or “What would I need to check before concluding that?” Moves from opinion toward evidence.',
          'Leading: “So the problem is staffing, right?” Invites agreement and closes off other explanations. Rephrase it as an open question.',
        ],
        glossary: 'open-question',
      },
      {
        id: 'exceptions', title: 'Ask about the exceptions',
        summary: 'The “normal path” is usually fine. Delays hide in what happens when something is missing, wrong or unusual.',
        detail: [
          '“What happens when information is missing?” is one of the most productive questions in administrative work.',
          'Also ask what changes on a busy day. Pressure reveals workarounds.',
          'Notice words like “usually”, “sometimes” and “whoever has time” — they point to unclear rules.',
        ],
      },
    ],
    example: {
      title: `Discovery at ${CV}`,
      intro: 'The investigator interviews three people about records requests.',
      beats: [
        { text: 'Open: “Walk me through the last request you processed.” The clerk describes checking the signature, pulling the chart, redacting and sending — about 20 minutes.', concept: 'question-types' },
        { text: 'Exceptions: “What happens when the signature is missing?” — “We mail the form back. Then we wait. Some never come back.”', concept: 'exceptions' },
        { text: 'Vantage point: the front desk says patients call asking about requests “that the records office has had for weeks.” The clerk says many of those were never signed. Both are sincere; they see different parts.', concept: 'vantage' },
        { text: 'Go and see: on the clerk’s desk is a wire tray labeled “Waiting for signature” — and a handwritten list of requests to chase.', concept: 'gemba' },
        { text: 'Verifying: “What would I need to check before concluding that most delays are unsigned forms?” — “The request log has a date for each step. You could compare signed and unsigned.”', concept: 'question-types' },
      ],
    },
    traps: [
      { trap: 'Interviewing only managers or only one team.', instead: 'Talk to people at each stage, including those who hear complaints.' },
      { trap: 'Asking leading questions to confirm what you already suspect.', instead: 'Ask open questions, and specifically ask what would prove your idea wrong.' },
      { trap: 'Treating a sincere account as an established fact.', instead: 'Record it as a reported statement and look for a record that confirms or challenges it.' },
    ],
    checks: [
      {
        id: 'm1-q1',
        prompt: 'Which question is most likely to reveal where work gets stuck?',
        options: [
          { text: '“Is the backlog because you’re short-staffed?”', feedback: 'Leading: it proposes the answer. You may get agreement rather than information.' },
          { text: '“What happens when something required is missing?”', correct: true, feedback: 'Yes — exception paths are where delays most often hide.' },
          { text: '“Do you like the current system?”', feedback: 'Opinions about a system are useful context, but this won’t show you where items wait.' },
        ],
      },
      {
        id: 'm1-q2',
        prompt: 'Two staff members give conflicting descriptions of the same step. What should you do?',
        options: [
          { text: 'Decide who is more senior and go with their version.', feedback: 'Seniority doesn’t determine accuracy, and each person may be right about what they see.' },
          { text: 'Treat the conflict as a clue — look for a handoff or definition that differs — and check records.', correct: true, feedback: 'Exactly. Conflicts often mark the spot where meaning changes between teams.' },
          { text: 'Ignore both accounts as unreliable.', feedback: 'Both are useful evidence about each vantage point. Don’t discard them; triangulate.' },
        ],
      },
      {
        id: 'm1-q3',
        prompt: '“Can you show me an example?” is best described as:',
        options: [
          { text: 'An open question', feedback: 'Close — it invites detail, but its main purpose is to move from a description to something you can examine.' },
          { text: 'A verifying question', correct: true, feedback: 'Right. It turns a description into an artifact or case you can inspect yourself.' },
          { text: 'A leading question', feedback: 'It doesn’t suggest an answer, so it isn’t leading.' },
        ],
      },
    ],
    mission: {
      screen: 'map', title: 'Hear three vantage points',
      brief: 'Interview at least three people in different roles. With each, try one open question, one probing question, and one verifying question. Notice where their accounts differ.',
      criteria: [
        { type: 'interviewed', min: 3, label: 'Interview three different people' },
        { type: 'questionStyle', style: 'open', min: 3, label: 'Ask at least three open questions' },
        { type: 'questionStyle', style: 'probing', min: 2, label: 'Ask at least two probing questions' },
        { type: 'questionStyle', style: 'verifying', min: 2, label: 'Ask at least two verifying questions' },
      ],
      reflection: 'Where did two people describe the same thing differently? What might explain the difference?',
    },
  },

  /* ===================================================================== */
  {
    id: 'm2', number: 2, title: 'Evidence: What Do We Actually Know?', skill: 'Evidence discipline', icon: '🧾', dimension: 'evidence',
    oneLiner: 'Evidence discipline means knowing what kind of evidence you hold, testing explanations against evidence on both sides, and being honest about how confident you are.',
    answers: [
      'Is this a fact, someone’s view, or my own guess?',
      'How do I weigh several competing explanations?',
      'How confident should I be — and what would change my mind?',
    ],
    whyItMatters: [
      'Workplaces are full of confident, reasonable, conflicting explanations. Without discipline, the loudest or most senior one wins.',
      'Leaders need to know how sure you are. A recommendation that hides uncertainty can lead to an expensive change built on a guess.',
      'Fair handling of evidence also protects people: it prevents an individual from being blamed on the strength of an impression.',
    ],
    concepts: [
      {
        id: 'kinds', title: 'Three kinds of evidence',
        summary: 'Observations (records, documents, things you saw), reported statements (what people tell you), and inferences (what you conclude).',
        detail: [
          'Observation: a timestamp in a system log, the fields on a form, a schedule. Shows what was recorded — not why.',
          'Reported statement: “We usually chase those within a day.” Valuable, sincere, but filtered through one vantage point and memory.',
          'Inference: “So the delay must be the missing signatures.” This is your hypothesis — keep it labeled as one.',
          'An interpretive document (a manager’s summary, a message thread) contains opinions even if it is written down.',
        ],
      },
      {
        id: 'hypotheses', title: 'Hold several hypotheses at once',
        summary: 'Write each explanation as a hypothesis and link evidence that supports or contradicts it.',
        detail: [
          'Good hypotheses are specific and testable: “Unsigned requests wait longest” rather than “the process is broken.”',
          'Include the explanations other people believe, even if you doubt them — and test them fairly.',
          'Possible statuses: supported, weakened, or unresolved. “Unresolved” is a legitimate, honest answer.',
        ],
      },
      {
        id: 'triangulation', title: 'Triangulate',
        summary: 'A claim is stronger when different kinds of sources point the same way.',
        detail: [
          'Two people saying the same thing is good; a person’s account plus a system record plus a document is better.',
          'When sources disagree, investigate the disagreement rather than picking a side.',
        ],
        glossary: 'triangulation',
      },
      {
        id: 'disconfirm', title: 'Look for evidence against your favorite idea',
        summary: 'Confirmation bias makes us notice only what agrees with us. Deliberately search for contradicting evidence.',
        detail: [
          'Ask: “If my hypothesis were wrong, what would I expect to see?” Then look for it.',
          'A hypothesis that survives a real attempt to disprove it is much stronger.',
          'Partial truths are common: a factor can contribute without being the main cause.',
        ],
      },
      {
        id: 'confidence', title: 'Calibrated confidence',
        summary: 'Rate confidence based on the strength and variety of evidence, and write down what would change your mind.',
        detail: [
          'High confidence needs multiple independent sources and no strong contradictions.',
          'Small samples, missing data and single sources should lower confidence.',
          'Recording “what I still need to know” turns uncertainty into a plan.',
        ],
      },
    ],
    example: {
      title: `Weighing evidence at ${CV}`,
      intro: 'The investigator holds three hypotheses: the clerk is slow; unsigned forms cause delay; the weekly batch causes delay.',
      beats: [
        { text: 'The manager’s monthly note says “records staff can’t keep up.” Tagged as a reported/interpretive source — a sincere view, not a measurement.', concept: 'kinds' },
        { text: 'The request log (an observation) shows about 20 minutes of processing per request. That weakens “the clerk is slow.”', concept: 'disconfirm' },
        { text: 'Signed requests still take 6 business days on median, and almost all are processed on Thursdays. Clerk interview + schedule + log all point the same way: batching matters.', concept: 'triangulation' },
        { text: '“Unsigned forms cause delay” is supported, but it doesn’t explain the signed requests — so the investigator keeps both hypotheses rather than choosing one.', concept: 'hypotheses' },
        { text: 'Confidence: high for batching, medium for unsigned forms (only two months of data, mail dates unreliable). Still need: how often patients never return forms.', concept: 'confidence' },
      ],
    },
    traps: [
      { trap: 'Treating a written document as automatically factual.', instead: 'Ask whether it records events or someone’s interpretation of them.' },
      { trap: 'Only collecting evidence that supports your idea.', instead: 'Link contradicting evidence too. It makes your conclusion credible.' },
      { trap: 'Marking everything “supported” with high confidence.', instead: 'Reserve high confidence for claims backed by several kinds of evidence. Use “unresolved” honestly.' },
    ],
    checks: [
      {
        id: 'm2-q1',
        prompt: 'A manager’s weekly summary says, “The team is understaffed.” How should you classify it?',
        options: [
          { text: 'Observation — it’s a written document.', feedback: 'Being written down doesn’t make it an observation. It records a view.' },
          { text: 'Reported / interpretive — a sincere view to test.', correct: true, feedback: 'Yes. It’s useful evidence about how the manager sees things, and a hypothesis to test.' },
          { text: 'Irrelevant — opinions don’t count.', feedback: 'Opinions from experienced people are valuable leads. They just need checking.' },
        ],
      },
      {
        id: 'm2-q2',
        prompt: 'You believe Factor A explains most of the delay. What strengthens your case the most?',
        options: [
          { text: 'Three more people agreeing with you.', feedback: 'Helpful, but these are all the same kind of evidence.' },
          { text: 'A records comparison showing items with Factor A take much longer — after you looked for evidence against it.', correct: true, feedback: 'Yes: a different kind of evidence, plus a genuine attempt to disprove it.' },
          { text: 'Raising your confidence rating to 5.', feedback: 'Confidence should follow evidence, not lead it.' },
        ],
      },
    ],
    mission: {
      screen: 'evidence', title: 'Sort and weigh the evidence',
      brief: 'Tag at least four pieces of evidence, including at least one reported source. Then link evidence to at least two hypotheses — including at least one piece that contradicts a hypothesis.',
      criteria: [
        { type: 'evidenceFound', min: 6, label: 'Collect at least six pieces of evidence' },
        { type: 'tagged', min: 4, label: 'Tag at least four pieces of evidence' },
        { type: 'taggedReported', label: 'Tag at least one source as a reported statement' },
        { type: 'hypothesesLinked', min: 2, label: 'Link evidence to at least two hypotheses' },
        { type: 'contradicting', min: 1, label: 'Link at least one piece of contradicting evidence' },
      ],
      reflection: 'Which explanation did you find most appealing at first? What evidence cuts against it?',
    },
  },

  /* ===================================================================== */
  {
    id: 'm3', number: 3, title: 'Workflow Mapping: Making Work Visible', skill: 'Workflow understanding', icon: '🗺️', dimension: 'workflow',
    oneLiner: 'A workflow map turns invisible work into a picture everyone can point at — showing steps, decisions, handoffs, queues, owners and where items wait.',
    answers: [
      'What actually happens, step by step, across teams?',
      'Where does work change hands, wait, or loop back?',
      'Who owns each step — and where does nobody?',
    ],
    whyItMatters: [
      'People argue past each other when each holds a different mental picture. A shared map ends many of those arguments.',
      'Maps make waiting, handoffs and exceptions visible — the places where delays and errors concentrate.',
      'A good current-state map is the foundation for any redesign, requirement or automation.',
    ],
    concepts: [
      {
        id: 'swimlanes', title: 'Swimlanes show who does what',
        summary: 'Each horizontal lane is a role or team; cards are placed in the lane of whoever does the step.',
        detail: [
          'Every time the flow crosses a lane boundary, there is a handoff — a place where information and responsibility must transfer.',
          'Lanes make it obvious when one team depends on another’s timing.',
        ],
        glossary: 'handoff',
      },
      {
        id: 'building-blocks', title: 'Steps, decisions, queues and handoffs',
        summary: 'Four building blocks cover most administrative workflows.',
        detail: [
          'Step: someone does work (review, enter, call).',
          'Decision: the path splits (“Complete?” → yes / no). Label each outgoing arrow.',
          'Queue: items wait for someone to pick them up — an inbox, a folder, a tray, a worklist.',
          'Handoff: work moves to another person, team or system.',
        ],
        glossary: 'queue',
      },
      {
        id: 'exception-paths', title: 'Map the exception path, not just the happy path',
        summary: 'Show what happens when something is missing or wrong — including loops back to an earlier step.',
        detail: [
          'The happy path is usually documented and usually fast. Exceptions are often undocumented and slow.',
          'A loop back (return to sender, resubmit, re-review) is rework. Mark it clearly.',
        ],
        glossary: 'rework',
      },
      {
        id: 'work-wait', title: 'Mark work vs. waiting',
        summary: 'Distinguish steps where someone is actively working from places where items sit.',
        detail: [
          'Waiting often happens in queues, between handoffs, and while waiting for information from someone else.',
          'Batching — processing items in groups on a schedule — creates waiting even when everyone is busy.',
        ],
        glossary: 'batching',
      },
      {
        id: 'ownership', title: 'Ownership, including the gaps',
        summary: 'Record who owns each step. When nobody clearly does, mark it as unknown rather than guessing.',
        detail: [
          'Unowned queues are a classic source of delay: everyone assumes someone else is watching them.',
          'An honest “owner unknown” is a finding, not a failure of your map.',
        ],
      },
      {
        id: 'documented-observed', title: 'Documented vs. observed',
        summary: 'Keep two maps: what the procedure says and what you found. The differences are findings.',
        detail: [
          'Procedures go out of date as systems, roles and forms change.',
          'Steps in the procedure that no longer exist, or real steps missing from it, both matter.',
        ],
        glossary: 'current-state',
      },
    ],
    example: {
      title: `Mapping ${CV} records requests`,
      intro: 'Three lanes: Front desk, Records office, Patient.',
      beats: [
        { text: 'Front desk lane: “Receive request (portal, mail, walk-in)” → handoff to Records office.', concept: 'swimlanes' },
        { text: 'Records lane: decision “Signed authorization?” with arrows labeled Yes and No.', concept: 'building-blocks' },
        { text: 'No → “Mail form back to patient” → Patient lane: “Patient signs and returns” → loops back to the decision. That loop is rework.', concept: 'exception-paths' },
        { text: 'Yes → queue “Thursday batch tray” marked as waiting → step “Process and send” marked as work.', concept: 'work-wait' },
        { text: 'The “Waiting for signature” tray has no owner who follows up — marked owner unknown.', concept: 'ownership' },
        { text: 'The written procedure says “Process requests daily.” The observed map shows a weekly batch — a key finding.', concept: 'documented-observed' },
      ],
    },
    traps: [
      { trap: 'Mapping only the happy path.', instead: 'Add the decision where things split and follow the “no” branch.' },
      { trap: 'Copying the procedure and calling it the current state.', instead: 'Map what you observed; keep the documented version separate.' },
      { trap: 'Assigning an owner because one “should” exist.', instead: 'If evidence shows nobody reliably owns it, mark ownership unknown.' },
    ],
    checks: [
      {
        id: 'm3-q1',
        prompt: 'Items sit in a shared folder until someone happens to notice them. How should that appear on your map?',
        options: [
          { text: 'As a step owned by the whole team.', feedback: 'That hides the problem. “Whole team” usually means no one in particular.' },
          { text: 'As a queue, marked waiting, with ownership unknown.', correct: true, feedback: 'Yes — it’s a place where work waits, and the lack of a clear owner is the finding.' },
          { text: 'Leave it off; it isn’t a real step.', feedback: 'Queues are often where most of the time goes. They belong on the map.' },
        ],
      },
      {
        id: 'm3-q2',
        prompt: 'Why keep a documented map separate from an observed map?',
        options: [
          { text: 'So you can show the documented one to leadership.', feedback: 'Leadership needs to see the real current state.' },
          { text: 'Because the differences between them are themselves findings.', correct: true, feedback: 'Right. Drift between procedure and practice often points to the cause.' },
          { text: 'It doesn’t matter; they’re the same.', feedback: 'They frequently differ, especially after systems or roles change.' },
        ],
      },
    ],
    mission: {
      screen: 'mapper', title: 'Map the path nobody documented',
      brief: 'Edit Juniper’s observed workflow so it shows what happens when a referral isn’t ready. Add a decision, follow the “no” branch, mark waiting, record ownership honestly, and attach evidence.',
      criteria: [
        { type: 'mapConcept', concept: 'differsFromStarter', label: 'Edit the observed map' },
        { type: 'mapConcept', concept: 'readinessDecision', label: 'Add a readiness decision' },
        { type: 'mapConcept', concept: 'exceptionPath', label: 'Follow the exception path from that decision' },
        { type: 'mapConcept', concept: 'waitOnException', label: 'Mark waiting on the exception path' },
        { type: 'mapConcept', concept: 'evidenceAttached', label: 'Attach evidence to at least three cards' },
      ],
      reflection: 'Where does your observed map differ most from the documented one? Why might that gap exist?',
    },
  },

  /* ===================================================================== */
  {
    id: 'm4', number: 4, title: 'Measurement: Turning Time into Insight', skill: 'Measurement reasoning', icon: '📏', dimension: 'measurement',
    oneLiner: 'Measurement turns “it feels slow” into clear, defined numbers — so you can see where time goes, compare groups fairly, and tell later whether a change helped.',
    answers: [
      'Exactly what are we measuring, from when to when?',
      'Where does the time go — work or waiting?',
      'How will we know if a change was an improvement?',
    ],
    whyItMatters: [
      'Without a clear definition, two people can measure the “same” thing and get different answers — and argue about the wrong thing.',
      'Comparing groups (complete vs. incomplete, one site vs. another, one week vs. another) is how you test explanations with data.',
      'A baseline taken before a change is the only way to tell later whether the change made a difference.',
    ],
    concepts: [
      {
        id: 'operational-definition', title: 'Operational definitions',
        summary: 'Define each measure precisely: start event, end event, units, what is included and excluded.',
        detail: [
          'Example: “Business days from submission to first outreach attempt, counting Mon–Fri only, excluding duplicates.”',
          'Decide how to handle edge cases: after-hours submissions, weekends, holidays, items still open.',
          'Only use information available up to the end point, so later events don’t leak into the measure.',
        ],
        glossary: 'operational-definition',
      },
      {
        id: 'elapsed-touch', title: 'Elapsed, touch and waiting time',
        summary: 'Elapsed = start to finish. Touch = time actively worked. Waiting = elapsed minus touch.',
        detail: [
          'Only count touch time from explicit records of work (start/stop). Don’t guess it from gaps between unrelated events.',
          'Touch time is often under-recorded, so treat it as a minimum.',
          'Breaking elapsed time into stages shows where the waiting happens.',
        ],
        glossary: 'touch-time',
      },
      {
        id: 'median', title: 'Typical values: median vs. average',
        summary: 'The median is the middle value; it isn’t pulled around by a few extreme cases the way an average is.',
        detail: [
          'With delays, a few very slow items can make the average misleading.',
          'Report counts alongside rates (“12 of 20”), so readers see the sample size.',
        ],
        glossary: 'median',
      },
      {
        id: 'comparison', title: 'Compare groups to test explanations',
        summary: 'If a factor matters, items with it should look different from items without it.',
        detail: [
          'Stratify: split by site, type, completeness, week, or staffing level.',
          'Look for the comparison that would disprove a hypothesis, not only the one that would support it.',
          'Small samples can produce differences by chance. Treat them as signals, not proof.',
        ],
      },
      {
        id: 'family', title: 'A family of measures',
        summary: 'Outcome measures show results, process measures show whether steps work, balancing measures catch side effects, adoption measures show whether people use the new way.',
        detail: [
          'Outcome: % meeting the target. Process: days on the exception path. Balancing: staff time per item. Adoption: % of items handled the new way.',
          'One measure alone can mislead. A small family gives a fuller picture.',
        ],
        glossary: 'balancing-measure',
      },
      {
        id: 'baseline', title: 'Baselines and data quality',
        summary: 'Record current performance before changing anything, and note how trustworthy the data is.',
        detail: [
          'A baseline needs the same definition you’ll use later.',
          'Note known gaps: missing timestamps, under-recorded work, people who don’t complain.',
          'Plot results over time (a run chart) during a pilot to see whether change is real or noise.',
        ],
        glossary: 'baseline',
      },
    ],
    example: {
      title: `Measuring ${CV} records requests`,
      intro: 'The request log has a timestamp for each step and explicit processing start/stop entries.',
      beats: [
        { text: 'Definition: business days from request received to records sent, Mon–Fri, excluding requests withdrawn by the patient.', concept: 'operational-definition' },
        { text: 'Median elapsed: 8 business days. Median logged processing: 20 minutes. Waiting is nearly all of the elapsed time.', concept: 'elapsed-touch' },
        { text: 'One request took 41 days (the patient moved). The average is 11 days but the median is 8 — the median describes the typical request better.', concept: 'median' },
        { text: 'Comparing signed vs. unsigned at arrival: 6 vs. 14 business days median. Comparing by weekday of arrival shows Friday arrivals wait longest — consistent with the Thursday batch.', concept: 'comparison' },
        { text: 'Pilot measures: % within 5 business days (outcome), days waiting for batch (process), front desk wait time while the clerk processes daily (balancing), % portal requests e-signed (adoption).', concept: 'family' },
        { text: 'Baseline: 38% within 5 days over two months. Caveat: mail arrival dates are stamped inconsistently.', concept: 'baseline' },
      ],
    },
    traps: [
      { trap: 'Reporting a number without defining it.', instead: 'State start, end, units, inclusions and exclusions.' },
      { trap: 'Inferring work time from gaps between events.', instead: 'Count only explicit work records, and say they may undercount.' },
      { trap: 'Declaring success from one good week.', instead: 'Compare with a baseline over time, and watch balancing measures.' },
    ],
    checks: [
      {
        id: 'm4-q1',
        prompt: 'Twenty items: most finish in 1–2 days, two take 25 days. Which statistic best describes a typical item?',
        options: [
          { text: 'The average', feedback: 'The two 25-day items pull the average up, so it describes almost no actual item.' },
          { text: 'The median', correct: true, feedback: 'Yes — the median is resistant to a few extreme values.' },
          { text: 'The maximum', feedback: 'The maximum describes the worst case, not the typical one.' },
        ],
      },
      {
        id: 'm4-q2',
        prompt: 'You plan a change to shorten waiting. Which is a balancing measure?',
        options: [
          { text: '% of items meeting the target', feedback: 'That’s an outcome measure.' },
          { text: 'Staff time spent per item after the change', correct: true, feedback: 'Right — it checks whether the change quietly adds work elsewhere.' },
          { text: '% of staff using the new process', feedback: 'That’s an adoption measure.' },
        ],
      },
      {
        id: 'm4-q3',
        prompt: 'Why shouldn’t events after the end point be used in a measure?',
        options: [
          { text: 'They’re usually inaccurate.', feedback: 'Accuracy isn’t the issue.' },
          { text: 'They would mix later information into a measure meant to describe what happened up to that point.', correct: true, feedback: 'Exactly. That “leakage” can make results look better or worse than they were.' },
          { text: 'It makes the calculation slower.', feedback: 'Speed isn’t the concern — validity is.' },
        ],
      },
    ],
    mission: {
      screen: 'timelines', title: 'Let the records speak',
      brief: 'In Referral Timelines, read at least two metric definitions, inspect five individual journeys, and run at least two comparisons — including one that tests an explanation you doubt.',
      criteria: [
        { type: 'metricsExplained', min: 2, label: 'Read two “What does this measure mean?” definitions' },
        { type: 'journeysViewed', min: 5, label: 'Inspect five individual journeys' },
        { type: 'analysis', id: 'A-01', label: 'Compare complete vs. incomplete referrals' },
        { type: 'analysis', id: 'A-05', label: 'Test the staffing explanation by week' },
      ],
      reflection: 'Which comparison surprised you? What can the data not tell you?',
    },
  },

  /* ===================================================================== */
  {
    id: 'm5', number: 5, title: 'Improvement & Adoption: Changes That Stick', skill: 'Practicality & adoption', icon: '🛠️', dimension: 'practicality',
    oneLiner: 'A good recommendation targets the causes your evidence supports, is small enough to pilot, names who it affects and what they need, and is measured honestly — including what it might make worse.',
    answers: [
      'Which change should we try first?',
      'When does staffing or automation make sense?',
      'How do we make sure people actually adopt the change?',
    ],
    whyItMatters: [
      'An insightful diagnosis is wasted if the recommendation is too big, too vague, or ignores the people who must change their work.',
      'Pilots let an organization learn cheaply and build trust before scaling.',
      'Many “failed” technologies failed at adoption: unclear roles, no training, no feedback loop.',
    ],
    concepts: [
      {
        id: 'causes', title: 'Target contributing causes, not symptoms',
        summary: 'Aim the change at the mechanisms your evidence supports — where and why work waits.',
        detail: [
          'Symptoms: complaints, overdue items. Causes: unclear ownership, batching, missing information, confusing status.',
          'Real problems usually have several interacting causes. Pick the one or two with the strongest evidence and biggest effect.',
          'Tools like “5 Whys” and fishbone diagrams help trace from symptom to cause — but check each link with evidence.',
        ],
        glossary: 'root-cause',
      },
      {
        id: 'options', title: 'Choosing among change types',
        summary: 'Clarify roles and rules, simplify or standardize, make status visible, then automate stable steps — and add capacity where evidence shows it’s the constraint.',
        detail: [
          'Standardize: one form, one set of required fields, one definition.',
          'Clarify ownership: who acts, by when, and what happens if they can’t.',
          'Make status visible: people stop chasing and resubmitting when they can see progress.',
          'Add staffing when evidence shows capacity is the binding constraint — not as a default answer.',
        ],
      },
      {
        id: 'automation', title: 'Automation readiness',
        summary: 'Automate steps that are stable, well-defined and already working. Automating a confused process makes the confusion faster.',
        detail: [
          'Ready: clear rules, consistent inputs, known exceptions, a defined owner.',
          'Not ready: unclear ownership, inconsistent forms, frequent workarounds.',
          'Write business requirements first (what must be true), then test with real users (UAT) before go-live.',
        ],
        glossary: 'business-requirement',
      },
      {
        id: 'pilot', title: 'Pilot with a plan',
        summary: 'Define scope, duration, measures, and what would make you stop, adjust or expand.',
        detail: [
          'One site, one type of item, a few weeks — big enough to learn, small enough to undo.',
          'State the expected benefit as a prediction with a baseline.',
          'Review results on a set schedule; adjust and run another cycle.',
        ],
        glossary: 'pilot',
      },
      {
        id: 'people', title: 'People, training and adoption',
        summary: 'Name everyone whose work changes, what they need to learn, and how you’ll know they’re using the new way.',
        detail: [
          'Involve the people doing the work in designing the change — they know the edge cases.',
          'Provide a job aid or short walkthrough, and a place to report problems.',
          'Track adoption separately from outcomes: if nobody uses the new process, the outcome tells you nothing about it.',
        ],
        glossary: 'adoption-measure',
      },
      {
        id: 'tradeoffs', title: 'Be honest about tradeoffs and unknowns',
        summary: 'Every change costs something. Say what, for whom — and list what you still don’t know.',
        detail: [
          'Common costs: new duties, transition confusion, configuration time, shifted burden to another team.',
          'Open questions belong in the recommendation; they shape the pilot’s measures.',
        ],
      },
    ],
    example: {
      title: `${CV}’s recommendation`,
      intro: 'The investigator writes a one-page proposal.',
      beats: [
        { text: 'Problem: “Requests wait for a weekly batch, and unsigned requests loop by mail. Processing itself is quick.”', concept: 'causes' },
        { text: 'Change: a portal e-signature (standardize) plus a daily 30-minute processing block with front desk cover (clarify ownership and timing).', concept: 'options' },
        { text: 'The scanning tool is deferred: scanning isn’t where the time goes. It could be revisited once the process is stable.', concept: 'automation' },
        { text: 'Pilot: portal requests only, six weeks. Expand if % within 5 days rises without front desk wait times growing.', concept: 'pilot' },
        { text: 'People: clerk (daily block), front desk (cover rota), patients (e-sign instructions). Short job aid and a 15-minute huddle.', concept: 'people' },
        { text: 'Tradeoffs: front desk cover is tight on Mondays. Unknown: how to speed up mailed requests.', concept: 'tradeoffs' },
      ],
    },
    traps: [
      { trap: 'Recommending ten changes at once.', instead: 'Choose a focused set so you can learn what worked.' },
      { trap: 'Presenting predicted benefits as guaranteed.', instead: 'Say “we predict” and name the baseline and measures.' },
      { trap: 'Leading with automation or headcount by default.', instead: 'Use them where evidence shows they address the constraint — and pair them with a pilot.' },
    ],
    checks: [
      {
        id: 'm5-q1',
        prompt: 'When is automating a workflow step most appropriate?',
        options: [
          { text: 'When the step is confusing and staff disagree about it.', feedback: 'Automation would encode the confusion. Clarify first.' },
          { text: 'When the step is stable, well-defined, and its exceptions are understood.', correct: true, feedback: 'Yes — automation amplifies whatever process it’s given.' },
          { text: 'Whenever a vendor can deliver quickly.', feedback: 'Speed of delivery isn’t evidence that the step is ready.' },
        ],
      },
      {
        id: 'm5-q2',
        prompt: 'Which expected-benefit statement is best?',
        options: [
          { text: '“This will eliminate delays.”', feedback: 'A promise you can’t yet support.' },
          { text: '“We predict the share meeting target will rise from the 38% baseline; we’ll check weekly during a six-week pilot.”', correct: true, feedback: 'Clear prediction, baseline, and a way to check it.' },
          { text: '“Things should get better.”', feedback: 'Too vague to test.' },
        ],
      },
    ],
    mission: {
      screen: 'recommend', title: 'Write a proposal you could defend',
      brief: 'Assemble a focused proposal for Juniper: cite evidence, predict (don’t promise), define a pilot, name the people affected, choose an outcome and a balancing measure, and list what you still don’t know. Then submit it for feedback.',
      criteria: [
        { type: 'measureKinds', kinds: ['outcome', 'balancing'], label: 'Choose an outcome and a balancing measure' },
        { type: 'proposalSubmitted', label: 'Submit the proposal for feedback' },
      ],
      reflection: 'What is the biggest risk in your proposal, and how would the pilot reveal it early?',
    },
  },
];

export const moduleById = (id: string) => modules.find((m) => m.id === id);

/** Which module a case screen practices. */
export const SCREEN_MODULE: Record<string, string> = {
  map: 'm1', interview: 'm1', evidence: 'm2', hypotheses: 'm2', mapper: 'm3', timelines: 'm4', recommend: 'm5', debrief: 'm0',
};

/** Which module builds each debrief dimension. */
export const DIMENSION_MODULE: Record<string, string> = {
  discovery: 'm1', evidence: 'm2', workflow: 'm3', measurement: 'm4', practicality: 'm5',
};
