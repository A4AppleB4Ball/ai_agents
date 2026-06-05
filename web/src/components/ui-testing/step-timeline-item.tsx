"use client";

import { useState } from "react";
import { TestStep } from "@/types/ui-testing";

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function isValidBase64(str: string | undefined): boolean {
  if (!str || str.length < 4) return false;
  return str.length % 4 === 0 && BASE64_REGEX.test(str);
}

interface StepTimelineItemProps {
  step: TestStep;
}

export function StepTimelineItem({ step }: StepTimelineItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isPassed = step.status === "pass";

  return (
    <div className="flex gap-3 relative">
      {/* Timeline connector */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        <div
          className="w-3 h-3 rounded-full border-2 mt-1 flex-shrink-0"
          style={{
            borderColor: isPassed ? "#28a745" : "#dc3545",
            background: isPassed ? "rgba(40,167,69,0.15)" : "rgba(220,53,69,0.15)",
          }}
        />
        <div
          className="w-px flex-1 min-h-[16px]"
          style={{ background: "rgba(131,0,81,0.1)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => isValidBase64(step.screenshot_base64) && setExpanded(!expanded)}
        >
          <span
            className="text-xs font-medium flex-shrink-0"
            style={{ color: "var(--mulberry)", fontFamily: "var(--font-mono)" }}
          >
            {step.step}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>
            {step.description}
          </span>
          <span
            className="text-[10px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded"
            style={{
              color: isPassed ? "#155724" : "#721c24",
              background: isPassed ? "rgba(40,167,69,0.1)" : "rgba(220,53,69,0.1)",
            }}
          >
            {step.status.toUpperCase()}
          </span>
          {isValidBase64(step.screenshot_base64) && (
            <span
              className="text-[10px] flex-shrink-0"
              style={{ color: "var(--gray-text)" }}
            >
              {expanded ? "▴" : "▾"}
            </span>
          )}
        </div>

        {/* Expanded screenshot */}
        {expanded && step.screenshot_base64 && (
          <div className="mt-2 rounded overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
            {isValidBase64(step.screenshot_base64) ? (
              <img
                src={`data:image/png;base64,${step.screenshot_base64}`}
                alt={step.description}
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full h-24 flex items-center justify-center" style={{ background: "rgba(220,53,69,0.06)" }}>
                <p className="text-xs" style={{ color: "var(--gray-text)" }}>Invalid screenshot data</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
