/**
 * Session API service module
 *
 * [INPUT]: Depends on the session type definitions in @/types/session
 * [OUTPUT]: Provides API functions such as getSessions, createSession, updateSession, and deleteSession
 * [POS]: Session API layer in the lib module
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import { ApiSession, CreateSessionParams, Session, UpdateSessionParams } from '@/types/session';
import { Message as ChatMessage } from '@/types/message';

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/agent/v1';

// ==================== API response types ====================

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}

// ==================== Type conversion ====================

/** Transform API response to frontend standard format */
export function transformApiSession(api: ApiSession): Session {
  return {
    session_key: api.session_key,
    agent_id: api.agent_id,
    session_id: api.session_id,
    title: api.title || 'Untitled Session',
    created_at: new Date(api.created_at).getTime(),
    last_activity_at: new Date(api.last_activity).getTime(),
    is_active: api.is_active,
    message_count: api.message_count,
  };
}

// ==================== Session API ====================

export const getSessions = async (): Promise<Session[]> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to get session list: ${response.statusText}`);
  }
  const result: ApiResponse<ApiSession[]> = await response.json();
  return result.data.map(transformApiSession);
};

export const getSessionMessages = async (session_key: string): Promise<ChatMessage[]> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${session_key}/messages`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to get session messages: ${response.statusText}`);
  }
  const result: ApiResponse<ChatMessage[]> = await response.json();
  return result.data;
};

export const deleteSession = async (session_key: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${session_key}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
  const result: ApiResponse<{ success: boolean }> = await response.json();
  return result.data;
};

export const deleteRound = async (session_key: string, roundId: string): Promise<{ success: boolean; deleted_count: number }> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${session_key}/rounds/${roundId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete round: ${response.statusText}`);
  }
  const result: ApiResponse<{ success: boolean; deleted_count: number }> = await response.json();
  return result.data;
};

export const createSession = async (session_key: string, params: CreateSessionParams): Promise<Session> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_key: session_key,
      agent_id: params.agent_id,
      title: params.title,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }
  const result: ApiResponse<ApiSession> = await response.json();
  return transformApiSession(result.data);
};

export const updateSession = async (session_key: string, params: UpdateSessionParams): Promise<Session> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${session_key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`);
  }
  const result: ApiResponse<ApiSession> = await response.json();
  return transformApiSession(result.data);
};
