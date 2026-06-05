"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAgentSession } from "@/hooks/agent";
import { MessageItem } from "@/components/message";
import { useExtractTodos } from "@/hooks/use-extract-todos";
import { useSessionLoader } from "@/hooks/use-session-loader";
import { useAuthWsUrl } from "@/hooks/use-auth-ws-url";
import { useSessionStore } from "@/store/session";
import { useAgentStore } from "@/store/agent";

import ChatHeader from "@/components/header/chat-header";
import ChatInput from "@/components/chat/chat-input";
import { EmptyState } from "@/components/empty-state";
import { TopoArt } from "@/components/decor/topo-art";
import { Message, ResultMessage } from "@/types/message";

interface ChatInterfaceProps {
  sessionKey: string | null;
  onNewSession: () => void;
}

function groupMessagesByRound(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const roundId = msg.round_id || msg.message_id;
    if (!groups.has(roundId)) groups.set(roundId, []);
    groups.get(roundId)!.push(msg);
  }
  return groups;
}

export function ChatInterface({ sessionKey: externalSessionKey, onNewSession }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendStartRef = useRef<number | null>(null);
  const [ttftByRound, setTtftByRound] = useState<Record<string, number>>({});
  const [scrollProgress, setScrollProgress] = useState(0);

  const currentSession = useSessionStore(
    useCallback(
      (state) =>
        externalSessionKey
          ? state.sessions.find((session) => session.session_key === externalSessionKey)
          : undefined,
      [externalSessionKey],
    ),
  );
  const loadSessionsFromServer = useSessionStore((state) => state.loadSessionsFromServer);
  const currentAgent = useAgentStore(
    useCallback(
      (state) => {
        if (!currentSession?.agent_id) return undefined;
        return state.agents.find((agent) => agent.agent_id === currentSession.agent_id);
      },
      [currentSession?.agent_id],
    ),
  );
  const includePartialMessages = currentAgent?.options?.include_partial_messages ?? true;
  const authWsUrl = useAuthWsUrl();

  const {
    error,
    messages,
    sessionKey,
    isLoading,
    pendingPermissions,
    sendMessage,
    stopGeneration,
    loadSession,
    sendPermissionResponse,
    deleteRound,
    regenerate,
  } = useAgentSession({
    wsUrl: authWsUrl ?? "",
    includePartialMessages,
    onError: (err) => {
      console.error("Session error:", err);
    },
  });

  const todos = useExtractTodos(messages, externalSessionKey);
  useSessionLoader(externalSessionKey, loadSession, "ChatInterface");

  const messageGroups = useMemo(() => groupMessagesByRound(messages), [messages]);

  // Track time-to-first-token: capture first arrival of an assistant message after a user send.
  useEffect(() => {
    if (!isLoading || sendStartRef.current === null) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const sentAt = sendStartRef.current;
    // First assistant chunk for the latest round resets sendStartRef
    const lastUser = messages[messages.length - 1 - lastUserIdx];
    const roundId = lastUser.round_id || lastUser.message_id;
    const hasAssistantChunk = messages.some(
      (m) => m.role === "assistant" && (m.round_id || m.message_id) === roundId,
    );
    if (hasAssistantChunk && !ttftByRound[roundId]) {
      const elapsed = Date.now() - sentAt;
      setTtftByRound((prev) => ({ ...prev, [roundId]: elapsed }));
      sendStartRef.current = null;
    }
  }, [messages, isLoading, ttftByRound]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
        }
      }, 50);
    });
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    sendStartRef.current = Date.now();
    const isFirstMessage = !currentSession?.title || currentSession.title === "New Chat";
    await sendMessage(content);
    if (isFirstMessage) {
      void loadSessionsFromServer();
    }
  };

  const handleStop = () => {
    stopGeneration();
  };

  const roundIds = Array.from(messageGroups.keys());

  // Header stats: aggregate across all result messages
  const headerStats = useMemo(() => {
    let totalTokens = 0;
    let lastTtft: number | undefined;
    for (const id of roundIds) {
      const ms = messageGroups.get(id) || [];
      const result = ms.find((m) => m.role === "result") as ResultMessage | undefined;
      if (result?.usage) {
        totalTokens += (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
      }
      if (ttftByRound[id]) lastTtft = ttftByRound[id];
    }
    return { turns: roundIds.length, tokens: totalTokens, ttftMs: lastTtft };
  }, [roundIds, messageGroups, ttftByRound]);

  const sessionShortId = sessionKey ? sessionKey.slice(-6).toUpperCase() : undefined;

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden az-aurora-bg">
      {/* Topographic decorative art */}
      <TopoArt variant="br" />
      <TopoArt variant="tl" />
      {/* Film grain overlay */}
      <div aria-hidden className="az-grain-overlay" />

      {/* WebSocket connection error notification */}
      {error && error.includes("server") && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
          <div
            className="rounded-2xl px-4 py-3 backdrop-blur-md flex items-start gap-3"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(206,0,88,0.32)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span
              aria-hidden
              className="az-orb az-orb-pulse mt-1"
              style={{ width: 10, height: 10, flexShrink: 0 }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--mulberry)" }}>
                Cannot connect to backend service
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--gray-text)" }}>
                Please ensure backend service is running (port 8010)
              </p>
            </div>
          </div>
        </div>
      )}

      {!externalSessionKey ? (
        <EmptyState onNewSession={onNewSession} />
      ) : (
        <>
          <ChatHeader
            sessionKey={sessionKey}
            isLoading={isLoading}
            todos={todos}
            agentName={currentAgent?.name}
            sessionTitle={currentSession?.title}
            stats={headerStats}
          />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative z-[1] scroll-smooth"
            style={{ padding: "40px 0 24px" }}
          >
            {/* Progress rail */}
            <div
              aria-hidden
              className="hidden xl:block absolute pointer-events-none"
              style={{
                right: "calc(50% - 520px)",
                top: 40,
                width: 4,
                bottom: 24,
                background: "rgba(131,0,81,0.06)",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(4, scrollProgress * 100)}%`,
                  background: "var(--grad-brand)",
                  borderRadius: 2,
                  boxShadow: "0 0 12px rgba(206,0,88,0.4)",
                  transition: "height 120ms ease-out",
                }}
              />
            </div>

            {roundIds.map((roundId, idx) => {
              const roundMessages = messageGroups.get(roundId) || [];
              const isLastRound = idx === roundIds.length - 1;
              return (
                <MessageItem
                  key={roundId}
                  roundId={roundId}
                  roundIndex={idx + 1}
                  messages={roundMessages}
                  isLastRound={isLastRound}
                  isLoading={isLoading}
                  pendingPermissions={pendingPermissions}
                  onPermissionResponse={sendPermissionResponse}
                  onDelete={deleteRound}
                  onRegenerate={isLastRound ? regenerate : undefined}
                  agentName={currentAgent?.name}
                  sessionId={sessionShortId}
                  ttftMs={ttftByRound[roundId]}
                />
              );
            })}
          </div>

          <ChatInput
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onStop={handleStop}
            agentName={currentAgent?.name}
          />
        </>
      )}
    </div>
  );
}
