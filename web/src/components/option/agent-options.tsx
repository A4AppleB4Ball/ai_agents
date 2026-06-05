// !/usr/bin/env python
// -*- coding: utf-8 -*-
// =====================================================
// @File   :agent-options.tsx
// @Date   :2025-12-01 22:56
// 2025-12-01 22:56   Create
// =====================================================

/**
 * Agent configuration dialog component
 *
 * Dialog component for creating and editing Agent configurations, supports multi-tab configuration interface
 */

"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Settings,
  Sparkles,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentFormOptions, AgentNameValidationResult } from "@/types/agent";

// ==================== Type Definitions ====================

interface AgentOptionsProps {
  /** Dialog mode: create or edit */
  mode: "create" | "edit";
  /** Whether to open dialog */
  isOpen: boolean;
  /** Close dialog callback */
  onClose: () => void;
  /** Save configuration callback */
  onSave: (title: string, options: AgentFormOptions) => void;
  /** Name validation callback */
  onValidateName?: (name: string) => Promise<AgentNameValidationResult>;
  /** Initial title (edit mode) */
  initialTitle?: string;
  /** Initial configuration (edit mode) */
  initialOptions?: Partial<AgentFormOptions>;
}

interface AgentDialogInitialOptions extends Partial<AgentFormOptions> {
  permission_mode?: string;
  allowed_tools?: string[];
  disallowed_tools?: string[];
  max_turns?: number;
  max_thinking_tokens?: number;
  skills_enabled?: boolean;
  setting_sources?: ("user" | "project")[];
}

type TabKey = "basic" | "prompt" | "tools" | "skills" | "advanced";

// Predefined model list
const AVAILABLE_MODELS = [
  { value: "us.anthropic.claude-sonnet-4-6", label: "Sonnet 4.6" },
];

// Permission mode options
const PERMISSION_MODES = [
  {
    value: "default",
    label: "Default (Ask before continuing)",
    description:
      "Read-only tools are automatically pre-authorized, other operations still require permission.",
  },
  {
    value: "plan",
    label: "Planning Mode",
    description:
      "Inherits default read-only tool set and presents plan before executing actions.",
  },
  {
    value: "acceptEdits",
    label: "Auto-authorize file edits",
    description:
      "Default read-only tools are automatically pre-authorized, but execution is still disabled.",
  },
  {
    value: "bypassPermissions",
    label: "Skip all permission checks",
    description: "All tools will execute without approval.",
  },
] as const;

// Common tool list (hardcoded, can be fetched from API later)
// 'Task', 'TaskOutput', 'Bash', 'Glob', 'Grep', 'ExitPlanMode', 'Read', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'TodoWrite', 'WebSearch', 'KillShell', 'AskUserQuestion', 'Skill', 'EnterPlanMode'
const AVAILABLE_TOOLS = [
  { name: "Task", description: "Executes tasks" },
  { name: "TaskOutput", description: "Displays task output" },
  { name: "Bash", description: "Executes shell commands in your environment" },
  { name: "Glob", description: "Matches file names and patterns" },
  { name: "Grep", description: "Searches for patterns in files" },
  { name: "ExitPlanMode", description: "Exits planning mode" },
  { name: "Read", description: "Reads files" },
  { name: "Edit", description: "Edits files" },
  { name: "Write", description: "Creates or overwrites files" },
  { name: "NotebookEdit", description: "Edits Jupyter Notebooks" },
  { name: "WebFetch", description: "Fetches web pages" },
  { name: "TodoWrite", description: "Creates or updates to-do lists" },
  {
    name: "WebSearch",
    description: "Performs web searches with domain filtering",
  },
  { name: "KillShell", description: "Kills the shell process" },
  { name: "AskUserQuestion", description: "Asks the user a question" },
  { name: "Skill", description: "Executes a skill" },
  { name: "EnterPlanMode", description: "Enters planning mode" },
];

// ==================== Main Component ====================

export function AgentOptions({
  mode,
  isOpen,
  onClose,
  onSave,
  onValidateName,
  initialTitle = "",
  initialOptions = {},
}: AgentOptionsProps) {
  const sourceOptions = initialOptions as AgentDialogInitialOptions;

  // State management
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [title, setTitle] = useState(initialTitle || "Agent");
  const [model, setModel] = useState(
    sourceOptions.model || "us.anthropic.claude-sonnet-4-6",
  );
  const [permissionMode, setPermissionMode] = useState(
    sourceOptions.permissionMode || sourceOptions.permission_mode || "default",
  );
  const [allowedTools, setAllowedTools] = useState<string[]>(
    sourceOptions.allowedTools || sourceOptions.allowed_tools || [],
  );
  const [disallowedTools, setDisallowedTools] = useState<string[]>(
    sourceOptions.disallowedTools || sourceOptions.disallowed_tools || [],
  );
  const [systemPrompt, setSystemPrompt] = useState(
    sourceOptions.systemPrompt || "",
  );
  const [maxTurns, setMaxTurns] = useState(
    (sourceOptions.maxTurns ?? sourceOptions.max_turns)?.toString() || "",
  );
  const [includePartialMessages, setIncludePartialMessages] = useState(
    sourceOptions.includePartialMessages ?? true,
  );
  // Skills configuration state
  const [skillsEnabled, setSkillsEnabled] = useState(
    sourceOptions.skillsEnabled ?? sourceOptions.skills_enabled ?? true,
  );
  const [settingSources, setSettingSources] = useState<("user" | "project")[]>(
    sourceOptions.settingSources ||
      sourceOptions.setting_sources || ["user", "project"],
  );
  const [nameValidation, setNameValidation] =
    useState<AgentNameValidationResult | null>(null);
  const [isValidatingName, setIsValidatingName] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextOptions = initialOptions as AgentDialogInitialOptions;
    setActiveTab("basic");
    setTitle(initialTitle || "Agent");
    setModel(nextOptions.model || "us.anthropic.claude-sonnet-4-6");
    setPermissionMode(
      nextOptions.permissionMode || nextOptions.permission_mode || "default",
    );
    setAllowedTools(
      nextOptions.allowedTools || nextOptions.allowed_tools || [],
    );
    setDisallowedTools(
      nextOptions.disallowedTools || nextOptions.disallowed_tools || [],
    );
    setSystemPrompt(nextOptions.systemPrompt || "");
    setMaxTurns(
      (nextOptions.maxTurns ?? nextOptions.max_turns)?.toString() || "",
    );
    setIncludePartialMessages(nextOptions.includePartialMessages ?? true);
    setSkillsEnabled(
      nextOptions.skillsEnabled ?? nextOptions.skills_enabled ?? true,
    );
    setSettingSources(
      nextOptions.settingSources ||
        nextOptions.setting_sources || ["user", "project"],
    );
    setNameValidation(null);
    setIsValidatingName(false);
  }, [isOpen, initialTitle, initialOptions]);

  // Toggle skills source
  const toggleSettingSource = (source: "user" | "project") => {
    setSettingSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  };

  // Tab configuration
  const tabs = [
    { key: "basic" as TabKey, label: "Basic Settings", icon: Settings },
    { key: "prompt" as TabKey, label: "Prompt Settings", icon: MessageSquare },
    { key: "tools" as TabKey, label: "Tools & Permissions", icon: Wrench },
    { key: "skills" as TabKey, label: "SKILLS Configuration", icon: Sparkles },
    { key: "advanced" as TabKey, label: "Advanced Settings", icon: Zap },
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (!onValidateName) {
      setNameValidation(null);
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setNameValidation(null);
      setIsValidatingName(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsValidatingName(true);
        const result = await onValidateName(trimmed);
        if (!cancelled) {
          setNameValidation(result);
        }
      } catch (error) {
        if (!cancelled) {
          setNameValidation({
            name: trimmed,
            normalized_name: trimmed,
            is_valid: false,
            is_available: false,
            reason:
              error instanceof Error ? error.message : "Name validation failed",
            workspace_path: null,
          });
        }
      } finally {
        if (!cancelled) {
          setIsValidatingName(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [title, isOpen, onValidateName]);

  // Handle tool selection
  const toggleTool = (toolName: string, type: "allowed" | "disallowed") => {
    if (type === "allowed") {
      setAllowedTools((prev) =>
        prev.includes(toolName)
          ? prev.filter((t) => t !== toolName)
          : [...prev, toolName],
      );
    } else {
      setDisallowedTools((prev) =>
        prev.includes(toolName)
          ? prev.filter((t) => t !== toolName)
          : [...prev, toolName],
      );
    }
  };

  // Handle save
  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (isValidatingName) return;
    if (
      nameValidation &&
      (!nameValidation.is_valid || !nameValidation.is_available)
    )
      return;

    // If skills are enabled, automatically add "Skill" to allowedTools
    const finalAllowedTools = [...allowedTools];
    if (skillsEnabled && !finalAllowedTools.includes("Skill")) {
      finalAllowedTools.push("Skill");
    }

    const options: AgentFormOptions = {
      model,
      permissionMode,
      allowedTools: finalAllowedTools,
      disallowedTools,
      systemPrompt: systemPrompt || undefined,
      maxTurns: maxTurns ? parseInt(maxTurns) : undefined,
      includePartialMessages,
      // Skills configuration
      skillsEnabled,
      settingSources: skillsEnabled ? settingSources : undefined,
    };
    onSave(trimmedTitle, options);
    onClose();
  };

  const isNameInvalid = !!(
    nameValidation &&
    (!nameValidation.is_valid || !nameValidation.is_available)
  );
  const canSave = !!title.trim() && !isValidatingName && !isNameInvalid;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200"
      style={{ background: "rgba(14,15,16,0.55)" }}
    >
      <div
        className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(226,229,231,0.7)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {mode === "create" ? "Create Agent" : "Agent Settings"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "create"
                  ? "Configure Agent capabilities and behavior"
                  : `Editing: ${title}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: left tabs + right content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left tab panel */}
          <div className="w-56 bg-muted/10 border-r border-border flex flex-col p-3 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary" : "opacity-70",
                    )}
                  />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto p-8 bg-background">
            {/* Basic Settings */}
            {activeTab === "basic" && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Basic Info
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Agent Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                      placeholder="e.g. Coding Assistant"
                    />
                    <div className="min-h-5 text-xs">
                      {isValidatingName && (
                        <span className="text-muted-foreground">
                          Validating name...
                        </span>
                      )}
                      {!isValidatingName && nameValidation?.reason && (
                        <span className="text-red-500">
                          {nameValidation.reason}
                        </span>
                      )}
                      {!isValidatingName &&
                        nameValidation?.is_valid &&
                        nameValidation?.is_available && (
                          <span className="text-emerald-600">
                            Name available, workspace will be created at:
                            {nameValidation.workspace_path}
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none transition-all"
                      >
                        {AVAILABLE_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 1L5 5L9 1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Workspace Policy
                  </h3>
                  <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1">
                    <p>
                      The working directory is automatically managed by the
                      system; manual input is no longer supported.
                    </p>
                    <p>
                      Directory rule: `./workspace/&lt;agent_name_slug&gt;`.
                    </p>
                    <p>
                      On first creation, `AGENTS.md`, `MEMORY.md` and other
                      templates will be initialized automatically.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Description
                    </label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all"
                      rows={3}
                      placeholder="Describe the goal or background of this session..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Settings */}
            {activeTab === "prompt" && (
              <div className="space-y-6 h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col h-full space-y-2">
                  <label className="text-sm font-medium leading-none flex items-center justify-between">
                    <span>System Prompt</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Supports Markdown
                    </span>
                  </label>
                  <div className="flex-1 relative">
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="absolute inset-0 w-full h-full rounded-md border border-input bg-background px-4 py-3 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none leading-relaxed"
                      placeholder="Enter a custom system prompt here. It determines the Agent's behavior, role, and constraints..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: A custom system prompt will override the default
                    Agent settings.
                  </p>
                </div>
              </div>
            )}

            {/* Tools & Permissions */}
            {activeTab === "tools" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                {/* Permission Mode */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Permission Control
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PERMISSION_MODES.map((pm) => (
                      <button
                        key={pm.value}
                        onClick={() => setPermissionMode(pm.value)}
                        className={cn(
                          "relative p-4 border rounded-xl text-left transition-all duration-200 hover:shadow-md",
                          permissionMode === pm.value
                            ? "bg-primary/5 border-primary ring-1 ring-primary"
                            : "bg-card border-border hover:border-primary/50",
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">
                            {pm.label}
                          </span>
                          {permissionMode === pm.value && (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <svg
                                width="10"
                                height="8"
                                viewBox="0 0 10 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 4L3.5 6.5L9 1"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pm.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pre-authorized Tools */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Tool Authorization
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {allowedTools.length} tool(s) enabled
                    </span>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex gap-3">
                    <div className="text-orange-600 mt-0.5">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-700">
                        Security Notice
                      </p>
                      <p className="text-xs text-orange-600/90 mt-1 leading-relaxed">
                        Selected tools will be `pre-authorized`. The Agent will
                        not ask for your confirmation when invoking them. Only
                        enable this for tools you fully trust.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {AVAILABLE_TOOLS.map((tool) => {
                      const isChecked = allowedTools.includes(tool.name);
                      return (
                        <div
                          key={tool.name}
                          className={cn(
                            "flex items-center justify-between p-4 border rounded-lg transition-all duration-200",
                            isChecked
                              ? "bg-primary/5 border-primary/30"
                              : "bg-card border-border hover:border-primary/20",
                          )}
                        >
                          <div className="flex-1 mr-4">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {tool.name}
                              {isChecked && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                  Authorized
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {tool.description}
                            </div>
                          </div>

                          {/* Custom Switch style */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTool(tool.name, "allowed")}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Skills Configuration */}
            {activeTab === "skills" && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Agent Skills
                  </h3>

                  {/* Skills toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:border-primary/20 transition-all">
                    <div className="flex-1">
                      <label className="text-sm font-medium leading-none flex items-center gap-2">
                        Enable Skills System
                        {skillsEnabled && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded font-medium">
                            Enabled
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Skills are reusable capability modules the agent
                        automatically invokes based on task context.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={skillsEnabled}
                        onChange={(e) => setSkillsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Skill source selection */}
                {skillsEnabled && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Skill Sources
                    </h3>

                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex gap-3">
                      <div className="text-orange-600 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-700">
                          About Skill Sources
                        </p>
                        <p className="text-xs text-orange-600/90 mt-1 leading-relaxed">
                          Skills are loaded from SKILL.md files. User skills
                          live under the user-scope skills directory; project
                          skills live alongside the working directory.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* User Skills */}
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg transition-all duration-200",
                          settingSources.includes("user")
                            ? "bg-primary/5 border-primary/30"
                            : "bg-card border-border hover:border-primary/20",
                        )}
                      >
                        <div className="flex-1 mr-4">
                          <div className="font-medium text-sm flex items-center gap-2">
                            User Skills
                            {settingSources.includes("user") && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                Enabled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Load personal skills from your user-scope skills
                            directory; available across all projects.
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingSources.includes("user")}
                            onChange={() => toggleSettingSource("user")}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {/* Project Skills */}
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg transition-all duration-200",
                          settingSources.includes("project")
                            ? "bg-primary/5 border-primary/30"
                            : "bg-card border-border hover:border-primary/20",
                        )}
                      >
                        <div className="flex-1 mr-4">
                          <div className="font-medium text-sm flex items-center gap-2">
                            Project Skills
                            {settingSources.includes("project") && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                Enabled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Load project skills from the working directory;
                            shareable via Git.
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingSources.includes("project")}
                            onChange={() => toggleSettingSource("project")}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      💡 Tip: at least one skill source must be enabled for the
                      agent to discover and use skills.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings */}
            {activeTab === "advanced" && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Streaming Configuration
                  </h3>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:border-primary/20 transition-all">
                    <div className="flex-1">
                      <label className="text-sm font-medium leading-none flex items-center gap-2">
                        Enable Streaming Output
                        {includePartialMessages && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded font-medium">
                            Enabled
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        When enabled, Agent output is displayed in real time for
                        a smoother experience. When disabled, the full response
                        is shown at once.
                      </p>
                    </div>

                    {/* Custom Switch style */}
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={includePartialMessages}
                        onChange={(e) =>
                          setIncludePartialMessages(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Limits & Quotas
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Max Conversation Turns
                    </label>
                    <input
                      type="number"
                      value={maxTurns}
                      onChange={(e) => setMaxTurns(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g. 50"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Agent will stop responding after reaching this limit.
                      Leave empty for no limit.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-semibold shadow-sm transition-transform",
              canSave
                ? "text-white hover:-translate-y-px"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            style={
              canSave
                ? {
                    background: "var(--grad-brand)",
                    boxShadow: "0 6px 18px rgba(131,0,81,0.30)",
                  }
                : undefined
            }
          >
            {mode === "create" ? "Create Agent" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
