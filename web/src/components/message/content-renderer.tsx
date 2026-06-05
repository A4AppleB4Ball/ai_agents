"use client";

import { MarkdownRenderer } from './markdown-renderer';
import { ToolBlock } from './block/tool-block';
import { AskUserQuestionBlock } from './block/ask-user-question-block';
import { CodeBlock } from './block/code-block';
import { ThinkingBlock } from './block/thinking-block';
import { ContentBlock } from '@/types/message';
import { UserQuestionAnswer } from '@/types/ask-user-question';
import { cn } from '@/lib/utils';

interface ContentRendererProps {
  content: string | ContentBlock[];
  isStreaming?: boolean;
  /** Map of pending permission requests keyed by request_id */
  pendingPermissions?: Map<string, {
    request_id: string;
    tool_use_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
  }>;
  /** Permission response callback (also used for AskUserQuestion) */
  onPermissionResponse?: (requestId: string, decision: 'allow' | 'deny', userAnswers?: UserQuestionAnswer[]) => void;
  /** List of tool names to hide */
  hiddenToolNames?: string[];
}

export function ContentRenderer(
  {
    content,
    isStreaming = false,
    pendingPermissions,
    onPermissionResponse,
    hiddenToolNames = [],
  }: ContentRendererProps) {
  // Handle string content (Markdown)
  if (typeof content === 'string') {
    return <MarkdownRenderer content={content} isStreaming={isStreaming} />;
  }

  // Handle structured content (ContentBlock[])
  // First build mapping from tool_use to tool_result
  const toolUseMap = new Map<string, { use: any; result?: any; index: number }>();
  const renderedIndices = new Set<number>();

  // Index pending permissions by tool_use_id so each tool_use block can resolve
  // its own permission request without colliding when several calls share a name.
  const permissionsByToolUseId = new Map<string, {
    request_id: string;
    tool_use_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
  }>();
  if (pendingPermissions) {
    pendingPermissions.forEach(p => {
      permissionsByToolUseId.set(p.tool_use_id, p);
    });
  }

  // First pass: collect all tool_use and corresponding tool_result
  content.forEach((block, index) => {
    if (block.type === 'tool_use') {
      toolUseMap.set(block.id, { use: block, index });
    }
  });

  // Second pass: match tool_result to tool_use
  content.forEach((block, index) => {
    if (block.type === 'tool_result') {
      const toolUseData = toolUseMap.get(block.tool_use_id);
      if (toolUseData) {
        toolUseData.result = block;
        renderedIndices.add(index); // Mark this result as processed
      }
    }
  });

  return (
    <div className="space-y-4">
      {content.map((block, index) => {
        // Skip tool_result already rendered in combination
        if (renderedIndices.has(index)) {
          return null;
        }

        if (block.type === 'text') {
          return (
            <div key={index}>
              <ContentRenderer content={block.text} isStreaming={isStreaming} />
            </div>
          );
        }

        if (block.type === 'thinking') {
          return (
            <div key={index}>
              <ThinkingBlock thinking={block.thinking || ''} isStreaming={isStreaming} />
            </div>
          );
        }

        if (block.type === 'tool_use') {
          // Match permission request to this exact tool_use block by tool_use_id.
          // Matching by tool_name alone breaks when the model issues multiple
          // calls of the same tool in one turn — approving one would let the
          // others appear "running" while the backend was still waiting.
          const matchingPermission = permissionsByToolUseId.get(block.id);
          const toolData = toolUseMap.get(block.id);

          // Special handling for AskUserQuestion tool
          if (block.name === 'AskUserQuestion') {
            const hasResult = !!toolData?.result;
            return (
              <div key={index}>
                <AskUserQuestionBlock
                  toolUse={block}
                  isSubmitted={hasResult}
                  onSubmit={(_, answers) => {
                    if (matchingPermission) {
                      onPermissionResponse?.(matchingPermission.request_id, 'allow', answers);
                    }
                  }}
                />
              </div>
            );
          }

          // Don't render if tool is in hidden list
          if (hiddenToolNames.includes(block.name)) {
            return null;
          }

          const isThisToolPendingPermission = matchingPermission && !toolData?.result;

          // Determine status
          let toolStatus: 'pending' | 'running' | 'success' | 'error' | 'waiting_permission' = 'running';
          if (isThisToolPendingPermission) {
            toolStatus = 'waiting_permission';
          } else if (toolData?.result) {
            toolStatus = toolData.result.is_error ? 'error' : 'success';
          }

          return (
            <div key={index}>
              <ToolBlock
                toolUse={block}
                toolResult={toolData?.result}
                status={toolStatus}
                permissionRequest={isThisToolPendingPermission ? {
                  request_id: matchingPermission!.request_id,
                  tool_input: matchingPermission!.tool_input,
                  onAllow: () => onPermissionResponse?.(matchingPermission!.request_id, 'allow'),
                  onDeny: () => onPermissionResponse?.(matchingPermission!.request_id, 'deny'),
                } : undefined}
              />
            </div>
          );
        }

        // Standalone tool_result (without corresponding tool_use)
        if (block.type === 'tool_result') {
          return (
            <div key={index} className={cn(
              "p-4 border rounded-lg my-2",
              block.is_error
                ? "bg-red-500/5 border-red-500/20"
                : "bg-green-500/5 border-green-500/20"
            )}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                {block.is_error ? (
                  <span className="text-red-500">Error</span>
                ) : (
                  <span className="text-green-500">Result</span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {typeof block.content === 'string' ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                    {block.content}
                  </pre>
                ) : (
                  <CodeBlock language="json" value={JSON.stringify(block.content, null, 2)} />
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
