/**
 * Shared types for case content. A case is pure data: the engine and UI read it,
 * so additional cases can be added by authoring another CaseDefinition.
 */

export type LaneId = 'clinic' | 'coordination' | 'outreach';

/* ---------- Referral event data ---------- */

export type EventType =
  | 'submitted'
  | 'received'
  | 'work_start'
  | 'work_end'
  | 'status_changed'
  | 'missing_info_flagged'
  | 'returned_to_clinic'
  | 'info_received'
  | 'copied_to_outreach'
  | 'duplicate_flagged'
  | 'merged'
  | 'patient_inquiry'
  | 'outreach_attempt'
  | 'appointment_offered'
  | 'note';

export interface ReferralEvent {
  /** Order within the referral's record, starting at 1. */
  seq: number;
  /** Local timestamp "YYYY-MM-DD HH:MM" in the case's declared timezone. */
  at: string;
  type: EventType;
  /** Role-based actor code, e.g. "RC-1", "OS-2", "RB front desk", "System". */
  actor: string;
  system: 'ReferralTrack' | 'OutreachBoard' | 'Fax/Scan' | 'Email inbox' | 'Clinic portal' | 'Phone log';
  detail: string;
  /** Present on status_changed / received: the status shown in ReferralTrack after this event. */
  status?: string;
  /** Pairs work_start and work_end events. */
  sessionId?: string;
  activity?: string;
}

export interface Referral {
  id: string;
  clinicId: string;
  intakeFormat: string;
  /** Set when this record is a duplicate submission of another referral. */
  duplicateOf?: string;
  /** Administrative fields missing at submission (empty when complete). */
  missingFields: string[];
  service: string;
  events: ReferralEvent[];
}

export interface Clinic {
  id: string;
  name: string;
  short: string;
  intakeFormat: string;
  color: string;
}

export interface CaseCalendar {
  timezoneLabel: string;
  businessDays: number[]; // 1 = Monday ... 5 = Friday (JS getUTCDay values)
  businessStart: number; // minutes after midnight
  businessEnd: number;
  holidays: string[]; // "YYYY-MM-DD"
  sampleStart: string;
  sampleEnd: string;
  dataCutoff: string; // "YYYY-MM-DD HH:MM"
  targetBusinessDays: number;
}

/* ---------- Evidence ---------- */

export type EvidenceNature = 'observation' | 'reported';
export type EvidenceTag = 'observation' | 'reported' | 'hypothesis' | 'question';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { type: 'fields'; items: { label: string; value: string; note?: string }[] }
  | { type: 'messages'; items: { from: string; at: string; text: string }[] }
  | { type: 'callout'; text: string };

export interface Evidence {
  id: string;
  title: string;
  /** Where it came from, e.g. "ReferralTrack export · System record". */
  source: string;
  kind: 'document' | 'form' | 'message' | 'system' | 'spreadsheet' | 'report' | 'analysis';
  nature: EvidenceNature;
  /** Location where it can be found; analyses are unlocked in the timeline explorer. */
  locationId: string | null;
  /** If set, the artifact is only revealed by asking this interview question (or using this analysis). */
  unlockedBy?: string;
  preview: string;
  body: Block[];
  /** Neutral note about what kind of source this is. Must not state conclusions. */
  reliability: string;
}

/* ---------- People, places, dialogue ---------- */

export interface AvatarSpec {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'bun' | 'curly' | 'long' | 'bald' | 'waves' | 'crop';
  shirt: string;
  accent: string;
  glasses?: boolean;
  earrings?: boolean;
  beard?: boolean;
  lanyard?: boolean;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  roleKey: 'frontdesk' | 'coordinator' | 'manager' | 'analyst' | 'patientexp' | 'director';
  locationId: string;
  intro: string;
  perspective: string;
  avatar: AvatarSpec;
}

export interface Location {
  id: string;
  name: string;
  blurb: string;
}

export type QuestionStyle = 'open' | 'probing' | 'verifying' | 'leading';

export interface Question {
  id: string;
  characterId: string;
  text: string;
  style: QuestionStyle;
  answer: string[];
  /** Question ids that must be asked first before this one is offered. */
  requires?: string[];
  unlocksEvidence?: string[];
  /** Short labels for leads this answer opens, used by hints and discovery scoring. */
  leads?: string[];
  coaching: string;
}

/* ---------- Hypotheses, map, recommendation ---------- */

export interface HypothesisSeed {
  id: string;
  text: string;
}

export type NodeKind = 'step' | 'decision' | 'queue' | 'handoff';
export type WorkType = 'work' | 'wait' | 'unknown';

export interface MapNode {
  id: string;
  label: string;
  lane: LaneId;
  col: number;
  kind: NodeKind;
  workType: WorkType;
  /** Free-text owner, "" for not set, or "unknown" when ownership is unclear. */
  owner: string;
  evidence: string[];
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface ProcessMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface RecommendationOption {
  id: string;
  label: string;
  description: string;
}

export interface MeasureOption {
  id: string;
  label: string;
  kind: 'outcome' | 'process' | 'balancing' | 'adoption';
  description: string;
}

export interface HintTopic {
  id: string;
  levels: [string, string, string];
}

export interface GlossaryEntry {
  id: string;
  term: string;
  plain: string;
  example: string;
}

export interface Briefing {
  directorMessage: string;
  directorId: string;
  boundary: string[];
  target: string;
  howToInvestigate: { title: string; text: string }[];
}

export interface CaseDefinition {
  id: string;
  title: string;
  orgName: string;
  orgBlurb: string;
  fictionNotice: string;
  briefing: Briefing;
  calendar: CaseCalendar;
  clinics: Clinic[];
  referrals: Referral[];
  locations: Location[];
  characters: Character[];
  questions: Question[];
  evidence: Evidence[];
  hypothesisSeeds: HypothesisSeed[];
  recommendationOptions: RecommendationOption[];
  measureOptions: MeasureOption[];
  hintTopics: HintTopic[];
  explanation: CaseExplanation;
  starterMaps: { documented: ProcessMap; observed: ProcessMap };
}

export interface CaseExplanation {
  summary: string;
  contributors: { title: string; text: string; evidence: string[] }[];
  alternatives: { title: string; text: string; evidence: string[] }[];
  unresolved: string[];
}
