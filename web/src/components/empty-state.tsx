"use client";

/**
 * Digital AI editorial home / empty state.
 * Renders whenever no session is selected.
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { useSessionStore } from "@/store/session";
import { useAgentStore } from "@/store/agent";
import { DigitalClock } from "@/components/decor/digital-clock";
import { BrandOrb } from "@/components/decor/brand-orb";
import { Session } from "@/types/session";

interface EmptyStateProps {
  onNewSession: () => void;
}

function relativeStamp(ts: number): string {
  if (!ts) throw new Error("relativeStamp: missing timestamp");
  const now = new Date();
  const date = new Date(ts);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return format(ts, "HH:mm");
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return format(ts, "dd MMM");
}

export function EmptyState({ onNewSession }: EmptyStateProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const agents = useAgentStore((s) => s.agents);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          (b.last_activity_at || b.created_at || 0) -
          (a.last_activity_at || a.created_at || 0),
      ),
    [sessions],
  );

  const recent = sortedSessions.slice(0, 4);
  const heroSession: Session | undefined = sortedSessions[0];

  const agentName = (agentId?: string) => {
    if (!agentId) return "—";
    const agent = agents.find((a) => a.agent_id === agentId);
    return agent?.name ?? "Unknown";
  };

  const handleHeroClick = () => {
    if (heroSession) {
      setCurrentSession(heroSession.session_key);
    } else {
      onNewSession();
    }
  };

  const noAgents = agents.length === 0;

  return (
    <div className="flex-1 overflow-y-auto relative" style={{ padding: "56px 64px 32px" }}>
      <div className="flex flex-col gap-8 max-w-[1200px] mx-auto relative z-[2]">
        {/* Head */}
        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 min-w-0">
            <span
              className="inline-flex items-center gap-2 font-bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 10.5,
                color: "var(--mulberry)",
                padding: "6px 12px",
                background: "rgba(131,0,81,0.06)",
                border: "1px solid rgba(131,0,81,0.14)",
                borderRadius: 999,
                marginBottom: 22,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--grad-orb)",
                  boxShadow: "0 0 8px rgba(206,0,88,0.6)",
                }}
              />
              Digital AI · Live
            </span>

            <h1
              className="font-semibold"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 96,
                fontWeight: 600,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
                color: "var(--ink)",
                maxWidth: 900,
              }}
            >
              Four pillars. One{" "}
              <em
                className="az-text-gradient"
                style={{ fontStyle: "italic" }}
              >
                agentic
              </em>{" "}
              layer.
            </h1>

            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 19,
                lineHeight: 1.5,
                color: "var(--graphite)",
                maxWidth: 540,
                marginTop: 18,
              }}
            >
              Digital AI brings purpose-built agents to Engineering, Knowledge, Infrastructure
              and Quality — working alongside the people who own the work, governed by policy,
              audit-ready by default. CloudPilot is the first live in production: the agent for
              the infrastructure everything else runs on.
            </p>

            <p
              className="mt-4 font-semibold"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--mulberry)",
              }}
            >
              Governed · Audit-Ready · In Production
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.svg"
              alt="AI Agents"
              style={{ width: 160, height: "auto", display: "block" }}
            />
            <DigitalClock />
          </div>
        </div>

        {/* CTA strip */}
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={onNewSession}
            disabled={noAgents}
            className="font-semibold text-white inline-flex items-center gap-2 transition-transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--grad-brand)",
              padding: "14px 28px",
              borderRadius: 14,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              boxShadow:
                "0 6px 22px rgba(131,0,81,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            {noAgents ? "Create your first agent" : "Start a new session"} →
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--gray-text)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            ⌘ + N · or pick from below
          </span>
        </div>

        {/* Asymmetric grid */}
        <div
          className="grid gap-[18px]"
          style={{
            gridTemplateColumns: "1.6fr 1fr 1fr",
            gridTemplateRows: "auto auto",
          }}
        >
          {/* HERO */}
          <HomeCard
            num="001"
            spanRow
            onClick={handleHeroClick}
            disabled={noAgents}
          >
            <BrandOrb size={64} pulse className="mb-3" />
            <span style={cardNumStyle}>001</span>
            <h3 style={heroH3Style}>
              {heroSession ? (
                <>Pick up where<br />you left off.</>
              ) : noAgents ? (
                <>Spin up your first agent.</>
              ) : (
                <>Spin up your first session.</>
              )}
            </h3>
            <p style={cardPStyle}>
              {heroSession ? (
                <>
                  Your last session — <strong style={{ color: "var(--mulberry)" }}>{heroSession.title || "Untitled"}</strong>{" "}
                  with {agentName(heroSession.agent_id)} — is still warm.
                </>
              ) : noAgents ? (
                <>Configure an agent on the left to begin. Each agent runs in its own workspace, governed by your policy.</>
              ) : (
                <>Pick an agent on the left, or start a new session here.</>
              )}
            </p>
            <span style={cardCtaStyle}>
              {heroSession ? "Resume thread" : "Spin up a session"}{" "}
              <span className="card-arrow" style={{ display: "inline-block" }}>→</span>
            </span>
          </HomeCard>

          {/* RECENT */}
          <HomeCard num="002 · Recent" spanCol>
            <span style={cardNumStyle}>002 · Recent</span>
            <h3 style={cardH3Style}>Recent sessions</h3>
            {recent.length === 0 ? (
              <p style={cardPStyle}>No sessions yet — start one above to populate this list.</p>
            ) : (
              <ul className="list-none p-0 m-0 mt-2 flex flex-col">
                {recent.map((s) => (
                  <li
                    key={s.session_key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSession(s.session_key);
                    }}
                    className="flex items-center gap-[14px] cursor-pointer group/row"
                    style={{
                      padding: "10px 0",
                      borderTop: "1px solid rgba(226,229,231,0.6)",
                      fontSize: 13,
                      color: "var(--ink)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--gray-text)",
                        width: 64,
                      }}
                    >
                      {relativeStamp(s.last_activity_at || s.created_at)}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {s.title || "Untitled"}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}
                    >
                      {agentName(s.agent_id)}
                    </span>
                    <span
                      className="transition-transform group-hover/row:translate-x-[3px] group-hover/row:text-[var(--mulberry)]"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--gray-text)", fontSize: 14 }}
                    >
                      →
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </HomeCard>

          {/* BROWSE AGENTS */}
          <HomeCard num="003">
            <span style={cardNumStyle}>003</span>
            <h3 style={cardH3Style}>Browse agents</h3>
            <p style={cardPStyle}>
              {agents.length === 0
                ? "No agents configured yet. Create one to start."
                : `${agents.length} agent${agents.length === 1 ? "" : "s"} configured. Pick one in the sidebar to view its sessions.`}
            </p>
            <span style={cardCtaStyle}>Open library →</span>
          </HomeCard>

          {/* SKILLS */}
          <HomeCard num="004">
            <span style={cardNumStyle}>004</span>
            <h3 style={cardH3Style}>Skills &amp; tools</h3>
            <p style={cardPStyle}>
              Slash-commands, MCP servers, and team skills — configurable per agent.
            </p>
            <span style={cardCtaStyle}>Manage →</span>
          </HomeCard>
        </div>
      </div>
    </div>
  );
}

const cardNumStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  color: "var(--mulberry)",
  fontWeight: 700,
  letterSpacing: "0.06em",
  fontFeatureSettings: '"tnum"',
};

const cardH3Style: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 22,
  color: "var(--ink)",
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
};

const heroH3Style: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 36,
  color: "var(--ink)",
  fontWeight: 600,
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
};

const cardPStyle: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--gray-text)",
  lineHeight: 1.55,
};

const cardCtaStyle: React.CSSProperties = {
  marginTop: "auto",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--mulberry)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

interface HomeCardProps {
  num: string;
  spanRow?: boolean;
  spanCol?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function HomeCard({ num, spanRow, spanCol, onClick, disabled, children }: HomeCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className="az-home-card relative overflow-hidden flex flex-col gap-3 transition-transform"
      style={{
        gridRow: spanRow ? "span 2" : undefined,
        gridColumn: spanCol ? "span 2" : undefined,
        borderRadius: 20,
        padding: 24,
        background: spanRow
          ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.65))"
          : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: spanRow ? "1px solid rgba(131,0,81,0.18)" : "1px solid rgba(226,229,231,0.7)",
        boxShadow: "var(--shadow-card)",
        cursor: onClick && !disabled ? "pointer" : "default",
        opacity: disabled ? 0.6 : 1,
      }}
      data-num={num}
    >
      {children}
      <span
        aria-hidden
        className="az-home-card-rule"
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          height: 2,
          background: "var(--grad-brand)",
          width: 0,
          transition: "width .35s cubic-bezier(.2,.8,.3,1)",
        }}
      />
      <style jsx>{`
        .az-home-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-float);
        }
        .az-home-card:hover .az-home-card-rule {
          width: calc(100% - 48px);
        }
      `}</style>
    </div>
  );
}
