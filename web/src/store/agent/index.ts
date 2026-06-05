/**
 * Agent Store - Main entry
 *
 * Uses Zustand to manage Agent state
 *
 * [INPUT]: Depends on the Agent API in @/lib/agent-manage-api
 * [OUTPUT]: Provides useAgentStore
 * [POS]: Agent management in the store module, consumed by the sidebar and Agent settings page
 * [PROTOCOL]: Update this header on changes, then check CLAUDE.md
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Agent, CreateAgentParams, UpdateAgentParams } from '@/types/agent';
import {
    getAgents,
    createAgentApi,
    updateAgentApi,
    deleteAgentApi,
} from '@/lib/agent-manage-api';

// ==================== Store types ====================

export interface AgentStoreState {
    // Data
    agents: Agent[];
    current_agent_id: string | null;

    // UI state
    loading: boolean;
    error: string | null;

    // Agent operations
    create_agent: (params: CreateAgentParams) => Promise<string>;
    delete_agent: (agent_id: string) => Promise<void>;
    update_agent: (agent_id: string, params: UpdateAgentParams) => Promise<void>;
    set_current_agent: (agent_id: string | null) => void;

    // Queries
    get_agent: (agent_id: string) => Agent | undefined;

    // Server synchronization
    load_agents_from_server: () => Promise<void>;
}

// ==================== Store creation ====================

export const useAgentStore = create<AgentStoreState>()(
    persist(
        (set, get) => ({
            // Initial state
            agents: [],
            current_agent_id: null,
            loading: false,
            error: null,

            // ==================== Agent operations ====================

            create_agent: async (params: CreateAgentParams): Promise<string> => {
                try {
                    const agent = await createAgentApi(params);
                    set((state) => ({
                        agents: [agent, ...state.agents],
                        error: null,
                    }));
                    console.debug('[AgentStore] Agent created:', agent.agent_id);
                    return agent.agent_id;
                } catch (error) {
                    console.error('[AgentStore] Failed to create agent:', error);
                    set({ error: 'Failed to create agent' });
                    throw error;
                }
            },

            delete_agent: async (agent_id: string): Promise<void> => {
                try {
                    await deleteAgentApi(agent_id);
                    set((state) => {
                        const new_agents = state.agents.filter(a => a.agent_id !== agent_id);
                        const new_current = state.current_agent_id === agent_id
                            ? (new_agents[0]?.agent_id || null)
                            : state.current_agent_id;
                        return {
                            agents: new_agents,
                            current_agent_id: new_current,
                            error: null,
                        };
                    });
                } catch (error) {
                    console.error('[AgentStore] Failed to delete agent:', error);
                    set({ error: 'Failed to delete agent' });
                }
            },

            update_agent: async (agent_id: string, params: UpdateAgentParams): Promise<void> => {
                try {
                    const updated = await updateAgentApi(agent_id, params);
                    set((state) => ({
                        agents: state.agents.map(a =>
                            a.agent_id === agent_id ? updated : a
                        ),
                        error: null,
                    }));
                    console.debug('[AgentStore] Agent updated:', agent_id);
                } catch (error) {
                    console.error('[AgentStore] Failed to update agent:', error);
                    set({ error: 'Failed to update agent' });
                }
            },

            set_current_agent: (agent_id: string | null) => {
                set({ current_agent_id: agent_id, error: null });
            },

            // ==================== Queries ====================

            get_agent: (agent_id: string): Agent | undefined => {
                return get().agents.find(a => a.agent_id === agent_id);
            },

            // ==================== Server synchronization ====================

            load_agents_from_server: async (): Promise<void> => {
                try {
                    set({ loading: true, error: null });
                    const agents = await getAgents();
                    set({ agents, loading: false, error: null });
                    console.debug(`[AgentStore] Loaded ${agents.length} agents from server`);
                } catch (err) {
                    console.error('[AgentStore] Failed to load agents:', err);
                    set({
                        loading: false,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    });
                }
            },
        }),
        {
            name: 'agent-ui-agents',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                agents: state.agents,
                current_agent_id: state.current_agent_id,
            }),
        }
    )
);
