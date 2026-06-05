/**
 * Unified message component exports
 */

// Unified message component - recommended for primary use
export { default as MessageItem } from './message-item';

// Specialized message components
export { ToolBlock } from './block/tool-block';

// Type definitions
export type {
  Message,
  MessageRole,
  ContentBlock,
  TextContent,
  ToolUseContent,
  ToolResultContent,
  ThinkingContent,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ResultMessage,
  ToolCall,
  ToolCallStatus
} from '@/types/message';