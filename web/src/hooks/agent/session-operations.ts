/**
 * Session operation functions
 */

import { Message } from '@/types';
import { getSessionMessages } from "@/lib/agent-api";

/**
 * Create new session operation
 */
export function createStartSession(
  setstring: (id: string) => void,
  setMessages: (messages: Message[]) => void,
  setToolCalls: (calls: any[]) => void,
  setError: (error: string | null) => void,
  setIsLoading: (loading: boolean) => void
) {
  return () => {
    const newstring = crypto.randomUUID();
    setstring(newstring);
    setMessages([]);
    setToolCalls([]);
    setError(null);
    setIsLoading(false);
  };
}

/**
 * Load the specified session
 * Set sessionKey and load historical messages from the backend
 */
export const createLoadSession = (
  setstring: (id: string) => void,
  setMessages: (messages: Message[]) => void,
  setError: (error: string | null) => void,
) => async (id: string): Promise<void> => {
  try {
    console.debug('[loadSession] Starting to load session:', id);

    // 1. Set sessionKey
    console.debug('[loadSession] Setting sessionKey:', id);
    setstring(id);

    // 2. Clear current messages
    setMessages([]);
    setError(null);

    // 3. Load historical messages
    console.debug('[loadSession] Calling getSessionMessages API');
    const data = await getSessionMessages(id);

    if (data && Array.isArray(data)) {
      setMessages(data);
    } else {
      console.debug(`[loadSession] No valid message data received:`, data);
    }
  } catch (err) {
    console.error('[loadSession] Failed to load session:', err);
    setError(err instanceof Error ? err.message : 'Failed to load session');
  }
};

/**
 * Clear session operation
 */
export function createClearSession(
  setMessages: (messages: Message[]) => void,
  setToolCalls: (calls: any[]) => void,
  setError: (error: string | null) => void,
  setIsLoading: (loading: boolean) => void,
  setstring: (id: string | null) => void,
  abortControllerRef: React.RefObject<AbortController | null>
) {
  return () => {
    setMessages([]);
    setToolCalls([]);
    setError(null);
    setIsLoading(false);
    setstring(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
}

/**
 * Reset session operation (create a new session)
 */
export function createResetSession(startSession: () => void) {
  return () => {
    startSession();
  };
}

/**
 * Load historical messages
 */
export function createLoadHistoryMessages(
  setMessages: (messages: Message[]) => void,
  updateSession: (id: string, params: any) => void,
) {
  return async (sessionKey: string) => {
    try {
      const messages = await getSessionMessages(sessionKey);
      if (Array.isArray(messages)) {
        console.debug(`[useAgentSession] Loaded ${messages.length} messages`);
        setMessages(messages);

        // Also update the cache in the session store
        updateSession(sessionKey, { messages });
      }
    } catch (err) {
      console.error('[useAgentSession] Failed to load history:', err);
    }
  };
}
