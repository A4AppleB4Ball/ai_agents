import { useEffect, useRef, useState } from "react";
import { TodoItem } from "@/components/todo/agent-task-widget";
import { Message, ResultMessage } from "@/types/message";

function isSameSessionMessage(message: Message, externalSessionKey: string): boolean {
  return !message.agent_id || message.agent_id === externalSessionKey;
}

export const useExtractTodos = (
  messages: Message[],
  externalSessionKey: string | null
) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const prevSessionRef = useRef<string | null>(null);

  // Extract todos from messages (reset on session change)
  useEffect(() => {
    // Session changed - reset todos immediately
    if (prevSessionRef.current !== externalSessionKey) {
      setTodos([]);
      prevSessionRef.current = externalSessionKey;
    }

    // No session - don't extract
    if (!externalSessionKey || messages.length === 0) {
      return;
    }

    let latestTodos: TodoItem[] = [];
    let latestTodoRoundId: string | null = null;
    let latestTodoIndex = -1;
    let found = false;

    // Iterate backwards to find the latest TodoWrite tool use
    // Only consider messages from current session
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      // Skip messages that don't belong to current session
      if (!isSameSessionMessage(msg, externalSessionKey)) {
        continue;
      }

      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use" && block.name === "TodoWrite") {
            if (block.input && Array.isArray(block.input.todos)) {
              latestTodos = block.input.todos;
              latestTodoRoundId = msg.round_id;
              latestTodoIndex = i;
              found = true;
            }
          }
        }
      }
      if (found) break;
    }

    if (!found || latestTodos.length === 0 || !latestTodoRoundId) {
      setTodos([]);
      return;
    }

    // Terminal state convergence: clear Todos immediately when a round ends abnormally (interrupt/error) to avoid stale Agent Plan data in the top-right corner
    const roundResult = [...messages]
      .reverse()
      .find((msg): msg is ResultMessage =>
        msg.role === "result"
        && msg.round_id === latestTodoRoundId
        && isSameSessionMessage(msg, externalSessionKey)
      );

    if (roundResult && roundResult.is_error) {
      setTodos([]);
      return;
    }

    // Cross-round fallback: if a new round has started and the old round has no terminal state, also clear the old Todos to avoid them getting stuck
    const hasLaterRoundMessage = messages.slice(latestTodoIndex + 1).some((msg) =>
      isSameSessionMessage(msg, externalSessionKey)
      && msg.round_id
      && msg.round_id !== latestTodoRoundId
      && msg.role !== "system"
    );

    if (hasLaterRoundMessage && !roundResult) {
      setTodos([]);
      return;
    }

    setTodos(latestTodos);
  }, [messages, externalSessionKey]);

  return todos;
};
