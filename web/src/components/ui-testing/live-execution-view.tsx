"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUITestingStore } from "@/store/ui-testing";
import { BrowserViewport } from "./browser-viewport";
import { TestStep } from "@/types/ui-testing";

function inferActionFromStep(step: TestStep): { type: string; description: string; selector?: string } | undefined {
  const desc = step.description.toLowerCase();
  if (desc.includes("click")) return { type: "click", description: step.description };
  if (desc.includes("type") || desc.includes("fill") || desc.includes("input"))
    return { type: "type", description: step.description };
  if (desc.includes("navigate") || desc.includes("goto") || desc.includes("url"))
    return { type: "navigate", description: step.description };
  if (desc.includes("assert") || desc.includes("verify") || desc.includes("check") || desc.includes("expect"))
    return { type: "assert", description: step.description };
  if (desc.includes("scroll")) return { type: "scroll", description: step.description };
  if (desc.includes("hover")) return { type: "hover", description: step.description };
  if (desc.includes("screenshot") || desc.includes("capture"))
    return { type: "screenshot", description: step.description };
  return { type: "click", description: step.description };
}

export function LiveExecutionView() {
  const { session_status, session_url, current_case, cases, planned_cases } = useUITestingStore();
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  const allSteps = useMemo(() => {
    if (current_case) return current_case.steps;
    const lastCase = cases.at(-1);
    return lastCase?.steps || [];
  }, [current_case, cases]);

  const activeStep = selectedStepIdx !== null ? allSteps[selectedStepIdx] : allSteps.at(-1);

  const latestScreenshot = useMemo(() => {
    if (selectedStepIdx !== null) {
      return allSteps[selectedStepIdx]?.screenshot_base64 || null;
    }
    for (let i = allSteps.length - 1; i >= 0; i--) {
      if (allSteps[i].screenshot_base64) return allSteps[i].screenshot_base64;
    }
    return null;
  }, [allSteps, selectedStepIdx]);

  const currentAction = useMemo(() => {
    if (session_status !== "testing" || !current_case) return undefined;
    const lastStep = current_case.steps.at(-1);
    if (!lastStep) return undefined;
    return inferActionFromStep(lastStep) as any;
  }, [session_status, current_case]);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allSteps.length]);

  if (session_status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="relative mb-4">
          <div
            className="w-20 h-14 rounded-lg"
            style={{ border: "2px solid rgba(131,0,81,0.2)", background: "rgba(131,0,81,0.03)" }}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: "rgba(131,0,81,0.1)", color: "var(--mulberry)", border: "2px solid rgba(131,0,81,0.2)" }}
          >
            ⊙
          </div>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--gray-text)" }}>
          Interactive Browser View
        </p>
        <p className="text-xs max-w-[240px]" style={{ color: "var(--gray-text)", opacity: 0.7 }}>
          Send a message to the UI-Agent to start testing. Live browser screenshots and step execution will appear here.
        </p>
      </div>
    );
  }

  const completedCases = cases.filter((c) => c.status !== "running");
  const progressPct = planned_cases.length > 0
    ? Math.round((completedCases.length / planned_cases.length) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      {planned_cases.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--mulberry)", fontFamily: "var(--font-mono)" }}>
              {current_case ? current_case.name : "Test Plan"}
            </span>
            <span className="text-[10px]" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
              {completedCases.length}/{planned_cases.length}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(131,0,81,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "var(--grad-brand, var(--mulberry))" }}
            />
          </div>
          {/* Case chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {planned_cases.map((pc) => {
              const executed = cases.find((c) => c.id === pc.id);
              const status = executed?.status || "pending";
              const isCurrent = current_case?.id === pc.id;
              const colors: Record<string, { bg: string; border: string; text: string }> = {
                pass: { bg: "rgba(40,167,69,0.1)", border: "rgba(40,167,69,0.3)", text: "#28a745" },
                fail: { bg: "rgba(220,53,69,0.1)", border: "rgba(220,53,69,0.3)", text: "#dc3545" },
                skip: { bg: "rgba(255,193,7,0.1)", border: "rgba(255,193,7,0.3)", text: "#d69e2e" },
                running: { bg: "rgba(131,0,81,0.1)", border: "rgba(131,0,81,0.4)", text: "var(--mulberry)" },
                pending: { bg: "rgba(0,0,0,0.02)", border: "rgba(0,0,0,0.08)", text: "var(--gray-text)" },
              };
              const c = colors[status] || colors.pending;
              return (
                <span
                  key={pc.id}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isCurrent ? "ring-1 ring-offset-1" : ""}`}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {pc.id}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content: Browser viewport + Steps sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Browser viewport — takes most of the space */}
        <div className="flex-1 p-3 min-w-0">
          <BrowserViewport
            screenshotBase64={latestScreenshot || null}
            currentAction={currentAction}
            url={session_url || undefined}
            isLoading={session_status === "testing" && !!current_case}
          />
        </div>

        {/* Steps sidebar */}
        <div
          className="flex-shrink-0 overflow-y-auto border-l"
          style={{ width: 220, borderColor: "rgba(131,0,81,0.08)" }}
        >
          <div className="p-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5 mb-1"
              style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}
            >
              Steps
            </p>

            {allSteps.length === 0 && (
              <p className="text-[11px] px-2 py-4 text-center" style={{ color: "var(--gray-text)", opacity: 0.6 }}>
                Steps will appear as the agent executes...
              </p>
            )}

            {allSteps.map((step, idx) => {
              const isSelected = selectedStepIdx === idx;
              const isLatest = idx === allSteps.length - 1 && selectedStepIdx === null;
              const hasScreenshot = !!step.screenshot_base64;

              return (
                <div
                  key={`${step.step}-${idx}`}
                  className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected || isLatest ? "" : "hover:bg-black/[0.02]"}`}
                  style={{
                    background: isSelected ? "rgba(131,0,81,0.06)" : isLatest ? "rgba(131,0,81,0.03)" : undefined,
                    borderLeft: isSelected ? "2px solid var(--mulberry)" : isLatest ? "2px solid rgba(131,0,81,0.3)" : "2px solid transparent",
                  }}
                  onClick={() => setSelectedStepIdx(isSelected ? null : idx)}
                >
                  {/* Status dot */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isLatest && session_status === "testing" ? "animate-pulse" : ""}`}
                    style={{ background: step.status === "pass" ? "#28a745" : "#dc3545" }}
                  />

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] leading-tight truncate"
                      style={{ color: isSelected ? "var(--mulberry)" : "var(--foreground)" }}
                    >
                      {step.description || `Step ${step.step}`}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px]" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
                        #{step.step}
                      </span>
                      {hasScreenshot && (
                        <span className="text-[9px]" style={{ color: "var(--mulberry)" }}>📷</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={stepsEndRef} />
          </div>
        </div>
      </div>

      {/* Session complete banner */}
      {session_status === "closed" && (
        <div
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 border-t"
          style={{ background: "rgba(40,167,69,0.04)", borderColor: "rgba(40,167,69,0.15)" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: "#28a745" }} />
          <span className="text-xs font-medium" style={{ color: "#28a745" }}>
            Session complete — switch to Report tab for full results
          </span>
        </div>
      )}
    </div>
  );
}
