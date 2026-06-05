/**
 * Action Overlay
 *
 * Displays the current browser action at the bottom of the live viewport.
 * Shows action type, description, and selector with color coding.
 * Auto-fades out after inactivity using AnimatePresence.
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BrowserAction, BrowserActionType } from "@/features/ui-agent/types/browser";

const ACTION_COLORS: Record<BrowserActionType, string> = {
  click: "#830051",
  navigate: "#059669",
  input: "#2563eb",
  page_load: "#d97706",
  scroll: "#7c3aed",
  hover: "#0891b2",
};

const ACTION_ICONS: Record<BrowserActionType, string> = {
  click: "⊙",
  navigate: "→",
  input: "⌨",
  page_load: "↻",
  scroll: "↕",
  hover: "◎",
};

interface ActionOverlayProps {
  action: BrowserAction | null;
}

export function ActionOverlay({ action }: ActionOverlayProps) {
  return (
    <AnimatePresence mode="wait">
      {action && (
        <motion.div
          key={`${action.session_id}-${action.timestamp}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(10, 10, 20, 0.82)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Action icon */}
          <span
            className="text-lg flex-shrink-0"
            style={{ color: ACTION_COLORS[action.action] }}
          >
            {ACTION_ICONS[action.action]}
          </span>

          {/* Action type label */}
          <span
            className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0 px-2 py-0.5 rounded"
            style={{
              color: ACTION_COLORS[action.action],
              background: `${ACTION_COLORS[action.action]}18`,
              border: `1px solid ${ACTION_COLORS[action.action]}30`,
            }}
          >
            {action.action}
          </span>

          {/* Description */}
          <span
            className="text-xs truncate flex-1"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {action.detail.description || action.detail.url || action.detail.text || ""}
          </span>

          {/* Selector badge */}
          {action.detail.selector && (
            <span
              className="text-[10px] px-2 py-0.5 rounded truncate max-w-[200px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {action.detail.selector}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
