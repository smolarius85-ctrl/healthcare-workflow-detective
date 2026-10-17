import type { Question } from '../types';

/**
 * Authored branching interviews. Every answer is a staff member's REPORTED view.
 * Coaching comments only on technique and on what remains unverified — it never
 * introduces facts that are not already in the case.
 */

const WALK = 'Walk me through the last referral you handled.';
const MISSING = 'What happens when information is missing?';
const OWNER = 'How do you know who owns the next step?';
const STATUS = 'What does this status mean to your team?';
const EXAMPLE = 'Can you show me an example?';
const BUSY = 'What is different on a busy day?';
const CHECK = 'What would I need to check before concluding that?';

export const questions: Question[] = [
  /* ------------------------- Marisol (front desk) ------------------------- */
  {
    id: 'marisol-walk', characterId: 'marisol', text: WALK, style: 'open',
    answer: [
      'This morning I sent one for a physical therapy evaluation. I fill in our RB-2 form, fax it to the hub, and drop the fax confirmation in the tray.',
      'Later I look it up in the ReferralTrack clinic view. Once it says "Received," I know they have it and I can stop worrying.',
    ],
    leads: ['formVariation', 'statusAmbiguity'],
    coaching: 'An open walk-through gets the sequence in her own words. Notice the interpretation tucked inside: "Received" means "I can stop worrying." That is her reading of a status, not a verified definition — worth comparing with how the system defines it.',
  },
  {
    id: 'marisol-missing', characterId: 'marisol', text: MISSING, style: 'open',
    answer: [
      "If something's missing, the hub faxes a request back to us. Sometimes that comes in a day or two. Sometimes I only find out when the patient calls us asking what's going on.",
      "I'm honestly not sure who at the hub is supposed to catch those.",
    ],
    leads: ['exceptionOwnership'],
    coaching: 'This is a sincere report of her experience, not a measurement. "Sometimes I only find out when the patient calls" is a testable lead: do incomplete referrals in the records show patient calls before any request goes back to the clinic?',
  },
  {
    id: 'marisol-owner', characterId: 'marisol', text: OWNER, style: 'probing',
    answer: [
      "Once it's faxed, it's theirs — that's how we were trained.",
      "But when the hub sends something back, I'm not sure whether that makes it ours again or whether they're still tracking it. Nobody's ever said.",
    ],
    leads: ['exceptionOwnership', 'handoff'],
    coaching: 'Ownership questions surface handoffs. She is clear about the normal path and unsure about the return path — a pattern worth checking with the hub side before drawing conclusions.',
  },
  {
    id: 'marisol-status', characterId: 'marisol', text: STATUS, style: 'probing',
    answer: [
      'Received means they have it and they are working on it. It shows up green, so we read it as good news.',
      "When patients call, that's what we tell them: it's received, it's in progress.",
    ],
    leads: ['statusAmbiguity'],
    coaching: 'Asking what a status means *to this team* reveals interpretation. Before calling it a mismatch, check the system’s own definition — the Systems and Reporting Desk may have one.',
  },
  {
    id: 'marisol-example', characterId: 'marisol', text: EXAMPLE, style: 'verifying', requires: ['marisol-walk'],
    answer: [
      'Here — this is the checklist taped next to the fax machine. It tells us what to fill in before we send.',
      "I'll be honest, it's from a while ago. We go by it because it's what we have.",
    ],
    unlocksEvidence: ['E-12'],
    leads: ['formVariation'],
    coaching: 'Asking for an example moves from description to artifact. Read the checklist yourself rather than relying on her summary — and note its date.',
  },
  {
    id: 'marisol-busy', characterId: 'marisol', text: BUSY, style: 'open',
    answer: [
      "On a busy day the phones don't stop. If a patient calls about a referral and I can't tell what's happening, sometimes I just fax it again to be safe.",
      "I know that probably isn't ideal for the hub.",
    ],
    leads: ['duplicates', 'workarounds'],
    coaching: 'A candid admission like this describes a reasonable workaround when someone cannot see progress — treat it with respect, not blame. You could check whether resubmissions appear as duplicate records.',
  },
  {
    id: 'marisol-track', characterId: 'marisol', text: 'How do you keep track of referrals you are worried about?', style: 'probing', requires: ['marisol-busy'],
    answer: [
      "I set Outlook reminders for the ones that worry me — check again in three days. It's my own system.",
      'Some of the others use sticky notes on the monitor.',
    ],
    leads: ['workarounds'],
    coaching: 'Private reminders are a signal that the official system does not give people the visibility they need. Workarounds are evidence about the process, not about the person.',
  },
  {
    id: 'marisol-check', characterId: 'marisol', text: CHECK, style: 'verifying', requires: ['marisol-missing'],
    answer: [
      "You'd want to see whether the ones that took forever were the ones the hub sent back. I can't see that from here.",
      'Maybe the systems folks can pull it.',
    ],
    leads: ['testIncomplete'],
    coaching: 'Asking what would confirm or disprove a claim is one of the strongest habits in discovery. She has pointed you toward a comparison you can run in the Referral Timelines.',
  },
  {
    id: 'marisol-lead', characterId: 'marisol', text: 'So the hub is losing referrals, right?', style: 'leading',
    answer: [
      "I wouldn't say losing. I don't know what happens on their side.",
      'I only know what patients tell me when they call.',
    ],
    coaching: 'Leading questions invite agreement. She pushed back, which is useful, but an open question ("What do you see happen after you send one?") usually yields richer information.',
  },

  /* ---------------------- Dev (referral coordinator) ---------------------- */
  {
    id: 'dev-walk', characterId: 'dev', text: WALK, style: 'open',
    answer: [
      'This morning I picked up a Northside portal referral. I review it in ReferralTrack, check the administrative fields, then re-key it into OutreachBoard so the outreach specialists can see it.',
      'Eastgate sends email, so I log those into ReferralTrack by hand first. Riverbend faxes come in as scans in batches during the day.',
    ],
    leads: ['doubleEntry', 'formVariation'],
    coaching: 'His walk-through names two systems and three intake formats. "Re-key" is a signal of duplicate data entry — you could look for it in the event records and the process map.',
  },
  {
    id: 'dev-missing', characterId: 'dev', text: MISSING, style: 'open',
    answer: [
      'We set the missing-info flag and the record lands in the Intake Exceptions folder. The SOP says it goes back to the clinic, but it does not say who sends it back or when.',
      'Whoever has a spare minute picks a few up. I keep my own list so mine do not fall through.',
    ],
    leads: ['exceptionOwnership', 'workarounds'],
    coaching: 'You now have two people describing the same gap from opposite sides. Two consistent reports strengthen a lead; they still are not a measurement. What would the records show for flagged referrals?',
  },
  {
    id: 'dev-owner', characterId: 'dev', text: OWNER, style: 'probing',
    answer: [
      'For a normal referral, whoever opens it owns it. For exceptions it used to be the intake lead, but that role has been vacant since the summer.',
      "We've talked about it in a message thread a few times. Here, I'll forward it to you.",
    ],
    unlocksEvidence: ['E-05'],
    leads: ['exceptionOwnership'],
    coaching: 'Good probing question. Notice that he describes a role gap, not a person failing. The message thread lets you see the conversation directly instead of through his summary.',
  },
  {
    id: 'dev-status', characterId: 'dev', text: STATUS, style: 'probing',
    answer: [
      'Received just means a record exists. For us, the real signal is when it is on OutreachBoard.',
      "We set 'In Review' after we copy it over. I know that's backwards — it's just what the field allows.",
    ],
    leads: ['statusAmbiguity'],
    coaching: 'Compare this with how the front desk reads the same status. Two teams, one word, different meanings — a classic handoff risk. The status glossary would let you check the official definitions.',
  },
  {
    id: 'dev-ready', characterId: 'dev', text: 'How does outreach find out a referral is ready?', style: 'probing', requires: ['dev-status'],
    answer: [
      'Only when one of us copies it into OutreachBoard. The outreach specialists cannot see the ReferralTrack exceptions folder at all.',
      "So from their side, an incomplete referral doesn't exist yet.",
    ],
    leads: ['statusAmbiguity', 'handoff'],
    coaching: 'This follow-up tests a boundary between two systems. It suggests the outreach team cannot be slow on referrals they cannot see — a claim you could check by comparing time before and after the copy step.',
  },
  {
    id: 'dev-example', characterId: 'dev', text: EXAMPLE, style: 'verifying', requires: ['dev-missing'],
    answer: [
      "Sure. This is my chase list — it's just a spreadsheet on my drive. If it's not on here, I'm probably not chasing it.",
      'The other coordinators have their own ways of keeping track.',
    ],
    unlocksEvidence: ['E-11'],
    leads: ['workarounds', 'exceptionOwnership'],
    coaching: 'A private spreadsheet is strong evidence that people are compensating for a missing shared mechanism. It is also partial: it only covers what one person tracked.',
  },
  {
    id: 'dev-busy', characterId: 'dev', text: BUSY, style: 'open',
    answer: [
      'When we are down a coordinator, new referrals still get looked at, just later than usual, and the exceptions folder gets even less attention.',
      'Duplicates are the worst. Someone re-sends, and now there are two records to reconcile.',
    ],
    leads: ['staffing', 'duplicates'],
    coaching: 'He offers support for two hypotheses at once: staffing and exception handling. Hold both. The timelines can show whether delays cluster in short-staffed weeks or on the exception path.',
  },
  {
    id: 'dev-check', characterId: 'dev', text: CHECK, style: 'verifying', requires: ['dev-busy'],
    answer: [
      'Compare how long complete referrals take versus ones that hit the exceptions folder. My gut says that is where the time goes.',
      "But my gut also says we're short-staffed. I couldn't tell you which matters more.",
    ],
    leads: ['testIncomplete', 'staffing'],
    coaching: 'He separates his belief from what would test it — exactly the discipline you want to model. Note that he does not claim to know the answer.',
  },
  {
    id: 'dev-lead', characterId: 'dev', text: "Wouldn't a new automated intake tool fix all this?", style: 'leading',
    answer: [
      'Maybe for the re-keying. But a tool cannot decide who owns a referral that nobody owns.',
      'Northside already uses a portal, and we still get "N/A" in the coverage field sometimes.',
    ],
    leads: ['automation'],
    coaching: 'Leading questions can still produce useful pushback, as here. A neutral version — "Which steps would a tool change, and which would stay the same?" — avoids signaling the answer you expect.',
  },

  /* ------------------------ Priya (clinic manager) ------------------------ */
  {
    id: 'priya-walk', characterId: 'priya', text: WALK, style: 'open',
    answer: [
      "I don't handle referrals myself anymore. What reaches me is the complaint side — patients calling the clinic, front desk escalating to me.",
      'I send a weekly summary up to Celeste. The latest one is on my desk.',
    ],
    leads: ['staffing'],
    coaching: 'Managers often see outcomes rather than steps. Her weekly summary is useful context; treat its conclusions as her interpretation until you compare them with event records.',
  },
  {
    id: 'priya-missing', characterId: 'priya', text: MISSING, style: 'open',
    answer: [
      'My understanding is the hub sends it back to us. My staff tell me that can be slow.',
      "I've asked the hub to prioritize our returns, but I'm not sure who I should even be asking.",
    ],
    leads: ['exceptionOwnership'],
    coaching: 'A third person who is unsure who owns returned referrals. Repetition across roles strengthens the pattern — but it is still reported, not measured.',
  },
  {
    id: 'priya-owner', characterId: 'priya', text: OWNER, style: 'probing',
    answer: [
      'On paper, the SOP covers it. In practice I am not sure the SOP has kept up — it still mentions a "Ready" status, and I have never seen that in the system.',
    ],
    leads: ['statusAmbiguity', 'documentedVsObserved'],
    coaching: 'She has flagged a gap between the documented and the observed process. That is worth capturing on two separate maps rather than blending them together.',
  },
  {
    id: 'priya-status', characterId: 'priya', text: STATUS, style: 'probing',
    answer: [
      "To my team, Received means the hub has it and it's moving.",
      "If it's not actually moving, that would be news to me.",
    ],
    leads: ['statusAmbiguity'],
    coaching: 'Her reading matches the front desk’s. Whether that reading matches the system’s definition is still open.',
  },
  {
    id: 'priya-example', characterId: 'priya', text: EXAMPLE, style: 'verifying', requires: ['priya-walk'],
    answer: [
      "That binder is the official SOP, and this is last week's summary. You'll see I've flagged staffing at the hub.",
    ],
    leads: ['staffing'],
    coaching: 'Both documents are on her desk in the Manager’s Office. Inspect them directly: an SOP shows the intended process; a summary shows one manager’s interpretation.',
  },
  {
    id: 'priya-busy', characterId: 'priya', text: BUSY, style: 'open',
    answer: [
      'Busy days at Riverbend mean the fax machine is running nonstop. Our form is older than Northside’s portal, and Eastgate’s email template is honestly whatever people type.',
    ],
    leads: ['formVariation'],
    coaching: 'Three clinics, three intake formats. A clinic comparison in the timelines could show whether format matters — or whether the differences are noise in a small sample.',
  },
  {
    id: 'priya-check', characterId: 'priya', text: CHECK, style: 'verifying', requires: ['priya-busy'],
    answer: [
      "I'd want to know whether the delays are spread evenly or concentrated somewhere. I've assumed staffing because that's the explanation I hear most often.",
      "I haven't seen data either way.",
    ],
    leads: ['staffing', 'testIncomplete'],
    coaching: 'A manager acknowledging an untested assumption is a gift. It gives you permission to test the staffing hypothesis without it feeling like a challenge to her judgment.',
  },
  {
    id: 'priya-lead', characterId: 'priya', text: 'So the problem is understaffing at the hub?', style: 'leading',
    answer: [
      "That's my working theory, yes. They had a coordinator on leave recently, and the intake lead role is still open.",
      "But I'd be glad to be proven wrong if there's something cheaper to fix.",
    ],
    leads: ['staffing'],
    coaching: 'This confirms her belief without testing it. A sincere, reasonable belief is a hypothesis: were delays also present in weeks when the hub was fully staffed?',
  },

  /* ------------------------ Tomás (systems analyst) ----------------------- */
  {
    id: 'tomas-walk', characterId: 'tomas', text: WALK, style: 'open',
    answer: [
      "I don't process referrals — I maintain ReferralTrack and OutreachBoard and pull reports.",
      'The two systems do not talk to each other, so coordinators re-key every referral. I can export the event log for any referral if you want to look.',
    ],
    leads: ['doubleEntry'],
    coaching: 'He separates what he knows (system behavior) from what he does not (why people act). Event logs are observations of what was recorded — powerful, but silent about reasons.',
  },
  {
    id: 'tomas-missing', characterId: 'tomas', text: MISSING, style: 'open',
    answer: [
      'There is a missing-info checkbox. Setting it does not change the status.',
      'The clinic view does not show the checkbox at all — clinics only see the status field.',
    ],
    leads: ['statusAmbiguity'],
    coaching: 'This is a claim about system design that you can verify against the status glossary and event logs. If true, it would explain why front desk staff read "Received" as good news.',
  },
  {
    id: 'tomas-owner', characterId: 'tomas', text: OWNER, style: 'probing',
    answer: [
      'ReferralTrack has an "assigned to" field, but it is optional and nobody uses it for the exceptions folder.',
      'I can tell you who touched a record — not who was supposed to.',
    ],
    leads: ['exceptionOwnership'],
    coaching: 'An important limit on the data: activity is recorded, responsibility is not. Keep that in mind before drawing conclusions about any individual.',
  },
  {
    id: 'tomas-status', characterId: 'tomas', text: STATUS, style: 'probing',
    answer: [
      'The official glossary is pinned at my desk. "Received" is set automatically when a record is created. "In Review" is set by hand.',
      'There is no "Ready" status. The SOP mentions one, but it was never built.',
    ],
    leads: ['statusAmbiguity', 'documentedVsObserved'],
    coaching: 'Now you have the system’s definition to compare with the interpretations from the front desk and manager. Check the glossary yourself.',
  },
  {
    id: 'tomas-example', characterId: 'tomas', text: EXAMPLE, style: 'verifying', requires: ['tomas-walk'],
    answer: [
      "Here's a duplicate pair from September — two records, same clinic record token, same service, submitted six days apart.",
    ],
    unlocksEvidence: ['E-13'],
    leads: ['duplicates'],
    coaching: 'A concrete example lets you trace cause and effect in time order. Look at what happened to the original before the duplicate arrived.',
  },
  {
    id: 'tomas-busy', characterId: 'tomas', text: BUSY, style: 'open',
    answer: [
      "On busy days people skip clicking the work-session timer. So treat touch time as a floor — 'at least this much' — not an exact figure.",
    ],
    leads: ['measurement'],
    coaching: 'A data-quality caveat from the person who knows the system best. Good measurement reasoning carries caveats like this into conclusions rather than quietly dropping them.',
  },
  {
    id: 'tomas-check', characterId: 'tomas', text: CHECK, style: 'verifying', requires: ['tomas-walk'],
    answer: [
      'Pull the event histories and compare groups. I can also give you daily noon counts of the outreach worklist versus the exceptions folder.',
      'One caution: four weeks and twenty referrals is a small sample.',
    ],
    unlocksEvidence: ['E-15'],
    leads: ['testIncomplete', 'measurement'],
    coaching: 'He offers a test and its limitation in the same breath. Note the sample size caveat — it belongs in your open questions.',
  },
  {
    id: 'tomas-lead', characterId: 'tomas', text: 'The data will show us exactly who is slowing things down, right?', style: 'leading',
    answer: [
      'It shows role codes and timestamps, not causes. And I would be uncomfortable using it to single anyone out — the logs do not capture why something was waiting.',
    ],
    coaching: 'Framing an investigation around "who" tends to produce defensiveness and miss system causes. Asking "where does work wait, and why?" keeps the focus on the process.',
  },

  /* --------------------- Ruth (patient experience) ------------------------ */
  {
    id: 'ruth-walk', characterId: 'ruth', text: WALK, style: 'open',
    answer: [
      'A patient called about a referral sent about a week earlier. I looked it up in the clinic view — it said Received — so I told them it was in process and logged the call.',
    ],
    leads: ['statusAmbiguity'],
    coaching: 'She relied on the same status the front desk does. Her call log is a record of what patients asked, not of why their referrals were delayed.',
  },
  {
    id: 'ruth-missing', characterId: 'ruth', text: MISSING, style: 'open',
    answer: [
      "I wouldn't know if information was missing — my view doesn't show that.",
      "I have noticed that after a patient calls, the clinic sometimes sends the referral again.",
    ],
    leads: ['duplicates'],
    coaching: 'She is clear about the limits of her knowledge — good. Her observation about resubmissions is a lead you can check against duplicate records.',
  },
  {
    id: 'ruth-owner', characterId: 'ruth', text: OWNER, style: 'probing',
    answer: [
      "I don't. I log the call and send a note to the clinic front desk. After that I can't see what happens.",
    ],
    leads: ['handoff'],
    coaching: 'Another handoff without a feedback loop. Notice how often people describe sending something onward and losing sight of it.',
  },
  {
    id: 'ruth-status', characterId: 'ruth', text: STATUS, style: 'probing',
    answer: [
      "Received means the hub has it. Although I've started to wonder, because some referrals still say Received a week after they were sent.",
    ],
    leads: ['statusAmbiguity'],
    coaching: 'A thoughtful doubt — she has noticed that the status does not change for some referrals. Consider which referrals stay in "Received" longest.',
  },
  {
    id: 'ruth-example', characterId: 'ruth', text: EXAMPLE, style: 'verifying', requires: ['ruth-walk'],
    answer: [
      "My call summary for the sample period is on the desk. Every referral-status call is logged there with the referral ID.",
    ],
    leads: ['statusAmbiguity'],
    coaching: 'Call logs let you link patient experience to specific referral journeys. Try looking up those IDs in the Referral Timelines.',
  },
  {
    id: 'ruth-busy', characterId: 'ruth', text: BUSY, style: 'open',
    answer: [
      'Busy days are just more of the same calls. Most referral callers have not heard anything at all for about a week.',
    ],
    coaching: 'Her impression is useful context. "Over a week" is something you can check against the dates in the call summary and event logs.',
  },
  {
    id: 'ruth-check', characterId: 'ruth', text: CHECK, style: 'verifying', requires: ['ruth-walk'],
    answer: [
      "I'd check whether the patients who call are typical. My log only shows the ones who called — plenty of people probably just wait.",
    ],
    leads: ['measurement'],
    coaching: 'She has named a selection effect: complaint data only captures people who complain. Patient calls are a useful measure, but not a complete picture of delay.',
  },
  {
    id: 'ruth-lead', characterId: 'ruth', text: "Patients are just impatient, aren't they?", style: 'leading',
    answer: [
      'No. Most are polite and only want to know whether anything is happening. Usually nothing has reached them at all.',
    ],
    coaching: 'A leading question that assumed blame on the patient side. Open questions about what callers ask for tend to be more informative.',
  },

  /* ----------------------- Celeste (ops director) ------------------------- */
  {
    id: 'celeste-walk', characterId: 'celeste', text: WALK, style: 'open',
    answer: [
      "I don't handle individual referrals. I hear about them when complaints rise — and they have.",
      'A vendor has pitched me a referral automation product, and someone suggested a director-level approval for incomplete referrals. Before I do either, I want to understand the work.',
    ],
    leads: ['automation'],
    coaching: 'Two solutions are already on the table before the problem is understood. Your job is not to reject them, but to find out what each would and would not change.',
  },
  {
    id: 'celeste-missing', characterId: 'celeste', text: MISSING, style: 'open',
    answer: [
      "It's supposed to go back to the clinic. Beyond that I'd be guessing — that's why you're here.",
    ],
    coaching: 'Leaders often know the intended process but not the lived one. Her honesty is a reminder to confirm details with the people who do the work.',
  },
  {
    id: 'celeste-owner', characterId: 'celeste', text: OWNER, style: 'probing',
    answer: [
      'The SOP defines it. I suspect the SOP and reality have drifted apart, but I could not tell you where.',
    ],
    leads: ['documentedVsObserved'],
    coaching: 'An invitation to compare documented and observed workflows. The process mapper lets you keep the two side by side.',
  },
  {
    id: 'celeste-status', characterId: 'celeste', text: STATUS, style: 'probing',
    answer: [
      'Our quarterly review used a count of referrals in Received status as a sign of healthy intake.',
      "I'm realizing I don't know exactly what that count includes.",
    ],
    leads: ['statusAmbiguity', 'measurement'],
    coaching: 'A measure is only as good as the definition behind it. If "Received" mixes ready and stuck referrals, a count of it could hide the problem.',
  },
  {
    id: 'celeste-target', characterId: 'celeste', text: 'Where does the three-business-day target come from?', style: 'probing',
    answer: [
      "It's ours — an internal goal we set two years ago. It's not a regulation or an industry standard.",
      "I'd like it measured the same way every time, which I don't think we do today.",
    ],
    leads: ['measurement'],
    coaching: 'Clarifying the origin of a target prevents overstating it. Consistent definitions (when does the clock start? what counts as outreach?) matter more than the exact number.',
  },
  {
    id: 'celeste-busy', characterId: 'celeste', text: BUSY, style: 'open',
    answer: [
      'Busy weeks are when complaints come. Clinic managers tell me the hub is understaffed. The hub tells me the clinics send incomplete referrals.',
      'Both may be right.',
    ],
    leads: ['staffing', 'formVariation'],
    coaching: 'Competing explanations from different teams are normal. Holding both as hypotheses — and testing each — is fairer and more accurate than picking a side.',
  },
  {
    id: 'celeste-check', characterId: 'celeste', text: CHECK, style: 'verifying', requires: ['celeste-busy'],
    answer: [
      "I'd want a baseline we trust before changing anything, and I'd want to know what we would measure in a pilot to see whether it helped — and what might get worse.",
    ],
    leads: ['measurement', 'pilot'],
    coaching: 'She is describing a baseline, outcome measures, and balancing measures. These belong in your recommendation.',
  },
  {
    id: 'celeste-lead', characterId: 'celeste', text: 'So you would like me to recommend the automation tool?', style: 'leading',
    answer: [
      "Only if the evidence supports it. I'd rather not automate a process we don't understand.",
    ],
    leads: ['automation'],
    coaching: 'Checking a sponsor’s expectations is reasonable, but phrased this way it sounds like you are seeking permission for a conclusion. Asking "What would a good outcome look like to you?" is more open.',
  },
];
