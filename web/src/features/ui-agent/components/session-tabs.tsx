/**
 * Session Tabs
 *
 * Horizontal tab bar for parallel browser sessions.
 * Each tab shows session name and active status indicator.
 */

"use client";

import { motion } from "framer-motion";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";

export function SessionTabs() {
  const sessions = useBrowserStore((s) => s.sessions);
  const activeSessionId = useBrowserStore((s) => s.activeSessionId);
  const setActiveSession = useBrowserStore((s) => s.setActiveSession);

  if (sessions.length <= 1) return null;

  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto custom-scrollbar"
      style={{
        background: "rgba(15, 15, 30, 0.6)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {sessions.map((session) => {
        const isActive = session.session_id === activeSessionId;
        return (
          <button
            key={session.session_id}
            onClick={() => setActiveSession(session.session_id)}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors"
            style={{
              color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
              background: isActive ? "rgba(131,0,81,0.15)" : "transparent",
            }}
          >
            {/* Status dot */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: session.screencast_active ? "#28c840" : "#6b7370",
              }}
            />

            {/* Session name */}
            <span className="truncate max-w-[120px]">{session.session_name}</span>

            {/* Active underline */}
            {isActive && (
              <motion.div
                layoutId="session-tab-underline"
                className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                style={{ background: "var(--mulberry)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
