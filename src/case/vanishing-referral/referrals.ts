import type { CaseCalendar, Clinic, EventType, Referral, ReferralEvent } from '../types';
import { fromMinutes, toMinutes } from '../../engine/time';

/**
 * Synthetic referral records for Juniper Community Health (fictional).
 * IDs are synthetic; no patient identifiers or demographics exist in this data.
 * Every event is authored explicitly; work time is only ever recorded through
 * explicit work-session start/end pairs.
 */

export const calendar: CaseCalendar = {
  timezoneLabel: 'Juniper local time (UTC−05:00 for the whole sample; no daylight-saving change occurs)',
  businessDays: [1, 2, 3, 4, 5],
  businessStart: 8 * 60,
  businessEnd: 17 * 60,
  holidays: [],
  sampleStart: '2026-09-14',
  sampleEnd: '2026-10-09',
  dataCutoff: '2026-10-09 17:00',
  targetBusinessDays: 3,
};

export const clinics: Clinic[] = [
  { id: 'NS', name: 'Northside Clinic', short: 'Northside', intakeFormat: 'Portal e-form (NS-E)', color: '#2a7f7a' },
  { id: 'RB', name: 'Riverbend Clinic', short: 'Riverbend', intakeFormat: 'Faxed paper form (RB-2)', color: '#c8664b' },
  { id: 'EG', name: 'Eastgate Clinic', short: 'Eastgate', intakeFormat: 'Email template (EG-T)', color: '#b8892d' },
];

type Sys = ReferralEvent['system'];
type Raw =
  | { at: string; type: EventType; actor: string; system: Sys; detail: string; status?: string }
  | { work: true; at: string; mins: number; actor: string; activity: string; system?: Sys };

const e = (at: string, type: EventType, actor: string, system: Sys, detail: string, status?: string): Raw => ({
  at, type, actor, system, detail, status,
});
const w = (at: string, mins: number, actor: string, activity: string, system?: Sys): Raw => ({
  work: true, at, mins, actor, activity, system,
});

function build(r: Omit<Referral, 'events'> & { raw: Raw[] }): Referral {
  const events: ReferralEvent[] = [];
  let session = 0;
  for (const item of r.raw) {
    if ('work' in item) {
      session++;
      const sessionId = `${r.id}-W${session}`;
      const system = item.system ?? 'ReferralTrack';
      const end = fromMinutes(toMinutes(item.at) + item.mins);
      events.push({ seq: 0, at: item.at, type: 'work_start', actor: item.actor, system, detail: `Work session started: ${item.activity}`, sessionId, activity: item.activity });
      events.push({ seq: 0, at: end, type: 'work_end', actor: item.actor, system, detail: `Work session ended: ${item.activity}`, sessionId, activity: item.activity });
    } else {
      events.push({ seq: 0, ...item, status: item.status });
    }
  }
  events.forEach((ev, i) => (ev.seq = i + 1));
  const { raw: _raw, ...rest } = r;
  return { ...rest, events };
}

const FAX: Sys = 'Fax/Scan';
const RT: Sys = 'ReferralTrack';
const OB: Sys = 'OutreachBoard';
const PH: Sys = 'Phone log';
const EM: Sys = 'Email inbox';
const PORTAL: Sys = 'Clinic portal';

const copyToOutreach = (at: string, actor: string): Raw[] => [
  e(at, 'copied_to_outreach', actor, OB, 'Referral details re-keyed into OutreachBoard; now visible on the outreach worklist.'),
  e(at, 'status_changed', actor, RT, 'Status updated after copy to OutreachBoard.', 'In Review'),
];

export const referrals: Referral[] = [
  /* ------------------------------ Northside ------------------------------ */
  build({
    id: 'RF-2401', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Physical therapy evaluation',
    raw: [
      e('2026-09-14 09:10', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-09-14 09:10', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-09-14 10:30', 15, 'RC-1', 'Intake review'),
      w('2026-09-14 13:00', 10, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-14 13:10', 'RC-1'),
      e('2026-09-15 09:20', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: phone call, voicemail left.'),
      e('2026-09-16 10:00', 'outreach_attempt', 'OS-1', OB, 'Second outreach attempt: patient reached.'),
      e('2026-09-16 10:05', 'appointment_offered', 'OS-1', OB, 'Appointment options offered to patient.'),
    ],
  }),
  build({
    id: 'RF-2402', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Cardiology consult',
    raw: [
      e('2026-09-15 14:40', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-09-15 14:40', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-09-16 08:45', 12, 'RC-1', 'Intake review'),
      w('2026-09-16 09:10', 10, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-16 09:20', 'RC-1'),
      e('2026-09-16 11:05', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2403', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Dermatology consult',
    raw: [
      e('2026-09-17 16:50', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-09-17 16:50', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-09-18 09:30', 15, 'RC-3', 'Intake review'),
      w('2026-09-18 09:50', 10, 'RC-3', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-18 10:00', 'RC-3'),
      e('2026-09-18 14:15', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2404', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: ['Coverage plan ID'], service: 'Orthopedics consult',
    raw: [
      e('2026-09-22 10:00', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form. Coverage plan ID field contains "N/A".'),
      e('2026-09-22 10:00', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-09-22 11:00', 15, 'RC-3', 'Intake review'),
      e('2026-09-22 11:15', 'missing_info_flagged', 'RC-3', RT, 'Missing-info flag set (coverage plan ID). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      e('2026-09-24 11:00', 'patient_inquiry', 'PX desk', PH, 'Patient called asking about referral; status shown as Received.'),
      w('2026-09-24 15:20', 10, 'RC-2', 'Chase missing information (from personal chase list)'),
      e('2026-09-24 15:30', 'returned_to_clinic', 'RC-2', EM, 'Request for coverage plan ID emailed to Northside front desk.'),
      e('2026-09-25 10:40', 'info_received', 'NS front desk', EM, 'Coverage plan ID supplied by email reply.'),
      w('2026-09-25 14:00', 10, 'RC-3', 'Re-review after information received'),
      w('2026-09-25 14:15', 10, 'RC-3', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-25 14:25', 'RC-3'),
      e('2026-09-28 09:30', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2408', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', duplicateOf: 'RF-2404', missingFields: [], service: 'Orthopedics consult',
    raw: [
      e('2026-09-24 13:45', 'submitted', 'NS front desk', PORTAL, 'Re-submitted through portal after patient call; coverage plan ID now included.'),
      e('2026-09-24 13:45', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-09-25 09:00', 15, 'RC-3', 'Intake review'),
      e('2026-09-25 09:15', 'duplicate_flagged', 'RC-3', RT, 'Matched to open referral RF-2404 by clinic record token and service.'),
      e('2026-09-25 09:20', 'merged', 'RC-3', RT, 'Closed as duplicate of RF-2404.', 'Closed'),
    ],
  }),
  build({
    id: 'RF-2405', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Physical therapy evaluation',
    raw: [
      e('2026-09-28 09:30', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-09-28 09:30', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-10-01 15:00', 15, 'RC-1', 'Intake review'),
      w('2026-10-01 15:20', 10, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-01 15:30', 'RC-1'),
      e('2026-10-02 10:00', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2406', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Gastroenterology consult',
    raw: [
      e('2026-10-01 11:20', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-10-01 11:20', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-10-02 11:00', 15, 'RC-1', 'Intake review'),
      w('2026-10-02 15:00', 10, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-02 15:10', 'RC-1'),
      e('2026-10-05 10:00', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: voicemail left.'),
    ],
  }),
  build({
    id: 'RF-2407', clinicId: 'NS', intakeFormat: 'Portal e-form (NS-E)', missingFields: [], service: 'Cardiology consult',
    raw: [
      e('2026-10-05 08:40', 'submitted', 'NS front desk', PORTAL, 'Submitted through Northside portal e-form.'),
      e('2026-10-05 08:40', 'received', 'System', RT, 'Portal submission created ReferralTrack record.', 'Received'),
      w('2026-10-05 10:00', 12, 'RC-1', 'Intake review'),
      w('2026-10-05 10:20', 10, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-05 10:30', 'RC-1'),
      e('2026-10-05 15:45', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),

  /* ------------------------------ Riverbend ------------------------------ */
  build({
    id: 'RF-2411', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: [], service: 'Physical therapy evaluation',
    raw: [
      e('2026-09-14 11:30', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub.'),
      e('2026-09-14 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-15 09:00', 20, 'RC-2', 'Intake review (read faxed form)'),
      w('2026-09-15 09:30', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-15 09:42', 'RC-2'),
      e('2026-09-15 13:30', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2412', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: ['Callback number', 'Coverage plan ID'], service: 'Neurology consult',
    raw: [
      e('2026-09-15 10:15', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub. Callback number and coverage plan lines blank.'),
      e('2026-09-15 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-16 09:30', 20, 'RC-2', 'Intake review (read faxed form)'),
      e('2026-09-16 09:50', 'missing_info_flagged', 'RC-2', RT, 'Missing-info flag set (callback number, coverage plan ID). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      e('2026-09-21 10:30', 'patient_inquiry', 'PX desk', PH, 'Patient called asking about referral; status shown as Received.'),
      w('2026-09-22 10:00', 15, 'RC-1', 'Chase missing information (found while checking duplicate RF-2413)'),
      e('2026-09-22 10:15', 'returned_to_clinic', 'RC-1', FAX, 'Request for callback number and coverage plan ID faxed to Riverbend.'),
      e('2026-09-23 16:20', 'info_received', 'RB front desk', FAX, 'Missing fields returned by fax.'),
      w('2026-09-24 09:15', 15, 'RC-1', 'Re-review after information received'),
      w('2026-09-24 09:35', 12, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-24 09:47', 'RC-1'),
      e('2026-09-24 11:00', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2413', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', duplicateOf: 'RF-2412', missingFields: ['Coverage plan ID'], service: 'Neurology consult',
    raw: [
      e('2026-09-21 14:00', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 re-faxed after patient call. Callback number added; coverage plan line blank.'),
      e('2026-09-21 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-22 09:40', 15, 'RC-1', 'Intake review (read faxed form)'),
      e('2026-09-22 09:55', 'duplicate_flagged', 'RC-1', RT, 'Matched to open referral RF-2412 by clinic record token and service.'),
      e('2026-09-22 10:00', 'merged', 'RC-1', RT, 'Closed as duplicate of RF-2412.', 'Closed'),
    ],
  }),
  build({
    id: 'RF-2414', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: [], service: 'Endocrinology consult',
    raw: [
      e('2026-09-17 09:00', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub.'),
      e('2026-09-17 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-18 08:30', 20, 'RC-2', 'Intake review (read faxed form)'),
      w('2026-09-18 09:00', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-18 09:12', 'RC-2'),
      e('2026-09-18 10:30', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: number on OutreachBoard reached a different household.'),
      e('2026-09-18 10:35', 'note', 'OS-2', OB, 'Callback number on OutreachBoard did not match ReferralTrack (two digits transposed). Corrected.'),
      e('2026-09-18 11:10', 'outreach_attempt', 'OS-2', OB, 'Second outreach attempt with corrected number: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2415', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: ['Ordering clinician'], service: 'Pulmonology consult',
    raw: [
      e('2026-09-18 16:40', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub. Ordering clinician line blank.'),
      e('2026-09-21 09:00', 'received', 'System', RT, 'Monday morning fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-21 13:00', 20, 'RC-3', 'Intake review (read faxed form)'),
      e('2026-09-21 13:20', 'missing_info_flagged', 'RC-3', RT, 'Missing-info flag set (ordering clinician). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      w('2026-09-23 10:00', 10, 'RC-3', 'Chase missing information (from personal chase list)'),
      e('2026-09-23 10:10', 'returned_to_clinic', 'RC-3', FAX, 'Request for ordering clinician faxed to Riverbend.'),
      e('2026-09-23 15:00', 'info_received', 'RB front desk', FAX, 'Ordering clinician supplied by fax; callback number on the reply has only 9 digits.'),
      w('2026-09-24 10:00', 15, 'RC-3', 'Re-review after information received'),
      e('2026-09-24 10:15', 'returned_to_clinic', 'RC-3', FAX, 'Second request faxed to Riverbend: callback number incomplete.'),
      e('2026-09-25 11:30', 'info_received', 'RB front desk', FAX, 'Corrected callback number supplied by fax.'),
      w('2026-09-28 14:00', 15, 'RC-1', 'Re-review after information received'),
      w('2026-09-28 14:20', 12, 'RC-1', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-28 14:32', 'RC-1'),
      e('2026-09-29 09:15', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2416', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: ['Callback number', 'Coverage plan ID'], service: 'Rheumatology consult',
    raw: [
      e('2026-09-29 11:00', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub. Callback number and coverage plan lines blank.'),
      e('2026-09-29 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-09-30 10:30', 20, 'RC-1', 'Intake review (read faxed form)'),
      e('2026-09-30 10:50', 'missing_info_flagged', 'RC-1', RT, 'Missing-info flag set (callback number, coverage plan ID). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      e('2026-10-05 14:00', 'patient_inquiry', 'PX desk', PH, 'Patient called asking about referral; status shown as Received.'),
      w('2026-10-07 11:15', 15, 'RC-3', 'Chase missing information (found while checking duplicate RF-2417)'),
      e('2026-10-07 11:30', 'returned_to_clinic', 'RC-3', FAX, 'Request for callback number and coverage plan ID faxed to Riverbend.'),
    ],
  }),
  build({
    id: 'RF-2417', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', duplicateOf: 'RF-2416', missingFields: ['Coverage plan ID'], service: 'Rheumatology consult',
    raw: [
      e('2026-10-06 09:30', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 re-faxed after patient call. Callback number added; coverage plan line blank.'),
      e('2026-10-06 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-10-07 10:45', 15, 'RC-3', 'Intake review (read faxed form)'),
      e('2026-10-07 11:00', 'duplicate_flagged', 'RC-3', RT, 'Matched to open referral RF-2416 by clinic record token and service.'),
      e('2026-10-07 11:05', 'merged', 'RC-3', RT, 'Closed as duplicate of RF-2416.', 'Closed'),
    ],
  }),
  build({
    id: 'RF-2418', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: [], service: 'Physical therapy evaluation',
    raw: [
      e('2026-10-01 10:00', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub.'),
      e('2026-10-01 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-10-02 14:00', 20, 'RC-2', 'Intake review (read faxed form)'),
      w('2026-10-02 14:30', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-02 14:42', 'RC-2'),
      e('2026-10-05 11:00', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2419', clinicId: 'RB', intakeFormat: 'Faxed paper form (RB-2)', missingFields: ['Coverage plan ID'], service: 'Cardiology consult',
    raw: [
      e('2026-10-05 09:30', 'submitted', 'RB front desk', FAX, 'Paper form RB-2 faxed to hub. Coverage plan line blank.'),
      e('2026-10-05 15:00', 'received', 'System', RT, 'Afternoon fax scan batch created ReferralTrack record.', 'Received'),
      w('2026-10-06 09:00', 20, 'RC-1', 'Intake review (read faxed form)'),
      e('2026-10-06 09:20', 'missing_info_flagged', 'RC-1', RT, 'Missing-info flag set (coverage plan ID). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      w('2026-10-06 13:00', 10, 'RC-1', 'Chase missing information (same day)'),
      e('2026-10-06 13:10', 'returned_to_clinic', 'RC-1', FAX, 'Request for coverage plan ID faxed to Riverbend.'),
      e('2026-10-07 10:00', 'info_received', 'RB front desk', FAX, 'Coverage plan ID supplied by fax.'),
      w('2026-10-07 14:00', 15, 'RC-2', 'Re-review after information received'),
      w('2026-10-07 14:20', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-07 14:32', 'RC-2'),
      e('2026-10-08 10:00', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),

  /* ------------------------------ Eastgate ------------------------------ */
  build({
    id: 'RF-2421', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: [], service: 'Dermatology consult',
    raw: [
      e('2026-09-14 13:00', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox using Eastgate template.'),
      w('2026-09-14 14:15', 15, 'RC-3', 'Log email into ReferralTrack'),
      e('2026-09-14 14:30', 'received', 'RC-3', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-09-15 10:00', 12, 'RC-3', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-15 10:12', 'RC-3'),
      e('2026-09-15 15:00', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2422', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: ['Callback number'], service: 'Urology consult',
    raw: [
      e('2026-09-16 10:30', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox. Template "contact" line reads "see chart".'),
      w('2026-09-16 11:00', 15, 'RC-3', 'Log email into ReferralTrack'),
      e('2026-09-16 11:15', 'received', 'RC-3', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-09-17 09:00', 15, 'RC-3', 'Intake review'),
      e('2026-09-17 09:15', 'missing_info_flagged', 'RC-3', RT, 'Missing-info flag set (callback number). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      e('2026-09-23 09:30', 'patient_inquiry', 'PX desk', PH, 'Patient called asking about referral; status shown as Received.'),
      w('2026-09-23 14:00', 15, 'RC-2', 'Chase missing information (found while checking duplicate RF-2423)'),
      e('2026-09-23 14:15', 'returned_to_clinic', 'RC-2', EM, 'Request for callback number emailed to Eastgate.'),
      e('2026-09-24 09:30', 'info_received', 'EG front desk', EM, 'Callback number supplied by email reply.'),
      w('2026-09-24 13:00', 15, 'RC-2', 'Re-review after information received'),
      w('2026-09-24 13:20', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-24 13:32', 'RC-2'),
      e('2026-09-25 09:00', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2423', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', duplicateOf: 'RF-2422', missingFields: [], service: 'Urology consult',
    raw: [
      e('2026-09-23 11:00', 'submitted', 'EG front desk', EM, 'Referral re-sent to hub inbox after patient call; callback number included.'),
      w('2026-09-23 13:30', 15, 'RC-2', 'Log email into ReferralTrack'),
      e('2026-09-23 13:45', 'received', 'RC-2', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      e('2026-09-23 13:50', 'duplicate_flagged', 'RC-2', RT, 'Matched to open referral RF-2422 by clinic record token and service.'),
      e('2026-09-23 13:55', 'merged', 'RC-2', RT, 'Closed as duplicate of RF-2422.', 'Closed'),
    ],
  }),
  build({
    id: 'RF-2424', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: [], service: 'Physical therapy evaluation',
    raw: [
      e('2026-09-21 15:30', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox using Eastgate template.'),
      w('2026-09-22 08:30', 15, 'RC-2', 'Log email into ReferralTrack'),
      e('2026-09-22 08:45', 'received', 'RC-2', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-09-22 11:00', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-09-22 11:12', 'RC-2'),
      e('2026-09-22 14:00', 'outreach_attempt', 'OS-1', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2425', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: ['Coverage plan ID'], service: 'Sleep study consult',
    raw: [
      e('2026-09-25 14:00', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox. Coverage line left blank.'),
      w('2026-09-25 15:00', 15, 'RC-2', 'Log email into ReferralTrack'),
      e('2026-09-25 15:15', 'received', 'RC-2', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-09-28 11:00', 15, 'RC-2', 'Intake review'),
      e('2026-09-28 11:15', 'missing_info_flagged', 'RC-2', RT, 'Missing-info flag set (coverage plan ID). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      w('2026-10-01 10:00', 10, 'RC-2', 'Chase missing information (from personal chase list)'),
      e('2026-10-01 10:10', 'returned_to_clinic', 'RC-2', EM, 'Request for coverage plan ID emailed to Eastgate.'),
      e('2026-10-02 09:00', 'info_received', 'EG front desk', EM, 'Coverage plan ID supplied by email reply.'),
      w('2026-10-05 10:00', 15, 'RC-3', 'Re-review after information received'),
      w('2026-10-05 10:20', 12, 'RC-3', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-05 10:32', 'RC-3'),
      e('2026-10-05 14:30', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: voicemail left.'),
    ],
  }),
  build({
    id: 'RF-2426', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: [], service: 'Allergy consult',
    raw: [
      e('2026-09-30 09:00', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox using Eastgate template.'),
      w('2026-09-30 10:30', 15, 'RC-2', 'Log email into ReferralTrack'),
      e('2026-09-30 10:45', 'received', 'RC-2', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-10-01 09:30', 12, 'RC-2', 'Re-key into OutreachBoard', OB),
      ...copyToOutreach('2026-10-01 09:42', 'RC-2'),
      e('2026-10-02 10:00', 'outreach_attempt', 'OS-2', OB, 'First outreach attempt: patient reached.'),
    ],
  }),
  build({
    id: 'RF-2427', clinicId: 'EG', intakeFormat: 'Email template (EG-T)', missingFields: ['Callback number'], service: 'Ophthalmology consult',
    raw: [
      e('2026-10-01 16:30', 'submitted', 'EG front desk', EM, 'Referral emailed to hub inbox. Template "contact" line reads "see chart".'),
      w('2026-10-02 09:00', 15, 'RC-2', 'Log email into ReferralTrack'),
      e('2026-10-02 09:15', 'received', 'RC-2', RT, 'Coordinator created ReferralTrack record from email.', 'Received'),
      w('2026-10-02 10:00', 15, 'RC-2', 'Intake review'),
      e('2026-10-02 10:15', 'missing_info_flagged', 'RC-2', RT, 'Missing-info flag set (callback number). Moved to Intake Exceptions folder. Status unchanged.', 'Received'),
      e('2026-10-08 10:00', 'patient_inquiry', 'PX desk', PH, 'Patient called asking about referral; status shown as Received.'),
    ],
  }),
];

export const eventTypeLabels: Record<EventType, { label: string; meaning: string }> = {
  submitted: { label: 'Submitted', meaning: 'Clinic sent the referral to the hub (portal, fax, or email). Clock starts here.' },
  received: { label: 'Received', meaning: 'A ReferralTrack record exists. Says nothing about whether the referral is complete.' },
  work_start: { label: 'Work started', meaning: 'A staff member started a logged work session on this referral.' },
  work_end: { label: 'Work ended', meaning: 'The logged work session ended. Touch time is only counted between start/end pairs.' },
  status_changed: { label: 'Status changed', meaning: 'The ReferralTrack status value changed.' },
  missing_info_flagged: { label: 'Missing info flagged', meaning: 'Required administrative information was missing. Record moved to the Intake Exceptions folder.' },
  returned_to_clinic: { label: 'Returned to clinic', meaning: 'Hub asked the clinic for missing or corrected information (a return / rework event).' },
  info_received: { label: 'Info received', meaning: 'Clinic sent back requested information.' },
  copied_to_outreach: { label: 'Copied to outreach', meaning: 'Coordinator re-keyed the referral into OutreachBoard; outreach staff can now see it.' },
  duplicate_flagged: { label: 'Duplicate flagged', meaning: 'This record was matched to an earlier open referral.' },
  merged: { label: 'Closed as duplicate', meaning: 'Duplicate record closed in favor of the original.' },
  patient_inquiry: { label: 'Patient inquiry', meaning: 'A patient called asking about referral progress (Patient Experience phone log).' },
  outreach_attempt: { label: 'Outreach attempt', meaning: 'Outreach staff attempted to contact the patient. The first one ends the measured journey.' },
  appointment_offered: { label: 'Appointment offered', meaning: 'Appointment options offered. Outside the investigation boundary.' },
  note: { label: 'Note', meaning: 'Free-text note recorded in a system.' },
};
