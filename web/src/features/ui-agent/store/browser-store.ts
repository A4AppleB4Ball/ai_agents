/**
 * Browser Store
 *
 * Zustand store managing browser panel state for the UI-Agent feature.
 * Holds session info, screencast frames, actions, reports, and run history.
 */

import { create } from "zustand";
import {
  BrowserAction,
  BrowserSessionInfo,
  PanelMode,
  TestReport,
  TestRunSummary,
} from "@/features/ui-agent/types/browser";

export interface BrowserStoreState {
  sessions: BrowserSessionInfo[];
  activeSessionId: string | null;
  currentFrame: Record<string, string>;
  currentAction: Record<string, BrowserAction | null>;
  panelMode: PanelMode;
  currentReport: TestReport | null;
  runs: TestRunSummary[];
  isConnected: boolean;
  chatSessionKey: string | null;

  setFrame: (sessionId: string, data: string) => void;
  setAction: (sessionId: string, action: BrowserAction | null) => void;
  addSession: (session: BrowserSessionInfo) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  setPanelMode: (mode: PanelMode) => void;
  setReport: (report: TestReport | null) => void;
  setRuns: (runs: TestRunSummary[]) => void;
  setConnected: (connected: boolean) => void;
  setChatSessionKey: (key: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessions: [] as BrowserSessionInfo[],
  activeSessionId: null as string | null,
  currentFrame: {} as Record<string, string>,
  currentAction: {} as Record<string, BrowserAction | null>,
  panelMode: "live" as PanelMode,
  currentReport: null as TestReport | null,
  runs: [] as TestRunSummary[],
  isConnected: false,
  chatSessionKey: null as string | null,
};

export const useBrowserStore = create<BrowserStoreState>()((set) => ({
  ...initialState,

  setFrame: (sessionId: string, data: string) => {
    set((state) => ({
      currentFrame: { ...state.currentFrame, [sessionId]: data },
    }));
  },

  setAction: (sessionId: string, action: BrowserAction | null) => {
    set((state) => ({
      currentAction: { ...state.currentAction, [sessionId]: action },
    }));
  },

  addSession: (session: BrowserSessionInfo) => {
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: state.activeSessionId ?? session.session_id,
    }));
  },

  removeSession: (sessionId: string) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.session_id !== sessionId);
      const newFrame = { ...state.currentFrame };
      delete newFrame[sessionId];
      const newAction = { ...state.currentAction };
      delete newAction[sessionId];
      return {
        sessions: filtered,
        currentFrame: newFrame,
        currentAction: newAction,
        activeSessionId:
          state.activeSessionId === sessionId
            ? (filtered[0]?.session_id ?? null)
            : state.activeSessionId,
      };
    });
  },

  setActiveSession: (sessionId: string | null) => {
    set({ activeSessionId: sessionId });
  },

  setPanelMode: (mode: PanelMode) => {
    set({ panelMode: mode });
  },

  setReport: (report: TestReport | null) => {
    set({ currentReport: report });
  },

  setRuns: (runs: TestRunSummary[]) => {
    set({ runs });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  setChatSessionKey: (key: string | null) => {
    set({
      chatSessionKey: key,
      sessions: [],
      activeSessionId: null,
      currentFrame: {},
      currentAction: {},
    });
  },

  reset: () => {
    set(initialState);
  },
}));
