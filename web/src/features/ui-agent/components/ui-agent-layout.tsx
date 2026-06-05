/**
 * UI Agent Layout
 *
 * Split panel layout for the UI-Agent: left ChatInterface, right BrowserPanel.
 * Features a resizable drag handle (min 30%, max 70%, default 40% chat / 60% browser).
 * Connects to browser WebSocket on mount.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatInterface } from "@/components/chat-interface";
import { BrowserPanel } from "@/features/ui-agent/components/browser-panel";
import { useBrowserWebSocket } from "@/features/ui-agent/hooks/use-browser-websocket";
import { useAuthWsUrl } from "@/hooks/use-auth-ws-url";

interface UIAgentLayoutProps {
  sessionKey: string | null;
  onNewSession: () => void;
}

const MIN_SPLIT = 0.3;
const MAX_SPLIT = 0.7;
const DEFAULT_SPLIT = 0.4;

export function UIAgentLayout({ sessionKey, onNewSession }: UIAgentLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build WebSocket URL for browser endpoint
  const chatWsUrl = useAuthWsUrl();
  const browserWsBase =
    process.env.NEXT_PUBLIC_WS_URL?.replace("/chat/ws", "/browser/ws") ||
    "ws://localhost:8010/agent/v1/browser/ws";
  const browserWsUrl = useAuthWsUrl(browserWsBase);

  useBrowserWebSocket(browserWsUrl, sessionKey);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const ratio = Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, x / rect.width));
        setSplitRatio(ratio);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 flex h-full overflow-hidden relative"
      style={{ cursor: isDragging ? "col-resize" : undefined }}
    >
      {/* Left pane: Chat */}
      <motion.div
        className="h-full overflow-hidden"
        style={{ width: `${splitRatio * 100}%` }}
        animate={{ width: `${splitRatio * 100}%` }}
        transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      >
        <ChatInterface sessionKey={sessionKey} onNewSession={onNewSession} />
      </motion.div>

      {/* Drag handle */}
      <div
        className="relative flex-shrink-0 group"
        style={{ width: 6, cursor: "col-resize" }}
        onMouseDown={handleMouseDown}
      >
        {/* Handle track */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] transition-all duration-200"
          style={{
            background: isDragging
              ? "var(--mulberry)"
              : "var(--border)",
          }}
        />

        {/* Handle grip (visible on hover/drag) */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-10 rounded-full flex items-center justify-center"
          style={{
            background: isDragging ? "var(--mulberry)" : "var(--border)",
            opacity: isDragging ? 1 : 0,
          }}
          whileHover={{ opacity: 1, background: "var(--mulberry)" }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
          </div>
        </motion.div>
      </div>

      {/* Right pane: Browser */}
      <motion.div
        className="h-full overflow-hidden p-2"
        style={{ width: `${(1 - splitRatio) * 100}%` }}
        animate={{ width: `${(1 - splitRatio) * 100}%` }}
        transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      >
        <BrowserPanel />
      </motion.div>
    </div>
  );
}
