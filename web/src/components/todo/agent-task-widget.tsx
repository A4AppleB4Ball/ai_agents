"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface TodoItem {
  content: string;
  status: "pending" | "completed" | "in_progress";
  activeForm?: string;
}

interface AgentTaskWidgetProps {
  todos: TodoItem[];
}

export function AgentTaskWidget({ todos }: AgentTaskWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (todos.length === 0) return null;

  const activeCount = todos.filter((t) => t.status === "in_progress").length;
  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isWorking = activeCount > 0;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn("relative w-9 h-9 rounded-full overflow-hidden transition-all")}
        style={{
          background: isOpen
            ? "rgba(131,0,81,0.08)"
            : "rgba(255,255,255,0.7)",
          border: "1px solid rgba(131,0,81,0.20)",
          boxShadow: isOpen
            ? "0 0 0 4px rgba(131,0,81,0.10)"
            : "0 2px 8px rgba(131,0,81,0.10)",
        }}
        title={isWorking ? "Agent working" : "Agent plan"}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" style={{ padding: 2 }}>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(131,0,81,0.15)" strokeWidth="1.5" />
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="url(#azGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 0.5 }}
          />
          <defs>
            <linearGradient id="azGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4D0030" />
              <stop offset="50%" stopColor="#830051" />
              <stop offset="100%" stopColor="#CE0058" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          {isWorking ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--mulberry)" }} />
            </motion.div>
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--mulberry)" }} />
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full right-0 mt-3 w-80 rounded-2xl overflow-hidden z-50"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(22px)",
                border: "1px solid rgba(226,229,231,0.7)",
                boxShadow: "var(--shadow-float)",
              }}
            >
              <div
                className="relative p-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(226,229,231,0.6)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: "rgba(131,0,81,0.08)",
                      color: "var(--mulberry)",
                      border: "1px solid rgba(131,0,81,0.16)",
                    }}
                  >
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ fontFamily: "var(--font-serif)", color: "var(--ink)", fontSize: 16 }}
                    >
                      Agent plan
                    </h3>
                    <div
                      className="flex items-center gap-2"
                      style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--gray-text)" }}
                    >
                      <span>
                        {completedCount}/{totalCount} done
                      </span>
                      <div
                        className="w-12 h-1 rounded-full overflow-hidden"
                        style={{ background: "rgba(131,0,81,0.10)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "var(--grad-brand)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(131,0,81,0.06)]"
                  style={{ color: "var(--gray-text)" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {todos.map((todo, index) => (
                  <motion.div
                    key={`${index}-${todo.content}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative p-3 rounded-xl"
                    style={{
                      background:
                        todo.status === "in_progress"
                          ? "rgba(131,0,81,0.06)"
                          : todo.status === "completed"
                          ? "rgba(244,245,246,0.6)"
                          : "rgba(255,255,255,0.6)",
                      border:
                        todo.status === "in_progress"
                          ? "1px solid rgba(131,0,81,0.20)"
                          : "1px solid rgba(226,229,231,0.6)",
                      opacity: todo.status === "completed" ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {todo.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--mulberry)" }} />
                        ) : todo.status === "in_progress" ? (
                          <div className="relative">
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{ background: "var(--mulberry)" }}
                              animate={{ scale: [1, 1.8, 1.8], opacity: [0.4, 0, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <Clock className="w-4 h-4 relative" style={{ color: "var(--mulberry)" }} />
                          </div>
                        ) : (
                          <Circle className="w-4 h-4" style={{ color: "var(--gray-text)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs leading-relaxed"
                          style={{
                            color: todo.status === "completed" ? "var(--gray-text)" : "var(--ink-soft)",
                            textDecoration: todo.status === "completed" ? "line-through" : "none",
                          }}
                        >
                          {todo.content}
                        </p>
                        {todo.activeForm && todo.status === "in_progress" && (
                          <p
                            className="mt-1.5 flex items-center gap-1"
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--mulberry)",
                            }}
                          >
                            <motion.span
                              className="w-1 h-1 rounded-full"
                              style={{ background: "var(--mulberry)" }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            {todo.activeForm}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
