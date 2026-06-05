"use client";

import { useCallback, useState } from "react";
import { useUITestingStore } from "@/store/ui-testing";
import { LiveExecutionView } from "./live-execution-view";
import { ScreenshotGallery } from "./screenshot-gallery";
import { TestHistoryList } from "./test-history-list";
import { TestReportView } from "./test-report-view";
import { TestPanelHeader } from "./test-panel-header";

type TabId = "live" | "screenshots" | "history" | "report";

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  tokenBudget?: number;
}

interface TestExecutionPanelProps {
  sessionKey: string | null;
  tokenStats?: TokenStats;
}

export function TestExecutionPanel({ sessionKey, tokenStats }: TestExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const { session_status, cases, screenshots, report } = useUITestingStore();

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "live", label: "Live" },
    { id: "screenshots", label: "Screenshots", count: screenshots.length || undefined },
    { id: "history", label: "History", count: cases.length || undefined },
    { id: "report", label: "Report" },
  ];

  const handleReset = useCallback(() => {
    useUITestingStore.getState().reset();
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: "rgba(26,26,46,0.03)" }}>
      {/* Header */}
      <TestPanelHeader
        sessionStatus={session_status}
        cases={cases}
        tokenStats={tokenStats}
        onReset={handleReset}
      />

      {/* Tabs */}
      <div
        className="flex border-b px-4 gap-1 flex-shrink-0"
        style={{ borderColor: "rgba(131,0,81,0.1)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-2 text-xs font-medium transition-colors relative"
            style={{
              color: activeTab === tab.id ? "var(--mulberry)" : "var(--gray-text)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  background: activeTab === tab.id ? "rgba(131,0,81,0.1)" : "rgba(0,0,0,0.05)",
                  color: activeTab === tab.id ? "var(--mulberry)" : "var(--gray-text)",
                }}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--grad-brand)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "live" && <LiveExecutionView />}
        {activeTab === "screenshots" && <ScreenshotGallery screenshots={screenshots} />}
        {activeTab === "history" && <TestHistoryList cases={cases} />}
        {activeTab === "report" && <TestReportView report={report} />}
      </div>
    </div>
  );
}
