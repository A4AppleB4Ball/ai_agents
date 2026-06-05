"use client";

import { useState } from "react";
import { TestCase } from "@/types/ui-testing";

interface TestHistoryListProps {
  cases: TestCase[];
}

export function TestHistoryList({ cases }: TestHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm" style={{ color: "var(--gray-text)" }}>
          No test cases executed yet
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--gray-text)", opacity: 0.7 }}>
          Test case history will appear here after execution.
        </p>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    pass: { bg: "rgba(40,167,69,0.1)", text: "#155724" },
    fail: { bg: "rgba(220,53,69,0.1)", text: "#721c24" },
    skip: { bg: "rgba(255,193,7,0.1)", text: "#856404" },
    running: { bg: "rgba(131,0,81,0.1)", text: "var(--mulberry)" },
  };

  return (
    <div className="p-4 space-y-2">
      {/* Summary bar */}
      <div
        className="flex items-center gap-4 px-3 py-2 rounded-lg mb-3"
        style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)" }}
      >
        <span className="text-xs" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
          {cases.length} cases
        </span>
        <span className="text-xs" style={{ color: "#28a745", fontFamily: "var(--font-mono)" }}>
          {cases.filter((c) => c.status === "pass").length} pass
        </span>
        <span className="text-xs" style={{ color: "#dc3545", fontFamily: "var(--font-mono)" }}>
          {cases.filter((c) => c.status === "fail").length} fail
        </span>
        <span className="text-xs" style={{ color: "#ffc107", fontFamily: "var(--font-mono)" }}>
          {cases.filter((c) => c.status === "skip").length} skip
        </span>
      </div>

      {/* Case list — deduplicate by id (last occurrence wins) */}
      {cases.filter((c, i, arr) => arr.findLastIndex(x => x.id === c.id) === i).map((testCase) => {
        const isExpanded = expandedId === testCase.id;
        const colors = statusColors[testCase.status] || statusColors.running;

        return (
          <div
            key={testCase.id}
            className="rounded-lg overflow-hidden transition-all"
            style={{ border: "1px solid rgba(131,0,81,0.08)" }}
          >
            {/* Row header */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-black/[0.02] transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : testCase.id)}
            >
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                style={{ background: colors.bg, color: colors.text, fontFamily: "var(--font-mono)" }}
              >
                {testCase.status.toUpperCase()}
              </span>
              <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--foreground)" }}>
                {testCase.name}
              </span>
              <span className="text-[10px] flex-shrink-0" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
                {testCase.id}
              </span>
              <span className="text-[10px] flex-shrink-0" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
                {testCase.duration_ms}ms
              </span>
              <span className="text-[10px]" style={{ color: "var(--gray-text)" }}>
                {isExpanded ? "▴" : "▾"}
              </span>
            </div>

            {/* Expanded steps */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                {testCase.steps.length > 0 ? (
                  <div className="space-y-1.5">
                    {testCase.steps.map((step) => (
                      <div key={step.step} className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: step.status === "pass" ? "#28a745" : "#dc3545" }}
                        />
                        <span className="text-[11px]" style={{ color: "var(--foreground)" }}>
                          {step.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--gray-text)" }}>
                    No steps recorded
                  </p>
                )}
                {testCase.error && (
                  <div
                    className="mt-2 px-2 py-1.5 rounded text-[11px]"
                    style={{ background: "rgba(220,53,69,0.06)", color: "#721c24" }}
                  >
                    {testCase.error}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
