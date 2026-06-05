import { useEffect, useRef } from "react";

/**
 * Session loader — listens for session_key changes and triggers loading
 *
 * [INPUT]: External session_key + loadSession callback
 * [OUTPUT]: None (side-effect hook)
 * [POS]: Session loading logic for the hooks module
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */
export const useSessionLoader = (
  sessionKey: string | null,
  loadSession: (key: string) => void,
  debugName = "useSessionLoader"
) => {
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (prevKey.current === sessionKey) return;
    prevKey.current = sessionKey;

    if (sessionKey) {
      console.debug(`[${debugName}] Loading session:`, sessionKey);
      loadSession(sessionKey);
    }
  }, [sessionKey, loadSession, debugName]);
};