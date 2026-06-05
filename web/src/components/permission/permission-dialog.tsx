"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface PermissionDialogProps {
  isOpen: boolean;
  toolName: string;
  toolInput: Record<string, any>;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
}

export function PermissionDialog({
  isOpen,
  toolName,
  toolInput,
  onAllow,
  onDeny,
  onClose,
}: PermissionDialogProps) {
  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const formatToolInput = () => {
    const entries = Object.entries(toolInput);
    if (entries.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <p
          className="text-xs font-semibold"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--gray-text)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Parameters
        </p>
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl p-3"
            style={{ background: "rgba(131,0,81,0.04)", border: "1px solid rgba(226,229,231,0.7)" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
              {key}:
            </span>
            <pre
              className="mt-1 text-xs overflow-auto max-h-32 whitespace-pre-wrap break-words"
              style={{ color: "var(--graphite)", fontFamily: "var(--font-mono)" }}
            >
              {typeof value === "string" && value.length > 200
                ? value.substring(0, 200) + "..."
                : typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200"
      style={{ background: "rgba(14,15,16,0.55)" }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(226,229,231,0.7)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(226,229,231,0.5)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(131,0,81,0.08)",
                color: "var(--mulberry)",
              }}
            >
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h2
                className="text-base font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-serif)", color: "var(--ink)", fontSize: 18 }}
              >
                Permission request
              </h2>
              <p className="text-xs" style={{ color: "var(--gray-text)" }}>
                Agent is requesting tool access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-[rgba(131,0,81,0.06)]"
            style={{ color: "var(--gray-text)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-auto">
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(131,0,81,0.05)",
              border: "1px solid rgba(131,0,81,0.18)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--mulberry)" }}>
              Agent is requesting to use the “{toolName}” tool
            </p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--graphite)" }}>
              Allowing this will let the agent perform the corresponding system operation.
              Review the parameters carefully before deciding.
            </p>
          </div>

          {formatToolInput()}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(226,229,231,0.5)", background: "rgba(244,245,246,0.5)" }}
        >
          <button
            onClick={onDeny}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--gray-rule)",
              background: "var(--white)",
              color: "var(--graphite)",
            }}
          >
            Deny
          </button>
          <button
            onClick={onAllow}
            className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-transform hover:-translate-y-px"
            style={{
              background: "var(--grad-brand)",
              boxShadow: "0 6px 18px rgba(131,0,81,0.32)",
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
