/**
 * Browser Panel
 *
 * Right panel of the UI-Agent layout.
 * Contains mode tabs (Live/Report/History) and conditionally renders
 * the active view: LiveViewport, ReportView, or RunsHistory.
 * Shows a contextual empty state when no browser sessions are active.
 */

"use client";

import { motion } from "framer-motion";
import { Radio, FileText, FolderClock, Globe } from "lucide-react";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";
import { PanelMode } from "@/features/ui-agent/types/browser";
import { LiveViewport } from "@/features/ui-agent/components/live-viewport";
import { SessionTabs } from "@/features/ui-agent/components/session-tabs";
import { ReportView } from "@/features/ui-agent/components/report-view";
import { RunsHistory } from "@/features/ui-agent/components/runs-history";

const MODE_TABS: { id: PanelMode; label: string; icon: typeof Radio }[] = [
  { id: "live", label: "Live", icon: Radio },
  { id: "report", label: "Report", icon: FileText },
  { id: "history", label: "History", icon: FolderClock },
];

export function BrowserPanel() {
  const panelMode = useBrowserStore((s) => s.panelMode);
  const setPanelMode = useBrowserStore((s) => s.setPanelMode);
  const isConnected = useBrowserStore((s) => s.isConnected);
  const sessions = useBrowserStore((s) => s.sessions);

  const showLiveEmptyState = panelMode === "live" && sessions.length === 0;

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-xl border"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Mode tabs header */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted">
          {MODE_TABS.map((tab) => {
            const isActive = panelMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setPanelMode(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="panel-mode-pill"
                    className="absolute inset-0 rounded-md"
                    style={{ background: "var(--mulberry)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={13} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Connection indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isConnected ? "#28c840" : "#ef4444" }}
          />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {panelMode === "live" && showLiveEmptyState && (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center gap-4 px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <motion.div
              animate={{
                scale: [1, 1.06, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Globe size={48} style={{ color: "rgba(131,0,81,0.4)" }} strokeWidth={1.2} />
            </motion.div>
            <p
              className="text-sm text-center"
              style={{ color: "var(--muted-foreground)" }}
            >
              Start testing to see browser activity here
            </p>
            <p
              className="text-xs text-center max-w-[280px]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Browser sessions will appear once you initiate a test run from the chat
            </p>
          </motion.div>
        )}
        {panelMode === "live" && !showLiveEmptyState && (
          <>
            <SessionTabs />
            <LiveViewport />
          </>
        )}
        {panelMode === "report" && <ReportView />}
        {panelMode === "history" && <RunsHistory />}
      </div>
    </div>
  );
}
