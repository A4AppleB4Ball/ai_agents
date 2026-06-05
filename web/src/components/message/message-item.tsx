"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileText, Flag, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentBlock, Message, ResultMessage, AssistantMessage } from "@/types/message";
import { UserQuestionAnswer } from "@/types/ask-user-question";
import { ContentRenderer } from "./content-renderer";
import { BrandOrb } from "@/components/decor/brand-orb";

interface MessageItemProps {
  roundId: string;
  /** Index of this round in the session (1-based for display) */
  roundIndex?: number;
  messages: Message[];
  isLastRound?: boolean;
  isLoading?: boolean;
  pendingPermissions?: Map<string, {
    request_id: string;
    tool_use_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
  }>;
  onPermissionResponse?: (requestId: string, decision: "allow" | "deny", userAnswers?: UserQuestionAnswer[]) => void;
  hiddenToolNames?: string[];
  onDelete?: (roundId: string) => Promise<void>;
  onRegenerate?: (roundId: string) => Promise<void>;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
  agentName?: string;
  sessionId?: string;
  ttftMs?: number;
  className?: string;
}

function formatTime(ts: number) {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatReading(outputTokens: number) {
  const minutes = Math.max(1, Math.round((outputTokens * 0.75) / 220));
  return `${minutes}'`;
}

/**
 * Strip vendor prefixes from a raw model id and produce a friendly label.
 * Examples:
 *   "us.anthropic.claude-sonnet-4-6" → "Sonnet 4.6"
 *   "claude-opus-4-7"                → "Opus 4.7"
 */
function formatModelLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const stripped = lower
    .replace(/^[a-z]{2,3}\./, "")
    .replace(/^anthropic\./, "")
    .replace(/^claude-?/, "");
  const family = stripped.match(/^(opus|sonnet|haiku)/)?.[1];
  if (!family) return raw;
  const versionMatch = stripped.match(/(\d+)-(\d+)/);
  const version = versionMatch ? `${versionMatch[1]}.${versionMatch[2]}` : "";
  const cap = family.charAt(0).toUpperCase() + family.slice(1);
  return version ? `${cap} ${version}` : cap;
}

export function MessageItem({
  roundId,
  roundIndex,
  messages,
  isLastRound,
  isLoading,
  pendingPermissions,
  onPermissionResponse,
  hiddenToolNames = ["TodoWrite"],
  onDelete,
  onRegenerate,
  onEditUserMessage,
  agentName,
  sessionId,
  ttftMs,
  className,
}: MessageItemProps) {
  const roundRef = useRef<HTMLDivElement>(null);
  const [copiedAssistant, setCopiedAssistant] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chipToast, setChipToast] = useState<string | null>(null);

  const { userMessage, assistantMessages, resultMessage } = useMemo(() => {
    const user = messages.find((m) => m.role === "user");
    const result = messages.find((m) => m.role === "result") as ResultMessage | undefined;
    const assistant = messages.filter((m) => m.role === "assistant") as AssistantMessage[];
    return { userMessage: user, assistantMessages: assistant, resultMessage: result };
  }, [messages]);

  const mergedContent = useMemo(() => {
    const allBlocks: ContentBlock[] = [];
    const seenToolIds = new Set<string>();
    for (const msg of assistantMessages) {
      if (!Array.isArray(msg.content)) continue;
      for (const block of msg.content) {
        if (!block) continue;
        if (block.type === "tool_use" && block.id) {
          if (seenToolIds.has(block.id)) continue;
          seenToolIds.add(block.id);
        }
        if (block.type === "tool_result" && block.tool_use_id) {
          if (seenToolIds.has(`result_${block.tool_use_id}`)) continue;
          seenToolIds.add(`result_${block.tool_use_id}`);
        }
        allBlocks.push(block);
      }
    }
    return allBlocks;
  }, [assistantMessages]);

  const assistantTextContent = useMemo(() => {
    const texts: string[] = [];
    for (const block of mergedContent) {
      if (block.type === "text" && block.text) texts.push(block.text);
    }
    if (resultMessage?.result) texts.push(resultMessage.result);
    return texts.join("\n\n");
  }, [mergedContent, resultMessage]);

  const firstAssistant = assistantMessages[0];
  const rawModel =
    firstAssistant && "model" in firstAssistant ? (firstAssistant.model as string | undefined) : undefined;
  const model = formatModelLabel(rawModel);
  const timestamp = firstAssistant?.timestamp || resultMessage?.timestamp || userMessage?.timestamp;

  const totalTokens = resultMessage?.usage
    ? (resultMessage.usage.input_tokens || 0) + (resultMessage.usage.output_tokens || 0)
    : undefined;
  const outputTokens = resultMessage?.usage?.output_tokens ?? 0;
  const toolCount = mergedContent.filter((b) => b.type === "tool_use").length;

  const userContent = useMemo(() => {
    if (!userMessage) return "";
    return typeof userMessage.content === "string" ? userMessage.content : "";
  }, [userMessage]);

  const shouldHideAssistantContent = useMemo(() => {
    if (mergedContent.length === 0) return true;
    return mergedContent.every((block) => {
      if (block.type === "text") return !block.text?.trim();
      if (block.type === "tool_use") return hiddenToolNames.includes(block.name);
      return block.type === "tool_result";
    });
  }, [mergedContent, hiddenToolNames]);

  useEffect(() => {
    if (isLastRound && roundRef.current) {
      roundRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLastRound]);

  const handleCopyAssistant = useCallback(async () => {
    if (!assistantTextContent) return;
    await navigator.clipboard.writeText(assistantTextContent);
    setCopiedAssistant(true);
    setTimeout(() => setCopiedAssistant(false), 2000);
  }, [assistantTextContent]);

  const handleDelete = useCallback(async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(roundId);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, roundId, isDeleting]);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || isRegenerating) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(roundId);
    } finally {
      setIsRegenerating(false);
    }
  }, [onRegenerate, roundId, isRegenerating]);

  const showCursor = isLastRound && isLoading && assistantMessages.length > 0;
  const hasFinalAnswer = !!resultMessage;
  const canOperateRound = !!userMessage && !isLoading;

  const showStub = (label: string) => {
    setChipToast(`${label} — coming soon`);
    setTimeout(() => setChipToast(null), 1800);
  };

  const turnLabel = roundIndex !== undefined ? roundIndex.toString().padStart(2, "0") : "00";

  return (
    <div ref={roundRef} className={cn("relative w-full", className)} style={{ marginBottom: 48 }}>
      {/* Vertical edge label */}
      <div
        aria-hidden
        className="hidden xl:block absolute"
        style={{
          left: "calc(50% - 620px)",
          top: 24,
          transform: "rotate(-90deg)",
          transformOrigin: "left top",
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          textTransform: "uppercase",
          letterSpacing: "0.36em",
          color: "var(--gray-text)",
          whiteSpace: "nowrap",
        }}
      >
        DIGITAL AI · 2026
      </div>

      {/* Marginalia stats */}
      <div
        aria-hidden
        className="hidden xl:block absolute text-right"
        style={{
          left: "calc(50% - 560px)",
          top: 80,
          width: 100,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--gray-text)",
          lineHeight: 1.6,
        }}
      >
        <Margin stat={turnLabel} label="Turn no." />
        {outputTokens > 0 && <Margin stat={formatReading(outputTokens)} label="Reading" />}
        {totalTokens !== undefined && <Margin stat={totalTokens.toString()} label="Tokens" />}
      </div>

      <div className="mx-auto" style={{ maxWidth: 880, width: "100%", padding: "0 56px", position: "relative" }}>
        {/* Turn anchor */}
        <div className="flex items-baseline gap-[14px]" style={{ marginBottom: 18 }}>
          <span
            className="az-text-gradient"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
            }}
          >
            {turnLabel}
          </span>
          <span
            className="font-bold"
            style={{
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--gray-text)",
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{agentName ?? "Digital AI"}</strong>
            <br />
            {timestamp ? formatTime(timestamp) : "--:--"} · {model || "model"}
            {sessionId ? ` · session ${sessionId}` : ""}
          </span>
        </div>

        {/* User pull-quote */}
        {userMessage && (
          <>
            <div
              className="flex items-center gap-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--gray-text)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                marginBottom: 6,
              }}
            >
              <span
                aria-hidden
                style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mulberry)" }}
              />
              You · {userMessage.timestamp ? formatTime(userMessage.timestamp) : "--:--"}
            </div>
            <blockquote
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                lineHeight: 1.45,
                color: "var(--ink)",
                borderLeft: "2px solid var(--mulberry)",
                padding: "4px 0 4px 22px",
                margin: "0 0 32px 0",
                letterSpacing: "-0.005em",
                fontWeight: 500,
                maxWidth: 720,
              }}
            >
              {userContent}
            </blockquote>
            {onEditUserMessage && (
              <button
                onClick={() => {
                  const newContent = prompt("Edit message:", userContent);
                  if (newContent && newContent !== userContent) {
                    onEditUserMessage(userMessage.message_id, newContent);
                  }
                }}
                className="text-xs mb-4"
                style={{ color: "var(--gray-text)" }}
              >
                Edit
              </button>
            )}
          </>
        )}

        {/* Assistant response */}
        {(!shouldHideAssistantContent || canOperateRound) && (
          <div className="group">
            <div
              className="flex items-center gap-[10px]"
              style={{
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: "1px solid rgba(226,229,231,0.7)",
              }}
            >
              <BrandOrb size={24} pulse={showCursor} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                {agentName ?? "Digital AI"}
              </span>
              <span
                className="ml-auto flex items-center gap-3"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--gray-text)" }}
              >
                {ttftMs !== undefined && ttftMs > 0 && (
                  <span>↻ {(ttftMs / 1000).toFixed(1)}s TTFT</span>
                )}
                {toolCount > 0 && <span>⌬ {toolCount} tools</span>}
                {totalTokens !== undefined && totalTokens > 0 && (
                  <span>∑ {totalTokens} tokens</span>
                )}
              </span>
            </div>

            <div className={cn("relative", showCursor && "az-streaming-active")}>
              <ContentRenderer
                content={mergedContent}
                isStreaming={showCursor}
                pendingPermissions={pendingPermissions}
                onPermissionResponse={onPermissionResponse}
                hiddenToolNames={hiddenToolNames}
              />
            </div>

            {hasFinalAnswer && !isLoading && (
              <div className="flex flex-wrap gap-[6px] mt-5">
                {onRegenerate && (
                  <ActionChip onClick={handleRegenerate} disabled={isRegenerating}>
                    <RefreshCw size={12} className={isRegenerating ? "animate-spin" : undefined} />
                    Retry
                  </ActionChip>
                )}
                <ActionChip onClick={handleCopyAssistant}>
                  {copiedAssistant ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAssistant ? "Copied" : "Copy"}
                </ActionChip>
                <ActionChip onClick={() => showStub("Export memo")}>
                  <FileText size={12} />
                  Export memo
                </ActionChip>
                <ActionChip onClick={() => showStub("Flag for review")}>
                  <Flag size={12} />
                  Flag for review
                </ActionChip>
                {onDelete && (
                  <ActionChip onClick={handleDelete} disabled={isDeleting} tone="muted">
                    <Trash2 size={12} />
                    Delete
                  </ActionChip>
                )}
                {chipToast && (
                  <span
                    className="inline-flex items-center"
                    style={{
                      fontSize: 11,
                      color: "var(--gray-text)",
                      fontFamily: "var(--font-mono)",
                      marginLeft: 8,
                    }}
                  >
                    {chipToast}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Margin({ stat, label }: { stat: string; label: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 22,
          color: "var(--ink)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          display: "block",
          lineHeight: 1,
          marginBottom: 2,
        }}
      >
        {stat}
      </span>
      <span
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--gray-text)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface ActionChipProps {
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "muted";
  children: React.ReactNode;
}

function ActionChip({ onClick, disabled, tone = "default", children }: ActionChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(226,229,231,0.7)",
        fontSize: 11.5,
        color: tone === "muted" ? "var(--gray-text)" : "var(--graphite)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.color = "var(--mulberry)";
        e.currentTarget.style.borderColor = "rgba(131,0,81,0.30)";
        e.currentTarget.style.background = "rgba(131,0,81,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = tone === "muted" ? "var(--gray-text)" : "var(--graphite)";
        e.currentTarget.style.borderColor = "rgba(226,229,231,0.7)";
        e.currentTarget.style.background = "rgba(255,255,255,0.7)";
      }}
    >
      {children}
    </button>
  );
}

export default MessageItem;
