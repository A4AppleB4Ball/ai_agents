/**
 * Agent API service module
 *
 * [INPUT]: Depends on the Agent type definitions in @/types/agent
 * [OUTPUT]: Provides API functions such as getAgents, createAgent, updateAgent, and deleteAgent
 * [POS]: Agent API layer in the lib module, consumed by the agent store
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import {
    Agent,
    AgentNameValidationResult,
    ApiAgent,
    CreateAgentParams,
    UpdateAgentParams
} from '@/types/agent';

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/agent/v1';

// ==================== API response types ====================

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

// ==================== Type conversion ====================

function transformApiAgent(api_agent: ApiAgent): Agent {
    return {
        agent_id: api_agent.agent_id,
        name: api_agent.name,
        workspace_path: api_agent.workspace_path,
        options: api_agent.options || {},
        created_at: new Date(api_agent.created_at).getTime(),
        status: api_agent.status,
    };
}

// ==================== Agent API ====================

/** Get all Agent list */
export const getAgents = async (): Promise<Agent[]> => {
    const response = await fetch(`${AGENT_API_BASE_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`Failed to get Agent list: ${response.statusText}`);
    }
    const result: ApiResponse<ApiAgent[]> = await response.json();
    return result.data.map(transformApiAgent);
};

/** Create Agent */
export const createAgentApi = async (params: CreateAgentParams): Promise<Agent> => {
    const response = await fetch(`${AGENT_API_BASE_URL}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: params.name,
            options: params.options || null,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to create Agent: ${response.statusText}`);
    }
    const result: ApiResponse<ApiAgent> = await response.json();
    return transformApiAgent(result.data);
};

/** Get single Agent */
export const getAgent = async (agent_id: string): Promise<Agent> => {
    const response = await fetch(`${AGENT_API_BASE_URL}/agents/${agent_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`Failed to get Agent: ${response.statusText}`);
    }
    const result: ApiResponse<ApiAgent> = await response.json();
    return transformApiAgent(result.data);
};

/** Update Agent */
export const updateAgentApi = async (agent_id: string, params: UpdateAgentParams): Promise<Agent> => {
    const response = await fetch(`${AGENT_API_BASE_URL}/agents/${agent_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: params.name,
            options: params.options || null,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to update Agent: ${response.statusText}`);
    }
    const result: ApiResponse<ApiAgent> = await response.json();
    return transformApiAgent(result.data);
};

/** Delete Agent */
export const deleteAgentApi = async (agent_id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${AGENT_API_BASE_URL}/agents/${agent_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`Failed to delete Agent: ${response.statusText}`);
    }
    const result: ApiResponse<{ success: boolean }> = await response.json();
    return result.data;
};

/** Validate Agent name */
export const validateAgentNameApi = async (
    name: string,
    exclude_agent_id?: string
): Promise<AgentNameValidationResult> => {
    const query = new URLSearchParams({ name });
    if (exclude_agent_id) {
        query.set('exclude_agent_id', exclude_agent_id);
    }

    const response = await fetch(`${AGENT_API_BASE_URL}/agents/validate/name?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`Failed to validate Agent name: ${response.statusText}`);
    }
    const result: ApiResponse<AgentNameValidationResult> = await response.json();
    return result.data;
};
