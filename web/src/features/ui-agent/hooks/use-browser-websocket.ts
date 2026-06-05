/**
 * Browser WebSocket Hook
 *
 * Connects to the browser screencast WebSocket endpoint.
 * Handles incoming frames, actions, and session lifecycle messages.
 * Implements auto-reconnect with exponential backoff.
 *
 * When chatSessionKey changes, unsubscribes from old sessions,
 * fetches active sessions for the new chat, and subscribes to them.
 */

import { useCallback, useEffect, useRef } from "react";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";
import { BrowserWsMessage } from "@/features/ui-agent/types/browser";

const MAX_RECONNECT_DELAY_MS = 30000;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const ACTION_CLEAR_DELAY_MS = 2000;

interface ChatSessionsResponse {
  sessions: Array<{
    session_id: string;
    session_name: string;
    url: string;
    created_at: number;
  }>;
  count: number;
}

async function fetchChatSessions(chatSessionKey: string): Promise<ChatSessionsResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const response = await fetch(
    `${apiBase}/agent/v1/ui-testing/chat-sessions/${chatSessionKey}`,
    { credentials: "include" }
  );

  if (response.status === 404) {
    return { sessions: [], count: 0 };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch chat sessions: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function useBrowserWebSocket(wsUrl: string | null, chatSessionKey: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const subscribedIdsRef = useRef<string[]>([]);

  const setFrame = useBrowserStore((s) => s.setFrame);
  const setAction = useBrowserStore((s) => s.setAction);
  const addSession = useBrowserStore((s) => s.addSession);
  const removeSession = useBrowserStore((s) => s.removeSession);
  const setConnected = useBrowserStore((s) => s.setConnected);
  const setChatSessionKey = useBrowserStore((s) => s.setChatSessionKey);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connectFn: () => void) => {
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connectFn, delay);
    },
    []
  );

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback(
    (sessionIds: string[]) => {
      if (sessionIds.length === 0) return;
      sendMessage({ type: "subscribe", session_ids: sessionIds });
      subscribedIdsRef.current = [
        ...new Set([...subscribedIdsRef.current, ...sessionIds]),
      ];
    },
    [sendMessage]
  );

  const unsubscribe = useCallback(
    (sessionIds: string[]) => {
      if (sessionIds.length === 0) return;
      sendMessage({ type: "unsubscribe", session_ids: sessionIds });
      subscribedIdsRef.current = subscribedIdsRef.current.filter(
        (id) => !sessionIds.includes(id)
      );
    },
    [sendMessage]
  );

  const connect = useCallback(() => {
    if (!wsUrl) return;

    clearReconnectTimer();

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      const message: BrowserWsMessage = JSON.parse(event.data);

      switch (message.type) {
        case "frame": {
          setFrame(message.session_id, message.data);
          break;
        }
        case "action": {
          setAction(message.session_id, message);

          // Clear existing timer for this session
          if (actionTimersRef.current[message.session_id]) {
            clearTimeout(actionTimersRef.current[message.session_id]);
          }
          // Auto-clear action after delay
          actionTimersRef.current[message.session_id] = setTimeout(() => {
            setAction(message.session_id, null);
            delete actionTimersRef.current[message.session_id];
          }, ACTION_CLEAR_DELAY_MS);
          break;
        }
        case "session_started": {
          addSession(message);
          // Auto-subscribe to newly started sessions
          subscribe([message.session_id]);
          break;
        }
        case "session_closed": {
          removeSession(message.session_id);
          subscribedIdsRef.current = subscribedIdsRef.current.filter(
            (id) => id !== message.session_id
          );
          break;
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      scheduleReconnect(connect);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [wsUrl, clearReconnectTimer, scheduleReconnect, setFrame, setAction, addSession, removeSession, setConnected, subscribe]);

  // Connect/disconnect WebSocket
  useEffect(() => {
    connect();
    return () => {
      clearReconnectTimer();
      Object.values(actionTimersRef.current).forEach(clearTimeout);
      actionTimersRef.current = {};
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [connect, clearReconnectTimer, setConnected]);

  // Handle chat session key changes
  useEffect(() => {
    setChatSessionKey(chatSessionKey);

    // Unsubscribe from previously subscribed sessions
    if (subscribedIdsRef.current.length > 0) {
      unsubscribe([...subscribedIdsRef.current]);
    }

    if (!chatSessionKey) {
      return;
    }

    // Fetch sessions for the new chat and subscribe
    let cancelled = false;

    fetchChatSessions(chatSessionKey).then((data) => {
      if (cancelled) return;

      for (const session of data.sessions) {
        addSession({
          session_id: session.session_id,
          session_name: session.session_name,
          url: session.url,
          created_at: session.created_at,
          screencast_active: true,
        });
      }

      const sessionIds = data.sessions.map((s) => s.session_id);
      if (sessionIds.length > 0) {
        subscribe(sessionIds);
      }
    }).catch((error) => {
      if (!cancelled) {
        console.error("[useBrowserWebSocket] Failed to fetch chat sessions:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chatSessionKey, setChatSessionKey, addSession, subscribe, unsubscribe]);

  const isConnected = useBrowserStore((s) => s.isConnected);

  return { isConnected, subscribe, unsubscribe };
}
