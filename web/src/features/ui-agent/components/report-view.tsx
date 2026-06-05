/**
 * Report View
 *
 * Displays test results after completion.
 * Shows summary bar, per-test-case collapsible cards with steps and screenshots.
 */

"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, Download, Clock } from "lucide-react";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";
import { TestCaseResult } from "@/features/ui-agent/types/browser";

function StatusIcon({ status }: { status: "pass" | "fail" | "skip" }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    case "fail":
      return <XCircle size={16} className="text-red-500" />;
    case "skip":
      return <MinusCircle size={16} className="text-gray-400" />;
  }
}

function TestCaseCard({ testCase }: { testCase: TestCaseResult }) {
  const [isExpanded, setIsExpanded] = useState(testCase.status === "fail");
  const [enlargedScreenshot, setEnlargedScreenshot] = useState<string | null>(null);

  return (
    <>
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Card header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <StatusIcon status={testCase.status} />
          <span className="flex-1 text-sm font-medium text-left truncate">
            {testCase.name}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            {testCase.duration_ms}ms
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-muted-foreground" />
          </motion.span>
        </button>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                {/* Error message */}
                {testCase.error && (
                  <div
                    className="mb-3 px-3 py-2 rounded-md text-xs"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {testCase.error}
                  </div>
                )}

                {/* Steps */}
                <div className="space-y-2">
                  {testCase.steps.map((step) => (
                    <div
                      key={`${testCase.id}-step-${step.step}`}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                        style={{
                          background:
                            step.status === "pass"
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(239,68,68,0.1)",
                          color: step.status === "pass" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {step.step}
                      </span>
                      <span className="flex-1 text-muted-foreground pt-0.5">
                        {step.description}
                      </span>
                      {step.screenshot_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnlargedScreenshot(step.screenshot_url!);
                          }}
                          className="w-10 h-7 rounded border overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-mulberry/30 transition-shadow"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <img
                            src={step.screenshot_url}
                            alt={`Step ${step.step}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Screenshot lightbox */}
      <AnimatePresence>
        {enlargedScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setEnlargedScreenshot(null)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={enlargedScreenshot}
              alt="Screenshot enlarged"
              className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ReportView() {
  const report = useBrowserStore((s) => s.currentReport);

  const handleDownload = useCallback(() => {
    if (!report?.html) {
      throw new Error("No HTML report available for download");
    }
    const blob = new Blob([report.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-report-${report.run_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 size={40} style={{ color: "rgba(131,0,81,0.3)" }} />
        </motion.div>
        <p className="text-sm text-muted-foreground">No report available</p>
        <p className="text-xs text-muted-foreground/60">
          Run a test to generate a report
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Summary bar */}
      <div
        className="flex items-center gap-4 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            {report.summary.pass} pass
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={12} />
            {report.summary.fail} fail
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            <MinusCircle size={12} />
            {report.summary.skip} skip
          </span>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {report.generated_at}
        </span>

        {report.html && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-muted"
            style={{ color: "var(--mulberry)" }}
          >
            <Download size={13} />
            Download
          </button>
        )}
      </div>

      {/* Test cases */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {report.test_cases.map((tc) => (
          <TestCaseCard key={tc.id} testCase={tc} />
        ))}
      </div>
    </div>
  );
}
