/**
 * useTestEventParser Hook
 *
 * Extracts [TEST_EVENT:type|payload] markers from assistant message content
 * and feeds them into the UITestingStore for real-time visualization.
 */

import { useEffect, useRef } from 'react';
import { Message } from '@/types/message';
import { useUITestingStore } from '@/store/ui-testing';
import { TestEventType } from '@/types/ui-testing';

const TEST_EVENT_REGEX = /\[TEST_EVENT:(\w+)(?:\|(.+?))?\]/g;

const VALID_EVENT_TYPES: Set<string> = new Set([
  'session_ready',
  'plan',
  'case_start',
  'step_complete',
  'case_end',
  'report_ready',
  'session_closed',
]);

function extractTextContent(message: Message): string[] {
  const texts: string[] = [];

  if (message.role === 'assistant' && Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        texts.push(block.text);
      }
      if (block.type === 'tool_result') {
        const content = (block as any).content;
        if (typeof content === 'string') {
          texts.push(content);
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (typeof part === 'string') texts.push(part);
            else if (part?.text) texts.push(part.text);
          }
        }
      }
    }
  }

  return texts;
}

export function useTestEventParser(messages: Message[], active: boolean) {
  const addEvent = useUITestingStore((s) => s.addEvent);
  const processedCountRef = useRef(0);

  useEffect(() => {
    if (!active) {
      processedCountRef.current = 0;
      return;
    }

    const newMessages = messages.slice(processedCountRef.current);
    processedCountRef.current = messages.length;

    for (const message of newMessages) {
      const texts = extractTextContent(message);
      for (const text of texts) {
        let match: RegExpExecArray | null;
        TEST_EVENT_REGEX.lastIndex = 0;
        while ((match = TEST_EVENT_REGEX.exec(text)) !== null) {
          const eventType = match[1];
          const payloadStr = match[2] || '{}';

          if (!VALID_EVENT_TYPES.has(eventType)) continue;

          try {
            const payload = JSON.parse(payloadStr);
            addEvent({
              type: eventType as TestEventType,
              payload,
              timestamp: Date.now(),
            });
          } catch {
            // Skip malformed JSON payloads
          }
        }
      }
    }
  }, [messages.length, active, addEvent]);
}
