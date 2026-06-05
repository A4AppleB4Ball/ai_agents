/**
 * Session Store - Main entry
 *
 * [INPUT]: Depends on zustand, ./types, and ./actions
 * [OUTPUT]: Provides useSessionStore
 * [POS]: Main entry point for the store/session module
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SessionStoreState } from './types';
import * as actions from './actions';

// ==================== Store creation ====================

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      sessions: [],
      current_session_key: null,
      loading: false,
      error: null,

      createSession: actions.createSessionAction(set, get),
      deleteSession: actions.deleteSessionAction(set, get),
      updateSession: actions.updateSessionAction(set),
      setCurrentSession: actions.setCurrentSessionAction(set),
      getSession: actions.getSessionAction(get),
      loadSessionsFromServer: actions.loadSessionsFromServerAction(set, get),
      clearAllSessions: actions.clearAllSessionsAction(set),
    }),
    {
      name: 'agent-ui-sessions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        current_session_key: state.current_session_key,
      }),
    }
  )
);

// ==================== Exports ====================

export type { SessionStoreState } from './types';
export { generateSessionKey, createDefaultSession } from './utils';
