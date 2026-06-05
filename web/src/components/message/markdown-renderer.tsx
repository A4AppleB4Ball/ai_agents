"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./block/code-block";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

import { useTypewriter } from "@/hooks/use-typewriter";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, className, isStreaming = false }: MarkdownRendererProps) {
  const { displayedText, isComplete } = useTypewriter({
    text: content,
    enabled: isStreaming,
    speed: 5,
  });

  return (
    <div className={cn("az-response-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className: cls, children, ...props }: any) {
            const match = /language-(\w+)/.exec(cls || "");
            const value = String(children).replace(/\n$/, "");
            const isCodeBlock = match && value.includes("\n");

            return isCodeBlock ? (
              <CodeBlock language={match[1]} value={value} />
            ) : (
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  background: "rgba(131,0,81,0.06)",
                  border: "1px solid rgba(131,0,81,0.10)",
                  padding: "1px 6px",
                  borderRadius: 5,
                  color: "var(--mulberry)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return (
              <p
                style={{
                  marginBottom: 16,
                  fontFeatureSettings: '"kern", "liga", "onum"',
                  fontSize: 16,
                  lineHeight: 1.72,
                  color: "var(--ink-soft)",
                }}
              >
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: "var(--ink-soft)" }}>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-6 mb-4 space-y-1" style={{ color: "var(--ink-soft)" }}>
                {children}
              </ol>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote
                style={{
                  borderLeft: "2px solid var(--mulberry)",
                  padding: "4px 0 4px 20px",
                  margin: "16px 0",
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  color: "var(--ink)",
                  fontStyle: "italic",
                }}
              >
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--mulberry)", textDecoration: "underline", textUnderlineOffset: 4 }}
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong style={{ color: "var(--mulberry)", fontWeight: 600 }}>{children}</strong>;
          },
          h1({ children }) {
            return (
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 28,
                  fontWeight: 600,
                  margin: "32px 0 14px",
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--ink)",
                  margin: "28px 0 12px",
                  letterSpacing: "-0.01em",
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink)",
                  margin: "22px 0 10px",
                  letterSpacing: "-0.01em",
                }}
              >
                {children}
              </h3>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    width: "100%",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(226,229,231,0.6)",
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead
                style={{
                  background: "linear-gradient(135deg, rgba(131,0,81,0.06), transparent)",
                }}
              >
                {children}
              </thead>
            );
          },
          th({ children }) {
            return (
              <th
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--gray-text)",
                  fontWeight: 700,
                  padding: "8px 14px",
                  textAlign: "left",
                  borderBottom: "1px solid rgba(226,229,231,0.6)",
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td
                style={{
                  padding: "8px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  fontWeight: 400,
                  lineHeight: 1.5,
                  fontFeatureSettings: '"tnum"',
                  borderTop: "1px solid rgba(226,229,231,0.4)",
                  verticalAlign: "top",
                }}
              >
                {children}
              </td>
            );
          },
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {isStreaming && !isComplete && (
        <span
          aria-hidden
          className="inline-block ml-1 align-middle"
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--grad-orb)",
            boxShadow: "0 0 8px rgba(206,0,88,0.5)",
          }}
        />
      )}
    </div>
  );
}
