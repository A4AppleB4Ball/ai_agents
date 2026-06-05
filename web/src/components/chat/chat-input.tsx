"use client";

import { KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, Image as ImageIcon, Paperclip, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentFile {
  id: string;
  file: File;
  preview?: string;
  type: "image" | "document";
}

interface ChatInputProps {
  isLoading: boolean;
  onSendMessage: (message: string, attachments?: AttachmentFile[]) => void;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  agentName?: string;
}

const ChatInput = memo(
  ({
    isLoading,
    onSendMessage,
    onStop,
    disabled = false,
    placeholder,
    maxLength = 10000,
    agentName,
  }: ChatInputProps) => {
    const [input, setInput] = useState("");
    const [inputHistory, setInputHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isComposing, setIsComposing] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }, [input]);

    useEffect(() => {
      if (textareaRef.current && !disabled) {
        textareaRef.current.focus();
      }
    }, [disabled]);

    const handleSend = useCallback(() => {
      const trimmedInput = input.trim();
      if ((!trimmedInput && attachments.length === 0) || disabled || isLoading) return;

      if (trimmedInput) {
        setInputHistory((prev) => [trimmedInput, ...prev.slice(0, 49)]);
      }
      setHistoryIndex(-1);

      onSendMessage(trimmedInput, attachments.length > 0 ? attachments : undefined);
      setInput("");
      setAttachments([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, [input, attachments, disabled, isLoading, onSendMessage]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposing) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }

      if (e.key === "ArrowUp" && e.ctrlKey && inputHistory.length > 0) {
        e.preventDefault();
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
        return;
      }

      if (e.key === "ArrowDown" && e.ctrlKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(inputHistory[newIndex]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput("");
        }
        return;
      }

      if (e.key === "Escape" && isLoading) {
        e.preventDefault();
        onStop();
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newAttachments: AttachmentFile[] = [];

      Array.from(files).forEach((file) => {
        const isImage = file.type.startsWith("image/");
        const attachment: AttachmentFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          type: isImage ? "image" : "document",
        };

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === attachment.id ? { ...a, preview: ev.target?.result as string } : a,
              ),
            );
          };
          reader.readAsDataURL(file);
        }

        newAttachments.push(attachment);
      });

      setAttachments((prev) => [...prev, ...newAttachments]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const removeAttachment = (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    const isInputEmpty = input.trim().length === 0 && attachments.length === 0;
    const charCount = input.length;
    const isOverLimit = charCount > maxLength;
    const resolvedPlaceholder =
      placeholder ?? `Continue the thread, or ask ${agentName ?? "Digital AI"} anything…`;

    return (
      <div
        className="flex-shrink-0"
        style={{ padding: "14px 56px 24px", background: "transparent" }}
      >
        <div
          className={cn(
            "max-w-[880px] mx-auto relative transition-[border-color,box-shadow]",
          )}
          style={{
            borderRadius: 22,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            border: "1px solid rgba(226,229,231,0.7)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 border-b" style={{ borderColor: "rgba(226,229,231,0.6)" }}>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative flex items-center gap-2"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(226,229,231,0.7)",
                    background: "rgba(255,255,255,0.7)",
                  }}
                >
                  {attachment.type === "image" && attachment.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-6 h-6 object-cover rounded"
                    />
                  ) : attachment.type === "image" ? (
                    <ImageIcon size={14} style={{ color: "var(--mulberry)" }} />
                  ) : (
                    <FileText size={14} style={{ color: "var(--graphite)" }} />
                  )}
                  <span className="text-xs truncate max-w-[160px]" style={{ color: "var(--graphite)" }}>
                    {attachment.file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="ml-1 p-[2px] rounded"
                    style={{ color: "var(--gray-text)" }}
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-[10px]" style={{ padding: "14px 14px 14px 18px" }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--gray-rule)",
                color: "var(--gray-text)",
                background: "transparent",
              }}
              title="Attach"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={resolvedPlaceholder}
              disabled={disabled || isLoading}
              className={cn(
                "flex-1 outline-none resize-none bg-transparent",
                "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              )}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--ink)",
                minHeight: 28,
                lineHeight: 1.5,
                padding: "6px 0",
              }}
              rows={1}
            />

            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center transition-transform hover:-translate-y-px"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--graphite)",
                  color: "var(--magenta)",
                  border: "none",
                  boxShadow: "0 4px 14px rgba(63,68,68,0.32)",
                }}
                title="Stop (Esc)"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={isInputEmpty || disabled || isOverLimit}
                className="flex items-center justify-center transition-transform hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--grad-brand)",
                  color: "var(--white)",
                  border: "none",
                  boxShadow:
                    "0 4px 14px rgba(131,0,81,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
                title="Send (Enter)"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>

          <div
            className="flex items-center justify-between"
            style={{
              borderTop: "1px solid rgba(226,229,231,0.6)",
              padding: "9px 18px",
              fontSize: 11,
              color: "var(--gray-text)",
            }}
          >
            <span className="flex items-center gap-2 flex-wrap">
              <Kbd>↵</Kbd> send · <Kbd>⇧↵</Kbd> new line · <Kbd>esc</Kbd> stop · <Kbd>⌘K</Kbd> commands
            </span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {charCount} / {maxLength}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

ChatInput.displayName = "ChatInput";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-block font-semibold"
      style={{
        padding: "1px 7px",
        background: "rgba(131,0,81,0.06)",
        border: "1px solid rgba(131,0,81,0.12)",
        borderRadius: 5,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--mulberry)",
      }}
    >
      {children}
    </kbd>
  );
}

export default ChatInput;
