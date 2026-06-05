/**
 * Session initialization Hook
 *
 * [INPUT]: Depends on useSessionStore
 * [OUTPUT]: Exposes useInitializeSessions
 * [POS]: Initialization logic for the hooks module
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session";

interface UseInitializeSessionsOptions {
  loadSessionsFromServer: () => Promise<void>;
  setCurrentSession: (key: string) => void;
  autoSelectFirst?: boolean;
  debugName?: string;
}

export const useInitializeSessions = ({
  loadSessionsFromServer,
  setCurrentSession,
  autoSelectFirst = true,
  debugName = "useInitializeSessions"
}: UseInitializeSessionsOptions) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    loadSessionsFromServer()
      .then(() => {
        const state = useSessionStore.getState();
        if (autoSelectFirst && !state.current_session_key && state.sessions.length > 0) {
          setCurrentSession(state.sessions[0].session_key);
        }
      })
      .catch((err) => {
        console.error(`[${debugName}] Failed to load sessions:`, err);
      });
  }, [loadSessionsFromServer, setCurrentSession, autoSelectFirst, debugName]);

  return isHydrated;
};