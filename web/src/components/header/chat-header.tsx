"use client";

import { memo } from "react";
import { AgentTaskWidget, TodoItem } from "@/components/todo/agent-task-widget";
import { useUser } from "@/components/auth/user-provider";

interface HeaderStats {
  turns?: number;
  tokens?: number;
  ttftMs?: number;
}

interface ChatHeaderProps {
  sessionKey: string | null;
  isLoading: boolean;
  todos?: TodoItem[];
  agentName?: string;
  sessionTitle?: string;
  stats?: HeaderStats;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatTTFT(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const ChatHeader = memo(({ sessionKey, isLoading, todos = [], agentName, sessionTitle, stats }: ChatHeaderProps) => {
  const { user } = useUser();
  const activeTask = todos.find((t) => t.status === "in_progress");
  const sessionId = sessionKey ? sessionKey.slice(-6).toUpperCase() : null;

  return (
    <div
      className="flex items-center justify-between az-glass relative z-10"
      style={{
        height: 64,
        flexShrink: 0,
        padding: "0 36px",
        borderBottom: "1px solid rgba(226,229,231,0.4)",
      }}
    >
      <div
        className="flex items-center gap-[10px] min-w-0"
        style={{ fontSize: 13, color: "var(--graphite)" }}
      >
        <span style={{ color: "var(--gray-text)" }}>AI Agents</span>
        <span style={{ color: "var(--gray-rule)", fontSize: 11 }}>›</span>
        <span style={{ color: "var(--gray-text)" }}>{agentName ?? "Agent"}</span>
        <span style={{ color: "var(--gray-rule)", fontSize: 11 }}>›</span>
        <span className="font-semibold truncate" style={{ color: "var(--ink)" }}>
          {sessionTitle ?? (sessionKey ? "Session" : "New session")}
        </span>
        {sessionId && (
          <span
            className="ml-[10px] az-text-gradient font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.08em",
            }}
          >
            {sessionId}
          </span>
        )}

        {activeTask && (
          <>
            <span style={{ color: "var(--gray-rule)", fontSize: 11, marginLeft: 8 }}>·</span>
            <span
              className="flex items-center gap-2 truncate"
              style={{ color: "var(--mulberry)", fontSize: 12 }}
            >
              <span
                aria-hidden
                className="az-orb az-orb-pulse inline-block"
                style={{ width: 8, height: 8 }}
              />
              <span className="truncate max-w-md">
                {activeTask.activeForm ? activeTask.activeForm : activeTask.content}
              </span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-[14px]">
        {stats?.turns !== undefined && (
          <Stat strong={stats.turns.toString().padStart(2, "0")} label="turns" />
        )}
        {stats?.tokens !== undefined && stats.tokens > 0 && (
          <Stat strong={formatTokens(stats.tokens)} label="tokens" />
        )}
        {stats?.ttftMs !== undefined && stats.ttftMs > 0 && (
          <Stat strong={formatTTFT(stats.ttftMs)} label="TTFT" />
        )}

        <span style={{ width: 1, height: 18, background: "var(--gray-rule)" }} />

        <span
          className="inline-flex items-center gap-2 font-bold uppercase"
          style={{
            padding: "6px 14px 6px 10px",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(131,0,81,0.20)",
            borderRadius: 999,
            color: "var(--mulberry)",
            fontSize: 10.5,
            letterSpacing: "0.10em",
            boxShadow: "0 2px 8px rgba(131,0,81,0.10)",
          }}
        >
          <span aria-hidden className="az-orb az-orb-pulse" style={{ width: 12, height: 12 }} />
          <span>{isLoading ? "Streaming" : "Ready"}</span>
        </span>

        <AgentTaskWidget todos={todos} />

        <span style={{ width: 1, height: 18, background: "var(--gray-rule)" }} />

        <span
          className="flex items-center justify-center font-semibold text-white"
          title={user?.name || "User"}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #830051, #CE0058)",
            fontSize: 11,
            letterSpacing: "-0.02em",
          }}
        >
          {user?.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U"}
        </span>
      </div>
    </div>
  );
});

ChatHeader.displayName = "ChatHeader";

function Stat({ strong, label }: { strong: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      style={{ fontSize: 11, color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}
    >
      <strong
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          color: "var(--ink)",
          fontSize: 14,
          letterSpacing: "-0.01em",
        }}
      >
        {strong}
      </strong>
      <span>{label}</span>
    </span>
  );
}

export default ChatHeader;
