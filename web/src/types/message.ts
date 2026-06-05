/**
 * Message Type Definitions
 *
 * This file defines the message data structures used by the frontend
 */

import { SessionId, ToolInput, ToolOutput } from './sdk';

// ==================== Message Roles ====================

/** Message role */
export type MessageRole = 'user' | 'assistant' | 'system' | 'result';

// ==================== Content Block Types ====================

/** Text content block */
export interface TextContent {
  type: 'text';
  text: string;
}

/** Tool use content block */
export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: ToolInput;
}

/** Tool result content block */
export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | any[];
  is_error?: boolean;
}

/** Thinking content block */
export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
}

/** Content block union type */
export type ContentBlock =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent;

// ==================== Message Types ====================

/** Base message interface */
export interface BaseMessage {
  message_id: string;
  round_id: string;            // Round ID
  agent_id: string;            // Session routing key
  session_id?: SessionId;      // SDK Session ID (optional, returned by backend)
  parent_id?: string;          // Parent message ID (optional, returned by backend)
  role: MessageRole;
  timestamp: number;
}

/** User message */
export interface UserMessage extends BaseMessage {
  role: 'user';
  content: string;
  parent_tool_use_id?: string | null;
}


/** Token usage message */
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_input_tokens?: number;

  [key: string]: any;
}

/** Assistant message */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  content: ContentBlock[];
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  model?: string;
  parent_tool_use_id?: string | null;
  is_tool_result?: boolean;
}

/** System message */
export interface SystemMessage extends BaseMessage {
  role: 'system';
  content: string;
  metadata?: Record<string, any>;
}

/** Execution result message */
export interface ResultMessage extends BaseMessage {
  role: 'result';
  subtype: 'success' | 'error';
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  total_cost_usd?: number;
  usage?: Usage;
  result?: string;
  is_error: boolean;
}

/** Message union type */
export type Message = UserMessage | AssistantMessage | SystemMessage | ResultMessage;

// ==================== Tool Call Types ====================

/** Tool call status */
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

/** Tool call record */
export interface ToolCall {
  id: string;
  tool_name: string;
  input: ToolInput;
  output?: ToolOutput;
  status: ToolCallStatus;
  start_time: number;
  end_time?: number;
  error?: string;
  parent_tool_use_id?: string | null;
}

// ==================== Message Stream Events ====================

/** Streaming message event type */
export type StreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop';

/** Streaming message event */
export interface StreamEvent {
  type: StreamEventType;
  index?: number;
  delta?: any;
  content_block?: ContentBlock;
  message?: Partial<AssistantMessage>;
  message_id?: string;
}
