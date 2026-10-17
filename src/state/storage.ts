import type { CaseDefinition } from '../case/types';
import { initialState, type GameState } from './gameState';

/** Minimal key-value interface so tests can supply an in-memory store. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const stateKey = (caseId: string) => `hwd:${caseId}:v1`;
export const PREFS_KEY = 'hwd:prefs:v1';

export interface Prefs {
  soundOn: boolean;
}

export function saveState(kv: KV, s: GameState): void {
  try {
    kv.setItem(stateKey(s.caseId), JSON.stringify(s));
  } catch {
    /* storage full or blocked: progress simply isn't persisted */
  }
}

/**
 * Restore saved progress. Unknown or corrupt data falls back to a fresh state;
 * missing fields (from older saves) are filled from defaults.
 */
export function loadState(kv: KV, c: CaseDefinition): GameState {
  const fresh = initialState(c);
  let raw: string | null = null;
  try {
    raw = kv.getItem(stateKey(c.id));
  } catch {
    return fresh;
  }
  if (!raw) return fresh;
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== 1 || parsed.caseId !== c.id) return fresh;
    return {
      ...fresh,
      ...parsed,
      timeline: { ...fresh.timeline, ...(parsed.timeline ?? {}) },
      hints: { ...fresh.hints, ...(parsed.hints ?? {}) },
      proposal: { ...fresh.proposal, ...(parsed.proposal ?? {}) },
      learning: { ...fresh.learning, ...(parsed.learning ?? {}) },
      maps: parsed.maps ?? fresh.maps,
    } as GameState;
  } catch {
    return fresh;
  }
}

/** Restart: removes saved case progress (preferences such as sound are kept). */
export function clearState(kv: KV, caseId: string): void {
  try {
    kv.removeItem(stateKey(caseId));
  } catch {
    /* ignore */
  }
}

export function loadPrefs(kv: KV): Prefs {
  try {
    const raw = kv.getItem(PREFS_KEY);
    if (raw) return { soundOn: Boolean(JSON.parse(raw).soundOn) };
  } catch {
    /* ignore */
  }
  return { soundOn: false };
}

export function savePrefs(kv: KV, p: Prefs): void {
  try {
    kv.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function memoryKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
