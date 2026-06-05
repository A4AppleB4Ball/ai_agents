"use client";

/**
 * Sidebar — Digital AI editorial redesign.
 */

import { useMemo, useState } from "react";
import { Edit3, Plus, Search, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Session } from "@/types/session";
import { Agent } from "@/types/agent";
import { BrandOrb } from "@/components/decor/brand-orb";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useUser } from "@/components/auth/user-provider";

interface SidebarProps {
  agents: Agent[];
  sessions: Session[];
  current_agent_id: string | null;
  current_session_key: string | null;
  on_new_agent: () => void;
  on_agent_select: (agent_id: string) => void;
  on_delete_agent: (agent_id: string) => void;
  on_new_session: () => void;
  on_session_select: (session_id: string) => void;
  on_delete_session: (session_id: string) => void;
  on_edit_title?: (session_id: string, title: string) => void;
  on_edit_agent?: (agent_id: string) => void;
  /** Navigate to the home / empty state */
  on_navigate_home?: () => void;
  is_collapsed?: boolean;
  on_toggle_collapse?: () => void;
  /** True when an agent owns the currently streaming session */
  streaming_agent_id?: string | null;
  /** Current round count, surfaced into the live status when streaming */
  streaming_turn?: number;
}

const TONE_CYCLE = ["tone-graphite", "tone-mulberry-live", "tone-rose", "tone-sand"] as const;
type Tone = (typeof TONE_CYCLE)[number];

function toneStyle(tone: Tone): React.CSSProperties {
  switch (tone) {
    case "tone-graphite":
      return { background: "linear-gradient(135deg, #5C6566, #2A2D2D)" };
    case "tone-mulberry-live":
      return {
        background: "var(--grad-orb)",
        boxShadow: "0 0 0 1px rgba(131,0,81,0.18), 0 3px 12px rgba(206,0,88,0.30)",
      };
    case "tone-rose":
      return { background: "linear-gradient(135deg, #E8A4C2, #B33B79)" };
    case "tone-sand":
      return { background: "linear-gradient(135deg, #E8D5B7, #A88865)" };
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeWhen(ts?: number): string {
  if (!ts) return "—";
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  const today = new Date();
  const date = new Date(ts);
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return format(ts, "HH:mm");
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return format(ts, "dd MMM");
}

export function Sidebar({
  agents,
  sessions,
  current_agent_id,
  current_session_key,
  on_new_agent,
  on_agent_select,
  on_delete_agent,
  on_new_session,
  on_session_select,
  on_delete_session,
  on_edit_title,
  on_edit_agent,
  on_navigate_home,
  is_collapsed = false,
  on_toggle_collapse,
  streaming_agent_id = null,
  streaming_turn,
}: SidebarProps) {
  const { user } = useUser();
  const [search_query, set_search_query] = useState("");
  const [editing_session_id, set_editing_session_id] = useState<string | null>(null);
  const [edit_title, set_edit_title] = useState("");
  const [pending_session_delete, set_pending_session_delete] = useState<Session | null>(null);
  const [pending_agent_delete, set_pending_agent_delete] = useState<Agent | null>(null);

  const filtered_agents = useMemo(() => {
    if (!search_query) return agents;
    return agents.filter((a) =>
      a.name.toLowerCase().includes(search_query.toLowerCase()),
    );
  }, [agents, search_query]);

  const sessions_by_agent = useMemo(() => {
    const map = new Map<string, Session[]>();
    sessions.forEach((session) => {
      const owner = session.agent_id || "main";
      const list = map.get(owner) || [];
      list.push(session);
      map.set(owner, list);
    });
    return map;
  }, [sessions]);

  const handle_save_edit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing_session_id && on_edit_title) {
      on_edit_title(editing_session_id, edit_title);
      set_editing_session_id(null);
    }
  };

  return (
    <aside
      className={cn(
        "h-full flex flex-col flex-shrink-0 az-glass relative transition-all duration-300 ease-in-out",
        is_collapsed ? "w-[88px]" : "w-[320px]",
      )}
      style={{ borderRight: "1px solid rgba(226,229,231,0.5)" }}
    >
      {/* Vertical magenta seam */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: "8%",
          bottom: "8%",
          width: 2,
          borderRadius: "0 2px 2px 0",
          background:
            "linear-gradient(180deg, transparent, var(--magenta) 20%, var(--mulberry) 80%, transparent)",
          opacity: 0.7,
        }}
      />

      {/* Brand row + command bar */}
      <div className="px-[22px] pt-[22px] pb-4">
        <button
          type="button"
          onClick={on_navigate_home}
          className={cn(
            "group flex items-center w-full text-left transition-all",
            is_collapsed ? "justify-center p-1 mb-7" : "gap-3 mb-7",
          )}
          title="Go to home"
          style={
            is_collapsed
              ? undefined
              : {
                  padding: "10px 14px",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, #6B0042 0%, #830051 55%, #A8004A 100%)",
                  boxShadow:
                    "0 4px 14px rgba(131,0,81,0.22), inset 0 1px 0 rgba(255,255,255,0.14)",
                }
          }
        >
          <BrandOrb size={is_collapsed ? 32 : 36} />
          {!is_collapsed && (
            <div className="flex-1 min-w-0">
              <div
                className="font-semibold leading-tight text-white"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 19,
                  letterSpacing: "-0.01em",
                }}
              >
                Digital AI
              </div>
              <div
                className="font-semibold mt-[3px]"
                style={{
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                AI Agents
              </div>
            </div>
          )}
        </button>

        {!is_collapsed && (
          <div className="relative">
            <Search
              className="absolute pointer-events-none"
              size={14}
              style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--gray-text)" }}
            />
            <input
              type="text"
              value={search_query}
              onChange={(e) => set_search_query(e.target.value)}
              placeholder="Search or run a command..."
              className="w-full outline-none transition-colors"
              style={{
                padding: "11px 56px 11px 38px",
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(226,229,231,0.7)",
                borderRadius: 14,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            />
            <span
              className="absolute flex gap-[3px] pointer-events-none"
              style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}
            >
              <kbd
                className="font-semibold"
                style={{
                  fontSize: 9.5,
                  padding: "2px 5px",
                  background: "rgba(131,0,81,0.06)",
                  border: "1px solid rgba(131,0,81,0.12)",
                  borderRadius: 4,
                  color: "var(--mulberry)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ⌘
              </kbd>
              <kbd
                className="font-semibold"
                style={{
                  fontSize: 9.5,
                  padding: "2px 5px",
                  background: "rgba(131,0,81,0.06)",
                  border: "1px solid rgba(131,0,81,0.12)",
                  borderRadius: 4,
                  color: "var(--mulberry)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                K
              </kbd>
            </span>
          </div>
        )}
      </div>

      {/* AGENTS section header */}
      {!is_collapsed && (
        <div
          className="flex items-center justify-between font-bold"
          style={{
            padding: "16px 22px 8px",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--gray-text)",
          }}
        >
          <button
            onClick={on_new_agent}
            className="hover:text-mulberry transition-colors"
            style={{ color: "inherit", letterSpacing: "0.16em" }}
            title="New Agent"
          >
            Agents
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--mulberry)",
              fontSize: 10,
              background: "rgba(131,0,81,0.07)",
              padding: "2px 7px",
              borderRadius: 999,
            }}
          >
            {agents.length.toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-[14px] pb-2 custom-scrollbar">
        {filtered_agents.map((agent, idx) => {
          const isCurrent = current_agent_id === agent.agent_id;
          const isStreaming = streaming_agent_id === agent.agent_id;
          const tone: Tone = isStreaming ? "tone-mulberry-live" : TONE_CYCLE[idx % TONE_CYCLE.length];
          const agentSessions = sessions_by_agent.get(agent.agent_id) || [];
          const sessionCount = agentSessions.length;
          const lastUsed =
            agentSessions.length > 0
              ? Math.max(
                  ...agentSessions.map((s) => s.last_activity_at || s.created_at || 0),
                )
              : 0;

          let statusLabel: string;
          if (isStreaming) {
            statusLabel = streaming_turn ? `turn ${streaming_turn.toString().padStart(2, "0")}` : "live";
          } else if (sessionCount === 0) {
            statusLabel = "Idle · 0 sessions";
          } else if (lastUsed) {
            statusLabel = `Idle · last used ${relativeWhen(lastUsed)}`;
          } else {
            statusLabel = `Idle · ${sessionCount} session${sessionCount === 1 ? "" : "s"}`;
          }

          return (
            <div key={agent.agent_id} className="mb-1">
              <div
                onClick={() => on_agent_select(agent.agent_id)}
                className={cn(
                  "group relative cursor-pointer transition-colors",
                  isCurrent ? "" : "hover:bg-[rgba(131,0,81,0.04)]",
                )}
                style={{
                  borderRadius: 14,
                  padding: is_collapsed ? "10px" : "12px 14px",
                  background: isCurrent
                    ? "linear-gradient(135deg, rgba(206,0,88,0.10), rgba(131,0,81,0.04))"
                    : "transparent",
                  boxShadow: isCurrent ? "inset 0 0 0 1px rgba(131,0,81,0.14)" : undefined,
                }}
                title={is_collapsed ? agent.name : undefined}
              >
                <div className={cn("flex items-center gap-[10px]", is_collapsed && "justify-center")}>
                  <span
                    aria-hidden
                    className="relative flex-shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      overflow: "hidden",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                      ...toneStyle(tone),
                    }}
                  >
                    <span
                      className="absolute"
                      style={{
                        inset: 3,
                        borderRadius: 7,
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 55%)",
                      }}
                    />
                  </span>

                  {!is_collapsed && (
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold truncate"
                        style={{
                          fontSize: 13.5,
                          color: isCurrent ? "var(--mulberry)" : "var(--ink)",
                          lineHeight: 1.2,
                        }}
                      >
                        {agent.name}
                      </div>
                      <div
                        className="flex items-center gap-[6px] mt-[2px]"
                        style={{
                          fontSize: 10.5,
                          color: isStreaming ? "var(--mulberry)" : "var(--gray-text)",
                          opacity: isStreaming ? 0.85 : 1,
                        }}
                      >
                        {isStreaming ? (
                          <>
                            <span className="az-live-bar" aria-hidden>
                              <span /><span /><span /><span />
                            </span>
                            <span>Streaming · {statusLabel}</span>
                          </>
                        ) : (
                          <>
                            <span
                              aria-hidden
                              style={{
                                width: 2,
                                height: 2,
                                borderRadius: "50%",
                                background: "currentColor",
                                opacity: 0.5,
                              }}
                            />
                            <span>{statusLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!is_collapsed && (
                    <div className="absolute right-[10px] top-[10px] flex items-center gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {on_edit_agent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            on_edit_agent(agent.agent_id);
                          }}
                          className="p-1 rounded hover:bg-[rgba(131,0,81,0.08)] text-[var(--gray-text)] hover:text-[var(--mulberry)]"
                          title="Agent settings"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                      {!agent.global && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            set_pending_agent_delete(agent);
                          }}
                          className="p-1 rounded hover:bg-[rgba(206,0,88,0.10)] text-[var(--gray-text)] hover:text-[var(--magenta)]"
                          title="Delete agent"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active agent's session timeline */}
              {isCurrent && !is_collapsed && (
                <div
                  className="relative"
                  style={{
                    margin: "4px 0 8px 0",
                    padding: "4px 0 4px 22px",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute"
                    style={{
                      left: 13,
                      top: 6,
                      bottom: 6,
                      width: 1,
                      background:
                        "linear-gradient(to bottom, transparent, rgba(131,0,81,0.20) 20%, rgba(131,0,81,0.20) 80%, transparent)",
                    }}
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      on_new_session();
                    }}
                    className="flex items-center gap-2 w-full transition-colors hover:bg-[rgba(131,0,81,0.06)]"
                    style={{
                      padding: "7px 12px",
                      fontSize: 11.5,
                      color: "var(--mulberry)",
                      borderRadius: 8,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.10em",
                    }}
                  >
                    <Plus size={12} />
                    <span>New chat</span>
                  </button>

                  {agentSessions.length === 0 ? (
                    <div className="px-3 py-3 text-center" style={{ fontSize: 10.5, color: "var(--gray-text)" }}>
                      No sessions yet
                    </div>
                  ) : (
                    agentSessions.map((session) => {
                      const isActive = current_session_key === session.session_key;
                      const ts = session.last_activity_at || session.created_at;
                      const isEditing = editing_session_id === session.session_key;
                      return (
                        <div
                          key={session.session_key}
                          onClick={() => on_session_select(session.session_key)}
                          className={cn(
                            "group/session relative cursor-pointer transition-colors",
                            !isActive && "hover:bg-[rgba(131,0,81,0.04)]",
                          )}
                          style={{
                            padding: "8px 12px",
                            fontSize: 12,
                            color: isActive ? "var(--mulberry)" : "var(--graphite)",
                            background: isActive ? "rgba(131,0,81,0.06)" : undefined,
                            borderRadius: 9,
                            marginBottom: 1,
                          }}
                        >
                          <span
                            aria-hidden
                            className="absolute"
                            style={{
                              left: -10,
                              top: 14,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isActive ? "var(--grad-orb)" : "var(--gray-rule)",
                              boxShadow: isActive
                                ? "0 0 0 3px var(--paper), 0 0 10px rgba(206,0,88,0.5)"
                                : "0 0 0 3px var(--paper)",
                            }}
                          />

                          {isEditing ? (
                            <form onSubmit={handle_save_edit} onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={edit_title}
                                onChange={(e) => set_edit_title(e.target.value)}
                                onBlur={() => set_editing_session_id(null)}
                                className="w-full outline-none"
                                style={{
                                  background: "var(--white)",
                                  border: "1px solid rgba(131,0,81,0.3)",
                                  borderRadius: 6,
                                  padding: "2px 6px",
                                  fontSize: 12,
                                }}
                              />
                            </form>
                          ) : (
                            <>
                              <span
                                className="block font-semibold"
                                style={{ lineHeight: 1.25 }}
                              >
                                {session.title || "Untitled"}
                              </span>
                              <span
                                className="flex items-center gap-2 mt-[3px]"
                                style={{
                                  fontSize: 10.5,
                                  color: isActive ? "var(--mulberry)" : "var(--gray-text)",
                                  opacity: isActive ? 0.7 : 1,
                                }}
                              >
                                <span>{relativeWhen(ts)}</span>
                                <span
                                  aria-hidden
                                  style={{ width: 2, height: 2, borderRadius: "50%", background: "currentColor", opacity: 0.5 }}
                                />
                                <span>
                                  {(session.message_count ?? 0)} turn
                                  {(session.message_count ?? 0) === 1 ? "" : "s"}
                                </span>
                              </span>
                            </>
                          )}

                          {!isEditing && (
                            <div className="absolute right-1 top-1 flex items-center gap-[2px] opacity-0 group-hover/session:opacity-100 transition-opacity">
                              {on_edit_title && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    set_editing_session_id(session.session_key);
                                    set_edit_title(session.title);
                                  }}
                                  className="p-[3px] rounded hover:bg-[rgba(131,0,81,0.08)] text-[var(--gray-text)] hover:text-[var(--mulberry)]"
                                  title="Rename"
                                >
                                  <Edit3 size={10} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  set_pending_session_delete(session);
                                }}
                                className="p-[3px] rounded hover:bg-[rgba(206,0,88,0.10)] text-[var(--gray-text)] hover:text-[var(--magenta)]"
                                title="Delete session"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {agents.length === 0 && !is_collapsed && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <BrandOrb size={48} />
            <p className="text-sm mt-4" style={{ color: "var(--ink)", fontFamily: "var(--font-serif)" }}>
              No agents yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--gray-text)" }}>
              Create your first agent to begin.
            </p>
            <button
              onClick={on_new_agent}
              className="mt-4 px-4 py-2 rounded-md text-sm font-semibold text-white transition-transform hover:-translate-y-px"
              style={{ background: "var(--grad-brand)" }}
            >
              + New agent
            </button>
          </div>
        )}
      </div>

      {on_toggle_collapse && (
        <button
          onClick={on_toggle_collapse}
          className="absolute z-10 transition-all flex items-center justify-center"
          style={{
            bottom: 84,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--white)",
            border: "1px solid var(--gray-rule)",
            boxShadow: "var(--shadow-card)",
            color: "var(--gray-text)",
          }}
          title={is_collapsed ? "Expand" : "Collapse"}
        >
          <span style={{ transform: is_collapsed ? "rotate(0deg)" : "rotate(180deg)", fontSize: 12 }}>›</span>
        </button>
      )}

      {/* Footer */}
      <div className="mx-[14px] mb-4">
        <div
          className="flex items-center gap-[10px] cursor-pointer"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(226,229,231,0.6)",
            fontSize: 12,
          }}
        >
          <span
            aria-hidden
            className="flex-shrink-0 flex items-center justify-center font-semibold text-white"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #5C6566, #2A2D2D)",
              fontSize: 11,
            }}
          >
            {getInitials(user?.name || "User")}
          </span>
          {!is_collapsed && (
            <>
              <div className="flex-1 min-w-0" style={{ lineHeight: 1.2 }}>
                <div className="font-semibold" style={{ color: "var(--ink)", fontSize: 12.5 }}>
                  {user?.name || "User"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>
                  {user?.email || ""}
                </div>
              </div>
              <Settings size={14} style={{ color: "var(--gray-text)" }} />
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pending_session_delete !== null}
        title="Delete this chat?"
        description={
          <>
            <strong style={{ color: "var(--ink)" }}>
              {pending_session_delete?.title || "Untitled"}
            </strong>{" "}
            and all of its messages will be permanently removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete chat"
        onCancel={() => set_pending_session_delete(null)}
        onConfirm={async () => {
          if (!pending_session_delete) return;
          on_delete_session(pending_session_delete.session_key);
          set_pending_session_delete(null);
        }}
      />

      <ConfirmDialog
        isOpen={pending_agent_delete !== null}
        title="Delete this agent?"
        description={
          <>
            <strong style={{ color: "var(--ink)" }}>{pending_agent_delete?.name}</strong>{" "}
            and all of its sessions will be permanently removed. This cannot be undone.
            To confirm, type the agent name below.
          </>
        }
        confirmLabel="Delete agent"
        mode={
          pending_agent_delete
            ? { kind: "type-to-confirm", phrase: pending_agent_delete.name }
            : { kind: "simple" }
        }
        onCancel={() => set_pending_agent_delete(null)}
        onConfirm={async () => {
          if (!pending_agent_delete) return;
          on_delete_agent(pending_agent_delete.agent_id);
          set_pending_agent_delete(null);
        }}
      />
    </aside>
  );
}
