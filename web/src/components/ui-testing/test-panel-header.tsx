"use client";

import { TestCase, TestSessionStatus } from "@/types/ui-testing";

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  tokenBudget?: number;
}

interface TestPanelHeaderProps {
  sessionStatus: TestSessionStatus;
  cases: TestCase[];
  tokenStats?: TokenStats;
  onReset: () => void;
}

const STATUS_CONFIG: Record<TestSessionStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "IDLE", color: "var(--gray-text)", pulse: false },
  ready: { label: "READY", color: "#28a745", pulse: false },
  testing: { label: "TESTING", color: "var(--mulberry)", pulse: true },
  closed: { label: "CLOSED", color: "var(--gray-text)", pulse: false },
};

function formatTokensShort(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function TestPanelHeader({ sessionStatus, cases, tokenStats, onReset }: TestPanelHeaderProps) {
  const config = STATUS_CONFIG[sessionStatus];
  const passCount = cases.filter((c) => c.status === "pass").length;
  const failCount = cases.filter((c) => c.status === "fail").length;
  const skipCount = cases.filter((c) => c.status === "skip").length;
  const totalCount = cases.length;

  const totalTokens = tokenStats ? tokenStats.inputTokens + tokenStats.outputTokens : 0;
  const budgetPct = tokenStats?.tokenBudget ? Math.min(100, (totalTokens / tokenStats.tokenBudget) * 100) : null;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
      style={{ borderColor: "rgba(131,0,81,0.08)" }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${config.pulse ? "animate-pulse" : ""}`}
            style={{ background: config.color }}
          />
          <span
            className="text-xs font-semibold"
            style={{
              color: config.color,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
            }}
          >
            {config.label}
          </span>
        </div>

        <span className="text-xs" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
          UI Testing Agent
        </span>
      </div>

      {/* Center: Summary counts + token stats */}
      <div className="flex items-center gap-4">
        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: "#28a745", fontFamily: "var(--font-mono)" }}>
              {passCount} pass
            </span>
            {failCount > 0 && (
              <span className="text-xs font-medium" style={{ color: "#dc3545", fontFamily: "var(--font-mono)" }}>
                {failCount} fail
              </span>
            )}
            {skipCount > 0 && (
              <span className="text-xs font-medium" style={{ color: "#ffc107", fontFamily: "var(--font-mono)" }}>
                {skipCount} skip
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
              / {totalCount} total
            </span>
          </div>
        )}

        {tokenStats && totalTokens > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ width: 1, height: 14, background: "rgba(131,0,81,0.12)" }} />
            <span className="text-[10px]" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
              ↑{formatTokensShort(tokenStats.inputTokens)} ↓{formatTokensShort(tokenStats.outputTokens)}
            </span>
            {tokenStats.totalCost > 0 && (
              <span className="text-[10px]" style={{ color: "var(--mulberry)", fontFamily: "var(--font-mono)" }}>
                ${tokenStats.totalCost.toFixed(3)}
              </span>
            )}
            {budgetPct !== null && (
              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ width: 48, background: "rgba(131,0,81,0.08)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${budgetPct}%`,
                    background: budgetPct > 80 ? "#dc3545" : "var(--mulberry)",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Reset */}
      <button
        onClick={onReset}
        className="text-xs px-2 py-1 rounded transition-colors hover:bg-black/5"
        style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}
      >
        Reset
      </button>
    </div>
  );
}
