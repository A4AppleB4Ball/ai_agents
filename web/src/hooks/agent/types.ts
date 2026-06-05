/**
 * useAgentSession Hook type definitions
 *
 * [INPUT]: Depends on Message and ToolCall from @/types
 * [OUTPUT]: Exposes UseAgentSessionOptions and UseAgentSessionReturn
 * [POS]: Types for the hooks/agent module
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */

import { Message, ToolCall } from '@/types';
import { UserQuestionAnswer } from '@/types/ask-user-question';

// ==================== Hook options ====================

export interface UseAgentSessionOptions {
    wsUrl?: string;
    includePartialMessages?: boolean;
    onError?: (error: Error) => void;
}

// ==================== Hook return values ====================

export interface UseAgentSessionReturn {
    messages: Message[];
    toolCalls: ToolCall[];
    /** Current session routing key */
    sessionKey: string | null;
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    startSession: () => void;
    loadSession: (key: string) => void;
    clearSession: () => void;
    resetSession: () => void;
    loadHistoryMessages: (key: string) => Promise<void>;
    stopGeneration: () => void;
    deleteRound: (roundId: string) => Promise<void>;
    regenerate: (roundId: string) => Promise<void>;
    pendingPermissions: Map<string, {
        request_id: string;
        tool_use_id: string;
        tool_name: string;
        tool_input: Record<string, any>;
    }>;
    sendPermissionResponse: (requestId: string, decision: 'allow' | 'deny', userAnswers?: UserQuestionAnswer[]) => void;
}
