"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { TestExecutionPanel } from "./test-execution-panel";
import { useTestEventParser } from "@/hooks/use-test-event-parser";
import { Message, ResultMessage } from "@/types/message";
import { useAgentStore } from "@/store/agent";
import { useSessionStore } from "@/store/session";

interface UITestingLayoutProps {
  sessionKey: string | null;
  onNewSession: () => void;
}

export function UITestingLayout({ sessionKey, onNewSession }: UITestingLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(50);
  const [messages, setMessages] = useState<Message[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useTestEventParser(messages, true);

  const currentSession = useSessionStore(
    useCallback(
      (state) =>
        sessionKey
          ? state.sessions.find((s) => s.session_key === sessionKey)
          : undefined,
      [sessionKey],
    ),
  );
  const currentAgent = useAgentStore(
    useCallback(
      (state) => {
        if (!currentSession?.agent_id) return undefined;
        return state.agents.find((a) => a.agent_id === currentSession.agent_id);
      },
      [currentSession?.agent_id],
    ),
  );

  const tokenStats = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalCost = 0;
    for (const msg of messages) {
      if (msg.role === "result") {
        const result = msg as ResultMessage;
        if (result.usage) {
          inputTokens += result.usage.input_tokens || 0;
          outputTokens += result.usage.output_tokens || 0;
        }
        if ((result as any).total_cost_usd) {
          totalCost += (result as any).total_cost_usd;
        }
      }
    }
    return { inputTokens, outputTokens, totalCost, tokenBudget: undefined };
  }, [messages]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = Math.min(70, Math.max(30, (x / rect.width) * 100));
      setSplitRatio(pct);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex h-full overflow-hidden">
      {/* Left pane: Chat */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${splitRatio}%`, minWidth: 360 }}
      >
        <ChatInterface sessionKey={sessionKey} onNewSession={onNewSession} onMessagesChange={setMessages} />
      </div>

      {/* Resize handle */}
      <div
        className="relative flex-shrink-0 z-10 group"
        style={{ width: 6 }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute inset-0 transition-colors duration-150"
          style={{
            background: draggingRef.current
              ? "var(--grad-brand)"
              : "rgba(131,0,81,0.12)",
            cursor: "col-resize",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "var(--mulberry)" }}
        />
      </div>

      {/* Right pane: Test Execution */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${100 - splitRatio}%`, minWidth: 360 }}
      >
        <TestExecutionPanel sessionKey={sessionKey} tokenStats={tokenStats} />
      </div>
    </div>
  );
}
