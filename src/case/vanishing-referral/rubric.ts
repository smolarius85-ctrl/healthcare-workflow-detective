/**
 * Case-specific inputs to the rule-based debrief. Kept separate from the scoring
 * engine so another case can supply its own key.
 */
export interface RubricKey {
  /** Artifacts central to the exception/ownership/status story. */
  exceptionEvidence: string[];
  statusEvidence: string[];
  /** Hypotheses the evidence most strongly supports. */
  wellSupported: string[];
  /** Plausible but overly simple explanations: should not be marked supported with high confidence. */
  overSimple: string[];
  /** Evidence that cuts against each over-simple hypothesis. */
  challengers: Record<string, string[]>;
  /** Analyses that test alternative explanations. */
  alternativeTests: string[];
  focusedActions: string[];
  cautionActions: string[];
  safeguardActions: string[];
}

export const rubricKey: RubricKey = {
  exceptionEvidence: ['E-05', 'E-08', 'E-11', 'A-01', 'A-04'],
  statusEvidence: ['E-06', 'E-10', 'E-13'],
  wellSupported: ['H-ownership', 'H-status'],
  overSimple: ['H-staffing', 'H-automation', 'H-outreach'],
  challengers: {
    'H-staffing': ['A-05', 'A-01', 'E-08'],
    'H-automation': ['E-03', 'E-05'],
    'H-outreach': ['E-15', 'A-04'],
  },
  alternativeTests: ['A-05', 'A-04', 'E-15'],
  focusedActions: ['exception-ownership', 'separate-statuses', 'standardize-fields', 'exception-routine'],
  cautionActions: ['add-staffing', 'automate-stable-step'],
  safeguardActions: ['pilot-one-clinic', 'gather-evidence'],
};
