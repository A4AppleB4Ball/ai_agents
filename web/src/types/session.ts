/**
 * Session type definitions
 *
 * [INPUT]: Depends on SessionId from @/types/sdk
 * [OUTPUT]: Exposes Session, ApiSession, CreateSessionParams, and UpdateSessionParams
 * [POS]: Core session types for the types module, consumed by agent-api.ts and the session store
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */

import { SessionId } from "@/types/sdk";

// ==================== Session data structures ====================

/** Standardized session data structure */
export interface Session {
  /** Session routing key (UUID, uniquely identifies a session) */
  session_key: string;
  /** Owning Agent entity ID */
  agent_id?: string;
  /** SDK session ID */
  session_id: SessionId | null;
  /** Session title */
  title: string;
  /** Creation time (timestamp) */
  created_at: number;
  /** Last activity time (timestamp) */
  last_activity_at: number;
  /** Whether the session is active */
  is_active?: boolean;
  /** Number of messages */
  message_count?: number;
}

// ==================== API-related types ====================

/** Session data in API responses (backend format) */
export interface ApiSession {
  session_key: string;
  agent_id: string;
  session_id: string | null;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  title: string | null;
  message_count: number;
}

// ==================== Operation parameter types ====================

/** Parameters for creating a session */
export interface CreateSessionParams {
  title?: string;
  agent_id?: string;
}

/** Parameters for updating a session */
export interface UpdateSessionParams {
  title?: string;
}
