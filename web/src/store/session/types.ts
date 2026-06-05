/**
 * Session Store type definitions
 *
 * [INPUT]: Depends on the Session type from @/types
 * [OUTPUT]: Provides SessionStoreState
 * [POS]: Types for the store/session module, consumed by index.ts
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import { CreateSessionParams, Session, UpdateSessionParams, } from '@/types';

// ==================== Store State ====================

export interface SessionStoreState {
  // Data
  sessions: Session[];
  current_session_key: string | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Basic operations
  createSession: (params?: CreateSessionParams) => Promise<string>;
  deleteSession: (key: string) => void;
  updateSession: (key: string, params: UpdateSessionParams) => void;
  setCurrentSession: (key: string | null) => void;

  // Queries
  getSession: (key: string) => Session | undefined;

  // Server synchronization
  loadSessionsFromServer: () => Promise<void>;

  // Cleanup
  clearAllSessions: () => void;
}
