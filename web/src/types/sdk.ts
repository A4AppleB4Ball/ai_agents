/**
 * Claude Agent SDK Type Definitions
 *
 * [INPUT]: None
 * [OUTPUT]: Exports UUID, SessionId, ToolInput, ToolOutput
 * [POS]: SDK base types in types module
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

// ==================== Base Types ====================

export type UUID = string;

/** SDK Session ID - Claude SDK generated session identifier */
export type SessionId = string;

export type ToolInput = Record<string, any>;
export type ToolOutput = Record<string, any>;