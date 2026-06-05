/**
 * Session Store helper functions
 *
 * [INPUT]: Depends on CreateSessionParams and Session from @/types
 * [OUTPUT]: Provides generateSessionKey and createDefaultSession
 * [POS]: Utility functions for the store module
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import { CreateSessionParams, Session } from '@/types';

// ==================== ID generation ====================

/** Generate a new session routing key */
export const generateSessionKey = (): string => {
  return crypto.randomUUID();
};

// ==================== Default value creation ====================

/** Create a default session */
export const createDefaultSession = (params?: CreateSessionParams): Session => {
  const now = Date.now();
  return {
    session_key: generateSessionKey(),
    agent_id: params?.agent_id,
    session_id: null,
    title: params?.title || 'New Chat',
    created_at: now,
    last_activity_at: now,
  };
};
