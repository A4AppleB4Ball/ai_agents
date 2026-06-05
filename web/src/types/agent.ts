/**
 * Agent type definitions
 *
 * [INPUT]: No external dependencies
 * [OUTPUT]: Exposes Agent / AgentOptions / ApiAgent / CreateAgentParams / UpdateAgentParams
 * [POS]: Core Agent types for the types module, consumed by agent-api.ts and the agent store
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */

// ==================== Agent configuration ====================

/** Agent-level configuration options (maps to Agent-level fields in ClaudeAgentOptions) */
export interface AgentOptions {
    model?: string;
    permission_mode?: string;
    allowed_tools?: string[];
    disallowed_tools?: string[];
    system_prompt?: string;
    max_turns?: number;
    max_thinking_tokens?: number;
    include_partial_messages?: boolean;
    mcp_servers?: Record<string, any>;
    skills_enabled?: boolean;
    setting_sources?: ('user' | 'project')[];
}

/** Agent configuration form values (frontend edit state, using camelCase fields) */
export interface AgentFormOptions {
    model?: string;
    permissionMode?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    maxThinkingTokens?: number;
    includePartialMessages?: boolean;
    skillsEnabled?: boolean;
    settingSources?: ('user' | 'project')[];
}

// ==================== Agent data structures ====================

/** Standardized Agent data structure */
export interface Agent {
    agent_id: string;
    name: string;
    workspace_path: string;
    global?: boolean;
    options: AgentOptions;
    created_at: number;
    status: string;
}

/** Agent data in API responses (backend format) */
export interface ApiAgent {
    agent_id: string;
    name: string;
    workspace_path: string;
    options: Record<string, any> | null;
    created_at: string;
    status: string;
}

// ==================== Operation parameters ====================

/** Parameters for creating an Agent */
export interface CreateAgentParams {
    name: string;
    options?: Partial<AgentOptions>;
}

/** Parameters for updating an Agent */
export interface UpdateAgentParams {
    name?: string;
    options?: Partial<AgentOptions>;
}

/** Agent name validation result */
export interface AgentNameValidationResult {
    name: string;
    normalized_name: string;
    is_valid: boolean;
    is_available: boolean;
    workspace_path?: string | null;
    reason?: string | null;
}
