/**
 * Tool Execution Block Component - Revolutionary timeline design
 *
 * Visualized tool execution: progress bar integrated into card, hover preview, inline copy
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Check, CheckCircle, ChevronDown, ChevronRight, Clock, Copy, Loader, Terminal, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolResultContent, ToolUseContent } from '@/types/message';
import { CodeBlock } from './code-block';

// ==================== Type Definitions ====================

interface ToolExecutionBlockProps {
  toolUse: ToolUseContent;
  toolResult?: ToolResultContent;
  status?: 'pending' | 'running' | 'success' | 'error' | 'waiting_permission';
  startTime?: number;
  endTime?: number;
  permissionRequest?: {
    request_id: string;
    tool_input: Record<string, any>;
    onAllow: () => void;
    onDeny: () => void;
  };
}

// ==================== Helper Functions ====================

/** Get short display for file path */
const getPathDisplay = (input: any): string | null => {
  if (!input) return null;
  if (input.file_path) return input.file_path;
  if (input.path) return input.path;
  if (input.command) return `$ ${input.command.slice(0, 50)}${input.command.length > 50 ? '...' : ''}`;
  return null;
};

/** Get result summary */
const getResultSummary = (content: any): string => {
  if (typeof content === 'string') {
    return content.slice(0, 80) + (content.length > 80 ? '...' : '');
  }
  return 'JSON data';
};

// ==================== Main Component ====================

export function ToolBlock({
  toolUse,
  toolResult,
  status = 'success',
  startTime,
  endTime,
  permissionRequest,
}: ToolExecutionBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy tool execution result
  const handleCopyResult = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!toolResult) return;
    const contentToCopy = typeof toolResult.content === 'string'
      ? toolResult.content
      : JSON.stringify(toolResult.content, null, 2);
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [toolResult]);

  // Calculate execution time
  const duration = useMemo(() => {
    if (endTime && startTime) return endTime - startTime;
    if (startTime) return Date.now() - startTime;
    return 0;
  }, [endTime, startTime]);

  // Format time
  const durationText = useMemo(() => {
    if (duration === 0) return '';
    return duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
  }, [duration]);

  // Path display
  const pathDisplay = useMemo(() => getPathDisplay(toolUse.input), [toolUse.input]);

  // Final status
  const finalStatus = toolResult?.is_error ? 'error' : status;
  const hasResult = !!toolResult;
  const isRunning = finalStatus === 'running';
  const isSuccess = finalStatus === 'success';
  const isError = finalStatus === 'error';
  const isWaiting = finalStatus === 'waiting_permission';

  // Status colors
  const statusColors = {
    pending: 'border-muted-foreground/30',
    running: 'border-primary/50 shadow-[0_0_10px_rgba(0,240,255,0.1)]',
    success: 'border-green-500/40',
    error: 'border-red-500/40',
    waiting_permission: 'border-orange-500/40 shadow-[0_0_10px_rgba(255,165,0,0.1)]',
  };

  return (
    <div className={cn(
      "my-2 border rounded overflow-hidden bg-background/50 backdrop-blur-sm transition-all duration-300",
      statusColors[finalStatus]
    )}>
      {/* ═══════════ Header bar: tool name + path + status + time ═══════════ */}
      <div
        className={cn(
          "px-3 py-2 flex items-center gap-2 font-mono cursor-pointer select-none",
          "hover:bg-primary/5 transition-colors",
          isRunning && "animate-pulse"
        )}
        style={{ fontSize: 13 }}
        onClick={() => hasResult && setIsExpanded(!isExpanded)}
      >
        {/* Tool icon */}
        <div className={cn(
          "w-5 h-5 flex items-center justify-center rounded",
          isSuccess && "text-green-500",
          isError && "text-red-500",
          isRunning && "text-primary",
          isWaiting && "text-orange-500"
        )}>
          {isRunning ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle className="w-4 h-4" />
          ) : isError ? (
            <XCircle className="w-4 h-4" />
          ) : isWaiting ? (
            <Clock className="w-4 h-4 animate-pulse" />
          ) : (
            <Terminal className="w-4 h-4" />
          )}
        </div>

        {/* Tool name */}
        <span className={cn(
          "font-semibold uppercase",
          isSuccess && "text-green-500",
          isError && "text-red-500",
          isRunning && "text-primary",
          isWaiting && "text-orange-500"
        )} style={{ letterSpacing: "0.10em" }}>
          {toolUse.name}
        </span>

        {/* Separator */}
        <span className="text-muted-foreground/30">│</span>

        {/* Path/command */}
        {pathDisplay && (
          <span className="text-muted-foreground truncate max-w-[420px]">
            {pathDisplay}
          </span>
        )}

        {/* Flexible space */}
        <div className="flex-1" />

        {/* Result summary (when collapsed) */}
        {hasResult && !isExpanded && (
          <span className="text-muted-foreground/60 truncate max-w-[220px] hidden sm:block" style={{ fontSize: 12 }}>
            {getResultSummary(toolResult.content)}
          </span>
        )}

        {/* Copy button (when result available) */}
        {hasResult && (
          <button
            onClick={handleCopyResult}
            className={cn(
              "px-2 py-1 rounded uppercase font-semibold transition-all",
              copied
                ? "text-green-500 bg-green-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            style={{ fontSize: 11, letterSpacing: "0.10em" }}
          >
            {copied ? '✓ copied' : 'copy'}
          </button>
        )}

        {/* Time */}
        {durationText && (
          <>
            <span className="text-muted-foreground/30">│</span>
            <span className="text-muted-foreground tabular-nums" style={{ fontSize: 12 }}>{durationText}</span>
          </>
        )}

        {/* Expand indicator */}
        {hasResult && (
          <div className="text-muted-foreground/60">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* ═══════════ Progress bar (during execution) ═══════════ */}
      {isRunning && (
        <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
      )}

      {/* ═══════════ Expanded result content ═══════════ */}
      {hasResult && isExpanded && (
        <div className="border-t border-border/30">
          <div className="p-4 max-h-[360px] overflow-y-auto custom-scrollbar">
            {typeof toolResult.content === 'string' ? (
              <pre className="font-mono whitespace-pre-wrap break-all text-foreground/85" style={{ fontSize: 13, lineHeight: 1.55 }}>
                {toolResult.content}
              </pre>
            ) : (
              <CodeBlock language="json" value={JSON.stringify(toolResult.content, null, 2)} />
            )}
          </div>
        </div>
      )}

      {/* ═══════════ Running indicator ═══════════ */}
      {!hasResult && isRunning && (
        <div className="px-3 py-2 flex items-center gap-2 text-muted-foreground border-t border-border/20" style={{ fontSize: 12 }}>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
          </div>
          <span className="font-mono uppercase font-semibold" style={{ fontSize: 11, letterSpacing: "0.10em" }}>executing...</span>
        </div>
      )}

      {/* ═══════════ Permission confirmation ═══════════ */}
      {permissionRequest && isWaiting && (
        <div className="border-t border-orange-500/20 bg-orange-500/5">
          {/* Description summary */}
          <div className="px-4 py-3">
            <p className="text-sm text-foreground/85">
              {permissionRequest.tool_input.description || `Execute ${toolUse.name}`}
            </p>
          </div>

          {/* Expandable details */}
          {isExpanded && (
            <div className="px-4 pb-3 max-h-[200px] overflow-y-auto custom-scrollbar border-t border-orange-500/10 pt-3">
              <pre className="font-mono text-foreground/70 whitespace-pre-wrap break-all" style={{ fontSize: 12, lineHeight: 1.55 }}>
                {JSON.stringify(permissionRequest.tool_input, null, 2)}
              </pre>
            </div>
          )}

          {/* Action bar */}
          <div className="px-4 py-3 flex items-center gap-2 border-t border-orange-500/10">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
            <div className="flex-1" />
            <button
              onClick={permissionRequest.onDeny}
              className="px-4 py-2 rounded-md font-semibold border border-border/60 hover:bg-muted transition-colors"
              style={{ fontSize: 13 }}
            >
              Deny
            </button>
            <button
              onClick={permissionRequest.onAllow}
              className="px-4 py-2 rounded-md font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ fontSize: 13 }}
            >
              Allow
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
