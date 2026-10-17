import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CaseDefinition } from '../case/types';
import type { RubricKey } from '../case/vanishing-referral/rubric';
import { discover, initialState, type GameState, type ScreenId } from './gameState';
import { clearState, loadPrefs, loadState, savePrefs, saveState, type KV, type Prefs } from './storage';
import { playChime } from '../lib/sound';

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface GameCtx {
  c: CaseDefinition;
  rubric: RubricKey;
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  go: (screen: ScreenId) => void;
  /** Discover evidence and announce anything new. */
  reveal: (ids: string[]) => void;
  notify: (title: string, body?: string) => void;
  toasts: Toast[];
  inspecting: string | null;
  openEvidence: (id: string | null) => void;
  glossary: { open: boolean; focus: string | null };
  openGlossary: (id?: string | null) => void;
  closeGlossary: () => void;
  prefs: Prefs;
  setSound: (on: boolean) => void;
  restart: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

const browserKV = (): KV => {
  try {
    return window.localStorage;
  } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
};

export function GameProvider({ c, rubric, children }: { c: CaseDefinition; rubric: RubricKey; children: ReactNode }) {
  const kv = useMemo(browserKV, []);
  const [state, setState] = useState<GameState>(() => loadState(kv, c));
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(kv));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [glossary, setGlossary] = useState<{ open: boolean; focus: string | null }>({ open: false, focus: null });
  const toastId = useRef(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    saveState(kv, state);
  }, [kv, state]);

  const update = useCallback((fn: (s: GameState) => GameState) => setState((s) => fn(s)), []);

  const notify = useCallback((title: string, body?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, title, body }]);
    if (prefsRef.current.soundOn) playChime();
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const reveal = useCallback(
    (ids: string[]) => {
      const fresh = ids.filter((id) => !state.discoveredEvidence.includes(id));
      if (!fresh.length) return;
      setState((s) => discover(s, ids).state);
      for (const id of fresh) {
        const e = c.evidence.find((x) => x.id === id);
        if (e) notify(`New evidence: ${e.id}`, e.title);
      }
    },
    [c, notify, state.discoveredEvidence],
  );

  const go = useCallback((screen: ScreenId) => {
    setState((s) => ({ ...s, screen }));
    window.scrollTo({ top: 0 });
  }, []);

  const openEvidence = useCallback((id: string | null) => {
    setInspecting(id);
    if (id) setState((s) => (s.inspectedEvidence.includes(id) ? s : { ...s, inspectedEvidence: [...s.inspectedEvidence, id] }));
  }, []);

  const restart = useCallback(() => {
    clearState(kv, c.id);
    setInspecting(null);
    // Learning progress belongs to the learner, not the case: keep it across a case restart.
    setState((prev) => ({ ...initialState(c), learning: { ...prev.learning, activeModule: null } }));
  }, [kv, c]);

  const setSound = useCallback(
    (on: boolean) => {
      const p = { soundOn: on };
      setPrefs(p);
      savePrefs(kv, p);
      if (on) playChime();
    },
    [kv],
  );

  const value: GameCtx = {
    c, rubric, state, update, go, reveal, notify, toasts, inspecting, openEvidence,
    glossary,
    openGlossary: (id) => setGlossary({ open: true, focus: id ?? null }),
    closeGlossary: () => setGlossary({ open: false, focus: null }),
    prefs, setSound, restart,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame outside provider');
  return v;
}
