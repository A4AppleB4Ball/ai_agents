/**
 * Runs History
 *
 * Table showing past test runs with results.
 * Clicking a row fetches that run's report and switches to report view.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, CheckCircle2, XCircle } from "lucide-react";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";
import { TestReport, TestRunSummary } from "@/features/ui-agent/types/browser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchRuns(): Promise<TestRunSummary[]> {
  const response = await fetch(`${API_BASE}/agent/v1/ui-testing/runs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch runs: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchRunReport(runId: string): Promise<TestReport> {
  const response = await fetch(`${API_BASE}/agent/v1/ui-testing/runs/${runId}/report`);
  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsHistory() {
  const runs = useBrowserStore((s) => s.runs);
  const setRuns = useBrowserStore((s) => s.setRuns);
  const setReport = useBrowserStore((s) => s.setReport);
  const setPanelMode = useBrowserStore((s) => s.setPanelMode);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchRuns()
      .then((data) => {
        setRuns(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [setRuns]);

  const handleRowClick = useCallback(
    async (run: TestRunSummary) => {
      const report = await fetchRunReport(run.run_id);
      setReport(report);
      setPanelMode("report");
    },
    [setReport, setPanelMode]
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-14 rounded-lg"
            style={{ background: "var(--muted)" }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <XCircle size={32} className="text-red-400" />
        <p className="text-sm text-muted-foreground">Failed to load runs</p>
        <p className="text-xs text-muted-foreground/60">{error}</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <History size={44} style={{ color: "rgba(131,0,81,0.25)" }} strokeWidth={1.2} />
        </motion.div>
        <p className="text-sm text-muted-foreground">No test runs yet</p>
        <p className="text-xs text-muted-foreground/60">
          Start a UI test to see run history here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <table className="w-full text-xs">
        <thead>
          <tr
            className="text-left border-b"
            style={{ borderColor: "var(--border)", color: "var(--gray-text)" }}
          >
            <th className="px-4 py-2.5 font-medium">Run ID</th>
            <th className="px-4 py-2.5 font-medium">Target URL</th>
            <th className="px-4 py-2.5 font-medium">Result</th>
            <th className="px-4 py-2.5 font-medium">Duration</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, idx) => (
            <motion.tr
              key={run.run_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              onClick={() => handleRowClick(run)}
              className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)" }}>
                {run.run_id.slice(0, 8)}
              </td>
              <td className="px-4 py-3 truncate max-w-[180px]">{run.target_url}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2
                    size={12}
                    className={run.fail === 0 ? "text-emerald-500" : "text-amber-500"}
                  />
                  <span className="font-medium">
                    {run.pass}/{run.total}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDuration(run.duration_ms)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(run.created_at)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
