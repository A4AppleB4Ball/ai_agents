"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ConfirmDialogMode =
  | { kind: "simple" }
  | { kind: "type-to-confirm"; phrase: string };

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  mode?: ConfirmDialogMode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  mode = { kind: "simple" },
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTyped("");
      setSubmitting(false);
      return;
    }
    if (mode.kind === "type-to-confirm") {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const phraseRequired = mode.kind === "type-to-confirm" ? mode.phrase : null;
  const phraseMatched =
    phraseRequired === null ? true : typed.trim() === phraseRequired;

  const handleConfirm = async () => {
    if (!phraseMatched || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(20,22,22,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="az-glass"
        style={{
          width: "min(440px, calc(100vw - 32px))",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(226,229,231,0.8)",
          borderRadius: 18,
          boxShadow:
            "0 4px 8px rgba(25,27,27,0.05), 0 24px 60px rgba(131,0,81,0.18)",
          padding: "24px 24px 20px",
        }}
      >
        <h2
          className="font-semibold"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          {title}
        </h2>
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--graphite)",
          }}
        >
          {description}
        </div>

        {phraseRequired !== null && (
          <div className="mt-4">
            <label
              className="block font-semibold"
              style={{
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--gray-text)",
                marginBottom: 6,
              }}
            >
              Type{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--mulberry)",
                  letterSpacing: "0.06em",
                }}
              >
                {phraseRequired}
              </span>{" "}
              to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phraseMatched) handleConfirm();
              }}
              autoComplete="off"
              spellCheck={false}
              className="w-full outline-none transition-colors"
              style={{
                padding: "10px 14px",
                background: "var(--white)",
                border: "1px solid",
                borderColor: phraseMatched
                  ? "var(--mulberry)"
                  : "var(--gray-rule)",
                borderRadius: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--ink)",
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="font-semibold transition-colors disabled:opacity-50"
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              fontSize: 13,
              border: "1px solid var(--gray-rule)",
              background: "transparent",
              color: "var(--graphite)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!phraseMatched || submitting}
            className={cn(
              "font-semibold text-white transition-all",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              fontSize: 13,
              background: destructive
                ? "linear-gradient(135deg, #6B0042 0%, #830051 55%, #A8004A 100%)"
                : "var(--grad-brand)",
              boxShadow:
                "0 4px 14px rgba(131,0,81,0.28), inset 0 1px 0 rgba(255,255,255,0.16)",
              border: "none",
            }}
          >
            {submitting ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
