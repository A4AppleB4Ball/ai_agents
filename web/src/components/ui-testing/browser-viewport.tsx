"use client";

import { useEffect, useRef, useState } from "react";
import { TestStep } from "@/types/ui-testing";

interface BrowserViewportProps {
  screenshotBase64: string | null;
  currentAction?: {
    type: "click" | "type" | "navigate" | "assert" | "scroll" | "hover" | "screenshot";
    description: string;
    selector?: string;
  };
  url?: string;
  isLoading?: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  click: "⊙",
  type: "⌨",
  navigate: "→",
  assert: "✓",
  scroll: "↕",
  hover: "◎",
  screenshot: "📷",
};

const ACTION_COLORS: Record<string, string> = {
  click: "#830051",
  type: "#2563eb",
  navigate: "#059669",
  assert: "#d97706",
  scroll: "#7c3aed",
  hover: "#0891b2",
  screenshot: "#dc2626",
};

export function BrowserViewport({ screenshotBase64, currentAction, url, isLoading }: BrowserViewportProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const prevScreenshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (screenshotBase64 && screenshotBase64 !== prevScreenshotRef.current) {
      setFadeIn(true);
      prevScreenshotRef.current = screenshotBase64;
      const timer = setTimeout(() => setFadeIn(false), 300);
      return () => clearTimeout(timer);
    }
  }, [screenshotBase64]);

  return (
    <div className="relative w-full h-full flex flex-col rounded-lg overflow-hidden" style={{ border: "1px solid rgba(131,0,81,0.15)" }}>
      {/* Browser chrome bar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
        style={{ background: "linear-gradient(180deg, #f8f8fa 0%, #eeeff2 100%)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>

        {/* URL bar */}
        <div
          className="flex-1 mx-2 px-3 py-1 rounded-md text-[11px] truncate"
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "var(--gray-text)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {url || "about:blank"}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--mulberry)", borderTopColor: "transparent" }} />
        )}
      </div>

      {/* Viewport area */}
      <div className="relative flex-1 overflow-hidden" style={{ background: "#1a1a2e" }}>
        {screenshotBase64 ? (
          <img
            src={`data:image/png;base64,${screenshotBase64}`}
            alt="Browser viewport"
            className={`w-full h-full object-contain object-top transition-opacity duration-300 ${fadeIn ? "opacity-0" : "opacity-100"}`}
            style={{ background: "white" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <div
                className="w-16 h-12 rounded-md"
                style={{ border: "2px solid rgba(131,0,81,0.3)", background: "rgba(131,0,81,0.05)" }}
              />
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                style={{ background: "var(--mulberry)", color: "white" }}
              >
                ⊙
              </div>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Waiting for browser connection...
            </p>
          </div>
        )}

        {/* Action overlay */}
        {currentAction && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div
              className="flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.75)" }}
            >
              {/* Animated cursor dot */}
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 animate-pulse"
                style={{ background: `${ACTION_COLORS[currentAction.type] || "#830051"}30`, color: ACTION_COLORS[currentAction.type] || "#830051" }}
              >
                {ACTION_ICONS[currentAction.type] || "•"}
              </span>

              {/* Action text */}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACTION_COLORS[currentAction.type] || "#830051" }}>
                  {currentAction.type}
                </span>
                <span className="text-[11px] text-white/70 ml-2 truncate">
                  {currentAction.description}
                </span>
              </div>

              {/* Selector badge */}
              {currentAction.selector && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}
                >
                  {currentAction.selector}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scanning animation overlay when loading */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute left-0 right-0 h-0.5 animate-scan"
              style={{ background: "linear-gradient(90deg, transparent, var(--mulberry), transparent)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
