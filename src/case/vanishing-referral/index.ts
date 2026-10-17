import type { CaseDefinition } from '../types';
import { calendar, clinics, referrals } from './referrals';
import { characters, locations } from './people';
import { questions } from './dialogue';
import { evidence } from './evidence';
import {
  briefing, explanation, hintTopics, hypothesisSeeds, measureOptions, recommendationOptions, starterMaps,
} from './workshop';

export const vanishingReferral: CaseDefinition = {
  id: 'vanishing-referral',
  title: 'The Case of the Vanishing Referral',
  orgName: 'Juniper Community Health',
  orgBlurb: 'A fictional outpatient organization with three clinics — Northside, Riverbend and Eastgate — and a centralized Referral Coordination Hub.',
  fictionNotice: 'Fictional training simulation. All organizations, people, records, timestamps and policies are invented. No real patient data is used.',
  briefing,
  calendar,
  clinics,
  referrals,
  locations,
  characters,
  questions,
  evidence,
  hypothesisSeeds,
  recommendationOptions,
  measureOptions,
  hintTopics,
  explanation,
  starterMaps,
};
